export type CommandName =
  | '/about'
  | '/work'
  | '/contact'
  | '/help'
  | '/clear'
  | '/skills'
  | '/writing'

export type OutputType = 'welcome' | 'command' | 'output' | 'error'

export interface HistoryEntry {
  id: string
  type: OutputType
  command?: string
  timestamp: number
}
