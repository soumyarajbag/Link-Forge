import 'dotenv/config';
import express from 'express';
import { createApp } from './express-app.js';
import { loadConfig } from './config/env.js';
import { createContainer } from './container.js';
import { MongoDatabase } from './config/database.js';

// Keep a direct Express import in the entrypoint so Vercel can identify this
// file as the Express application entrypoint.
void express;

export const app = express();

let initPromise: Promise<express.Express> | undefined;
async function getInitializedApp() {
  initPromise ??= (async () => {
    const config = loadConfig();
    const database = await MongoDatabase.connect(config);
    const container = createContainer(config, database);
    await container.services.authService.seedAdmin();
    return createApp(container);
  })();
  return initPromise;
}

app.use(async (req, res, next) => {
  try {
    const instance = await getInitializedApp();
    return instance(req, res, next);
  } catch (error) {
    return next(error);
  }
});

export default app;
