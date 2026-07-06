import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Closes browser windows (Windows) or individual tabs (macOS) matching the blocked domains.
 * This terminates active sockets and forces a new DNS request on reconnect.
 */
export async function closeActiveBlockedTabs(domains: string[]): Promise<void> {
  if (domains.length === 0) return

  // Extract clean keywords for title matching (e.g. "youtube.com" -> "youtube")
  const keywords = domains.map((domain) => {
    const parts = domain.split('.')
    return parts[0] === 'www' ? parts[1] : parts[0]
  })

  if (process.platform === 'win32') {
    await closeWindowsOnWindows(keywords)
  } else if (process.platform === 'darwin') {
    await closeTabsOnMac(keywords)
  }
}

/**
 * On Windows, we find running browser processes with window titles containing our keywords
 * and request a clean window close (CloseMainWindow).
 * We explicitly restrict this to known web browsers to avoid closing our own Electron app or shell.
 */
async function closeWindowsOnWindows(keywords: string[]): Promise<void> {
  const psArray = keywords.map((k) => `'${k}'`).join(', ')
  const browserNames = "chrome, brave, msedge, firefox, opera, iexplore"
  
  const script = [
    `$keywords = @(${psArray});`,
    `Get-Process -Name ${browserNames} -ErrorAction SilentlyContinue | Where-Object {`,
    `  $title = $_.MainWindowTitle;`,
    `  if ($title) {`,
    `    foreach ($k in $keywords) {`,
    `      if ($title.ToLower().Contains($k.ToLower())) { return $true }`,
    `    }`,
    `  };`,
    `  return $false`,
    `} | ForEach-Object { $_.CloseMainWindow() }`
  ].join(' ')

  try {
    await execAsync(`powershell -Command "${script}"`)
    console.log('[TabCloser] Sent close signals to matching browser windows on Windows')
  } catch (error) {
    console.error('[TabCloser] Failed to close windows on Windows:', error)
  }
}

/**
 * On macOS, we can target Chrome, Brave, and Safari specifically using AppleScript
 * to close matching tabs individually without closing the entire window.
 */
async function closeTabsOnMac(keywords: string[]): Promise<void> {
  const appleScriptConditions = keywords
    .map((k) => `title of t contains "${k}" or URL of t contains "${k}"`)
    .join(' or ')

  const script = `
    osascript -e '
      tell application "Google Chrome"
        repeat with w in windows
          repeat with t in tabs of w
            if ${appleScriptConditions} then
              close t
            end if
          end repeat
        end repeat
      end tell
      tell application "Brave Browser"
        repeat with w in windows
          repeat with t in tabs of w
            if ${appleScriptConditions} then
              close t
            end if
          end repeat
        end repeat
      end tell
      tell application "Safari"
        repeat with w in windows
          repeat with t in tabs of w
            if ${appleScriptConditions} then
              close t
            end if
          end repeat
        end repeat
      end tell
    '
  `

  try {
    await execAsync(script)
    console.log('[TabCloser] Closed matching browser tabs on macOS')
  } catch (error) {
    console.error('[TabCloser] Failed to close tabs on macOS:', error)
  }
}
