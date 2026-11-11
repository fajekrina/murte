// MurteCore — the engine: registries, renderer, validation, signing, caching.
// Zero third-party dependencies; the web platform (DOM, WebCrypto, IndexedDB)
// plays the role SwiftUI/CryptoKit/Foundation play for Murti.

export { MurteValue, type MurteProps } from './MurteValue'
export { MurteError, type MurteErrorKind } from './MurteError'
export {
  toBytes, utf8, utf8String, bytesEqual, concatBytes, base64Encode, base64Decode, hex, sortedJSONStringify,
  type BytesLike, type MurteData
} from './MurteData'
export { MurteNode, type MurteNodeInit } from './MurteNode'
export { MurteActionSpec, ActionType, type MurteActionSpecInit } from './MurteActionSpec'
export { MurtePayload, MurteScreenSpec, MurteEnvelope, parseJSON } from './MurtePayload'
export { MurteBounds } from './MurteBounds'
export { MurteSchemaValidator } from './MurteSchemaValidator'
export { TokenResolver } from './TokenResolver'
export { DataContext } from './DataContext'

export { MurteNavigator, type MurteNavigatorInit } from './MurteNavigator'
export { NamedRequest, NoNetworkClient, type MurteNetworkClient } from './MurteNetworkClient'
export type { MurteCommand } from './MurteCommand'
export { NavigateCommand, APICommand, DismissCommand, RefreshCommand, OpenURLCommand } from './Commands'
export { MurteActionDispatcher } from './MurteActionDispatcher'

export { MurteBuild } from './MurteBuild'
export { typeName, type MurteComponent, type MurteComponentType } from './MurteComponent'
export { MurteComponentFactory, type MurteViewBuilder } from './MurteComponentFactory'
export { MurteRenderContext } from './MurteRenderContext'
export { MurteRenderer } from './MurteRenderer'
export { MurteUnknownView } from './MurteUnknownView'
export { murteParseHexColor, murteColor, murteFontWeight, murteStyle, murteForegroundColor, type MurteRGBA } from './MurteStyle'
export { murteAccessibility } from './Accessibility'
export { MurteSymbols } from './MurteSymbols'
export {
  TextComponent, ImageComponent, VStackComponent, HStackComponent, ZStackComponent, ButtonComponent, CardComponent,
  murteChildren, childBox, type ImageComponentOptions
} from './BuiltinComponents'

export { ScreenSource, LoadState } from './ScreenSource'
export { MurteScreenFactory, type ScreenProvider } from './MurteScreenFactory'
export { Ed25519Verifier, PayloadSecurity, type MurteSignatureVerifier } from './MurteSignatureVerifier'
export { PassthroughCipher, type MurteCacheCipher } from './MurteCacheCipher'
export { AESGCMCipher } from './AESGCMCipher'
export { MemoryCacheStore, type MurteCacheStore } from './MurteCacheStore'
export { IndexedDBCacheStore } from './IndexedDBCacheStore'
export { cacheKey } from './CacheKey'
export { Manifest } from './Manifest'
export { MurteCacheCoordinator } from './MurteCacheCoordinator'
export { MurteCache } from './MurteCache'
export { MurteEngine, type MurteEngineInit } from './MurteEngine'
export { MurteScreen, MurteErrorView, murteEngine, environmentEngine } from './MurteScreen'
