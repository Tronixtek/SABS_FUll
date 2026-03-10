import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { App as CapApp } from '@capacitor/app';
import { Network } from '@capacitor/network';

/**
 * Initialize Capacitor plugins and configure native app behavior
 */
export const initializeCapacitor = async () => {
  // Check if running on native platform
  if (!Capacitor.isNativePlatform()) {
    console.log('Running on web platform');
    return;
  }

  console.log('Running on native platform:', Capacitor.getPlatform());

  try {
    // Configure Status Bar
    if (Capacitor.isPluginAvailable('StatusBar')) {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#1976d2' });
    }

    // Hide Splash Screen after app is loaded
    if (Capacitor.isPluginAvailable('SplashScreen')) {
      setTimeout(() => {
        SplashScreen.hide();
      }, 2000);
    }

    // Configure Keyboard behavior
    if (Capacitor.isPluginAvailable('Keyboard')) {
      Keyboard.setAccessoryBarVisible({ isVisible: true });
    }

    // Listen to app state changes
    if (Capacitor.isPluginAvailable('App')) {
      CapApp.addListener('appStateChange', ({ isActive }) => {
        console.log('App state changed. Is active:', isActive);
        // You can sync data or refresh when app comes to foreground
      });

      CapApp.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          CapApp.exitApp();
        } else {
          window.history.back();
        }
      });
    }

    // Monitor network status
    if (Capacitor.isPluginAvailable('Network')) {
      const status = await Network.getStatus();
      console.log('Network status:', status);

      Network.addListener('networkStatusChange', status => {
        console.log('Network status changed', status);
        // You can show offline notification here
      });
    }

    console.log('✅ Capacitor plugins initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Capacitor:', error);
  }
};

/**
 * Get platform information
 */
export const getPlatformInfo = () => {
  return {
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(), // 'ios', 'android', or 'web'
    isAndroid: Capacitor.getPlatform() === 'android',
    isIOS: Capacitor.getPlatform() === 'ios',
    isWeb: Capacitor.getPlatform() === 'web'
  };
};

/**
 * Check if specific plugin is available
 */
export const isPluginAvailable = (pluginName) => {
  return Capacitor.isPluginAvailable(pluginName);
};
