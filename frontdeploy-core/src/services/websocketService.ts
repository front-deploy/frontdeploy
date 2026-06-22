import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { PrismaClient } from '@prisma/client';
import { FlowClassifier } from './flowClassifier.js';
import { Connection, PublicKey } from '@solana/web3.js';

const prisma = new PrismaClient();

export interface KolEventPayload {
  tweetId: string;
  authorHandle: string;
  text: string;
  url: string;
  isSignal: boolean;
  contractAddress?: string | null;
  ticker?: string | null;
  postedAt: string | Date;
}

export class WebSocketService {
  private connections: Set<WebSocket> = new Set();
  private tokenSubscriptions: Map<string, Set<WebSocket>> = new Map();
  private flowClassifier: FlowClassifier = new FlowClassifier();
  private solanaConnection: Connection;
  private mintListeners: Map<string, number> = new Map();
  private pendingSignatures: Set<string> = new Set();
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(private app: FastifyInstance) {
    const rpcUrl = process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.solanaConnection = new Connection(rpcUrl, 'confirmed');
  }

  public getConnectionsCount(): number {
    return this.connections.size;
  }

  public registerRoutes() {
    this.app.get('/ws/kol-alerts', { websocket: true }, async (connection: WebSocket, req: FastifyRequest) => {
      this.app.log.info('New client connected to KOL alerts stream');
      this.connections.add(connection);

      connection.on('message', (message: string) => {
        try {
          const payload = JSON.parse(message.toString());
          if (payload.action === 'subscribe' && payload.mint) {
            if (!this.tokenSubscriptions.has(payload.mint)) {
              this.tokenSubscriptions.set(payload.mint, new Set());
            }
            this.tokenSubscriptions.get(payload.mint)!.add(connection);
            this.app.log.info(`Client subscribed to mint: ${payload.mint}`);
            this.updateMintSubscription(payload.mint);
          } else if (payload.action === 'unsubscribe' && payload.mint) {
            if (this.tokenSubscriptions.has(payload.mint)) {
              this.tokenSubscriptions.get(payload.mint)!.delete(connection);
              this.app.log.info(`Client unsubscribed from mint: ${payload.mint}`);
              this.updateMintSubscription(payload.mint);
            }
          }
        } catch (e) {
          this.app.log.error('Invalid WS message received');
        }
      });

      connection.on('close', () => {
        this.app.log.info('Client disconnected');
        this.connections.delete(connection);
        
        for (const [mint, subs] of this.tokenSubscriptions.entries()) {
          subs.delete(connection);
          if (subs.size === 0) {
            this.tokenSubscriptions.delete(mint);
            this.updateMintSubscription(mint);
          }
        }
      });

      // Send a welcome message
      connection.send(JSON.stringify({ type: 'connected', message: 'Connected to KOL Alerts Stream' }));

      // Fetch and send recent events from the database so the client has immediate data
      try {
        const recentEvents = await prisma.kolEvent.findMany({
          orderBy: { postedAt: 'desc' }, // get latest 10
          take: 10
        });
        
        // Reverse to send oldest first
        recentEvents.reverse();

        for (const event of recentEvents) {
          if (connection.readyState === 1) { // 1 == WebSocket.OPEN
            connection.send(JSON.stringify({ type: 'kol_event', data: event }));
          }
        }
      } catch (err) {
        this.app.log.error(err, 'Failed to fetch recent events for new connection');
      }
    });

    // Keep-alive ping every 30 seconds to prevent Railway/Nginx from dropping idle connections
    setInterval(() => {
      for (const connection of this.connections) {
        if (connection.readyState === 1) { // WebSocket.OPEN
          connection.send(JSON.stringify({ type: 'ping' }));
        }
      }
    }, 30000);
  }

