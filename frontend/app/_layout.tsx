import React from 'react';
import { Slot } from 'expo-router';
import { LanguageProvider } from '../context/LanguageContext';
import { UserProvider } from '../context/UserContext';
import { colors } from '../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

export default function RootLayout() {
  return (
    <LanguageProvider>
      <UserProvider>
        <StatusBar style="dark" />
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <Slot />
        </View>
      </UserProvider>
    </LanguageProvider>
  );
}
