import Terminal from './terminal/Terminal'
import Tetris from './terminal/commands/Tetris'
import styles from './App.module.css'

export default function App() {
  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <div className={styles.terminalPane}>
          <Terminal />
        </div>
        <div className={styles.sidebar}>
          <Tetris />
        </div>
      </div>
    </div>
  )
}
