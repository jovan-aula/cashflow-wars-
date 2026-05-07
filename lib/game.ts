export const TEAMS = [
  { id: 1, name: "Equipo 1", emoji: "🦅", color: "#1D9E75", light: "#E1F5EE" },
  { id: 2, name: "Equipo 2", emoji: "🦁", color: "#185FA5", light: "#E6F1FB" },
  { id: 3, name: "Equipo 3", emoji: "🐯", color: "#BA7517", light: "#FAEEDA" },
  { id: 4, name: "Equipo 4", emoji: "🦊", color: "#993556", light: "#FBEAF0" },
]

export const COMPANY_SIZES = [
  { label: "Kiosco",           emoji: "🏚️", min: 0,  max: 19  },
  { label: "Microempresa",     emoji: "🏠", min: 20, max: 39  },
  { label: "PyME",             emoji: "🏢", min: 40, max: 59  },
  { label: "Empresa regional", emoji: "🏬", min: 60, max: 79  },
  { label: "Corporativo TJ",   emoji: "🏙️", min: 80, max: 100 },
]

export function getCompanySize(score: number) {
  const s = Math.max(0, Math.min(100, score))
  return COMPANY_SIZES.find(c => s >= c.min && s <= c.max) || COMPANY_SIZES[0]
}

export function getCaptain(members: string[], round: number): string {
  if (!members.length) return ""
  return members[round % members.length]
}

export function generateCode(): string {
  const words = ["FLUJO","CAJA","ACTIVO","MARGEN","VENTA","DEUDA","COSTO","GASTO"]
  const nums = Math.floor(Math.random() * 900) + 100
  return words[Math.floor(Math.random() * words.length)] + nums
}

// ── BGM ───────────────────────────────────────────────────────────────────────
let bgm: HTMLAudioElement | null = null

export function startBgm() {
  if (typeof window === "undefined") return
  if (!bgm) {
    bgm = new Audio("/bgm.mp3")
    bgm.loop = false
    bgm.volume = 0
  }
  bgm.currentTime = 0
  bgm.play().catch(() => {})
  // Fade in suave
  let v = 0
  const fade = setInterval(() => {
    if (!bgm) return clearInterval(fade)
    v = Math.min(0.2, v + 0.015)
    bgm.volume = v
    if (v >= 0.2) clearInterval(fade)
  }, 80)
}

export function pauseBgm(soft = true) {
  if (!bgm) return
  if (!soft) { bgm.pause(); bgm.volume = 0; return }
  // Fade out then pause
  const fade = setInterval(() => {
    if (!bgm) return clearInterval(fade)
    bgm.volume = Math.max(0, bgm.volume - 0.06)
    if (bgm.volume <= 0) { bgm.pause(); clearInterval(fade) }
  }, 60)
}

export function stopBgm() {
  if (!bgm) return
  pauseBgm(false)
}

// ── SFX ───────────────────────────────────────────────────────────────────────
type SoundType =
  | "correct" | "wrong" | "tick" | "win" | "start"
  | "select"  | "join"  | "levelup" | "warning"
  | "reveal"  | "whoosh" | "drumroll" | "eliminate" | "roundstart"

