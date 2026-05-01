# Design spec — "what % does"

## Overview

A visual explainer showing how the `%` (remainder) operator works. Three elements arranged horizontally: the **input side** (number and divisor stacked vertically), an **arrow** pointing right, and the **output side** (the remainder). A code explanation sits to the right.

---

## Layout

```
[ input column ]  →  [ remainder ]   [ code explanation ]
```

Three columns, horizontally centered, vertically aligned to the middle. The input column is taller than the others — it stacks two items with a `%` symbol between them.

---

## Input column (left)

Two boxes stacked vertically with the `%` operator between them.

### Top box — the number

- **Label pill** above the box, text: `number`
- Pill style: blue fill `#E6F1FB`, blue border `#378ADD`, blue text `#0C447C`, fully rounded (`border-radius: 99px`), monospace font
- **Arrow** pointing down between pill and box (thin gray, `#888780`)
- **Value box**: white background, blue border `#378ADD` (2px), rounded corners (10px), 80×80px, value `10` in large monospace font (`#0C447C`, 32px)
- **Caption** below box: `the value` in small gray text (12px, `#888780`)

### Separator

- The `%` symbol centered between the two boxes, coral/orange color `#D85A30`, 22px monospace, font-weight 500

### Bottom box — the divisor

- **Label pill** above the box, text: `divisor`
- Pill style: gray fill `#F1EFE8`, gray border `#888780`, dark gray text `#444441`, fully rounded
- **Arrow** pointing down (same as above)
- **Value box**: white background, gray border `#888780` (2px), rounded corners (10px), 80×80px, value `3` in large monospace font (`#444441`, 32px)
- **Caption** below box: `divide by` in small gray text

---

## Arrow (center)

- A simple `→` character, 28px, light gray `#B4B2A9`, font-weight 300
- Centered vertically between the two columns

---

## Output — the remainder (center-right)

- **Label pill** above the box, text: `remainder`
- Pill style: coral fill `#FAECE7`, coral border `#D85A30`, dark coral text `#712B13`, fully rounded
- **Arrow** pointing down (thin coral, `#D85A30`)
- **Value box**: coral fill `#FAECE7`, coral border `#D85A30` (2px), rounded corners (10px), 80×80px, value `1` in large monospace font (`#712B13`, 32px)
- **Caption** below box: `what's left over` in small gray text

---

## Code explanation (far right)

No box or border — plain text, left-aligned.

- **First line**: `10 % 3` in monospace, 17px, dark text. The `%` is coral `#D85A30`.
- **Second line**: Plain text description, 13px, gray `#5F5E5A`, line-height 1.6:
  > `10 ÷ 3 = 3 groups, with` **`1 left over`** `.`
  > `The % operator gives you just that leftover. Not the answer — the remainder.`
- "1 left over" is bold and coral `#712B13`.

---

## Container

- Background: light blue-gray `#F0F2F8`
- Border radius: 16px
- Padding: `2rem` all sides
- No border, no shadow

---

## Typography

| Element | Font | Size | Weight | Color |
|---|---|---|---|---|
| Pill labels | Monospace | 15px | 500 | ramp-specific |
| Value numbers | Monospace | 32px | 500 | ramp-specific |
| Captions | Sans-serif | 12px | 400 | `#888780` |
| Code line | Monospace | 17px | 500 | `#2C2C2A` |
| Description | Sans-serif | 13px | 400 | `#5F5E5A` |

---

## Color logic

| Part | Fill | Border | Text |
|---|---|---|---|
| Number (input) | `#E6F1FB` | `#378ADD` | `#0C447C` |
| Divisor (input) | `#F1EFE8` | `#888780` | `#444441` |
| Remainder (output) | `#FAECE7` | `#D85A30` | `#712B13` |
| `%` operator symbol | — | — | `#D85A30` |
| Arrow between columns | — | — | `#B4B2A9` |

---

## Spacing

- Gap between input column and center arrow: `2rem`
- Gap between arrow and remainder: `2rem`
- Gap between remainder and code explanation: `2rem`
- Gap between top box and `%` symbol: `14px`
- Gap between `%` symbol and bottom box: `14px`
- Pill to arrow to box: `6px` each
