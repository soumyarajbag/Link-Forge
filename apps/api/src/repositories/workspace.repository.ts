import { ObjectId } from 'mongodb';
import { BaseMongoRepository } from './base.repository.js';
import type { DomainDocument } from '../models/domain.model.js';
import type { ListOptions } from '../models/list-options.model.js';
import type { MemberDocument } from '../models/member.model.js';
import type { WorkspaceDocument } from '../models/workspace.model.js';
import type { WorkspaceInvitationDocument } from '../models/workspace-invitation.model.js';
import { collections } from '../models/collections.js';

export interface WorkspaceRepository {
  createWorkspace(workspace: Omit<WorkspaceDocument, '_id'>): Promise<WorkspaceDocument>;
  findWorkspace(id: ObjectId): Promise<WorkspaceDocument | null>;
  updateWorkspace(workspace: WorkspaceDocument): Promise<void>;
  listForUser(userId: ObjectId): Promise<WorkspaceDocument[]>;
  list(options: ListOptions): Promise<{ items: WorkspaceDocument[]; total: number }>;
  findMember(workspaceId: ObjectId, userId: ObjectId): Promise<MemberDocument | null>;
  listMembers(workspaceId: ObjectId): Promise<MemberDocument[]>;
  upsertMember(member: Omit<MemberDocument, '_id'>): Promise<void>;
  updateMember(member: MemberDocument): Promise<void>;
  deleteMember(id: ObjectId): Promise<void>;
  createInvitation(invitation: Omit<WorkspaceInvitationDocument, '_id'>): Promise<WorkspaceInvitationDocument>;
  findInvitationById(id: ObjectId): Promise<WorkspaceInvitationDocument | null>;
  findInvitationByTokenHash(tokenHash: string): Promise<WorkspaceInvitationDocument | null>;
  findPendingInvitation(workspaceId: ObjectId, email: string): Promise<WorkspaceInvitationDocument | null>;
  listInvitations(workspaceId: ObjectId): Promise<WorkspaceInvitationDocument[]>;
  updateInvitation(invitation: WorkspaceInvitationDocument): Promise<void>;
  deleteInvitation(id: ObjectId): Promise<void>;
  createDomain(domain: Omit<DomainDocument, '_id'>): Promise<DomainDocument>;
  findDomain(id: ObjectId): Promise<DomainDocument | null>;
  findDomainByHost(hostname: string): Promise<DomainDocument | null>;
  listDomains(workspaceId: ObjectId): Promise<DomainDocument[]>;
  updateDomain(domain: DomainDocument): Promise<void>;
  deleteDomain(id: ObjectId): Promise<void>;
}

export class MongoWorkspaceRepository extends BaseMongoRepository implements WorkspaceRepository {
  async createWorkspace(workspace: Omit<WorkspaceDocument, '_id'>) {
    return this.insert<WorkspaceDocument>(collections.workspaces, workspace);
  }
  async findWorkspace(id: ObjectId) {
    return this.collection<WorkspaceDocument>(collections.workspaces).findOne({ _id: id });
  }
  async updateWorkspace(workspace: WorkspaceDocument) {
    await this.collection<WorkspaceDocument>(collections.workspaces).replaceOne({ _id: workspace._id }, workspace);
  }
  async listForUser(userId: ObjectId) {
    const members = await this.collection<MemberDocument>(collections.members).find({ user_id: userId }).toArray();
    if (!members.length) return [];
    return this.collection<WorkspaceDocument>(collections.workspaces)
      .find({ _id: { $in: members.map((member) => member.workspace_id) }, status: 'active' })
      .sort({ created_at: 1 })
      .toArray();
  }
  async list(options: ListOptions): Promise<{ items: WorkspaceDocument[]; total: number }> {
    const filter: any = {};
    if (options.search) {
      const search = this.searchRegex(options.search);
      filter.$or = [{ name: search }, { slug: search }];
    }
    return this.paginate<WorkspaceDocument>(collections.workspaces, filter, options);
  }
  async findMember(workspaceId: ObjectId, userId: ObjectId) {
    return this.collection<MemberDocument>(collections.members).findOne({ workspace_id: workspaceId, user_id: userId });
  }
  async listMembers(workspaceId: ObjectId) {
    return this.collection<MemberDocument>(collections.members).find({ workspace_id: workspaceId }).sort({ created_at: 1 }).toArray();
  }
  async upsertMember(member: Omit<MemberDocument, '_id'>) {
    await this.collection<MemberDocument>(collections.members).updateOne(
      { workspace_id: member.workspace_id, user_id: member.user_id },
      { $set: member, $setOnInsert: { _id: new ObjectId() } },
      { upsert: true },
    );
  }
  async updateMember(member: MemberDocument) {
    await this.collection<MemberDocument>(collections.members).replaceOne({ _id: member._id }, member);
  }
  async deleteMember(id: ObjectId) {
    await this.collection<MemberDocument>(collections.members).deleteOne({ _id: id });
  }
  async createInvitation(invitation: Omit<WorkspaceInvitationDocument, '_id'>) {
    return this.insert<WorkspaceInvitationDocument>(collections.invitations, invitation);
  }
  async findInvitationById(id: ObjectId) {
    return this.collection<WorkspaceInvitationDocument>(collections.invitations).findOne({ _id: id });
  }
  async findInvitationByTokenHash(tokenHash: string) {
    return this.collection<WorkspaceInvitationDocument>(collections.invitations).findOne({ token_hash: tokenHash });
  }
  async findPendingInvitation(workspaceId: ObjectId, email: string) {
    return this.collection<WorkspaceInvitationDocument>(collections.invitations).findOne({
      workspace_id: workspaceId,
      email,
      status: 'pending',
      expires_at: { $gt: new Date() },
    });
  }
  async listInvitations(workspaceId: ObjectId) {
    return this.collection<WorkspaceInvitationDocument>(collections.invitations)
      .find({ workspace_id: workspaceId, status: 'pending', expires_at: { $gt: new Date() } })
      .sort({ created_at: -1 })
      .toArray();
  }
  async updateInvitation(invitation: WorkspaceInvitationDocument) {
    await this.collection<WorkspaceInvitationDocument>(collections.invitations).replaceOne({ _id: invitation._id }, invitation);
  }
  async deleteInvitation(id: ObjectId) {
    await this.collection<WorkspaceInvitationDocument>(collections.invitations).deleteOne({ _id: id });
  }
  async createDomain(domain: Omit<DomainDocument, '_id'>) {
    return this.insert<DomainDocument>(collections.domains, domain);
  }
  async findDomain(id: ObjectId) {
    return this.collection<DomainDocument>(collections.domains).findOne({ _id: id });
  }
  async findDomainByHost(hostname: string) {
    return this.collection<DomainDocument>(collections.domains).findOne({ hostname, status: 'active' });
  }
  async listDomains(workspaceId: ObjectId) {
    return this.collection<DomainDocument>(collections.domains).find({ workspace_id: workspaceId }).sort({ created_at: 1 }).toArray();
  }
  async updateDomain(domain: DomainDocument) {
    await this.collection<DomainDocument>(collections.domains).replaceOne({ _id: domain._id }, domain);
  }
  async deleteDomain(id: ObjectId) {
    await this.collection<DomainDocument>(collections.domains).deleteOne({ _id: id });
  }
}
