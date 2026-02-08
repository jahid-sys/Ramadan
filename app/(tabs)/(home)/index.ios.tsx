import { StyleSheet, View, Text, ScrollView, TouchableOpacity, useColorScheme, ActivityIndicator } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import React, { useState, useEffect } from "react";
import { colors as appColors, typography, spacing, borderRadius } from "@/styles/commonStyles";
import { LinearGradient } from "expo-linear-gradient";
import { getPrayerTimes, getUserLocation, CitySearchResult } from "@/utils/api";
import LocationModal from "@/components/LocationModal";

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

  const loadLocationAndPrayerTimes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[HomeScreen] Loading user location...');
      
      // Try to get saved location
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
      const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      console.log('[HomeScreen] Fetching prayer times for:', { latitude, longitude, date: dateString });
      
      const times = await getPrayerTimes(latitude, longitude, dateString);
      
      console.log('[HomeScreen] Received prayer times:', times);
      
      // Update hijri date
      setHijriDate(times.hijriDate);
      
      // Map API response to prayer times array
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
    
    // Find the next prayer
    const nextPrayerIndex = updatedTimes.findIndex(p => !p.isPassed);
    if (nextPrayerIndex !== -1) {
      updatedTimes[nextPrayerIndex].isNext = true;
    }
    
    // Only update if there's a change
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
    
    // Fetch new prayer times
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
        {/* Header with Location */}
        <View style={styles.header}>
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
            onPress={() => loadLocationAndPrayerTimes()}
          >
            <IconSymbol 
              ios_icon_name="arrow.clockwise" 
              android_material_icon_name="refresh" 
              size={20} 
              color={themeColors.text} 
            />
          </TouchableOpacity>
        </View>

        {/* Error Message */}
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

        {/* Current Time Card */}
        <View style={[styles.timeCard, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.hijriDate, { color: themeColors.textSecondary }]}>
            {hijriDate}
          </Text>
          <Text style={[styles.currentTime, { color: themeColors.text }]}>
            {timeString}
          </Text>
          <Text style={[styles.currentDate, { color: themeColors.textSecondary }]}>
            {dateString}
          </Text>
        </View>

        {/* Next Prayer Card */}
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

        {/* Ramadan Special Times */}
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

        {/* All Prayer Times */}
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

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Location Selection Modal */}
      <LocationModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onLocationSelected={handleLocationSelected}
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
