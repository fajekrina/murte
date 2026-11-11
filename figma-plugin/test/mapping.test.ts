import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020";
import { mapPayload, mapNode } from "../src/mapping";

const schema = JSON.parse(
  readFileSync(new URL("../../docs/murte.schema.json", import.meta.url), "utf8"),
);
const validate = new Ajv2020({ strict: false, allErrors: true }).compile(schema);

function assertValidPayload(payload: unknown): void {
  const ok = validate(payload);
  assert.ok(ok, "payload should match murte.schema.json:\n" + JSON.stringify(validate.errors, null, 2));
}

test("a vertical auto-layout frame maps to a vstack with spacing and text children", () => {
  const { payload } = mapPayload({
    type: "FRAME",
    name: "Home",
    layoutMode: "VERTICAL",
    itemSpacing: 12,
    children: [{ type: "TEXT", name: "title", characters: "Hello", fontSize: 30 }],
  });

  assert.equal(payload.schemaVersion, "1.0");
  assert.equal(payload.screen.key, "Home");
  assert.equal(payload.screen.root.type, "vstack");
  assert.deepEqual(payload.screen.root.props, { spacing: 12 });
  assert.deepEqual(payload.screen.root.children?.[0], {
    type: "text",
    props: { value: "Hello", style: "title" },
  });
  assertValidPayload(payload);
});

test("a horizontal auto-layout frame maps to an hstack", () => {
  const { payload } = mapPayload({ type: "FRAME", name: "Row", layoutMode: "HORIZONTAL", children: [] });
  assert.equal(payload.screen.root.type, "hstack");
  assertValidPayload(payload);
});

test("font size selects the text style", () => {
  const styleOf = (fontSize: number) =>
    (mapNode({ type: "TEXT", name: "t", characters: "x", fontSize }, [])?.props?.style);
  assert.equal(styleOf(34), "title");
  assert.equal(styleOf(22), "headline");
  assert.equal(styleOf(16), "body");
  assert.equal(styleOf(11), "caption");
  assert.equal(mapNode({ type: "TEXT", name: "t", characters: "x" }, [])?.props?.style, undefined);
});

test("the button convention builds a navigate action from the layer name", () => {
  const warnings: string[] = [];
  const node = mapNode(
    {
      type: "FRAME",
      name: "button:navigate:productDetail",
      children: [{ type: "TEXT", name: "label", characters: "View details" }],
    },
    warnings,
  );
  assert.deepEqual(node, {
    type: "button",
    props: { title: "View details" },
    action: { type: "navigate", screen: "productDetail" },
  });
  assert.equal(warnings.length, 0);
});

test("the api and dismiss conventions map to their actions", () => {
  assert.deepEqual(
    mapNode({ type: "FRAME", name: "button:api:getBalance", children: [] }, [])?.action,
    { type: "api", request: "getBalance" },
  );
  assert.deepEqual(
    mapNode({ type: "FRAME", name: "button:dismiss", children: [] }, [])?.action,
    { type: "dismiss" },
  );
});

test("a button whose action has no valid target drops the action and warns", () => {
  const warnings: string[] = [];
  const node = mapNode({ type: "FRAME", name: "button:navigate", children: [] }, warnings);
  assert.equal(node?.type, "button");
  assert.equal(node?.action, undefined);
  assert.equal(warnings.length, 1);
});

test("token text is copied through verbatim", () => {
  const node = mapNode({ type: "TEXT", name: "greeting", characters: "Hello, {{user.name}}" }, []);
  assert.equal(node?.props?.value, "Hello, {{user.name}}");
});

test("a rectangle maps to an image named after the layer", () => {
  assert.deepEqual(mapNode({ type: "RECTANGLE", name: "Hero" }, []), {
    type: "image",
    props: { name: "Hero" },
  });
});

