'use client';

import { useState, useCallback, useEffect } from 'react';
import { useApi } from './use-api';
import { toast } from 'sonner';

type MeetingSummary = {
  id: string;
  title: string;
  date: string;
  duration: string;
  participants: string[];
  summary: string;
  keyPoints: string[];
  actionItems: Array<{
    id: string;
    task: string;
    assignee: string;
    dueDate: string;
    completed: boolean;
  }>;
  transcript?: string;
  audioUrl?: string;
  createdAt: string;
  updatedAt: string;
};

type UseMeetingSummaryOptions = {
  onSuccess?: (data: MeetingSummary) => void;
  onError?: (error: Error) => void;
};

export function useMeetingSummary({ onSuccess, onError }: UseMeetingSummaryOptions = {}) {
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { post, get, patch, delete: deleteRequest } = useApi<MeetingSummary>();

  // Create a new meeting summary
  const createSummary = useCallback(
    async (file: File, title: string = 'Untitled Meeting') => {
      setIsLoading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);

        const { data, error } = await post('/api/summaries', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onSuccess: (data) => {
            setSummary(data);
            onSuccess?.(data);
            toast.success('Meeting summary created successfully');
          },
          onError: (err) => {
            setError(err.message);
            onError?.(err);
            toast.error('Failed to create meeting summary');
          },
        });

        return { data, error };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create meeting summary';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
        toast.error(errorMessage);
        return { data: null, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [post, onSuccess, onError]
  );

  // Fetch a meeting summary by ID
  const fetchSummary = useCallback(
    async (id: string) => {
      if (!id) return null;

      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await get(`/api/summaries/${id}`, {
          onSuccess: (data) => {
            setSummary(data);
            onSuccess?.(data);
          },
          onError: (err) => {
            setError(err.message);
            onError?.(err);
            toast.error('Failed to fetch meeting summary');
          },
        });

        return { data, error };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch meeting summary';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
        toast.error(errorMessage);
        return { data: null, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [get, onSuccess, onError]
  );

  // Update a meeting summary
  const updateSummary = useCallback(
    async (id: string, updates: Partial<MeetingSummary>) => {
      if (!id) return null;

      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await patch(
          `/api/summaries/${id}`,
          { ...updates },
          {
            onSuccess: (data: MeetingSummary) => {
              setSummary(data);
              onSuccess?.(data);
              toast.success('Meeting summary updated successfully');
            },
            onError: (err: Error, attemptNumber?: number) => {
              setError(err.message);
              onError?.(err);
              toast.error('Failed to update meeting summary');
            },
          }
        );

        return { data, error };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update meeting summary';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
        toast.error(errorMessage);
        return { data: null, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [post, onSuccess, onError]
  );

  // Delete a meeting summary
  const deleteSummary = useCallback(
    async (id: string) => {
      if (!id) return false;

      setIsLoading(true);
      setError(null);

      try {
        const response = await deleteRequest(
          `/api/summaries/${id}`,
          {
            onSuccess: (data: MeetingSummary) => {
              setSummary(null);
              toast.success('Meeting summary deleted successfully');
            },
            onError: (err: Error, attemptNumber?: number) => {
              setError(err.message);
              onError?.(err);
              toast.error('Failed to delete meeting summary');
              return false;
            },
          }
        );

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete meeting summary';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
        toast.error(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [post, onError]
  );

  // Export summary as PDF
  const exportToPdf = useCallback(
    async (id: string, fileName: string = 'meeting-summary') => {
      if (!id) return false;

      try {
        const response = await fetch(`/api/summaries/${id}/export?format=pdf`);
        
        if (!response.ok) {
          throw new Error('Failed to export to PDF');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success('PDF exported successfully');
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to export to PDF';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
        toast.error(errorMessage);
        return false;
      }
    },
    [onError]
  );

  // Send summary via email
  const sendEmail = useCallback(
    async (id: string, recipients: string[], message: string = '') => {
      if (!id || !recipients.length) return false;

      setIsLoading(true);
      setError(null);

      try {
        const { error } = await post(
          `/api/summaries/${id}/email`,
          { recipients, message },
          {
            onSuccess: () => {
              toast.success('Email sent successfully');
            },
            onError: (err) => {
              setError(err.message);
              onError?.(err);
              toast.error('Failed to send email');
            },
          }
        );

        return !error;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send email';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
        toast.error(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [post, onError]
  );

  // Add a calendar event
  const addToCalendar = useCallback(
    async (id: string, eventDetails: { title: string; date: string; duration: number }) => {
      if (!id) return false;

      try {
        const response = await fetch('/api/calendar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summaryId: id,
            ...eventDetails,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to add to calendar');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-event.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success('Calendar event added successfully');
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add to calendar';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
        toast.error(errorMessage);
        return false;
      }
    },
    [onError]
  );

  return {
    // State
    summary,
    isLoading,
    error,
    
    // Methods
    createSummary,
    fetchSummary,
    updateSummary,
    deleteSummary,
    exportToPdf,
    sendEmail,
    addToCalendar,
    
    // Helper methods
    reset: () => {
      setSummary(null);
      setError(null);
      setIsLoading(false);
    },
  };
}
