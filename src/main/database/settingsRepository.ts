import { getDatabase } from './db'

export const settingsRepository = {
  getSetting(key: string, defaultValue: string = ''): string {
    const db = getDatabase()
    const stmt = db.prepare('SELECT setting_value FROM app_settings WHERE setting_key = ?')
    const row = stmt.get(key) as { setting_value: string } | undefined
    return row ? row.setting_value : defaultValue
  },

  setSetting(key: string, value: string): void {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO app_settings (setting_key, setting_value)
      VALUES (?, ?)
      ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value
    `)
    stmt.run(key, value)
  },

  getCVEnabled(): boolean {
    const val = this.getSetting('cv_enabled', 'true')
    return val === 'true'
  },

  setCVEnabled(enabled: boolean): void {
    this.setSetting('cv_enabled', enabled ? 'true' : 'false')
  },

  getCVPermission(): 'granted' | 'denied' | 'pending' {
    const val = this.getSetting('cv_permission', 'pending')
    if (val === 'granted' || val === 'denied' || val === 'pending') {
      return val
    }
    return 'pending'
  },

  setCVPermission(permission: 'granted' | 'denied' | 'pending'): void {
    this.setSetting('cv_permission', permission)
  }
}
