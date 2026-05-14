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

// ── CHIPTUNE BGM ENGINE ───────────────────────────────────────────────────────
// Lookahead scheduler — immune to setInterval drift
// Progression: G – Em – C – D  (150 bpm, eighth-note steps)

const CHIP_BPM    = 150
const CHIP_STEP   = 60 / CHIP_BPM / 2   // seconds per eighth note ≈ 0.200 s
const LOOKAHEAD   = 0.12                 // schedule 120 ms ahead
const SCHED_MS    = 20                   // check every 20 ms

// freq = 0 → rest
const CHIP_MELODY: number[] = [
  // Bar 1 — G (ascending motif)
  392,   0, 494, 587,  659, 587, 494,   0,
  // Bar 2 — Em (higher tension)
  330,   0, 494,   0,  659, 784, 659,   0,
  // Bar 3 — C (flowing)
  523,   0, 659,   0,  784, 659, 523,   0,
  // Bar 4 — D → resolve
  587, 494, 392,   0,  587, 659, 784,   0,
]

const CHIP_BASS: number[] = [
  196, 0, 196, 0, 247, 0, 196, 0,   // G
  165, 0, 165, 0, 247, 0, 165, 0,   // Em
  131, 0, 131, 0, 196, 0, 131, 0,   // C
  147, 0, 147, 0, 220, 0, 294, 0,   // D
]

let chipCtx:    AudioContext | null = null
let chipMaster: GainNode    | null = null
let chipTimer:  ReturnType<typeof setInterval> | null = null
let chipNext    = 0
let chipStep    = 0
let chipRunning = false

function chipScheduleStep(ctx: AudioContext, master: GainNode, s: number, t: number) {
  const idx = s % 32
  const dur = CHIP_STEP

  // Melody — square wave (classic chiptune)
  const mFreq = CHIP_MELODY[idx]
  if (mFreq > 0) {
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.connect(g); g.connect(master)
    o.type = "square"; o.frequency.value = mFreq
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.14, t + 0.005)
    g.gain.setValueAtTime(0.14, t + dur * 0.72)
    g.gain.linearRampToValueAtTime(0, t + dur * 0.96)
    o.start(t); o.stop(t + dur)
  }

  // Bass — triangle wave
  const bFreq = CHIP_BASS[idx]
  if (bFreq > 0) {
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.connect(g); g.connect(master)
    o.type = "triangle"; o.frequency.value = bFreq
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.22, t + 0.008)
    g.gain.setValueAtTime(0.22, t + dur * 0.82)
    g.gain.linearRampToValueAtTime(0, t + dur)
    o.start(t); o.stop(t + dur + 0.01)
  }

  // Kick — pitch-swept sine, beats 1 & 3 (steps 0, 8, 16, 24)
  if (idx % 8 === 0) {
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.connect(g); g.connect(master)
    o.type = "sine"
    o.frequency.setValueAtTime(130, t)
    o.frequency.exponentialRampToValueAtTime(38, t + 0.13)
    g.gain.setValueAtTime(0.65, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
    o.start(t); o.stop(t + 0.22)
  }

  // Snare — filtered noise, beats 2 & 4 (steps 4, 12, 20, 28)
  if (idx % 8 === 4) {
    const len = Math.ceil(ctx.sampleRate * 0.14)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d   = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
    src.buffer = buf
    f.type = "bandpass"; f.frequency.value = 1800; f.Q.value = 0.9
    src.connect(f); f.connect(g); g.connect(master)
    g.gain.setValueAtTime(0.48, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
    src.start(t); src.stop(t + 0.14)
  }

  // Hi-hat — high-pass noise every step (accent on downbeats)
  {
    const len = Math.ceil(ctx.sampleRate * 0.038)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d   = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
    src.buffer = buf
    f.type = "highpass"; f.frequency.value = 7500
    src.connect(f); f.connect(g); g.connect(master)
    g.gain.setValueAtTime(idx % 2 === 0 ? 0.09 : 0.045, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.032)
    src.start(t); src.stop(t + 0.038)
  }
}

export function startBgm() {
  if (typeof window === "undefined" || chipRunning) return
  chipRunning = true
  try {
    chipCtx    = new (window.AudioContext || (window as any).webkitAudioContext)()
    chipMaster = chipCtx.createGain()
    chipMaster.gain.setValueAtTime(0, chipCtx.currentTime)
    chipMaster.gain.linearRampToValueAtTime(0.72, chipCtx.currentTime + 1.4)
    chipMaster.connect(chipCtx.destination)
    chipNext = chipCtx.currentTime + 0.05
    chipStep = 0

    chipTimer = setInterval(() => {
      if (!chipCtx || !chipMaster || !chipRunning) return
      while (chipNext < chipCtx.currentTime + LOOKAHEAD) {
        chipScheduleStep(chipCtx, chipMaster, chipStep, chipNext)
        chipNext += CHIP_STEP
        chipStep++
      }
    }, SCHED_MS)
  } catch (_) {}
}

export function pauseBgm(soft = true) {
  chipRunning = false
  if (chipTimer) { clearInterval(chipTimer); chipTimer = null }
  const ctx = chipCtx, master = chipMaster
  chipCtx = null; chipMaster = null
  if (!ctx || !master) return
  if (soft) {
    const t = ctx.currentTime
    master.gain.setValueAtTime(master.gain.value, t)
    master.gain.linearRampToValueAtTime(0, t + 0.4)
    setTimeout(() => { try { ctx.close() } catch (_) {} }, 500)
  } else {
    try { ctx.close() } catch (_) {}
  }
}

export function stopBgm() {
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
