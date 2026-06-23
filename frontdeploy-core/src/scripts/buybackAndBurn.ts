import { Connection, Keypair, PublicKey, VersionedTransaction, SystemProgram, TransactionMessage } from '@solana/web3.js';
import { createBurnInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import { PrismaClient } from '@prisma/client';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const prisma = new PrismaClient();

const RPC_URL = process.env.HELIUS_RPC_URL || '';
const TREASURY_SECRET = process.env.TREASURY_PRIVATE_KEY || '';
const FDP_MINT = process.env.FDP_MINT_ADDRESS || '2vCwDJesf1CyHiexyT8nkd72gD1JuKDPGdmeoCX7pump';
const OPS_WALLET = process.env.OPS_PUBLIC_KEY || '2d5UoM2tMwwgG9W3B1ZpsA9GjP4L1K11y4v6Z6kG1vE7';
const JUPITER_API_KEY = process.env.JUPITER_API_KEY || '';
const JUPITER_BASE_URL = process.env.JUPITER_SWAP_BASE_URL || 'https://api.jup.ag/swap/v1';

async function getJupiterQuote(inputMint: string, outputMint: string, amountLamports: number) {
  const url = `${JUPITER_BASE_URL}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=100`;
  const res = await fetch(url, {
    headers: JUPITER_API_KEY ? { 'x-api-key': JUPITER_API_KEY } : {}
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Jupiter Quote Failed: ${res.statusText} - ${errText}`);
  }
  return await res.json();
}

async function getJupiterSwapTransaction(quoteResponse: any, userPublicKey: string) {
  const res = await fetch(`${JUPITER_BASE_URL}/swap`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(JUPITER_API_KEY ? { 'x-api-key': JUPITER_API_KEY } : {})
    },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto"
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Jupiter Swap Failed: ${res.statusText} - ${errText}`);
  }
  const { swapTransaction } = await res.json();
  return swapTransaction;
}

async function main() {
  console.log('========================================');
  console.log(' Starting Buyback & Burn Process ');
  console.log('========================================');

  if (!RPC_URL || !TREASURY_SECRET) {
    throw new Error('Missing HELIUS_RPC_URL or TREASURY_PRIVATE_KEY in .env');
  }

  const connection = new Connection(RPC_URL, 'confirmed');
  const treasuryKeypair = Keypair.fromSecretKey(bs58.decode(TREASURY_SECRET));
  const treasuryPubkey = treasuryKeypair.publicKey;
  console.log(`[Info] Treasury Wallet: ${treasuryPubkey.toBase58()}`);

  const balanceLamports = await connection.getBalance(treasuryPubkey);
  const balanceSol = balanceLamports / 1e9;
  console.log(`[Info] Current Balance: ${balanceSol} SOL`);

  // Reserve 0.01 SOL for rent and gas
  const MIN_RESERVE = 0.01 * 1e9; 
  if (balanceLamports <= MIN_RESERVE) {
    console.log('[Warn] Insufficient balance for buyback (<= 0.01 SOL). Exiting.');
    return;
  }

  const availableToProcess = balanceLamports - MIN_RESERVE;
  const buybackAmount = Math.floor(availableToProcess * 0.9);
  const opsAmount = Math.floor(availableToProcess * 0.1);

  console.log(`[Process] 90% Buyback (${buybackAmount / 1e9} SOL)`);
  console.log(`[Process] 10% Operations (${opsAmount / 1e9} SOL)`);

  const SOL_MINT = 'So11111111111111111111111111111111111111112';

  // 1. Get Jupiter Quote
  console.log(`[Process] Fetching Jupiter Swap Quote...`);
  const quote = await getJupiterQuote(SOL_MINT, FDP_MINT, buybackAmount);
  console.log(`[Success] Quote obtained: -> ${quote.outAmount} FDP (raw)`);

  // 2. Get Swap Transaction
  const swapTxBase64 = await getJupiterSwapTransaction(quote, treasuryPubkey.toBase58());
  const swapTxBytes = Buffer.from(swapTxBase64, 'base64');
  const swapTx = VersionedTransaction.deserialize(swapTxBytes);

  // Execute Swap (Part 1)
  console.log('[Process] Signing and broadcasting Swap Tx...');
  swapTx.sign([treasuryKeypair]);
  const swapSig = await connection.sendTransaction(swapTx, { maxRetries: 3 });
  console.log(`[Success] Swap sent! Tx: ${swapSig}`);
  
  console.log('[Process] Waiting for confirmation...');
  await connection.confirmTransaction(swapSig, 'confirmed');
  
  // Sleep a moment to ensure state propagates in RPC
  await new Promise(r => setTimeout(r, 3000));

  // 3. Find FDP ATA
  const mintPubkey = new PublicKey(FDP_MINT);
  const ata = await getAssociatedTokenAddress(mintPubkey, treasuryPubkey);
  
  // 4. Get FDP Balance
  let fdpAmountToBurn: string;
  let fdpAmountUi: number;

  try {
    const tokenAccount = await connection.getTokenAccountBalance(ata);
    fdpAmountToBurn = tokenAccount.value.amount;
    fdpAmountUi = tokenAccount.value.uiAmount || 0;
    console.log(`[Process] FDP balance retrieved: ${fdpAmountUi} FDP`);
  } catch (err) {
    console.error('[Error] Could not retrieve FDP balance from ATA', err);
    throw err;
  }

  // 5. Transfer Ops fee + Burn FDP (Part 2)
  console.log('[Process] Constructing Ops Transfer & Burn instructions...');
  const opsPubkey = new PublicKey(OPS_WALLET);
  const instructions = [
    SystemProgram.transfer({
      fromPubkey: treasuryPubkey,
      toPubkey: opsPubkey,
      lamports: opsAmount
    })
  ];

  if (BigInt(fdpAmountToBurn) > BigInt(0)) {
    instructions.push(
      createBurnInstruction(
        ata,
        mintPubkey,
        treasuryPubkey,
        BigInt(fdpAmountToBurn)
      )
    );
  } else {
    console.log('[Warn] FDP balance is 0. Nothing to burn.');
  }

  const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  const msg = new TransactionMessage({
    payerKey: treasuryPubkey,
    recentBlockhash,
    instructions
  }).compileToV0Message();

  const finalTx = new VersionedTransaction(msg);
  finalTx.sign([treasuryKeypair]);
  
  console.log('[Process] Broadcasting Transfer & Burn Tx...');
  const finalSig = await connection.sendTransaction(finalTx);
  console.log(`[Success] Burn sent! Tx: ${finalSig}`);
  await connection.confirmTransaction(finalSig, 'confirmed');

  // 6. Log to DB
  console.log('[Process] Recording history in Database...');
  await prisma.burnHistory.create({
    data: {
      solSpent: buybackAmount / 1e9,
      fdpBought: fdpAmountUi,
      fdpBurned: fdpAmountUi,
      txHash: finalSig
    }
  });

  console.log('========================================');
  console.log(' Database logged successfully! Done. ');
  console.log('========================================');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
