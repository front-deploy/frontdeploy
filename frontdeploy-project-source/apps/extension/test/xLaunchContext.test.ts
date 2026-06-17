import assert from "node:assert/strict"
import test from "node:test"

import {
  buildChatGptLogoUrl,
  buildPumpFunCreateUrl,
  createLaunchDraft,
  extractXReplyContext,
  findXReplyArticles
} from "../src/lib/xLaunchContext"

test("extracts X reply context from a minimal X-like article", () => {
  const article = createFakeArticle({
    authorText: "Sam Altman @sama Follow",
    tweetText:
      "5.5 is an autistic genius with very strange taste in naming shocking that we would make such a thing",
    href: "https://x.com/sama/status/1234567890"
  })

  const context = extractXReplyContext(article)

  assert.ok(context)
  assert.equal(context.handle, "sama")
  assert.equal(context.authorName, "Sam Altman")
  assert.equal(context.influence, "major")
  assert.equal(context.matchedInfluencer, "Sam Altman")
  assert.equal(context.url, "https://x.com/sama/status/1234567890")
  assert.ok(context.text.includes("strange taste"))
})

test("creates a pump.fun launch draft from major X reply context", () => {
  const context = extractXReplyContext(
    createFakeArticle({
      authorText: "Sam Altman @sama Follow",
      tweetText:
        "5.5 is an autistic genius with very strange taste in naming shocking that we would make such a thing",
      href: "https://x.com/sama/status/1234567890"
    })
  )

  assert.ok(context)

  const draft = createLaunchDraft(context)

  assert.equal(draft.confidence, "high")
  assert.equal(draft.tokenName, "Autistic Genius")
  assert.equal(draft.ticker, "AUTIST")
  assert.equal(draft.sourceUrl, "https://x.com/sama/status/1234567890")
  assert.ok(draft.description.includes("@sama"))
  assert.ok(draft.logoPrompt.includes("Autistic Genius"))
  assert.ok(draft.warnings.some((warning) => warning.includes("Manual deploy only")))
})

test("finds unprocessed X reply articles from a root node", () => {
  const article = createFakeArticle({
    authorText: "Elon Musk @elonmusk Follow",
    tweetText: "Launch window opens when the meme writes itself",
    href: "https://x.com/elonmusk/status/9876543210"
  })
  const root = {
    querySelectorAll: (selector: string) => (selector === "article" ? [article] : [])
  } as unknown as ParentNode

  const articles = findXReplyArticles(root)

  assert.equal(articles.length, 1)
})

test("builds prefilled ChatGPT and pump.fun launch URLs", () => {
  const draft = createLaunchDraft({
    authorName: "Sam Altman",
    handle: "sama",
    text: "5.5 is an autistic genius with very strange taste in naming",
    url: "https://x.com/sama/status/1234567890",
    influence: "major",
    matchedInfluencer: "Sam Altman"
  })
  const chatGptUrl = new URL(buildChatGptLogoUrl(draft))
  const pumpFunUrl = new URL(buildPumpFunCreateUrl(draft))

  assert.equal(chatGptUrl.origin, "https://chatgpt.com")
  assert.ok(chatGptUrl.searchParams.get("q")?.includes(draft.logoPrompt))
  assert.equal(pumpFunUrl.origin, "https://pump.fun")
  assert.equal(pumpFunUrl.pathname, "/create")
  assert.equal(pumpFunUrl.searchParams.get("name"), draft.tokenName)
  assert.equal(pumpFunUrl.searchParams.get("ticker"), draft.ticker)
  assert.equal(pumpFunUrl.searchParams.get("twitter"), draft.sourceUrl)
})

function createFakeArticle({
  authorText,
  tweetText,
  href
}: {
  authorText: string
  tweetText: string
  href: string
}): HTMLElement {
  const article = {
    textContent: `${authorText} ${tweetText} Reply Copy link`,
    hasAttribute: () => false,
    querySelector: (selector: string) => {
      if (selector === '[data-testid="User-Name"]') {
        return { textContent: authorText }
      }

      if (selector === "time") {
        return { getAttribute: () => "2026-05-20T08:50:42.000Z" }
      }

      return null
    },
    querySelectorAll: (selector: string) => {
      if (selector === '[data-testid="tweetText"]') {
        return [{ textContent: tweetText }]
      }

      if (selector === 'a[href*="/status/"]') {
        return [{ href }]
      }

      return []
    }
  }

  return article as unknown as HTMLElement
}
