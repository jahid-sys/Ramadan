
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-audio';
import { Platform } from 'react-native';
import { getAzanAudioUrl } from '@/utils/api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface PrayerTime {
  name: string;
  time: string;
  arabicName: string;
}

let soundObject: Audio.Sound | null = null;
let cachedAzanUrl: string | null = null;
let cachedAzanData: { url: string; filename?: string | null; uploadedAt?: string | null } | null = null;

// Request notification permissions
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    console.log('[AzanService] Requesting notification permissions...');
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('[AzanService] Notification permission denied');
      return false;
    }
    
    console.log('[AzanService] Notification permission granted');
    
    // Configure audio mode for playback (expo-audio)
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
      });
    } catch (audioError) {
      console.log('[AzanService] Audio mode configuration skipped (may not be supported on this platform)');
    }
    
    return true;
  } catch (error) {
    console.error('[AzanService] Failed to request notification permissions:', error);
    return false;
  }
}

// Play Azan audio
export async function playAzan(): Promise<void> {
  try {
    console.log('[AzanService] Playing Azan audio...');
    
    // Stop any currently playing sound
    if (soundObject) {
      try {
        await soundObject.pauseAsync();
        await soundObject.unloadAsync();
      } catch (stopError) {
        console.log('[AzanService] Error stopping previous sound:', stopError);
      }
      soundObject = null;
    }
    
    // Get the uploaded Azan audio URL from backend
    if (!cachedAzanData) {
      console.log('[AzanService] Fetching Azan audio URL from backend...');
      cachedAzanData = await getAzanAudioUrl();
      cachedAzanUrl = cachedAzanData?.url || null;
    }
    
    // Check if we have a valid URL (not empty string)
    if (cachedAzanUrl && cachedAzanUrl.trim() !== '' && cachedAzanData) {
      console.log('[AzanService] Playing uploaded Azan audio from:', cachedAzanUrl);
      
      // Configure audio mode for playback (expo-audio)
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
        });
      } catch (audioError) {
        console.log('[AzanService] Audio mode configuration skipped');
      }
      
      // Create and play the sound using expo-audio
      try {
        const sound = await Audio.Sound.createAsync(
          { uri: cachedAzanUrl },
          { shouldPlay: true, volume: 1.0 }
        );
        
        soundObject = sound.sound;
        console.log('[AzanService] Azan audio playback started');
        
        // Listen for playback completion
        soundObject.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            console.log('[AzanService] Azan playback finished');
            if (soundObject) {
              soundObject.unloadAsync();
              soundObject = null;
            }
          }
        });
      } catch (playError) {
        console.error('[AzanService] Failed to create/play audio:', playError);
        throw playError;
      }
      
      // Also show a notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🕌 Prayer Time',
          body: 'It\'s time for prayer - Allahu Akbar',
          sound: false, // Don't use notification sound since we're playing custom audio
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null, // Immediate notification
      });
    } else {
      console.log('[AzanService] No Azan audio URL found, using notification sound');
      
      // Fallback to notification sound if no audio uploaded
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🕌 Prayer Time',
          body: 'It\'s time for prayer - Allahu Akbar',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null, // Immediate notification with sound
      });
    }
    
    console.log('[AzanService] Azan playback initiated');
  } catch (error) {
    console.error('[AzanService] Failed to play Azan:', error);
    
    // Fallback to notification sound on error
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🕌 Prayer Time',
          body: 'It\'s time for prayer - Allahu Akbar',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null,
      });
    } catch (fallbackError) {
      console.error('[AzanService] Fallback notification also failed:', fallbackError);
    }
  }
}

// Stop Azan audio
export async function stopAzan(): Promise<void> {
  try {
    if (soundObject) {
      console.log('[AzanService] Stopping Azan...');
      await soundObject.pauseAsync();
      await soundObject.unloadAsync();
      soundObject = null;
    }
  } catch (error) {
    console.error('[AzanService] Failed to stop Azan:', error);
  }
}

