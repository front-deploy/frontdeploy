chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "AXIOM_INTEL_OPEN_SIDE_PANEL") {
    return
  }

  const tabId = sender.tab?.id
  if (typeof tabId !== "number") {
    return
  }

  void chrome.sidePanel.open({ tabId })
})
