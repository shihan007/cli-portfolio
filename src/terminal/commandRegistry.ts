import type { CommandName } from './types'

export const COMMANDS: CommandName[] = [
  '/about',
  '/work',
  '/skills',
  '/writing',
  '/contact',
  '/help',
  '/clear',
]

export const COMMAND_DESCRIPTIONS: Record<CommandName, string> = {
  '/about':   'Learn about me',
  '/work':    'See my projects',
  '/skills':  'View my skill set',
  '/writing': 'Read my writing',
  '/contact': 'Get in touch',
  '/help':    'List all commands',
  '/clear':   'Clear the terminal',
}

export function parseCommand(raw: string): string {
  return raw.trim().toLowerCase()
}

export function isValidCommand(cmd: string): cmd is CommandName {
  return (COMMANDS as string[]).includes(cmd)
}

export function getCompletions(partial: string): CommandName[] {
  if (!partial) return []
  return COMMANDS.filter(c => c.startsWith(partial.toLowerCase()))
}
