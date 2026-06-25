import fs from "fs";
import path from "path";
import os from "os";

export interface BridgeParams {
  name: string;
  symbol: string;
  metadataUri: string;
  devBuySol: number;
  slippage: number;
  priorityFee: number;
}

export async function generatePhantomBridgeHTML(params: BridgeParams): Promise<string> {
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phantom Deploy Bridge - ${params.name}</title>
  <script src="https://unpkg.com/@solana/web3.js@latest/lib/index.iife.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #121212; color: white; margin: 0; }
    .card { background: #1e1e1e; padding: 2rem; border-radius: 12px; text-align: center; max-width: 400px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
    button { background: #AB9FF2; color: black; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 20px; transition: 0.2s; }
    button:hover { background: #9686e9; }
    button:disabled { background: #555; cursor: not-allowed; }
    #status { margin-top: 15px; font-size: 14px; color: #aaa; white-space: pre-wrap; word-break: break-all; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Deploy ${params.name} (${params.symbol})</h2>
    <p>Please connect your Phantom wallet to sign the deployment transactions.</p>
    <button id="actionBtn">Connect & Deploy</button>
    <div id="status"></div>
  </div>

  <script>
    const params = ${JSON.stringify(params)};
    // Helius as primary (higher limits), standard public mainnet as fallback
    const rpcUrls = [
      "https://mainnet.helius-rpc.com/?api-key=c9afde0d-b832-446d-8f81-16b481f9676d",
      "https://api.mainnet-beta.solana.com"
    ];

    const btn = document.getElementById("actionBtn");
    const statusDiv = document.getElementById("status");

    function log(msg) {
      console.log(msg);
      statusDiv.innerHTML += msg + "<br/>";
    }

    async function getProvider() {
      if ("phantom" in window) {
        const provider = window.phantom?.solana;
        if (provider?.isPhantom) return provider;
      }
      window.open("https://phantom.app/", "_blank");
      throw new Error("Please install Phantom wallet from https://phantom.app/");
    }

    async function broadcastWithFallback(signedTxBase64Bytes) {
      let lastErr = null;
      for (const url of rpcUrls) {
        try {
          const conn = new solanaWeb3.Connection(url, "confirmed");
          const sig = await conn.sendRawTransaction(signedTxBase64Bytes, { skipPreflight: false, maxRetries: 3 });
          return { conn, sig };
        } catch (err) {
          lastErr = err;
          log("⚠️ RPC fallback from " + url.split('?')[0]);
        }
      }
      throw lastErr || new Error("All RPCs failed");
    }

    async function waitForConfirmation(connection, signature) {
      log("Waiting for confirmation...");
      for (let i = 0; i < 30; i++) {
        try {
          const status = await connection.getSignatureStatus(signature);
          if (status?.value?.confirmationStatus === "confirmed" || status?.value?.confirmationStatus === "finalized") {
            return;
          }
        } catch(e) {}
        await new Promise(r => setTimeout(r, 2000));
      }
      throw new Error("Confirmation timeout");
    }

    btn.addEventListener("click", async () => {
      try {
        btn.disabled = true;
        statusDiv.innerHTML = "";
        
        const provider = await getProvider();
        const resp = await provider.connect();
        const publicKey = resp.publicKey.toString();
        log("Connected: " + publicKey.substring(0,6) + "...");

        // 1. Build Create Tx
        log("Building CREATE transaction...");
        const mintKeypair = solanaWeb3.Keypair.generate();
        const reqBodyCreate = {
          publicKey: publicKey,
          action: "create",
          tokenMetadata: {
            name: params.name,
            symbol: params.symbol,
            uri: params.metadataUri
          },
          mint: mintKeypair.publicKey.toBase58(),
          denominatedInSol: true,
          amount: 0,
          slippage: params.slippage,
          priorityFee: params.priorityFee,
          pool: "pump"
        };

        const resCreate = await fetch("https://pumpportal.fun/api/trade-local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reqBodyCreate)
        });

        if (!resCreate.ok) throw new Error("Failed to build CREATE tx");
        
        const txBytes = new Uint8Array(await resCreate.arrayBuffer());
        const createTx = solanaWeb3.VersionedTransaction.deserialize(txBytes);
        
        // Sign with mint keypair
        createTx.sign([mintKeypair]);

        // Request Wallet Signature
        log("Please approve CREATE in Phantom...");
        const signedCreateTx = await provider.signTransaction(createTx);
        
        log("Broadcasting CREATE...");
        const { conn: activeConn, sig: createSig } = await broadcastWithFallback(signedCreateTx.serialize());
        log("CREATE Sig: " + createSig);

        // 2. Dev Buy (if > 0)
        if (params.devBuySol > 0) {
          await waitForConfirmation(activeConn, createSig);
          log("CREATE Confirmed. Building DEV BUY...");

          const reqBodyBuy = {
            publicKey: publicKey,
            action: "buy",
            mint: mintKeypair.publicKey.toBase58(),
            denominatedInSol: "true",
            amount: params.devBuySol,
            slippage: params.slippage,
            priorityFee: params.priorityFee,
            pool: "pump"
          };

          const resBuy = await fetch("https://pumpportal.fun/api/trade-local", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reqBodyBuy)
          });

          if (!resBuy.ok) throw new Error("Failed to build DEV BUY tx");

          const buyTxBytes = new Uint8Array(await resBuy.arrayBuffer());
          const buyTx = solanaWeb3.VersionedTransaction.deserialize(buyTxBytes);

          log("Please approve DEV BUY in Phantom...");
          const signedBuyTx = await provider.signTransaction(buyTx);

          log("Broadcasting DEV BUY...");
          const { sig: buySig } = await broadcastWithFallback(signedBuyTx.serialize());
          log("DEV BUY Sig: " + buySig);
        }

        log("✅ All done! You can close this page.");
      } catch (err) {
        log("❌ Error: " + err.message);
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>
  `;

  const fileName = "phantom-bridge-" + Date.now() + ".html";
  const filePath = path.join(os.tmpdir(), fileName);
  fs.writeFileSync(filePath, htmlContent, "utf-8");
  
  return filePath;
}
