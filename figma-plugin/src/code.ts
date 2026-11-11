// Figma plugin entry point. Reads the selected frame into the plain `FigmaInput`
// shape, maps it to a Murte payload, and shows the JSON in the panel. The mapping
// itself lives in `mapping.ts` so it can be unit-tested without the Figma runtime.

import { mapPayload, type FigmaInput } from "./mapping";

figma.showUI(__html__, { width: 440, height: 560, themeColors: true });

// When on, image-like leaves are rendered to PNG/JPG bytes and inlined as a data
// URL, so exported images match Figma exactly. This makes the payload much larger
// and exceeds the structural size limits, so it's a preview aid, off by default.
let embedImages = false;

const GRAPHIC_TYPES = new Set(["RECTANGLE", "ELLIPSE", "VECTOR", "LINE", "STAR", "POLYGON", "BOOLEAN_OPERATION"]);
const CONTAINER_TYPES = new Set(["FRAME", "GROUP", "COMPONENT", "INSTANCE", "COMPONENT_SET", "SECTION"]);

function hasImageFill(node: SceneNode): boolean {
  return imageFillScaleMode(node) !== undefined;
}

/// A node whose pixels we rasterize: a graphic leaf, or an image-filled leaf.
/// Containers stay containers (their children carry the content).
function isImageLike(node: SceneNode): boolean {
  if (GRAPHIC_TYPES.has(node.type)) return true;
  if (CONTAINER_TYPES.has(node.type)) return false;
  return hasImageFill(node);
}

async function rasterize(node: SceneNode): Promise<string | undefined> {
  try {
    const jpg = hasImageFill(node);
    const bytes = await node.exportAsync({ format: jpg ? "JPG" : "PNG", constraint: { type: "SCALE", value: 2 } });
    const mime = jpg ? "image/jpeg" : "image/png";
    return `data:${mime};base64,${figma.base64Encode(bytes)}`;
  } catch {
    return undefined;
  }
}

function solidFillHex(node: SceneNode): string | undefined {
  if (!("fills" in node) || !Array.isArray(node.fills)) return undefined;
  const paint = node.fills.find((p) => p.type === "SOLID" && p.visible !== false);
  if (!paint || paint.type !== "SOLID") return undefined;
  const channel = (value: number) => Math.round(value * 255).toString(16).padStart(2, "0").toUpperCase();
  let hex = "#" + channel(paint.color.r) + channel(paint.color.g) + channel(paint.color.b);
  const opacity = paint.opacity ?? 1;
  if (opacity < 1) hex += channel(opacity);
  return hex;
}

function imageFillScaleMode(node: SceneNode): string | undefined {
  if (!("fills" in node) || !Array.isArray(node.fills)) return undefined;
  const fill = node.fills.find((paint) => paint.type === "IMAGE" && paint.visible !== false);
  return fill && fill.type === "IMAGE" ? fill.scaleMode : undefined;
}

async function toInput(node: SceneNode): Promise<FigmaInput> {
  const input: FigmaInput = { type: node.type, name: node.name, visible: node.visible };

  if ("layoutMode" in node) {
    input.layoutMode = node.layoutMode;
    if (node.layoutMode === "HORIZONTAL" || node.layoutMode === "VERTICAL") {
      input.itemSpacing = node.itemSpacing;
      input.counterAxisAlignItems = node.counterAxisAlignItems;
      input.padding = node.paddingTop;
    }
  }
  if ("cornerRadius" in node && typeof node.cornerRadius === "number") {
    input.cornerRadius = node.cornerRadius;
  }
  if ("x" in node) input.x = node.x;
  if ("y" in node) input.y = node.y;
  if ("width" in node) input.width = node.width;
  if ("height" in node) input.height = node.height;

  const fill = solidFillHex(node);
  if (fill) {
    if (node.type === "TEXT") input.textColor = fill;
    else input.fillColor = fill;
  }

  const scaleMode = imageFillScaleMode(node);
  if (scaleMode) input.imageScaleMode = scaleMode;

  if (embedImages && isImageLike(node)) {
    const data = await rasterize(node);
    if (data) input.imageData = data;
  }

  if (node.type === "TEXT") {
    input.characters = node.characters;
    if (typeof node.fontSize === "number") input.fontSize = node.fontSize;
    if (node.fontName !== figma.mixed) input.fontStyle = node.fontName.style;
    if (typeof node.textStyleId === "string" && node.textStyleId !== "") {
      const style = await figma.getStyleByIdAsync(node.textStyleId);
      if (style) input.textStyleName = style.name;
    }
  }
  if (node.type === "INSTANCE") {
    const main = await node.getMainComponentAsync();
    if (main) input.mainComponentName = main.name;
  }
  if ("children" in node) {
    input.children = await Promise.all(node.children.map(toInput));
  }
  return input;
}

async function run(): Promise<void> {
  const selection = figma.currentPage.selection;
  if (selection.length !== 1) {
    figma.ui.postMessage({ error: "Select exactly one frame to export." });
    return;
  }
  const { payload, warnings } = mapPayload(await toInput(selection[0]));
  figma.ui.postMessage({ json: JSON.stringify(payload, null, 2), warnings });
}

void run();
figma.on("selectionchange", () => void run());

figma.ui.onmessage = (message: { type?: string; value?: boolean }) => {
  if (message.type === "close") figma.closePlugin();
  if (message.type === "embed") {
    embedImages = message.value === true;
    void run();
  }
};
