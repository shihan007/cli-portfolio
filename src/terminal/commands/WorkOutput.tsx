import { projects } from '../../data/projects'
import styles from './commands.module.css'

export default function WorkOutput() {
  return (
    <div className={styles.block}>
      {projects.map(p => (
        <div key={p.name} className={styles.projectEntry}>
          <p>
            {p.url
              ? <a className={`${styles.projectName} ${styles.link}`} href={p.url} target="_blank" rel="noreferrer">{p.name}</a>
              : <span className={styles.projectName}>{p.name}</span>
            }
          </p>
          <p className={styles.dim}>{p.description}</p>
          <p className={styles.tech}>{p.tags.map(t => `[${t}]`).join(' ')}</p>
        </div>
      ))}
    </div>
  )
}
