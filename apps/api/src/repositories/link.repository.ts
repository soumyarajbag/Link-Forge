import { ObjectId } from 'mongodb';
import { BaseMongoRepository } from './base.repository.js';
import type { LinkDocument, RoutingRule } from '../models/link.model.js';
import type { ListOptions } from '../models/list-options.model.js';
import { collections } from '../models/collections.js';

export interface LinkRepository {
  create(link: Omit<LinkDocument, '_id'>): Promise<LinkDocument>;
  findById(id: ObjectId): Promise<LinkDocument | null>;
  findByHostSlug(hostname: string, slug: string): Promise<LinkDocument | null>;
  list(workspaceId: ObjectId, options: ListOptions): Promise<{ items: LinkDocument[]; total: number }>;
  update(link: LinkDocument): Promise<void>;
  incrementClicks(id: ObjectId, at: Date): Promise<void>;
}

export class MongoLinkRepository extends BaseMongoRepository implements LinkRepository {
  async create(link: Omit<LinkDocument, '_id'>) {
    return this.insert<LinkDocument>(collections.links, link);
  }
  async findById(id: ObjectId) {
    return this.collection<LinkDocument>(collections.links).findOne({ _id: id, deleted_at: { $exists: false } });
  }
  async findByHostSlug(hostname: string, slug: string) {
    return this.collection<LinkDocument>(collections.links).findOne({ hostname, slug, deleted_at: { $exists: false } });
  }
  async list(workspaceId: ObjectId, options: ListOptions): Promise<{ items: LinkDocument[]; total: number }> {
    const filter: any = { workspace_id: workspaceId, deleted_at: { $exists: false } };
    if (options.state) filter.state = options.state;
    if (options.search) {
      const search = this.searchRegex(options.search);
      filter.$or = [{ slug: search }, { destination_url: search }, { title: search }];
    }
    return this.paginate<LinkDocument>(collections.links, filter, options);
  }
  async update(link: LinkDocument) {
    await this.collection<LinkDocument>(collections.links).replaceOne({ _id: link._id }, link);
  }
  async incrementClicks(id: ObjectId, at: Date) {
    await this.collection<LinkDocument>(collections.links).updateOne(
      { _id: id },
      { $inc: { click_count: 1 }, $set: { last_clicked_at: at } },
    );
  }
}
