"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { VersionedTransaction, Keypair, Connection } from "@solana/web3.js";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

function LaunchContent() {
  const searchParams = useSearchParams();
  
  const [params, setParams] = useState({
    name: "",
    symbol: "",
    metadataUri: "",
    devBuySol: 0,
    slippage: 5,
    priorityFee: 0.0005
  });

  const [logs, setLogs] = useState<string[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    setParams({
      name: searchParams.get("name") || "",
      symbol: searchParams.get("symbol") || "",
      metadataUri: searchParams.get("metadataUri") || "",
      devBuySol: parseFloat(searchParams.get("devBuySol") || "0"),
      slippage: parseFloat(searchParams.get("slippage") || "5"),
      priorityFee: parseFloat(searchParams.get("priorityFee") || "0.0005"),
    });
  }, [searchParams]);

  const log = (msg: string) => {
    console.log(msg);
    setLogs((prev) => [...prev, msg]);
  };

  const getProvider = async () => {
    if ("phantom" in window) {
      const provider = (window as any).phantom?.solana;
      if (provider?.isPhantom) return provider;
    }
    window.open("https://phantom.app/", "_blank");
    throw new Error("Please install Phantom wallet from https://phantom.app/");
  };

  const broadcastWithFallback = async (signedTxBase64Bytes: Uint8Array) => {
    const rpcUrls = [
      "https://mainnet.helius-rpc.com/?api-key=c9afde0d-b832-446d-8f81-16b481f9676d",
      "https://api.mainnet-beta.solana.com"
    ];

    let lastErr = null;
    for (const url of rpcUrls) {
      try {
        const conn = new Connection(url, "confirmed");
        const sig = await conn.sendRawTransaction(signedTxBase64Bytes, { skipPreflight: false, maxRetries: 3 });
        return { conn, sig };
      } catch (err: any) {
        lastErr = err;
        log("⚠️ RPC fallback from " + url.split('?')[0]);
      }
    }
    throw lastErr || new Error("All RPCs failed");
  };

  const waitForConfirmation = async (connection: Connection, signature: string) => {
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
  };

  const handleDeploy = async () => {
    try {
      setIsDeploying(true);
      setLogs([]);
      
      const provider = await getProvider();
      const resp = await provider.connect();
      const publicKey = resp.publicKey.toString();
      log("Connected: " + publicKey.substring(0,6) + "...");

      // 1. Build Create Tx
      log("Building CREATE transaction...");
      const mintKeypair = Keypair.generate();
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
      const createTx = VersionedTransaction.deserialize(txBytes);
      
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
        const buyTx = VersionedTransaction.deserialize(buyTxBytes);

        log("Please approve DEV BUY in Phantom...");
        const signedBuyTx = await provider.signTransaction(buyTx);

        log("Broadcasting DEV BUY...");
        const { sig: buySig } = await broadcastWithFallback(signedBuyTx.serialize());
        log("DEV BUY Sig: " + buySig);
      }

      log("✅ All done! Project is officially launched.");
      setIsDone(true);
    } catch (err: any) {
      log("❌ Error: " + err.message);
    } finally {
      setIsDeploying(false);
    }
  };

  if (!params.name) {
    return <div className="text-center p-20 text-white">Loading parameters...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 min-h-screen">
      <div className="bg-zinc-900 p-8 rounded-xl shadow-2xl max-w-md w-full text-center border border-zinc-800">
        <h2 className="text-2xl font-bold text-white mb-2">Deploy {params.name} ({params.symbol})</h2>
        <p className="text-gray-400 mb-6">Please connect your Phantom wallet to sign the deployment transactions securely on-chain.</p>
        
        {!isDone ? (
          <button 
            onClick={handleDeploy}
            disabled={isDeploying}
            className="bg-[#AB9FF2] text-black border-none py-3 px-6 rounded-lg text-lg font-bold cursor-pointer transition hover:bg-[#9686e9] disabled:bg-gray-600 disabled:cursor-not-allowed w-full mb-4"
          >
            {isDeploying ? "Processing..." : "Connect & Deploy"}
          </button>
        ) : (
          <div className="bg-green-900/50 text-green-400 p-4 rounded-lg mb-4">
            Deployment Successful!
          </div>
        )}

        <div className="text-left bg-black p-4 rounded-lg mt-4 h-48 overflow-y-auto font-mono text-sm">
          {logs.length === 0 && <span className="text-gray-600">Awaiting action...</span>}
          {logs.map((l, i) => (
            <div key={i} className={`mb-1 ${l.startsWith('❌') ? 'text-red-400' : l.startsWith('✅') ? 'text-green-400' : 'text-gray-300'}`}>
              {l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LaunchPage() {
  return (
    <>
      <Navbar />
      <main className="bg-black min-h-screen">
        <Suspense fallback={<div className="text-white text-center py-20">Loading...</div>}>
          <LaunchContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