  private updateMintSubscription(mint: string) {
    const hasClients = this.tokenSubscriptions.has(mint) && this.tokenSubscriptions.get(mint)!.size > 0;
    
    if (hasClients && !this.mintListeners.has(mint)) {
      try {
        const pubkey = new PublicKey(mint);
        const id = this.solanaConnection.onLogs(
          pubkey,
          (logs) => {
            this.app.log.info(`[Solana WebSocket] Log received for ${mint}. Signature: ${logs.signature}`);
            if (logs.err) {
              this.app.log.info(`[Solana WebSocket] Skipping failed tx: ${logs.signature}`);
              return; // Skip failed transactions
            }
            this.handleMintLog(logs.signature);
          },
          'confirmed'
        );
        this.mintListeners.set(mint, id);
        this.app.log.info(`Started Solana onLogs listener for ${mint}`);
      } catch (e) {
        this.app.log.error(`Invalid PublicKey for mint: ${mint}`);
      }
    } else if (!hasClients && this.mintListeners.has(mint)) {
      const id = this.mintListeners.get(mint)!;
      this.solanaConnection.removeOnLogsListener(id).catch(e => this.app.log.error(e, 'Error removing log listener'));
      this.mintListeners.delete(mint);
      this.app.log.info(`Stopped Solana onLogs listener for ${mint}`);
    }
  }

  private handleMintLog(signature: string) {
    this.pendingSignatures.add(signature);
    if (!this.batchTimer) {
      // Wait 1 second before processing the batch natively
      this.batchTimer = setTimeout(() => this.processSignatureBatchNative(), 1000);
    }
  }

  private async processSignatureBatchNative() {
    this.batchTimer = null;
    if (this.pendingSignatures.size === 0) return;

    // getParsedTransactions can fetch up to 250 signatures at once
    const signatures = Array.from(this.pendingSignatures).slice(0, 50);
    for (const sig of signatures) {
      this.pendingSignatures.delete(sig);
    }

    try {
      this.app.log.info(`[Native Parser] Fetching ${signatures.length} txs from RPC...`);
      const parsedTxs = await this.solanaConnection.getParsedTransactions(signatures, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed'
      });

      const events = [];
      for (let i = 0; i < parsedTxs.length; i++) {
        const tx = parsedTxs[i];
        if (!tx || !tx.meta) continue;

        const signature = signatures[i];
        // Assume feePayer is the first signer
        const feePayer = tx.transaction?.message?.accountKeys?.[0]?.pubkey.toString() || "Unknown";

        const preBalances = tx.meta.preTokenBalances || [];
        const postBalances = tx.meta.postTokenBalances || [];
        
        // Calculate real USD volume based on feePayer's SOL balance changes
        const preSol = (tx.meta.preBalances?.[0] || 0) / 1e9;
        const postSol = (tx.meta.postBalances?.[0] || 0) / 1e9;
        const solDiff = Math.abs(preSol - postSol);
        const estimatedUsdVolume = solDiff * 140; // Assume 1 SOL = $140
        
        const tokenTransfers = [];
        const accounts = new Set([...preBalances.map(b => b.accountIndex), ...postBalances.map(b => b.accountIndex)]);
        
        for (const accountIndex of accounts) {
          const pre = preBalances.find(b => b.accountIndex === accountIndex);
          const post = postBalances.find(b => b.accountIndex === accountIndex);
          
          const preAmount = pre ? (pre.uiTokenAmount.uiAmount || 0) : 0;
          const postAmount = post ? (post.uiTokenAmount.uiAmount || 0) : 0;
          const diff = postAmount - preAmount;
          
          if (Math.abs(diff) > 0) {
            const mint = (pre?.mint || post?.mint)!;
            const owner = (pre?.owner || post?.owner) || "Unknown";
            
            const isNewWallet = preAmount === 0; // If balance was 0 before tx, it's a new holder

            if (diff > 0) {
              tokenTransfers.push({
                mint,
                toUserAccount: owner,
                tokenAmount: diff,
                fromUserAccount: "System",
                usdVolume: estimatedUsdVolume,
                isNewWallet: isNewWallet
              });
            } else {
              tokenTransfers.push({
                mint,
                fromUserAccount: owner,
                tokenAmount: Math.abs(diff),
                toUserAccount: "System",
                usdVolume: estimatedUsdVolume,
                isNewWallet: false // Sells are never new wallets
              });
            }
          }
        }
        
        if (tokenTransfers.length > 0) {
          events.push({
            signature,
            feePayer,
            tokenTransfers
          });
        }
      }

      this.app.log.info(`[Native Parser] Successfully parsed ${events.length} txs with token transfers`);
      this.handleHeliusWebhook(events);

    } catch (e) {
      this.app.log.error(e, "Failed to natively fetch parsed transactions");
    }

