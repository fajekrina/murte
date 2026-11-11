import { MurteValue } from './MurteValue'

/// Resolves `{{token}}` interpolation in a template string.
///
/// Pure: it takes a `lookup` function rather than the data store directly, so it
/// is trivially testable. Missing tokens resolve to an empty string (fail-soft,
/// never a crash).
export const TokenResolver = {
  resolve(template: string, lookup: (key: string) => MurteValue | undefined): string {
    if (!template.includes('{{')) return template

    let result = ''
    let rest = template

    for (;;) {
      const open = rest.indexOf('{{')
      if (open < 0) break
      result += rest.slice(0, open)
      const afterOpen = rest.slice(open + 2)
      const close = afterOpen.indexOf('}}')
      if (close < 0) {
        // Unterminated token: emit the remainder literally.
        return result + rest.slice(open)
      }
      const key = afterOpen.slice(0, close).replace(/^[\t\p{Zs}]+|[\t\p{Zs}]+$/gu, '')
      result += MurteValue.displayString(lookup(key))
      rest = afterOpen.slice(close + 2)
    }

    return result + rest
  }
}
