import styles from './commands.module.css'

export default function ErrorOutput({ command }: { command: string }) {
  return (
    <p className={styles.error}>
      bash: {command}: command not found &mdash; type <span className={styles.cmd}>/help</span> for available commands
    </p>
  )
}
