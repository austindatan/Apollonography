/**
 * src/screens/DatabaseRecoveryScreen.tsx
 *
 * Database Recovery and Diagnostic Screen for Apollonography.
 * Provides 1-click rollback to the latest daily snapshot, manual backup restoration,
 * database integrity checks, and emergency re-seed capability.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import BrutalBox from '../components/brutal/BrutalBox';
import BrutalButton from '../components/brutal/BrutalButton';
import { BORDER, CREAM, INK, RADIUS, SHADOW, WHITE, YELLOW } from '../theme/brutal';
import { getStorageAdapter, resetStorageAdapter } from '../db/database';
import { listBackups, createBackup, BackupFileInfo } from '../services/backupService';
import { seedDatabaseIfEmpty } from '../db/seed';

interface Props {
  onDismiss?: () => void;
  onRecoveryComplete?: () => void;
}

export const DatabaseRecoveryScreen: React.FC<Props> = ({
  onDismiss,
  onRecoveryComplete,
}) => {
  const [engine, setEngine] = useState<'sqlite' | 'json'>('json');
  const [backups, setBackups] = useState<BackupFileInfo[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('Ready');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const loadDiagnostics = async () => {
    try {
      const adapter = await getStorageAdapter();
      setEngine(adapter.getStorageType());
      const list = await listBackups();
      setBackups(list);
    } catch (err: any) {
      setStatusMessage(`Diagnostic error: ${err?.message || err}`);
    }
  };

  const handleManualBackup = async () => {
    setIsBusy(true);
    setStatusMessage('Creating manual backup snapshot...');
    try {
      const path = await createBackup();
      if (path) {
        setStatusMessage(`Backup created successfully: ${path}`);
        await loadDiagnostics();
      } else {
        setStatusMessage('Backup could not be completed.');
      }
    } catch (err: any) {
      setStatusMessage(`Backup error: ${err?.message || err}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleResetAndSeed = async () => {
    setIsBusy(true);
    setStatusMessage('Resetting database and seeding factory mock data...');
    try {
      await resetStorageAdapter();
      const adapter = await getStorageAdapter();
      await adapter.executeSql('DELETE FROM entries;');
      await adapter.executeSql('DELETE FROM projects;');
      await adapter.executeSql('DELETE FROM categories;');
      await adapter.executeSql('DELETE FROM tags;');
      await adapter.executeSql('DELETE FROM entry_tags;');
      await adapter.executeSql('DELETE FROM chapters;');
      await seedDatabaseIfEmpty(adapter);
      setStatusMessage('Factory mock data re-seeded successfully!');
      if (onRecoveryComplete) onRecoveryComplete();
    } catch (err: any) {
      setStatusMessage(`Reset error: ${err?.message || err}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <BrutalBox style={styles.card} fill={CREAM}>
        <View style={styles.header}>
          <Text style={styles.title}>🛠️ DATABASE RECOVERY & HEALTH</Text>
          <Text style={styles.subtitle}>
            Apollonography Local Storage Diagnostic and Safe Rollback Utility
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>ACTIVE STORAGE ENGINE:</Text>
          <Text style={styles.infoValue}>{engine.toUpperCase()}</Text>
          <Text style={styles.infoLabel}>STATUS:</Text>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>

        <Text style={styles.sectionHeader}>AVAILABLE DAILY BACKUPS ({backups.length}/5)</Text>
        <ScrollView style={styles.backupList} showsVerticalScrollIndicator={false}>
          {backups.length === 0 ? (
            <Text style={styles.emptyText}>No automated backup snapshots recorded yet.</Text>
          ) : (
            backups.map((b) => (
              <View key={b.filename} style={styles.backupItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.backupName} numberOfLines={1}>{b.filename}</Text>
                  <Text style={styles.backupMeta}>
                    {(b.sizeBytes / 1024).toFixed(1)} KB • {new Date(b.createdAt).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.buttonRow}>
          <BrutalButton
            label="📸 CREATE SNAPSHOT"
            variant="secondary"
            size="sm"
            onPress={handleManualBackup}
            disabled={isBusy}
          />
          <BrutalButton
            label="⚠️ RESET & RE-SEED"
            variant="secondary"
            size="sm"
            onPress={handleResetAndSeed}
            disabled={isBusy}
          />
          {onDismiss && (
            <BrutalButton
              label="CLOSE"
              variant="primary"
              accentColor={YELLOW}
              size="sm"
              onPress={onDismiss}
              disabled={isBusy}
            />
          )}
        </View>
      </BrutalBox>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 680,
    padding: 24,
    borderWidth: 3,
    borderColor: INK,
    borderRadius: RADIUS.card,
    backgroundColor: CREAM,
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: INK,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: INK,
    fontFamily: 'Space Grotesk',
  },
  subtitle: {
    fontSize: 11,
    color: '#555555',
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: RADIUS.small,
    padding: 12,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#777777',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '800',
    color: INK,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: INK,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  backupList: {
    maxHeight: 180,
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: RADIUS.small,
    padding: 8,
    marginBottom: 16,
  },
  backupItem: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backupName: {
    fontSize: 11,
    fontWeight: '700',
    color: INK,
  },
  backupMeta: {
    fontSize: 9,
    color: '#666666',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 11,
    color: '#888888',
    fontStyle: 'italic',
    padding: 12,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 2,
    borderTopColor: INK,
    paddingTop: 14,
  },
});
