import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  getReport,
  type AutoclickerReport,
} from 'react-native-autoclicker-detection';

export default function App() {
  const [report, setReport] = useState<AutoclickerReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReport()
      .then(setReport)
      .catch((e: unknown) => setError(String(e)));
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {report ? `Risk: ${report.riskLevel} (${report.score})` : 'Scanning…'}
      </Text>

      {error != null && <Text style={styles.error}>{error}</Text>}

      {report?.reasons.map((reason) => (
        <Text key={reason} style={styles.reason}>
          • {reason}
        </Text>
      ))}

      <Text style={styles.section}>Enabled accessibility services</Text>
      {report?.enabledAccessibilityServices.length === 0 && (
        <Text style={styles.reason}>none</Text>
      )}
      {report?.enabledAccessibilityServices.map((service) => (
        <View key={service.componentName} style={styles.row}>
          <Text style={styles.reason}>
            {service.label || service.packageName}
          </Text>
          <Text style={styles.meta}>
            {service.allowed ? 'allowlisted' : 'not allowlisted'}
            {service.canPerformGestures ? ' · can inject gestures' : ''}
          </Text>
        </View>
      ))}
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
  error: {
    color: '#b00020',
  },
});
