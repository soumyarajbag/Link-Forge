import type { ObjectId } from 'mongodb';

export type BaseDocument = {
  _id: ObjectId;
  created_at: Date;
  updated_at?: Date;
};
