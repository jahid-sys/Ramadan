
import Constants from 'expo-constants';

// Get backend URL from app.json configuration
export const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || 'https://cb78n6ttqrqz386j9c6dv3rksa64cvfg.app.specular.dev';

console.log('[API] Backend URL:', BACKEND_URL);

// Generic API call wrapper with error handling
async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BACKEND_URL}${endpoint}`;
  
  console.log(`[API] ${options?.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Error ${response.status}:`, errorText);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[API] Success:`, data);
    return data;
  } catch (error) {
    console.error('[API] Request failed:', error);
    throw error;
  }
}

// Prayer Times API
export interface PrayerTimesResponse {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  date: string;
  hijriDate: string;
}

export interface MonthPrayerTimesResponse {
  date: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  hijriDate: string;
}

export interface CitySearchResult {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface UserLocation {
  id: string;
  userId: string | null;
  country: string;
  city: string;
  latitude: string;
  longitude: string;
  timezone: string;
  calculationMethod: string;
  createdAt: string;
  updatedAt: string;
}

// Get prayer times for a specific date and location
export async function getPrayerTimes(
  latitude: number,
  longitude: number,
  date: string,
  method: string = 'MWL'
): Promise<PrayerTimesResponse> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    date,
    method,
  });
  
  return apiCall<PrayerTimesResponse>(`/api/prayer-times?${params}`);
}

// Get prayer times for an entire month
export async function getMonthPrayerTimes(
  latitude: number,
  longitude: number,
  month: number,
  year: number,
  method: string = 'MWL'
): Promise<MonthPrayerTimesResponse[]> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    month: month.toString(),
    year: year.toString(),
    method,
  });
  
  return apiCall<MonthPrayerTimesResponse[]>(`/api/prayer-times/month?${params}`);
}

// Search for cities
export async function searchCities(query: string): Promise<CitySearchResult[]> {
  const params = new URLSearchParams({ query });
  return apiCall<CitySearchResult[]>(`/api/cities/search?${params}`);
}

// Save user location
export async function saveUserLocation(location: {
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  calculationMethod?: string;
}): Promise<UserLocation> {
  return apiCall<UserLocation>('/api/user-location', {
    method: 'POST',
    body: JSON.stringify(location),
  });
}

// Get user's saved location
export async function getUserLocation(): Promise<UserLocation | null> {
  return apiCall<UserLocation | null>('/api/user-location');
}
