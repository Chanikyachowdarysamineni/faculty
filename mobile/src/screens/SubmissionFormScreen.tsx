import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Header, Card, LoadingIndicator } from '../components';
import { SubmissionService, SettingsService } from '../services';

const SubmissionFormScreen = () => {
  const { user, api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formEnabled, setFormEnabled] = useState(true);
  const [formData, setFormData] = useState({
    courseDetails: '',
    workloadHours: '',
    remarks: '',
    otherDetails: '',
  });

  const submissionService = new SubmissionService(api);
  const settingsService = new SettingsService(api);

  const checkFormStatus = async () => {
    try {
      const response = await settingsService.getFormStatus();
      setFormEnabled(response.data?.formEnabled !== false);
    } catch (error) {
      console.error('Failed to check form status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkFormStatus();
  }, []);

  const handleSubmit = async () => {
    if (!formData.courseDetails.trim()) {
      Alert.alert('Validation', 'Please enter course details');
      return;
    }

    if (!formData.workloadHours.trim()) {
      Alert.alert('Validation', 'Please enter workload hours');
      return;
    }

    setSubmitting(true);
    try {
      const submitData = {
        facultyId: user?.id,
        courseDetails: formData.courseDetails,
        workloadHours: parseFloat(formData.workloadHours),
        remarks: formData.remarks,
        otherDetails: formData.otherDetails,
        status: 'pending',
      };

      const response = await submissionService.createSubmission(submitData);

      if (response.success) {
        Alert.alert(
          'Success',
          'Submission submitted successfully',
          [
            {
              text: 'OK',
              onPress: () => {
                setFormData({
                  courseDetails: '',
                  workloadHours: '',
                  remarks: '',
                  otherDetails: '',
                });
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to submit form');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  if (!formEnabled) {
    return (
      <View style={styles.container}>
        <Header title="Submit Form" subtitle="Workload submission" />
        <View style={styles.disabledContainer}>
          <Text style={styles.disabledIcon}>🔒</Text>
          <Text style={styles.disabledTitle}>Form Currently Closed</Text>
          <Text style={styles.disabledMessage}>
            The workload submission form is currently closed. Please contact the
            administration for more information.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Header title="Submit Form" subtitle="Submit your workload information" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>📝 Work Load Information</Text>
          <Text style={styles.infoText}>
            Please provide detailed information about your current workload
            allocation and activities.
          </Text>
        </Card>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Course Details *</Text>
          <TextInput
            style={[styles.textInput, styles.textAreaInput]}
            placeholder="Enter course details, codes, and sections..."
            multiline
            numberOfLines={4}
            value={formData.courseDetails}
            onChangeText={(text) =>
              setFormData({ ...formData, courseDetails: text })
            }
            editable={!submitting}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Workload Hours *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter total hours"
            keyboardType="decimal-pad"
            value={formData.workloadHours}
            onChangeText={(text) =>
              setFormData({ ...formData, workloadHours: text })
            }
            editable={!submitting}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Academic Remarks</Text>
          <TextInput
            style={[styles.textInput, styles.textAreaInput]}
            placeholder="Any additional remarks or comments..."
            multiline
            numberOfLines={3}
            value={formData.remarks}
            onChangeText={(text) =>
              setFormData({ ...formData, remarks: text })
            }
            editable={!submitting}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Other Details</Text>
          <TextInput
            style={[styles.textInput, styles.textAreaInput]}
            placeholder="Any other important details..."
            multiline
            numberOfLines={3}
            value={formData.otherDetails}
            onChangeText={(text) =>
              setFormData({ ...formData, otherDetails: text })
            }
            editable={!submitting}
            placeholderTextColor="#999"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>✅ Submit Form</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.spacing} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  disabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  disabledIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  disabledTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  disabledMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    marginBottom: 24,
    backgroundColor: '#eff6ff',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#064e3b',
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
  },
  textAreaInput: {
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  spacing: {
    height: 32,
  },
});

export default SubmissionFormScreen;
