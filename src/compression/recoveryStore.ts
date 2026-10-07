import * as crypto from 'node:crypto';
import type { IRecoveryRecord } from '../storage/schemas.ts';
import type { CortexDatabase } from '../storage/database.ts';

export class RecoveryStore {
  private db: CortexDatabase;

  constructor(db: CortexDatabase) {
    this.db = db;
  }

  public store(
    payload: string,
    strategy: string,
    compressedLength: number
  ): { handle: string; sha256: string } {
    const sha256 = crypto.createHash('sha256').update(payload, 'utf-8').digest('hex');
    const handle = `CF_REC_${sha256.slice(0, 8).toUpperCase()}`;

    const record: IRecoveryRecord = {
      handle,
      originalSize: payload.length,
      compressedSize: compressedLength,
      sha256,
      payload,
      strategy,
      createdAt: Date.now(),
    };

    this.db.saveRecovery(record);
    return { handle, sha256 };
  }

  public recover(handle: string): { success: boolean; payload?: string; error?: string } {
    const record = this.db.getRecovery(handle);
    if (!record) {
      return { success: false, error: `Recovery handle '${handle}' not found in local cache.` };
    }

    // Verify SHA-256 integrity
    const verifyHash = crypto.createHash('sha256').update(record.payload, 'utf-8').digest('hex');
    if (verifyHash !== record.sha256) {
      return { success: false, error: `Integrity check failed for '${handle}': checksum mismatch.` };
    }

    return { success: true, payload: record.payload };
  }
}
