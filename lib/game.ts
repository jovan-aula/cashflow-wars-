export const TEAMS = [
  { id: 1, name: "Equipo 1", emoji: "🦅", color: "#1D9E75", light: "#E1F5EE" },
  { id: 2, name: "Equipo 2", emoji: "🦁", color: "#185FA5", light: "#E6F1FB" },
  { id: 3, name: "Equipo 3", emoji: "🐯", color: "#BA7517", light: "#FAEEDA" },
  { id: 4, name: "Equipo 4", emoji: "🦊", color: "#993556", light: "#FBEAF0" },
]

export const COMPANY_SIZES = [
  { label: "Kiosco", emoji: "🏚️", min: 0,  max: 19  },
  { label: "Microempresa", emoji: "🏠", min: 20, max: 39  },
  { label: "PyME", emoji: "🏢", min: 40, max: 59  },
  { label: "Empresa regional", emoji: "🏬", min: 60, max: 79  },
  { label: "Corporativo TJ", emoji: "🏙️", min: 80, max: 100 },
]

export function getCompanySize(score: number) {
  const s = Math.max(0, Math.min(100, score))
  return COMPANY_SIZES.find(c => s >= c.min && s <= c.max) || COMPANY_SIZES[0]
}

// Quién es el capitán en esta ronda para este equipo
export function getCaptain(members: string[], round: number): string {
  if (!members.length) return ""
  return members[round % members.length]
}

// Genera un código de sesión legible
export function generateCode(): string {
  const words = ["FLUJO","CAJA","ACTIVO","MARGEN","VENTA","DEUDA","COSTO","GASTO"]
  const nums = Math.floor(Math.random() * 900) + 100
  return words[Math.floor(Math.random() * words.length)] + nums
}

export function playSound(type: "correct" | "wrong" | "tick" | "win" | "start" | "select" | "join" | "levelup" | "warning") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const play = (freq: number, type_: OscillatorType, duration: number, gain = 0.3, delay = 0) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = freq; o.type = type_
      g.gain.setValueAtTime(0, ctx.currentTime + delay)
      g.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration)
      o.start(ctx.currentTime + delay)
      o.stop(ctx.currentTime + delay + duration)
    }
    if (type === "correct") {
      play(523, "sine", 0.12); play(659, "sine", 0.12, 0.3, 0.1); play(784, "sine", 0.12, 0.3, 0.22); play(1047, "sine", 0.4, 0.3, 0.34)
    } else if (type === "wrong") {
      play(300, "sawtooth", 0.15, 0.25); play(220, "sawtooth", 0.15, 0.25, 0.12); play(160, "sawtooth", 0.35, 0.2, 0.24)
    } else if (type === "select") {
      play(660, "sine", 0.06, 0.12); play(880, "sine", 0.08, 0.1, 0.05)
    } else if (type === "join") {
      play(392, "sine", 0.15, 0.2); play(523, "sine", 0.15, 0.25, 0.12); play(659, "sine", 0.3, 0.3, 0.24)
    } else if (type === "levelup") {
      [392, 494, 587, 698, 880].forEach((f, i) => play(f, "sine", 0.35, 0.25, i * 0.09))
    } else if (type === "tick") {
      play(880, "square", 0.07, 0.06)
    } else if (type === "warning") {
      play(440, "square", 0.08, 0.1); play(440, "square", 0.08, 0.1, 0.18)
    } else if (type === "win") {
      [523,659,784,1047,1319,1568].forEach((f,i) => play(f, "sine", 0.55, 0.28, i*0.11))
    } else if (type === "start") {
      [261,329,392,523,659].forEach((f,i) => play(f, "sine", 0.4, 0.22, i*0.14))
    }
  } catch (e) {}
}
