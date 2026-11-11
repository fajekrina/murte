import { MurteBuild } from '../../../src/MurteCore'
import { ContentView } from './ContentView'

MurteBuild.debug = true
document.getElementById('app')!.replaceChildren(ContentView())
