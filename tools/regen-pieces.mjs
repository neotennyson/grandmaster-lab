import fs from "node:fs"

const dir = new URL("./sets/staunty/", import.meta.url).pathname
const pieces = ["wK", "wQ", "wR", "wB", "wN", "wP", "bK", "bQ", "bR", "bB", "bN", "bP"]
const map = {}
for (const p of pieces) {
  const svg = fs.readFileSync(dir + p + ".svg", "utf8")
  map[p] = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").trim()
}
const body = Object.entries(map).map(([k, v]) => `  ${k.toLowerCase()}: ${JSON.stringify(v)},`).join("\n")
const ts = `export const PIECE_SVG: Record<string, string> = {\n${body}\n}\n\nexport function Piece({ type, color }: { type: "k" | "q" | "r" | "b" | "n" | "p"; color: "w" | "b" }) {\n  const inner = PIECE_SVG[color + type]\n  if (!inner) return null\n  return (\n    <svg\n      viewBox="-1.5 0 50 50"\n      className="piece-svg"\n      aria-hidden\n      dangerouslySetInnerHTML={{ __html: inner }}\n    />\n  )\n}\n`
fs.writeFileSync(new URL("../src/components/pieces.tsx", import.meta.url), ts)
console.log("pieces regenerated from staunty sources")
