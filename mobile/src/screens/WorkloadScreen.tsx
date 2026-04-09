import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Header, Card, LoadingIndicator, EmptyState } from '../components';
import { WorkloadService } from '../services';

const WorkloadScreen = () => {
  const { api } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workloads, setWorkloads] = useState<any[]>([]);

  const workloadService = new WorkloadService(api);

  const fetchWorkloads = async () => {
    try {
      setLoading(true);
      const response = await workloadService.getAllWorkloads();
      setWorkloads(response.data || []);
    } catch (error) {
      console.error('Failed to fetch workloads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkloads();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWorkloads();
    setRefreshing(false);
  };

  const renderWorkloadItem = ({ item }: { item: any }) => (
    <Card style={styles.workloadCard}>
      <View style={styles.workloadHeader}>
        <View style={styles.workloadInfo}>
          <Text style={styles.workloadTitle}>{item.facultyName || 'Faculty'}</Text>
          <Text style={styles.workloadId}>ID: {item.facultyId}</Text>
        </View>
        <View style={styles.hoursBadge}>
          <Text style={styles.hoursText}>{item.totalHours || 0}h</Text>
        </View>
      </View>
      <View style={styles.workloadDetails}>
        {item.courseCount && (
          <Text style={styles.detailText}>📚 Courses: {item.courseCount}</Text>
        )}
        {item.updatedAt && (
          <Text style={styles.detailText}>📅 Updated: {new Date(item.updatedAt).toLocaleDateString()}</Text>
        )}
      </View>
    </Card>
  );

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={styles.container}>
      <Header title="Workload" subtitle={`${workloads.length} faculty`} />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {workloads.length === 0 ? (
          <EmptyState message="No workload data found" icon="📊" />
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Workload</Text>
              <Text style={styles.summaryValue}>
                {workloads.reduce((sum, w) => sum + (w.totalHours || 0), 0)}h
              </Text>
            </View>

            <FlatList
              data={workloads}
              renderItem={renderWorkloadItem}
              keyExtractor={(item) => item._id || item.facultyId}
              scrollEnabled={false}
              nestedScrollEnabled={false}
            />
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
  summaryCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e40af',
    marginTop: 8,
  },
  workloadCard: {
    marginBottom: 12,
  },
  workloadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workloadInfo: {
    flex: 1,
  },
  workloadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  workloadId: {
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
  workloadDetails: {
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#64748b',
  },
  spacing: {
    height: 32,
  },
});

export default WorkloadScreen;
