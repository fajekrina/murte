import { describe, expect, it } from 'vitest'
import { MurteComponentFactory, MurteNode, MurteRenderer, childBox } from '../../src/MurteCore'

describe('ZStack absolute layout', () => {
  it('childBox uses position props', () => {
    const child = new MurteNode({ type: 'image', props: { x: 10, y: 20, width: 100, height: 50 } })
    expect(childBox(child, 375, 812)).toEqual({ x: 10, y: 20, width: 100, height: 50 })
  })

  it('childBox falls back to the frame size', () => {
    expect(childBox(new MurteNode({ type: 'image' }), 375, 812)).toEqual({ x: 0, y: 0, width: 375, height: 812 })
  })

  it('absolute zstack renders without crashing', () => {
    const node = new MurteNode({
      type: 'zstack', props: { width: 375, height: 812 }, children: [
        new MurteNode({ type: 'image', props: { x: 0, y: 0, width: 375, height: 812 } }),
        new MurteNode({ type: 'text', props: { value: 'Log in', x: 20, y: 740, width: 150, height: 44 } })
      ]
    })
    const view = new MurteRenderer(MurteComponentFactory.withBuiltins).render(node) as HTMLElement
    expect(view.style.aspectRatio).toBe('375 / 812')
    const slot = view.querySelector<HTMLElement>('[data-murte-key="1"]')!
    expect(slot.style.left).toBe('20px')
    expect(slot.style.top).toBe('740px')
  })

  it('sizeless zstack renders as an overlay', () => {
    const view = new MurteRenderer(MurteComponentFactory.withBuiltins).render(new MurteNode({
      type: 'zstack', children: [new MurteNode({ type: 'text', props: { value: 'centered' } })]
    })) as HTMLElement
    expect(view.style.display).toBe('grid')
    expect(view.textContent).toBe('centered')
  })
})
