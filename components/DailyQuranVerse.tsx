
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as appColors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';
import { getDailyQuranVerse, QuranVerseResponse } from '@/utils/api';

export default function DailyQuranVerse() {
  const colorScheme = useColorScheme();
  const themeColors = colorScheme === 'dark' ? appColors.dark : appColors.light;
  
  const [verse, setVerse] = useState<QuranVerseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDailyVerse();
  }, []);

  const loadDailyVerse = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[DailyQuranVerse] Fetching daily verse...');
      
      const dailyVerse = await getDailyQuranVerse();
      
      setVerse(dailyVerse);
      console.log('[DailyQuranVerse] Verse loaded successfully:', dailyVerse);
    } catch (err) {
      console.error('[DailyQuranVerse] Failed to load verse:', err);
      setError('Failed to load daily verse');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.card }]}>
        <ActivityIndicator size="small" color={themeColors.primary} />
      </View>
    );
  }

  if (error || !verse) {
    return null;
  }

  const surahInfo = `${verse.surahNameEnglish} ${verse.surahNumber}:${verse.ayahNumber}`;

  return (
    <LinearGradient
      colors={[themeColors.primary, '#3A7563']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <IconSymbol 
          ios_icon_name="book.fill" 
          android_material_icon_name="menu-book" 
          size={24} 
          color="#FFFFFF" 
        />
        <Text style={styles.headerTitle}>Daily Qur&apos;an Verse</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.arabicContainer}>
        <Text style={styles.arabicText}>
          {verse.arabicText}
        </Text>
      </View>

      <View style={styles.translationContainer}>
        <Text style={styles.translationText}>
          {verse.englishTranslation}
        </Text>
      </View>

      <View style={styles.referenceContainer}>
        <View style={styles.referenceBadge}>
          <Text style={styles.referenceText}>
            {surahInfo}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.h3,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: spacing.lg,
  },
  arabicContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
  },
  arabicText: {
    fontSize: 24,
    lineHeight: 42,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  translationContainer: {
    marginBottom: spacing.lg,
  },
  translationText: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 26,
    color: '#F8F6F3',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  referenceContainer: {
    alignItems: 'center',
  },
  referenceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  referenceText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
