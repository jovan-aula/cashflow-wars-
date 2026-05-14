"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { TEAMS, generateCode, getCompanySize, playSound } from "@/lib/game"
import { QUESTIONS } from "@/lib/questions"
import QRCode from "react-qr-code"
import Image from "next/image"

const teamImg: Record<number,string> = { 1:"/e1.png", 2:"/e2.png", 3:"/e4.png", 4:"/e3.png" }
const levelImg = (score: number) => {
  if (score >= 80) return "/nivel5-corporativo.png"
  if (score >= 60) return "/nivel4-regional.png"
  if (score >= 40) return "/nivel3-pyme.png"
  if (score >= 20) return "/nivel2-micro.png"
  return "/nivel1-kiosco.png"
}

type Session = { id: string; code: string; current_round: number; state: string }
type Player = { id: string; name: string; team: number }

export default function HostPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [answers, setAnswers] = useState<any[]>([])
  const MAX_SIM = QUESTIONS.reduce((acc, q) => acc + Math.max(...q.opciones.map(o => o.efecto)), 50)
  const [scores, setScores] = useState<Record<number, number>>({ 1:50, 2:50, 3:50, 4:50 })
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState("")
  const [timer, setTimer] = useState(60)

  useEffect(() => { setUrl(window.location.origin) }, [])

  // Restaurar scores desde localStorage si el host recarga accidentalmente
  useEffect(() => {
    if (!session) return
    const saved = localStorage.getItem(`scores:${session.id}`)
    if (saved) setScores(JSON.parse(saved))
  }, [session?.id])

  // Timer del profe
  useEffect(() => {
    if (!session || session.state !== "playing") return
    setTimer(60)
  }, [session?.current_round, session?.state])

  useEffect(() => {
    if (!session || session.state !== "playing") return
    if (timer <= 0) return
    const t = setTimeout(() => setTimer(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timer, session?.state])

  async function createSession() {
    setLoading(true)
    const code = generateCode()
    const { data, error } = await supabase.from("sessions").insert({ code, state:"lobby", current_round:0 }).select().single()
    if (error) { alert("Error: " + error.message); console.error(error) }
    if (data) setSession(data)
    setLoading(false)
  }

  useEffect(() => {
    if (!session) return
    const ch = supabase.channel(`host:${session.id}`)
      .on("postgres_changes", { event:"*", schema:"public", table:"players", filter:`session_id=eq.${session.id}` },
        async () => {
          const { data } = await supabase.from("players").select("*").eq("session_id", session.id)
          if (data) setPlayers(data)
        })
      .on("postgres_changes", { event:"*", schema:"public", table:"answers", filter:`session_id=eq.${session.id}` },
        async () => {
          const { data } = await supabase.from("answers").select("*").eq("session_id", session.id)
          if (data) setAnswers(data)
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [session])

  async function startGame() {
    await supabase.from("sessions").update({ state:"playing", current_round:0 }).eq("id", session!.id)
    setSession(s => s ? {...s, state:"playing", current_round:0} : s)
    setTimer(60)
    playSound("start")
  }

  async function showFeedback() {
    const round = session!.current_round
    const q = QUESTIONS[round]
    const roundAnswers = answers.filter(a => a.round === round)
    const newScores = {...scores}
    TEAMS.forEach(t => {
      const teamPlayers = players.filter(p=>p.team===t.id)
      const ans = roundAnswers.find(a => teamPlayers.some(p=>p.id===a.player_id))
      if (ans !== undefined) {
        newScores[t.id] = Math.max(0, newScores[t.id] + q.opciones[ans.option_index].efecto)
      } else {
        newScores[t.id] = Math.max(0, newScores[t.id] - 5)
      }
    })
    setScores(newScores)
    localStorage.setItem(`scores:${session!.id}`, JSON.stringify(newScores))
    await supabase.from("sessions").update({ state:"feedback" }).eq("id", session!.id)
    setSession(s => s ? {...s, state:"feedback"} : s)
  }

  async function nextRound() {
    const next = session!.current_round + 1
    if (next >= QUESTIONS.length) {
      await supabase.from("sessions").update({ state:"results" }).eq("id", session!.id)
      setSession(s => s ? {...s, state:"results"} : s)
      playSound("win")
    } else {
      await supabase.from("sessions").update({ state:"playing", current_round:next }).eq("id", session!.id)
      setSession(s => s ? {...s, state:"playing", current_round:next} : s)
      setTimer(60)
    }
  }

  const round = session?.current_round ?? 0
  const q = QUESTIONS[round]
  const roundAnswers = answers.filter(a => a.round === round)
  const sortedTeams = [...TEAMS].sort((a,b)=>(scores[b.id]||0)-(scores[a.id]||0))
  const timerColor = timer <= 20 ? "#E24B4A" : timer <= 40 ? "#BA7517" : "#1D9E75"

  if (!session) return (
    <div style={hostPageStyle}>
      <Image src="/uabc.png" alt="UABC" width={48} height={48} style={{ marginBottom:12, opacity:0.7 }} />
      <h1 style={{ fontSize:28, fontWeight:700, marginBottom:4 }}>💰 CashFlow Wars</h1>
      <p style={{ color:"#888", marginBottom:28, fontSize:14 }}>Panel del Profesor · UABC Mercadotecnia</p>
      <button onClick={createSession} disabled={loading}
        style={{ padding:"14px 40px", background:"#1D9E75", color:"#fff", border:"none", borderRadius:12, fontSize:18, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 12px rgba(29,158,117,0.3)" }}>
        {loading ? "Creando..." : "🚀 Crear nueva sesión"}
      </button>
    </div>
  )

  return (
    <div style={{ padding:"1.5rem", fontFamily:"sans-serif", maxWidth:1000, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem", flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Image src="/uabc.png" alt="UABC" width={36} height={36} style={{ opacity:0.75 }} />
          <div>
            <h1 style={{ margin:0, fontSize:20, fontWeight:700 }}>💰 CashFlow Wars</h1>
            <p style={{ margin:0, color:"#888", fontSize:12 }}>Estado: <strong>{session.state}</strong> · Ronda {round+1}/15</p>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {session.state === "playing" && (
            <div style={{ background: timer<=10?"#FCEBEB":timer<=20?"#FAEEDA":"#EAF3DE", borderRadius:12, padding:"0.6rem 1rem", textAlign:"center", minWidth:70 }}>
              <div style={{ fontSize:28, fontWeight:700, color:timerColor, fontVariantNumeric:"tabular-nums" }}>{timer}s</div>
              <div style={{ fontSize:10, color:"#888" }}>tiempo</div>
            </div>
          )}
          <div style={{ background:"#f5f5f3", borderRadius:12, padding:"0.75rem 1rem", textAlign:"center" }}>
            <div style={{ fontSize:26, fontWeight:700, letterSpacing:4, color:"#185FA5" }}>{session.code}</div>
            <div style={{ fontSize:11, color:"#888" }}>Código de sesión</div>
          </div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem", marginBottom:"1.5rem" }}>
        {/* QR */}
        <div style={{ background:"#fff", border:"0.5px solid #ddd", borderRadius:12, padding:"1rem", textAlign:"center" }}>
          <p style={{ margin:"0 0 8px", fontWeight:600, fontSize:13 }}>Los estudiantes escanean esto:</p>
          {url && <QRCode value={url} size={160} />}
          <p style={{ margin:"8px 0 0", fontSize:12, color:"#888" }}>{url}</p>
        </div>

        {/* Marcador */}
        <div style={{ background:"#fff", border:"0.5px solid #ddd", borderRadius:12, padding:"1rem" }}>
          <p style={{ margin:"0 0 10px", fontWeight:600, fontSize:13 }}>Marcador en vivo</p>
          {sortedTeams.map((t,i) => {
            const s = scores[t.id]
            const size = getCompanySize(s)
            return (
              <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <span style={{ fontSize:14 }}>{["🥇","🥈","🥉","4️⃣"][i]}</span>
                <Image src={teamImg[t.id]} alt={t.name} width={28} height={28} style={{ objectFit:"contain" }} />
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:t.color }}>{t.name}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <Image src={levelImg(s)} alt={size.label} width={28} height={28} style={{ objectFit:"contain", transition:"all 0.5s ease" }} />
                      <span style={{ fontSize:11, color:"#888" }}>{size.label}</span>
                    </div>
                  </div>
                  <div style={{ background:"#f0f0ee", borderRadius:4, height:7 }}>
                    <div style={{ background:t.color, height:7, borderRadius:4, width:`${Math.min(100, Math.round((s/MAX_SIM)*100))}%`, transition:"width 0.6s ease" }}/>
                  </div>
                </div>
                <span style={{ fontSize:13, fontWeight:700, color:t.color, minWidth:28, textAlign:"right" }}>{Math.round((s/MAX_SIM)*100)}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Jugadores conectados */}
      <div style={{ background:"#fff", border:"0.5px solid #ddd", borderRadius:12, padding:"1rem", marginBottom:"1rem" }}>
        <p style={{ margin:"0 0 10px", fontWeight:600, fontSize:13 }}>Jugadores conectados ({players.length})</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
          {TEAMS.map(t => (
            <div key={t.id} style={{ background:t.light, borderRadius:8, padding:"0.75rem" }}>
              <div style={{ fontWeight:700, color:t.color, fontSize:13, marginBottom:4, display:"flex", alignItems:"center", gap:4 }}><Image src={teamImg[t.id]} alt={t.name} width={20} height={20} style={{ objectFit:"contain" }} /> {t.name}</div>
              {players.filter(p=>p.team===t.id).map(p=>(
                <div key={p.id} style={{ fontSize:12, color:"#555", padding:"2px 0" }}>👤 {p.name}</div>
              ))}
              {players.filter(p=>p.team===t.id).length === 0 && (
                <div style={{ fontSize:11, color:"#bbb" }}>Sin jugadores</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Controles del juego */}
      <div style={{ background:"#fff", border:"0.5px solid #ddd", borderRadius:12, padding:"1rem", marginBottom:"1rem" }}>
        {session.state === "lobby" && (
          <>
            <p style={{ margin:"0 0 12px", fontSize:14, color:"#666" }}>
              {players.length} estudiante(s) conectados. Cuando estén todos, inicia el juego.
            </p>
            <button onClick={startGame} style={hostBtnStyle("#1D9E75")}>🚀 Iniciar juego</button>
          </>
        )}
        {session.state === "playing" && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div>
                <p style={{ margin:"0 0 4px", fontWeight:700, fontSize:15 }}>Ronda {round+1}: {q.mes}</p>
                <p style={{ margin:"0 0 8px", fontSize:13, color:"#666" }}>{q.situacion}</p>
              </div>
            </div>
            {/* Barra de tiempo */}
            <div style={{ background:"#f0f0ee", borderRadius:4, height:6, marginBottom:10 }}>
              <div style={{ background:timerColor, height:6, borderRadius:4, width:`${(timer/60)*100}%`, transition:"width 1s linear, background 0.3s" }}/>
            </div>
            <p style={{ margin:"0 0 12px", fontSize:13 }}>
              Respuestas recibidas: <strong style={{ color:"#185FA5" }}>{roundAnswers.length}</strong> / {players.length}
            </p>
            <button onClick={showFeedback} style={hostBtnStyle("#185FA5")}>📊 Mostrar retroalimentación</button>
          </>
        )}
        {session.state === "feedback" && (
          <>
            <p style={{ margin:"0 0 4px", fontWeight:700, fontSize:14 }}>💡 {q.concepto}</p>
            <p style={{ margin:"0 0 12px", fontSize:13, color:"#666" }}>
              Mejor opción: <strong>{q.opciones[q.mejor].texto}</strong>
            </p>
            <button onClick={nextRound} style={hostBtnStyle(round+1>=15?"#993556":"#185FA5")}>
              {round+1 >= 15 ? "🏆 Ver resultados finales" : `➡️ Siguiente ronda (${round+2}/15)`}
            </button>
          </>
        )}
        {session.state === "results" && (
          <div style={{ textAlign:"center", padding:"0.5rem" }}>
            <div style={{ fontSize:44 }}>🏆</div>
            <p style={{ fontWeight:800, fontSize:20, margin:"6px 0 16px" }}>¡Juego terminado!</p>
            {/* Podio de equipos */}
            <div style={{ display:"grid", gap:8, marginBottom:14 }}>
              {sortedTeams.map((t, i) => {
                const s = scores[t.id]
                const calificacion = parseFloat(Math.min(10, (s / MAX_SIM) * 10).toFixed(1))
                const medal = ["🥇","🥈","🥉","4️⃣"][i]
                return (
                  <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, background: i===0?`${t.color}18`:"#f9f9f9", borderRadius:10, padding:"0.6rem 1rem", border:`1.5px solid ${i===0?t.color+"44":"#eee"}` }}>
                    <span style={{ fontSize:20 }}>{medal}</span>
                    <Image src={teamImg[t.id]} alt={t.name} width={32} height={32} style={{ objectFit:"contain" }} />
                    <span style={{ fontWeight:700, color:t.color, flex:1, textAlign:"left" }}>{t.name}</span>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:900, fontSize:18, color:t.color }}>{calificacion}</div>
                      <div style={{ fontSize:10, color:"#999" }}>/ 10</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ background:"#EAF3DE", borderRadius:10, padding:"0.75rem", textAlign:"left" }}>
              <p style={{ margin:0, fontSize:13, color:"#3B6D11", fontWeight:600 }}>
                Los estudiantes deben tomar screenshot de su pantalla con su calificación y subirlo a Blackboard.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign:"center", paddingBottom:"1rem" }}>
        <Image src="/uabc.png" alt="UABC" width={24} height={24} style={{ opacity:0.3 }} />
      </div>
    </div>
  )
}

const hostPageStyle: React.CSSProperties = {
  minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center",
  justifyContent:"center", fontFamily:"sans-serif", textAlign:"center", padding:"2rem"
}
const hostBtnStyle = (bg: string): React.CSSProperties => ({
  padding:"12px 24px", background:bg, color:"#fff", border:"none",
  borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer", width:"100%",
  boxShadow:`0 2px 8px ${bg}44`
})
