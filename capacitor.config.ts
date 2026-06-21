import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.voicecraft.app',
  appName: 'VoiceCraft',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    // Allow background audio on iOS
    BackgroundMode: {
      enable: true,
    },
  },
  android: {
    // Allows microphone access across orientations
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#0a0e1a',
  },
};

export default config;
