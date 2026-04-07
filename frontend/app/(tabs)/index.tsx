import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { colors, spacing, typography, borderRadius, touchTarget } from '../../constants/theme';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  morning: boolean;
  afternoon: boolean;
  night: boolean;
  instructions: string;
}

interface ScanResult {
  id: string;
  medicines: Medicine[];
  ai_explanation: string;
  language: string;
}

export default function ScanScreen() {
  const { t, language } = useLanguage();
  const { user, createUser } = useUser();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    // Check if user exists, if not show setup
    if (!user) {
      setShowSetup(true);
    }
  }, [user]);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Please grant camera and photo library permissions to use this feature.'
      );
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
      setScanResult(null);
    }
  };

  const pickFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
      setScanResult(null);
    }
  };

  const analyzePrescription = async () => {
    if (!imageBase64 || !user) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/scan-prescription`, {
        user_id: user.id,
        image_base64: imageBase64,
        language: language,
      });

      if (response.data.success) {
        setScanResult(response.data.prescription);
        Alert.alert(t('scanSuccess'));
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      Alert.alert(t('scanError'));
    } finally {
      setLoading(false);
    }
  };

  const speakExplanation = async () => {
    if (!scanResult?.ai_explanation) return;

    const langMap: Record<string, string> = {
      en: 'en-US',
      hi: 'hi-IN',
      ta: 'ta-IN',
    };

    setIsSpeaking(true);
    Speech.speak(scanResult.ai_explanation, {
      language: langMap[language] || 'en-US',
      pitch: 0.9,
      rate: 0.8, // Slower for elderly
      onDone: () => setIsSpeaking(false),
      onError: () => {
        setIsSpeaking(false);
        Alert.alert('TTS Error', 'Could not read aloud. Please check language settings.');
      },
    });
  };

  const stopSpeaking = () => {
    Speech.stop();
    setIsSpeaking(false);
  };

  const addToRoutine = async () => {
    if (!scanResult || !user) return;

    try {
      const response = await axios.post(
        `${API_URL}/api/routines/from-prescription?prescription_id=${scanResult.id}&user_id=${user.id}`
      );

      if (response.data.success) {
        Alert.alert(t('addedToRoutine'));
        // Reset state
        setImageUri(null);
        setImageBase64(null);
        setScanResult(null);
      }
    } catch (error) {
      console.error('Add to routine error:', error);
    }
  };

  const quickSetup = async () => {
    try {
      await createUser('User', 65, language);
      setShowSetup(false);
    } catch (e) {
      console.error('Setup error:', e);
    }
  };

  if (showSetup && !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.setupContainer}>
          <Text style={styles.setupTitle}>Welcome to MediLang Care</Text>
          <Text style={styles.setupSubtitle}>
            Your personal prescription companion for better health management.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={quickSetup}>
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('prescriptionScanner')}</Text>
        </View>

        {/* Image Preview or Camera Buttons */}
        {!imageUri ? (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={takePhoto}>
              <Ionicons name="camera" size={28} color={colors.onPrimary} />
              <Text style={styles.primaryButtonText}>{t('takePhoto')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={pickFromGallery}>
              <Ionicons name="images" size={28} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>{t('uploadFromGallery')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
            
            {!scanResult && (
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={analyzePrescription}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <ActivityIndicator color={colors.onPrimary} />
                    <Text style={styles.primaryButtonText}>{t('scanning')}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="scan" size={28} color={colors.onPrimary} />
                    <Text style={styles.primaryButtonText}>{t('analyzeImage')}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setImageUri(null);
                setImageBase64(null);
                setScanResult(null);
              }}
            >
              <Ionicons name="refresh" size={24} color={colors.primary} />
              <Text style={styles.resetButtonText}>Take New Photo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Scan Results */}
        {scanResult && (
          <View style={styles.resultsContainer}>
            {/* Medicines List */}
            {scanResult.medicines.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('yourMedicines')}</Text>
                {scanResult.medicines.map((medicine, index) => (
                  <View key={medicine.id || index} style={styles.medicineItem}>
                    <Text style={styles.medicineName}>{medicine.name}</Text>
                    <Text style={styles.medicineDosage}>{medicine.dosage}</Text>
                    <View style={styles.timingRow}>
                      {medicine.morning && (
                        <View style={[styles.timeBadge, { backgroundColor: colors.morning }]}>
                          <Text style={styles.timeBadgeText}>{t('morning')}</Text>
                        </View>
                      )}
                      {medicine.afternoon && (
                        <View style={[styles.timeBadge, { backgroundColor: colors.afternoon }]}>
                          <Text style={styles.timeBadgeText}>{t('afternoon')}</Text>
                        </View>
                      )}
                      {medicine.night && (
                        <View style={[styles.timeBadge, { backgroundColor: colors.night }]}>
                          <Text style={styles.timeBadgeText}>{t('night')}</Text>
                        </View>
                      )}
                    </View>
                    {medicine.instructions && (
                      <Text style={styles.instructions}>{medicine.instructions}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* AI Explanation */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('aiExplanation')}</Text>
              <Text style={styles.explanationText}>{scanResult.ai_explanation}</Text>

              {/* TTS Controls */}
              <View style={styles.ttsContainer}>
                {!isSpeaking ? (
                  <TouchableOpacity style={styles.ttsButton} onPress={speakExplanation}>
                    <Ionicons name="volume-high" size={28} color={colors.onPrimary} />
                    <Text style={styles.ttsButtonText}>{t('readAloud')}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.ttsButton, styles.stopButton]} onPress={stopSpeaking}>
                    <Ionicons name="stop" size={28} color={colors.onPrimary} />
                    <Text style={styles.ttsButtonText}>{t('stopReading')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Add to Routine Prompt */}
            <View style={styles.routinePromptCard}>
              <Text style={styles.routinePromptText}>{t('addToRoutine')}</Text>
              <View style={styles.routineButtonRow}>
                <TouchableOpacity style={styles.yesButton} onPress={addToRoutine}>
                  <Text style={styles.yesButtonText}>{t('yes')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.noButton}
                  onPress={() => {
                    setImageUri(null);
                    setImageBase64(null);
                    setScanResult(null);
                  }}
                >
                  <Text style={styles.noButtonText}>{t('no')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.headingLarge,
    color: colors.onBackground,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.button,
    minHeight: touchTarget.minHeight,
    gap: spacing.sm,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    ...typography.body,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.button,
    minHeight: touchTarget.minHeight,
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    color: colors.primary,
    ...typography.body,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  imageContainer: {
    gap: spacing.md,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: borderRadius.card,
    backgroundColor: colors.surface,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  resetButtonText: {
    color: colors.primary,
    ...typography.body,
  },
  resultsContainer: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardStroke,
  },
  cardTitle: {
    ...typography.heading,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  medicineItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardStroke,
  },
  medicineName: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.onSurface,
  },
  medicineDosage: {
    ...typography.body,
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  timingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  timeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  timeBadgeText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  instructions: {
    ...typography.body,
    color: colors.secondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  explanationText: {
    ...typography.body,
    color: colors.onSurface,
    lineHeight: 28,
  },
  ttsContainer: {
    marginTop: spacing.md,
  },
  ttsButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.button,
    minHeight: touchTarget.minHeight,
    gap: spacing.sm,
  },
  stopButton: {
    backgroundColor: colors.error,
  },
  ttsButtonText: {
    color: colors.onPrimary,
    ...typography.body,
    fontWeight: '600',
  },
  routinePromptCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  routinePromptText: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  routineButtonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  yesButton: {
    flex: 1,
    backgroundColor: colors.success,
    padding: spacing.md,
    borderRadius: borderRadius.button,
    minHeight: touchTarget.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yesButtonText: {
    color: colors.onPrimary,
    ...typography.body,
    fontWeight: '600',
  },
  noButton: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.button,
    minHeight: touchTarget.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.cardStroke,
  },
  noButtonText: {
    color: colors.onSurface,
    ...typography.body,
    fontWeight: '600',
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  setupTitle: {
    ...typography.headingLarge,
    color: colors.onBackground,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  setupSubtitle: {
    ...typography.body,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});
