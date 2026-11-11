import { describe, expect, it } from 'vitest'
import { MurteActionSpec, MurteNode } from '../../src/MurteCore'
import * as DSL from '../../src/MurteBuilder'
import { Action, Button, Card, DSLExport, HStack, Image, Screen, Text, VStack } from '../../src/MurteBuilder'

describe('DSL export', () => {
  it('text with style', () => {
    expect(DSLExport.sourceForNode(Text('Hello', { style: 'title' }).node())).toBe('Text("Hello", { style: "title" })')
  })

  it('plain text', () => {
    expect(DSLExport.sourceForNode(Text('Hi').node())).toBe('Text("Hi")')
  })

  it('vertical stack with children', () => {
    const n = VStack({ spacing: 12, alignment: 'leading' }, Text('A'), Text('B', { style: 'caption' })).node()
    expect(DSLExport.sourceForNode(n)).toBe([
      'VStack({ spacing: 12, alignment: "leading" },',
      '    Text("A"),',
      '    Text("B", { style: "caption" }),',
      ')'
    ].join('\n'))
  })

  it('empty stack', () => {
    expect(DSLExport.sourceForNode(HStack().node())).toBe('HStack()')
  })

  it('button with navigate and params', () => {
    const n = Button('Go', { action: Action.navigate('detail', { params: { id: '1' } }) }).node()
    expect(DSLExport.sourceForNode(n)).toBe('Button("Go", { action: Action.navigate("detail", { params: { id: "1" } }) })')
  })

  it('button with an api chain', () => {
    const n = Button('Load', { action: Action.api('getBalance', { onSuccess: Action.navigate('balance') }) }).node()
    expect(DSLExport.sourceForNode(n)).toBe('Button("Load", { action: Action.api("getBalance", { onSuccess: Action.navigate("balance") }) })')
  })

  it('dismiss button', () => {
    expect(DSLExport.sourceForNode(Button('Close', { action: Action.dismiss }).node())).toBe('Button("Close", { action: Action.dismiss })')
  })

  it('symbol image', () => {
    expect(DSLExport.sourceForNode(Image({ systemName: 'star.fill' }).node())).toBe('Image({ systemName: "star.fill" })')
  })

  it('named image with content mode', () => {
    expect(DSLExport.sourceForNode(Image({ name: 'hero', contentMode: 'fill' }).node())).toBe('Image({ name: "hero", contentMode: "fill" })')
  })

  it('card with padding', () => {
    expect(DSLExport.sourceForNode(Card({ padding: 20 }, Text('Body')).node())).toBe([
      'Card({ padding: 20 },',
      '    Text("Body"),',
      ')'
    ].join('\n'))
  })

  it('unknown type uses the component escape hatch', () => {
    const n = new MurteNode({ type: 'ext.lottie', props: { name: 'spinner', loop: true } })
    expect(DSLExport.sourceForNode(n)).toBe('component("ext.lottie", { loop: true, name: "spinner" })')
  })

  it('component encodes nested value literals', () => {
    const n = new MurteNode({ type: 'chart', props: { series: [1, 2.5], meta: { k: 'v' }, empty: null } })
    expect(DSLExport.sourceForNode(n)).toBe('component("chart", { empty: null, meta: { k: "v" }, series: [1, 2.5] })')
  })

  it('a known type with an extra prop falls back to component', () => {
    // A text node carrying a prop the Text builder can't express.
    const n = new MurteNode({ type: 'text', props: { value: 'Hi', weight: 'bold' } })
    expect(DSLExport.sourceForNode(n)).toBe('component("text", { value: "Hi", weight: "bold" })')
  })

  it('an action on a non-button is noted and omitted', () => {
    const n = new MurteNode({ type: 'card', action: new MurteActionSpec({ type: 'refresh' }) })
    expect(DSLExport.sourceForNode(n)).toBe([
      '// note: an action on "card" isn\'t expressible in the DSL and was omitted',
      'component("card")'
    ].join('\n'))
  })

  it('screen wraps the root and indents', () => {
    const payload = new Screen('home', () =>
      VStack({ spacing: 8 },
        Text('Title', { style: 'title' }),
        Button('Next', { action: Action.navigate('second') })
      )
    ).payload
    expect(DSLExport.source(payload)).toBe([
      'new Screen("home", () =>',
      '    VStack({ spacing: 8 },',
      '        Text("Title", { style: "title" }),',
      '        Button("Next", { action: Action.navigate("second") }),',
      '    ),',
      ')'
    ].join('\n'))
  })

  it('screen includes a non-default schemaVersion', () => {
    const payload = new Screen('home', { schemaVersion: '2.0' }, () => Text('Hi')).payload
    expect(DSLExport.source(payload)).toBe([
      'new Screen("home", { schemaVersion: "2.0" }, () =>',
      '    Text("Hi"),',
      ')'
    ].join('\n'))
  })

  it('exported source rebuilds an equivalent tree', () => {
    const original = new Screen('home', () =>
      VStack({ spacing: 8, alignment: 'leading' },
        Text('Title', { style: 'title', a11yId: 't' }),
        HStack(Image({ systemName: 'star.fill' }), DSL.component('ext.rating', { stars: 4, tags: ['a', 'b'] })),
        Card({ padding: 12 }, Button('Go', { action: Action.api('load', { params: { id: '1' }, onError: Action.refresh }) }))
      )
    ).payload
    const source = DSLExport.source(original)
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const rebuilt = new Function(...Object.keys(DSL), `return ${source}`)(...Object.values(DSL)) as Screen
    expect(rebuilt.payload.equals(original)).toBe(true)
  })
})
