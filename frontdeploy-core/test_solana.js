import { Connection, PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";

async function run() {
  const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=2bdf28e7-5cde-4293-9404-0064148a86d4");
  const mint = new PublicKey("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"); // Bonk
  
  const mintInfo = await getMint(connection, mint);
  console.log("Mint Info:", mintInfo);
  
  const largest = await connection.getTokenLargestAccounts(mint);
  let top10Sum = 0;
  for (let i = 0; i < 10 && i < largest.value.length; i++) {
    top10Sum += Number(largest.value[i].amount);
  }
  
  const totalSupply = Number(mintInfo.supply);
  const concentration = (top10Sum / totalSupply) * 100;
  
  console.log("Concentration:", concentration, "%");
}

run().catch(console.error);
