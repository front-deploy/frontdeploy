import { Keypair, VersionedTransaction, SystemProgram, TransactionMessage, PublicKey } from "@solana/web3.js";
import type { FastLaunchDraft } from "./messaging";
import { getLaunchSettings } from "./storage";

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return await response.blob();
}

export async function uploadMetadata(draft: FastLaunchDraft): Promise<string> {
  const settings = await getLaunchSettings();
  
  if ((settings.ipfsProvider as any) === "pinata" && settings.pinataJwt) {
    try {
      const blob = await dataUrlToBlob(draft.image);
      const formData = new FormData();
      formData.append("file", blob, "image.png");
      
      const imgRes = await fetch("https://uploads.pinata.cloud/v3/files", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.pinataJwt}`,
        },
        body: formData
      });
      
      if (!imgRes.ok) throw new Error("Failed to upload image to Pinata");
      const imgData = await imgRes.json();
      const imageUri = `https://ipfs.io/ipfs/${imgData.data.cid}`;
      
      const metadata = {
        name: draft.name,
        symbol: draft.symbol,
        description: draft.description,
        image: imageUri,
        showName: true,
        ...(draft.twitter ? { twitter: draft.twitter } : {}),
        ...(draft.telegram ? { telegram: draft.telegram } : {}),
        ...(draft.website ? { website: draft.website } : {}),
      };
      
      const metaBlob = new Blob([JSON.stringify(metadata)], { type: "application/json" });
      const metaFormData = new FormData();
      metaFormData.append("file", metaBlob, "metadata.json");
      
      const metaRes = await fetch("https://uploads.pinata.cloud/v3/files", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.pinataJwt}`,
        },
        body: metaFormData
      });
      
      if (!metaRes.ok) throw new Error("Failed to upload metadata to Pinata");
      const metaData = await metaRes.json();
      return `https://ipfs.io/ipfs/${metaData.data.cid}`;
    } catch (err) {
      console.warn("Pinata upload failed, falling back if allowed", err);
      // Fallback to pumpfun if error
    }
  }

  // Fallback / Default to Pump.fun api
  const blob = await dataUrlToBlob(draft.image);
  const formData = new FormData();
  formData.append("file", blob, "image.png");
  formData.append("name", draft.name);
  formData.append("symbol", draft.symbol);
  formData.append("description", draft.description);
  formData.append("showName", "true");
  if (draft.twitter) formData.append("twitter", draft.twitter);
  if (draft.telegram) formData.append("telegram", draft.telegram);
  if (draft.website) formData.append("website", draft.website);

  const res = await fetch("https://pump.fun/api/ipfs", {
    method: "POST",
    body: formData
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    console.error("[Pumpfun API] IPFS upload failed:", res.status, errText);
    throw new Error(`Pump.fun upload failed: ${errText || res.statusText}`);
  }
  const data = await res.json();
  return data.metadataUri;
}

/**
 * Build the CREATE transaction (always amount=0).
 * If devBuySol > 0, a separate buy tx will be built afterwards via buildDevBuyTx.
 */
export async function buildPartialSignedCreateTx(
  payerPublicKeyBase58: string, 
  metadataUri: string, 
  draft: FastLaunchDraft
): Promise<{ txsBase64: string[]; mintKeypair: Keypair }> {
  
  const settings = await getLaunchSettings();
  const mintKeypair = Keypair.generate();
  
  // Always create with amount=0. Dev buy is done in a separate tx after the token is on-chain.
  const reqBody = {
    publicKey: payerPublicKeyBase58,
    action: "create",
    tokenMetadata: {
      name: draft.name,
      symbol: draft.symbol,
      uri: metadataUri
    },
    mint: mintKeypair.publicKey.toBase58(),
    denominatedInSol: true,
    amount: 0,
    slippage: Number(String(settings.slippage || 5).replace(',', '.')),
    priorityFee: Number(String(settings.priorityFee || 0.0005).replace(',', '.')),
    pool: "pump"
  };

  const response = await fetch("https://pumpportal.fun/api/trade-local", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(reqBody)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error("[Pumpfun API] trade-local failed:", response.status, errorText);
    throw new Error(`PumpPortal failed: ${errorText || response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const errorData = await response.json().catch(() => ({}));
    console.error("[Pumpfun API] trade-local returned JSON error:", errorData);
    throw new Error(`PumpPortal returned JSON error: ${errorData.error || errorData.message || JSON.stringify(errorData)}`);
  }

  const txBytes = new Uint8Array(await response.arrayBuffer());
  
  // Sign the create tx with the mint keypair (required by PumpPortal).
  const tx = VersionedTransaction.deserialize(txBytes);
  tx.sign([mintKeypair]);
  
  // Serialize to base64
  const signedTxBytes = tx.serialize();
  const binaryString = Array.from(signedTxBytes).map(byte => String.fromCharCode(byte)).join('');
  const txBase64 = btoa(binaryString);
  const txsBase64 = [txBase64];

  // Create Fee Transaction (0.03 SOL platform fee)
  const feeAmount = 30_000_000;
  const treasuryStr = process.env.PLASMO_PUBLIC_TREASURY_WALLET;
  if (!treasuryStr) {
    throw new Error("Treasury wallet is not configured. Please add PLASMO_PUBLIC_TREASURY_WALLET to your .env");
  }

  try {
    const treasury = new PublicKey(treasuryStr);
    const payer = new PublicKey(payerPublicKeyBase58);
    
    const feeInstruction = SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: treasury,
      lamports: feeAmount
    });
    
    const recentBlockhash = tx.message.recentBlockhash;
    
    const feeMessageV0 = new TransactionMessage({
      payerKey: payer,
      recentBlockhash: recentBlockhash,
      instructions: [feeInstruction]
    }).compileToV0Message();
    
    const feeTx = new VersionedTransaction(feeMessageV0);
    const feeTxBytes = feeTx.serialize();
    const feeBinaryString = Array.from(feeTxBytes).map(byte => String.fromCharCode(byte)).join('');
    txsBase64.push(btoa(feeBinaryString));
  } catch (err) {
    console.warn("Failed to create fee transaction", err);
  }
  
  return { txsBase64, mintKeypair };
}

/**
 * Build a DEV BUY transaction for a token that has already been created on-chain.
 * This is called AFTER the create tx is confirmed.
 */
export async function buildDevBuyTx(
  payerPublicKeyBase58: string,
  mintPubkeyBase58: string,
  recentBlockhash: string
): Promise<string> {
  const settings = await getLaunchSettings();
  const devBuySol = Number(String(settings.devBuySol || 0).replace(',', '.'));
  
  if (!devBuySol || devBuySol <= 0) {
    throw new Error("Dev buy amount is 0, should not call buildDevBuyTx");
  }

  const reqBody = {
    publicKey: payerPublicKeyBase58,
    action: "buy",
    mint: mintPubkeyBase58,
    denominatedInSol: "true",
    amount: devBuySol,
    slippage: Number(String(settings.slippage || 5).replace(',', '.')),
    priorityFee: Number(String(settings.priorityFee || 0.0005).replace(',', '.')),
    pool: "pump"
  };

  console.log("[Pumpfun API] Building dev buy tx for mint:", mintPubkeyBase58, "amount:", devBuySol);

  const response = await fetch("https://pumpportal.fun/api/trade-local", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(reqBody)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error("[Pumpfun API] dev buy trade-local failed:", response.status, errorText);
    throw new Error(`PumpPortal dev buy failed: ${errorText || response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`PumpPortal dev buy JSON error: ${errorData.error || errorData.message || JSON.stringify(errorData)}`);
  }

  const txBytes = new Uint8Array(await response.arrayBuffer());
  const tx = VersionedTransaction.deserialize(txBytes);
  
  // Override blockhash so both txs use the same one (avoids blockhash expiry issues)
  // Actually, let the API set its own blockhash since it's a fresh request
  
  const signedTxBytes = tx.serialize();
  const binaryString = Array.from(signedTxBytes).map(byte => String.fromCharCode(byte)).join('');
  return btoa(binaryString);
}
