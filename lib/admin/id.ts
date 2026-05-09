function randomBase36(chars: number): string {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  const value =
    ((bytes[0] & 0x3f) << 24) |
    (bytes[1] << 16) |
    (bytes[2] << 8) |
    bytes[3]
  const encoded = value.toString(36)
  if (encoded.length >= chars) return encoded.slice(-chars)
  return encoded.padStart(chars, '0')
}

function mintWithPrefix(
  prefix: string,
  chars: number,
  existing?: Set<string>,
): string {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `${prefix}${randomBase36(chars)}`
    if (!existing || !existing.has(candidate)) {
      return candidate
    }
  }
  throw new Error(`Failed to mint unique id with prefix '${prefix}' after 10 attempts`)
}

export function mintLineId(existing?: Set<string>): string {
  return mintWithPrefix('ln_', 6, existing)
}

export function mintBlankId(existing?: Set<string>): string {
  return mintWithPrefix('bk_', 6, existing)
}

export function mintTokenId(existing?: Set<string>): string {
  return mintWithPrefix('t_', 5, existing)
}
