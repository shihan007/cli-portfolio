import type React from 'react'
import type { HistoryEntry } from './types'
import { getCompletions } from './commandRegistry'

interface Options {
  inputValue: string
  setInputValue: (s: string) => void
  setEntries: React.Dispatch<React.SetStateAction<HistoryEntry[]>>
}

export function useTabCompletion({ inputValue, setInputValue, setEntries }: Options) {
  return function handleTab(_e: React.KeyboardEvent<HTMLInputElement>) {
    const matches = getCompletions(inputValue)
    if (matches.length === 0) return
    if (matches.length === 1) {
      setInputValue(matches[0])
      return
    }
    // Multiple matches: show them as an output entry
    setEntries(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'output',
        command: `__tab__${matches.join(' ')}`,
        timestamp: Date.now(),
      },
    ])
  }
}
