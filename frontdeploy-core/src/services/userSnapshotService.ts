import { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';

const prisma = new PrismaClient();

export interface IdentitySnapshotInput {
  handle: string;
  xUserId: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
}

export class UserSnapshotService {
  // Simple in-memory hash check to reduce DB queries
  private snapshotCache = new Map<string, string>();

  constructor(private logger: FastifyBaseLogger) {}

  private hashSnapshot(data: IdentitySnapshotInput): string {
    return `${data.handle}|${data.displayName}|${data.bio}|${data.avatarUrl}`;
  }

  /**
   * Evaluates a user snapshot. If it differs from the last known state, saves it.
   */
  public async takeSnapshot(data: IdentitySnapshotInput): Promise<boolean> {
    if (!data.xUserId || data.xUserId === 'unknown') return false;

    const currentHash = this.hashSnapshot(data);
    const cachedHash = this.snapshotCache.get(data.xUserId);

    if (cachedHash === currentHash) {
      return false; // No change
    }

    try {
      // Look up the latest snapshot in DB to be sure (in case of restart)
      const latestSnapshot = await prisma.xIdentitySnapshot.findFirst({
        where: { xUserId: data.xUserId },
        orderBy: { ts: 'desc' }
      });

      let hasChanged = true;
      if (latestSnapshot) {
        const dbHash = this.hashSnapshot({
          handle: latestSnapshot.handle,
          xUserId: latestSnapshot.xUserId,
          displayName: latestSnapshot.displayName,
          bio: latestSnapshot.bio,
          avatarUrl: latestSnapshot.avatarUrl
        });

        if (dbHash === currentHash) {
          hasChanged = false;
        }
      }

      if (hasChanged) {
        await prisma.xIdentitySnapshot.create({
          data: {
            handle: data.handle,
            xUserId: data.xUserId,
            displayName: data.displayName || '',
            bio: data.bio || '',
            avatarUrl: data.avatarUrl || ''
          }
        });
        this.logger.debug(`[UserSnapshotService] New snapshot saved for user ${data.handle} (${data.xUserId})`);
      }

      // Update cache
      this.snapshotCache.set(data.xUserId, currentHash);
      
      // Prevent memory leak
      if (this.snapshotCache.size > 20000) {
        const firstKey = this.snapshotCache.keys().next().value;
        if (firstKey) this.snapshotCache.delete(firstKey);
      }

      return hasChanged;
    } catch (err) {
      this.logger.error({ err }, '[UserSnapshotService] Failed to take snapshot');
      return false;
    }
  }
}
