import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function register(app: App, fastify: FastifyInstance) {
  // GET /api/azan-audio - Get the current Azan audio URL
  fastify.get('/api/azan-audio', {
    schema: {
      description: 'Get the uploaded Azan audio URL',
      tags: ['azan-audio'],
      response: {
        200: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            filename: { type: 'string', nullable: true },
            uploadedAt: { type: 'string', nullable: true },
          },
        },
        500: { type: 'object' },
      },
    },
  }, async (request, reply) => {
    app.logger.info({}, 'Fetching Azan audio URL');

    try {
      // Get the most recently uploaded Azan audio from database
      const result = await app.db
        .select()
        .from(schema.azanAudio)
        .orderBy(desc(schema.azanAudio.uploadedAt))
        .limit(1);

      const azanAudio = result[0];

      if (azanAudio) {
        // Generate a signed URL for the audio file
        const { url } = await app.storage.getSignedUrl(azanAudio.storageKey);

        app.logger.info(
          { audioId: azanAudio.id, filename: azanAudio.filename },
          'Azan audio URL retrieved successfully'
        );

        return {
          url,
          filename: azanAudio.filename,
          uploadedAt: azanAudio.uploadedAt.toISOString(),
        };
      } else {
        // No audio uploaded yet - return empty string
        app.logger.info({}, 'No Azan audio found, returning empty URL');
        return {
          url: '',
          filename: null,
          uploadedAt: null,
        };
      }
    } catch (error) {
      app.logger.error(
        { err: error },
        'Failed to fetch Azan audio URL'
      );
      return reply.code(500).send({
        error: 'Failed to fetch Azan audio URL',
      });
    }
  });

  // POST /api/azan-audio/upload - Upload or update Azan audio
  fastify.post('/api/azan-audio/upload', {
    schema: {
      description: 'Upload or update Azan audio file',
      tags: ['azan-audio'],
      consumes: ['multipart/form-data'],
      response: {
        200: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            filename: { type: 'string' },
            uploadedAt: { type: 'string' },
          },
        },
        400: { type: 'object' },
        413: { type: 'object' },
        500: { type: 'object' },
      },
    },
  }, async (request, reply) => {
    app.logger.info({}, 'Uploading Azan audio');

    try {
      // Get the uploaded file with size limit (10MB for audio files)
      const data = await request.file({ limits: { fileSize: 10 * 1024 * 1024 } });

      if (!data) {
        app.logger.warn({}, 'No file provided in upload request');
        return reply.code(400).send({
          error: 'No file provided',
        });
      }

      app.logger.info(
        { filename: data.filename, mimetype: data.mimetype },
        'Processing uploaded audio file'
      );

      // Validate that it's an audio file
      if (!data.mimetype.startsWith('audio/')) {
        app.logger.warn(
          { mimetype: data.mimetype },
          'Invalid file type - not an audio file'
        );
        return reply.code(400).send({
          error: 'Invalid file type. Please upload an audio file.',
        });
      }

      // Convert file stream to buffer
      let buffer: Buffer;
      try {
        buffer = await data.toBuffer();
      } catch (err) {
        app.logger.error(
          { err },
          'File too large or failed to read'
        );
        return reply.code(413).send({
          error: 'File too large. Maximum size is 10MB.',
        });
      }

      // Generate a unique storage key for the audio file
      const timestamp = Date.now();
      const storageKey = `azan-audio/${timestamp}-${data.filename}`;

      // Upload to storage
      const uploadedKey = await app.storage.upload(storageKey, buffer);

      app.logger.info(
        { storageKey: uploadedKey, fileSize: buffer.length },
        'Audio file uploaded to storage'
      );

      // Save metadata to database
      const inserted = await app.db
        .insert(schema.azanAudio)
        .values({
          filename: data.filename,
          storageKey: uploadedKey,
          mimetype: data.mimetype,
          fileSize: buffer.length,
        })
        .returning();

      const savedAudio = inserted[0];

      // Generate signed URL for immediate use
      const { url } = await app.storage.getSignedUrl(uploadedKey);

      app.logger.info(
        { audioId: savedAudio.id, filename: savedAudio.filename },
        'Azan audio uploaded successfully'
      );

      return {
        url,
        filename: savedAudio.filename,
        uploadedAt: savedAudio.uploadedAt.toISOString(),
      };
    } catch (error) {
      app.logger.error(
        { err: error },
        'Failed to upload Azan audio'
      );
      return reply.code(500).send({
        error: 'Failed to upload Azan audio',
      });
    }
  });
}
