/**
 * Migrate final-project lesson blocks from positional parallel-array schema
 * to a stable-ID schema (lines[] + blanks[] with <<blankId>> tokens).
 *
 * Usage: node codelab/scripts/migrate-final-project-schema.js
 */

const fs = require('node:fs')
const path = require('node:path')

const TARGET = path.join(__dirname, '..', 'content', 'lessons', 's6-l1.json')
const BLANK_TOKEN = '___BLANK___'

function countBlanksInLine(line) {
  let n = 0
  let i = 0
  while (true) {
    const found = line.indexOf(BLANK_TOKEN, i)
    if (found === -1) return n
    n += 1
    i = found + BLANK_TOKEN.length
  }
}

function rewriteLineWithBlankIds(line, blankIds) {
  let out = ''
  let i = 0
  let cursor = 0
  while (i < line.length) {
    const found = line.indexOf(BLANK_TOKEN, i)
    if (found === -1) {
      out += line.slice(i)
      break
    }
    out += line.slice(i, found)
    out += `<<${blankIds[cursor]}>>`
    cursor += 1
    i = found + BLANK_TOKEN.length
  }
  return out
}

function migrateBlock(block, blockIdx) {
  const codeWithBlanks = block.codeWithBlanks ?? []
  const correctOrder = block.correctOrder ?? []
  const blankInputMode = block.blankInputMode ?? []
  const blankInstructions = block.blankInstructions ?? []
  const blankExplanations = block.blankExplanations ?? []
  const lineExplanations = block.lineExplanations ?? []
  const expectedEffects = block.expectedEffects ?? []

  // Mint blank IDs in flat order, walking lines top-to-bottom, left-to-right.
  let flatCounter = 0
  const linesOut = []
  const blanksOut = []
  const lineIdByIndex = []
  const blankIdByFlatIndex = []

  for (let li = 0; li < codeWithBlanks.length; li += 1) {
    const lineId = `ln_${blockIdx}_${li}`
    lineIdByIndex.push(lineId)
    const original = codeWithBlanks[li]
    const blanksOnLine = countBlanksInLine(original)
    const idsForLine = []
    for (let k = 0; k < blanksOnLine; k += 1) {
      const bid = `bk_${blockIdx}_${flatCounter}`
      idsForLine.push(bid)
      blankIdByFlatIndex.push(bid)

      const blank = {
        id: bid,
        mode: blankInputMode[flatCounter] ?? 'wordbank',
        answer: correctOrder[flatCounter] ?? '',
      }
      if (blankInstructions[flatCounter] !== undefined) {
        blank.instruction = blankInstructions[flatCounter]
      }
      if (blankExplanations[flatCounter] !== undefined) {
        blank.explanation = blankExplanations[flatCounter]
      }
      blanksOut.push(blank)
      flatCounter += 1
    }
    const text = rewriteLineWithBlankIds(original, idsForLine)
    linesOut.push({ id: lineId, text })
  }

  // Apply lineExplanations entries to the right target object.
  // Detect ambiguity: blank-level lineExplanations + legacy blankInstructions/Explanations
  // for the SAME flat index. If both present, prefer lineExplanations and warn.
  let warnings = 0
  for (const entry of lineExplanations) {
    const lineIdx = entry.lineIndex
    const blankIdx = entry.blankIndex
    if (blankIdx !== null && blankIdx !== undefined) {
      if (blankIdx < 0 || blankIdx >= blanksOut.length) {
        console.warn(
          `[block ${blockIdx}] lineExplanations entry has out-of-range blankIndex=${blankIdx}; skipping`,
        )
        continue
      }
      const target = blanksOut[blankIdx]
      const conflict =
        (blankInstructions[blankIdx] !== undefined &&
          entry.instruction !== undefined &&
          blankInstructions[blankIdx] !== entry.instruction) ||
        (blankExplanations[blankIdx] !== undefined &&
          entry.explanation !== undefined &&
          blankExplanations[blankIdx] !== entry.explanation)
      if (conflict) {
        console.warn(
          `[block ${blockIdx}] CONFLICT: blank ${blankIdx} has both lineExplanations and blankInstructions/blankExplanations with different values. Preferring lineExplanations.`,
        )
        warnings += 1
      }
      if (entry.instruction !== undefined) target.instruction = entry.instruction
      if (entry.explanation !== undefined) target.explanation = entry.explanation
      if (entry.lessonRefs !== undefined) target.lessonRefs = entry.lessonRefs
    } else {
      if (lineIdx < 0 || lineIdx >= linesOut.length) {
        console.warn(
          `[block ${blockIdx}] lineExplanations entry has out-of-range lineIndex=${lineIdx}; skipping`,
        )
        continue
      }
      const target = linesOut[lineIdx]
      if (entry.explanation !== undefined) target.explanation = entry.explanation
      if (entry.lessonRefs !== undefined) target.lessonRefs = entry.lessonRefs
    }
  }

  // Attach expectedEffects to freeline blanks in flat order.
  let freelineCounter = 0
  let effectsAttached = 0
  for (const blank of blanksOut) {
    if (blank.mode === 'freeline') {
      const eff = expectedEffects[freelineCounter]
      blank.expectedEffect = eff !== undefined ? eff : null
      if (eff !== undefined) effectsAttached += 1
      freelineCounter += 1
    }
  }
  if (freelineCounter !== expectedEffects.length) {
    console.warn(
      `[block ${blockIdx}] expectedEffects length (${expectedEffects.length}) differs from freeline blank count (${freelineCounter})`,
    )
  }

  // Write new fields onto block; remove old ones.
  block.lines = linesOut
  block.blanks = blanksOut
  delete block.codeWithBlanks
  delete block.correctOrder
  delete block.blankInputMode
  delete block.blankInstructions
  delete block.blankExplanations
  delete block.lineExplanations
  delete block.expectedEffects

  return {
    lines: linesOut.length,
    blanks: blanksOut.length,
    effectsAttached,
    warnings,
  }
}

function main() {
  const raw = fs.readFileSync(TARGET, 'utf8')
  const lesson = JSON.parse(raw)

  if (!Array.isArray(lesson.exercises)) {
    console.error('lesson.exercises is not an array; aborting')
    process.exit(1)
  }

  let blocksMigrated = 0
  let totalLines = 0
  let totalBlanks = 0
  let totalEffects = 0
  let totalWarnings = 0
  let alreadyMigrated = 0

  lesson.exercises.forEach((block, idx) => {
    if (block.format !== 'final-project') return
    if (Array.isArray(block.lines) && Array.isArray(block.blanks)) {
      alreadyMigrated += 1
      return
    }
    const stats = migrateBlock(block, idx)
    blocksMigrated += 1
    totalLines += stats.lines
    totalBlanks += stats.blanks
    totalEffects += stats.effectsAttached
    totalWarnings += stats.warnings
  })

  fs.writeFileSync(TARGET, JSON.stringify(lesson, null, 2) + '\n', 'utf8')

  console.log('--- Final-project schema migration ---')
  console.log(`File:              ${path.relative(process.cwd(), TARGET)}`)
  console.log(`Blocks migrated:   ${blocksMigrated}`)
  console.log(`Already migrated:  ${alreadyMigrated}`)
  console.log(`Total lines:       ${totalLines}`)
  console.log(`Total blanks:      ${totalBlanks}`)
  console.log(`Effects attached:  ${totalEffects}`)
  console.log(`Warnings:          ${totalWarnings}`)
}

main()
