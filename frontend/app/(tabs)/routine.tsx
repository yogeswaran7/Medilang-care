import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { format, subDays } from 'date-fns';
import { colors, spacing, typography, borderRadius, touchTarget } from '../../constants/theme';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface RoutineEntry {
  id: string;
  medicine_name: string;
  dosage: string;
  time_slot: string;
  instructions: string;
  is_active: boolean;
}

interface DoseLog {
  id: string;
  routine_id: string;
  medicine_name: string;
  time_slot: string;
  status: string;
  taken_at?: string;
}

interface DoseStats {
  total_doses: number;
  taken: number;
  missed: number;
  pending: number;
  compliance_rate: number;
}

export default function RoutineScreen() {
  const { t, language } = useLanguage();
  const { user } = useUser();
  const [routines, setRoutines] = useState<{
    morning: RoutineEntry[];
    afternoon: RoutineEntry[];
    night: RoutineEntry[];
  }>({ morning: [], afternoon: [], night: [] });
  const [doseLogs, setDoseLogs] = useState<Record<string, DoseLog>>({});
  const [stats, setStats] = useState<DoseStats | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedSections, setExpandedSections] = useState({
    morning: true,
    afternoon: true,
    night: true,
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMedicine, setNewMedicine] = useState({
    name: '',
    dosage: '',
    time_slot: 'morning',
    instructions: '',
    duration: '7',
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Fetch routines
      const routinesRes = await axios.get(`${API_URL}/api/routines/${user.id}`);
      setRoutines(routinesRes.data.routines);

      // Fetch dose logs for selected date
      const logsRes = await axios.get(`${API_URL}/api/dose-logs/${user.id}?date=${dateStr}`);
      const logsMap: Record<string, DoseLog> = {};
      logsRes.data.dose_logs.forEach((log: DoseLog) => {
        logsMap[log.routine_id] = log;
      });
      setDoseLogs(logsMap);

      // Fetch stats
      const statsRes = await axios.get(`${API_URL}/api/dose-logs/${user.id}/stats?days=7`);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching routines:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const markDoseTaken = async (routine: RoutineEntry) => {
    if (!user) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existingLog = doseLogs[routine.id];
    const newStatus = existingLog?.status === 'taken' ? 'pending' : 'taken';

    try {
      await axios.post(`${API_URL}/api/dose-log`, {
        user_id: user.id,
        routine_id: routine.id,
        medicine_name: routine.medicine_name,
        time_slot: routine.time_slot,
        scheduled_date: dateStr,
        status: newStatus,
      });

      // Update local state
      setDoseLogs(prev => ({
        ...prev,
        [routine.id]: {
          ...prev[routine.id],
          id: prev[routine.id]?.id || '',
          routine_id: routine.id,
          medicine_name: routine.medicine_name,
          time_slot: routine.time_slot,
          status: newStatus,
        },
      }));

      // Refresh stats
      const statsRes = await axios.get(`${API_URL}/api/dose-logs/${user.id}/stats?days=7`);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error logging dose:', error);
      Alert.alert('Error', 'Could not update dose status');
    }
  };

  const addMedicine = async () => {
    if (!user || !newMedicine.name || !newMedicine.dosage) {
      Alert.alert('Error', 'Please fill in medicine name and dosage');
      return;
    }

    try {
      await axios.post(`${API_URL}/api/routines`, {
        user_id: user.id,
        medicine_name: newMedicine.name,
        dosage: newMedicine.dosage,
        time_slot: newMedicine.time_slot,
        instructions: newMedicine.instructions,
        duration_days: parseInt(newMedicine.duration) || 7,
      });

      setShowAddModal(false);
      setNewMedicine({
        name: '',
        dosage: '',
        time_slot: 'morning',
        instructions: '',
        duration: '7',
      });
      fetchData();
    } catch (error) {
      console.error('Error adding medicine:', error);
      Alert.alert('Error', 'Could not add medicine');
    }
  };

  const deleteRoutine = async (routineId: string) => {
    Alert.alert(
      'Delete Medicine',
      'Are you sure you want to remove this medicine from your routine?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/api/routines/${routineId}`);
              fetchData();
            } catch (error) {
              console.error('Error deleting routine:', error);
            }
          },
        },
      ]
    );
  };

  const toggleSection = (section: 'morning' | 'afternoon' | 'night') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderSection = (title: string, slot: 'morning' | 'afternoon' | 'night', items: RoutineEntry[], bgColor: string) => {
    const isExpanded = expandedSections[slot];

    return (
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.sectionHeader, { backgroundColor: bgColor }]}
          onPress={() => toggleSection(slot)}
        >
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{items.length}</Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.onPrimary}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.sectionContent}>
            {items.length === 0 ? (
              <Text style={styles.emptyText}>{t('noMedicines')}</Text>
            ) : (
              items.map(routine => {
                const log = doseLogs[routine.id];
                const isTaken = log?.status === 'taken';

                return (
                  <View key={routine.id} style={styles.medicineCard}>
                    <TouchableOpacity
                      style={[styles.checkbox, isTaken && styles.checkboxChecked]}
                      onPress={() => markDoseTaken(routine)}
                    >
                      {isTaken && <Ionicons name="checkmark" size={24} color={colors.onPrimary} />}
                    </TouchableOpacity>

                    <View style={styles.medicineInfo}>
                      <Text style={[styles.medicineName, isTaken && styles.takenText]}>
                        {routine.medicine_name}
                      </Text>
                      <Text style={styles.dosageText}>{routine.dosage}</Text>
                      {routine.instructions && (
                        <Text style={styles.instructionsText}>{routine.instructions}</Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteRoutine(routine.id)}
                    >
                      <Ionicons name="trash-outline" size={22} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}
      </View>
    );
  };

  const goToPreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const goToNextDay = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (selectedDate < tomorrow) {
      setSelectedDate(prev => {
        const next = new Date(prev);
        next.setDate(next.getDate() + 1);
        return next;
      });
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Please complete setup first</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('dailyRoutine')}</Text>
        </View>

        {/* Date Selector */}
        <View style={styles.dateSelector}>
          <TouchableOpacity style={styles.dateButton} onPress={goToPreviousDay}>
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.dateDisplay}>
            <Text style={styles.dateText}>
              {format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                ? t('today')
                : format(selectedDate, 'MMM dd, yyyy')}
            </Text>
          </View>
          <TouchableOpacity style={styles.dateButton} onPress={goToNextDay}>
            <Ionicons name="chevron-forward" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Compliance Stats */}
        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>{t('compliance')} (7 {t('durationDays')})</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.success }]}>{stats.taken}</Text>
                <Text style={styles.statLabel}>{t('taken')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.warning }]}>{stats.pending}</Text>
                <Text style={styles.statLabel}>{t('pending')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.error }]}>{stats.missed}</Text>
                <Text style={styles.statLabel}>{t('missed')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.compliance_rate}%</Text>
                <Text style={styles.statLabel}>Rate</Text>
              </View>
            </View>
          </View>
        )}

        {/* Routine Sections */}
        {renderSection(t('morning'), 'morning', routines.morning, colors.morning)}
        {renderSection(t('afternoon'), 'afternoon', routines.afternoon, colors.afternoon)}
        {renderSection(t('night'), 'night', routines.night, colors.night)}

        {/* Add Medicine Button */}
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={28} color={colors.onPrimary} />
          <Text style={styles.addButtonText}>{t('addMedicine')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Medicine Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('addMedicine')}</Text>

            <Text style={styles.inputLabel}>{t('medicineName')}</Text>
            <TextInput
              style={styles.input}
              value={newMedicine.name}
              onChangeText={text => setNewMedicine(prev => ({ ...prev, name: text }))}
              placeholder="e.g., Paracetamol"
              placeholderTextColor={colors.disabled}
            />

            <Text style={styles.inputLabel}>{t('dosage')}</Text>
            <TextInput
              style={styles.input}
              value={newMedicine.dosage}
              onChangeText={text => setNewMedicine(prev => ({ ...prev, dosage: text }))}
              placeholder="e.g., 500mg"
              placeholderTextColor={colors.disabled}
            />

            <Text style={styles.inputLabel}>{t('timeSlot')}</Text>
            <View style={styles.timeSlotRow}>
              {['morning', 'afternoon', 'night'].map(slot => (
                <TouchableOpacity
                  key={slot}
                  style={[
                    styles.timeSlotButton,
                    newMedicine.time_slot === slot && styles.timeSlotButtonActive,
                  ]}
                  onPress={() => setNewMedicine(prev => ({ ...prev, time_slot: slot }))}
                >
                  <Text
                    style={[
                      styles.timeSlotText,
                      newMedicine.time_slot === slot && styles.timeSlotTextActive,
                    ]}
                  >
                    {t(slot)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>{t('instructions')}</Text>
            <TextInput
              style={styles.input}
              value={newMedicine.instructions}
              onChangeText={text => setNewMedicine(prev => ({ ...prev, instructions: text }))}
              placeholder="e.g., After food"
              placeholderTextColor={colors.disabled}
            />

            <Text style={styles.inputLabel}>{t('durationDays')}</Text>
            <TextInput
              style={styles.input}
              value={newMedicine.duration}
              onChangeText={text => setNewMedicine(prev => ({ ...prev, duration: text }))}
              keyboardType="numeric"
              placeholder="7"
              placeholderTextColor={colors.disabled}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={addMedicine}>
                <Text style={styles.saveButtonText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.headingLarge,
    color: colors.onBackground,
    textAlign: 'center',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  dateButton: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    ...typography.heading,
    color: colors.onSurface,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardStroke,
  },
  statsTitle: {
    ...typography.body,
    color: colors.secondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...typography.headingLarge,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.label,
    color: colors.secondary,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.card,
    minHeight: touchTarget.minHeight,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.onPrimary,
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginRight: spacing.sm,
  },
  sectionBadgeText: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
  sectionContent: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: borderRadius.card,
    borderBottomRightRadius: borderRadius.card,
    padding: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.disabled,
    textAlign: 'center',
    padding: spacing.md,
  },
  medicineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.button,
    padding: spacing.md,
    marginVertical: spacing.xs,
  },
  checkbox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.onSurface,
  },
  takenText: {
    textDecorationLine: 'line-through',
    color: colors.disabled,
  },
  dosageText: {
    ...typography.body,
    color: colors.secondary,
  },
  instructionsText: {
    ...typography.label,
    color: colors.secondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  deleteButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.button,
    minHeight: touchTarget.minHeight,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  addButtonText: {
    color: colors.onPrimary,
    ...typography.body,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.card,
    borderTopRightRadius: borderRadius.card,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalTitle: {
    ...typography.headingLarge,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.lg,
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
  timeSlotRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timeSlotButton: {
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
  timeSlotButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeSlotText: {
    ...typography.body,
    color: colors.onSurface,
  },
  timeSlotTextActive: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelButton: {
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
  cancelButtonText: {
    ...typography.body,
    color: colors.onSurface,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    minHeight: touchTarget.minHeight,
    justifyContent: 'center',
  },
  saveButtonText: {
    ...typography.body,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.heading,
    color: colors.secondary,
    textAlign: 'center',
  },
});
