# Curia Exercise Review Prompt

You are reviewing a generated `exercises[]` array for a Curia lesson JSON. Your job is to find every error, explain it precisely, and output a corrected version of the full exercises array.

Work through every exercise in order. For each one, check every item in the checklist below. Do not skip items. Do not assume something is fine without checking it.

---

## Review checklist

Run every item below on every exercise.

---

### 1. Task text

Read every string in `tasks[]`. Ask: does this describe a **goal** or a **mechanism**?

Flag and rewrite if it contains any of:
- "both blanks are missing" / "the blank is missing" / "every part is blank"
- "drop the tokens" / "fill in the blanks" / "type the missing parts"
- "no hints this time" / "this time the editor is empty"
- "all four parts" / "complete the declaration" (without specifying what to declare)
- Any reference to how many blanks exist
- Any reference to whether hints are present or absent
- Any meta-description of the exercise format

The rewritten task must state a specific goal: what variable to declare, what value to set, what operation to perform, what the code should do when it runs. If the task is vague, make it concrete and goal-oriented.

---

### 2. Token bank order (fill-blank exercises)

Read `tokenBank[]` labels in order. Then read `correctOrder[]`. 

Flag if the token bank labels appear in the same left-to-right sequence as the correct answer. Example: `correctOrder: ["let", "lives", "=", "3"]` and `tokenBank` lists `let`, `lives`, `=`, `3` in that order — this is a flag.

Fix: shuffle the token bank so the answer cannot be read sequentially. Add or confirm 1-2 plausible decoys are present.

---

### 3. hintBank order and content (fill-blank-typed exercises)

Read `hintBank[]` labels in order. Then identify what the blanks require.

Flag if:
- The hintBank labels, read in order, spell out the answer
- Any hintBank token is already written as literal text in `codeWithBlanks[]` (not a blank) — e.g. if `=` appears in the code but also in the hintBank
- There are no decoys (every token is a correct answer token)
- The hintBank appears on a late exercise where the concept has already been practiced 3+ times without hints

Fix: shuffle, remove non-blank tokens, add plausible decoys.

---

### 4. Multiple-choice visual asymmetry

Check all options in `options[]`.

Flag if: the correct option has a `code` field and one or more incorrect options do not. This creates visual asymmetry that reveals the answer before the student reads anything.

Also flag if: labels contain evaluative words like "Correct", "Missing let", "Wrong order", "Invalid" — these tell the student which is right.

Fix: either give all options a `code` field, or give none the `code` field. Replace evaluative labels with neutral ones ("A", "B", "C", "D") or remove labels entirely when code is the answer.

---

### 5. Expected value arithmetic

For every `checks[]` entry with a numeric `expected` value, trace the code in `starterCode`, `codeWithBlanks`, or `buggyCode` step by step and verify the number is correct.

Show your work: write out each step. Flag any mismatch.

---

### 6. blankPlaceholders content

Read `blankPlaceholders[]`. 

Flag if any placeholder is the literal answer — e.g. `"="` as a placeholder for a blank that requires `=`. A placeholder is hint text shown inside the blank, so putting the answer there makes it trivially easy.

Fix: replace with a descriptive word. `"="` → `"operator"`. `"let"` → `"keyword"`. `"5"` → `"value"`.

---

### 7. Scaffold position

Look at the exercise's format and where it sits in the sequence relative to other exercises on the same concept.

Flag if:
- A `fill-blank-typed` exercise appears before any `fill-blank` (word bank) exercise on the same concept
- A code editor exercise appears before the student has typed the concept at least once
- A full-line all-blanks exercise appears as the first exercise on a concept (no warm-up)
- A hintBank-less typed exercise appears before a hintBank-assisted typed exercise on the same concept

---

### 8. Check types

Verify every `type` value in `checks[]` is one of: `variable`, `console`, `noError`, `declaration`, `assignment`, `domAssignment`, `variableValue`.

Flag any unknown type. Flag `type: "predict"` on the exercise itself — it doesn't exist, must be `"practice"`.

---

### 9. Challenges

For each challenge:
- Verify the bug is something a beginner would actually write (not an obscure edge case)
- Verify the fix requires only knowledge from this lesson or prior lessons
- Trace the corrected code and verify `expected` matches
- Verify `buggyCode` and `starterCode` are identical

---

## Output format

For each issue found, write:

**Exercise N — [title]**
Issue: [what is wrong and why]
Fix: [exact corrected JSON for the affected field only]

After listing all issues, output the complete corrected `exercises[]` array as valid JSON.

If an exercise has no issues, write: **Exercise N — [title]: OK**

Do not skip exercises. Do not output the corrected array until you have checked every exercise.