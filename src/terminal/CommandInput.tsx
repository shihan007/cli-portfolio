import { forwardRef } from 'react'
import styles from './CommandInput.module.css'
import { profile } from '../data/profile'

interface Props {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

const CommandInput = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, onKeyDown }, ref) => {
    const user = profile.name.split(' ')[0].toLowerCase()
    return (
      <div className={styles.promptRow}>
        <span className={styles.prompt}>{user}@portfolio</span>
        <span className={styles.separator}>:~$</span>
        <input
          ref={ref}
          className={styles.input}
          type="text"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="terminal input"
        />
      </div>
    )
  }
)

CommandInput.displayName = 'CommandInput'
export default CommandInput
