import { useEffect, useRef, useState } from "react"
import { Chess, type Square } from "chess.js"
import { Piece, PIECE_SVG } from "./pieces"

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"] as const

export function squareAt(f: number, r: number): Square {
  return `${FILES[f]}${RANKS[r]}` as Square
}

export function sqCoords(sq: string): { f: number; r: number } {
  return {
    f: FILES.indexOf(sq[0] as (typeof FILES)[number]),
    r: RANKS.indexOf(sq[1] as (typeof RANKS)[number]),
  }
}

export function pieceMarkup(color: "w" | "b", type: string): string {
  const inner = PIECE_SVG[`${color}${type}`] ?? ""
  return `<svg viewBox="0 0 45 45" style="width:100%;height:100%;display:block">${inner}</svg>`
}

export interface ArrowSpec {
  from: string
  to: string
  color?: string
  width?: number
}

interface BoardSnapshot {
  grid: ({ type: string; color: "w" | "b" } | null)[][]
  checkSquare: string | null
}

function piecesFromFen(fen: string): Map<string, { type: string; color: "w" | "b" }> {
  const snap = snapshot(fen)
  const map = new Map<string, { type: string; color: "w" | "b" }>()
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = snap.grid[r]?.[f]
      if (cell) map.set(squareAt(f, r), cell)
    }
  }
  return map
}

function snapshot(fen: string): BoardSnapshot {
  let chess: Chess
  try {
    chess = new Chess(fen)
  } catch {
    chess = new Chess()
  }
  const checkSquare = (() => {
    if (!chess.inCheck()) return null
    const turn = chess.turn()
    for (const row of chess.board()) {
      for (const cell of row) {
        if (cell && cell.type === "k" && cell.color === turn) return cell.square as string
      }
    }
    return null
  })()
  return {
    grid: chess.board().map((row) => row.map((sq) => (sq ? { type: sq.type, color: sq.color } : null))),
    checkSquare,
  }
}

export interface BoardProps {
  fen: string
  orientation: "w" | "b"
  lastMove?: { from: string; to: string } | null
  arrows?: ArrowSpec[]
  selected?: string | null
  selectable?: boolean
  legalTargets?: string[]
  targetsFor?: (from: string) => string[]
  highlightSquares?: string[]
  premove?: { from: string; to: string; promotion?: string } | null
  onSquareClick?: (sq: string) => void
  onMoveAttempt?: (from: string, to: string) => void
  interactive?: boolean
  armColor?: "w" | "b" | null
  tilt?: boolean
  dim?: boolean
}

