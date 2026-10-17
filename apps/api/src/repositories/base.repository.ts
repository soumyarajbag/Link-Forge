import type { Document, Filter, OptionalId, OptionalUnlessRequiredId } from 'mongodb';
import { ObjectId } from 'mongodb';
import { MongoDatabase } from '../config/database.js';
import type { ListOptions } from '../models/list-options.model.js';
import { escapeRegex } from '../config/database.js';

export abstract class BaseMongoRepository {
  constructor(protected readonly database: MongoDatabase) {}
  protected collection<T extends Document = Document>(name: string) {
    return this.database.collection<T>(name);
  }
  protected async insert<T extends Document>(collection: string, value: OptionalId<T>): Promise<T & { _id: ObjectId }> {
    const item = { ...value, _id: (value as Partial<T & { _id: ObjectId }>)._id || new ObjectId() } as T & { _id: ObjectId };
    await this.collection<T>(collection).insertOne(item as OptionalUnlessRequiredId<T>);
    return item;
  }
  protected async paginate<T extends Document>(
    collection: string,
    filter: Filter<T>,
    options: ListOptions,
  ): Promise<{ items: T[]; total: number }> {
    const total = await this.collection<T>(collection).countDocuments(filter);
    const items = await this.collection<T>(collection)
      .find(filter)
      .sort({ updated_at: -1, created_at: -1 })
      .skip((options.page - 1) * options.pageSize)
      .limit(options.pageSize)
      .toArray();
    return { items: items as T[], total };
  }
  protected searchRegex(value: string): RegExp {
    return new RegExp(escapeRegex(value), 'i');
  }
}
