import type React from 'react'

interface Options {
  cmdHistory: string[]
  historyIndex: number
  setHistoryIndex: (i: number) => void
  inputDraft: string
  setInputDraft: (s: string) => void
  inputValue: string
  setInputValue: (s: string) => void
}

export function useCommandHistory(opts: Options) {
  const {
    cmdHistory, historyIndex, setHistoryIndex,
    inputDraft, setInputDraft, inputValue, setInputValue,
  } = opts

  return function handleHistoryKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowUp') {
      if (cmdHistory.length === 0) return
      if (historyIndex === -1) {
        setInputDraft(inputValue)
      }
      const next = Math.min(historyIndex + 1, cmdHistory.length - 1)
      setHistoryIndex(next)
      setInputValue(cmdHistory[next])
    } else if (e.key === 'ArrowDown') {
      if (historyIndex === -1) return
      const next = historyIndex - 1
      setHistoryIndex(next)
      setInputValue(next === -1 ? inputDraft : cmdHistory[next])
    }
  }
}
