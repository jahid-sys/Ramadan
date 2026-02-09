
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
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // If response is not JSON, try to get text
        const errorText = await response.text();
        // Don't include HTML in error message
        if (!errorText.includes('<!DOCTYPE') && !errorText.includes('<html')) {
          errorMessage = errorText.substring(0, 100); // Limit length
        }
      }
      console.error(`[API] Error ${response.status}:`, errorMessage);
      throw new Error(`API Error: ${response.status} - ${errorMessage}`);
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
  try {
    return await apiCall<UserLocation | null>('/api/user-location');
  } catch (error) {
    console.log('[API] getUserLocation failed, returning null:', error);
    // Return null if the endpoint fails (e.g., no location saved or auth issues)
    return null;
  }
}

// Azan Audio API
export interface AzanAudioResponse {
  url: string;
  filename?: string | null;
  uploadedAt?: string | null;
}

export interface AzanAudioUploadResponse {
  url: string;
  filename: string;
  uploadedAt: string;
}

// Get the uploaded Azan audio URL
export async function getAzanAudioUrl(): Promise<AzanAudioResponse | null> {
  try {
    const response = await apiCall<AzanAudioResponse>('/api/azan-audio');
    return response;
  } catch (error) {
    console.log('[API] getAzanAudioUrl failed, returning null:', error);
    return null;
  }
}

// Upload or update Azan audio file
export async function uploadAzanAudio(audioFile: File | Blob, filename: string): Promise<AzanAudioUploadResponse> {
  const url = `${BACKEND_URL}/api/azan-audio/upload`;
  
  console.log(`[API] POST ${url} - Uploading audio file: ${filename}`);
  
  try {
    const formData = new FormData();
    formData.append('audio', audioFile, filename);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - let the browser set it with boundary for multipart/form-data
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        const errorText = await response.text();
        if (!errorText.includes('<!DOCTYPE') && !errorText.includes('<html')) {
          errorMessage = errorText.substring(0, 100);
        }
      }
      console.error(`[API] Error ${response.status}:`, errorMessage);
      throw new Error(`Upload failed: ${errorMessage}`);
    }

    const data = await response.json();
    console.log(`[API] Upload success:`, data);
    return data;
  } catch (error) {
    console.error('[API] Upload request failed:', error);
    throw error;
  }
}
