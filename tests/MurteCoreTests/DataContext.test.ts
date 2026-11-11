import { describe, expect, it, vi } from 'vitest'
import { DataContext, MurteRenderContext } from '../../src/MurteCore'

describe('DataContext', () => {
  it('seed and nested lookup', () => {
    const context = new DataContext({ user: { name: 'Ada' } })
    expect(context.value('user.name')).toBe('Ada')
    expect(context.get('user')).toBeDefined()
    expect(context.value('user.missing')).toBeUndefined()
  })

  it('merge updates values', () => {
    const context = new DataContext()
    context.merge({ balance: 100 })
    expect(context.value('balance')).toBe(100)
  })

  it('merge notifies observers', () => {
    const context = new DataContext()
    const listener = vi.fn()
    const unsubscribe = context.subscribe(listener)
    context.merge({ a: 1 })
    unsubscribe()
    context.merge({ a: 2 })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('resolves tokens', () => {
    expect(new DataContext({ name: 'Ada' }).resolve('Hi {{name}}')).toBe('Hi Ada')
  })

  it('child scope does not leak into parent', () => {
    const parent = new DataContext({ a: 1 })
    const child = new MurteRenderContext({ data: parent }).child({ a: 2, b: 9 })
    expect(child.data.value('a')).toBe(2)
    expect(child.data.value('b')).toBe(9)
    expect(parent.value('a')).toBe(1)
    expect(parent.value('b')).toBeUndefined()
  })
})
