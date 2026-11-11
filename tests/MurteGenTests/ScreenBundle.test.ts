// @vitest-environment node
import { mkdtemp, readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MurtePayload } from '../../src/MurteCore'
import { Action, Button, Screen, Text, VStack } from '../../src/MurteBuilder'
import { ScreenBundle } from '../../src/MurteGen/ScreenBundle'

const screens = () => [
  new Screen('home', () => VStack(Text('Hi'))),
  new Screen('about', () => Text('About'))
]

describe('ScreenBundle', () => {
  it('emits validated files keyed by screen', () => {
    const files = new ScreenBundle(screens()).files()
    expect(files.map((f) => f.name).sort()).toEqual(['about.json', 'home.json'])
    for (const file of files) {
      expect(file.name).toBe(`${MurtePayload.fromJSON(file.data).screen.key}.json`)
    }
  })

  it('an invalid screen fails the bundle', () => {
    const bad = [new Screen('s', () => Button('x', { action: Action.openURL('https://evil.example.com') }))]
    expect(() => new ScreenBundle(bad).files()).toThrow()
  })

  it('writes the bundle to a directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'murte-gen-'))
    await new ScreenBundle(screens()).write(dir)
    expect((await readdir(dir)).sort()).toEqual(['about.json', 'home.json'])
    expect(MurtePayload.fromJSON(new Uint8Array(await readFile(join(dir, 'home.json')))).screen.key).toBe('home')
  })
})
