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
import { SubmissionService } from '../services';

const MySubmissionsScreen = () => {
  const { user, api } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);

  const submissionService = new SubmissionService(api);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      if (user?.id) {
        const response = await submissionService.getSubmissionsByFaculty(user.id);
        setSubmissions(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSubmissions();
    setRefreshing(false);
  };

  const renderSubmissionItem = ({ item }: { item: any }) => (
    <Card style={styles.submissionCard}>
      <View style={styles.submissionHeader}>
        <View style={styles.submissionInfo}>
          <Text style={styles.submissionTitle}>
            Submission #{item.submissionNumber || item._id?.slice(-4)}
          </Text>
          <Text style={styles.submissionDate}>
            {item.createdAt
              ? new Date(item.createdAt).toLocaleDateString()
              : 'Date unknown'}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === 'approved'
                  ? '#dcfce7'
                  : item.status === 'rejected'
                  ? '#fee2e2'
                  : '#fef3c7',
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  item.status === 'approved'
                    ? '#166534'
                    : item.status === 'rejected'
                    ? '#991b1b'
                    : '#92400e',
              },
            ]}
          >
            {item.status || 'Pending'}
          </Text>
        </View>
      </View>

      {item.remarks && (
        <View style={styles.remarksSection}>
          <Text style={styles.remarksLabel}>Remarks:</Text>
          <Text style={styles.remarksText}>{item.remarks}</Text>
        </View>
      )}
    </Card>
  );

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={styles.container}>
      <Header
        title="My Submissions"
        subtitle={`${submissions.length} submissions`}
      />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {submissions.length === 0 ? (
          <EmptyState message="No submissions yet" icon="📝" />
        ) : (
          <FlatList
            data={submissions}
            renderItem={renderSubmissionItem}
            keyExtractor={(item) => item._id}
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
  submissionCard: {
    marginBottom: 12,
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  submissionInfo: {
    flex: 1,
  },
  submissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  submissionDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  remarksSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  remarksLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  remarksText: {
    fontSize: 12,
    color: '#1e293b',
    lineHeight: 18,
  },
  spacing: {
    height: 32,
  },
});

export default MySubmissionsScreen;