test("a hidden layer is skipped and dropped from its parent's children", () => {
  assert.equal(mapNode({ type: "TEXT", name: "x", visible: false, characters: "hi" }, []), null);

  const { payload } = mapPayload({
    type: "FRAME",
    name: "F",
    layoutMode: "VERTICAL",
    children: [
      { type: "TEXT", name: "a", characters: "A" },
      { type: "TEXT", name: "b", visible: false, characters: "B" },
    ],
  });
  assert.equal(payload.screen.root.children?.length, 1);
});

test("an unsupported layer becomes an empty text placeholder with a warning", () => {
  const warnings: string[] = [];
  const node = mapNode({ type: "SLICE", name: "weird" }, warnings);
  assert.deepEqual(node, { type: "text", props: { value: "" } });
  assert.equal(warnings.length, 1);
});

test("the screen key is sanitized to an identifier", () => {
  assert.equal(mapPayload({ type: "FRAME", name: "Home Screen!", children: [] }).payload.screen.key, "HomeScreen");
  assert.equal(mapPayload({ type: "FRAME", name: "123", children: [] }).payload.screen.key, "screen");
});

test("cross-axis alignment maps to the stack alignment prop", () => {
  const vstack = mapNode(
    { type: "FRAME", name: "col", layoutMode: "VERTICAL", counterAxisAlignItems: "MIN" },
    [],
  );
  assert.equal(vstack?.props?.alignment, "leading");

  const hstack = mapNode(
    { type: "FRAME", name: "row", layoutMode: "HORIZONTAL", counterAxisAlignItems: "MAX" },
    [],
  );
  assert.equal(hstack?.props?.alignment, "bottom");

  // Center is the renderer default and is left off.
  const centered = mapNode(
    { type: "FRAME", name: "c", layoutMode: "VERTICAL", counterAxisAlignItems: "CENTER" },
    [],
  );
  assert.equal(centered?.props?.alignment, undefined);
});

test("a frame with a fill and rounded corners maps to a card with the captured style", () => {
  const node = mapNode(
    {
      type: "FRAME",
      name: "panel",
      layoutMode: "VERTICAL",
      fillColor: "#EB6D00",
      cornerRadius: 12,
      padding: 20,
      children: [{ type: "TEXT", name: "t", characters: "Body" }],
    },
    [],
  );
  assert.equal(node?.type, "card");
  assert.deepEqual(node?.props, { padding: 20, background: "#EB6D00", cornerRadius: 12 });
  assert.equal(node?.children?.length, 1);
  assertValidPayload({ schemaVersion: "1.0", screen: { key: "s", root: node! } });
});

test("a rounded frame without a fill stays a stack", () => {
  const node = mapNode({ type: "FRAME", name: "x", layoutMode: "VERTICAL", cornerRadius: 12 }, []);
  assert.equal(node?.type, "vstack");
});

test("a filled stack carries its background color", () => {
  const node = mapNode(
    { type: "FRAME", name: "row", layoutMode: "HORIZONTAL", itemSpacing: 8, fillColor: "#112233" },
    [],
  );
  assert.equal(node?.type, "hstack");
  assert.equal(node?.props?.background, "#112233");
  assert.equal(node?.props?.spacing, 8);
});

test("a non-auto-layout frame maps to a zstack with absolutely positioned children", () => {
  const node = mapNode(
    {
      type: "FRAME",
      name: "Logged out",
      width: 375,
      height: 812,
      children: [
        { type: "RECTANGLE", name: "bg", x: 0, y: 0, width: 375, height: 812, imageScaleMode: "FILL" },
        { type: "TEXT", name: "cta", characters: "LOG IN", x: 24, y: 748, width: 150, height: 48 },
      ],
    },
    [],
  );
  assert.equal(node?.type, "zstack");
  assert.deepEqual(node?.props, { width: 375, height: 812 });

  const bg = node?.children?.[0];
  assert.equal(bg?.type, "image");
  assert.deepEqual(
    { x: bg?.props?.x, y: bg?.props?.y, width: bg?.props?.width, height: bg?.props?.height },
    { x: 0, y: 0, width: 375, height: 812 },
  );

  const cta = node?.children?.[1];
  assert.equal(cta?.type, "text");
  assert.deepEqual({ x: cta?.props?.x, y: cta?.props?.y }, { x: 24, y: 748 });
  assert.equal(cta?.props?.value, "LOG IN");
});

