import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Header, Card, LoadingIndicator, EmptyState } from '../components';
import { WorkloadService } from '../services';

const MyWorkloadScreen = () => {
  const { user, api } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workload, setWorkload] = useState<any>(null);

  const workloadService = new WorkloadService(api);

  const fetchMyWorkload = async () => {
    try {
      setLoading(true);
      if (user?.id) {
        const response = await workloadService.getWorkloadByFaculty(user.id);
        setWorkload(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch workload:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyWorkload();
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMyWorkload();
    setRefreshing(false);
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  const totalHours = Array.isArray(workload)
    ? workload.reduce((sum, w) => sum + (w.hours || 0), 0)
    : workload?.totalHours || 0;

  const courseCount = Array.isArray(workload) ? workload.length : 0;

  return (
    <View style={styles.container}>
      <Header title="My Workload" subtitle="Current workload details" />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {!workload || (Array.isArray(workload) && workload.length === 0) ? (
          <EmptyState message="No workload assigned yet" icon="📋" />
        ) : (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
              <Card style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Hours</Text>
                <Text style={styles.summaryValue}>{totalHours}</Text>
              </Card>

              <Card style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Courses</Text>
                <Text style={styles.summaryValue}>{courseCount}</Text>
              </Card>
            </View>

            {/* Workload Breakdown */}
            {Array.isArray(workload) && workload.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Workload Details</Text>
                {workload.map((item, index) => (
                  <Card key={index} style={styles.courseCard}>
                    <View style={styles.courseHeader}>
                      <View>
                        <Text style={styles.courseName}>
                          {item.courseCode || `Course ${index + 1}`}
                        </Text>
                        {item.section && (
                          <Text style={styles.courseSection}>
                            Section: {item.section}
                          </Text>
                        )}
                      </View>
                      <View style={styles.hoursBadge}>
                        <Text style={styles.hoursText}>{item.hours || 0}h</Text>
                      </View>
                    </View>
                    {item.description && (
                      <Text style={styles.description}>{item.description}</Text>
                    )}
                  </Card>
                ))}
              </>
            )}
          </>
        )}

        <View style={styles.spacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3b82f6',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  courseCard: {
    marginBottom: 12,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  courseSection: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  hoursBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  hoursText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
  },
  description: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  spacing: {
    height: 32,
  },
});

export default MyWorkloadScreen;
