import Constants from 'expo-constants';

let Notifications: any = null;

try {
  Notifications = require('expo-notifications');
} catch {
  Notifications = null;
}

export async function getDevicePushToken(): Promise<string | null> {
  if (!Notifications || typeof Notifications.getPermissionsAsync !== 'function') {
    return null;
  }

  try {
    const { status } = await Notifications.getPermissionsAsync();
    let finalStatus = status;

    if (finalStatus !== 'granted') {
      const permission = await Notifications.requestPermissionsAsync();
      finalStatus = permission.status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.manifest2?.extra?.projectId;
    if (!projectId) {
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token?.data || null;
  } catch {
    return null;
  }
}
