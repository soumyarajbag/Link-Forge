import { ObjectId } from 'mongodb';
import { BaseMongoRepository } from './base.repository.js';
import type { ClickEventDocument } from '../models/click-event.model.js';
import { collections } from '../models/collections.js';

export type AnalyticsSummary = {
  clicks: number;
  unique_clicks: number;
  by_day: Array<{ date: string; clicks: number }>;
  by_country: Array<{ name: string; count: number }>;
  by_device: Array<{ name: string; count: number }>;
  by_referrer: Array<{ name: string; count: number }>;
};

export class MongoAnalyticsRepository extends BaseMongoRepository {
  async createEvent(event: Omit<ClickEventDocument, '_id' | 'created_at' | 'updated_at'>) {
    return this.insert<ClickEventDocument>(collections.clickEvents, {
      ...event,
      created_at: event.occurred_at,
      updated_at: event.occurred_at,
    });
  }
  async summary(linkId: ObjectId, from: Date, to: Date): Promise<AnalyticsSummary> {
    const filter = { link_id: linkId, occurred_at: { $gte: from, $lt: to } };
    const [clicks, uniqueClicks, byDay, byCountry, byDevice, byReferrer] = await Promise.all([
      this.collection<ClickEventDocument>(collections.clickEvents).countDocuments(filter),
      this.collection<ClickEventDocument>(collections.clickEvents).countDocuments({ ...filter, is_unique: true }),
      this.group(filter, { $dateToString: { format: '%Y-%m-%d', date: '$occurred_at' } }, 'date'),
      this.group(filter, '$country', 'name'),
      this.group(filter, '$device_class', 'name'),
      this.group(filter, '$referrer_host', 'name'),
    ]);
    return {
      clicks,
      unique_clicks: uniqueClicks,
      by_day: byDay.map((row) => ({ date: row.value, clicks: row.count })),
      by_country: byCountry.map((row) => ({ name: row.value, count: row.count })),
      by_device: byDevice.map((row) => ({ name: row.value, count: row.count })),
      by_referrer: byReferrer.map((row) => ({ name: row.value, count: row.count })),
    };
  }
  private async group(filter: Record<string, unknown>, groupBy: unknown, _key: string): Promise<Array<{ value: string; count: number }>> {
    const rows = await this.collection<ClickEventDocument>(collections.clickEvents)
      .aggregate<{ _id?: string; count: number }>([
        { $match: filter },
        { $group: { _id: groupBy, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();
    return rows.map((row) => ({ value: row._id || 'unknown', count: row.count }));
  }
}
