export const stableHash = (value: string): number => {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

export const pickByHash = <T>(items: readonly T[], seed: number): T => {
  const selected = items[seed % items.length]

  if (selected === undefined) {
    throw new Error("Cannot pick from an empty list")
  }

  return selected
}
