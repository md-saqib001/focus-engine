import { exec } from 'child_process'
import { promisify } from 'util'
import { basename } from 'path'

const execAsync = promisify(exec)

/**
 * Validates and sanitizes a process name to prevent shell command injection.
 * Reject metacharacters like $, ;, |, &, `, \n, \r, (, ), <, >, \
 * Only allow letters, numbers, spaces, dashes, underscores, and dots.
 */
export function sanitizeProcessName(name: string): string {
  const clean = name.trim()
  
  // Shell command injection risk explicitly explained:
  // When running exec(`taskkill /IM "${name}"`), if name contains metacharacters
  // (e.g., 'spotify; rm -rf /' or 'discord & calc.exe'), the shell will interpret
  // the metacharacter as a statement separator and execute the injected payload.
  // By strictly checking name against a whitelist regex, we completely neutralize this vector.
  const allowedPattern = /^[a-zA-Z0-9\s._-]+$/
  if (!allowedPattern.test(clean)) {
    throw new Error(
      `Invalid process name: "${name}". Process names may only contain ` +
      `alphanumeric characters, spaces, dots, dashes, and underscores to prevent shell injection.`
    )
  }
  return clean
}

/**
 * Returns a list of active process names on the system.
 */
export async function getRunningProcesses(): Promise<string[]> {
  const processes: string[] = []

  if (process.platform === 'win32') {
    try {
      const { stdout } = await execAsync('tasklist /FO CSV /NH')
      const lines = stdout.split(/\r?\n/)
      for (const line of lines) {
        if (!line.trim()) continue
        // CSV format: "Process Name","PID","Session Name","Session#","Mem Usage"
        // Splitting by "," and stripping quotes
        const match = line.split('","')
        if (match && match[0]) {
          const name = match[0].replace(/^"/, '').trim()
          if (name) {
            processes.push(name)
          }
        }
      }
    } catch (error) {
      console.error('[ProcessManager] Failed to get running processes on Windows:', error)
    }
  } else {
    // macOS / Linux
    try {
      const { stdout } = await execAsync('ps -A -o comm')
      const lines = stdout.split(/\r?\n/)
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'COMM' || trimmed === 'command') continue
        // Extract the base process name (e.g. /Applications/Discord.app/Contents/MacOS/Discord -> Discord)
        processes.push(basename(trimmed))
      }
    } catch (error) {
      console.error('[ProcessManager] Failed to get running processes on Unix:', error)
    }
  }

  return processes
}

/**
 * Terminates a process by its name.
 */
export async function killProcess(name: string): Promise<void> {
  const sanitized = sanitizeProcessName(name)

  if (process.platform === 'win32') {
    // Ensure the name ends with .exe on Windows
    const exeName = sanitized.toLowerCase().endsWith('.exe') ? sanitized : `${sanitized}.exe`
    // /F = Force terminate, /T = Terminate tree (child processes)
    await execAsync(`taskkill /F /T /IM "${exeName}"`)
  } else {
    // macOS / Linux
    // -f = full path match, -i = case-insensitive
    await execAsync(`pkill -f -i "${sanitized}"`)
  }
}

/**
 * Scans active processes, terminates matches in the blacklisted apps list,
 * and returns details of what was killed.
 */
export async function killBlacklistedApps(blacklist: string[]): Promise<{
  killed: string[]
  notFound: string[]
}> {
  const running = await getRunningProcesses()
  const killed: string[] = []
  const notFound: string[] = []

  // Optimize search by lowercasing running process list
  const runningLower = running.map((p) => p.toLowerCase())

  for (const app of blacklist) {
    const appLower = app.toLowerCase()
    
    // Check if the app is currently running.
    // Supports matching both exact name (Discord.exe) or base name (Discord).
    const isRunning = runningLower.some((proc) => {
      return proc === appLower || proc === `${appLower}.exe` || proc.includes(appLower)
    })

    if (isRunning) {
      try {
        await killProcess(app)
        killed.push(app)
        console.log(`[ProcessManager] Terminated blacklisted app: ${app}`)
      } catch (error) {
        console.error(`[ProcessManager] Failed to kill ${app}:`, error)
      }
    } else {
      notFound.push(app)
    }
  }

  return { killed, notFound }
}
