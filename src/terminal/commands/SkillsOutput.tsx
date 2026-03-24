import { skills } from '../../data/skills'
import styles from './commands.module.css'

export default function SkillsOutput() {
  return (
    <div className={styles.block}>
      {skills.map(s => (
        <p key={s.name}>
          <span className={styles.cmd}>{s.name.padEnd(14)}</span>
          <span className={styles.dim}>{s.description}</span>
        </p>
      ))}
    </div>
  )
}
