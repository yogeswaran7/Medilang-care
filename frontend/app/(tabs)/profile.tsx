import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import axios from 'axios';
import { colors, spacing, typography, borderRadius, touchTarget } from '../../constants/theme';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function ProfileScreen() {
  const { t, language, setLanguage } = useLanguage();
  const { user, createUser, updateUser } = useUser();
  
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [superUserName, setSuperUserName] = useState('');
  const [superUserPhone, setSuperUserPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAge(user.age?.toString() || '');
      setSelectedLanguage(user.language || 'en');
      setSuperUserName(user.super_user_name || '');
      setSuperUserPhone(user.super_user_phone || '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setSaving(true);
    try {
      if (user) {
        await updateUser({
          name: name.trim(),
          age: parseInt(age) || 0,
          language: selectedLanguage,
          super_user_name: superUserName.trim() || undefined,
          super_user_phone: superUserPhone.trim() || undefined,
        });
      } else {
        await createUser(name.trim(), parseInt(age) || 0, selectedLanguage);
      }
      
      // Update language context
      setLanguage(selectedLanguage);
      
      Alert.alert(t('profileSaved'));
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  const fetchWeeklyReport = async () => {
    if (!user) return;

    try {
      const response = await axios.get(`${API_URL}/api/weekly-report/${user.id}`);
      setReportData(response.data.report);
    } catch (error) {
      console.error('Report error:', error);
      Alert.alert('Error', 'Could not generate report');
    }
  };

  const shareReport = async () => {
    if (!reportData) return;

    const reportText = `
${reportData.user_name} - Weekly Medication Report
${reportData.start_date} to ${reportData.end_date}

Compliance Rate: ${reportData.compliance_rate}%
Total Doses: ${reportData.total_doses}
Doses Taken: ${reportData.doses_taken}

Details:
${reportData.details.map((d: any) => 
  `${d.date} | ${d.medicine} | ${d.time_slot} | ${d.status}`
).join('\n')}
    `.trim();

    try {
      if (await Sharing.isAvailableAsync()) {
        // For now, show alert with report data (PDF generation would require additional setup)
        Alert.alert('Weekly Report', reportText);
      } else {
        Alert.alert('Weekly Report', reportText);
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Weekly Report', reportText);
    }
  };

  const languages = [
    { code: 'en', label: t('english') },
    { code: 'hi', label: t('hindi') },
    { code: 'ta', label: t('tamil') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('userProfile')}</Text>
          </View>

          {/* Profile Card */}
          <View style={styles.card}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={48} color={colors.primary} />
              </View>
            </View>

            <Text style={styles.inputLabel}>{t('name')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.disabled}
            />

            <Text style={styles.inputLabel}>{t('age')}</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              placeholder="Your age"
              placeholderTextColor={colors.disabled}
            />

            <Text style={styles.inputLabel}>{t('language')}</Text>
            <View style={styles.languageRow}>
              {languages.map(lang => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageButton,
                    selectedLanguage === lang.code && styles.languageButtonActive,
                  ]}
                  onPress={() => setSelectedLanguage(lang.code)}
                >
                  <Text
                    style={[
                      styles.languageText,
                      selectedLanguage === lang.code && styles.languageTextActive,
                    ]}
                  >
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Super User Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('superUser')}</Text>
            <Text style={styles.cardSubtitle}>
              Add a trusted contact who will be notified if you miss your medicines.
            </Text>

            <Text style={styles.inputLabel}>{t('superUserName')}</Text>
            <TextInput
              style={styles.input}
              value={superUserName}
              onChangeText={setSuperUserName}
              placeholder="Caretaker's name"
              placeholderTextColor={colors.disabled}
            />

            <Text style={styles.inputLabel}>{t('superUserPhone')}</Text>
            <TextInput
              style={styles.input}
              value={superUserPhone}
              onChangeText={setSuperUserPhone}
              keyboardType="phone-pad"
              placeholder="+91 XXXXX XXXXX"
              placeholderTextColor={colors.disabled}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.disabledButton]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            <Ionicons name="save" size={24} color={colors.onPrimary} />
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : t('saveProfile')}
            </Text>
          </TouchableOpacity>

          {/* Weekly Report Section */}
          {user && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('weeklyReport')}</Text>
              <Text style={styles.cardSubtitle}>
                Generate a weekly medication compliance report for your doctor.
              </Text>

              <TouchableOpacity style={styles.reportButton} onPress={fetchWeeklyReport}>
                <Ionicons name="document-text" size={24} color={colors.primary} />
                <Text style={styles.reportButtonText}>Generate Report</Text>
              </TouchableOpacity>

              {reportData && (
                <View style={styles.reportPreview}>
                  <Text style={styles.reportTitle}>
                    {reportData.user_name}'s Report
                  </Text>
                  <Text style={styles.reportDate}>
                    {reportData.start_date} to {reportData.end_date}
                  </Text>
                  <View style={styles.reportStats}>
                    <View style={styles.reportStatItem}>
                      <Text style={styles.reportStatNumber}>{reportData.compliance_rate}%</Text>
                      <Text style={styles.reportStatLabel}>{t('compliance')}</Text>
                    </View>
                    <View style={styles.reportStatItem}>
                      <Text style={styles.reportStatNumber}>{reportData.doses_taken}</Text>
                      <Text style={styles.reportStatLabel}>{t('taken')}</Text>
                    </View>
                    <View style={styles.reportStatItem}>
                      <Text style={styles.reportStatNumber}>{reportData.total_doses}</Text>
                      <Text style={styles.reportStatLabel}>Total</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.shareButton} onPress={shareReport}>
                    <Ionicons name="share-social" size={24} color={colors.onPrimary} />
                    <Text style={styles.shareButtonText}>{t('shareReport')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardStroke,
  },
  cardTitle: {
    ...typography.heading,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    ...typography.body,
    color: colors.secondary,
    marginBottom: spacing.md,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  inputLabel: {
    ...typography.body,
    color: colors.onSurface,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.input,
    padding: spacing.md,
    ...typography.body,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    minHeight: touchTarget.minHeight,
  },
  languageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  languageButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.button,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.cardStroke,
    minHeight: touchTarget.minHeight,
    justifyContent: 'center',
  },
  languageButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  languageText: {
    ...typography.body,
    color: colors.onSurface,
  },
  languageTextActive: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.button,
    minHeight: touchTarget.minHeight,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  saveButtonText: {
    color: colors.onPrimary,
    ...typography.body,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.button,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    minHeight: touchTarget.minHeight,
    gap: spacing.sm,
  },
  reportButtonText: {
    color: colors.primary,
    ...typography.body,
    fontWeight: '600',
  },
  reportPreview: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.card,
  },
  reportTitle: {
    ...typography.heading,
    color: colors.onSurface,
    textAlign: 'center',
  },
  reportDate: {
    ...typography.body,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  reportStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  reportStatItem: {
    alignItems: 'center',
  },
  reportStatNumber: {
    ...typography.headingLarge,
    color: colors.primary,
    fontWeight: '700',
  },
  reportStatLabel: {
    ...typography.label,
    color: colors.secondary,
  },
  shareButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.button,
    minHeight: touchTarget.minHeight,
    gap: spacing.sm,
  },
  shareButtonText: {
    color: colors.onPrimary,
    ...typography.body,
    fontWeight: '600',
  },
});
