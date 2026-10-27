/**
 * Apollonography — Worldbuilding & Storytelling Notes
 * React Native for Windows (C++ template), UI-only.
 *
 * ► Fonts: DM Sans OTF files must be placed in
 *   windows/apollonography/Assets/Fonts/ and declared in the vcxproj.
 *   Until then, the system falls back to Segoe UI.
 *   See WindowsCompat.md for full instructions.
 *
 * ► Developer Mode deploy error: Run `npm run windows` from an
 *   Administrator PowerShell prompt (right-click → Run as administrator).
 */

import './global.css';
import React from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LightboxProvider } from './src/context/LightboxContext';
import { MainScreen } from './src/screens/MainScreen';
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <LightboxProvider>
        <View className="flex-1 bg-neutral-100">
          <MainScreen />
        </View>
      </LightboxProvider>
    </SafeAreaProvider>
  );
}
