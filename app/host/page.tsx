"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { TEAMS, generateCode, getCompanySize, playSound } from "@/lib/game"
import { QUESTIONS } from "@/lib/questions"
import QRCode from "react-qr-code"

type Session = { id: string; code: string; current_round: number; state: string }
type Player = { id: string; name: string; team: number }

export default function HostPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [answers, setAnswers] = useState<any[]>([])
  const [scores, setScores] = useState<Record<number, number>>({ 1:50, 2:50, 3:50, 4:50 })
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState("")

  useEffect(() => { setUrl(window.location.origin) }, [])

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
    playSound("start")
  }

  async function showFeedback() {
    // Calcular scores de esta ronda
    const round = session!.current_round
    const q = QUESTIONS[round]
    const roundAnswers = answers.filter(a => a.round === round)
    const newScores = {...scores}
    TEAMS.forEach(t => {
      const teamPlayers = players.filter(p=>p.team===t.id)
      const ans = roundAnswers.find(a => teamPlayers.some(p=>p.id===a.player_id))
      if (ans !== undefined) {
        newScores[t.id] = Math.max(0, Math.min(100, newScores[t.id] + q.opciones[ans.option_index].efecto))
      } else {
        newScores[t.id] = Math.max(0, newScores[t.id] - 5)
      }
    })
    setScores(newScores)
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
    }
  }

  const round = session?.current_round ?? 0
  const q = QUESTIONS[round]
  const roundAnswers = answers.filter(a => a.round === round)
  const sortedTeams = [...TEAMS].sort((a,b)=>(scores[b.id]||0)-(scores[a.id]||0))

  if (!session) return (
    <div style={hostPageStyle}>
      <h1 style={{ fontSize:28, fontWeight:700, marginBottom:8 }}>💰 CashFlow Wars</h1>
      <p style={{ color:"#666", marginBottom:24 }}>Panel del Profesor · UABC Mercadotecnia</p>
      <button onClick={createSession} disabled={loading}
        style={{ padding:"14px 32px", background:"#1D9E75", color:"#fff", border:"none", borderRadius:12, fontSize:18, fontWeight:700, cursor:"pointer" }}>
        {loading ? "Creando..." : "🚀 Crear nueva sesión"}
      </button>
    </div>
  )

  return (
    <div style={{ padding:"1.5rem", fontFamily:"sans-serif", maxWidth:1000, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem", flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:700 }}>💰 CashFlow Wars</h1>
          <p style={{ margin:0, color:"#888", fontSize:13 }}>
            Estado: <strong>{session.state}</strong> · Ronda {round+1}/15
          </p>
        </div>
        <div style={{ background:"#f5f5f3", borderRadius:12, padding:"0.75rem 1rem", textAlign:"center" }}>
          <div style={{ fontSize:28, fontWeight:700, letterSpacing:4, color:"#185FA5" }}>{session.code}</div>
          <div style={{ fontSize:11, color:"#888" }}>Código de sesión</div>
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
              <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <span style={{ fontSize:14 }}>{["🥇","🥈","🥉","4️⃣"][i]}</span>
                <span style={{ fontSize:18 }}>{t.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:t.color }}>{t.name}</span>
                    <span style={{ fontSize:12, color:"#888" }}>{size.emoji} {size.label}</span>
                  </div>
                  <div style={{ background:"#f0f0ee", borderRadius:4, height:6 }}>
                    <div style={{ background:t.color, height:6, borderRadius:4, width:`${s}%`, transition:"width 0.5s" }}/>
                  </div>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:t.color, minWidth:32, textAlign:"right" }}>{s}</span>
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
              <div style={{ fontWeight:700, color:t.color, fontSize:13, marginBottom:4 }}>{t.emoji} {t.name}</div>
              {players.filter(p=>p.team===t.id).map(p=>(
                <div key={p.id} style={{ fontSize:12, color:"#555" }}>{p.name}</div>
              ))}
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
            <p style={{ margin:"0 0 4px", fontWeight:600 }}>Ronda {round+1}: {q.mes}</p>
            <p style={{ margin:"0 0 12px", fontSize:13, color:"#666" }}>{q.situacion}</p>
            <p style={{ margin:"0 0 12px", fontSize:13 }}>
              Respuestas recibidas: <strong>{roundAnswers.length}</strong> / {players.length}
            </p>
            <button onClick={showFeedback} style={hostBtnStyle("#185FA5")}>📊 Mostrar retroalimentación</button>
          </>
        )}
        {session.state === "feedback" && (
          <>
            <p style={{ margin:"0 0 8px", fontWeight:600 }}>💡 {q.concepto}</p>
            <p style={{ margin:"0 0 12px", fontSize:13, color:"#666" }}>
              Mejor opción: <strong>{q.opciones[q.mejor].texto}</strong>
            </p>
            <button onClick={nextRound} style={hostBtnStyle(round+1>=15?"#993556":"#185FA5")}>
              {round+1 >= 15 ? "🏆 Ver resultados finales" : `➡️ Siguiente ronda (${round+2}/15)`}
            </button>
          </>
        )}
        {session.state === "results" && (
          <div style={{ textAlign:"center", padding:"1rem" }}>
            <div style={{ fontSize:48 }}>🏆</div>
            <p style={{ fontWeight:700, fontSize:18 }}>¡Juego terminado!</p>
            <p style={{ color:"#666", fontSize:14 }}>Ganador: {sortedTeams[0].emoji} {sortedTeams[0].name}</p>
          </div>
        )}
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
  borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer", width:"100%"
})
