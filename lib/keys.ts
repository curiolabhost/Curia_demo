function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) throw new Error('maxExclusive must be > 0')
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return arr[0] % maxExclusive
}

function randomDigits(count: number): string {
  let out = ''
  for (let i = 0; i < count; i++) out += String(randomInt(10))
  return out
}

function randomLetters(count: number): string {
  let out = ''
  for (let i = 0; i < count; i++) out += String.fromCharCode(65 + randomInt(26))
  return out
}

function shuffle(s: string): string {
  const chars = s.split('')
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

export function generateJoinCode(classroomName: string): string {
  const words = classroomName.split(/\s+/).filter(Boolean)
  let prefix = words
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4)
  if (prefix.length < 2) {
    prefix = classroomName
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 4)
  }
  return `${prefix}-${randomDigits(4)}`
}

export function generateStudentKey(): string {
  return shuffle(randomLetters(3) + randomDigits(3))
}

export function generateAdminKey(): string {
  return shuffle(randomLetters(3) + randomDigits(3))
}
