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
import { AllocationService } from '../services';

const AllocationScreen = () => {
  const { api } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allocations, setAllocations] = useState<any[]>([]);

  const allocationService = new AllocationService(api);

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      const response = await allocationService.getAllAllocations();
      setAllocations(response.data || []);
    } catch (error) {
      console.error('Failed to fetch allocations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllocations();
    setRefreshing(false);
  };

  const renderAllocationItem = ({ item }: { item: any }) => (
    <Card style={styles.allocationCard}>
      <View style={styles.allocationHeader}>
        <View style={styles.allocationInfo}>
          <Text style={styles.allocationTitle}>{item.courseCode || 'Course'}</Text>
          <Text style={styles.allocationSubtitle}>{item.facultyName || 'Faculty'}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status || 'Allocated'}</Text>
        </View>
      </View>
      <View style={styles.allocationDetails}>
        {item.section && (
          <Text style={styles.detailText}>📍 Section: {item.section}</Text>
        )}
        {item.hours && (
          <Text style={styles.detailText}>⏱️ Hours: {item.hours}</Text>
        )}
      </View>
    </Card>
  );

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={styles.container}>
      <Header title="Allocation" subtitle={`${allocations.length} allocations`} />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {allocations.length === 0 ? (
          <EmptyState message="No allocations found" icon="📊" />
        ) : (
          <FlatList
            data={allocations}
            renderItem={renderAllocationItem}
            keyExtractor={(item) => item._id || `${item.facultyId}-${item.courseCode}`}
            scrollEnabled={false}
            nestedScrollEnabled={false}
          />
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
  allocationCard: {
    marginBottom: 12,
  },
  allocationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  allocationInfo: {
    flex: 1,
  },
  allocationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  allocationSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },
  allocationDetails: {
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

export default AllocationScreen;
