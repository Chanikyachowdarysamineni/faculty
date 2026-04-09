import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Header, Card, LoadingIndicator, EmptyState } from '../components';
import { FacultyService } from '../services';

const FacultyScreen = () => {
  const { api } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [faculty, setFaculty] = useState<any[]>([]);

  const facultyService = new FacultyService(api);

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const response = await facultyService.getAllFaculty();
      setFaculty(response.data || []);
    } catch (error) {
      console.error('Failed to fetch faculty:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFaculty();
    setRefreshing(false);
  };

  const filteredFaculty = faculty.filter(
    f =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.empId.toLowerCase().includes(search.toLowerCase())
  );

  const renderFacultyItem = ({ item }: { item: any }) => (
    <Card style={styles.facultyCard}>
      <View style={styles.facultyHeader}>
        <View style={styles.facultyInfo}>
          <Text style={styles.facultyName}>{item.name}</Text>
          <Text style={styles.facultyId}>ID: {item.empId}</Text>
        </View>
        <View style={styles.facultyBadge}>
          <Text style={styles.badgeText}>{item.designation}</Text>
        </View>
      </View>
      <View style={styles.facultyDetails}>
        {item.mobile && (
          <Text style={styles.detailText}>📱 {item.mobile}</Text>
        )}
        {item.email && (
          <Text style={styles.detailText}>✉️ {item.email}</Text>
        )}
      </View>
    </Card>
  );

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={styles.container}>
      <Header title="Faculty List" subtitle={`${faculty.length} members`} />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or ID..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#999"
          />
        </View>

        {filteredFaculty.length === 0 ? (
          <EmptyState message="No faculty members found" />
        ) : (
          <FlatList
            data={filteredFaculty}
            renderItem={renderFacultyItem}
            keyExtractor={(item) => item.empId}
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
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  facultyCard: {
    marginBottom: 12,
  },
  facultyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  facultyInfo: {
    flex: 1,
  },
  facultyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  facultyId: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  facultyBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e40af',
  },
  facultyDetails: {
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

export default FacultyScreen;
