import { createApplication } from "@specific-dev/framework";
import * as schema from './db/schema.js';
import { register as registerPrayerTimesRoutes } from './routes/prayer-times.js';
import { register as registerAzanAudioRoutes } from './routes/azan-audio.js';

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable storage for file uploads
app.withStorage();

// Register routes - add your route modules here
// IMPORTANT: Always use registration functions to avoid circular dependency issues
registerPrayerTimesRoutes(app, app.fastify);
registerAzanAudioRoutes(app, app.fastify);

await app.run();
app.logger.info('Application running');
