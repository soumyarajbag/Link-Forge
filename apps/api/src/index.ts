import 'dotenv/config';
import { createApp } from './express-app.js';
import { loadConfig } from './config/env.js';
import { createContainer } from './container.js';
import { MongoDatabase } from './config/database.js';

type VercelRequest = { url?: string; headers: Record<string, string | string[] | undefined> };
type VercelResponse = { statusCode?: number; setHeader(name: string, value: string | string[]): void; end(...args: unknown[]): void };

let appPromise: Promise<ReturnType<typeof createApp>> | undefined;
async function getApp() {
  appPromise ??= (async () => {
    const config = loadConfig();
    const database = await MongoDatabase.connect(config);
    const container = createContainer(config, database);
    await container.services.authService.seedAdmin();
    return createApp(container);
  })();
  return appPromise;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const routeUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const route = routeUrl.searchParams.get('route');
  if (route) {
    routeUrl.searchParams.delete('route');
    request.url = `${route}${routeUrl.searchParams.toString() ? `?${routeUrl.searchParams.toString()}` : ''}`;
  }
  return (await getApp())(request as never, response as never);
}
