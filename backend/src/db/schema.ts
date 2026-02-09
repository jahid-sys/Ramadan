import { pgTable, text, timestamp, uuid, decimal, integer } from 'drizzle-orm/pg-core';

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

export const azanAudio = pgTable('azan_audio', {
  id: uuid('id').primaryKey().defaultRandom(),
  filename: text('filename').notNull(),
  storageKey: text('storage_key').notNull(),
  mimetype: text('mimetype').notNull(),
  fileSize: integer('file_size').notNull(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
});

export const quranVerses = pgTable('quran_verses', {
  id: uuid('id').primaryKey().defaultRandom(),
  surahNumber: integer('surah_number').notNull(),
  ayahNumber: integer('ayah_number').notNull(),
  arabicText: text('arabic_text').notNull(),
  englishTranslation: text('english_translation').notNull(),
  surahNameArabic: text('surah_name_arabic').notNull(),
  surahNameEnglish: text('surah_name_english').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
