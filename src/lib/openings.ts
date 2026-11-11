export interface OpeningEntry {
  eco: string
  name: string
  moves: string
}

export const OPENINGS: OpeningEntry[] = [
  { eco: "C20", name: "King's Pawn Opening", moves: "e4" },
  { eco: "C21", name: "Center Game", moves: "e4 e5 d4" },
  { eco: "C23", name: "Bishop's Opening", moves: "e4 e5 Bc4" },
  { eco: "B02", name: "Alekhine's Defense", moves: "e4 Nf6" },
  { eco: "A00", name: "Anderssen's Opening", moves: "a3" },
  { eco: "B01", name: "Scandinavian Defense", moves: "e4 d5" },
  { eco: "B01", name: "Scandinavian Defense: Modern", moves: "e4 d5 exd5 Qxd5 Nc3 Qd6" },
  { eco: "B06", name: "Modern Defense", moves: "e4 g6" },
  { eco: "B07", name: "Pirc Defense", moves: "e4 d6 d4 Nf6" },
  { eco: "B09", name: "Pirc: Austrian Attack", moves: "e4 d6 d4 Nf6 Nc3 g6 f4" },
  { eco: "B13", name: "Caro-Kann: Exchange", moves: "e4 c6 d4 d5 exd5 cxd5" },
  { eco: "B12", name: "Caro-Kann Defense", moves: "e4 c6" },
  { eco: "B15", name: "Caro-Kann: Main Line", moves: "e4 c6 d4 d5" },
  { eco: "B18", name: "Caro-Kann: Classical", moves: "e4 c6 d4 d5 Nc3 dxe4 Nxe4" },
  { eco: "B17", name: "Caro-Kann: Steinitz", moves: "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5" },
  { eco: "B12", name: "Caro-Kann: Advance", moves: "e4 c6 d4 d5 e5" },
  { eco: "B13", name: "Caro-Kann: Panov Attack", moves: "e4 c6 d4 d5 exd5 cxd5 c4" },
  { eco: "A10", name: "English Opening", moves: "c4" },
  { eco: "A20", name: "English: King's English", moves: "c4 e5" },
  { eco: "A30", name: "English: Symmetrical", moves: "c4 c5" },
  { eco: "A15", name: "English: Anglo-Indian", moves: "c4 Nf6" },
  { eco: "A04", name: "Zukertort Opening", moves: "Nf3" },
  { eco: "A48", name: "King's Indian: London", moves: "Nf3 Nf6 d4 g6 Bf4" },
  { eco: "A80", name: "Dutch Defense", moves: "d4 f5" },
  { eco: "A81", name: "Dutch: Fianchetto", moves: "d4 f5 g3" },
  { eco: "A87", name: "Dutch: Leningrad", moves: "d4 f5 g3 Nf6 Bg2 g6" },
  { eco: "A40", name: "Queen's Pawn Opening", moves: "d4" },
  { eco: "A41", name: "English Defense", moves: "d4 b6" },
  { eco: "A45", name: "Trompowsky Attack", moves: "d4 Nf6 Bf4" },
  { eco: "A46", name: "London System", moves: "d4 Nf6 Nf3" },
  { eco: "D02", name: "London System", moves: "d4 Nf6 Nf3 d5 Bf4" },
  { eco: "A50", name: "Indian Game", moves: "d4 Nf6" },
  { eco: "E00", name: "Catalan Opening", moves: "d4 Nf6 c4 e6 g3" },
  { eco: "E20", name: "Nimzo-Indian Defense", moves: "d4 Nf6 c4 e6 Nc3 Bb4" },
  { eco: "E32", name: "Nimzo-Indian: Classical", moves: "d4 Nf6 c4 e6 Nc3 Bb4 Qc2" },
  { eco: "E40", name: "Nimzo-Indian: Rubinstein", moves: "d4 Nf6 c4 e6 Nc3 Bb4 e3" },
  { eco: "E60", name: "King's Indian Defense", moves: "d4 Nf6 c4 g6" },
  { eco: "E62", name: "King's Indian: Fianchetto", moves: "d4 Nf6 c4 g6 Nf3 Bg7 g3" },
  { eco: "E70", name: "King's Indian: Normal", moves: "d4 Nf6 c4 g6 Nc3 Bg7" },
  { eco: "E73", name: "King's Indian: Averbakh", moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Bg5" },
  { eco: "E76", name: "King's Indian: Four Pawns Attack", moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4" },
  { eco: "E81", name: "King's Indian: Sämisch", moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3" },
  { eco: "E91", name: "King's Indian: Classical", moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2" },
  { eco: "D80", name: "Grünfeld Defense", moves: "d4 Nf6 c4 g6 Nc3 d5" },
  { eco: "D85", name: "Grünfeld: Exchange", moves: "d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3" },
  { eco: "D90", name: "Grünfeld: Three Knights", moves: "d4 Nf6 c4 g6 Nc3 d5 Nf3" },
  { eco: "A53", name: "Old Indian Defense", moves: "d4 Nf6 c4 d6" },
  { eco: "A57", name: "Benko Gambit", moves: "d4 Nf6 c4 c5 d5 b5" },
  { eco: "A43", name: "Benoni Defense", moves: "d4 c5" },
  { eco: "A56", name: "Benoni: Czech", moves: "d4 Nf6 c4 c5 d5 e5" },
  { eco: "A61", name: "Benoni: Modern", moves: "d4 Nf6 c4 c5 d5 e6" },
  { eco: "D00", name: "Queen's Pawn Game", moves: "d4 d5" },
  { eco: "D06", name: "Queen's Gambit", moves: "d4 d5 c4" },
  { eco: "D20", name: "Queen's Gambit Accepted", moves: "d4 d5 c4 dxc4" },
  { eco: "D30", name: "Queen's Gambit Declined", moves: "d4 d5 c4 e6" },
  { eco: "D35", name: "QGD: Main Line", moves: "d4 d5 c4 e6 Nc3 Nf6" },
  { eco: "D36", name: "QGD: Classical", moves: "d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5" },
  { eco: "D37", name: "QGD: Ragozin", moves: "d4 d5 c4 e6 Nc3 Nf6 Nf3 Bb4" },
  { eco: "D52", name: "QGD: Cambridge Springs", moves: "d4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7" },
  { eco: "D43", name: "Semi-Slav Defense", moves: "d4 d5 c4 e6 Nc3 c6" },
  { eco: "D20", name: "Queen's GambitAccepted: Normal", moves: "d4 d5 c4 dxc4 Nf3" },
  { eco: "D10", name: "Slav Defense", moves: "d4 d5 c4 c6" },
  { eco: "D15", name: "Slav: Main Line", moves: "d4 d5 c4 c6 Nf3 Nf6 Nc3" },
  { eco: "D31", name: "Slav: Main Line 4.Nf3", moves: "d4 d5 c4 c6 Nf3 dxc4 a4" },
  { eco: "D45", name: "Semi-Slav: Main Line", moves: "d4 d5 c4 e6 Nc3 c6 Nf3 Nf6" },
  { eco: "E12", name: "Queen's Indian Defense", moves: "d4 Nf6 c4 e6 Nf3 b6" },
  { eco: "E15", name: "Queen's Indian: Fianchetto", moves: "d4 Nf6 c4 e6 Nf3 b6 g3" },
  { eco: "C00", name: "French Defense", moves: "e4 e6" },
  { eco: "C02", name: "French: Advance", moves: "e4 e6 d4 d5 e5" },
  { eco: "C03", name: "French: Exchange", moves: "e4 e6 d4 d5 exd5 exd5" },
  { eco: "C11", name: "French Defense: Classical", moves: "e4 e6 d4 d5 Nc3" },
  { eco: "C11", name: "French: Steinitz", moves: "e4 e6 d4 d5 Nc3 Nf6 e5 c5" },
  { eco: "C10", name: "French: Rubinstein", moves: "e4 e6 d4 d5 Nc3 dxe4" },
  { eco: "C18", name: "French: Winawer", moves: "e4 e6 d4 d5 Nc3 Bb4" },
  { eco: "C03", name: "French: Tarrasch", moves: "e4 e6 d4 d5 Nd2" },
  { eco: "C00", name: "French: Burn", moves: "e4 e6 d4 d5 Nc3 Nf6 Nf3 dxe4" },
  { eco: "B10", name: "Owen Defense", moves: "e4 b6" },
  { eco: "B00", name: "Nimzowitsch Defense", moves: "e4 Nc6" },
  { eco: "B21", name: "Sicilian Defense", moves: "e4 c5" },
  { eco: "B23", name: "Sicilian: Grand Prix", moves: "e4 c5 Nc3" },
  { eco: "B22", name: "Sicilian: Alapin", moves: "e4 c5 c3" },
  { eco: "B31", name: "Sicilian: Rossolimo", moves: "e4 c5 Nf3 Nc6 Bb5" },
  { eco: "B30", name: "Sicilian: Open", moves: "e4 c5 Nf3 Nc6 d4" },
  { eco: "B31", name: "Sicilian: Open Main", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4" },
  { eco: "B33", name: "Sveshnikov Sicilian", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5" },
  { eco: "B40", name: "Sicilian: Kan/Taimanov", moves: "e4 c5 Nf3 e6 d4" },
  { eco: "B53", name: "Sicilian: Chekhover", moves: "e4 c5 Nf3 d6 d4 cxd4 Qxd4" },
  { eco: "B54", name: "Sicilian: Open", moves: "e4 c5 Nf3 d6 d4" },
  { eco: "B56", name: "Sicilian: Classical", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6" },
  { eco: "B90", name: "Najdorf Sicilian", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6" },
  { eco: "B70", name: "Dragon Sicilian", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6" },
  { eco: "B44", name: "Sicilian: Taimanov", moves: "e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6" },
  { eco: "B71", name: "Dragon: Yugoslav", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7" },
  { eco: "B20", name: "Sicilian: Smith-Morra", moves: "e4 c5 d4 cxd4 c3" },
  { eco: "C25", name: "Vienna Game", moves: "e4 e5 Nc3" },
  { eco: "C29", name: "Vienna Gambit", moves: "e4 e5 Nc3 Nf6 f4" },
  { eco: "C26", name: "Vienna: Paulsen", moves: "e4 e5 Nc3 Nf6" },
  { eco: "C27", name: "Frankenstein-Dracula Variation", moves: "e4 e5 Nc3 Nf6 Bc4 Nxe4" },
  { eco: "C21", name: "Danish Gambit", moves: "e4 e5 d4 exd4 c3" },
  { eco: "C42", name: "Petrov's Defense", moves: "e4 e5 Nf3 Nf6" },
  { eco: "C43", name: "Petrov: Steinitz Attack", moves: "e4 e5 Nf3 Nf6 d4" },
  { eco: "C44", name: "King's Knight Opening", moves: "e4 e5 Nf3 Nc6" },
  { eco: "C46", name: "Four Knights Game", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6" },
  { eco: "C47", name: "Four Knights: Scotch", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 d4" },
  { eco: "C45", name: "Scotch Game", moves: "e4 e5 Nf3 Nc6 d4" },
  { eco: "C45", name: "Scotch: Main", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4" },
  { eco: "C46", name: "Four Knights: Italian", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bc4" },
  { eco: "C48", name: "Four Knights: Spanish", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5" },
  { eco: "C50", name: "Italian Game", moves: "e4 e5 Nf3 Nc6 Bc4" },
  { eco: "C54", name: "Italian: Giuoco Piano", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5" },
  { eco: "C53", name: "Italian: Classical", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3" },
  { eco: "C53", name: "Italian: Giuoco Pianissimo", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O" },
  { eco: "C55", name: "Two Knights Defense", moves: "e4 e5 Nf3 Nc6 Bc4 Nf6" },
  { eco: "C57", name: "Two Knights: Fried Liver", moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7" },
  { eco: "C57", name: "Traxler Counterattack", moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5" },
  { eco: "C51", name: "Evans Gambit", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4" },
  { eco: "C60", name: "Ruy Lopez", moves: "e4 e5 Nf3 Nc6 Bb5" },
  { eco: "C62", name: "Ruy Lopez: Steinitz", moves: "e4 e5 Nf3 Nc6 Bb5 d6" },
  { eco: "C65", name: "Ruy Lopez: Berlin Defense", moves: "e4 e5 Nf3 Nc6 Bb5 Nf6" },
  { eco: "C67", name: "Ruy Lopez: Open Berlin", moves: "e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4" },
  { eco: "C70", name: "Ruy Lopez: Morphy Defense", moves: "e4 e5 Nf3 Nc6 Bb5 a6" },
  { eco: "C68", name: "Ruy Lopez: Exchange", moves: "e4 e5 Nf3 Nc6 Bb5 a6 Bxc6" },
  { eco: "C77", name: "Ruy Lopez: Tarrasch", moves: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4" },
  { eco: "C78", name: "Ruy Lopez: 5.O-O", moves: "e4 e5 Nf3 Nc6 Bb5 a6 O-O" },
  { eco: "C79", name: "Ruy Lopez: Steinitz Deferred", moves: "e4 e5 Nf3 Nc6 Bb5 a6 O-O d6" },
  { eco: "C84", name: "Ruy Lopez: Closed", moves: "e4 e5 Nf3 Nc6 Bb5 a6 O-O Be7 Re1" },
  { eco: "C89", name: "Ruy Lopez: Marshall Attack", moves: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6" },
  { eco: "C90", name: "Ruy Lopez: Closed Main", moves: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3" },
  { eco: "C41", name: "Philidor Defense", moves: "e4 e5 Nf3 d6" },
  { eco: "C30", name: "King's Gambit", moves: "e4 e5 f4" },
  { eco: "C33", name: "King's Gambit Accepted", moves: "e4 e5 f4 exf4" },
  { eco: "C37", name: "King's Gambit: Muzio", moves: "e4 e5 f4 exf4 Nf3 g5 Bc4 g4" },
  { eco: "C33", name: "King's Gambit: Falkbeer", moves: "e4 e5 f4 d5" },
  { eco: "C39", name: "King's Gambit: Meitner", moves: "e4 e5 f4 exf4 Nf3 g5 Bc4 g4 O-O" },
  { eco: "C41", name: "Hanstein Gambit", moves: "e4 e5 Nf3 d6 d4 exd4 Nxd4 Bg4" },
  { eco: "B01", name: "Nimzowitsch-Scandinavian", moves: "e4 d5 exd5 Nf6" },
  { eco: "A02", name: "Bird's Opening", moves: "f4" },
  { eco: "A01", name: "Nimzo-Larsen Attack", moves: "b3" },
  { eco: "A03", name: "Grob Attack", moves: "g4" },
  { eco: "E20", name: "Semi-Tarrasch Defense", moves: "d4 Nf6 c4 e6 Nc3 d5" },
  { eco: "C00", name: "King's Indian Attack", moves: "e4 e6 d3 d5 Nd2" },
  { eco: "C40", name: "Latvian Gambit", moves: "e4 e5 Nf3 f5" },
  { eco: "A02", name: "From's Gambit", moves: "f4 e5 e4" },
  { eco: "D02", name: "Veresov Attack", moves: "d4 Nf6 Nc3 d5 Bg5" },
  { eco: "B20", name: "Bowlder Attack", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e5" },
]

const MAX_BOOK_PLIES = 16

function tokens(s: string): string[] {
  return s.split(" ").filter(Boolean)
}

export interface OpeningMatch {
  eco: string
  name: string
  depth: number
  stillInBook: boolean
}

export function analyzeOpening(sanHistory: string[]): OpeningMatch | null {
  if (!sanHistory.length) return null
  const hist = sanHistory.slice(0, MAX_BOOK_PLIES)
  let bestFull: OpeningEntry | null = null
  let bestFullLen = 0
  let bestPartial: OpeningEntry | null = null
  let bestPartialLen = 0
  for (const e of OPENINGS) {
    const t = tokens(e.moves)
    if (t.length > hist.length) {
      let k = 0
      while (k < hist.length && hist[k] === t[k]) k++
      if (k === hist.length && k > bestPartialLen) {
        bestPartialLen = k
        bestPartial = e
      }
    } else {
      let k = 0
      while (k < t.length && hist[k] === t[k]) k++
      if (k === t.length && k >= bestFullLen) {
        bestFullLen = k
        bestFull = e
      } else if (k > bestPartialLen && k > 0 && k < t.length) {
        bestPartialLen = k
        bestPartial = e
      }
    }
  }
  if (bestFull && bestFullLen >= bestPartialLen) {
    return { eco: bestFull.eco, name: bestFull.name, depth: bestFullLen, stillInBook: false }
  }
  if (bestPartial) {
    return { eco: bestPartial.eco, name: bestPartial.name, depth: bestPartialLen, stillInBook: true }
  }
  return null
}

export function bookDepth(sanHistory: string[]): number {
  const m = analyzeOpening(sanHistory)
  return m && m.depth >= sanHistory.length ? m.depth : 0
}

export function openingName(sanHistory: string[]): string | null {
  const m = analyzeOpening(sanHistory)
  if (m && m.depth >= Math.min(4, sanHistory.length)) return `${m.name} (${m.eco})`
  return null
}

export interface OpeningFamily {
  key: string
  label: string
  lines: OpeningEntry[]
}

export function openingFamilies(): OpeningFamily[] {
  const groups = new Map<string, OpeningEntry[]>()
  for (const e of OPENINGS) {
    const t = tokens(e.moves)
    let key = t.slice(0, Math.min(3, t.length)).join(" ")
    let label = e.name
    if (t.length >= 3 || key.split(" ").length === t.length) {
      if (t.length >= 3 && key === t.slice(0, 3).join(" ")) {
        key = t.slice(0, 3).join(" ")
      }
    } else {
      key = tokens(label)[0].toLowerCase()
    }
    const gk = `${key}|${label.split(/[:.]/)[0].trim()}`
    const arr = groups.get(gk) ?? []
    arr.push(e)
    groups.set(gk, arr)
  }
  const fams: OpeningFamily[] = []
  for (const [gk, lines] of groups) {
    const label = lines[0].name.split(/[:.]/)[0].trim()
    lines.sort((a, b) => tokens(a.moves).length - tokens(b.moves).length)
    fams.push({ key: gk, label, lines })
  }
  fams.sort((a, b) => b.lines.length - a.lines.length)
  return fams
}

export function expectedNext(sanHistory: string[]): OpeningEntry[] {
  const live = OPENINGS.filter((e) => {
    const t = tokens(e.moves)
    if (t.length <= sanHistory.length) return false
    return sanHistory.every((m, i) => m === t[i])
  })
  return live
}
