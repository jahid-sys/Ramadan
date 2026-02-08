
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
  Platform,
} from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors as appColors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { searchCities, CitySearchResult, saveUserLocation } from '@/utils/api';

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelected: (location: CitySearchResult) => void;
}

export default function LocationModal({ visible, onClose, onLocationSelected }: LocationModalProps) {
  const colorScheme = useColorScheme();
  const themeColors = colorScheme === 'dark' ? appColors.dark : appColors.light;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CitySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('[LocationModal] Searching for:', searchQuery);
        const results = await searchCities(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('[LocationModal] Search error:', err);
        setError('Failed to search cities. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectCity = async (city: CitySearchResult) => {
    try {
      console.log('[LocationModal] Selected city:', city);
      
      // Save location to backend
      await saveUserLocation({
        country: city.country,
        city: city.city,
        latitude: city.latitude,
        longitude: city.longitude,
        timezone: city.timezone,
        calculationMethod: 'MWL',
      });
      
      onLocationSelected(city);
      onClose();
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('[LocationModal] Failed to save location:', err);
      setError('Failed to save location. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Select Location
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="close"
                size={28}
                color={themeColors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={[styles.searchContainer, { backgroundColor: themeColors.card }]}>
            <IconSymbol
              ios_icon_name="magnifyingglass"
              android_material_icon_name="search"
              size={20}
              color={themeColors.textSecondary}
            />
            <TextInput
              style={[styles.searchInput, { color: themeColors.text }]}
              placeholder="Search for a city..."
              placeholderTextColor={themeColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>

          {/* Error Message */}
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: '#FFE5E5' }]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Loading Indicator */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
          )}

          {/* Search Results */}
          {!loading && searchResults.length > 0 && (
            <FlatList
              data={searchResults}
              keyExtractor={(item, index) => `${item.city}-${item.country}-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.cityItem, { backgroundColor: themeColors.card }]}
                  onPress={() => handleSelectCity(item)}
                >
                  <View style={styles.cityInfo}>
                    <IconSymbol
                      ios_icon_name="location.fill"
                      android_material_icon_name="location-on"
                      size={24}
                      color={themeColors.primary}
                    />
                    <View style={styles.cityTextContainer}>
                      <Text style={[styles.cityName, { color: themeColors.text }]}>
                        {item.city}
                      </Text>
                      <Text style={[styles.countryName, { color: themeColors.textSecondary }]}>
                        {item.country}
                      </Text>
                    </View>
                  </View>
                  <IconSymbol
                    ios_icon_name="chevron.right"
                    android_material_icon_name="chevron-right"
                    size={20}
                    color={themeColors.textSecondary}
                  />
                </TouchableOpacity>
              )}
              style={styles.resultsList}
            />
          )}

          {/* Empty State */}
          {!loading && searchQuery.length >= 2 && searchResults.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="magnifyingglass"
                android_material_icon_name="search"
                size={48}
                color={themeColors.textSecondary}
              />
              <Text style={[styles.emptyStateText, { color: themeColors.textSecondary }]}>
                No cities found
              </Text>
            </View>
          )}

          {/* Initial State */}
          {!loading && searchQuery.length < 2 && (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="location.circle"
                android_material_icon_name="location-searching"
                size={48}
                color={themeColors.textSecondary}
              />
              <Text style={[styles.emptyStateText, { color: themeColors.textSecondary }]}>
                Type at least 2 characters to search
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h2,
  },
  closeButton: {
    padding: spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    paddingVertical: spacing.xs,
  },
  errorContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: '#D32F2F',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  resultsList: {
    flex: 1,
  },
  cityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  cityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  cityTextContainer: {
    flex: 1,
  },
  cityName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  countryName: {
    ...typography.caption,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyStateText: {
    ...typography.body,
    textAlign: 'center',
  },
});
