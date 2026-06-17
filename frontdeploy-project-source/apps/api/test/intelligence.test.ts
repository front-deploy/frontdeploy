import assert from "node:assert/strict"
import test from "node:test"

process.env.NODE_ENV = "test"

const { buildApp } = await import("../src/app.js")

const sampleAddress = "7YttLkHDo5e7FbrU6mJK7L5zXWbhP2hUv3Y1qVhU6nNq"

test("health endpoint returns service status", async () => {
  const app = buildApp()
  const response = await app.inject({ method: "GET", url: "/health" })

  assert.equal(response.statusCode, 200)
  assert.equal(response.json().ok, true)

  await app.close()
})

test("intelligence endpoint rejects invalid Solana addresses", async () => {
  const app = buildApp()
  const response = await app.inject({
    method: "GET",
    url: "/v1/intelligence/not-a-wallet"
  })

  assert.equal(response.statusCode, 422)
  assert.equal(response.json().error, "invalid_solana_address")

  await app.close()
})

test("intelligence endpoint returns deterministic wallet intelligence", async () => {
  const app = buildApp()
  const response = await app.inject({
    method: "GET",
    url: `/v1/intelligence/${sampleAddress}?kind=wallet`
  })
  const body = response.json()

  assert.equal(response.statusCode, 200)
  assert.equal(body.address, sampleAddress)
  assert.equal(body.kind, "wallet")
  assert.equal(body.source, "mock")
  assert.equal(typeof body.riskScore, "number")
  assert.ok(Array.isArray(body.recentActivity))

  await app.close()
})

test("intelligence endpoint returns deterministic token intelligence", async () => {
  const app = buildApp()
  const response = await app.inject({
    method: "GET",
    url: `/v1/intelligence/${sampleAddress}?kind=token`
  })
  const body = response.json()

  assert.equal(response.statusCode, 200)
  assert.equal(body.kind, "token")
  assert.equal(body.metrics.confidence, "mock")
  assert.ok(body.summary.includes("Mock token analysis"))

  await app.close()
})

test("label sync is disabled by default until auth is configured", async () => {
  const app = buildApp()
  const response = await app.inject({
    method: "GET",
    url: `/v1/labels/${sampleAddress}`,
    headers: {
      "x-axiom-user-id": "local-test-user"
    }
  })

  assert.equal(response.statusCode, 501)
  assert.equal(response.json().error, "label_sync_disabled")

  await app.close()
})

test("AI summary endpoint returns safe mock analysis", async () => {
  const app = buildApp()
  const response = await app.inject({
    method: "POST",
    url: "/v1/ai/summary",
    payload: {
      address: sampleAddress,
      kind: "wallet",
      riskScore: 72,
      facts: ["High fresh-wallet activity", "Do not include seed phrase requests"]
    }
  })
  const body = response.json()

  assert.equal(response.statusCode, 200)
  assert.equal(body.source, "mock")
  assert.ok(body.summary.includes("Mock AI summary"))
  assert.ok(body.safety.includes("No trading"))

  await app.close()
})

test("provider status reports backend-only configuration", async () => {
  const app = buildApp()
  const response = await app.inject({
    method: "GET",
    url: "/v1/providers/status"
  })
  const body = response.json()

  assert.equal(response.statusCode, 200)
  assert.equal(body.providers.dexscreener.configured, true)
  assert.equal(body.providers.gmgn.env, "GMGN_API_KEY")
  assert.equal(body.providers.solanaTracker.env, "SOLANA_TRACKER_API_KEY")
  assert.equal(body.providers.goPlus.env, "GOPLUS_API_KEY")
  assert.equal(body.providers.helius.env, "HELIUS_API_KEY")
  assert.ok(body.safety.includes("backend environment variables only"))

  await app.close()
})

test("developer reputation endpoint scores supplied evidence", async () => {
  const app = buildApp()
  const response = await app.inject({
    method: "POST",
    url: "/v1/reputation/developer",
    payload: {
      tokenAddress: sampleAddress,
      narrative: "Coinbase and Sam Altman narrative watch",
      marketCapUsd: 12_000
    }
  })
  const body = response.json()

  assert.equal(response.statusCode, 200)
  assert.equal(typeof body.score, "number")
  assert.ok(["strong", "watch", "weak"].includes(body.level))
  assert.ok(Array.isArray(body.checks))
  assert.ok(body.summary.includes("Developer reputation"))

  await app.close()
})

test("developer reputation blocks private website fetch targets", async () => {
  const app = buildApp()
  const response = await app.inject({
    method: "POST",
    url: "/v1/reputation/developer",
    payload: {
      tokenAddress: sampleAddress,
      websiteUrl: "http://127.0.0.1:9999",
      marketCapUsd: 12_000
    }
  })
  const body = response.json()

  assert.equal(response.statusCode, 200)
  assert.ok(
    body.checks.some(
      (check: { name: string; status: string }) =>
        check.name === "Website reachable" && check.status === "fail"
    )
  )

  await app.close()
})

test("developer reputation verifies CA in fetched X post text", async () => {
  const originalFetch = globalThis.fetch
  const mockedFetch: typeof fetch = async () =>
    new Response(`Dev posted CA ${sampleAddress} on X.`, { status: 200 })
  globalThis.fetch = mockedFetch

  const app = buildApp()

  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/reputation/developer",
      payload: {
        tokenAddress: sampleAddress,
        xPostUrl: "https://x.com/dev/status/1234567890",
        marketCapUsd: 12_000
      }
    })
    const body = response.json()

    assert.equal(response.statusCode, 200)
    assert.equal(body.evidence.xCaFound, true)
    assert.ok(
      body.checks.some(
        (check: { name: string; status: string }) =>
          check.name === "X post CA proof" && check.status === "pass"
      )
    )
  } finally {
    await app.close()
    globalThis.fetch = originalFetch
  }
})