    if (this.pendingSignatures.size > 0) {
      this.batchTimer = setTimeout(() => this.processSignatureBatchNative(), 1000);
    }
  }

  public handleHeliusWebhook(events: any[]) {
    this.app.log.info(`[handleHeliusWebhook] Received ${events?.length || 0} parsed transactions`);
    if (!Array.isArray(events)) return;

    for (const tx of events) {
      this.app.log.info(`[handleHeliusWebhook] TX ${tx.signature} | tokenTransfers count: ${tx.tokenTransfers?.length || 0} | type: ${tx.type} | source: ${tx.source}`);
      
      if (!tx.tokenTransfers || tx.tokenTransfers.length === 0) continue;

      const mintsInvolved = new Set<string>();
      for (const transfer of tx.tokenTransfers) {
        mintsInvolved.add(transfer.mint);
      }

      this.app.log.info(`[handleHeliusWebhook] Mints involved in tx: ${Array.from(mintsInvolved).join(', ')}`);

      for (const mint of mintsInvolved) {
        if (this.tokenSubscriptions.has(mint)) {
          this.app.log.info(`[handleHeliusWebhook] Matched subscribed mint: ${mint}. Broadcasting!`);
          const clients = this.tokenSubscriptions.get(mint)!;
          
          const mainAccount = tx.feePayer || "SmartWallet";
          let action = "SWAP";
          let amount = "0";
          let realUsdVolume = 10;
          let realIsNewWallet = false;
          
          for (const transfer of tx.tokenTransfers) {
            if (transfer.mint === mint) {
              if (transfer.toUserAccount === mainAccount) {
                action = "BUY";
                amount = transfer.tokenAmount.toString();
                realUsdVolume = transfer.usdVolume || 10;
                realIsNewWallet = transfer.isNewWallet || false;
              } else if (transfer.fromUserAccount === mainAccount) {
                action = "SELL";
                amount = transfer.tokenAmount.toString();
                realUsdVolume = transfer.usdVolume || 10;
                realIsNewWallet = false;
              }
            }
          }

          const message = JSON.stringify({
            type: "smart_money",
            data: {
              mint,
              action,
              amount,
              walletLabel: `Wallet ...${mainAccount.substring(mainAccount.length - 4)}`,
              txSignature: tx.signature
            }
          });

          const parsedAmount = amount === "Unknown" ? 0 : parseFloat(amount);
          
          // Flow Radar Classification
          const flowType = this.flowClassifier.classify(
            mint, 
            mainAccount, 
            action === "BUY" ? "BUY" : "SELL", 
            realIsNewWallet,
            realUsdVolume
          );

          const flowMessage = JSON.stringify({
            type: "flow_event",
            data: {
              mint,
              type: flowType,
              volumeUsd: realUsdVolume,
              wallet: `Wallet ...${mainAccount.substring(mainAccount.length - 4)}`,
              txSignature: tx.signature
            }
          });

          for (const client of clients) {
            if (client.readyState === 1 /* OPEN */) {
              client.send(message);
              client.send(flowMessage);
            }
          }
        }
      }
    }
  }

  public broadcastEvent(event: KolEventPayload) {
    const payload = JSON.stringify({ type: 'kol_event', data: event });
    for (const connection of this.connections) {
      if (connection.readyState === 1) { // WebSocket.OPEN
        connection.send(payload);
      }
    }
  }

  public broadcastRaw(event: any) {
    const payload = JSON.stringify(event);
    for (const connection of this.connections) {
      if (connection.readyState === 1) { // WebSocket.OPEN
        connection.send(payload);
      }
    }
  }
}
