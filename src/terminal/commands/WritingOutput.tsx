import { writings } from '../../data/writing'
import styles from './commands.module.css'

export default function WritingOutput() {
  return (
    <div className={styles.block}>
      {writings.map(w => (
        <div key={w.title} className={styles.projectEntry}>
          <p>
            <a className={`${styles.projectName} ${styles.link}`} href={w.url} target="_blank" rel="noreferrer">
              {w.title}
            </a>
            <span className={styles.dim}> — {w.date}</span>
          </p>
          <p className={styles.dim}>{w.description}</p>
          <p className={styles.tech}>{w.tags.map(t => `[${t}]`).join(' ')}</p>
        </div>
      ))}
    </div>
  )
}