// Schedule notifications for all prayer times
export async function schedulePrayerNotifications(prayerTimes: PrayerTime[]): Promise<void> {
  try {
    console.log('[AzanService] Scheduling prayer notifications for', prayerTimes.length, 'prayers');
    
    // Cancel all existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    let scheduledCount = 0;
    
    // Schedule notification for each prayer time
    for (const prayer of prayerTimes) {
      // Skip Sunrise (not a prayer time)
      if (prayer.name === 'Sunrise') {
        console.log('[AzanService] Skipping Sunrise (not a prayer time)');
        continue;
      }
      
      const [hours, minutes] = prayer.time.split(':').map(Number);
      const prayerMinutes = hours * 60 + minutes;
      
      // Only schedule for future prayer times today
      if (prayerMinutes > currentMinutes) {
        const triggerDate = new Date();
        triggerDate.setHours(hours, minutes, 0, 0);
        
        const secondsUntilPrayer = Math.floor((triggerDate.getTime() - now.getTime()) / 1000);
        
        if (secondsUntilPrayer > 0) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `🕌 ${prayer.name} Prayer Time`,
              body: `It's time for ${prayer.name} prayer (${prayer.arabicName})`,
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
              data: { prayerName: prayer.name, playAzan: true },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: secondsUntilPrayer,
              repeats: false,
            },
          });
          
          scheduledCount++;
          console.log(`[AzanService] ✓ Scheduled ${prayer.name} at ${prayer.time} (in ${Math.floor(secondsUntilPrayer / 60)} minutes)`);
        }
      }
    }
    
    // Also schedule for tomorrow's prayers
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    for (const prayer of prayerTimes) {
      if (prayer.name === 'Sunrise') {
        continue;
      }
      
      const [hours, minutes] = prayer.time.split(':').map(Number);
      const triggerDate = new Date(tomorrow);
      triggerDate.setHours(hours, minutes, 0, 0);
      
      const secondsUntilPrayer = Math.floor((triggerDate.getTime() - now.getTime()) / 1000);
      
      if (secondsUntilPrayer > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🕌 ${prayer.name} Prayer Time`,
            body: `It's time for ${prayer.name} prayer (${prayer.arabicName})`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            data: { prayerName: prayer.name, playAzan: true },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntilPrayer,
            repeats: false,
          },
        });
        
        scheduledCount++;
        console.log(`[AzanService] ✓ Scheduled ${prayer.name} tomorrow at ${prayer.time}`);
      }
    }
    
    console.log(`[AzanService] Successfully scheduled ${scheduledCount} prayer notifications`);
  } catch (error) {
    console.error('[AzanService] Failed to schedule prayer notifications:', error);
  }
}

// Set up notification listener
export function setupNotificationListener(): void {
  console.log('[AzanService] Setting up notification listener...');
  
  // Listen for notifications when app is in foreground
  Notifications.addNotificationReceivedListener((notification) => {
    console.log('[AzanService] Notification received:', notification.request.content.title);
    const data = notification.request.content.data;
    
    if (data?.playAzan) {
      console.log('[AzanService] Playing Azan for prayer:', data.prayerName);
      playAzan();
    }
  });
  
  // Listen for notification responses (when user taps notification)
  Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('[AzanService] Notification tapped:', response.notification.request.content.title);
    const data = response.notification.request.content.data;
    
    if (data?.playAzan) {
      console.log('[AzanService] Playing Azan for prayer:', data.prayerName);
      playAzan();
    }
  });
}

// Cancel all scheduled notifications
export async function cancelAllPrayerNotifications(): Promise<void> {
  try {
    console.log('[AzanService] Cancelling all prayer notifications...');
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[AzanService] All notifications cancelled');
  } catch (error) {
    console.error('[AzanService] Failed to cancel notifications:', error);
  }
}

// Refresh the cached Azan audio URL (call this after uploading new audio)
export async function refreshAzanAudioUrl(): Promise<void> {
  try {
    console.log('[AzanService] Refreshing Azan audio URL...');
    cachedAzanData = await getAzanAudioUrl();
    cachedAzanUrl = cachedAzanData?.url || null;
    console.log('[AzanService] Azan audio URL refreshed:', cachedAzanUrl);
  } catch (error) {
    console.error('[AzanService] Failed to refresh Azan audio URL:', error);
  }
}

// Get current Azan audio info
export async function getAzanAudioInfo(): Promise<{ url: string; filename?: string | null; uploadedAt?: string | null } | null> {
  try {
    if (!cachedAzanData) {
      cachedAzanData = await getAzanAudioUrl();
      cachedAzanUrl = cachedAzanData?.url || null;
    }
    return cachedAzanData;
  } catch (error) {
    console.error('[AzanService] Failed to get Azan audio info:', error);
    return null;
  }
}
