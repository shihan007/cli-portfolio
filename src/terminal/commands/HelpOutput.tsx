import { COMMANDS, COMMAND_DESCRIPTIONS } from '../commandRegistry'
import styles from './commands.module.css'

export default function HelpOutput() {
  return (
    <div className={styles.block}>
      <p className={styles.dim}>Available commands:</p>
      <table className={styles.helpTable}>
        <tbody>
          {COMMANDS.map(cmd => (
            <tr key={cmd}>
              <td><span className={styles.cmd}>{cmd}</span></td>
              <td className={styles.dim}>{COMMAND_DESCRIPTIONS[cmd]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
