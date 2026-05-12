const ADJECTIVES = [
  'amber', 'azure', 'bold', 'brave', 'bright', 'calm', 'clever', 'cosmic',
  'crisp', 'curly', 'dapper', 'eager', 'emerald', 'fierce', 'gentle', 'golden',
  'happy', 'hazel', 'humble', 'jolly', 'keen', 'kind', 'lively', 'lucky',
  'merry', 'mighty', 'misty', 'noble', 'olive', 'plucky', 'proud', 'quick',
  'quiet', 'rapid', 'royal', 'rusty', 'shiny', 'silent', 'silver', 'sleek',
  'smooth', 'snowy', 'solar', 'sparky', 'spry', 'sunny', 'swift', 'teal',
  'velvet', 'witty',
]

const NOUNS = [
  'arrow', 'badger', 'beacon', 'bison', 'breeze', 'brook', 'canyon', 'cedar',
  'cliff', 'cloud', 'comet', 'crane', 'crystal', 'dawn', 'delta', 'dolphin',
  'eagle', 'ember', 'falcon', 'fern', 'forest', 'fox', 'glacier', 'harbor',
  'heron', 'horizon', 'island', 'jaguar', 'kestrel', 'koala', 'lantern', 'leaf',
  'lynx', 'maple', 'meadow', 'meteor', 'moon', 'orchid', 'otter', 'panda',
  'pebble', 'pine', 'planet', 'prairie', 'puma', 'raven', 'reef', 'river',
  'tiger', 'willow',
]

function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) throw new Error('maxExclusive must be > 0')
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return arr[0] % maxExclusive
}

function pick<T>(list: readonly T[]): T {
  return list[randomInt(list.length)]
}

function twoDigit(): string {
  return String(randomInt(100)).padStart(2, '0')
}

export function generateKey(prefix?: string): string {
  const body = `${pick(ADJECTIVES)}-${pick(NOUNS)}-${twoDigit()}`
  return prefix ? `${prefix}-${body}` : body
}

export function generateJoinCode(): string {
  return generateKey('cls')
}

export function generateStudentKey(): string {
  return generateKey('stu')
}

export function generateAdminKey(): string {
  return generateKey('adm')
}
