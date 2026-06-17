import { getConfig } from "../config.js"

export const fetchJson = async <T>(
  input: string,
  init: RequestInit = {}
): Promise<T | null> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), getConfig().providerTimeoutMs)

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal
    })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as T
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
