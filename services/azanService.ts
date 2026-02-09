
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

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

// Azan audio URL (using a public Azan audio file)
const AZAN_AUDIO_URL = 'https://www.islamcan.com/audio/adhan/azan.mp3';

let soundObject: Audio.Sound | null = null;

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
    
    // Configure audio mode for playback
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
    
    return true;
  } catch (error) {
    console.error('[AzanService] Failed to request notification permissions:', error);
    return false;
  }
}

// Play Azan audio
export async function playAzan(): Promise<void> {
  try {
    console.log('[AzanService] Playing Azan...');
    
    // Stop any currently playing sound
    if (soundObject) {
      await soundObject.stopAsync();
      await soundObject.unloadAsync();
      soundObject = null;
    }
    
    // Create and play new sound
    const { sound } = await Audio.Sound.createAsync(
      { uri: AZAN_AUDIO_URL },
      { shouldPlay: true, volume: 1.0 },
      onPlaybackStatusUpdate
    );
    
    soundObject = sound;
    console.log('[AzanService] Azan playback started');
  } catch (error) {
    console.error('[AzanService] Failed to play Azan:', error);
  }
}

// Stop Azan audio
export async function stopAzan(): Promise<void> {
  try {
    if (soundObject) {
      console.log('[AzanService] Stopping Azan...');
      await soundObject.stopAsync();
      await soundObject.unloadAsync();
      soundObject = null;
    }
  } catch (error) {
    console.error('[AzanService] Failed to stop Azan:', error);
  }
}

// Playback status update callback
function onPlaybackStatusUpdate(status: any) {
  if (status.didJustFinish) {
    console.log('[AzanService] Azan playback finished');
    if (soundObject) {
      soundObject.unloadAsync();
      soundObject = null;
    }
  }
}

// Schedule notifications for all prayer times
export async function schedulePrayerNotifications(prayerTimes: PrayerTime[]): Promise<void> {
  try {
    console.log('[AzanService] Scheduling prayer notifications...');
    
    // Cancel all existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Schedule notification for each prayer time
    for (const prayer of prayerTimes) {
      // Skip Sunrise (not a prayer time)
      if (prayer.name === 'Sunrise') {
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
              title: `${prayer.name} Prayer Time`,
              body: `It's time for ${prayer.name} prayer (${prayer.arabicName})`,
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
              data: { prayerName: prayer.name, playAzan: true },
            },
            trigger: {
              seconds: secondsUntilPrayer,
            },
          });
          
          console.log(`[AzanService] Scheduled notification for ${prayer.name} at ${prayer.time} (in ${secondsUntilPrayer}s)`);
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
            title: `${prayer.name} Prayer Time`,
            body: `It's time for ${prayer.name} prayer (${prayer.arabicName})`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            data: { prayerName: prayer.name, playAzan: true },
          },
          trigger: {
            seconds: secondsUntilPrayer,
          },
        });
        
        console.log(`[AzanService] Scheduled notification for ${prayer.name} tomorrow at ${prayer.time}`);
      }
    }
    
    console.log('[AzanService] All prayer notifications scheduled successfully');
  } catch (error) {
    console.error('[AzanService] Failed to schedule prayer notifications:', error);
  }
}

// Set up notification listener
export function setupNotificationListener(): void {
  console.log('[AzanService] Setting up notification listener...');
  
  // Listen for notifications when app is in foreground
  Notifications.addNotificationReceivedListener((notification) => {
    console.log('[AzanService] Notification received:', notification);
    const data = notification.request.content.data;
    
    if (data?.playAzan) {
      console.log('[AzanService] Playing Azan for prayer:', data.prayerName);
      playAzan();
    }
  });
  
  // Listen for notification responses (when user taps notification)
  Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('[AzanService] Notification response received:', response);
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