export function playSound(type: SoundType) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

    // Helpers
    const osc = (freq: number, shape: OscillatorType, dur: number, gain = 0.3, delay = 0, bend?: [number, number]) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.type = shape
      o.frequency.setValueAtTime(freq, ctx.currentTime + delay)
      if (bend) o.frequency.linearRampToValueAtTime(bend[0], ctx.currentTime + delay + bend[1])
      g.gain.setValueAtTime(0, ctx.currentTime + delay)
      g.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.015)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur)
      o.start(ctx.currentTime + delay)
      o.stop(ctx.currentTime + delay + dur + 0.05)
    }

    const noise = (dur: number, gain = 0.15, delay = 0, lowpass = 800) => {
      const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
      const src = ctx.createBufferSource()
      src.buffer = buf
      const filt = ctx.createBiquadFilter()
      filt.type = "lowpass"; filt.frequency.value = lowpass
      const g = ctx.createGain()
      src.connect(filt); filt.connect(g); g.connect(ctx.destination)
      g.gain.setValueAtTime(0, ctx.currentTime + delay)
      g.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur)
      src.start(ctx.currentTime + delay)
      src.stop(ctx.currentTime + delay + dur + 0.05)
    }

    switch (type) {

      // ── Seleccionar opción: clic suave ─────────────────────────────────────
      case "select":
        osc(900, "sine", 0.06, 0.12)
        osc(1200, "sine", 0.05, 0.08, 0.04)
        break

      // ── Unirse al equipo: fanfarria de bienvenida ──────────────────────────
      case "join":
        osc(392, "sine", 0.18, 0.22)
        osc(523, "sine", 0.18, 0.26, 0.14)
        osc(659, "sine", 0.35, 0.28, 0.28)
        osc(784, "sine", 0.3,  0.22, 0.44)
        break

      // ── Inicio de ronda: golpe dramático ──────────────────────────────────
      case "roundstart":
        // Golpe de bombo profundo
        osc(80,  "sine",     0.5, 0.6, 0,    [40, 0.4])
        osc(160, "sine",     0.3, 0.3, 0)
        noise(0.2, 0.25, 0, 400)
        // Acorde de tensión
        osc(220, "sawtooth", 0.4, 0.18, 0.08)
        osc(277, "sawtooth", 0.4, 0.14, 0.08)
        osc(330, "sawtooth", 0.4, 0.12, 0.08)
        // Stinger agudo
        osc(880, "sine",     0.15, 0.2, 0.12, [1200, 0.1])
        break

      // ── Advertencia timer 10s: pulso urgente ──────────────────────────────
      case "warning":
        osc(440, "square", 0.07, 0.12)
        osc(440, "square", 0.07, 0.12, 0.2)
        noise(0.06, 0.08, 0, 600)
        break

      // ── Tick final 5s: reloj dramático ────────────────────────────────────
      case "tick":
        osc(1100, "square", 0.05, 0.1)
        noise(0.04, 0.06, 0, 500)
        break

      // ── Reveal feedback: golpe + suspenso ─────────────────────────────────
      case "reveal":
        // Golpe dramático
        osc(55,  "sine",     0.6, 0.55, 0,   [30, 0.5])
        noise(0.15, 0.3, 0, 300)
        // Cuerdas de suspenso (tritono)
        osc(220, "sawtooth", 0.8, 0.15, 0.05)
        osc(311, "sawtooth", 0.8, 0.12, 0.05)
        osc(155, "sawtooth", 0.8, 0.1,  0.05)
        // Remate agudo
        osc(660, "sine",     0.2, 0.18, 0.1, [440, 0.15])
        break

      // ── Respuesta correcta: fanfarria triunfal ────────────────────────────
      case "correct":
        // Bajo celebración
        osc(130, "sine", 0.3, 0.35, 0)
        // Melodía ascendente
        osc(523,  "sine", 0.12, 0.3,  0)
        osc(659,  "sine", 0.12, 0.3,  0.1)
        osc(784,  "sine", 0.12, 0.3,  0.2)
        osc(1047, "sine", 0.25, 0.35, 0.3)
        osc(1319, "sine", 0.4,  0.3,  0.42)
        // Brillo final
        osc(2093, "sine", 0.15, 0.15, 0.52)
        noise(0.08, 0.15, 0.3, 2000)
        break

      // ── Respuesta incorrecta: bajón dramático ─────────────────────────────
      case "wrong":
        // Descenso de tono estilo "price is wrong"
        osc(370, "sawtooth", 0.5, 0.3, 0,    [180, 0.45])
        osc(220, "sawtooth", 0.4, 0.25, 0.05, [100, 0.4])
        osc(150, "sawtooth", 0.3, 0.2, 0.12,  [80,  0.35])
        noise(0.3, 0.2, 0, 300)
        break

      // ── Whoosh: transición entre pantallas ────────────────────────────────
      case "whoosh":
        osc(200, "sine", 0.25, 0.2, 0, [1800, 0.2])
        noise(0.2, 0.12, 0, 1200)
        break

      // ── Redoble de tambores (antes de resultado) ──────────────────────────
      case "drumroll":
        for (let i = 0; i < 16; i++) {
          noise(0.04, 0.15 + i * 0.008, i * 0.055, 800)
        }
        break

      // ── Eliminación: sonido grave de game over ────────────────────────────
      case "eliminate":
        osc(200, "sawtooth", 0.8, 0.35, 0, [60, 0.7])
        osc(150, "sawtooth", 0.6, 0.3,  0.1)
        noise(0.5, 0.25, 0, 400)
        break

      // ── Subir nivel de empresa ────────────────────────────────────────────
      case "levelup":
        [392, 494, 587, 698, 880, 1175].forEach((f, i) =>
          osc(f, "sine", 0.35, 0.25, i * 0.09)
        )
        noise(0.08, 0.12, 0.45, 3000)
        break

      // ── Victoria final ────────────────────────────────────────────────────
      case "win":
        // Bajo potente
        osc(65,  "sine", 0.5, 0.5, 0)
        osc(130, "sine", 0.4, 0.4, 0)
        // Melodía épica
        ;[523,659,784,880,1047,1175,1319,1568].forEach((f, i) =>
          osc(f, "sine", 0.5, 0.28, i * 0.1)
        )
        // Crash final
        noise(0.4, 0.3, 0.75, 4000)
        osc(2093, "sine", 0.35, 0.22, 0.8)
        break

      // ── Inicio de partida ─────────────────────────────────────────────────
      case "start":
        ;[261, 329, 392, 523, 659].forEach((f, i) =>
          osc(f, "sine", 0.4, 0.22, i * 0.14)
        )
        noise(0.1, 0.15, 0.55, 2000)
        break
    }
  } catch (e) {}
}
