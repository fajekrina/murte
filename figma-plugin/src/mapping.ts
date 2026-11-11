// Maps a Figma layer tree to a Murte SDUI payload. Kept free of the Figma plugin
// API so it can be unit-tested with plain objects; `code.ts` reads the real
// document into `FigmaInput` and calls in here.
//
// Every prop this emits is one the built-in components actually read (see
// src/MurteCore/BuiltinComponents.ts): text value/style, image
// systemName/name/contentMode, stack alignment/spacing, button title, card padding.

export type MurteValue =
  | string
  | number
  | boolean
  | null
  | MurteValue[]
  | { [key: string]: MurteValue };

export interface MurteAction {
  type: "navigate" | "api" | "dismiss" | "refresh" | "openURL";
  screen?: string;
  request?: string;
  link?: string;
  params?: Record<string, MurteValue>;
  onSuccess?: MurteAction;
  onError?: MurteAction;
}

export interface MurteNode {
  type: string;
  id?: string;
  props?: Record<string, MurteValue>;
  children?: MurteNode[];
  action?: MurteAction;
}

export interface MurtePayload {
  schemaVersion: string;
  screen: { key: string; root: MurteNode };
}

/// The subset of a Figma node the mapping needs. `code.ts` fills this in from the
/// real `SceneNode`, resolving the async bits (main component name, text style
/// name) and the paint checks up front so the mapping stays synchronous and pure.
export interface FigmaInput {
  type: string;
  name: string;
  visible?: boolean;
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL" | "GRID";
  itemSpacing?: number;
  counterAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "BASELINE";
  padding?: number;
  cornerRadius?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fillColor?: string;
  textColor?: string;
  fontStyle?: string;
  characters?: string;
  fontSize?: number;
  textStyleName?: string;
  imageScaleMode?: string;
  imageData?: string;
  mainComponentName?: string;
  children?: FigmaInput[];
}

export interface MapOptions {
  schemaVersion?: string;
}

export interface MapResult {
  payload: MurtePayload;
  warnings: string[];
}

const TYPE_KEYWORDS = new Set(["text", "image", "button", "card", "vstack", "hstack"]);
const CONTAINER_FIGMA = new Set(["FRAME", "GROUP", "COMPONENT", "INSTANCE", "COMPONENT_SET", "SECTION"]);
const GRAPHIC_FIGMA = new Set(["RECTANGLE", "ELLIPSE", "VECTOR", "LINE", "STAR", "POLYGON", "BOOLEAN_OPERATION"]);
const SYSTEM_IMAGE_VERBS = new Set(["system", "systemname", "sf"]);

/// Map a selected frame to a full payload, defaulting the schema version and
/// deriving the screen key from the frame name.
export function mapPayload(root: FigmaInput, options: MapOptions = {}): MapResult {
  const warnings: string[] = [];
  const key = sanitizeIdentifier(root.name) ?? "screen";
  const node = mapNode(root, warnings) ?? { type: "vstack" };
  return {
    payload: {
      schemaVersion: options.schemaVersion ?? "1.0",
      screen: { key, root: node },
    },
    warnings,
  };
}

/// Map one Figma node to a Murte node. Returns `null` for a hidden layer (the
/// caller drops it). The type comes from a `type:verb:target` layer-name
/// convention — taken from the layer, or an instance's main component — otherwise
/// from the Figma node type.
export function mapNode(node: FigmaInput, warnings: string[]): MurteNode | null {
  if (node.visible === false) return null;

  const convention = resolveConvention(node);
  switch (convention.type) {
    case "button":
      return mapButton(node, convention, warnings);
    case "text":
      return mapText(node);
    case "image":
      return mapImage(node);
    case "card":
      return mapContainer(node, "card", warnings);
    case "vstack":
    case "hstack":
      return mapContainer(node, convention.type, warnings);
  }

  if (node.type === "TEXT") return mapText(node);
  if (CONTAINER_FIGMA.has(node.type)) {
    if (isCardLike(node)) return mapContainer(node, "card", warnings);
    if (node.layoutMode === "HORIZONTAL") return mapContainer(node, "hstack", warnings);
    if (node.layoutMode === "VERTICAL") return mapContainer(node, "vstack", warnings);
    return mapZStack(node, warnings);   // no auto-layout → absolutely positioned overlay
  }
  if (GRAPHIC_FIGMA.has(node.type)) return mapImage(node);

  warnings.push(`Unsupported layer "${node.name}" (${node.type}) exported as an empty text placeholder.`);
  return { type: "text", props: { value: "" } };
}

