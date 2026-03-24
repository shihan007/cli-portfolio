import type { HistoryEntry } from './types'
import WelcomeOutput from './commands/WelcomeOutput'
import AboutOutput from './commands/AboutOutput'
import WorkOutput from './commands/WorkOutput'
import SkillsOutput from './commands/SkillsOutput'
import ContactOutput from './commands/ContactOutput'
import HelpOutput from './commands/HelpOutput'
import WritingOutput from './commands/WritingOutput'
import ErrorOutput from './commands/ErrorOutput'
import styles from './Terminal.module.css'

export default function OutputRenderer({ entry }: { entry: HistoryEntry }) {
  if (entry.type === 'welcome') return <WelcomeOutput />

  if (entry.type === 'command') {
    return <div className={styles.commandEcho}>{entry.command}</div>
  }

  if (entry.type === 'error') {
    return <ErrorOutput command={entry.command ?? ''} />
  }

  // type === 'output'
  const cmd = entry.command ?? ''

  // Tab completion hint
  if (cmd.startsWith('__tab__')) {
    const options = cmd.replace('__tab__', '').split(' ')
    return (
      <div className={styles.tabHint}>
        {options.map(o => <span key={o} className={styles.tabOption}>{o}</span>)}
      </div>
    )
  }

  switch (cmd) {
    case '/about':   return <AboutOutput />
    case '/work':    return <WorkOutput />
    case '/skills':  return <SkillsOutput />
    case '/writing': return <WritingOutput />
    case '/contact': return <ContactOutput />
    case '/help':    return <HelpOutput />
    default:         return null
  }
}
