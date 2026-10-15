import type { BaseDocument } from './base.model.js';

export type WorkspaceDocument = BaseDocument & {
  name: string;
  slug: string;
  plan: string;
  status: 'active' | 'suspended';
};
