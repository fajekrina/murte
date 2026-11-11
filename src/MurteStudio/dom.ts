/// A tiny element helper shared by the Studio and Gallery views.
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Partial<Record<string, string | number | boolean | ((event: Event) => void)>> & { style?: string } = {},
  ...children: Array<Node | string | null | undefined | false>
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue
    if (typeof value === 'function') element.addEventListener(name.replace(/^on/, '').toLowerCase(), value)
    else if (name === 'style') element.setAttribute('style', String(value))
    else if (name in element && typeof value !== 'string') (element as unknown as Record<string, unknown>)[name] = value
    else element.setAttribute(name, value === true ? '' : String(value))
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue
    element.append(child)
  }
  return element
}
