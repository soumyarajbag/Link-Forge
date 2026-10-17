import { ObjectId } from 'mongodb';
import { BaseMongoRepository } from './base.repository.js';
import type { AbuseReportDocument } from '../models/abuse-report.model.js';
import type { AuditLogDocument } from '../models/audit-log.model.js';
import type { BlockedDestinationDocument } from '../models/blocked-destination.model.js';
import type { LinkDocument } from '../models/link.model.js';
import type { ListOptions } from '../models/list-options.model.js';
import type { WorkspaceDocument } from '../models/workspace.model.js';
import { collections } from '../models/collections.js';

export interface AdminRepository {
  createAudit(log: Omit<AuditLogDocument, '_id'>): Promise<AuditLogDocument>;
  listAudit(options: ListOptions): Promise<{
    items: Array<
      AuditLogDocument & {
        actor?: { display_name: string; email: string };
        workspace?: { name: string; slug: string };
      }
    >;
    total: number;
  }>;
  createBlocked(item: Omit<BlockedDestinationDocument, '_id'>): Promise<BlockedDestinationDocument>;
  listBlocked(): Promise<BlockedDestinationDocument[]>;
  isBlocked(destination: string): Promise<boolean>;
  createAbuse(report: Omit<AbuseReportDocument, '_id'>): Promise<AbuseReportDocument>;
  findAbuse(id: ObjectId): Promise<AbuseReportDocument | null>;
  listAbuse(options: ListOptions): Promise<{ items: AbuseReportDocument[]; total: number }>;
  updateAbuse(report: AbuseReportDocument): Promise<void>;
  countAll(): Promise<Record<string, number>>;
  listWorkspaces(options: ListOptions): Promise<{ items: WorkspaceDocument[]; total: number }>;
  listLinks(options: ListOptions): Promise<{ items: LinkDocument[]; total: number }>;
}

export class MongoAdminRepository extends BaseMongoRepository implements AdminRepository {
  async createAudit(log: Omit<AuditLogDocument, '_id'>) {
    return this.insert<AuditLogDocument>(collections.auditLogs, log);
  }
  async listAudit(options: ListOptions) {
    const collection = this.collection<AuditLogDocument>(collections.auditLogs);
    const total = await collection.countDocuments({});
    const items = await collection
      .aggregate<
        AuditLogDocument & {
          actor?: { display_name: string; email: string };
          workspace?: { name: string; slug: string };
        }
      >([
        { $sort: { created_at: -1 } },
        { $skip: (options.page - 1) * options.pageSize },
        { $limit: options.pageSize },
        {
          $lookup: {
            from: collections.users,
            let: { actorId: '$actor_id' },
            pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$actorId'] } } }, { $project: { _id: 0, display_name: 1, email: 1 } }],
            as: 'actor_matches',
          },
        },
        {
          $lookup: {
            from: collections.workspaces,
            let: { workspaceId: '$workspace_id' },
            pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$workspaceId'] } } }, { $project: { _id: 0, name: 1, slug: 1 } }],
            as: 'workspace_matches',
          },
        },
        {
          $set: {
            actor: { $arrayElemAt: ['$actor_matches', 0] },
            workspace: { $arrayElemAt: ['$workspace_matches', 0] },
          },
        },
        { $unset: ['actor_matches', 'workspace_matches'] },
      ])
      .toArray();
    return { items, total };
  }
  async createBlocked(item: Omit<BlockedDestinationDocument, '_id'>) {
    return this.insert<BlockedDestinationDocument>(collections.blockedDestinations, item);
  }
  async listBlocked() {
    return this.collection<BlockedDestinationDocument>(collections.blockedDestinations).find({}).sort({ created_at: -1 }).toArray();
  }
  async isBlocked(destination: string) {
    const patterns = await this.listBlocked();
    return patterns.some((item) => destination.includes(item.pattern));
  }
  async createAbuse(report: Omit<AbuseReportDocument, '_id'>) {
    return this.insert<AbuseReportDocument>(collections.abuseReports, report);
  }
  async findAbuse(id: ObjectId) {
    return this.collection<AbuseReportDocument>(collections.abuseReports).findOne({ _id: id });
  }
  async listAbuse(options: ListOptions) {
    return this.paginate<AbuseReportDocument>(collections.abuseReports, {}, options);
  }
  async updateAbuse(report: AbuseReportDocument) {
    await this.collection<AbuseReportDocument>(collections.abuseReports).replaceOne({ _id: report._id }, report);
  }
  async countAll() {
    const names = [collections.users, collections.workspaces, collections.links, collections.clickEvents, collections.abuseReports];
    const entries = await Promise.all(names.map(async (name) => [name, await this.database.collection(name).countDocuments()] as const));
    return Object.fromEntries(entries);
  }
  async listWorkspaces(options: ListOptions) {
    const filter: any = {};
    if (options.search) {
      const search = this.searchRegex(options.search);
      filter.$or = [{ name: search }, { slug: search }];
    }
    if (options.state) filter.status = options.state;
    return this.paginate<WorkspaceDocument>(collections.workspaces, filter, options);
  }
  async listLinks(options: ListOptions) {
    const filter: any = {};
    if (options.search) {
      const search = this.searchRegex(options.search);
      filter.$or = [{ hostname: search }, { slug: search }, { destination_url: search }, { title: search }, { campaign: search }];
    }
    if (options.state) filter.state = options.state;
    return this.paginate<LinkDocument>(collections.links, filter, options);
  }
}
