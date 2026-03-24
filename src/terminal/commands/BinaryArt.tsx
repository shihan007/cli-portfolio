import { useEffect, useRef, useState } from 'react'

interface Props {
  src: string
  cols?: number
  threshold?: number
}

export default function BinaryArt({ src, cols = 52, threshold = 100 }: Props) {
  const [lines, setLines] = useState<string[][]>([])
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new Image()
    img.src = src
    imgRef.current = img
    img.onload = () => {
      const rows = Math.round(cols * (img.naturalHeight / img.naturalWidth) * 0.48)
      const canvas = document.createElement('canvas')
      canvas.width = cols
      canvas.height = rows
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, cols, rows)
      const { data } = ctx.getImageData(0, 0, cols, rows)

      const result: string[][] = []
      for (let r = 0; r < rows; r++) {
        const row: string[] = []
        for (let c = 0; c < cols; c++) {
          const i = (r * cols + c) * 4
          const brightness = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114)
          row.push(brightness > threshold ? '1' : '0')
        }
        result.push(row)
      }
      setLines(result)
    }
  }, [src, cols, threshold])

  if (!lines.length) return null

  return (
    <pre style={{
      margin: 0,
      fontFamily: 'ui-monospace, Consolas, monospace',
      fontSize: '6px',
      lineHeight: '1.05',
      letterSpacing: '0.5px',
      userSelect: 'none',
    }}>
      {lines.map((row, r) => (
        <span key={r} style={{ display: 'block' }}>
          {row.map((ch, c) => (
            <span
              key={c}
              style={{
                color: ch === '1' ? 'var(--accent)' : 'var(--text)',
                opacity: ch === '1' ? 1 : 0.18,
              }}
            >{ch}</span>
          ))}
        </span>
      ))}
    </pre>
  )
}