test("a group maps to a zstack", () => {
  const node = mapNode(
    { type: "GROUP", name: "logo", width: 120, height: 40, children: [{ type: "VECTOR", name: "mark", x: 0, y: 0, width: 40, height: 40 }] },
    [],
  );
  assert.equal(node?.type, "zstack");
  assert.equal(node?.children?.[0]?.type, "image");
});

test("positions round to whole numbers", () => {
  const node = mapNode(
    { type: "FRAME", name: "f", width: 100.6, height: 50.2, children: [{ type: "TEXT", name: "t", characters: "x", x: 10.4, y: 20.7, width: 30.9, height: 12.1 }] },
    [],
  );
  assert.deepEqual(node?.props, { width: 101, height: 50 });
  const child = node?.children?.[0];
  assert.deepEqual({ x: child?.props?.x, y: child?.props?.y }, { x: 10, y: 21 });
});

test("text carries color and weight", () => {
  const node = mapNode(
    { type: "TEXT", name: "t", characters: "Rp150.000", textColor: "#FFFFFF", fontStyle: "Semi Bold" },
    [],
  );
  assert.equal(node?.props?.color, "#FFFFFF");
  assert.equal(node?.props?.weight, "semibold");
});

test("a regular font weight is omitted", () => {
  const node = mapNode({ type: "TEXT", name: "t", characters: "Body", fontStyle: "Regular" }, []);
  assert.equal(node?.props?.weight, undefined);
});

test("an image fill set to fill maps to contentMode fill", () => {
  const node = mapNode({ type: "RECTANGLE", name: "hero", imageScaleMode: "FILL" }, []);
  assert.deepEqual(node, { type: "image", props: { name: "hero", contentMode: "fill" } });
});

test("the image:systemName convention maps to an SF Symbol", () => {
  const node = mapNode({ type: "RECTANGLE", name: "image:systemName:star.fill" }, []);
  assert.deepEqual(node, { type: "image", props: { systemName: "star.fill" } });
});

test("embedded image data becomes the image url, overriding the name", () => {
  const dataURI = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
  const node = mapNode(
    { type: "RECTANGLE", name: "background", imageScaleMode: "FILL", imageData: dataURI },
    [],
  );
  assert.deepEqual(node, { type: "image", props: { url: dataURI, contentMode: "fill" } });
});

test("an instance's type is inferred from its main component name", () => {
  const node = mapNode(
    {
      type: "INSTANCE",
      name: "Primary CTA",
      mainComponentName: "button:navigate:checkout",
      children: [{ type: "TEXT", name: "label", characters: "Continue" }],
    },
    [],
  );
  assert.deepEqual(node, {
    type: "button",
    props: { title: "Continue" },
    action: { type: "navigate", screen: "checkout" },
  });
});

test("a named text style overrides the font-size heuristic", () => {
  const node = mapNode(
    { type: "TEXT", name: "h", characters: "Hi", fontSize: 12, textStyleName: "Heading / Large" },
    [],
  );
  assert.equal(node?.props?.style, "headline");
});

test("a full nested dashboard frame validates against the schema", () => {
  const { payload, warnings } = mapPayload({
    type: "FRAME",
    name: "Dashboard",
    layoutMode: "VERTICAL",
    itemSpacing: 16,
    children: [
      { type: "TEXT", name: "heading", characters: "Hello, {{user.name}}", fontSize: 34 },
      {
        type: "FRAME",
        name: "hstack",
        layoutMode: "HORIZONTAL",
        itemSpacing: 8,
        children: [
          { type: "RECTANGLE", name: "avatar" },
          { type: "TEXT", name: "sub", characters: "Welcome back", fontSize: 17 },
        ],
      },
      {
        type: "FRAME",
        name: "button:navigate:settings",
        children: [{ type: "TEXT", name: "cta", characters: "Open settings" }],
      },
    ],
  });

  assert.equal(warnings.length, 0);
  assertValidPayload(payload);
});
