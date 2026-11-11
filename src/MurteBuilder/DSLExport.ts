import type { MurteActionSpec, MurteNode, MurtePayload, MurteValue } from '../MurteCore'

/// Generates MurteBuilder DSL source from a decoded node tree — the inverse of the
/// DSL. The output compiles against `murte/builder` and rebuilds an equivalent tree.
///
/// A node is written with its typed builder (`Text`, `VStack`, `Button`, …) when
/// its props fit that builder exactly; anything else falls back to the
/// open-vocabulary `component("type", { props }, …)` so no props are lost. Node
/// ids aren't emitted (the DSL doesn't set them), matching JSON export. An action
/// on a non-button can't be expressed in the DSL, so it's omitted with a note.
export const DSLExport = {
  source(payload: MurtePayload): string {
    return DSLExport.sourceForScreen(payload.screen.key, payload.screen.root, payload.schemaVersion)
  },

  sourceForScreen(key: string, root: MurteNode, schemaVersion = '1.0'): string {
    let head = `new Screen(${str(key)}`
    if (schemaVersion !== '1.0') head += `, { schemaVersion: ${str(schemaVersion)} }`
    head += ', () =>'
    return `${head}\n${node(root, 1)},\n)`
  },

  /// The source for a single node, as a standalone expression.
  sourceForNode(n: MurteNode): string {
    return node(n, 0)
  }
}

// MARK: - Node dispatch

function node(n: MurteNode, level: number): string {
  const pad = indent(level)
  switch (n.type) {
    case 'text': if (fitsText(n)) return pad + textExpr(n); break
    case 'image': if (fitsImage(n)) return pad + imageExpr(n); break
    case 'button': if (fitsButton(n)) return pad + buttonExpr(n); break
    case 'vstack': if (fitsStack(n, true)) return container(n, level, 'VStack', stackOptions(n)); break
    case 'hstack': if (fitsStack(n, false)) return container(n, level, 'HStack', stackOptions(n)); break
    case 'card': if (fitsCard(n)) return container(n, level, 'Card', cardOptions(n)); break
  }
  return componentExpr(n, level)
}

/// `Name(options?, child, …)` — children on their own lines with trailing commas.
function container(n: MurteNode, level: number, name: string, options: string | undefined): string {
  const pad = indent(level)
  if (n.children.length === 0) return `${pad}${name}(${options ?? ''})`
  const kids = n.children.map((c) => `${node(c, level + 1)},`).join('\n')
  return `${pad}${name}(${options !== undefined ? `${options},` : ''}\n${kids}\n${pad})`
}

function componentExpr(n: MurteNode, level: number): string {
  const pad = indent(level)
  const hasProps = Object.keys(n.props).length > 0
  let body: string
  if (n.children.length === 0) {
    body = `${pad}component(${str(n.type)}${hasProps ? `, ${objectLiteral(n.props)}` : ''})`
  } else {
    const kids = n.children.map((c) => `${node(c, level + 1)},`).join('\n')
    body = `${pad}component(${str(n.type)}, ${objectLiteral(n.props)},\n${kids}\n${pad})`
  }
  if (n.action) {
    return `${pad}// note: an action on ${JSON.stringify(n.type)} isn't expressible in the DSL and was omitted\n${body}`
  }
  return body
}

const keysOf = (n: MurteNode) => Object.keys(n.props)
const subset = (keys: string[], allowed: string[]) => keys.every((k) => allowed.includes(k))
const isString = (v: MurteValue | undefined) => typeof v === 'string'
const isNumber = (v: MurteValue | undefined) => typeof v === 'number'

// MARK: - text

function fitsText(n: MurteNode): boolean {
  if (n.children.length > 0 || n.action) return false
  if (!subset(keysOf(n), ['value', 'style', 'a11yLabel', 'a11yId'])) return false
  if (!isString(n.props.value)) return false
  if ('style' in n.props && !['title', 'headline', 'caption', 'body'].includes(n.props.style as string)) return false
  if ('a11yLabel' in n.props && !isString(n.props.a11yLabel)) return false
  if ('a11yId' in n.props && !isString(n.props.a11yId)) return false
  return true
}

function textExpr(n: MurteNode): string {
  const opts: string[] = []
  if (isString(n.props.style)) opts.push(`style: ${str(n.props.style as string)}`)
  if (isString(n.props.a11yLabel)) opts.push(`a11yLabel: ${str(n.props.a11yLabel as string)}`)
  if (isString(n.props.a11yId)) opts.push(`a11yId: ${str(n.props.a11yId as string)}`)
  return `Text(${str(n.props.value as string)}${opts.length ? `, { ${opts.join(', ')} }` : ''})`
}

// MARK: - vstack / hstack

