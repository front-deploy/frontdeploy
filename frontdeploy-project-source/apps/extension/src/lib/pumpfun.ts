import { Keypair } from "@solana/web3.js";
import type { FastLaunchDraft } from "./messaging";
import { getLaunchSettings } from "./storage";

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return await response.blob();
}

export async function uploadMetadata(draft: FastLaunchDraft): Promise<string> {
  const settings = await getLaunchSettings();
  
  if (settings.ipfsProvider === "pinata" && settings.pinataJwt) {
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

  if (!res.ok) throw new Error(`Pump.fun upload failed: ${res.statusText}`);
  const data = await res.json();
  return data.metadataUri;
}

export async function buildPartialSignedCreateTx(
  payerPublicKeyBase58: string, 
  metadataUri: string, 
  draft: FastLaunchDraft
): Promise<{ txBase64: string; mintKeypair: Keypair }> {
  
  const settings = await getLaunchSettings();
  const mintKeypair = Keypair.generate();
  
  const reqBody = {
    publicKey: payerPublicKeyBase58,
    action: "create",
    tokenMetadata: {
      name: draft.name,
      symbol: draft.symbol,
      uri: metadataUri
    },
    mint: mintKeypair.publicKey.toBase58(),
    denominatedInSol: "true",
    amount: settings.devBuySol || 0,
    slippage: settings.slippage || 5,
    priorityFee: settings.priorityFee || 0.0005,
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
    throw new Error(`PumpPortal failed: ${response.statusText}`);
  }

  const txBytes = new Uint8Array(await response.arrayBuffer());
  
  // We need to sign this tx with the mint keypair.
  // We don't have VersionedTransaction imported here easily without the buffer polyfill everywhere.
  // Actually, we can just return the raw bytes + mintKeypair and sign it where @solana/web3.js is used (like in the background or bridge).
  // But wait, @solana/web3.js VersionedTransaction is fine in background. 
  // We'll import it here.
  const { VersionedTransaction } = await import("@solana/web3.js");
  const tx = VersionedTransaction.deserialize(txBytes);
  
  tx.sign([mintKeypair]);
  
  // Convert signed tx to base64
  const signedTxBytes = tx.serialize();
  
  // base64 encode using btoa and raw characters
  const binaryString = Array.from(signedTxBytes).map(byte => String.fromCharCode(byte)).join('');
  const txBase64 = btoa(binaryString);
  
  return { txBase64, mintKeypair };
}
