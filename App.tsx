import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';

const API_URL = 'http://10.0.2.2:5000/api/habits';
const CATEGORIES = ['Gym', 'Coding', 'Reading'] as const;

type Category = (typeof CATEGORIES)[number];

type Habit = {
  id: number;
  title: string;
  category: string;
  streak: number;
  completedToday: boolean;
  history: string[];
};

const CATEGORY_THEME: Record<string, {bg: string; text: string; accent: string}> =
  {
    Gym: {bg: '#FFE8E0', text: '#C43E11', accent: '#FF6B4A'},
    Coding: {bg: '#E4EDFF', text: '#1D4ED8', accent: '#4C8DFF'},
    Reading: {bg: '#E3F6EA', text: '#15803D', accent: '#2BB673'},
  };

const fallbackTheme = {bg: '#EEEAF8', text: '#5B4BDB', accent: '#7C6CF0'};

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F1FF" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <HabitStreakBuilder />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function HabitStreakBuilder() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('Gym');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchHabits = useCallback(async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error('Failed to load habits');
      }
      const data: Habit[] = await response.json();
      setHabits(data);
    } catch {
      Alert.alert(
        'Connection error',
        'Could not load habits. Make sure the server is running on port 5000.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const completedCount = useMemo(
    () => habits.filter(habit => habit.completedToday).length,
    [habits],
  );
  const progress =
    habits.length === 0 ? 0 : completedCount / habits.length;
  const progressPercent = Math.round(progress * 100);

  const addHabit = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert('Missing title', 'Please enter a habit title.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({title: trimmed, category}),
      });

      if (!response.ok) {
        throw new Error('Failed to create habit');
      }

      const created: Habit = await response.json();
      setHabits(prev => [...prev, created]);
      setTitle('');
      setCategory('Gym');
    } catch {
      Alert.alert('Could not add habit', 'Please try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteHabit = async (habit: Habit) => {
    setDeletingId(habit.id);
    try {
      const response = await fetch(`${API_URL}/${habit.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete habit');
      }

      setHabits(prev => prev.filter(item => item.id !== habit.id));
    } catch {
      Alert.alert('Could not delete habit', 'Please try again in a moment.');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleHabit = async (habit: Habit) => {
    setTogglingId(habit.id);
    try {
      const response = await fetch(`${API_URL}/${habit.id}/toggle`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to toggle habit');
      }

      const updated: Habit = await response.json();
      setHabits(prev => prev.map(item => (item.id === updated.id ? updated : item)));
    } catch {
      Alert.alert('Could not update habit', 'Please try again in a moment.');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#5B4BDB" />
          <Text style={styles.loaderText}>Loading your habits...</Text>
        </View>
      ) : (
        <FlatList
          data={habits}
          keyExtractor={item => String(item.id)}
          renderItem={({item}) => (
            <HabitCard
              habit={item}
              toggling={togglingId === item.id}
              deleting={deletingId === item.id}
              onToggle={() => toggleHabit(item)}
              onDelete={() => deleteHabit(item)}
            />
          )}
          ListHeaderComponent={
            <View>
              <Header
                completedCount={completedCount}
                total={habits.length}
                progressPercent={progressPercent}
              />
              <HabitForm
                title={title}
                category={category}
                submitting={submitting}
                onChangeTitle={setTitle}
                onChangeCategory={setCategory}
                onSubmit={addHabit}
              />
              <Text style={styles.listHeading}>Today's habits</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={styles.emptyTitle}>No habits yet</Text>
              <Text style={styles.emptyCopy}>
                Add your first routine above to start a streak.
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </KeyboardAvoidingView>
  );
}

function Header({
  completedCount,
  total,
  progressPercent,
}: {
  completedCount: number;
  total: number;
  progressPercent: number;
}) {
  return (
    <View style={styles.headerBlock}>
      <Text style={styles.kicker}>Daily routines</Text>
      <Text style={styles.appTitle}>Habit Streak Builder</Text>
      <Text style={styles.subtitle}>
        Stay consistent. Build streaks. Finish today.
      </Text>

      <View style={styles.progressCard}>
        <View style={styles.progressTop}>
          <View>
            <Text style={styles.progressLabel}>Today's progress</Text>
            <Text style={styles.progressRatio}>
              {completedCount} of {total} Completed
            </Text>
          </View>
          <View style={styles.percentBadge}>
            <Text style={styles.percentText}>{progressPercent}%</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {width: `${total === 0 ? 0 : progressPercent}%`},
            ]}
          />
        </View>
      </View>
    </View>
  );
}

function HabitForm({
  title,
  category,
  submitting,
  onChangeTitle,
  onChangeCategory,
  onSubmit,
}: {
  title: string;
  category: Category;
  submitting: boolean;
  onChangeTitle: (value: string) => void;
  onChangeCategory: (value: Category) => void;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Create a habit</Text>
      <TextInput
        value={title}
        onChangeText={onChangeTitle}
        placeholder="e.g. Evening stretch"
        placeholderTextColor="#9AA0B4"
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />
      <Text style={styles.fieldLabel}>Category</Text>
      <View style={styles.categoryRow}>
        {CATEGORIES.map(item => {
          const selected = item === category;
          const theme = CATEGORY_THEME[item];
          return (
            <Pressable
              key={item}
              onPress={() => onChangeCategory(item)}
              style={[
                styles.categoryChip,
                selected && {
                  backgroundColor: theme.accent,
                  borderColor: theme.accent,
                },
              ]}>
              <Text
                style={[
                  styles.categoryChipText,
                  selected && styles.categoryChipTextSelected,
                ]}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        onPress={onSubmit}
        disabled={submitting}
        style={({pressed}) => [
          styles.addButton,
          pressed && styles.addButtonPressed,
          submitting && styles.addButtonDisabled,
        ]}>
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.addButtonText}>Add Habit</Text>
        )}
      </Pressable>
    </View>
  );
}

function HabitCard({
  habit,
  toggling,
  deleting,
  onToggle,
  onDelete,
}: {
  habit: Habit;
  toggling: boolean;
  deleting: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const theme = CATEGORY_THEME[habit.category] ?? fallbackTheme;
  const streakLabel = habit.streak === 1 ? '1 Day' : `${habit.streak} Days`;

  return (
    <View
      style={[
        styles.habitCard,
        habit.completedToday && styles.habitCardDone,
      ]}>
      <View style={[styles.accentBar, {backgroundColor: theme.accent}]} />
      <View style={styles.habitBody}>
        <View style={styles.habitTop}>
          <View style={styles.habitCopy}>
            <Text style={styles.habitTitle} numberOfLines={2}>
              {habit.title}
            </Text>
            <View style={[styles.badge, {backgroundColor: theme.bg}]}>
              <Text style={[styles.badgeText, {color: theme.text}]}>
                {habit.category}
              </Text>
            </View>
          </View>
          <View style={styles.habitActions}>
            <Pressable
              onPress={onDelete}
              disabled={deleting}
              style={({pressed}) => [
                styles.deleteButton,
                pressed && styles.togglePressed,
              ]}>
              {deleting ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Text style={styles.deleteIcon}>🗑️</Text>
              )}
            </Pressable>
            <Pressable
              onPress={onToggle}
              disabled={toggling || deleting}
              style={({pressed}) => [
                styles.toggle,
                habit.completedToday && styles.toggleChecked,
                pressed && styles.togglePressed,
              ]}>
              {toggling ? (
                <ActivityIndicator
                  size="small"
                  color={habit.completedToday ? '#FFFFFF' : '#5B4BDB'}
                />
              ) : (
                <Text
                  style={[
                    styles.toggleMark,
                    habit.completedToday && styles.toggleMarkChecked,
                  ]}>
                  {habit.completedToday ? '✓' : ''}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
        <View style={styles.streakRow}>
          <Text style={styles.streakText}>🔥 {streakLabel}</Text>
          <Text style={styles.statusText}>
            {habit.completedToday ? 'Done today' : 'Not yet'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F1FF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    color: '#6B6685',
    fontSize: 15,
  },
  headerBlock: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  kicker: {
    color: '#7C6CF0',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  appTitle: {
    marginTop: 6,
    color: '#1C1933',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 6,
    color: '#6B6685',
    fontSize: 15,
    lineHeight: 22,
  },
  progressCard: {
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    elevation: 4,
    shadowColor: '#3B2E8A',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressLabel: {
    color: '#6B6685',
    fontSize: 13,
    fontWeight: '600',
  },
  progressRatio: {
    marginTop: 4,
    color: '#1C1933',
    fontSize: 20,
    fontWeight: '800',
  },
  percentBadge: {
    backgroundColor: '#EDE9FF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  percentText: {
    color: '#5B4BDB',
    fontWeight: '800',
    fontSize: 14,
  },
  progressTrack: {
    height: 12,
    backgroundColor: '#EEEAF8',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#5B4BDB',
    borderRadius: 999,
  },
  formCard: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    elevation: 3,
    shadowColor: '#3B2E8A',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  formTitle: {
    color: '#1C1933',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#E4E0F2',
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#1C1933',
    backgroundColor: '#FBFAFF',
  },
  fieldLabel: {
    marginTop: 14,
    marginBottom: 8,
    color: '#6B6685',
    fontSize: 13,
    fontWeight: '700',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E4E0F2',
    backgroundColor: '#FBFAFF',
  },
  categoryChipText: {
    color: '#4A4663',
    fontWeight: '700',
    fontSize: 13,
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  addButton: {
    marginTop: 16,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#5B4BDB',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  addButtonPressed: {
    opacity: 0.9,
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  listHeading: {
    marginTop: 22,
    marginBottom: 10,
    color: '#1C1933',
    fontSize: 18,
    fontWeight: '800',
  },
  habitCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#3B2E8A',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  habitCardDone: {
    backgroundColor: '#F7FFF9',
  },
  accentBar: {
    width: 6,
  },
  habitBody: {
    flex: 1,
    padding: 14,
  },
  habitTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  habitCopy: {
    flex: 1,
  },
  habitActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F0D4D4',
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    fontSize: 16,
  },
  habitTitle: {
    color: '#1C1933',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  toggle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D9D4EE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  toggleChecked: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  togglePressed: {
    transform: [{scale: 0.96}],
  },
  toggleMark: {
    fontSize: 18,
    fontWeight: '800',
    color: 'transparent',
  },
  toggleMarkChecked: {
    color: '#FFFFFF',
  },
  streakRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakText: {
    color: '#C2410C',
    fontSize: 14,
    fontWeight: '800',
  },
  statusText: {
    color: '#6B6685',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 28,
    elevation: 2,
  },
  emptyEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyTitle: {
    color: '#1C1933',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyCopy: {
    marginTop: 6,
    color: '#6B6685',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default App;
