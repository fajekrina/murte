import { resolve } from 'node:path'
import { Action, Button, Screen, Text, VStack } from '../MurteBuilder'
import { ScreenBundle } from './ScreenBundle'

// Author your screens here. Loop over data to emit lists — that is the templating.
const screens: Screen[] = [
  new Screen('home', () =>
    VStack({ spacing: 12, alignment: 'leading' },
      Text('Welcome, {{user.name}}', { style: 'title' }),
      Button('Get started', { action: Action.navigate('onboarding') })
    )
  )
]

const output = resolve(process.argv[2] ?? 'Generated')
await new ScreenBundle(screens).write(output)
console.log(`Wrote ${screens.length} screen(s) to ${output}`)
