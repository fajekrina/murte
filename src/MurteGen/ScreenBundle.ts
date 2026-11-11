import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Screen } from '../MurteBuilder'
import type { MurteData } from '../MurteCore'

export interface ScreenFile {
  name: string
  data: MurteData
}

/// A set of authored screens turned into validated JSON files (`<key>.json`).
export class ScreenBundle {
  constructor(private readonly screens: Screen[]) {}

  /// Validate every screen and return its `<key>.json` bytes. Throws on the first
  /// invalid screen so a bad bundle never ships.
  files(): ScreenFile[] {
    return this.screens.map((screen) => {
      screen.validated()
      return { name: `${screen.payload.screen.key}.json`, data: screen.jsonData() }
    })
  }

  /// Write the bundle to a directory.
  async write(directory: string): Promise<void> {
    const files = this.files()
    await mkdir(directory, { recursive: true })
    for (const file of files) await writeFile(join(directory, file.name), file.data)
  }
}
