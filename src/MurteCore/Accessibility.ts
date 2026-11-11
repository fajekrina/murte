import type { MurteNode } from './MurteNode'
import type { MurteRenderContext } from './MurteRenderContext'

/// Apply Murte's shared accessibility props (`a11yLabel`, `a11yId`,
/// `a11yTraits`) from a node. Defaults are left untouched when a prop is
/// absent — never worse than the element's native semantics.
///
/// - `a11yLabel` → `aria-label` (tokens resolved)
/// - `a11yId` → `data-testid` (the UI-automation identifier)
/// - `a11yTraits` → an ARIA `role` (`button`, `header` → `heading`, `image` → `img`, `link`)
export function murteAccessibility<E extends HTMLElement>(element: E, node: MurteNode, context: MurteRenderContext): E {
  const role = accessibilityRole(node.array('a11yTraits').filter((t): t is string => typeof t === 'string'))
  if (role) {
    element.setAttribute('role', role)
    if (role === 'heading' && !element.hasAttribute('aria-level')) element.setAttribute('aria-level', '2')
    if (role === 'button' || role === 'link') element.tabIndex = element.tabIndex < 0 ? 0 : element.tabIndex
  }
  const id = node.string('a11yId')
  if (id) element.setAttribute('data-testid', id)
  const label = node.string('a11yLabel')
  if (label) element.setAttribute('aria-label', context.resolve(label))
  return element
}

function accessibilityRole(names: string[]): string | undefined {
  let role: string | undefined
  for (const name of names) {
    switch (name) {
      case 'button': role = 'button'; break
      case 'header': role = 'heading'; break
      case 'image': role = 'img'; break
      case 'link': role = 'link'; break
      default: break
    }
  }
  return role
}
