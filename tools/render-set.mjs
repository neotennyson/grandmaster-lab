import fs from "node:fs"
import { fileURLToPath } from "node:url"
const set = process.argv[2] ?? "companion"
const dir = fileURLToPath(new URL(`./sets/${set}/`, import.meta.url))
const pieces = ["wK", "wQ", "wR", "wB", "wN", "wP", "bK", "bQ", "bR", "bB", "bN", "bP"]
const map = {}
for (const p of pieces) {
  const svg = fs.readFileSync(dir + p + ".svg", "utf8")
  map[p] = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").trim()
}
const vbMatch = fs.readFileSync(dir + "wN.svg", "utf8").match(/viewBox="([^"]*)"/)
const viewBox = vbMatch ? vbMatch[1] : "0 0 45 45"
const body = Object.entries(map).map(([k, v]) => `  ${k.toLowerCase()}: ${JSON.stringify(v)},`).join("\n")
const ts = `export const PIECE_SVG: Record<string, string> = {\n${body}\n}\n\nexport function Piece({ type, color }: { type: string; color: "w" | "b" }) {\n  const inner = PIECE_SVG[color + type]\n  if (!inner) return null\n  return (\n    <svg\n      viewBox="${viewBox}"\n      className="piece-svg"\n      aria-hidden\n      dangerouslySetInnerHTML={{ __html: DEFS + inner }}\n    />\n  )\n}\n`
fs.writeFileSync(fileURLToPath(new URL("../src/components/pieces.tsx", import.meta.url)), ts)
console.log(`rendered set: ${set} (viewBox ${viewBox})`)
