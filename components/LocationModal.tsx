
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
import { searchCities, CitySearchResult, saveUserLocation } from '@/utils/api';
import { colors as appColors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import React, { useState, useEffect } from 'react';

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelected: (location: CitySearchResult) => void;
  onUseCurrentLocation?: () => void;
}

export default function LocationModal({ visible, onClose, onLocationSelected, onUseCurrentLocation }: LocationModalProps) {
  const colorScheme = useColorScheme();
  const themeColors = colorScheme === 'dark' ? appColors.dark : appColors.light;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CitySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log('[LocationModal] Searching for cities:', query);
      
      const results = await searchCities(query);
      console.log('[LocationModal] Search results:', results);
      
      setSearchResults(results);
    } catch (err) {
      console.error('[LocationModal] Search failed:', err);
      setError('Failed to search cities. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCity = async (city: CitySearchResult) => {
    try {
      console.log('[LocationModal] City selected:', city);
      
      await saveUserLocation({
        city: city.city,
        country: city.country,
        latitude: city.latitude,
        longitude: city.longitude,
        timezone: city.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
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

  const handleUseCurrentLocationPress = () => {
    if (onUseCurrentLocation) {
      onUseCurrentLocation();
      onClose();
      setSearchQuery('');
      setSearchResults([]);
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
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Select Location
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol 
                ios_icon_name="xmark" 
                android_material_icon_name="close" 
                size={24} 
                color={themeColors.text} 
              />
            </TouchableOpacity>
          </View>

          {onUseCurrentLocation && (
            <TouchableOpacity
              style={[styles.currentLocationButton, { backgroundColor: themeColors.primary }]}
              onPress={handleUseCurrentLocationPress}
            >
              <IconSymbol 
                ios_icon_name="location.circle.fill" 
                android_material_icon_name="my-location" 
                size={24} 
                color="#FFFFFF" 
              />
              <Text style={styles.currentLocationButtonText}>
                Use Current Location
              </Text>
            </TouchableOpacity>
          )}

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
              autoCapitalize="words"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <IconSymbol 
                  ios_icon_name="xmark.circle.fill" 
                  android_material_icon_name="cancel" 
                  size={20} 
                  color={themeColors.textSecondary} 
                />
              </TouchableOpacity>
            )}
          </View>

          {error && (
            <View style={[styles.errorContainer, { backgroundColor: '#FFE5E5' }]}>
              <IconSymbol 
                ios_icon_name="exclamationmark.triangle.fill" 
                android_material_icon_name="warning" 
                size={20} 
                color="#D32F2F" 
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
          )}

          {!loading && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
            <View style={styles.emptyContainer}>
              <IconSymbol 
                ios_icon_name="magnifyingglass" 
                android_material_icon_name="search" 
                size={48} 
                color={themeColors.textSecondary} 
              />
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                No cities found
              </Text>
              <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>
                Try a different search term
              </Text>
            </View>
          )}

          {!loading && searchResults.length === 0 && searchQuery.trim().length < 2 && (
            <View style={styles.emptyContainer}>
              <IconSymbol 
                ios_icon_name="location.fill" 
                android_material_icon_name="location-on" 
                size={48} 
                color={themeColors.textSecondary} 
              />
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                Search for your city
              </Text>
              <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>
                Type at least 2 characters
              </Text>
            </View>
          )}

          <FlatList
            data={searchResults}
            keyExtractor={(item, index) => `${item.city}-${item.country}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.cityItem, { backgroundColor: themeColors.card }]}
                onPress={() => handleSelectCity(item)}
              >
                <View style={styles.cityItemContent}>
                  <IconSymbol 
                    ios_icon_name="location.fill" 
                    android_material_icon_name="location-on" 
                    size={20} 
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
            contentContainerStyle={styles.resultsListContent}
          />
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
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  currentLocationButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    padding: 0,
  },
  errorContainer: {
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
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    fontWeight: '600',
  },
  emptySubtext: {
    ...typography.caption,
  },
  resultsList: {
    flex: 1,
  },
  resultsListContent: {
    paddingBottom: spacing.xl,
  },
  cityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  cityItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
});
