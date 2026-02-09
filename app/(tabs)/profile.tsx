import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { GlassView } from "expo-glass-effect";
import { useTheme } from "@react-navigation/native";
import * as DocumentPicker from 'expo-document-picker';
import { uploadAzanAudio } from "@/utils/api";
import { refreshAzanAudioUrl, getAzanAudioInfo } from "@/services/azanService";

export default function ProfileScreen() {
  const theme = useTheme();
  const [uploading, setUploading] = useState(false);
  const [azanInfo, setAzanInfo] = useState<{ url: string; filename?: string | null; uploadedAt?: string | null } | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  useEffect(() => {
    loadAzanInfo();
  }, []);

  const loadAzanInfo = async () => {
    try {
      setLoadingInfo(true);
      const info = await getAzanAudioInfo();
      setAzanInfo(info);
    } catch (error) {
      console.error('[ProfileScreen] Failed to load Azan info:', error);
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleUploadAzan = async () => {
    try {
      console.log('[ProfileScreen] Opening document picker for audio file...');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('[ProfileScreen] User cancelled document picker');
        return;
      }

      const file = result.assets[0];
      console.log('[ProfileScreen] Selected file:', file);

      if (!file.uri) {
        Alert.alert('Error', 'Failed to get file URI');
        return;
      }

      setUploading(true);

      // Create a blob from the file URI
      const response = await fetch(file.uri);
      const fileToUpload = await response.blob();

      console.log('[ProfileScreen] Uploading audio file...');
      const uploadResult = await uploadAzanAudio(fileToUpload, file.name);
      
      console.log('[ProfileScreen] Upload successful:', uploadResult);
      
      // Refresh the cached URL
      await refreshAzanAudioUrl();
      
      // Reload the info
      await loadAzanInfo();
      
      Alert.alert(
        'Success',
        'Azan audio uploaded successfully! It will now play at prayer times.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[ProfileScreen] Failed to upload Azan audio:', error);
      Alert.alert(
        'Upload Failed',
        error instanceof Error ? error.message : 'Failed to upload audio file. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          Platform.OS !== 'ios' && styles.contentContainerWithTabBar
        ]}
      >
        <GlassView style={[
          styles.profileHeader,
          Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} glassEffectStyle="regular">
          <IconSymbol ios_icon_name="person.circle.fill" android_material_icon_name="person" size={80} color={theme.colors.primary} />
          <Text style={[styles.name, { color: theme.colors.text }]}>John Doe</Text>
          <Text style={[styles.email, { color: theme.dark ? '#98989D' : '#666' }]}>john.doe@example.com</Text>
        </GlassView>

        <GlassView style={[
          styles.section,
          Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} glassEffectStyle="regular">
          <View style={styles.infoRow}>
            <IconSymbol ios_icon_name="phone.fill" android_material_icon_name="phone" size={20} color={theme.dark ? '#98989D' : '#666'} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>+1 (555) 123-4567</Text>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol ios_icon_name="location.fill" android_material_icon_name="location-on" size={20} color={theme.dark ? '#98989D' : '#666'} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>San Francisco, CA</Text>
          </View>
        </GlassView>

        <GlassView style={[
          styles.section,
          Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} glassEffectStyle="regular">
          <View style={styles.sectionHeader}>
            <IconSymbol ios_icon_name="speaker.wave.3.fill" android_material_icon_name="volume-up" size={24} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Azan Audio</Text>
          </View>
          
          {loadingInfo ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <>
              {azanInfo && azanInfo.filename ? (
                <View style={styles.azanInfoContainer}>
                  <View style={styles.infoRow}>
                    <IconSymbol ios_icon_name="music.note" android_material_icon_name="music-note" size={20} color={theme.dark ? '#98989D' : '#666'} />
                    <Text style={[styles.infoText, { color: theme.colors.text }]}>{azanInfo.filename}</Text>
                  </View>
                  {azanInfo.uploadedAt && (
                    <Text style={[styles.uploadedAtText, { color: theme.dark ? '#98989D' : '#666' }]}>
                      Uploaded: {new Date(azanInfo.uploadedAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={[styles.noAudioText, { color: theme.dark ? '#98989D' : '#666' }]}>
                  No custom Azan audio uploaded yet
                </Text>
              )}
              
              <TouchableOpacity
                style={[styles.uploadButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleUploadAzan}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <IconSymbol ios_icon_name="arrow.up.doc.fill" android_material_icon_name="upload-file" size={20} color="#FFFFFF" />
                    <Text style={styles.uploadButtonText}>
                      {azanInfo?.filename ? 'Replace Azan Audio' : 'Upload Azan Audio'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              <Text style={[styles.uploadHintText, { color: theme.dark ? '#98989D' : '#666' }]}>
                Upload your custom Azan audio file (MP3, WAV, etc.) to play at prayer times
              </Text>
            </>
          )}
        </GlassView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // backgroundColor handled dynamically
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100, // Extra padding for floating tab bar
  },
  profileHeader: {
    alignItems: 'center',
    borderRadius: 12,
    padding: 32,
    marginBottom: 16,
    gap: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    // color handled dynamically
  },
  email: {
    fontSize: 16,
    // color handled dynamically
  },
  section: {
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    // color handled dynamically
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  azanInfoContainer: {
    marginBottom: 16,
  },
  uploadedAtText: {
    fontSize: 14,
    marginTop: 4,
    marginLeft: 32,
  },
  noAudioText: {
    fontSize: 14,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  uploadHintText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
