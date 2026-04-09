import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  FlatList,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Header, Card, LoadingIndicator, EmptyState } from '../components';
import { CourseService } from '../services';

const CoursesScreen = () => {
  const { api } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courses, setCourses] = useState<any[]>([]);

  const courseService = new CourseService(api);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await courseService.getAllCourses();
      setCourses(response.data || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCourses();
    setRefreshing(false);
  };

  const filteredCourses = courses.filter(
    c =>
      c.courseCode?.toLowerCase().includes(search.toLowerCase()) ||
      c.courseName?.toLowerCase().includes(search.toLowerCase())
  );

  const renderCourseItem = ({ item }: { item: any }) => (
    <Card style={styles.courseCard}>
      <View style={styles.courseHeader}>
        <View style={styles.courseInfo}>
          <Text style={styles.courseName}>{item.courseName || item.courseCode}</Text>
          <Text style={styles.courseCode}>{item.courseCode}</Text>
        </View>
        <View style={styles.creditBadge}>
          <Text style={styles.creditText}>{item.credits || 0} C</Text>
        </View>
      </View>
      <View style={styles.courseDetails}>
        {item.section && (
          <Text style={styles.detailText}>📍 Section: {item.section}</Text>
        )}
        {item.semester && (
          <Text style={styles.detailText}>📅 Semester: {item.semester}</Text>
        )}
      </View>
    </Card>
  );

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={styles.container}>
      <Header title="Courses" subtitle={`${courses.length} courses`} />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#999"
          />
        </View>

        {filteredCourses.length === 0 ? (
          <EmptyState message="No courses found" icon="📚" />
        ) : (
          <FlatList
            data={filteredCourses}
            renderItem={renderCourseItem}
            keyExtractor={(item) => item._id || item.courseCode}
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
  courseCard: {
    marginBottom: 12,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  courseCode: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  creditBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  creditText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
  },
  courseDetails: {
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

export default CoursesScreen;
