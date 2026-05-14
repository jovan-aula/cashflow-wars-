"use client"
import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { TEAMS, getCaptain, getCompanySize, playSound, startBgm, pauseBgm, stopBgm } from "@/lib/game"
import { QUESTIONS } from "@/lib/questions"
import Image from "next/image"

type Session = { id: string; code: string; current_round: number; state: string }
type Player = { id: string; name: string; team: number }

const teamImg: Record<number, string> = { 1:"/e1.png", 2:"/e2.png", 3:"/e4.png", 4:"/e3.png" }

const levelImg = (score: number) => {
  if (score >= 80) return "/nivel5-corporativo.png"
  if (score >= 60) return "/nivel4-regional.png"
  if (score >= 40) return "/nivel3-pyme.png"
  if (score >= 20) return "/nivel2-micro.png"
  return "/nivel1-kiosco.png"
}

const ANSWER_COLORS = ["#E21B3C", "#1368CE", "#D89E00", "#26890C"]
const ANSWER_LETTERS = ["A", "B", "C", "D"]

const ANIM = `
  @keyframes fadeIn { from { opacity:0; transform:translateY(24px) scale(0.97) } to { opacity:1; transform:none } }
  @keyframes slideUp { from { opacity:0; transform:translateY(36px) } to { opacity:1; transform:none } }
  @keyframes popIn { from { opacity:0; transform:scale(0.55) } to { opacity:1; transform:scale(1) } }
  @keyframes pulse { 0%,100% { transform:scale(1) } 50% { transform:scale(1.07) } }
  @keyframes floatBounce { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-14px) } }
  @keyframes shake { 0%,100% { transform:translateX(0) } 25% { transform:translateX(-4px) } 75% { transform:translateX(4px) } }
  @keyframes spin { from { transform:rotate(0) } to { transform:rotate(360deg) } }
  @keyframes glow { 0%,100% { box-shadow:0 0 10px currentColor } 50% { box-shadow:0 0 28px currentColor } }
`

function UabcLogo() {
  return (
    <div style={{ position:"fixed", bottom:12, right:12, opacity:0.18, pointerEvents:"none" }}>
      <Image src="/uabc.png" alt="UABC" width={28} height={28} />
    </div>
  )
}

