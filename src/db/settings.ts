import { db, type SettingKey } from './db'

export interface Profile {
  name: string
  heightCm: number | null
  lastExportAt: number | null
}

export async function getProfile(): Promise<Profile> {
  const rows = await db.settings.toArray()
  const get = (key: SettingKey) => rows.find((r) => r.key === key)?.value
  const name = get('name')
  const heightCm = get('heightCm')
  const lastExportAt = get('lastExportAt')
  return {
    name: typeof name === 'string' ? name : '',
    heightCm: typeof heightCm === 'number' ? heightCm : null,
    lastExportAt: typeof lastExportAt === 'number' ? lastExportAt : null,
  }
}

export async function setName(name: string): Promise<void> {
  await db.settings.put({ key: 'name', value: name.trim() })
}

export async function setHeightCm(heightCm: number | null): Promise<void> {
  if (heightCm === null) await db.settings.delete('heightCm')
  else await db.settings.put({ key: 'heightCm', value: heightCm })
}

export async function setLastExportAt(ts: number): Promise<void> {
  await db.settings.put({ key: 'lastExportAt', value: ts })
}
