import { describe, expect, it } from 'vitest'
import { TokenResolver, type MurteValue } from '../../src/MurteCore'

const data: Record<string, MurteValue> = {
  name: 'Ada',
  count: 3,
  user: { name: 'Grace' }
}

function lookup(path: string): MurteValue | undefined {
  const parts = path.split('.').filter(Boolean)
  if (parts.length === 0) return undefined
  let current = data[parts[0]!]
  for (const part of parts.slice(1)) {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) return undefined
    current = (current as Record<string, MurteValue>)[part]
  }
  return current
}

describe('TokenResolver', () => {
  it('replaces a simple token', () => expect(TokenResolver.resolve('Hi {{name}}', lookup)).toBe('Hi Ada'))
  it('replaces a nested path', () => expect(TokenResolver.resolve('{{user.name}}', lookup)).toBe('Grace'))
  it('number token uses displayString', () => expect(TokenResolver.resolve('n={{count}}', lookup)).toBe('n=3'))
  it('missing token resolves empty', () => expect(TokenResolver.resolve('[{{nope}}]', lookup)).toBe('[]'))
  it('multiple tokens', () => expect(TokenResolver.resolve('{{name}}/{{count}}', lookup)).toBe('Ada/3'))
  it('whitespace inside braces is trimmed', () => expect(TokenResolver.resolve('{{ name }}', lookup)).toBe('Ada'))
  it('no tokens pass through', () => expect(TokenResolver.resolve('plain text', lookup)).toBe('plain text'))
  it('unterminated token is literal', () => expect(TokenResolver.resolve('a {{oops', lookup)).toBe('a {{oops'))
})