function fitsStack(n: MurteNode, vertical: boolean): boolean {
  if (n.action) return false
  if (!subset(keysOf(n), ['spacing', 'alignment'])) return false
  if ('spacing' in n.props && !isNumber(n.props.spacing)) return false
  if ('alignment' in n.props) {
    const valid = vertical ? ['leading', 'center', 'trailing'] : ['top', 'center', 'bottom']
    if (!isString(n.props.alignment) || !valid.includes(n.props.alignment as string)) return false
  }
  return true
}

function stackOptions(n: MurteNode): string | undefined {
  const opts: string[] = []
  if (isNumber(n.props.spacing)) opts.push(`spacing: ${num(n.props.spacing as number)}`)
  if (isString(n.props.alignment)) opts.push(`alignment: ${str(n.props.alignment as string)}`)
  return opts.length ? `{ ${opts.join(', ')} }` : undefined
}

// MARK: - button

function fitsButton(n: MurteNode): boolean {
  if (n.children.length > 0) return false
  if (!subset(keysOf(n), ['title', 'a11yId'])) return false
  if (!isString(n.props.title)) return false
  if ('a11yId' in n.props && !isString(n.props.a11yId)) return false
  return true
}

function buttonExpr(n: MurteNode): string {
  const opts: string[] = []
  if (n.action) opts.push(`action: ${actionExpr(n.action)}`)
  if (isString(n.props.a11yId)) opts.push(`a11yId: ${str(n.props.a11yId as string)}`)
  return `Button(${str(n.props.title as string)}${opts.length ? `, { ${opts.join(', ')} }` : ''})`
}

// MARK: - image

function fitsImage(n: MurteNode): boolean {
  if (n.children.length > 0 || n.action) return false
  const keys = keysOf(n)
  if (keys.length === 1 && keys[0] === 'systemName') return isString(n.props.systemName)
  if (!subset(keys, ['name', 'contentMode']) || !isString(n.props.name)) return false
  if ('contentMode' in n.props && !isString(n.props.contentMode)) return false
  return true
}

function imageExpr(n: MurteNode): string {
  const keys = keysOf(n)
  if (keys.length === 1 && keys[0] === 'systemName') return `Image({ systemName: ${str(n.props.systemName as string)} })`
  const opts = [`name: ${str(n.props.name as string)}`]
  if (isString(n.props.contentMode)) opts.push(`contentMode: ${str(n.props.contentMode as string)}`)
  return `Image({ ${opts.join(', ')} })`
}

// MARK: - card

function fitsCard(n: MurteNode): boolean {
  if (n.action) return false
  if (!subset(keysOf(n), ['padding'])) return false
  if ('padding' in n.props && !isNumber(n.props.padding)) return false
  return true
}

function cardOptions(n: MurteNode): string | undefined {
  return isNumber(n.props.padding) ? `{ padding: ${num(n.props.padding as number)} }` : undefined
}

// MARK: - actions

function actionExpr(a: MurteActionSpec): string {
  switch (a.type) {
    case 'navigate': return chainedAction('navigate', a.screen, a)
    case 'api': return chainedAction('api', a.request, a)
    case 'dismiss': return 'Action.dismiss'
    case 'refresh': return 'Action.refresh'
    case 'openURL': return `Action.openURL(${str(a.link ?? '')})`
  }
}

function chainedAction(verb: string, target: string | undefined, a: MurteActionSpec): string {
  const opts: string[] = []
  if (a.params && Object.keys(a.params).length > 0) opts.push(`params: ${objectLiteral(a.params)}`)
  if (a.onSuccess) opts.push(`onSuccess: ${actionExpr(a.onSuccess)}`)
  if (a.onError) opts.push(`onError: ${actionExpr(a.onError)}`)
  return `Action.${verb}(${str(target ?? '')}${opts.length ? `, { ${opts.join(', ')} }` : ''})`
}

// MARK: - Literals

function objectLiteral(props: Record<string, MurteValue>): string {
  const keys = Object.keys(props).sort()
  if (keys.length === 0) return '{}'
  return `{ ${keys.map((k) => `${key(k)}: ${valueLiteral(props[k]!)}`).join(', ')} }`
}

function valueLiteral(v: MurteValue): string {
  if (v === null) return 'null'
  if (typeof v === 'string') return str(v)
  if (typeof v === 'number') return num(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (Array.isArray(v)) return v.length === 0 ? '[]' : `[${v.map(valueLiteral).join(', ')}]`
  return objectLiteral(v)
}

function key(k: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : str(k)
}

function num(v: number): string {
  if (Math.round(v) === v && Math.abs(v) < 1e15) return String(Math.trunc(v))
  return String(v)
}

function str(s: string): string {
  return JSON.stringify(s)
}

function indent(level: number): string {
  return '    '.repeat(level)
}
