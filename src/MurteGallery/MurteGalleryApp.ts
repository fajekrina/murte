import { MurteBuild } from '../MurteCore'
import { GalleryRootView } from './GalleryRootView'
import './gallery.css'

/// The component gallery — a runnable "Storybook" for Murte. It renders JSON
/// examples through `<murte-screen>`, shows the source, reports dispatched
/// actions, and includes a paste-JSON hot-reload harness.
MurteBuild.debug = true   // show the Null-Object marker and error details
document.getElementById('app')!.replaceChildren(GalleryRootView())
