import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Header, Card, LoadingIndicator, EmptyState } from '../components';

const DashboardScreen = () => {
  const { user, api } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    facultyCount: 0,
    courseCount: 0,
    submissions: 0,
    totalWorkload: 0,
  });

  const isAdmin = user?.role === 'admin' || user?.canAccessAdmin === true;

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch summary data
      const facultyRes = await api.get('/api/faculty?limit=1');
      const courseRes = await api.get('/api/courses?limit=1');
      const submissionsRes = await api.get('/api/submissions?limit=1');

      setData({
        facultyCount: facultyRes.data.data?.meta?.total || 0,
        courseCount: courseRes.data.data?.meta?.total || 0,
        submissions: submissionsRes.data.data?.meta?.total || 0,
        totalWorkload: 0,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={styles.container}>
      <Header
        title={isAdmin ? 'Admin Dashboard' : `Welcome, ${user?.name}`}
        subtitle={isAdmin ? 'System Overview' : 'Faculty Dashboard'}
      />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isAdmin ? (
          <>
            {/* Admin Stats */}
            <Text style={styles.sectionTitle}>System Statistics</Text>

            <View style={styles.statsGrid}>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{data.facultyCount}</Text>
                <Text style={styles.statLabel}>Faculty Members</Text>
              </Card>

              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{data.courseCount}</Text>
                <Text style={styles.statLabel}>Courses</Text>
              </Card>
            </View>

            <View style={styles.statsGrid}>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{data.submissions}</Text>
                <Text style={styles.statLabel}>Submissions</Text>
              </Card>

              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{data.totalWorkload}h</Text>
                <Text style={styles.statLabel}>Total Workload</Text>
              </Card>
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <Card>
              <Text style={styles.actionTitle}>📊 Manage Faculty</Text>
              <Text style={styles.actionDesc}>Add, edit, or remove faculty members</Text>
            </Card>

            <Card>
              <Text style={styles.actionTitle}>📚 Manage Courses</Text>
              <Text style={styles.actionDesc}>Configure courses and sections</Text>
            </Card>

            <Card>
              <Text style={styles.actionTitle}>✅ Review Submissions</Text>
              <Text style={styles.actionDesc}>Review and approve faculty submissions</Text>
            </Card>
          </>
        ) : (
          <>
            {/* Faculty Stats */}
            <Text style={styles.sectionTitle}>My Status</Text>

            <Card style={[styles.statCard, { marginBottom: 16 }]}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Email:</Text>
                <Text style={styles.statValue}>{user?.email}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Role:</Text>
                <Text style={styles.statValue}>Faculty</Text>
              </View>
            </Card>

            {/* Quick Info */}
            <Text style={styles.sectionTitle}>Quick Links</Text>

            <Card>
              <Text style={styles.actionTitle}>📋 View My Workload</Text>
              <Text style={styles.actionDesc}>Check your current workload and allocations</Text>
            </Card>

            <Card>
              <Text style={styles.actionTitle}>📝 Submit Form</Text>
              <Text style={styles.actionDesc}>Submit your workload information</Text>
            </Card>

            <Card>
              <Text style={styles.actionTitle}>✅ My Submissions</Text>
              <Text style={styles.actionDesc}>View your submission history</Text>
            </Card>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 24,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  actionDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  spacing: {
    height: 32,
  },
});

export default DashboardScreen;
