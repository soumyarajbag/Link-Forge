import { ObjectId } from 'mongodb';
import { BaseMongoRepository } from './base.repository.js';
import type { ApiKeyDocument } from '../models/api-key.model.js';
import { collections } from '../models/collections.js';

export interface ApiKeyRepository {
  create(key: Omit<ApiKeyDocument, '_id'>): Promise<ApiKeyDocument>;
  findByHash(hash: string): Promise<ApiKeyDocument | null>;
  list(workspaceId: ObjectId): Promise<ApiKeyDocument[]>;
  revoke(id: ObjectId): Promise<void>;
  touch(id: ObjectId, at: Date): Promise<void>;
}

export class MongoApiKeyRepository extends BaseMongoRepository implements ApiKeyRepository {
  async create(key: Omit<ApiKeyDocument, '_id'>) {
    return this.insert<ApiKeyDocument>(collections.apiKeys, key);
  }
  async findByHash(hash: string) {
    return this.collection<ApiKeyDocument>(collections.apiKeys).findOne({ secret_hash: hash, revoked_at: { $exists: false } });
  }
  async list(workspaceId: ObjectId) {
    return this.collection<ApiKeyDocument>(collections.apiKeys)
      .find({ workspace_id: workspaceId, revoked_at: { $exists: false } })
      .sort({ created_at: -1 })
      .toArray();
  }
  async revoke(id: ObjectId) {
    await this.collection<ApiKeyDocument>(collections.apiKeys).updateOne({ _id: id }, { $set: { revoked_at: new Date() } });
  }
  async touch(id: ObjectId, at: Date) {
    await this.collection<ApiKeyDocument>(collections.apiKeys).updateOne({ _id: id }, { $set: { last_used_at: at } });
  }
}