export default function Home() {
  const [code, setCode]       = useState("")
  const [name, setName]       = useState("")
  const [session, setSession] = useState<Session | null>(null)
  const [player, setPlayer]   = useState<Player | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [timer, setTimer]     = useState(60)
  const [step, setStep]       = useState<"intro"|"code"|"name"|"team"|"lobby"|"game"|"feedback"|"results">("intro")
  const [introStep, setIntroStep] = useState(0)
  const sessionRef = useRef<Session | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const INTRO_STEPS = [
    { title: "CASHFLOW WARS", sub: "El simulador empresarial", emoji: "💰" },
    { title: "4 equipos", sub: "Una sola ciudad. Tijuana.", emoji: "🏙️" },
    { title: "15 decisiones", sub: "Cada una cambia el tamaño de tu empresa", emoji: "📊" },
    { title: "¿Quién llega a Corporativo?", sub: "El mejor equipo financiero gana", emoji: "🏆" },
  ]

  useEffect(() => {
    if (step !== "intro") return
    if (introStep < INTRO_STEPS.length - 1) {
      const t = setTimeout(() => setIntroStep(i => i + 1), 1800)
      return () => clearTimeout(t)
    } else {
      const t = setTimeout(() => setStep("code"), 2200)
      return () => clearTimeout(t)
    }
  }, [step, introStep])

  // Canal de datos (se recrea cuando session cambia de estado, pero sin presence)
  useEffect(() => {
    if (!session) return
    const ch = supabase.channel(`session:${session.id}`)
      .on("postgres_changes", { event:"*", schema:"public", table:"sessions", filter:`id=eq.${session.id}` },
        (payload) => {
          const s = payload.new as Session
          const prev = sessionRef.current
          sessionRef.current = s
          if (prev?.state !== s.state) {
            if (s.state === "playing") {
              startBgm()
              setTimeout(() => playSound("roundstart"), 80)
            } else if (s.state === "feedback") {
              pauseBgm()
              setTimeout(() => playSound("reveal"), 100)
            } else if (s.state === "results") {
              stopBgm()
              setTimeout(() => { playSound("drumroll"); setTimeout(() => playSound("win"), 900) }, 200)
              setStep("results")
            }
          } else if (s.state === "playing" && prev?.current_round !== s.current_round) {
            startBgm()
            setTimeout(() => playSound("roundstart"), 80)
          }
          setSession(s)
          if (s.state === "playing") setTimer(60)
        })
      .on("postgres_changes", { event:"*", schema:"public", table:"players", filter:`session_id=eq.${session.id}` },
        async () => {
          const { data } = await supabase.from("players").select("*").eq("session_id", session.id)
          if (data) setPlayers(data)
        })
      .on("postgres_changes", { event:"*", schema:"public", table:"answers", filter:`session_id=eq.${session.id}` },
        async () => {
          const { data } = await supabase.from("answers").select("*").eq("session_id", session.id)
          if (data) {
            const map: Record<string, number> = {}
            data.forEach((a: any) => { map[`${a.player_id}:${a.round}`] = a.option_index })
            setAnswers(map)
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [session?.id])  // solo se recrea si cambia la sesión, no el estado

  // Canal de presencia separado y estable — solo se crea una vez por jugador
  useEffect(() => {
    if (!session?.id || !player?.id) return
    const ch = supabase.channel(`presence:${session.id}`, { config: { presence: { key: player.id } } })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        leftPresences.forEach((p: any) => {
          if (p.player_id && p.player_id !== player.id) {
            supabase.from("players").delete().eq("id", p.player_id).then(() => {})
          }
        })
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track({ player_id: player.id })
        }
      })
    channelRef.current = ch
    return () => { supabase.removeChannel(ch); channelRef.current = null }
  }, [session?.id, player?.id])

  useEffect(() => {
    if (session?.state !== "feedback" || !player) return
    const myAnswer = answers[`${player.id}:${session.current_round}`]
    if (myAnswer === undefined) return
    const q = QUESTIONS[session.current_round]
    const t = setTimeout(() => playSound(myAnswer === q.mejor ? "correct" : "wrong"), 700)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.state, session?.current_round])

  useEffect(() => {
    if (!session || session.state !== "playing") return
    if (timer <= 0) return
    const t = setTimeout(() => {
      setTimer(s => s - 1)
      if (timer <= 5) playSound("tick")
      else if (timer === 15) playSound("warning")
    }, 1000)
    return () => clearTimeout(t)
  }, [timer, session])

  async function joinSession() {
    const { data } = await supabase.from("sessions").select("*").eq("code", code.toUpperCase()).single()
    if (!data) { alert("Código incorrecto"); return }
    setSession(data)
    setStep("name")
  }

  async function joinTeam(teamId: number) {
    const { data: existing } = await supabase.from("players").select("*").eq("session_id", session!.id).eq("name", name).maybeSingle()
    if (existing) {
      if (existing.team !== teamId) {
        await supabase.from("players").update({ team: teamId }).eq("id", existing.id)
      }
      setPlayer({ ...existing, team: teamId })
    } else {
      const { data } = await supabase.from("players").insert({ session_id: session!.id, name, team: teamId }).select().single()
      if (!data) return
      setPlayer(data)
    }
    setStep("lobby")
    playSound("whoosh")
    setTimeout(() => playSound("join"), 180)
  }

  async function submitAnswer(optIdx: number) {
    if (!player || !session) return
    const key = `${player.id}:${session.current_round}`
    const prevAnswer = answers[key]
    if (prevAnswer === optIdx) return
    playSound("select")
    if (prevAnswer !== undefined) {
      await supabase.from("answers").update({ option_index: optIdx }).eq("player_id", player.id).eq("round", session.current_round).eq("session_id", session.id)
    } else {
      await supabase.from("answers").insert({ session_id: session.id, player_id: player.id, round: session.current_round, option_index: optIdx })
    }
  }

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (step === "intro") {
    const s = INTRO_STEPS[introStep]
    return (
      <div style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"radial-gradient(ellipse at 50% 0%, #1a2a6c 0%, #0d0d1a 70%)", color:"#fff", fontFamily:"system-ui,sans-serif", textAlign:"center", padding:"2rem", overflow:"hidden" }}>
        <style>{ANIM}</style>
        {/* Ambient glow */}
        <div style={{ position:"absolute", top:"-20%", left:"50%", transform:"translateX(-50%)", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle, rgba(29,158,117,0.15) 0%, transparent 70%)", pointerEvents:"none" }} />
        <div key={introStep} style={{ animation:"fadeIn 0.65s cubic-bezier(0.34,1.56,0.64,1)", display:"flex", flexDirection:"column", alignItems:"center", position:"relative" }}>
          {introStep === 0
            ? <Image src="/intro.png" alt="CashFlow Wars" width={150} height={150} style={{ marginBottom:24, filter:"drop-shadow(0 0 40px rgba(29,158,117,0.7))", animation:"pulse 2.5s ease-in-out infinite" }} />
            : <div style={{ fontSize:110, marginBottom:20, lineHeight:1, filter:"drop-shadow(0 4px 16px rgba(0,0,0,0.5))", animation:"floatBounce 0.7s ease" }}>{s.emoji}</div>
          }
          <h1 style={{ fontSize:38, fontWeight:900, margin:"0 0 14px", letterSpacing:3, textShadow:"0 2px 24px rgba(255,255,255,0.25)" }}>{s.title}</h1>
          <p style={{ fontSize:20, color:"rgba(255,255,255,0.65)", margin:0, fontWeight:500 }}>{s.sub}</p>
        </div>
        {/* Progress dots */}
        <div style={{ position:"fixed", bottom:44, display:"flex", gap:10 }}>
          {INTRO_STEPS.map((_,i) => (
            <div key={i} style={{ width: i===introStep?24:8, height:8, borderRadius:4, background:i===introStep?"#1D9E75":"rgba(255,255,255,0.2)", transition:"all 0.35s ease" }} />
          ))}
        </div>
        <div style={{ position:"fixed", bottom:14, right:14, opacity:0.18 }}>
          <Image src="/uabc.png" alt="UABC" width={26} height={26} />
        </div>
      </div>
    )
  }

  // ── CÓDIGO ─────────────────────────────────────────────────────────────────
  if (step === "code") return (
    <div style={darkPageStyle("linear-gradient(160deg, #0d0d1a 0%, #1a2a6c 60%, #1D9E75 130%)")}>
      <style>{ANIM}</style>
      <div style={{ animation:"fadeIn 0.6s cubic-bezier(0.34,1.56,0.64,1)", display:"flex", flexDirection:"column", alignItems:"center", width:"100%", maxWidth:380 }}>
        <div style={{ fontSize:100, lineHeight:1, marginBottom:16, filter:"drop-shadow(0 4px 20px rgba(0,0,0,0.4))" }}>💰</div>
        <h1 style={{ fontSize:34, fontWeight:900, margin:"0 0 6px", color:"#fff", letterSpacing:2 }}>CashFlow Wars</h1>
        <p style={{ fontSize:16, color:"rgba(255,255,255,0.6)", marginBottom:32 }}>Ingresa el código de tu clase</p>
        <div style={{ background:"rgba(255,255,255,0.97)", borderRadius:24, padding:"2rem", width:"100%", boxShadow:"0 24px 64px rgba(0,0,0,0.4)" }}>
          <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="FLUJO123" maxLength={10}
            style={{ width:"100%", padding:"18px 14px", borderRadius:14, border:"2px solid #e5e5e5", fontSize:30, letterSpacing:6, fontWeight:900, textAlign:"center", fontFamily:"monospace", boxSizing:"border-box", outline:"none", color:"#185FA5", background:"#f4f8ff", transition:"border 0.2s" }}
            onKeyDown={e=>e.key==="Enter"&&code.trim()&&joinSession()} />
          <button onClick={joinSession} style={actionBtn("#1D9E75", "#14855a")}>
            Entrar al juego →
          </button>
        </div>
      </div>
      <UabcLogo />
    </div>
  )

  // ── NOMBRE ─────────────────────────────────────────────────────────────────
  if (step === "name") return (
    <div style={darkPageStyle("linear-gradient(160deg, #0d0d1a 0%, #1a2a6c 60%, #185FA5 130%)")}>
      <style>{ANIM}</style>
      <div style={{ animation:"fadeIn 0.6s cubic-bezier(0.34,1.56,0.64,1)", display:"flex", flexDirection:"column", alignItems:"center", width:"100%", maxWidth:380 }}>
        <div style={{ fontSize:100, lineHeight:1, marginBottom:16 }}>✏️</div>
        <h2 style={{ fontSize:30, fontWeight:900, margin:"0 0 6px", color:"#fff" }}>¿Cómo te llamas?</h2>
        <p style={{ fontSize:16, color:"rgba(255,255,255,0.6)", marginBottom:32 }}>Escribe tu nombre completo</p>
        <div style={{ background:"rgba(255,255,255,0.97)", borderRadius:24, padding:"2rem", width:"100%", boxShadow:"0 24px 64px rgba(0,0,0,0.4)" }}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Tu nombre completo"
            style={{ width:"100%", padding:"16px 14px", borderRadius:14, border:"2px solid #e5e5e5", fontSize:18, fontFamily:"system-ui", boxSizing:"border-box", outline:"none", color:"#333", transition:"border 0.2s" }}
            onKeyDown={e=>e.key==="Enter"&&name.trim()&&setStep("team")} />
          <button onClick={()=>name.trim()&&setStep("team")} style={actionBtn("#185FA5", "#0e4080")}>
            Continuar →
          </button>
        </div>
      </div>
      <UabcLogo />
    </div>
  )

  // ── EQUIPO ─────────────────────────────────────────────────────────────────
  if (step === "team") return (
    <div style={darkPageStyle("linear-gradient(160deg, #0d0d1a 0%, #1a1a3e 100%)")}>
      <style>{ANIM}</style>
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.45)", fontWeight:700, letterSpacing:2, marginBottom:6, textAlign:"center" }}>BIENVENIDO/A</div>
      <h2 style={{ fontSize:30, fontWeight:900, color:"#fff", margin:"0 0 4px", textAlign:"center" }}>{name} 👋</h2>
      <p style={{ fontSize:15, color:"rgba(255,255,255,0.5)", marginBottom:28, textAlign:"center" }}>Elige tu equipo</p>
      <div style={{ display:"grid", gap:12, width:"100%", maxWidth:400 }}>
        {TEAMS.map((t, idx) => {
          const count = players.filter(p=>p.team===t.id).length
          return (
            <button key={t.id} onClick={()=>joinTeam(t.id)}
              style={{ padding:"1.1rem 1.25rem", border:"none", borderRadius:18, background:`linear-gradient(135deg, ${t.color} 0%, ${t.color}cc 100%)`, cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:14, boxShadow:`0 6px 24px ${t.color}55`, animation:`slideUp 0.5s ${idx*0.08}s both cubic-bezier(0.34,1.56,0.64,1)` }}>
              <div style={{ background:"rgba(255,255,255,0.2)", borderRadius:14, padding:4 }}>
                <Image src={teamImg[t.id]} alt={t.name} width={72} height={72} style={{ objectFit:"contain", display:"block", filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.35))" }} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:900, color:"#fff", fontSize:20, textShadow:"0 1px 6px rgba(0,0,0,0.3)", letterSpacing:0.5 }}>{t.name}</div>
                <div style={{ fontSize:14, color:"rgba(255,255,255,0.75)", marginTop:3 }}>
                  {count === 0 ? "Sin integrantes aún" : `${count} integrante${count>1?"s":""} conectado${count>1?"s":""}`}
                </div>
              </div>
              <div style={{ fontSize:24, color:"rgba(255,255,255,0.5)" }}>›</div>
            </button>
          )
        })}
      </div>
      <UabcLogo />
    </div>
  )

  // ── LOBBY ─────────────────────────────────────────────────────────────────
  if (step === "lobby" && session?.state === "lobby") {
    const myTeam = TEAMS.find(t=>t.id===player?.team)
    return (
      <div style={darkPageStyle(`linear-gradient(160deg, #0d0d1a 0%, ${myTeam?.color}cc 100%)`)}>
        <style>{ANIM}</style>
        <div style={{ animation:"popIn 0.7s cubic-bezier(0.34,1.56,0.64,1)", display:"flex", flexDirection:"column", alignItems:"center", marginBottom:20 }}>
          <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:24, padding:12, backdropFilter:"blur(8px)", marginBottom:16, animation:"pulse 3s ease-in-out infinite" }}>
            <Image src={teamImg[myTeam?.id||1]} alt={myTeam?.name||""} width={120} height={120} style={{ objectFit:"contain", display:"block", filter:"drop-shadow(0 4px 20px rgba(0,0,0,0.4))" }} />
          </div>
          <h2 style={{ fontSize:34, fontWeight:900, color:"#fff", margin:"0 0 4px", textShadow:"0 2px 12px rgba(0,0,0,0.4)" }}>{myTeam?.name}</h2>
          <p style={{ fontSize:16, color:"rgba(255,255,255,0.7)", margin:0 }}>¡Listo, <strong>{name}</strong>!</p>
        </div>
        <div style={{ background:"rgba(255,255,255,0.1)", backdropFilter:"blur(12px)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:18, padding:"1.25rem", width:"100%", maxWidth:380, marginBottom:16 }}>
          <p style={{ margin:"0 0 12px", fontWeight:700, fontSize:14, color:"rgba(255,255,255,0.8)" }}>👥 Tu equipo</p>
          {players.filter(p=>p.team===player?.team).map((p, i) => (
            <div key={p.id} style={{ fontSize:15, padding:"8px 0", color:"#fff", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", gap:10, animation:`slideUp 0.4s ${i*0.07}s both` }}>
              <span style={{ fontSize:22 }}>👤</span> {p.name}
            </div>
          ))}
        </div>
        <div style={{ background:"rgba(0,0,0,0.3)", backdropFilter:"blur(10px)", borderRadius:16, padding:"1.1rem 1.5rem", textAlign:"center", border:"1px solid rgba(255,255,255,0.15)" }}>
          <div style={{ fontSize:44, marginBottom:8, animation:"floatBounce 2s ease-in-out infinite" }}>⏳</div>
          <div style={{ fontSize:15, color:"rgba(255,255,255,0.85)", fontWeight:600 }}>Esperando que el profe inicie el juego...</div>
        </div>
        <UabcLogo />
      </div>
    )
  }

  // ── JUEGO + FEEDBACK ──────────────────────────────────────────────────────
  if (session?.state === "playing" || session?.state === "feedback") {
    const round = session.current_round
    const q = QUESTIONS[round]
    const myTeamPlayers = players.filter(p=>p.team===player?.team).map(p=>p.name)
    const captain = getCaptain(myTeamPlayers, round)
    const isCaptain = player?.name === captain
    const myAnswer = player ? answers[`${player.id}:${round}`] : undefined
    const myTeam = TEAMS.find(t=>t.id===player?.team)
    const timerPct = (timer / 60) * 100
    const timerColor = timer <= 20 ? "#E21B3C" : timer <= 40 ? "#D89E00" : "#1D9E75"

    // FEEDBACK ──────────────────────────────────────────────────────────────
    if (session.state === "feedback") {
      // Usar la respuesta del capitán para TODOS los miembros del equipo
      const captainPlayerObj = players.find(p => p.name === captain && p.team === player?.team)
      const captainAnswerIdx = captainPlayerObj ? answers[`${captainPlayerObj.id}:${round}`] : undefined
      const teamAnswerIdx = isCaptain ? myAnswer : captainAnswerIdx
      const displayAns = teamAnswerIdx !== undefined ? q.opciones[teamAnswerIdx] : null
      const best = q.opciones[q.mejor]
      const isCorrect = teamAnswerIdx === q.mejor
      const bgGrad = isCorrect
        ? "radial-gradient(ellipse at 50% 0%, #1a5c30 0%, #0a2010 100%)"
        : "radial-gradient(ellipse at 50% 0%, #5c1a1a 0%, #200a0a 100%)"
      return (
        <div style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", fontFamily:"system-ui,sans-serif", background:bgGrad, padding:"1.5rem 1rem 3rem", paddingTop:"2.5rem" }}>
          <style>{ANIM}</style>
          <div style={{ animation:"popIn 0.7s cubic-bezier(0.34,1.56,0.64,1)", textAlign:"center", marginBottom:20 }}>
            <Image src={isCorrect?"/ok.png":"/fail.png"} alt="" width={160} height={160} style={{ objectFit:"contain", filter:"drop-shadow(0 4px 24px rgba(0,0,0,0.5))" }} />
            <h3 style={{ color:"#fff", fontSize:28, fontWeight:900, margin:"14px 0 0", textShadow:"0 2px 12px rgba(0,0,0,0.4)" }}>
              {isCorrect ? "¡Decisión correcta! 🎉" : "Aquí está la clave:"}
            </h3>
            {!isCaptain && (
              <p style={{ fontSize:12, color:"rgba(255,255,255,0.45)", margin:"6px 0 0" }}>
                Tu equipo eligió la opción de <strong style={{ color:myTeam?.color }}>{captain}</strong>
              </p>
            )}
          </div>
          {displayAns && (
            <div style={{ background:"rgba(255,255,255,0.1)", backdropFilter:"blur(12px)", borderRadius:16, padding:"1rem 1.25rem", width:"100%", maxWidth:400, marginBottom:10, border:`1px solid rgba(255,255,255,${isCorrect?0.25:0.15})`, animation:"slideUp 0.5s 0.15s both" }}>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", fontWeight:700, letterSpacing:1.5, marginBottom:6 }}>RESPUESTA DE TU EQUIPO</div>
              <p style={{ margin:"0 0 6px", fontSize:14, color:"#fff", fontWeight:700 }}>{displayAns.texto}</p>
              <p style={{ margin:0, fontSize:13, color:"rgba(255,255,255,0.75)", lineHeight:1.6 }}>{displayAns.feedback}</p>
            </div>
          )}
          {!isCorrect && (
            <div style={{ background:"rgba(29,158,117,0.2)", backdropFilter:"blur(12px)", borderRadius:16, padding:"1rem 1.25rem", width:"100%", maxWidth:400, marginBottom:10, border:"1px solid rgba(29,158,117,0.4)", animation:"slideUp 0.5s 0.3s both" }}>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", fontWeight:700, letterSpacing:1.5, marginBottom:6 }}>✅ MEJOR OPCIÓN</div>
              <p style={{ margin:"0 0 6px", fontSize:14, color:"#fff", fontWeight:700 }}>{best.texto}</p>
              <p style={{ margin:0, fontSize:13, color:"rgba(255,255,255,0.75)", lineHeight:1.6 }}>{best.feedback}</p>
            </div>
          )}
          <div style={{ background:"rgba(24,95,165,0.3)", backdropFilter:"blur(12px)", borderRadius:16, padding:"1rem 1.25rem", width:"100%", maxWidth:400, border:"1px solid rgba(100,160,255,0.3)", animation:"slideUp 0.5s 0.45s both" }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", fontWeight:700, letterSpacing:1.5, marginBottom:6 }}>💡 CONCEPTO CLAVE</div>
            <p style={{ margin:0, fontSize:14, color:"#fff", lineHeight:1.6, fontWeight:500 }}>{q.concepto}</p>
          </div>
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.35)", marginTop:20 }}>Esperando siguiente ronda...</p>
          <UabcLogo />
        </div>
      )
    }

    // PREGUNTA — KAHOOT STYLE ─────────────────────────────────────────────
    return (
      <div style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", fontFamily:"system-ui,sans-serif", background:"#12122a" }}>
        <style>{ANIM}</style>

        {/* ── Top bar ── */}
        <div style={{ padding:"0.875rem 1rem 0.5rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          {/* Team mascot + round */}
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Image src={teamImg[myTeam?.id||1]} alt={myTeam?.name||""} width={52} height={52} style={{ objectFit:"contain", filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }} />
            <div>
              <div style={{ background:myTeam?.color||"#1D9E75", borderRadius:8, padding:"2px 10px", fontSize:12, fontWeight:800, color:"#fff", display:"inline-block" }}>
                {round+1}/15
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontWeight:600, marginTop:2 }}>{q.mes}</div>
            </div>
          </div>
          {/* Timer circle */}
          <div style={{ background:timerColor, borderRadius:50, width:54, height:54, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 24px ${timerColor}88`, animation:timer<=10?"shake 0.4s infinite":"none", transition:"background 0.4s", flexShrink:0 }}>
            <span style={{ fontSize:22, fontWeight:900, color:"#fff", fontVariantNumeric:"tabular-nums" }}>{timer}</span>
          </div>
        </div>

        {/* Timer bar */}
        <div style={{ height:6, background:"rgba(255,255,255,0.08)", margin:"0 1rem 0.75rem", borderRadius:3 }}>
          <div style={{ height:6, background:timerColor, width:`${timerPct}%`, borderRadius:3, transition:"width 1s linear, background 0.4s", boxShadow:`0 0 8px ${timerColor}88` }}/>
        </div>

        {/* Captain badge */}
        <div style={{ margin:"0 1rem 0.75rem", padding:"12px 16px", borderRadius:14, background:isCaptain?"rgba(255,210,0,0.15)":"rgba(255,255,255,0.05)", border:`2px solid ${isCaptain?"rgba(255,210,0,0.5)":"rgba(255,255,255,0.1)"}`, display:"flex", alignItems:"center", justifyContent:"center", gap:12 }}>
          {isCaptain
            ? <><Image src="/cap.png" alt="cap" width={44} height={44} style={{ objectFit:"contain", filter:"drop-shadow(0 2px 8px rgba(255,210,0,0.5))" }} /><span style={{ fontWeight:900, color:"#FFD700", fontSize:15, letterSpacing:0.5 }}>⚡ ¡RESPONDES TÚ ESTA RONDA!</span></>
            : <><Image src={teamImg[myTeam?.id||1]} alt="" width={36} height={36} style={{ objectFit:"contain" }} /><span style={{ fontSize:14, color:"rgba(255,255,255,0.6)" }}>Responde: <strong style={{ color:myTeam?.color, fontSize:15 }}>{captain}</strong></span></>
          }
        </div>

        {/* Question card */}
        <div style={{ margin:"0 1rem 1rem", background:"rgba(255,255,255,0.07)", borderRadius:18, padding:"1.1rem 1.25rem", flex:1, display:"flex", flexDirection:"column", justifyContent:"center", border:"1px solid rgba(255,255,255,0.1)", animation:"slideUp 0.5s ease" }}>
          <p style={{ margin:"0 0 10px", fontSize:13, color:"rgba(255,255,255,0.5)", lineHeight:1.7 }}>{q.situacion}</p>
          <p style={{ margin:0, fontWeight:800, fontSize:17, color:"#fff", lineHeight:1.45 }}>{q.pregunta}</p>
        </div>

        {/* 2×2 Answer grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9, padding:"0 1rem", marginBottom:8 }}>
          {q.opciones.map((op, i) => {
            const chosen = myAnswer === i
            const answered = myAnswer !== undefined
            const canClick = isCaptain
            const col = ANSWER_COLORS[i]
            return (
              <button key={i} onClick={()=>canClick&&submitAnswer(i)}
                style={{ padding:"0.875rem 0.75rem", borderRadius:16, border:`3px solid ${chosen?"#fff":"transparent"}`, background:col, cursor:canClick?"pointer":"default", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:7, minHeight:96, opacity:(!canClick&&!chosen)||(answered&&!chosen)?0.45:1, boxShadow:chosen?`0 0 0 3px ${col}99, 0 8px 28px rgba(0,0,0,0.5)`:"0 4px 14px rgba(0,0,0,0.35)", transition:"all 0.18s", transform:chosen?"scale(1.04)":"scale(1)", animation:`popIn 0.45s ${i*0.07}s both` }}>
                <div style={{ width:30, height:30, borderRadius:8, background:"rgba(255,255,255,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:15, color:"#fff" }}>
                  {ANSWER_LETTERS[i]}
                </div>
                <span style={{ fontSize:12, color:"#fff", fontWeight:700, lineHeight:1.4, textAlign:"center" }}>{op.texto}</span>
              </button>
            )
          })}
        </div>

        {myAnswer !== undefined && (
          <div style={{ margin:"0 1rem 1rem", padding:"10px 14px", background:"rgba(29,158,117,0.2)", border:"1.5px solid rgba(29,158,117,0.5)", borderRadius:12, textAlign:"center", animation:"popIn 0.35s ease" }}>
            <span style={{ fontSize:13, color:"#4DFFA8", fontWeight:700 }}>✓ Respuesta guardada — puedes cambiarla</span>
          </div>
        )}
        {!isCaptain && myAnswer === undefined && (
          <div style={{ margin:"0 1rem 1rem", textAlign:"center" }}>
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>
              Solo <strong style={{ color:myTeam?.color }}>{captain}</strong> puede responder esta ronda — debate con tu equipo
            </span>
          </div>
        )}
        <UabcLogo />
      </div>
    )
  }

  // ── RESULTADOS ───────────────────────────────────────────────────────────
  if (step === "results" || session?.state === "results") {
    const myTeam = TEAMS.find(t=>t.id===player?.team)
    const myTeamPlayers = players.filter(p=>p.team===player?.team)

    // Puntuación sin cap superior — normalizada al final contra el máximo posible
    const MAX_SIM = QUESTIONS.reduce((acc, q) => acc + Math.max(...q.opciones.map(o => o.efecto)), 50)
    let simScore = 50
    for (let r = 0; r < QUESTIONS.length; r++) {
      const captainName = getCaptain(myTeamPlayers.map(p=>p.name), r)
      const captainPlayer = myTeamPlayers.find(p=>p.name===captainName)
      if (!captainPlayer) { simScore = Math.max(0, simScore - 5); continue }
      const ans = answers[`${captainPlayer.id}:${r}`]
      if (ans === undefined) { simScore = Math.max(0, simScore - 5); continue }
      simScore = Math.max(0, simScore + QUESTIONS[r].opciones[ans].efecto)
    }
    const calificacion = parseFloat(Math.min(10, (simScore / MAX_SIM) * 10).toFixed(1))
    const pct = Math.round((simScore / MAX_SIM) * 100)
    const calColor = calificacion >= 8 ? "#4DFFA8" : calificacion >= 6 ? "#FFD700" : "#FF6B6B"
    const calLabel = calificacion >= 9 ? "¡Excelente!" : calificacion >= 8 ? "¡Muy bien!" : calificacion >= 6 ? "Bien" : calificacion >= 5 ? "Suficiente" : "A mejorar"

    return (
      <div style={darkPageStyle(`linear-gradient(160deg, #0d0d1a 0%, ${myTeam?.color||"#1D9E75"}bb 100%)`)}>
        <style>{ANIM}</style>
        <div style={{ animation:"popIn 0.8s cubic-bezier(0.34,1.56,0.64,1)", marginBottom:10 }}>
          <Image src="/win.png" alt="resultados" width={130} height={130} style={{ objectFit:"contain", filter:"drop-shadow(0 4px 32px rgba(0,0,0,0.5))", animation:"pulse 2.5s ease-in-out infinite" }} />
        </div>
        <h2 style={{ fontSize:28, fontWeight:900, color:"#fff", margin:"0 0 4px", textAlign:"center" }}>¡Resultados finales!</h2>
        <p style={{ fontSize:14, color:"rgba(255,255,255,0.5)", margin:"0 0 20px", textAlign:"center" }}>CashFlow Wars · UABC Mercadotecnia</p>

        {/* Calificación grande */}
        <div style={{ background:"rgba(255,255,255,0.08)", backdropFilter:"blur(16px)", border:`2px solid ${calColor}66`, borderRadius:20, padding:"1.25rem", width:"100%", maxWidth:400, marginBottom:12, textAlign:"center", animation:"slideUp 0.6s 0.1s both" }}>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", fontWeight:700, letterSpacing:2, marginBottom:8 }}>CALIFICACIÓN DEL EQUIPO</div>
          <div style={{ fontSize:72, fontWeight:900, color:calColor, lineHeight:1, textShadow:`0 0 30px ${calColor}88` }}>{calificacion}</div>
          <div style={{ fontSize:14, color:calColor, fontWeight:700, marginTop:4 }}>{calLabel}</div>
          <div style={{ margin:"12px 0 4px", background:"rgba(255,255,255,0.06)", borderRadius:8, height:10 }}>
            <div style={{ height:10, borderRadius:8, background:calColor, width:`${pct}%`, transition:"width 1s ease", boxShadow:`0 0 10px ${calColor}88` }}/>
          </div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.55)", marginTop:6 }}>
            Salud financiera del negocio: {simScore}/100
          </div>
        </div>

        {/* Equipo e integrantes */}
        {myTeam && (
          <div style={{ background:"rgba(255,255,255,0.08)", backdropFilter:"blur(16px)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:18, padding:"1.1rem", width:"100%", maxWidth:400, marginBottom:12, animation:"slideUp 0.6s 0.25s both" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <Image src={teamImg[myTeam.id]} alt={myTeam.name} width={48} height={48} style={{ objectFit:"contain" }} />
              <span style={{ fontWeight:900, fontSize:18, color:"#fff" }}>{myTeam.name}</span>
            </div>
            {myTeamPlayers.map((p, i) => (
              <div key={p.id} style={{ fontSize:14, padding:"6px 0", color:"rgba(255,255,255,0.85)", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", gap:10, animation:`slideUp 0.4s ${0.25+i*0.07}s both` }}>
                <span style={{ fontSize:20 }}>👤</span> {p.name}
              </div>
            ))}
          </div>
        )}

        {/* Evidencia */}
        <div style={{ background:"rgba(255,240,100,0.1)", backdropFilter:"blur(8px)", border:"1.5px solid rgba(255,220,80,0.35)", borderRadius:16, padding:"1rem 1.25rem", width:"100%", maxWidth:400, marginBottom:12, animation:"slideUp 0.6s 0.4s both" }}>
          <p style={{ margin:"0 0 6px", fontWeight:900, fontSize:15, color:"#FFD700" }}>📸 Evidencia para Blackboard</p>
          <p style={{ margin:0, fontSize:13, color:"rgba(255,255,255,0.85)", lineHeight:1.65 }}>
            Toma un <strong>screenshot de esta pantalla</strong> con tu calificación y los nombres visibles, y súbelo a Blackboard.
          </p>
        </div>

        <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8, opacity:0.3 }}>
          <Image src="/uabc.png" alt="UABC" width={20} height={20} />
          <span style={{ fontSize:11, color:"#fff" }}>UABC · Mercadotecnia</span>
        </div>
      </div>
    )
  }

  return (
    <div style={darkPageStyle("#12122a")}>
      <style>{ANIM}</style>
      <div style={{ fontSize:48, animation:"pulse 1.5s ease-in-out infinite" }}>💰</div>
      <p style={{ color:"rgba(255,255,255,0.4)", fontSize:15, marginTop:12 }}>Conectando...</p>
      <UabcLogo />
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────
const darkPageStyle = (bg: string): React.CSSProperties => ({
  minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center",
  justifyContent:"flex-start", padding:"1.25rem 1rem 3rem", fontFamily:"system-ui,sans-serif",
  maxWidth:440, margin:"0 auto", paddingTop:"3rem", background:bg
})

const actionBtn = (from: string, to: string): React.CSSProperties => ({
  marginTop:14, width:"100%", padding:"17px", background:`linear-gradient(135deg, ${from}, ${to})`,
  color:"#fff", border:"none", borderRadius:14, fontSize:17, fontWeight:800,
  cursor:"pointer", boxShadow:`0 6px 24px ${from}55`, letterSpacing:0.3,
  fontFamily:"system-ui,sans-serif"
})
