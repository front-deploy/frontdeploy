export function hasExtensionContext(): boolean {
  return typeof chrome !== "undefined" && !!chrome.runtime && !!chrome.runtime.id;
}

export function isContextInvalidated(err: any): boolean {
  return err instanceof Error && err.message.includes("Extension context invalidated");
}
