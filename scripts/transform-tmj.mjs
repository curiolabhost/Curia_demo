#!/usr/bin/env node
// Transform Tiled .tmj exports into runtime-ready island JSONs.
// Reads the filename to categorize by size and validates slot count.
//
// Input filename:  village-map-{s|m|l|xl|xxl}-{N}.tmj
// Output path:     content/map/islands/{small|medium|large|x-large|xx-large}/{folder}-{N}.json
//
// Usage:
//   node scripts/transform-tmj.mjs              # process all .tmj in INPUT_DIR
//   node scripts/transform-tmj.mjs <file.tmj>   # process a single file

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { resolve, dirname, basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const INPUT_DIR = resolve(__dirname, '../curia-map/phase1')
const OUTPUT_ROOT = resolve(__dirname, '../content/map/islands')

// Filename token -> output folder name and the slot count this size must have.
const SIZES = {
  s: { folder: 'small', expectedSlots: 3 },
  m: { folder: 'medium', expectedSlots: 5 },
  l: { folder: 'large', expectedSlots: 9 },
  xl: { folder: 'x-large', expectedSlots: 13 },
  xxl: { folder: 'xx-large', expectedSlots: 18 },
}

const FILENAME_RE = /^village-map-(s|m|l|xl|xxl)-(\d+)\.tmj$/i

// Authoring-only reference layers — not rendered at runtime.
const DROP_LAYERS = new Set(['Villages', 'Village Decor'])

// Tilesets whose PNGs aren't shipped (no mapping in lib/map/tilesetLoader.ts).
const DROP_TILESETS = new Set(['Chicken_Houses.tsx'])

function rewriteTilesetSource(source) {
  // Tiled saves paths relative to the .tmj's last save location; the runtime
  // resolves them against the .json's location. Collapse any "../"-chain that
  // ends in (Curia-map/)?tiles/ down to a single "../tiles/".
  const m = source.match(/(?:\.\.\/)+(?:Curia-map\/)?tiles\/(.+)$/)
  return m ? `../tiles/${m[1]}` : source
}

function transform(tmj) {
  delete tmj.editorsettings

  if (Array.isArray(tmj.tilesets)) {
    tmj.tilesets = tmj.tilesets.filter(
      (ts) => !DROP_TILESETS.has(basename(ts.source)),
    )
    for (const ts of tmj.tilesets) ts.source = rewriteTilesetSource(ts.source)
  }

  if (Array.isArray(tmj.layers)) {
    tmj.layers = tmj.layers.filter((l) => !DROP_LAYERS.has(l.name))
    for (const l of tmj.layers) l.visible = true
  }

  return tmj
}

// Approximate Tiled's native formatting: 1-space indent overall, but tile-layer
// `data` arrays inlined with `width`-element rows so re-exports diff cleanly.
function stringifyTiled(obj) {
  let json = JSON.stringify(obj, null, 1)
  const width = obj.width ?? 0
  if (!width) return json
  return json.replace(/"data":\s*\[([\s\S]*?)\]/g, (_, inner) => {
    const nums = inner.split(/[\s,]+/).filter(Boolean)
    if (nums.length === 0) return '"data":[]'
    const lines = []
    for (let i = 0; i < nums.length; i += width) {
      lines.push(nums.slice(i, i + width).join(', '))
    }
    return `"data":[${lines.join(',\n            ')}]`
  })
}

// Mirror lib/map/extractSlots.ts: count objects in objectgroup layers whose
// name contains "slot" (but not "path") and that have both "door" and
// "slotIndex" properties. Visibility is ignored — the script flips all layers
// visible later, and the .tmj may have the slot layer hidden during authoring.
function countSlots(map) {
  let n = 0
  for (const layer of map.layers ?? []) {
    if (layer.type !== 'objectgroup') continue
    const ln = layer.name.toLowerCase()
    if (!ln.includes('slot') || ln.includes('path')) continue
    for (const obj of layer.objects ?? []) {
      const p = obj.properties ?? []
      const hasDoor = p.some((x) => x.name === 'door')
      const hasIdx = p.some((x) => x.name === 'slotIndex')
      if (hasDoor && hasIdx) n++
    }
  }
  return n
}

function processFile(inputPath) {
  const name = basename(inputPath)
  const match = name.match(FILENAME_RE)
  if (!match) {
    console.warn(
      `SKIP ${name}: does not match village-map-{s|m|l|xl|xxl}-{N}.tmj`,
    )
    return 'skip'
  }
  const token = match[1].toLowerCase()
  const idx = Number(match[2])
  const { folder, expectedSlots } = SIZES[token]

  const tmj = JSON.parse(readFileSync(inputPath, 'utf8'))
  const layerCountIn = tmj.layers?.length ?? 0
  const tilesetCountIn = tmj.tilesets?.length ?? 0
  const slotCount = countSlots(tmj)

  if (slotCount !== expectedSlots) {
    console.error(
      `FAIL ${name}: size "${folder}" requires ${expectedSlots} slots, .tmj has ${slotCount}.`,
    )
    console.error(
      '       Fix the Slots layer in Tiled, or rename the .tmj to its actual size.',
    )
    return 'fail'
  }

  const out = transform(tmj)
  const outDir = join(OUTPUT_ROOT, folder)
  mkdirSync(outDir, { recursive: true })
  const outName = `${folder}-${idx}.json`
  writeFileSync(join(outDir, outName), stringifyTiled(out) + '\n', 'utf8')

  console.log(`OK   ${name} -> ${folder}/${outName}`)
  console.log(
    `       slots: ${slotCount}/${expectedSlots},` +
      ` layers: ${layerCountIn}->${out.layers.length},` +
      ` tilesets: ${tilesetCountIn}->${out.tilesets.length}`,
  )
  return 'ok'
}

function main() {
  const arg = process.argv[2]
  const files = arg
    ? [resolve(arg)]
    : readdirSync(INPUT_DIR)
        .filter((f) => f.toLowerCase().endsWith('.tmj'))
        .map((f) => join(INPUT_DIR, f))

  if (files.length === 0) {
    console.log(`No .tmj files found in ${INPUT_DIR}`)
    return
  }

  const counts = { ok: 0, skip: 0, fail: 0 }
  for (const f of files) counts[processFile(f)]++

  console.log(
    `\n${counts.ok} transformed, ${counts.skip} skipped, ${counts.fail} failed`,
  )
  if (counts.fail > 0) process.exitCode = 1
}

main()