function mapText(node: FigmaInput): MurteNode {
  const props: Record<string, MurteValue> = { value: node.characters ?? "" };
  const style = styleForName(node.textStyleName) ?? styleForFontSize(node.fontSize);
  if (style) props.style = style;
  if (node.textColor) props.color = node.textColor;
  const weight = weightForFontStyle(node.fontStyle);
  if (weight && weight !== "regular") props.weight = weight;
  return { type: "text", props };
}

function mapImage(node: FigmaInput): MurteNode {
  return { type: "image", props: imageProps(node) };
}

function mapContainer(node: FigmaInput, type: "vstack" | "hstack" | "card", warnings: string[]): MurteNode {
  const result: MurteNode = { type };
  const props: Record<string, MurteValue> = {};

  if (type === "card") {
    if (typeof node.padding === "number") props.padding = node.padding;
  } else {
    if (typeof node.itemSpacing === "number") props.spacing = node.itemSpacing;
    const alignment = alignmentFor(node, type);
    if (alignment) props.alignment = alignment;
  }
  if (node.fillColor) props.background = node.fillColor;
  if (typeof node.cornerRadius === "number" && node.cornerRadius > 0) props.cornerRadius = node.cornerRadius;

  if (Object.keys(props).length > 0) result.props = props;
  const children = mapChildren(node, warnings);
  if (children.length > 0) result.children = children;
  return result;
}

/// A frame without auto-layout: children are placed by absolute position, so it
/// maps to a `zstack` carrying the frame size, and each child carries its
/// `x`/`y`/`width`/`height`.
function mapZStack(node: FigmaInput, warnings: string[]): MurteNode {
  const result: MurteNode = { type: "zstack" };
  const props: Record<string, MurteValue> = {};
  if (typeof node.width === "number") props.width = Math.round(node.width);
  if (typeof node.height === "number") props.height = Math.round(node.height);
  if (node.fillColor) props.background = node.fillColor;
  if (typeof node.cornerRadius === "number" && node.cornerRadius > 0) props.cornerRadius = node.cornerRadius;
  if (Object.keys(props).length > 0) result.props = props;

  const children: MurteNode[] = [];
  for (const childInput of node.children ?? []) {
    const child = mapNode(childInput, warnings);
    if (child) children.push(withPosition(child, childInput));
  }
  if (children.length > 0) result.children = children;
  return result;
}

function withPosition(child: MurteNode, input: FigmaInput): MurteNode {
  const props: Record<string, MurteValue> = { ...(child.props ?? {}) };
  if (typeof input.x === "number") props.x = Math.round(input.x);
  if (typeof input.y === "number") props.y = Math.round(input.y);
  if (typeof input.width === "number") props.width = Math.round(input.width);
  if (typeof input.height === "number") props.height = Math.round(input.height);
  return { ...child, props };
}

function mapButton(node: FigmaInput, convention: Convention, warnings: string[]): MurteNode {
  const title = firstTextValue(node) ?? convention.target ?? node.name;
  const result: MurteNode = { type: "button", props: { title } };
  const action = buttonAction(convention, node.name, warnings);
  if (action) result.action = action;
  return result;
}

function mapChildren(node: FigmaInput, warnings: string[]): MurteNode[] {
  return (node.children ?? [])
    .map((child) => mapNode(child, warnings))
    .filter((child): child is MurteNode => child !== null);
}

function imageProps(node: FigmaInput): Record<string, MurteValue> {
  const props: Record<string, MurteValue> = {};

  // Embedded pixels (from `Embed images`) render exactly; otherwise fall back to a
  // name or the `image:systemName:` convention.
  if (node.imageData) {
    props.url = node.imageData;
    if (node.imageScaleMode === "FILL") props.contentMode = "fill";
    return props;
  }

  const parts = node.name.split(":").map((part) => part.trim());
  if (parts[0]?.toLowerCase() === "image" && parts.length > 1) {
    if (SYSTEM_IMAGE_VERBS.has(parts[1].toLowerCase())) {
      if (parts[2]) props.systemName = parts[2];
    } else {
      props.name = parts.slice(1).join(":");
    }
  }
  if (props.systemName === undefined && props.name === undefined) {
    props.name = node.name.trim();
  }
  if (node.imageScaleMode === "FILL") props.contentMode = "fill";
  return props;
}

interface Convention {
  type?: string;
  verb?: string;
  target?: string;
}

