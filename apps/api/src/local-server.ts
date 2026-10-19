import 'dotenv/config';
import { createApp } from './express-app.js';
import { loadConfig } from './config/env.js';
import { createContainer } from './container.js';
import { MongoDatabase } from './config/database.js';

const config = loadConfig();
const database = await MongoDatabase.connect(config);
const container = createContainer(config, database);
await container.services.authService.seedAdmin();
const app = createApp(container);
const server = app.listen(config.port, () => console.log(JSON.stringify({ level: 'info', message: 'api listening', port: config.port })));

async function shutdown(signal: string) {
  console.log(JSON.stringify({ level: 'info', message: 'shutting down', signal }));
  server.close(async () => {
    await database.close();
    process.exit(0);
  });
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
