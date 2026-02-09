
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import LocationModal from "@/components/LocationModal";
import DailyQuranVerse from "@/components/DailyQuranVerse";
import { colors as appColors, typography, spacing, borderRadius } from "@/styles/commonStyles";
import { useTheme } from "@react-navigation/native";
import React, { useState, useEffect } from "react";
import { getPrayerTimes, getUserLocation, CitySearchResult, saveUserLocation } from "@/utils/api";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, useColorScheme, ActivityIndicator, Platform, Alert } from "react-native";
import * as Location from 'expo-location';
import { IconSymbol } from "@/components/IconSymbol";
import { 
  requestNotificationPermissions, 
  schedulePrayerNotifications, 
  setupNotificationListener,
  playAzan,
  stopAzan
} from "@/services/azanService";

interface PrayerTime {
  name: string;
  time: string;
  arabicName: string;
  isNext?: boolean;
  isPassed?: boolean;
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const themeColors = colorScheme === 'dark' ? appColors.dark : appColors.light;
  
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<{ city: string; country: string; latitude: number; longitude: number }>({ 
    city: 'Makkah', 
    country: 'Saudi Arabia',
    latitude: 21.4225,
    longitude: 39.8262,
  });
  const [hijriDate, setHijriDate] = useState('1 Ramadan 1446');
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([
    { name: 'Fajr', time: '05:30', arabicName: 'الفجر', isPassed: true },
    { name: 'Sunrise', time: '06:45', arabicName: 'الشروق', isPassed: true },
    { name: 'Dhuhr', time: '12:30', arabicName: 'الظهر', isPassed: true },
    { name: 'Asr', time: '15:45', arabicName: 'العصر', isNext: true },
    { name: 'Maghrib', time: '18:15', arabicName: 'المغرب' },
    { name: 'Isha', time: '19:30', arabicName: 'العشاء' },
  ]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [azanEnabled, setAzanEnabled] = useState(true);

  // Initialize notification listener on mount
  useEffect(() => {
    console.log('[HomeScreen] Setting up Azan service...');
    setupNotificationListener();
    
    // Request notification permissions
    requestNotificationPermissions().then((granted) => {
      if (granted) {
        console.log('[HomeScreen] Notification permissions granted');
      } else {
        console.log('[HomeScreen] Notification permissions denied');
      }
    });
  }, []);

  // Load saved location and fetch prayer times
  useEffect(() => {
    loadLocationAndPrayerTimes();
  }, []);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Update next prayer indicator based on current time
  useEffect(() => {
    updateNextPrayer();
  }, [currentTime, prayerTimes]);

  // Schedule notifications when prayer times change
  useEffect(() => {
    if (prayerTimes.length > 0 && azanEnabled) {
      console.log('[HomeScreen] Scheduling Azan notifications for prayer times...');
      schedulePrayerNotifications(prayerTimes);
    }
  }, [prayerTimes, azanEnabled]);

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      console.log('[HomeScreen] Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('[HomeScreen] Location permission denied');
        setError('Location permission denied. Please enable location access in settings to use GPS.');
        return false;
      }
      
      console.log('[HomeScreen] Location permission granted');
      setLocationPermissionGranted(true);
      return true;
    } catch (err) {
      console.error('[HomeScreen] Failed to request location permission:', err);
      setError('Failed to request location permission.');
      return false;
    }
  };

  const getCurrentGPSLocation = async (): Promise<{ latitude: number; longitude: number; city: string; country: string } | null> => {
    try {
      console.log('[HomeScreen] Getting current GPS location...');
      
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        return null;
      }

      const locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const latitude = locationData.coords.latitude;
      const longitude = locationData.coords.longitude;

      console.log('[HomeScreen] GPS coordinates:', { latitude, longitude });

      // Reverse geocode to get city and country
      const geocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const city = place.city || place.subregion || place.region || 'Unknown';
        const country = place.country || 'Unknown';

        console.log('[HomeScreen] Reverse geocoded location:', { city, country });

        return { latitude, longitude, city, country };
      }

      return { latitude, longitude, city: 'Unknown', country: 'Unknown' };
    } catch (err) {
      console.error('[HomeScreen] Failed to get GPS location:', err);
      setError('Failed to get your current location. Please try again or select manually.');
      return null;
    }
  };

  const loadLocationAndPrayerTimes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[HomeScreen] Loading user location...');
      
      // First, try to get GPS location
      const gpsLocation = await getCurrentGPSLocation();
      
      if (gpsLocation) {
        console.log('[HomeScreen] Using GPS location:', gpsLocation);
        
        // Try to save GPS location to backend (but don't fail if it doesn't work)
        try {
          await saveUserLocation({
            city: gpsLocation.city,
            country: gpsLocation.country,
            latitude: gpsLocation.latitude,
            longitude: gpsLocation.longitude,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
          console.log('[HomeScreen] Successfully saved GPS location to backend');
        } catch (saveError) {
          console.warn('[HomeScreen] Failed to save GPS location to backend (non-critical):', saveError);
          // Continue anyway - we can still use the location locally
        }
        
        setLocation({
          city: gpsLocation.city,
          country: gpsLocation.country,
          latitude: gpsLocation.latitude,
          longitude: gpsLocation.longitude,
        });
        
        await fetchPrayerTimes(gpsLocation.latitude, gpsLocation.longitude);
        return;
      }
      
      // If GPS fails, try to get saved location
      const savedLocation = await getUserLocation();
      
      if (savedLocation) {
        console.log('[HomeScreen] Found saved location:', savedLocation);
        setLocation({
          city: savedLocation.city,
          country: savedLocation.country,
          latitude: parseFloat(savedLocation.latitude),
          longitude: parseFloat(savedLocation.longitude),
        });
        
        await fetchPrayerTimes(
          parseFloat(savedLocation.latitude),
          parseFloat(savedLocation.longitude)
        );
      } else {
        console.log('[HomeScreen] No saved location, using default (Makkah)');
        // Use default location (Makkah)
        await fetchPrayerTimes(location.latitude, location.longitude);
      }
    } catch (err) {
      console.error('[HomeScreen] Failed to load location:', err);
      setError('Failed to load prayer times. Using default location.');
      // Still try to fetch with default location
      await fetchPrayerTimes(location.latitude, location.longitude);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrayerTimes = async (latitude: number, longitude: number) => {
    try {
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      
      console.log('[HomeScreen] Fetching prayer times for:', { latitude, longitude, date: dateString });
      
      const times = await getPrayerTimes(latitude, longitude, dateString);
      
      console.log('[HomeScreen] Received prayer times:', times);
      
      setHijriDate(times.hijriDate);
      
      const newPrayerTimes: PrayerTime[] = [
        { name: 'Fajr', time: times.fajr, arabicName: 'الفجر' },
        { name: 'Sunrise', time: times.sunrise, arabicName: 'الشروق' },
        { name: 'Dhuhr', time: times.dhuhr, arabicName: 'الظهر' },
        { name: 'Asr', time: times.asr, arabicName: 'العصر' },
        { name: 'Maghrib', time: times.maghrib, arabicName: 'المغرب' },
        { name: 'Isha', time: times.isha, arabicName: 'العشاء' },
      ];
      
      setPrayerTimes(newPrayerTimes);
    } catch (err) {
      console.error('[HomeScreen] Failed to fetch prayer times:', err);
      setError('Failed to fetch prayer times. Please try again.');
      throw err;
    }
  };

  const updateNextPrayer = () => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const updatedTimes = prayerTimes.map(prayer => {
      const [hours, minutes] = prayer.time.split(':').map(Number);
      const prayerMinutes = hours * 60 + minutes;
      
      return {
        ...prayer,
        isPassed: prayerMinutes < currentMinutes,
        isNext: false,
      };
    });
    
    const nextPrayerIndex = updatedTimes.findIndex(p => !p.isPassed);
    if (nextPrayerIndex !== -1) {
      updatedTimes[nextPrayerIndex].isNext = true;
    }
    
    const hasChanged = updatedTimes.some((prayer, index) => 
      prayer.isNext !== prayerTimes[index].isNext || 
      prayer.isPassed !== prayerTimes[index].isPassed
    );
    
    if (hasChanged) {
      setPrayerTimes(updatedTimes);
    }
  };

  const handleLocationSelected = async (selectedLocation: CitySearchResult) => {
    console.log('[HomeScreen] Location selected:', selectedLocation);
    
    setLocation({
      city: selectedLocation.city,
      country: selectedLocation.country,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
    });
    
    setLoading(true);
    try {
      await fetchPrayerTimes(selectedLocation.latitude, selectedLocation.longitude);
      setError(null);
    } catch (err) {
      console.error('[HomeScreen] Failed to fetch prayer times for new location:', err);
      setError('Failed to fetch prayer times for selected location.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    console.log('[HomeScreen] User requested current GPS location');
    setLoading(true);
    setError(null);
    
    try {
      const gpsLocation = await getCurrentGPSLocation();
      
      if (gpsLocation) {
        // Try to save location to backend (but don't fail if it doesn't work)
        try {
          await saveUserLocation({
            city: gpsLocation.city,
            country: gpsLocation.country,
            latitude: gpsLocation.latitude,
            longitude: gpsLocation.longitude,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
          console.log('[HomeScreen] Successfully saved location to backend');
        } catch (saveError) {
          console.warn('[HomeScreen] Failed to save location to backend (non-critical):', saveError);
          // Continue anyway - we can still use the location locally
        }
        
        setLocation({
          city: gpsLocation.city,
          country: gpsLocation.country,
          latitude: gpsLocation.latitude,
          longitude: gpsLocation.longitude,
        });
        
        await fetchPrayerTimes(gpsLocation.latitude, gpsLocation.longitude);
        setShowLocationModal(false);
      }
    } catch (err) {
      console.error('[HomeScreen] Failed to use current location:', err);
      setError('Failed to get your current location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestAzan = async () => {
    console.log('[HomeScreen] User requested to test Azan playback');
    await playAzan();
  };

  const handleStopAzan = async () => {
    console.log('[HomeScreen] User requested to stop Azan playback');
    await stopAzan();
  };

  const timeString = currentTime.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  const dateString = currentTime.toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const nextPrayer = prayerTimes.find(p => p.isNext);
  const nextPrayerName = nextPrayer?.name || 'Asr';
  const nextPrayerTime = nextPrayer?.time || '15:45';

  const suhoorEndTime = prayerTimes.find(p => p.name === 'Fajr')?.time || '05:30';
  const iftarTime = prayerTimes.find(p => p.name === 'Maghrib')?.time || '18:15';

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.text }]}>
            Loading prayer times...
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScrollView 
        style={[styles.container, { backgroundColor: themeColors.background }]}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.header, { paddingTop: 60, marginTop: 27 }]}>
          <TouchableOpacity 
            style={styles.locationContainer}
            onPress={() => setShowLocationModal(true)}
          >
            <IconSymbol 
              ios_icon_name="location.fill" 
              android_material_icon_name="location-on" 
              size={20} 
              color={themeColors.textSecondary} 
            />
            <Text style={[styles.locationText, { color: themeColors.textSecondary }]}>
              {location.city}
            </Text>
            <Text style={[styles.locationText, { color: themeColors.textSecondary }]}>
              , 
            </Text>
            <Text style={[styles.locationText, { color: themeColors.textSecondary }]}>
              {location.country}
            </Text>
            <IconSymbol 
              ios_icon_name="chevron.down" 
              android_material_icon_name="expand-more" 
              size={16} 
              color={themeColors.textSecondary} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.settingsButton, { backgroundColor: themeColors.card }]}
            onPress={handleUseCurrentLocation}
          >
            <IconSymbol 
              ios_icon_name="location.circle.fill" 
              android_material_icon_name="my-location" 
              size={20} 
              color={themeColors.text} 
            />
          </TouchableOpacity>
        </View>

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: '#FFE5E5' }]}>
            <IconSymbol 
              ios_icon_name="exclamationmark.triangle.fill" 
              android_material_icon_name="warning" 
              size={20} 
              color="#D32F2F" 
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={[styles.azanControlCard, { backgroundColor: themeColors.card }]}>
          <View style={styles.azanControlHeader}>
            <IconSymbol 
              ios_icon_name="speaker.wave.3.fill" 
              android_material_icon_name="volume-up" 
              size={24} 
              color={themeColors.primary} 
            />
            <Text style={[styles.azanControlTitle, { color: themeColors.text }]}>Azan</Text>
          </View>
          <View style={styles.azanButtonsContainer}>
            <TouchableOpacity 
              style={[styles.azanButton, { backgroundColor: themeColors.primary }]}
              onPress={handleTestAzan}
            >
              <IconSymbol 
                ios_icon_name="play.fill" 
                android_material_icon_name="play-arrow" 
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={styles.azanButtonText}>Azan</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.azanButton, { backgroundColor: "#a7b5be" }]}
              onPress={handleStopAzan}
            >
              <IconSymbol 
                ios_icon_name="stop.fill" 
                android_material_icon_name="stop" 
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={styles.azanButtonText}>
                Stop
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.timeCard, { backgroundColor: "#41816d" }]}>
          <Text style={[styles.hijriDate, { color: themeColors.textSecondary }]}>
            {hijriDate}
          </Text>
          <Text style={[styles.currentTime, { color: themeColors.text }]}>
            {timeString}
          </Text>
          <Text style={[styles.currentDate, { color: "#f4feff" }]}>
            {dateString}
          </Text>
        </View>

        <DailyQuranVerse />

        <LinearGradient
          colors={[themeColors.primary, themeColors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.nextPrayerCard}
        >
          <Text style={styles.nextPrayerLabel}>
            Next Prayer
          </Text>
          <Text style={styles.nextPrayerName}>
            {nextPrayerName}
          </Text>
          <Text style={styles.nextPrayerTime}>
            {nextPrayerTime}
          </Text>
        </LinearGradient>

        <View style={styles.ramadanTimesContainer}>
          <View style={[styles.ramadanTimeCard, { backgroundColor: themeColors.card }]}>
            <View style={styles.ramadanTimeHeader}>
              <IconSymbol 
                ios_icon_name="moon.stars.fill" 
                android_material_icon_name="nightlight" 
                size={24} 
                color={themeColors.primary} 
              />
              <Text style={[styles.ramadanTimeTitle, { color: themeColors.text }]}>
                Suhoor Ends
              </Text>
            </View>
            <Text style={[styles.ramadanTime, { color: themeColors.primary }]}>
              {suhoorEndTime}
            </Text>
            <Text style={[styles.ramadanTimeSubtitle, { color: themeColors.textSecondary }]}>
              Fajr Time
            </Text>
          </View>

          <View style={[styles.ramadanTimeCard, { backgroundColor: themeColors.card }]}>
            <View style={styles.ramadanTimeHeader}>
              <IconSymbol 
                ios_icon_name="sun.horizon.fill" 
                android_material_icon_name="wb-twilight" 
                size={24} 
                color={themeColors.secondary} 
              />
              <Text style={[styles.ramadanTimeTitle, { color: themeColors.text }]}>
                Iftar Time
              </Text>
            </View>
            <Text style={[styles.ramadanTime, { color: themeColors.secondary }]}>
              {iftarTime}
            </Text>
            <Text style={[styles.ramadanTimeSubtitle, { color: themeColors.textSecondary }]}>
              Maghrib Time
            </Text>
          </View>
        </View>

        <View style={styles.prayerTimesContainer}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            Prayer Times
          </Text>
          {prayerTimes.map((prayer, index) => {
            const isActive = prayer.isNext;
            const isPassed = prayer.isPassed;
            
            return (
              <View 
                key={index}
                style={[
                  styles.prayerTimeRow,
                  { 
                    backgroundColor: isActive ? themeColors.highlight : themeColors.card,
                    borderLeftWidth: isActive ? 4 : 0,
                    borderLeftColor: themeColors.primary,
                  }
                ]}
              >
                <View style={styles.prayerNameContainer}>
                  <Text style={[styles.prayerName, { color: themeColors.text }]}>
                    {prayer.name}
                  </Text>
                  <Text style={[styles.prayerArabicName, { color: themeColors.textSecondary }]}>
                    {prayer.arabicName}
                  </Text>
                </View>
                <View style={styles.prayerTimeContainer}>
                  <Text style={[
                    styles.prayerTime, 
                    { 
                      color: isActive ? themeColors.primary : isPassed ? themeColors.textSecondary : themeColors.text,
                      fontWeight: isActive ? '700' : '600',
                    }
                  ]}>
                    {prayer.time}
                  </Text>
                  {isActive && (
                    <View style={[styles.activeBadge, { backgroundColor: themeColors.primary }]}>
                      <Text style={styles.activeBadgeText}>
                        Next
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <LocationModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onLocationSelected={handleLocationSelected}
        onUseCurrentLocation={handleUseCurrentLocation}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: '#D32F2F',
    flex: 1,
  },
  locationText: {
    ...typography.body,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  azanControlCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  azanControlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  azanControlTitle: {
    ...typography.h3,
    fontWeight: '600',
  },
  azanButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  azanButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  azanButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  timeCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  hijriDate: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  currentTime: {
    ...typography.h1,
    fontSize: 48,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  currentDate: {
    ...typography.body,
  },
  nextPrayerCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  nextPrayerLabel: {
    ...typography.caption,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nextPrayerName: {
    ...typography.h1,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  nextPrayerTime: {
    ...typography.h2,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  ramadanTimesContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  ramadanTimeCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ramadanTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  ramadanTimeTitle: {
    ...typography.caption,
    fontWeight: '600',
  },
  ramadanTime: {
    ...typography.h2,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  ramadanTimeSubtitle: {
    ...typography.small,
  },
  prayerTimesContainer: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  prayerTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  prayerNameContainer: {
    flex: 1,
  },
  prayerName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  prayerArabicName: {
    ...typography.caption,
  },
  prayerTimeContainer: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  prayerTime: {
    ...typography.h3,
  },
  activeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  activeBadgeText: {
    ...typography.small,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