/// The convention from the layer's own name, or, for a component instance whose
/// layer was renamed, from its main component's name.
function resolveConvention(node: FigmaInput): Convention {
  const own = parseConvention(node.name);
  if (own.type) return own;
  if ((node.type === "INSTANCE" || node.type === "COMPONENT") && node.mainComponentName) {
    return parseConvention(node.mainComponentName);
  }
  return {};
}

function parseConvention(name: string): Convention {
  const parts = name.split(":").map((part) => part.trim());
  const head = parts[0]?.toLowerCase();
  if (head && TYPE_KEYWORDS.has(head)) {
    return { type: head, verb: parts[1]?.toLowerCase(), target: parts[2] };
  }
  return {};
}

function buttonAction(convention: Convention, name: string, warnings: string[]): MurteAction | undefined {
  const target = convention.target ? sanitizeIdentifier(convention.target) : null;
  switch (convention.verb) {
    case "navigate":
      if (!target) return dropAction(name, "navigate", warnings);
      return { type: "navigate", screen: target };
    case "api":
      if (!target) return dropAction(name, "api", warnings);
      return { type: "api", request: target };
    case "openurl":
      if (!target) return dropAction(name, "openURL", warnings);
      return { type: "openURL", link: target };
    case "dismiss":
      return { type: "dismiss" };
    case "refresh":
      return { type: "refresh" };
    default:
      return undefined;
  }
}

function dropAction(name: string, verb: string, warnings: string[]): undefined {
  warnings.push(`Button "${name}" has a "${verb}" action without a valid target; the action was dropped.`);
  return undefined;
}

function stackTypeFor(node: FigmaInput): "vstack" | "hstack" {
  return node.layoutMode === "HORIZONTAL" ? "hstack" : "vstack";
}

/// A frame with a background fill and rounded corners reads as a card rather than a
/// bare stack.
function isCardLike(node: FigmaInput): boolean {
  return node.fillColor !== undefined && typeof node.cornerRadius === "number" && node.cornerRadius > 0;
}

/// Map a Figma font-style name ("Semi Bold", "Bold", …) to a Murte weight keyword.
function weightForFontStyle(style?: string): string | undefined {
  if (!style) return undefined;
  const s = style.toLowerCase().replace(/\s+/g, "");
  const keywords = [
    "ultralight", "extralight", "thin", "light", "regular", "normal",
    "medium", "semibold", "demibold", "bold", "heavy", "black",
  ];
  const aliases: Record<string, string> = { extralight: "ultralight", demibold: "semibold", normal: "regular" };
  for (const keyword of keywords) {
    if (s.includes(keyword)) return aliases[keyword] ?? keyword;
  }
  return undefined;
}

/// Figma's cross-axis alignment mapped to the stack's `alignment` prop. `center` is
/// the renderer default, so it's left off.
function alignmentFor(node: FigmaInput, type: "vstack" | "hstack"): string | undefined {
  switch (node.counterAxisAlignItems) {
    case "MIN":
      return type === "vstack" ? "leading" : "top";
    case "MAX":
      return type === "vstack" ? "trailing" : "bottom";
    default:
      return undefined;
  }
}

function styleForName(name?: string): string | undefined {
  if (!name) return undefined;
  const lowered = name.toLowerCase();
  if (lowered.includes("title")) return "title";
  if (lowered.includes("headline") || lowered.includes("heading")) return "headline";
  if (lowered.includes("caption") || lowered.includes("footnote")) return "caption";
  if (lowered.includes("body")) return "body";
  return undefined;
}

function styleForFontSize(size?: number): string | undefined {
  if (typeof size !== "number") return undefined;
  if (size >= 28) return "title";
  if (size >= 20) return "headline";
  if (size >= 15) return "body";
  return "caption";
}

function firstTextValue(node: FigmaInput): string | undefined {
  if (node.type === "TEXT" && node.characters) return node.characters;
  for (const child of node.children ?? []) {
    const found = firstTextValue(child);
    if (found) return found;
  }
  return undefined;
}

/// Reduce an arbitrary layer name to a Murte identifier (`^[A-Za-z][A-Za-z0-9_]*$`),
/// or `null` when nothing usable remains.
function sanitizeIdentifier(raw: string): string | null {
  const cleaned = raw.replace(/[^A-Za-z0-9_]/g, "");
  const match = cleaned.match(/^[A-Za-z][A-Za-z0-9_]*/);
  return match ? match[0].slice(0, 128) : null;
}