export function Board({
  fen,
  orientation,
  lastMove,
  arrows = [],
  selected,
  selectable = true,
  legalTargets = [],
  targetsFor,
  highlightSquares = [],
  premove = null,
  onSquareClick,
  onMoveAttempt,
  interactive = true,
  armColor = null,
  tilt = false,
  dim,
}: BoardProps) {
  const snap = snapshot(fen)
  const boardRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ sq: string; moved: boolean; x: number; y: number; piece?: { type: string; color: "w" | "b" } } | null>(null)
  const [dragTargets, setDragTargets] = useState<string[]>([])
  const [shakeSq, setShakeSq] = useState<string | null>(null)
  const shakeTimerRef = useRef<number | null>(null)
  const releaseTargetsRef = useRef<string[]>([])
  const [dragSources, setDragSources] = useState<string | null>(null)
  const targetsForRef = useRef(targetsFor)
  targetsForRef.current = targetsFor
  const prevPiecesRef = useRef<Map<string, { type: string; color: "w" | "b" }>>(piecesFromFen(fen))
  const [anim, setAnim] = useState<{
    from: string
    to: string
    piece: { type: string; color: "w" | "b" }
    rookFrom?: string
    rookTo?: string
    rookPiece?: { type: string; color: "w" | "b" }
    key: number
  } | null>(null)
  const animKeyRef = useRef(1)
  const animTimerRef = useRef<number | null>(null)
  const [capFade, setCapFade] = useState<{ sq: string; piece: { type: string; color: "w" | "b" }; key: number } | null>(null)
  const capTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const prev = prevPiecesRef.current
    const now = piecesFromFen(fen)
    const movedFrom = lastMove?.from
    const movedTo = lastMove?.to
    if (animTimerRef.current) {
      clearTimeout(animTimerRef.current)
      animTimerRef.current = null
      setAnim(null)
    }
    if (movedFrom && movedTo) {
      const beforeAtTo = prev.get(movedTo)
      const landing = now.get(movedTo)
      const beforeAtFrom = prev.get(movedFrom)
      if (beforeAtTo && beforeAtTo.color !== landing?.color) {
        if (capTimerRef.current) clearTimeout(capTimerRef.current)
        setCapFade({ sq: movedTo, piece: beforeAtTo, key: animKeyRef.current++ })
        capTimerRef.current = window.setTimeout(() => {
          setCapFade(null)
          capTimerRef.current = null
        }, 200)
      }
      if (landing && beforeAtFrom && landing.type === beforeAtFrom.type && landing.color === beforeAtFrom.color && !beforeAtTo) {
        prevPiecesRef.current = now
        setAnim({ from: movedFrom, to: movedTo, piece: landing, key: animKeyRef.current++ })
        animTimerRef.current = window.setTimeout(() => {
          setAnim(null)
          animTimerRef.current = null
        }, 180)
        return
      }
    }
    prevPiecesRef.current = now
  }, [fen, lastMove])

  const flip = orientation === "b"
  const order = flip ? ([7, 6, 5, 4, 3, 2, 1, 0] as const) : ([0, 1, 2, 3, 4, 5, 6, 7] as const)

  function squareFromPoint(clientX: number, clientY: number): string | null {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    const sqEl = el?.closest?.(".sq") as HTMLElement | null
    if (sqEl?.dataset.sq && boardRef.current?.contains(sqEl)) return sqEl.dataset.sq
    return null
  }

  function spawnGhost(piece: { type: string; color: "w" | "b" }, clientX: number, clientY: number) {
    const b = boardRef.current?.getBoundingClientRect()
    const el = document.createElement("div")
    el.className = "drag-ghost pointer-float"
    const cell = b ? b.width / 8 : 44
    el.style.width = `${cell}px`
    el.style.height = `${cell}px`
    el.innerHTML = pieceMarkup(piece.color, piece.type)
    document.body.appendChild(el)
    ghostRef.current = el
    moveGhost(clientX, clientY)
  }

  function moveGhost(clientX: number, clientY: number) {
    if (ghostRef.current) {
      ghostRef.current.style.left = `${clientX}px`
      ghostRef.current.style.top = `${clientY}px`
    }
  }

  function killGhost() {
    if (ghostRef.current) {
      ghostRef.current.remove()
      ghostRef.current = null
    }
  }

  const cbRef = useRef({ onMoveAttempt, onSquareClick, spawnGhost, moveGhost, killGhost, squareFromPoint, setDragTargets, setDragSources })
  cbRef.current = { onMoveAttempt, onSquareClick, spawnGhost, moveGhost, killGhost, squareFromPoint, setDragTargets, setDragSources }

  useEffect(() => {
    function cancelDrag(clearState: boolean) {
      dragRef.current = null
      cbRef.current.killGhost()
      if (clearState) {
        cbRef.current.setDragTargets([])
        cbRef.current.setDragSources(null)
      }
    }
    function onMove(e: PointerEvent) {
      const st = dragRef.current
      if (!st) return
      const dist = Math.hypot(e.clientX - st.x, e.clientY - st.y)
      if (!st.moved) {
        if (dist < 4) return
        st.moved = true
      }
      if (st.piece) cbRef.current.moveGhost(e.clientX, e.clientY)
      e.preventDefault()
    }
    function finish(e: PointerEvent, treatAsClick: boolean) {
      const st = dragRef.current
      cancelDrag(true)
      if (!st) return
      const dropKind = st.moved ? (treatAsClick ? "click" : "drop") : "click"
      if (dropKind === "drop") {
        const target = cbRef.current.squareFromPoint(e.clientX, e.clientY)
        if (target && target !== st.sq) {
          if (releaseTargetsRef.current.length > 0 && !releaseTargetsRef.current.includes(target)) {
            setShakeSq(st.sq)
            shakeTimerRef.current = window.setTimeout(() => setShakeSq(null), 320)
          }
          cbRef.current.onMoveAttempt?.(st.sq, target)
        } else {
          cbRef.current.onSquareClick?.(st.sq)
        }
        return
      }
      cbRef.current.onSquareClick?.(st.sq)
    }
    function onUp(e: PointerEvent) {
      finish(e, false)
    }
    function onCancel(e: PointerEvent) {
      finish(e, true)
    }
    window.addEventListener("pointermove", onMove, { passive: false })
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onCancel)
    window.addEventListener("blur", onUp as unknown as EventListener)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onCancel)
      window.removeEventListener("blur", onUp as unknown as EventListener)
    }
  }, [])

  function gridPiece(sq: string): { type: string; color: "w" | "b" } | null {
    const { f, r } = sqCoords(sq)
    return snap.grid[r]?.[f] ?? null
  }

  function down(e: React.PointerEvent, sq: string) {
    if (!interactive) return
    e.preventDefault()
    const cell = gridPiece(sq)
    const grabbable = !armColor || (cell && cell.color === armColor)
    dragRef.current = { sq, moved: false, x: e.clientX, y: e.clientY, piece: grabbable && cell ? cell : undefined }
    if (grabbable && cell) {
      setDragTargets(targetsFor?.(sq) ?? [])
      setDragSources(sq)
    }
  }

  return (
    <div className={`board-wrap${dim ? " dim" : ""}${interactive ? " live" : ""}${tilt ? " tilt3d" : ""}`}>
      <div className="board" ref={boardRef}>
        {order.map((r) =>
          order.map((f) => {
            const sq = squareAt(f, r)
            const piece = snap.grid[r]?.[f] ?? null
            const dark = (f + r) % 2 === 1
            const cls = [
              "sq",
              dark ? "dk" : "lt",
              shakeSq === sq ? "shake" : "",
              lastMove && (sq === lastMove.from || sq === lastMove.to) ? "last" : "",
              selected === sq && selectable ? "sel" : "",
              legalTargets.includes(sq) || dragTargets.includes(sq) ? "tgt" : "",
              highlightSquares.includes(sq) ? "hlq" : "",
              premove && (premove.from === sq || premove.to === sq) ? "pmq" : "",
              snap.checkSquare === sq ? "chk" : "",
              piece ? "occ" : "",
              dragSources === sq ? "lifted" : "",
            ]
              .filter(Boolean)
              .join(" ")
            const suppress = (anim && sq === anim.to) || (anim?.rookTo && sq === anim.rookTo)
            const showFile = (flip ? r === 0 : r === 7)
            const showRank = (flip ? f === 7 : f === 0)
            return (
              <div
                key={sq}
                className={cls}
                data-sq={sq}
                onPointerDown={(e) => down(e, sq)}
              >
                {piece && !suppress && <Piece type={piece.type} color={piece.color} />}
                {showRank && <span className="coord coord-rank">{RANKS[r]}</span>}
                {showFile && <span className="coord coord-file">{FILES[f]}</span>}
              </div>
            )
          }),
        )}
        {capFade && (
          <div
            key={`cap-${capFade.key}`}
            className="cap-fade"
            style={{
              left: `${((flip ? 7 - sqCoords(capFade.sq).f : sqCoords(capFade.sq).f) / 8) * 100}%`,
              top: `${((flip ? 7 - sqCoords(capFade.sq).r : sqCoords(capFade.sq).r) / 8) * 100}%`,
            }}
          >
            <Piece type={capFade.piece.type} color={capFade.piece.color} />
          </div>
        )}
        {anim?.rookPiece && anim.rookFrom && anim.rookTo && (
          <div
            className="move-anim"
            style={{
              left: `${((flip ? 7 - sqCoords(anim.rookTo).f : sqCoords(anim.rookTo).f) / 8) * 100}%`,
              top: `${((flip ? 7 - sqCoords(anim.rookTo).r : sqCoords(anim.rookTo).r) / 8) * 100}%`,
            }}
          >
            <div
              className="move-anim-inner rook-glide"
              style={{
                ["--dx" as string]: `${sqCoords(anim.rookTo).f - sqCoords(anim.rookFrom).f}`,
                ["--dy" as string]: `${sqCoords(anim.rookTo).r - sqCoords(anim.rookFrom).r}`,
              }}
            >
              <Piece type={anim.rookPiece.type} color={anim.rookPiece.color} />
            </div>
          </div>
        )}
        {anim && (
          <div
            key={anim.key}
            className="move-anim"
            style={{
              left: `${((flip ? 7 - sqCoords(anim.to).f : sqCoords(anim.to).f) / 8) * 100}%`,
              top: `${((flip ? 7 - sqCoords(anim.to).r : sqCoords(anim.to).r) / 8) * 100}%`,
            }}
          >
            <div
              className="move-anim-inner"
              style={{
                ["--dx" as string]: `${sqCoords(anim.to).f - sqCoords(anim.from).f}`,
                ["--dy" as string]: `${sqCoords(anim.to).r - sqCoords(anim.from).r}`,
              }}
            >
              <Piece type={anim.piece.type} color={anim.piece.color} />
            </div>
          </div>
        )}
        <svg className="arrow-layer" viewBox="0 0 8 8" preserveAspectRatio="none">
          <defs>
            {arrows.map((a, i) => (
              <marker key={i} id={`ah${i}`} markerWidth="3" markerHeight="3" refX="1.7" refY="1.5" orient="auto">
                <path d="M0,0 L0,3 L2.8,1.5 z" fill={a.color ?? "#6cb94b"} />
              </marker>
            ))}
          </defs>
          {arrows.map((a, i) => {
            const a1 = sqCoords(a.from)
            const a2 = sqCoords(a.to)
            const cx = (v: number) => (flip ? 8 - v : v)
            const x1 = cx(a1.f + 0.5)
            const y1 = cx(a1.r + 0.5)
            const x2 = cx(a2.f + 0.5)
            const y2 = cx(a2.r + 0.5)
            const dx = x2 - x1
            const dy = y2 - y1
            const len = Math.hypot(dx, dy) || 1
            const k = 0.28
            return (
              <line
                key={i}
                x1={x1 + (dx * k) / len}
                y1={y1 + (dy * k) / len}
                x2={x2 - (dx * k) / len}
                y2={y2 - (dy * k) / len}
                stroke={a.color ?? "#6cb94b"}
                strokeOpacity="0.8"
                strokeWidth={a.width ?? 0.16}
                strokeLinecap="round"
                markerEnd={`url(#ah${i})`}
              />
            )
          })}
        </svg>
      </div>
    </div>
  )
}
