import { useState, useRef, useEffect, useCallback } from 'react'
import type { HistoryEntry } from './types'
import { parseCommand, isValidCommand, COMMANDS } from './commandRegistry'
import OutputRenderer from './OutputRenderer'
import CommandInput from './CommandInput'
import { useCommandHistory } from './useCommandHistory'
import { useTabCompletion } from './useTabCompletion'
import styles from './Terminal.module.css'

const BOOT_ENTRY: HistoryEntry = {
  id: 'boot',
  type: 'welcome',
  timestamp: Date.now(),
}

export default function Terminal() {
  const [entries, setEntries] = useState<HistoryEntry[]>([BOOT_ENTRY])
  const [inputValue, setInputValue] = useState('')
  const [cmdHistory, setCmdHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [inputDraft, setInputDraft] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const outputEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = useCallback((raw: string) => {
    const cmd = parseCommand(raw)
    if (!cmd) return

    if (cmd === '/clear') {
      setEntries(prev => prev.filter(e => e.type === 'welcome'))
      setInputValue('')
      return
    }

    const echo: HistoryEntry = {
      id: crypto.randomUUID(),
      type: 'command',
      command: cmd,
      timestamp: Date.now(),
    }
    const result: HistoryEntry = {
      id: crypto.randomUUID(),
      type: isValidCommand(cmd) ? 'output' : 'error',
      command: cmd,
      timestamp: Date.now(),
    }

    setEntries(prev => [...prev, echo, result])
    setCmdHistory(prev => [cmd, ...prev])
    setHistoryIndex(-1)
    setInputDraft('')
    setInputValue('')
  }, [])

  const handleHistoryKey = useCommandHistory({
    cmdHistory, historyIndex, setHistoryIndex,
    inputDraft, setInputDraft, inputValue, setInputValue,
  })

  const handleTab = useTabCompletion({ inputValue, setInputValue, setEntries })

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Tab') {
      e.preventDefault()
      handleTab(e)
      return
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      handleHistoryKey(e)
      return
    }
    if (e.key === 'Enter') {
      handleSubmit(inputValue)
    }
  }

  return (
    <div
      className={styles.terminal}
      onClick={() => inputRef.current?.focus()}
    >
      <div className={styles.outputArea}>
        {entries.map(entry => (
          <OutputRenderer key={entry.id} entry={entry} />
        ))}
        <div ref={outputEndRef} />
      </div>
      <div className={styles.legend}>
        {COMMANDS.map(cmd => (
          <button
            key={cmd}
            className={styles.legendBtn}
            tabIndex={-1}
            onClick={e => { e.stopPropagation(); handleSubmit(cmd) }}
          >
            {cmd}
          </button>
        ))}
      </div>
      <CommandInput
        ref={inputRef}
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}
