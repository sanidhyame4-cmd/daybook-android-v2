import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.quietunfinished.daybook',
  appName: 'Daybook',
  webDir: 'www',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
  },
};

export default config;
