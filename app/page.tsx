"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { TEAMS, getCaptain, getCompanySize, playSound } from "@/lib/game"
import { QUESTIONS } from "@/lib/questions"

type Session = { id: string; code: string; current_round: number; state: string }
type Player = { id: string; name: string; team: number }

export default function Home() {
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [session, setSession] = useState<Session | null>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [showFeedback, setShowFeedback] = useState(false)
  const [scores, setScores] = useState<Record<number, number>>({ 1:50, 2:50, 3:50, 4:50 })
  const [timer, setTimer] = useState(30)
  const [step, setStep] = useState<"intro"|"code"|"name"|"team"|"lobby"|"game"|"feedback"|"results">("intro")
  const [introStep, setIntroStep] = useState(0)

  const INTRO_STEPS = [
    { title: "CASHFLOW WARS", sub: "El simulador empresarial", emoji: "💰" },
    { title: "4 equipos", sub: "Una sola ciudad. Tijuana.", emoji: "🏙️" },
    { title: "15 decisiones", sub: "Cada una cambia el tamaño de tu empresa", emoji: "📊" },
    { title: "¿Quién llega a Corporativo?", sub: "El mejor equipo financiero gana", emoji: "🏆" },
  ]

  // Intro animada
  useEffect(() => {
    if (step !== "intro") return
    if (introStep < INTRO_STEPS.length - 1) {
      const t = setTimeout(() => setIntroStep(i => i + 1), 1800)
      return () => clearTimeout(t)
    } else {
      const t = setTimeout(() => setStep("code"), 2000)
      return () => clearTimeout(t)
    }
  }, [step, introStep])

  // Suscripción realtime a la sesión
  useEffect(() => {
    if (!session) return
    const ch = supabase.channel(`session:${session.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: `id=eq.${session.id}` },
        (payload) => {
          const s = payload.new as Session
          setSession(s)
          if (s.state === "feedback") { setShowFeedback(true); setTimer(30) }
          if (s.state === "playing") { setShowFeedback(false); setTimer(30) }
          if (s.state === "results") setStep("results")
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `session_id=eq.${session.id}` },
        async () => {
          const { data } = await supabase.from("players").select("*").eq("session_id", session.id)
          if (data) setPlayers(data)
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "answers", filter: `session_id=eq.${session.id}` },
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
  }, [session])

  // Timer
  useEffect(() => {
    if (!session || session.state !== "playing") return
    if (timer <= 0) return
    const t = setTimeout(() => {
      setTimer(s => s - 1)
      if (timer <= 6) playSound("tick")
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
    const { data } = await supabase.from("players").insert({ session_id: session!.id, name, team: teamId }).select().single()
    if (data) { setPlayer(data); setStep("lobby"); playSound("start") }
  }

  async function submitAnswer(optIdx: number) {
    if (!player || !session) return
    const key = `${player.id}:${session.current_round}`
    if (answers[key] !== undefined) return
    await supabase.from("answers").insert({ session_id: session.id, player_id: player.id, round: session.current_round, option_index: optIdx })
    const q = QUESTIONS[session.current_round]
    playSound(optIdx === q.mejor ? "correct" : "wrong")
  }

  if (step === "intro") {
    const s = INTRO_STEPS[introStep]
    return (
      <div style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#0a0a0a", color:"#fff", fontFamily:"sans-serif", textAlign:"center", padding:"2rem" }}>
        <div key={introStep} style={{ animation:"fadeIn 0.6s ease" }}>
          <div style={{ fontSize:72, marginBottom:16 }}>{s.emoji}</div>
          <h1 style={{ fontSize:32, fontWeight:700, margin:"0 0 12px", letterSpacing:2 }}>{s.title}</h1>
          <p style={{ fontSize:18, color:"#aaa", margin:0 }}>{s.sub}</p>
        </div>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}`}</style>
      </div>
    )
  }

  if (step === "code") return (
    <div style={pageStyle}>
      <div style={{ fontSize:48, marginBottom:8 }}>💰</div>
      <h1 style={titleStyle}>CashFlow Wars</h1>
      <p style={subStyle}>Ingresa el código de tu clase</p>
      <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="ej: FLUJO123" maxLength={10}
        style={{ ...inputStyle, textAlign:"center", fontSize:24, letterSpacing:4, fontWeight:700 }} />
      <button onClick={joinSession} style={btnStyle("#1D9E75")}>Entrar →</button>
    </div>
  )

  if (step === "name") return (
    <div style={pageStyle}>
      <h2 style={titleStyle}>¿Cómo te llamas?</h2>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Tu nombre completo" style={inputStyle} />
      <button onClick={()=>name.trim()&&setStep("team")} style={btnStyle("#185FA5")}>Continuar →</button>
    </div>
  )

  if (step === "team") return (
    <div style={pageStyle}>
      <h2 style={titleStyle}>Elige tu equipo</h2>
      <p style={subStyle}>Hola, <strong>{name}</strong></p>
      <div style={{ display:"grid", gap:12, width:"100%" }}>
        {TEAMS.map(t => {
          const count = players.filter(p=>p.team===t.id).length
          return (
            <button key={t.id} onClick={()=>joinTeam(t.id)}
              style={{ padding:"1rem", border:`2px solid ${t.color}`, borderRadius:12, background:t.light, cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:32 }}>{t.emoji}</span>
              <div>
                <div style={{ fontWeight:700, color:t.color, fontSize:16 }}>{t.name}</div>
                <div style={{ fontSize:13, color:"#666" }}>{count} integrante(s)</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )

  if (step === "lobby" && session?.state === "lobby") {
    const myTeam = TEAMS.find(t=>t.id===player?.team)
    return (
      <div style={pageStyle}>
        <div style={{ fontSize:48 }}>{myTeam?.emoji}</div>
        <h2 style={{ ...titleStyle, color:myTeam?.color }}>{myTeam?.name}</h2>
        <p style={subStyle}>Bienvenido, <strong>{name}</strong></p>
        <div style={{ background:"#f5f5f3", borderRadius:12, padding:"1rem", width:"100%", marginTop:8 }}>
          <p style={{ margin:"0 0 8px", fontWeight:600, fontSize:14 }}>Integrantes del equipo:</p>
          {players.filter(p=>p.team===player?.team).map(p=>(
            <div key={p.id} style={{ fontSize:14, padding:"4px 0", color:"#333" }}>👤 {p.name}</div>
          ))}
        </div>
        <div style={{ marginTop:16, padding:"1rem", background:"#EAF3DE", borderRadius:10, width:"100%", textAlign:"center" }}>
          <div style={{ fontSize:13, color:"#3B6D11" }}>Esperando que el profe inicie el juego...</div>
        </div>
      </div>
    )
  }

  if (session?.state === "playing" || session?.state === "feedback") {
    const round = session.current_round
    const q = QUESTIONS[round]
    const myTeamPlayers = players.filter(p=>p.team===player?.team).map(p=>p.name)
    const captain = getCaptain(myTeamPlayers, round)
    const isCaptain = player?.name === captain
    const myAnswer = player ? answers[`${player.id}:${round}`] : undefined
    const myTeam = TEAMS.find(t=>t.id===player?.team)

    if (session.state === "feedback") {
      const q = QUESTIONS[round]
      const myAns = myAnswer !== undefined ? q.opciones[myAnswer] : null
      const best = q.opciones[q.mejor]
      const isCorrect = myAnswer === q.mejor
      return (
        <div style={pageStyle}>
          <div style={{ fontSize:40 }}>{isCorrect ? "✅" : "📚"}</div>
          <h3 style={{ margin:"8px 0 4px", fontSize:17 }}>{isCorrect ? "¡Decisión correcta!" : "Aquí la clave:"}</h3>
          {myAns && (
            <div style={{ background: isCorrect?"#EAF3DE":"#FCEBEB", borderRadius:10, padding:"0.75rem", width:"100%", marginBottom:8 }}>
              <p style={{ margin:"0 0 4px", fontWeight:600, fontSize:13, color: isCorrect?"#3B6D11":"#A32D2D" }}>Tu respuesta: {myAns.texto}</p>
              <p style={{ margin:0, fontSize:12, color:"#555" }}>{myAns.feedback}</p>
            </div>
          )}
          {!isCorrect && (
            <div style={{ background:"#EAF3DE", borderRadius:10, padding:"0.75rem", width:"100%" }}>
              <p style={{ margin:"0 0 4px", fontWeight:600, fontSize:13, color:"#3B6D11" }}>Mejor opción: {best.texto}</p>
              <p style={{ margin:0, fontSize:12, color:"#3B6D11" }}>{best.feedback}</p>
            </div>
          )}
          <div style={{ background:"#E6F1FB", borderRadius:10, padding:"0.75rem", width:"100%", marginTop:8 }}>
            <p style={{ margin:0, fontWeight:600, fontSize:13, color:"#0C447C" }}>💡 {q.concepto}</p>
          </div>
          <p style={{ fontSize:12, color:"#aaa", marginTop:8 }}>Esperando siguiente ronda...</p>
        </div>
      )
    }

    return (
      <div style={pageStyle}>
        <div style={{ display:"flex", justifyContent:"space-between", width:"100%", marginBottom:8 }}>
          <span style={{ fontSize:12, color:"#888" }}>Ronda {round+1}/15 · {q.mes}</span>
          <span style={{ fontSize:18, fontWeight:700, color:timer<=10?"#E24B4A":"#185FA5" }}>{timer}s</span>
        </div>
        <div style={{ background:"#f5f5f3", borderRadius:8, height:4, width:"100%", marginBottom:12 }}>
          <div style={{ background:myTeam?.color||"#1D9E75", height:4, borderRadius:8, width:`${((round+1)/15)*100}%` }}/>
        </div>

        {/* Capitán badge */}
        <div style={{ background: isCaptain?"#FAEEDA":"#f0f0ee", borderRadius:8, padding:"8px 12px", width:"100%", marginBottom:10, textAlign:"center" }}>
          {isCaptain
            ? <span style={{ fontWeight:700, color:"#BA7517", fontSize:14 }}>⭐ Esta ronda respondes TÚ — el equipo debate contigo</span>
            : <span style={{ fontSize:13, color:"#666" }}>Esta ronda responde: <strong>{captain}</strong></span>
          }
        </div>

        <div style={{ background:"#fff", border:"0.5px solid #ddd", borderRadius:10, padding:"0.875rem", width:"100%", marginBottom:12 }}>
          <p style={{ margin:"0 0 6px", fontSize:12, color:"#888", fontWeight:600 }}>SITUACIÓN</p>
          <p style={{ margin:"0 0 8px", fontSize:14, lineHeight:1.6 }}>{q.situacion}</p>
          <p style={{ margin:0, fontWeight:700, fontSize:15 }}>{q.pregunta}</p>
        </div>

        <div style={{ display:"grid", gap:8, width:"100%" }}>
          {q.opciones.map((op, i) => {
            const chosen = myAnswer === i
            const disabled = !isCaptain || myAnswer !== undefined
            return (
              <button key={i} onClick={()=>!disabled&&submitAnswer(i)}
                style={{ padding:"10px 14px", borderRadius:10, border:`1.5px solid ${chosen?"#185FA5":"#ddd"}`,
                  background: chosen?"#E6F1FB":"#fafafa", cursor:disabled?"default":"pointer",
                  opacity: myAnswer!==undefined&&!chosen?0.5:1, fontSize:13, lineHeight:1.5, textAlign:"left",
                  fontFamily:"sans-serif", width:"100%" }}>
                <span style={{ fontWeight:700, color:"#888", marginRight:8 }}>{String.fromCharCode(65+i)}.</span>{op.texto}
              </button>
            )
          })}
        </div>
        {myAnswer !== undefined && <p style={{ fontSize:12, color:"#1D9E75", fontWeight:600, marginTop:8 }}>✓ Respuesta registrada</p>}
        {!isCaptain && myAnswer === undefined && <p style={{ fontSize:12, color:"#aaa", marginTop:8 }}>Debate con tu equipo — solo {captain} puede responder esta ronda</p>}
      </div>
    )
  }

  if (step === "results" || session?.state === "results") {
    return (
      <div style={pageStyle}>
        <div style={{ fontSize:48 }}>🏆</div>
        <h2 style={titleStyle}>¡Resultados finales!</h2>
        <p style={{ fontSize:13, color:"#888" }}>Revisa el marcador proyectado por tu profe</p>
        <div style={{ background:"#EAF3DE", borderRadius:10, padding:"1rem", width:"100%", marginTop:8 }}>
          <p style={{ margin:0, fontWeight:600, fontSize:14, color:"#3B6D11" }}>
            💡 Para llevar: el flujo de efectivo no es lo mismo que la utilidad. Una empresa puede tener ganancias en papel y quebrar por falta de liquidez.
          </p>
        </div>
      </div>
    )
  }

  return <div style={pageStyle}><p style={subStyle}>Conectando...</p></div>
}

const pageStyle: React.CSSProperties = {
  minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center",
  justifyContent:"flex-start", padding:"1.25rem 1rem", fontFamily:"sans-serif",
  maxWidth:420, margin:"0 auto", paddingTop:"2rem"
}
const titleStyle: React.CSSProperties = { fontSize:24, fontWeight:700, margin:"8px 0 4px", textAlign:"center" }
const subStyle: React.CSSProperties = { fontSize:14, color:"#666", margin:"0 0 16px", textAlign:"center" }
const inputStyle: React.CSSProperties = {
  width:"100%", padding:"12px", borderRadius:10, border:"1px solid #ddd",
  fontSize:16, marginBottom:12, boxSizing:"border-box", fontFamily:"sans-serif"
}
const btnStyle = (bg: string): React.CSSProperties => ({
  width:"100%", padding:"14px", background:bg, color:"#fff", border:"none",
  borderRadius:10, fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:"sans-serif"
})
