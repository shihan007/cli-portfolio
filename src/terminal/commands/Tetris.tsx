import { useState, useEffect, useCallback, useRef } from 'react'
import styles from './Tetris.module.css'

const COLS = 10
const ROWS = 20

const TETROMINOES: number[][][] = [
  [[1, 1, 1, 1]],           // 1: I
  [[1, 1], [1, 1]],         // 2: O
  [[0, 1, 0], [1, 1, 1]],  // 3: T
  [[0, 1, 1], [1, 1, 0]],  // 4: S
  [[1, 1, 0], [0, 1, 1]],  // 5: Z
  [[1, 0, 0], [1, 1, 1]],  // 6: J
  [[0, 0, 1], [1, 1, 1]],  // 7: L
]

const SCORES = [0, 100, 300, 500, 800]

function createGrid(): number[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0))
}

function newPiece() {
  const type = Math.floor(Math.random() * TETROMINOES.length)
  const shape = TETROMINOES[type].map(row => [...row])
  return { type: type + 1, shape, x: Math.floor((COLS - shape[0].length) / 2), y: 0 }
}

function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length
  const cols = shape[0].length
  const out: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0))
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out[c][rows - 1 - r] = shape[r][c]
  return out
}

function isValid(grid: number[][], shape: number[][], x: number, y: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue
      const nr = y + r, nc = x + c
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || grid[nr][nc]) return false
    }
  }
  return true
}

function lockAndClear(
  grid: number[][], shape: number[][], x: number, y: number, type: number
): { grid: number[][]; cleared: number } {
  const next = grid.map(row => [...row])
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c]) next[y + r][x + c] = type
  const kept = next.filter(row => row.some(cell => cell === 0))
  const cleared = ROWS - kept.length
  const empty = Array.from({ length: cleared }, () => Array(COLS).fill(0))
  return { grid: [...empty, ...kept], cleared }
}

type GameState = 'idle' | 'playing' | 'gameover'
interface Piece { type: number; shape: number[][]; x: number; y: number }

export default function Tetris() {
  const [grid, setGrid] = useState<number[][]>(createGrid)
  const [piece, setPiece] = useState<Piece | null>(null)
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(1)
  const [gameState, setGameState] = useState<GameState>('idle')

  const gridRef = useRef(grid)
  const pieceRef = useRef(piece)
  const levelRef = useRef(level)
  gridRef.current = grid
  pieceRef.current = piece
  levelRef.current = level

  const spawn = useCallback((g: number[][]): Piece | null => {
    const p = newPiece()
    if (!isValid(g, p.shape, p.x, p.y)) {
      setGameState('gameover')
      return null
    }
    return p
  }, [])

  const tick = useCallback(() => {
    const p = pieceRef.current
    const g = gridRef.current
    if (!p) return

    if (isValid(g, p.shape, p.x, p.y + 1)) {
      setPiece(prev => prev ? { ...prev, y: prev.y + 1 } : prev)
    } else {
      const { grid: nextGrid, cleared } = lockAndClear(g, p.shape, p.x, p.y, p.type)
      gridRef.current = nextGrid
      setGrid(nextGrid)
      if (cleared > 0) {
        setScore(s => s + (SCORES[cleared] ?? 800) * levelRef.current)
        setLines(l => {
          const nl = l + cleared
          setLevel(Math.floor(nl / 10) + 1)
          return nl
        })
      }
      const next = spawn(nextGrid)
      pieceRef.current = next
      setPiece(next)
    }
  }, [spawn])

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return
    const speed = Math.max(80, 500 - (level - 1) * 40)
    const id = setInterval(tick, speed)
    return () => clearInterval(id)
  }, [gameState, level, tick])

  // Keyboard handler (capture phase — fires before input's onKeyDown)
  useEffect(() => {
    if (gameState !== 'playing') return

    const handle = (e: KeyboardEvent) => {
      const p = pieceRef.current
      const g = gridRef.current
      if (!p) return

      const isArrow = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)
      if (isArrow) { e.preventDefault(); e.stopPropagation() }

      if (e.key === 'Escape') { setGameState('idle'); return }

      if (e.key === 'ArrowLeft') {
        if (isValid(g, p.shape, p.x - 1, p.y))
          setPiece(prev => prev ? { ...prev, x: prev.x - 1 } : prev)
      } else if (e.key === 'ArrowRight') {
        if (isValid(g, p.shape, p.x + 1, p.y))
          setPiece(prev => prev ? { ...prev, x: prev.x + 1 } : prev)
      } else if (e.key === 'ArrowDown') {
        if (isValid(g, p.shape, p.x, p.y + 1))
          setPiece(prev => prev ? { ...prev, y: prev.y + 1 } : prev)
      } else if (e.key === 'ArrowUp') {
        const rotated = rotateCW(p.shape)
        const kicks = [0, -1, 1, -2, 2]
        for (const dx of kicks) {
          if (isValid(g, rotated, p.x + dx, p.y)) {
            setPiece(prev => prev ? { ...prev, shape: rotated, x: prev.x + dx } : prev)
            break
          }
        }
      }
    }

    document.addEventListener('keydown', handle, true)
    return () => document.removeEventListener('keydown', handle, true)
  }, [gameState])

  const startGame = () => {
    const g = createGrid()
    gridRef.current = g
    setGrid(g)
    setScore(0)
    setLines(0)
    setLevel(1)
    const p = newPiece()
    pieceRef.current = p
    setPiece(p)
    setGameState('playing')
  }

  // Merge active piece into grid for display
  const display = grid.map(row => [...row])
  if (piece) {
    for (let r = 0; r < piece.shape.length; r++)
      for (let c = 0; c < piece.shape[r].length; c++)
        if (piece.shape[r][c]) {
          const dr = piece.y + r, dc = piece.x + c
          if (dr >= 0 && dr < ROWS && dc >= 0 && dc < COLS)
            display[dr][dc] = piece.type
        }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.scoreBar}>
        <span>Score <span className={styles.val}>{score}</span></span>
        <span>Lines <span className={styles.val}>{lines}</span></span>
        <span>Lvl <span className={styles.val}>{level}</span></span>
      </div>
      <div className={styles.gameArea}>
        <div className={styles.grid}>
          {display.map((row, r) =>
            row.map((cell, c) => (
              <span
                key={`${r}-${c}`}
                className={`${styles.cell} ${cell ? styles[`p${cell}`] : styles.empty}`}
              />
            ))
          )}
        </div>
        {gameState === 'idle' && (
          <div className={styles.overlay} onClick={startGame}>
            <span className={styles.overlayText}>&gt; Click to play</span>
          </div>
        )}
        {gameState === 'gameover' && (
          <div className={styles.overlay} onClick={startGame}>
            <span className={styles.overlayText}>GAME OVER</span>
            <span className={styles.overlaySub}>&gt; Click to restart</span>
          </div>
        )}
      </div>
      <div className={styles.controls}>
        [ESC] exit &nbsp;|&nbsp; [↑] rotate &nbsp;|&nbsp; [↓] drop &nbsp;|&nbsp; [←][→] move
      </div>
    </div>
  )
}
