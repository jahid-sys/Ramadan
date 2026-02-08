import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

// Aladhan API calculation method codes
const CALCULATION_METHODS = {
  'MWL': 2,      // Muslim World League
  'ISNA': 7,     // Islamic Society of North America
  'Egypt': 5,    // Egypt (Dar al-Ifta al-Misriyyah)
  'Makkah': 4,   // Makkah (Umm Al-Qura University)
  'Karachi': 1,  // Karachi (University of Karachi)
  'Tehran': 8,   // Tehran (Astute Calculation)
  'Jafari': 0,   // Jafari Shia Ithna-Ashari
};

interface AladhanResponse {
  data: {
    timings: {
      Fajr: string;
      Sunrise: string;
      Dhuhr: string;
      Asr: string;
      Maghrib: string;
      Isha: string;
      Imsak: string;
      Midnight: string;
    };
    date: {
      readable: string;
      timestamp: string;
      gregorian: {
        date: string;
      };
      hijri: {
        date: string;
      };
    };
  };
}

interface PrayerTimes {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  date: string;
  hijriDate: string;
}

interface CityResult {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

async function fetchPrayerTimesFromAladhan(
  latitude: number,
  longitude: number,
  date: string,
  method: string = 'MWL'
): Promise<PrayerTimes> {
  const methodCode = CALCULATION_METHODS[method as keyof typeof CALCULATION_METHODS] || 2;

  try {
    // Convert date from YYYY-MM-DD to DD-MM-YYYY format for Aladhan API
    const [year, month, day] = date.split('-');
    const formattedDate = `${day}-${month}-${year}`;

    const response = await fetch(
      `https://api.aladhan.com/v1/timings/${formattedDate}?latitude=${latitude}&longitude=${longitude}&method=${methodCode}`
    );

    if (!response.ok) {
      throw new Error(`Aladhan API returned status ${response.status}`);
    }

    const data = (await response.json()) as AladhanResponse;

    return {
      fajr: data.data.timings.Fajr,
      sunrise: data.data.timings.Sunrise,
      dhuhr: data.data.timings.Dhuhr,
      asr: data.data.timings.Asr,
      maghrib: data.data.timings.Maghrib,
      isha: data.data.timings.Isha,
      date: data.data.date.gregorian.date,
      hijriDate: data.data.date.hijri.date,
    };
  } catch (error) {
    throw error;
  }
}

async function searchCities(query: string): Promise<CityResult[]> {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`
    );

    if (!response.ok) {
      throw new Error(`Geocoding API returned status ${response.status}`);
    }

    const data: any = await response.json();

    if (!data.results) {
      return [];
    }

    // Map geocoding results to CityResult format
    return data.results.map((result: any) => ({
      city: result.name,
      country: result.country || '',
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone || 'UTC',
    }));
  } catch (error) {
    throw error;
  }
}

export function register(app: App, fastify: FastifyInstance) {
  // GET /api/prayer-times - Get prayer times for a specific date and location
  fastify.get<{
    Querystring: {
      latitude: string;
      longitude: string;
      date: string;
      method?: string;
    };
  }>('/api/prayer-times', {
    schema: {
      description: 'Get prayer times for a specific location and date',
      tags: ['prayer-times'],
      querystring: {
        type: 'object',
        properties: {
          latitude: { type: 'string', description: 'Latitude (decimal)' },
          longitude: { type: 'string', description: 'Longitude (decimal)' },
          date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
          method: { type: 'string', description: 'Calculation method (default: MWL)' },
        },
        required: ['latitude', 'longitude', 'date'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            fajr: { type: 'string' },
            sunrise: { type: 'string' },
            dhuhr: { type: 'string' },
            asr: { type: 'string' },
            maghrib: { type: 'string' },
            isha: { type: 'string' },
            date: { type: 'string' },
            hijriDate: { type: 'string' },
          },
        },
        400: { type: 'object' },
        500: { type: 'object' },
      },
    },
  }, async (request, reply) => {
    const { latitude, longitude, date, method = 'MWL' } = request.query;

    app.logger.info(
      { latitude, longitude, date, method },
      'Fetching prayer times'
    );

    try {
      if (!latitude || !longitude || !date) {
        app.logger.warn(
          { latitude, longitude, date },
          'Missing required prayer times query parameters'
        );
        return reply.code(400).send({
          error: 'Missing required parameters: latitude, longitude, date',
        });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        app.logger.warn(
          { latitude, longitude },
          'Invalid latitude or longitude values'
        );
        return reply.code(400).send({
          error: 'Invalid latitude or longitude values',
        });
      }

      // Validate date format YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        app.logger.warn({ date }, 'Invalid date format');
        return reply.code(400).send({
          error: 'Invalid date format. Use YYYY-MM-DD',
        });
      }

      const prayerTimes = await fetchPrayerTimesFromAladhan(lat, lng, date, method);

      app.logger.info(
        { date, hijriDate: prayerTimes.hijriDate },
        'Prayer times fetched successfully'
      );

      return prayerTimes;
    } catch (error) {
      app.logger.error(
        { err: error, latitude, longitude, date },
        'Failed to fetch prayer times'
      );
      return reply.code(500).send({
        error: 'Failed to fetch prayer times',
      });
    }
  });

  // GET /api/prayer-times/month - Get prayer times for entire month
  fastify.get<{
    Querystring: {
      latitude: string;
      longitude: string;
      month: string;
      year: string;
      method?: string;
    };
  }>('/api/prayer-times/month', {
    schema: {
      description: 'Get prayer times for an entire month',
      tags: ['prayer-times'],
      querystring: {
        type: 'object',
        properties: {
          latitude: { type: 'string', description: 'Latitude (decimal)' },
          longitude: { type: 'string', description: 'Longitude (decimal)' },
          month: { type: 'string', description: 'Month (1-12)' },
          year: { type: 'string', description: 'Year (e.g., 2024)' },
          method: { type: 'string', description: 'Calculation method (default: MWL)' },
        },
        required: ['latitude', 'longitude', 'month', 'year'],
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              fajr: { type: 'string' },
              sunrise: { type: 'string' },
              dhuhr: { type: 'string' },
              asr: { type: 'string' },
              maghrib: { type: 'string' },
              isha: { type: 'string' },
              hijriDate: { type: 'string' },
            },
          },
        },
        400: { type: 'object' },
        500: { type: 'object' },
      },
    },
  }, async (request, reply) => {
    const { latitude, longitude, month, year, method = 'MWL' } = request.query;

    app.logger.info(
      { latitude, longitude, month, year, method },
      'Fetching prayer times for month'
    );

    try {
      if (!latitude || !longitude || !month || !year) {
        app.logger.warn(
          { latitude, longitude, month, year },
          'Missing required month prayer times query parameters'
        );
        return reply.code(400).send({
          error: 'Missing required parameters: latitude, longitude, month, year',
        });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);

      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        app.logger.warn(
          { latitude, longitude },
          'Invalid latitude or longitude values'
        );
        return reply.code(400).send({
          error: 'Invalid latitude or longitude values',
        });
      }

      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        app.logger.warn({ month }, 'Invalid month value');
        return reply.code(400).send({
          error: 'Invalid month. Must be between 1 and 12',
        });
      }

      if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
        app.logger.warn({ year }, 'Invalid year value');
        return reply.code(400).send({
          error: 'Invalid year. Must be between 1900 and 2100',
        });
      }

      // Get the number of days in the month
      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
      const prayerTimesList: PrayerTimes[] = [];

      // Fetch prayer times for each day in the month
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        try {
          const prayerTimes = await fetchPrayerTimesFromAladhan(lat, lng, dateStr, method);
          prayerTimesList.push(prayerTimes);
        } catch (error) {
          app.logger.warn(
            { err: error, date: dateStr },
            'Failed to fetch prayer times for day'
          );
          // Continue fetching for other days
        }
      }

      app.logger.info(
        { month, year, count: prayerTimesList.length },
        'Prayer times for month fetched successfully'
      );

      return prayerTimesList;
    } catch (error) {
      app.logger.error(
        { err: error, latitude, longitude, month, year },
        'Failed to fetch prayer times for month'
      );
      return reply.code(500).send({
        error: 'Failed to fetch prayer times for month',
      });
    }
  });

  // GET /api/cities/search - Search cities by name
  fastify.get<{
    Querystring: {
      query: string;
    };
  }>('/api/cities/search', {
    schema: {
      description: 'Search cities by name',
      tags: ['prayer-times'],
      querystring: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'City name to search' },
        },
        required: ['query'],
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              city: { type: 'string' },
              country: { type: 'string' },
              latitude: { type: 'number' },
              longitude: { type: 'number' },
              timezone: { type: 'string' },
            },
          },
        },
        400: { type: 'object' },
        500: { type: 'object' },
      },
    },
  }, async (request, reply) => {
    const { query } = request.query;

    app.logger.info({ query }, 'Searching for cities');

    try {
      if (!query || query.trim().length === 0) {
        app.logger.warn({ query }, 'Empty city search query');
        return reply.code(400).send({
          error: 'Query parameter is required and must not be empty',
        });
      }

      const results = await searchCities(query);

      app.logger.info(
        { query, count: results.length },
        'City search completed'
      );

      return results;
    } catch (error) {
      app.logger.error(
        { err: error, query },
        'Failed to search cities'
      );
      return reply.code(500).send({
        error: 'Failed to search cities',
      });
    }
  });

  // POST /api/user-location - Save user's preferred location
  fastify.post<{
    Body: {
      country: string;
      city: string;
      latitude: number;
      longitude: number;
      timezone: string;
      calculationMethod?: string;
    };
  }>('/api/user-location', {
    schema: {
      description: 'Save user preferred location',
      tags: ['prayer-times'],
      body: {
        type: 'object',
        properties: {
          country: { type: 'string' },
          city: { type: 'string' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          timezone: { type: 'string' },
          calculationMethod: { type: 'string' },
        },
        required: ['country', 'city', 'latitude', 'longitude', 'timezone'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: ['string', 'null'] },
            country: { type: 'string' },
            city: { type: 'string' },
            latitude: { type: 'string' },
            longitude: { type: 'string' },
            timezone: { type: 'string' },
            calculationMethod: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
        400: { type: 'object' },
        500: { type: 'object' },
      },
    },
  }, async (request, reply) => {
    const { country, city, latitude, longitude, timezone, calculationMethod } = request.body;

    app.logger.info(
      { country, city, latitude, longitude, timezone, calculationMethod },
      'Saving user location'
    );

    try {
      // Validate required fields
      if (!country || !city || latitude === undefined || longitude === undefined || !timezone) {
        app.logger.warn({ country, city, latitude, longitude, timezone }, 'Missing required fields for user location');
        return reply.code(400).send({
          error: 'Missing required fields: country, city, latitude, longitude, timezone',
        });
      }

      // Validate coordinates
      if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        app.logger.warn({ latitude, longitude }, 'Invalid coordinates');
        return reply.code(400).send({
          error: 'Invalid coordinates',
        });
      }

      // Get userId from session if authenticated
      let userId: string | null = null;
      const session = await app.requireAuth()(request, reply);
      if (session) {
        userId = session.user.id;
      }

      // Check if user already has a location saved
      let existingLocation;
      if (userId) {
        const result = await app.db.select().from(schema.userLocations).where(eq(schema.userLocations.userId, userId));
        existingLocation = result[0];
      }

      let savedLocation;
      if (existingLocation) {
        // Update existing location
        const updated = await app.db
          .update(schema.userLocations)
          .set({
            country,
            city,
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            timezone,
            calculationMethod: calculationMethod || 'MWL',
            updatedAt: new Date(),
          })
          .where(eq(schema.userLocations.id, existingLocation.id))
          .returning();
        savedLocation = updated[0];

        app.logger.info(
          { locationId: savedLocation.id, userId },
          'User location updated successfully'
        );
      } else {
        // Create new location
        const inserted = await app.db
          .insert(schema.userLocations)
          .values({
            userId,
            country,
            city,
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            timezone,
            calculationMethod: calculationMethod || 'MWL',
          })
          .returning();
        savedLocation = inserted[0];

        app.logger.info(
          { locationId: savedLocation.id, userId },
          'User location created successfully'
        );
      }

      return savedLocation;
    } catch (error) {
      app.logger.error(
        { err: error, body: request.body },
        'Failed to save user location'
      );
      return reply.code(500).send({
        error: 'Failed to save user location',
      });
    }
  });

  // GET /api/user-location - Get user's saved location
  fastify.get('/api/user-location', {
    schema: {
      description: 'Get user saved location',
      tags: ['prayer-times'],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: ['string', 'null'] },
            country: { type: 'string' },
            city: { type: 'string' },
            latitude: { type: 'string' },
            longitude: { type: 'string' },
            timezone: { type: 'string' },
            calculationMethod: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
          nullable: true,
        },
        500: { type: 'object' },
      },
    },
  }, async (request, reply) => {
    app.logger.info({}, 'Fetching user location');

    try {
      let userLocation = null;

      // Try to get authenticated user session
      try {
        const session = await app.requireAuth()(request, reply);

        if (session) {
          const result = await app.db
            .select()
            .from(schema.userLocations)
            .where(eq(schema.userLocations.userId, session.user.id));

          userLocation = result[0] || null;

          if (userLocation) {
            app.logger.info(
              { userId: session.user.id, locationId: userLocation.id },
              'User location retrieved successfully'
            );
          } else {
            app.logger.info(
              { userId: session.user.id },
              'No saved location found for user'
            );
          }
        }
      } catch (authError) {
        // If auth fails, return the most recently saved location from the database
        app.logger.info({}, 'Guest user - fetching most recently saved location');

        const result = await app.db
          .select()
          .from(schema.userLocations)
          .orderBy(desc(schema.userLocations.updatedAt))
          .limit(1);

        userLocation = result[0] || null;

        if (userLocation) {
          app.logger.info(
            { locationId: userLocation.id },
            'Most recently saved location retrieved for guest user'
          );
        } else {
          app.logger.info({}, 'No saved locations found in database');
        }
      }

      return userLocation;
    } catch (error) {
      app.logger.error(
        { err: error },
        'Failed to fetch user location'
      );
      return reply.code(500).send({
        error: 'Failed to fetch user location',
      });
    }
  });
}
