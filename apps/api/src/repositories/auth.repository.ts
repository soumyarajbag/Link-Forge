import { ObjectId } from 'mongodb';
import { BaseMongoRepository } from './base.repository.js';
import type { UserDocument } from '../models/user.model.js';
import type { SessionDocument } from '../models/session.model.js';
import type { ListOptions } from '../models/list-options.model.js';
import { collections } from '../models/collections.js';

export interface AuthRepository {
  createUser(user: Omit<UserDocument, '_id'>): Promise<UserDocument>;
  findUserByEmail(email: string): Promise<UserDocument | null>;
  findUserById(id: ObjectId): Promise<UserDocument | null>;
  findUserByVerification(hash: string): Promise<UserDocument | null>;
  findUserByReset(hash: string): Promise<UserDocument | null>;
  updateUser(user: UserDocument): Promise<void>;
  createSession(session: Omit<SessionDocument, '_id'>): Promise<SessionDocument>;
  findSessionByHash(hash: string): Promise<SessionDocument | null>;
  touchSession(id: ObjectId, at: Date): Promise<void>;
  revokeSession(id: ObjectId): Promise<void>;
  revokeAllSessions(userId: ObjectId): Promise<void>;
  listSessions(userId: ObjectId): Promise<SessionDocument[]>;
  listUsers(options: ListOptions): Promise<{ items: UserDocument[]; total: number }>;
}

export class MongoAuthRepository extends BaseMongoRepository implements AuthRepository {
  async createUser(user: Omit<UserDocument, '_id'>) {
    return this.insert<UserDocument>(collections.users, user);
  }
  async findUserByEmail(email: string) {
    return this.collection<UserDocument>(collections.users).findOne({ email, deleted_at: { $exists: false } });
  }
  async findUserById(id: ObjectId) {
    return this.collection<UserDocument>(collections.users).findOne({ _id: id, deleted_at: { $exists: false } });
  }
  async findUserByVerification(hash: string) {
    return this.collection<UserDocument>(collections.users).findOne({
      email_verification_hash: hash,
      email_verification_expires_at: { $gt: new Date() },
      deleted_at: { $exists: false },
    });
  }
  async findUserByReset(hash: string) {
    return this.collection<UserDocument>(collections.users).findOne({
      password_reset_hash: hash,
      password_reset_expires_at: { $gt: new Date() },
      deleted_at: { $exists: false },
    });
  }
  async updateUser(user: UserDocument) {
    await this.collection<UserDocument>(collections.users).replaceOne({ _id: user._id }, user);
  }
  async createSession(session: Omit<SessionDocument, '_id'>) {
    return this.insert<SessionDocument>(collections.sessions, session);
  }
  async findSessionByHash(hash: string) {
    return this.collection<SessionDocument>(collections.sessions).findOne({ token_hash: hash });
  }
  async touchSession(id: ObjectId, at: Date) {
    await this.collection<SessionDocument>(collections.sessions).updateOne({ _id: id }, { $set: { last_used_at: at } });
  }
  async revokeSession(id: ObjectId) {
    await this.collection<SessionDocument>(collections.sessions).updateOne({ _id: id }, { $set: { revoked_at: new Date() } });
  }
  async revokeAllSessions(userId: ObjectId) {
    await this.collection<SessionDocument>(collections.sessions).updateMany(
      { user_id: userId, revoked_at: { $exists: false } },
      { $set: { revoked_at: new Date() } },
    );
  }
  async listSessions(userId: ObjectId) {
    return this.collection<SessionDocument>(collections.sessions)
      .find({ user_id: userId, revoked_at: { $exists: false }, expires_at: { $gt: new Date() } })
      .sort({ created_at: -1 })
      .toArray();
  }
  async listUsers(options: ListOptions): Promise<{ items: UserDocument[]; total: number }> {
    const filter: any = {};
    if (options.search) {
      const search = this.searchRegex(options.search);
      filter.$or = [{ email: search }, { display_name: search }];
    }
    return this.paginate<UserDocument>(collections.users, filter, options);
  }
}
