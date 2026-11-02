import { useCallback, useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  getReport,
  isAvailable,
  type AutoclickerReport,
} from 'react-native-autoclicker-detection';

export default function App() {
  const [report, setReport] = useState<AutoclickerReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);

  const scan = useCallback(() => {
    setScanning(true);
    setError(null);

    getReport()
      .then(setReport)
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setScanning(false));
  }, []);

  useEffect(scan, [scan]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {scanning
          ? 'Scanning...'
          : report
            ? `Risk: ${report.riskLevel} (${report.score}/100)`
            : 'No report'}
      </Text>

      {!isAvailable() && (
        <Text style={styles.notice}>
          Detection is unavailable on this platform or in Expo Go.
        </Text>
      )}

      {error != null && <Text style={styles.error}>{error}</Text>}

      <Button
        title={scanning ? 'Scanning...' : 'Scan again'}
        onPress={scan}
        disabled={scanning}
      />

      {report?.reasons.map((reason) => (
        <Text key={reason} style={styles.reason}>
          - {reason}
        </Text>
      ))}

      <Text style={styles.section}>Environment</Text>
      <Text style={styles.reason}>
        ADB enabled: {String(report?.environment.adbEnabled ?? false)}
      </Text>
      <Text style={styles.reason}>
        Rooted: {String(report?.environment.rooted ?? false)}
      </Text>
      <Text style={styles.reason}>
        Emulator: {String(report?.environment.emulator ?? false)}
      </Text>

      <Text style={styles.section}>Installed automation packages</Text>
      {report == null || report.installedAutomationPackages.length === 0 ? (
        <Text style={styles.reason}>none</Text>
      ) : (
        report.installedAutomationPackages.map((packageName) => (
          <Text key={packageName} style={styles.reason}>
            {packageName}
          </Text>
        ))
      )}

      <Text style={styles.section}>Enabled accessibility services</Text>
      {report == null || report.enabledAccessibilityServices.length === 0 ? (
        <Text style={styles.reason}>none</Text>
      ) : (
        report.enabledAccessibilityServices.map((service) => (
          <View key={service.componentName} style={styles.row}>
            <Text style={styles.reason}>
              {service.label || service.packageName}
            </Text>
            <Text style={styles.meta}>
              {service.componentName} -{' '}
              {service.allowed ? 'allowlisted' : 'not allowlisted'}
              {service.canPerformGestures ? ', can inject gestures' : ''}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  section: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  row: {
    gap: 2,
  },
  reason: {
    fontSize: 14,
  },
  meta: {
    fontSize: 12,
    color: '#666',
  },
  notice: {
    color: '#8a6d00',
  },
  error: {
    color: '#b00020',
  },
});
