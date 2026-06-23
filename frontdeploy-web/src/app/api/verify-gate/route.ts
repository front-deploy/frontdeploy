import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { readFileSync } from "fs";
import path from "path";

const FDP_MINT = process.env.NEXT_PUBLIC_FRONTDEPLOY_CA;
const MIN_BALANCE = parseInt(process.env.MIN_TOKEN_BALANCE || "1000000", 10); // 1 million FDP

export async function POST(req: Request) {
  try {
    const { publicKey, signature, message } = await req.json();

    if (!publicKey || !signature || !message) {
      console.warn("[Verify Gate Debug] Missing required fields in request body:", { publicKey: !!publicKey, signature: !!signature, message: !!message });
      return NextResponse.json(
        { error: "Invalid request. Please try reconnecting your wallet." },
        { status: 400 }
      );
    }

    // 1. Check for Replay Attack by verifying the timestamp
    const timestampMatch = message.match(/Verifying Frontdeploy Token Gate \((\d+)\)/);
    if (!timestampMatch) {
      console.warn("[Verify Gate Debug] Message format invalid or missing timestamp:", message);
      return NextResponse.json({ error: "Invalid signature format." }, { status: 400 });
    }

    const messageTime = parseInt(timestampMatch[1], 10);
    const currentTime = Date.now();
    const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

    if (isNaN(messageTime) || currentTime - messageTime > MAX_AGE_MS || messageTime > currentTime + 60000) {
      console.warn(`[Verify Gate Debug] Signature expired. MessageTime: ${messageTime}, CurrentTime: ${currentTime}`);
      return NextResponse.json({ error: "Signature has expired. Please refresh the page and reconnect your wallet." }, { status: 401 });
    }

    // 2. Verify the cryptographic signature
    const signatureUint8 = bs58.decode(signature);
    const messageUint8 = new TextEncoder().encode(message);
    const pubKeyUint8 = bs58.decode(publicKey);

    const isValid = nacl.sign.detached.verify(
      messageUint8,
      signatureUint8,
      pubKeyUint8
    );

    if (!isValid) {
      console.warn(`[Verify Gate Debug] Signature verification failed for pubKey: ${publicKey}`);
      return NextResponse.json({ error: "Could not verify your wallet signature. Please try again." }, { status: 401 });
    }

    // 2. Check token balance
    // Ensure we use the environment variable for the RPC URL to avoid hardcoding
    const rpcUrls = [
      process.env.NEXT_PUBLIC_RPC_URL,
      process.env.HELIUS_RPC_URL,
      process.env.FALLBACK_RPC_URL
    ].filter(Boolean) as string[];

    if (rpcUrls.length === 0) {
      console.error("[Verify Gate Debug] No RPC URLs configured on the server.");
      return NextResponse.json({ error: "Server configuration issue. Please contact support." }, { status: 500 });
    }

    const pubKey = new PublicKey(publicKey);
    
    if (!FDP_MINT) {
      console.error("Missing FDP_MINT configuration");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    const mintKey = new PublicKey(FDP_MINT);

    let tokenAccounts = null;
    let lastRpcError = null;

    for (const url of rpcUrls) {
      try {
        const connection = new Connection(url, "confirmed");
        tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
          mint: mintKey,
        });
        break; // Successfully fetched, break the loop
      } catch (err) {
        lastRpcError = err;
        console.warn(`[Verify Gate Debug] RPC connection failed for ${url}:`, err);
      }
    }

    if (!tokenAccounts) {
      console.error("[Verify Gate Debug] All RPC fallbacks failed to fetch token accounts. Last error:", lastRpcError);
      return NextResponse.json({ error: "Could not connect to the Solana network. Please try again later." }, { status: 500 });
    }

    let totalBalance = 0;
    for (const account of tokenAccounts.value) {
      const parsedInfo = account.account.data.parsed.info;
      const uiAmount = parsedInfo.tokenAmount.uiAmount || 0;
      totalBalance += uiAmount;
    }

    if (totalBalance < MIN_BALANCE) {
      console.info(`[Verify Gate Debug] Access denied: User ${publicKey} has ${totalBalance} $FDP (Minimum required: ${MIN_BALANCE})`);
      return NextResponse.json(
        { error: `You need at least ${MIN_BALANCE.toLocaleString()} $FDP to download this extension. Your current balance is ${totalBalance.toLocaleString()} $FDP.` },
        { status: 403 }
      );
    }

    console.info(`[Verify Gate Debug] Access granted: User ${publicKey} verified with ${totalBalance} $FDP.`);

    // 3. Return the actual file binary securely
    try {
      const filePath = path.join(process.cwd(), "private", "frontdeploy-extension.zip");
      const fileBuffer = readFileSync(filePath);

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": 'attachment; filename="frontdeploy-extension.zip"',
        },
      });
    } catch (err) {
      console.error("[Verify Gate Debug] Failed to read zip file:", err);
      return NextResponse.json(
        { error: "The extension file is currently unavailable. Please try again later." },
        { status: 500 }
      );
    }

  } catch (error: unknown) {
    console.error("[Verify Gate Debug] Unhandled verification error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred on the server while verifying your wallet." },
      { status: 500 }
    );
  }
}
