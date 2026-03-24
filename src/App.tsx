import Terminal from './terminal/Terminal'
import Tetris from './terminal/commands/Tetris'

export default function App() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <Terminal />
      </div>
      <div style={{
        width: '360px',
        flexShrink: 0,
        borderLeft: '1px solid var(--border)',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <Tetris />
      </div>
    </div>
  )
}
