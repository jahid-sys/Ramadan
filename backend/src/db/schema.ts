import { pgTable, text, timestamp, uuid, decimal } from 'drizzle-orm/pg-core';

export const userLocations = pgTable('user_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id'),
  country: text('country').notNull(),
  city: text('city').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 6 }).notNull(),
  longitude: decimal('longitude', { precision: 10, scale: 6 }).notNull(),
  timezone: text('timezone').notNull(),
  calculationMethod: text('calculation_method').default('MWL').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
