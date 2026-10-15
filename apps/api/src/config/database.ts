import { Db, MongoClient, Document, IndexDescription, ObjectId } from 'mongodb';
import type { AppConfig } from './env.js';

export class MongoDatabase {
  private constructor(
    public readonly client: MongoClient,
    public readonly db: Db,
  ) {}

  static async connect(config: AppConfig): Promise<MongoDatabase> {
    const client = new MongoClient(config.mongoUri, { maxPoolSize: 20, serverSelectionTimeoutMS: 5_000 });
    await client.connect();
    const db = client.db(config.database);
    await db.command({ ping: 1 });
    const database = new MongoDatabase(client, db);
    await database.ensureIndexes();
    return database;
  }

  collection<T extends Document = Document>(name: string) {
    return this.db.collection<T>(name);
  }
  async close(): Promise<void> {
    await this.client.close();
  }

  private async ensureIndexes(): Promise<void> {
    const definitions: Record<string, IndexDescription[]> = {
      users: [{ key: { email: 1 }, unique: true }, { key: { status: 1, created_at: -1 } }],
      workspaces: [{ key: { slug: 1 }, unique: true }],
      workspace_members: [{ key: { workspace_id: 1, user_id: 1 }, unique: true }, { key: { user_id: 1, created_at: -1 } }],
      workspace_invitations: [
        { key: { token_hash: 1 }, unique: true },
        { key: { workspace_id: 1, email: 1, status: 1 } },
        { key: { expires_at: 1 }, expireAfterSeconds: 0 },
      ],
      domains: [{ key: { hostname: 1 }, unique: true }, { key: { workspace_id: 1, status: 1 } }],
      links: [
        { key: { hostname: 1, slug: 1 }, unique: true },
        { key: { workspace_id: 1, updated_at: -1 } },
        { key: { workspace_id: 1, state: 1, updated_at: -1 } },
      ],
      sessions: [
        { key: { token_hash: 1 }, unique: true },
        { key: { expires_at: 1 }, expireAfterSeconds: 0 },
        { key: { user_id: 1, created_at: -1 } },
      ],
      click_events: [
        { key: { link_id: 1, occurred_at: -1 } },
        { key: { workspace_id: 1, occurred_at: -1 } },
        { key: { retention_until: 1 }, expireAfterSeconds: 0 },
      ],
      api_keys: [{ key: { secret_hash: 1 }, unique: true }, { key: { workspace_id: 1, created_at: -1 } }],
      audit_logs: [{ key: { created_at: -1 } }, { key: { workspace_id: 1, created_at: -1 } }],
      blocked_destinations: [{ key: { pattern: 1 }, unique: true }],
      abuse_reports: [{ key: { status: 1, created_at: -1 } }],
    };
    for (const [collection, indexes] of Object.entries(definitions)) await this.collection(collection).createIndexes(indexes);
  }
}

export function isDuplicateKey(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: number }).code === 11000);
}
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
export function idFilter(id: ObjectId): { _id: ObjectId } {
  return { _id: id };
}
