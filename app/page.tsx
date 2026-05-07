"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { TEAMS, getCaptain, getCompanySize, playSound } from "@/lib/game"
import { QUESTIONS } from "@/lib/questions"
import Image from "next/image"

type Session = { id: string; code: string; current_round: number; state: string }
type Player = { id: string; name: string; team: number }

const levelImg = (score: number) => {
  if (score >= 80) return "/nivel5-corporativo.png"
  if (score >= 60) return "/nivel4-regional.png"
  if (score >= 40) return "/nivel3-pyme.png"
  if (score >= 20) return "/nivel2-micro.png"
  return "/nivel1-kiosco.png"
}

function UabcLogo() {
  return (
    <div style={{ position:"fixed", bottom:12, right:12, opacity:0.2, pointerEvents:"none" }}>
      <Image src="/uabc.png" alt="UABC" width={28} height={28} />
    </div>
  )
}

export default function Home() {
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [session, setSession] = useState<Session | null>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [timer, setTimer] = useState(30)
  const [step, setStep] = useState<"intro"|"code"|"name"|"team"|"lobby"|"game"|"feedback"|"results">("intro")
  const [introStep, setIntroStep] = useState(0)

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
      const t = setTimeout(() => setStep("code"), 2000)
      return () => clearTimeout(t)
    }
  }, [step, introStep])

  useEffect(() => {
    if (!session) return
    const ch = supabase.channel(`session:${session.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: `id=eq.${session.id}` },
        (payload) => {
          const s = payload.new as Session
          setSession(s)
          if (s.state === "playing") setTimer(30)
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

  useEffect(() => {
    if (!session || session.state !== "playing") return
    if (timer <= 0) return
    const t = setTimeout(() => {
      setTimer(s => s - 1)
      if (timer <= 5) playSound("tick")
      else if (timer === 11) playSound("warning")
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
    if (data) { setPlayer(data); setStep("lobby"); playSound("join") }
  }

  async function submitAnswer(optIdx: number) {
    if (!player || !session) return
    const key = `${player.id}:${session.current_round}`
    const prevAnswer = answers[key]
    if (prevAnswer === optIdx) return  // same option clicked, ignore
    playSound("select")
    if (prevAnswer !== undefined) {
      await supabase.from("answers").update({ option_index: optIdx }).eq("player_id", player.id).eq("round", session.current_round).eq("session_id", session.id)
    } else {
      await supabase.from("answers").insert({ session_id: session.id, player_id: player.id, round: session.current_round, option_index: optIdx })
    }
    const q = QUESTIONS[session.current_round]
    playSound(optIdx === q.mejor ? "correct" : "wrong")
  }

  // INTRO
  if (step === "intro") {
    const s = INTRO_STEPS[introStep]
    return (
      <div style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#0a0a0a", color:"#fff", fontFamily:"sans-serif", textAlign:"center", padding:"2rem" }}>
        <div key={introStep} style={{ animation:"fadeIn 0.6s ease", display:"flex", flexDirection:"column", alignItems:"center" }}>
          {introStep === 0
            ? <Image src="/intro.png" alt="CashFlow Wars" width={120} height={120} style={{ marginBottom:16 }} />
            : <div style={{ fontSize:72, marginBottom:16 }}>{s.emoji}</div>
          }
          <h1 style={{ fontSize:32, fontWeight:700, margin:"0 0 12px", letterSpacing:2 }}>{s.title}</h1>
          <p style={{ fontSize:18, color:"#aaa", margin:0 }}>{s.sub}</p>
        </div>
        <div style={{ position:"fixed", bottom:16, right:16, opacity:0.15 }}>
          <Image src="/uabc.png" alt="UABC" width={28} height={28} />
        </div>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}`}</style>
      </div>
    )
  }

  // CÓDIGO
  if (step === "code") return (
    <div style={pageStyle}>
      <div style={{ fontSize:48, marginBottom:8 }}>💰</div>
      <h1 style={titleStyle}>CashFlow Wars</h1>
      <p style={subStyle}>Ingresa el código de tu clase</p>
      <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="ej: FLUJO123" maxLength={10}
        style={{ ...inputStyle, textAlign:"center", fontSize:24, letterSpacing:4, fontWeight:700 }} />
      <button onClick={joinSession} style={btnStyle("#1D9E75")}>Entrar →</button>
      <UabcLogo />
    </div>
  )

  // NOMBRE
  if (step === "name") return (
    <div style={pageStyle}>
      <h2 style={titleStyle}>¿Cómo te llamas?</h2>
      <p style={subStyle}>Escribe tu nombre completo</p>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Tu nombre completo" style={inputStyle}
        onKeyDown={e=>e.key==="Enter"&&name.trim()&&setStep("team")} />
      <button onClick={()=>name.trim()&&setStep("team")} style={btnStyle("#185FA5")}>Continuar →</button>
      <UabcLogo />
    </div>
  )

  // EQUIPO
  const teamImg: Record<number,string> = { 1:"/e1.png", 2:"/e2.png", 3:"/e4.png", 4:"/e3.png" }

  if (step === "team") return (
    <div style={pageStyle}>
      <h2 style={titleStyle}>Elige tu equipo</h2>
      <p style={subStyle}>Hola, <strong>{name}</strong></p>
      <div style={{ display:"grid", gap:12, width:"100%" }}>
        {TEAMS.map(t => {
          const count = players.filter(p=>p.team===t.id).length
          return (
            <button key={t.id} onClick={()=>joinTeam(t.id)}
              style={{ padding:"0.875rem", border:`2px solid ${t.color}`, borderRadius:12, background:t.light, cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:12, boxShadow:`0 2px 8px ${t.color}22` }}>
              <Image src={teamImg[t.id]} alt={t.name} width={56} height={56} style={{ objectFit:"contain" }} />
              <div>
                <div style={{ fontWeight:700, color:t.color, fontSize:16 }}>{t.name}</div>
                <div style={{ fontSize:13, color:"#666" }}>{count} integrante(s)</div>
              </div>
            </button>
          )
        })}
      </div>
      <UabcLogo />
    </div>
  )

  // LOBBY
  if (step === "lobby" && session?.state === "lobby") {
    const myTeam = TEAMS.find(t=>t.id===player?.team)
    return (
      <div style={pageStyle}>
        {myTeam && <Image src={teamImg[myTeam.id]} alt={myTeam.name} width={90} height={90} style={{ objectFit:"contain", marginBottom:4 }} />}
        <h2 style={{ ...titleStyle, color:myTeam?.color }}>{myTeam?.name}</h2>
        <p style={subStyle}>Bienvenido, <strong>{name}</strong></p>
        <div style={{ background:"#f5f5f3", borderRadius:12, padding:"1rem", width:"100%", marginTop:8 }}>
          <p style={{ margin:"0 0 8px", fontWeight:600, fontSize:14 }}>Integrantes del equipo:</p>
          {players.filter(p=>p.team===player?.team).map(p=>(
            <div key={p.id} style={{ fontSize:14, padding:"4px 0", color:"#333" }}>👤 {p.name}</div>
          ))}
        </div>
        <div style={{ marginTop:12, padding:"0.875rem", background:"#EAF3DE", borderRadius:10, width:"100%", textAlign:"center" }}>
          <div style={{ fontSize:20, marginBottom:4 }}>⏳</div>
          <div style={{ fontSize:13, color:"#3B6D11", fontWeight:500 }}>Esperando que el profe inicie el juego...</div>
        </div>
        <UabcLogo />
      </div>
    )
  }

  // JUEGO Y FEEDBACK
  if (session?.state === "playing" || session?.state === "feedback") {
    const round = session.current_round
    const q = QUESTIONS[round]
    const myTeamPlayers = players.filter(p=>p.team===player?.team).map(p=>p.name)
    const captain = getCaptain(myTeamPlayers, round)
    const isCaptain = player?.name === captain
    const myAnswer = player ? answers[`${player.id}:${round}`] : undefined
    const myTeam = TEAMS.find(t=>t.id===player?.team)
    const timerColor = timer <= 10 ? "#E24B4A" : timer <= 20 ? "#BA7517" : "#185FA5"

    // FEEDBACK
    if (session.state === "feedback") {
      const myAns = myAnswer !== undefined ? q.opciones[myAnswer] : null
      const best = q.opciones[q.mejor]
      const isCorrect = myAnswer === q.mejor
      return (
        <div style={pageStyle}>
          <Image src={isCorrect?"/ok.png":"/fail.png"} alt={isCorrect?"correcto":"incorrecto"} width={90} height={90} style={{ objectFit:"contain", marginBottom:4 }} />
          <h3 style={{ margin:"0 0 12px", fontSize:18, fontWeight:700 }}>{isCorrect ? "¡Decisión correcta!" : "Aquí la clave:"}</h3>
          {myAns && (
            <div style={{ background: isCorrect?"#EAF3DE":"#FCEBEB", borderRadius:12, padding:"0.875rem", width:"100%", marginBottom:8, border:`1px solid ${isCorrect?"#B2DFCA":"#F5C6C6"}` }}>
              <p style={{ margin:"0 0 4px", fontWeight:700, fontSize:13, color: isCorrect?"#3B6D11":"#A32D2D" }}>Tu respuesta:</p>
              <p style={{ margin:"0 0 6px", fontSize:13, color: isCorrect?"#3B6D11":"#A32D2D" }}>{myAns.texto}</p>
              <p style={{ margin:0, fontSize:12, color:"#555", lineHeight:1.5 }}>{myAns.feedback}</p>
            </div>
          )}
          {!isCorrect && (
            <div style={{ background:"#EAF3DE", borderRadius:12, padding:"0.875rem", width:"100%", marginBottom:8, border:"1px solid #B2DFCA" }}>
              <p style={{ margin:"0 0 4px", fontWeight:700, fontSize:13, color:"#3B6D11" }}>Mejor opción:</p>
              <p style={{ margin:"0 0 6px", fontSize:13, color:"#3B6D11" }}>{best.texto}</p>
              <p style={{ margin:0, fontSize:12, color:"#3B6D11", lineHeight:1.5 }}>{best.feedback}</p>
            </div>
          )}
          <div style={{ background:"#E6F1FB", borderRadius:12, padding:"0.875rem", width:"100%", border:"1px solid #C2D9F5" }}>
            <p style={{ margin:0, fontWeight:700, fontSize:13, color:"#0C447C" }}>💡 Concepto clave:</p>
            <p style={{ margin:"4px 0 0", fontSize:13, color:"#0C447C", lineHeight:1.5 }}>{q.concepto}</p>
          </div>
          <p style={{ fontSize:12, color:"#aaa", marginTop:10 }}>Esperando siguiente ronda...</p>
          <UabcLogo />
        </div>
      )
    }

    // PREGUNTA
    return (
      <div style={pageStyle}>
        {/* Header ronda */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%", marginBottom:6 }}>
          <span style={{ fontSize:11, color:"#888", fontWeight:600 }}>RONDA {round+1}/15 · {q.mes}</span>
          <span style={{ fontSize:20, fontWeight:700, color:timerColor, fontVariantNumeric:"tabular-nums" }}>{timer}s</span>
        </div>
        {/* Barra de progreso */}
        <div style={{ background:"#f0f0ee", borderRadius:8, height:5, width:"100%", marginBottom:10 }}>
          <div style={{ background:myTeam?.color||"#1D9E75", height:5, borderRadius:8, width:`${((round+1)/15)*100}%`, transition:"width 0.5s" }}/>
        </div>
        {/* Timer bar */}
        <div style={{ background:"#f0f0ee", borderRadius:4, height:4, width:"100%", marginBottom:12 }}>
          <div style={{ background:timerColor, height:4, borderRadius:4, width:`${(timer/30)*100}%`, transition:"width 1s linear, background 0.3s" }}/>
        </div>

        {/* Capitán badge */}
        <div style={{ background: isCaptain?"#FAEEDA":"#f5f5f3", borderRadius:10, padding:"8px 12px", width:"100%", marginBottom:10, textAlign:"center", border:`1px solid ${isCaptain?"#E8C97A":"#eee"}`, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {isCaptain
            ? <><Image src="/cap.png" alt="capitán" width={32} height={32} style={{ objectFit:"contain" }} /><span style={{ fontWeight:700, color:"#BA7517", fontSize:14 }}>Esta ronda respondes TÚ</span></>
            : <span style={{ fontSize:13, color:"#666" }}>Responde: <strong style={{ color: myTeam?.color }}>{captain}</strong></span>
          }
        </div>

        {/* Situación */}
        <div style={{ background:"#fff", border:"1px solid #eee", borderRadius:12, padding:"0.875rem", width:"100%", marginBottom:10, boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
          <p style={{ margin:"0 0 4px", fontSize:11, color:"#aaa", fontWeight:700, letterSpacing:1 }}>SITUACIÓN</p>
          <p style={{ margin:"0 0 8px", fontSize:13, lineHeight:1.6, color:"#333" }}>{q.situacion}</p>
          <p style={{ margin:0, fontWeight:700, fontSize:14, color:"#111" }}>{q.pregunta}</p>
        </div>

        {/* Opciones */}
        <div style={{ display:"grid", gap:8, width:"100%" }}>
          {q.opciones.map((op, i) => {
            const chosen = myAnswer === i
            const disabled = !isCaptain || myAnswer !== undefined
            return (
              <button key={i} onClick={()=>!disabled&&submitAnswer(i)}
                style={{ padding:"10px 14px", borderRadius:10,
                  border:`1.5px solid ${chosen?"#185FA5":"#e5e5e5"}`,
                  background: chosen?"#E6F1FB":"#fafafa",
                  cursor:disabled?"default":"pointer",
                  opacity: myAnswer!==undefined&&!chosen?0.45:1,
                  fontSize:13, lineHeight:1.5, textAlign:"left",
                  fontFamily:"sans-serif", width:"100%",
                  transition:"all 0.15s",
                  boxShadow: chosen?"0 0 0 3px rgba(24,95,165,0.15)":"none" }}>
                <span style={{ fontWeight:700, color: chosen?"#185FA5":"#bbb", marginRight:8 }}>{String.fromCharCode(65+i)}.</span>
                <span style={{ color: chosen?"#185FA5":"#333" }}>{op.texto}</span>
              </button>
            )
          })}
        </div>

        {myAnswer !== undefined && (
          <div style={{ marginTop:10, padding:"8px 12px", background:"#EAF3DE", borderRadius:8, width:"100%", textAlign:"center" }}>
            <span style={{ fontSize:13, color:"#3B6D11", fontWeight:600 }}>✓ Respuesta registrada — puedes cambiarla antes de que el profe avance</span>
          </div>
        )}
        {!isCaptain && myAnswer === undefined && (
          <p style={{ fontSize:12, color:"#aaa", marginTop:8, textAlign:"center" }}>Debate con tu equipo — solo <strong>{captain}</strong> puede responder</p>
        )}
        <UabcLogo />
      </div>
    )
  }

  // RESULTADOS
  if (step === "results" || session?.state === "results") {
    const myTeam = TEAMS.find(t=>t.id===player?.team)
    const myTeamPlayers = players.filter(p=>p.team===player?.team)
    return (
      <div style={pageStyle}>
        <Image src="/win.png" alt="resultados" width={110} height={110} style={{ objectFit:"contain", marginBottom:4 }} />
        <h2 style={{ ...titleStyle, marginBottom:4 }}>¡Resultados finales!</h2>
        <p style={subStyle}>CashFlow Wars · UABC Mercadotecnia</p>

        {myTeam && (
          <div style={{ background:myTeam.light, border:`2px solid ${myTeam.color}`, borderRadius:14, padding:"1rem", width:"100%", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Image src={teamImg[myTeam.id]} alt={myTeam.name} width={44} height={44} style={{ objectFit:"contain" }} />
                <span style={{ fontWeight:700, fontSize:16, color:myTeam.color }}>{myTeam.name}</span>
              </div>
              <Image src={levelImg(50)} alt="nivel" width={56} height={56} style={{ objectFit:"contain", transition:"all 0.5s ease" }} />
            </div>
            <p style={{ margin:"0 0 8px", fontSize:13, fontWeight:600, color:"#555" }}>Integrantes del equipo:</p>
            {myTeamPlayers.map(p => (
              <div key={p.id} style={{ fontSize:14, padding:"3px 0", color:"#333" }}>👤 {p.name}</div>
            ))}
          </div>
        )}

        <div style={{ background:"#FFFBEA", border:"1.5px solid #E8C97A", borderRadius:12, padding:"1rem", width:"100%", marginBottom:10 }}>
          <p style={{ margin:"0 0 6px", fontWeight:700, fontSize:14, color:"#7A5C00" }}>📸 Evidencia para Blackboard</p>
          <p style={{ margin:0, fontSize:13, color:"#7A5C00", lineHeight:1.6 }}>
            Toma un <strong>screenshot de esta pantalla</strong> con los nombres de tu equipo visibles y súbelo a Blackboard como evidencia de participación.
          </p>
        </div>

        <div style={{ background:"#EAF3DE", borderRadius:12, padding:"1rem", width:"100%" }}>
          <p style={{ margin:"0 0 4px", fontWeight:700, fontSize:13, color:"#3B6D11" }}>💡 Para llevar:</p>
          <p style={{ margin:0, fontSize:13, color:"#3B6D11", lineHeight:1.6 }}>
            El flujo de efectivo no es lo mismo que la utilidad. Una empresa puede tener ganancias en papel y quebrar por falta de liquidez.
          </p>
        </div>

        <div style={{ marginTop:16, display:"flex", alignItems:"center", gap:8, opacity:0.5 }}>
          <Image src="/uabc.png" alt="UABC" width={20} height={20} />
          <span style={{ fontSize:11, color:"#888" }}>UABC · Mercadotecnia</span>
        </div>
      </div>
    )
  }

  return <div style={pageStyle}><p style={subStyle}>Conectando...</p><UabcLogo /></div>
}

const pageStyle: React.CSSProperties = {
  minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center",
  justifyContent:"flex-start", padding:"1.25rem 1rem 3rem", fontFamily:"sans-serif",
  maxWidth:420, margin:"0 auto", paddingTop:"2rem"
}
const titleStyle: React.CSSProperties = { fontSize:24, fontWeight:700, margin:"8px 0 4px", textAlign:"center" }
const subStyle: React.CSSProperties = { fontSize:14, color:"#666", margin:"0 0 16px", textAlign:"center" }
const inputStyle: React.CSSProperties = {
  width:"100%", padding:"12px", borderRadius:10, border:"1.5px solid #e5e5e5",
  fontSize:16, marginBottom:12, boxSizing:"border-box", fontFamily:"sans-serif",
  outline:"none"
}
const btnStyle = (bg: string): React.CSSProperties => ({
  width:"100%", padding:"14px", background:bg, color:"#fff", border:"none",
  borderRadius:10, fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:"sans-serif",
  boxShadow:`0 4px 12px ${bg}44`
})
