import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sendPushNotification, fetchAnnouncementHistory } from '../../services/notifications';
import type { SendPushPayload, SendPushResponseData } from '../../services/notifications';
import type { AnnouncementRow } from '../../types';
import styles from './AdminNotifications.module.css';

const AdminNotifications: React.FC = () => {
  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audienceMode, setAudienceMode] = useState<'general' | 'restricted'>('general');
  const [targetClass, setTargetClass] = useState<'8' | '9' | '10' | '11' | '12'>('10');
  const [targetMedium, setTargetMedium] = useState<'english' | 'hindi'>('english');

  // Validation State
  const [errors, setErrors] = useState<{ title?: string; message?: string; general?: string }>({});

  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // In-flight Dispatch State
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dispatch Result Feedback State
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
    data?: SendPushResponseData;
  } | null>(null);

  // History State
  const [history, setHistory] = useState<AnnouncementRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    const result = await fetchAnnouncementHistory();
    if (!isMountedRef.current) return;

    if (result.success && result.data) {
      setHistory(result.data);
    } else {
      setHistoryError(result.error?.message || 'Failed to load announcement history');
    }
    setLoadingHistory(false);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadHistory();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadHistory]);

  // Handle focus lock and escape key in confirmation modal
  useEffect(() => {
    if (!showConfirmModal) return;

    confirmBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        setShowConfirmModal(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showConfirmModal, isSubmitting]);

  // Form Field Change Handlers
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (errors.title) {
      setErrors((prev) => ({ ...prev, title: undefined }));
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessage(val);
    if (errors.message) {
      setErrors((prev) => ({ ...prev, message: undefined }));
    }
  };

  const handleAudienceModeChange = (mode: 'general' | 'restricted') => {
    setAudienceMode(mode);
    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: undefined }));
    }
  };

  // Validate form prior to opening modal
  const validateForm = (): boolean => {
    const newErrors: { title?: string; message?: string; general?: string } = {};

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      newErrors.title = 'Title is required';
    } else if (trimmedTitle.length > 120) {
      newErrors.title = 'Title must be 120 characters or fewer';
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      newErrors.message = 'Message is required';
    } else if (trimmedMessage.length > 500) {
      newErrors.message = 'Message must be 500 characters or fewer';
    }

    if (audienceMode === 'restricted') {
      if (!targetClass || !targetMedium) {
        newErrors.general = 'Please select both Class and Study Medium for restricted announcements';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (validateForm()) {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmSend = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);

    const payload: SendPushPayload = {
      title: title.trim(),
      message: message.trim(),
      target_class: audienceMode === 'general' ? 'all' : targetClass,
      target_medium: audienceMode === 'general' ? 'all' : targetMedium,
    };

    const result = await sendPushNotification(payload);

    if (!isMountedRef.current) return;

    setIsSubmitting(false);
    setShowConfirmModal(false);

    if (result.success && result.data) {
      const data = result.data;
      if (data.persistence_warning) {
        setFeedback({
          type: 'warning',
          title: 'Notification Dispatched with Warnings',
          message:
            'The notification was sent to recipients, but there was a warning recording full status details in the database.',
          data,
        });
      } else if (data.status === 'failed' || (data.total_successful ?? 0) === 0) {
        setFeedback({
          type: 'warning',
          title: 'Dispatch Completed with Zero Deliveries',
          message:
            data.recipient_count === 0
              ? 'No active device subscriptions matched the selected audience.'
              : 'All notification delivery attempts failed or were rejected by push services.',
          data,
        });
      } else {
        setFeedback({
          type: 'success',
          title: 'Push Notification Sent Successfully',
          message: `Successfully delivered notification to ${data.total_successful} recipient(s).`,
          data,
        });
      }

      // Reset form fields after successful trigger
      setTitle('');
      setMessage('');
      setAudienceMode('general');
      setErrors({});

      // Refresh announcement history
      loadHistory();
    } else {
      setFeedback({
        type: 'error',
        title: 'Notification Dispatch Failed',
        message: result.error?.message || 'An unexpected error occurred while dispatching the notification.',
      });
    }
  };

  const formattedAudienceText =
    audienceMode === 'general'
      ? 'All Registered Students (General Announcement)'
      : `Class ${targetClass} — ${targetMedium.charAt(0).toUpperCase() + targetMedium.slice(1)} Medium`;

  return (
    <div className={styles.container}>
      <header className={styles.headerContainer}>
        <h1 className={styles.title}>Push Notifications</h1>
        <p className={styles.description}>
          Compose and dispatch push notifications to students across supported classes and study mediums.
        </p>
      </header>

      {/* Outcome Feedback Banner */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={
            feedback.type === 'success'
              ? styles.bannerSuccess
              : feedback.type === 'warning'
              ? styles.bannerWarning
              : styles.bannerError
          }
        >
          <div className={styles.bannerTitle}>{feedback.title}</div>
          <div className={styles.bannerText}>{feedback.message}</div>
          {feedback.data && (
            <div className={styles.bannerMetrics}>
              <span>Total Targeted: {feedback.data.recipient_count ?? 0}</span>
              <span>Successful: {feedback.data.total_successful ?? 0}</span>
              <span>Failed: {feedback.data.total_failed ?? 0}</span>
              <span>Deactivated Stale Subs: {feedback.data.deactivated_subscriptions ?? 0}</span>
            </div>
          )}
        </div>
      )}

      {/* Notification Composer Form */}
      <section className={`${styles.card} neu-raised`}>
        <h2 className={styles.cardTitle}>Compose Notification</h2>

        <form onSubmit={handleFormSubmit} noValidate>
          <div className={styles.formGrid}>
            {/* Title Field */}
            <div className={styles.formGroup}>
              <label htmlFor="notif-title" className={styles.label}>
                Notification Title *
              </label>
              <input
                id="notif-title"
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="e.g. New Mathematics Chapter Notes Released"
                maxLength={120}
                required
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? 'title-error title-count' : 'title-count'}
                className={`${styles.input} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]`}
              />
              <div className={styles.helperRow}>
                {errors.title ? (
                  <span id="title-error" className={styles.errorText} role="alert">
                    {errors.title}
                  </span>
                ) : (
                  <span />
                )}
                <span id="title-count" className={styles.charCount}>
                  {title.length}/120
                </span>
              </div>
            </div>

            {/* Message Body Field */}
            <div className={styles.formGroup}>
              <label htmlFor="notif-message" className={styles.label}>
                Notification Message *
              </label>
              <textarea
                id="notif-message"
                value={message}
                onChange={handleMessageChange}
                placeholder="Enter concise announcement content for student devices..."
                maxLength={500}
                rows={4}
                required
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? 'message-error message-count' : 'message-count'}
                className={`${styles.textarea} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]`}
              />
              <div className={styles.helperRow}>
                {errors.message ? (
                  <span id="message-error" className={styles.errorText} role="alert">
                    {errors.message}
                  </span>
                ) : (
                  <span />
                )}
                <span id="message-count" className={styles.charCount}>
                  {message.length}/500
                </span>
              </div>
            </div>

            {/* Audience Targeting Selection */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Audience Targeting *</label>

              <div className={styles.audienceOptions} role="radiogroup" aria-label="Audience Targeting">
                <label
                  className={`${styles.radioOption} ${
                    audienceMode === 'general' ? styles.radioOptionSelected : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="audienceMode"
                    value="general"
                    checked={audienceMode === 'general'}
                    onChange={() => handleAudienceModeChange('general')}
                    className={styles.radioInput}
                  />
                  <div className={styles.radioTextContainer}>
                    <span className={styles.radioLabel}>General Announcement</span>
                    <span className={styles.radioDesc}>Targets all active push subscribers</span>
                  </div>
                </label>

                <label
                  className={`${styles.radioOption} ${
                    audienceMode === 'restricted' ? styles.radioOptionSelected : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="audienceMode"
                    value="restricted"
                    checked={audienceMode === 'restricted'}
                    onChange={() => handleAudienceModeChange('restricted')}
                    className={styles.radioInput}
                  />
                  <div className={styles.radioTextContainer}>
                    <span className={styles.radioLabel}>Restricted Audience</span>
                    <span className={styles.radioDesc}>Target specific Class and Study Medium</span>
                  </div>
                </label>
              </div>

              {/* Sub-selectors for Restricted Audience Mode */}
              {audienceMode === 'restricted' && (
                <div className={styles.targetSelectors}>
                  <div className={styles.formGroup}>
                    <label htmlFor="target-class-select" className={styles.label}>
                      Target Class *
                    </label>
                    <select
                      id="target-class-select"
                      value={targetClass}
                      onChange={(e) => setTargetClass(e.target.value as '8' | '9' | '10' | '11' | '12')}
                      className={`${styles.select} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]`}
                    >
                      <option value="8">Class 8</option>
                      <option value="9">Class 9</option>
                      <option value="10">Class 10</option>
                      <option value="11">Class 11</option>
                      <option value="12">Class 12</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="target-medium-select" className={styles.label}>
                      Study Medium *
                    </label>
                    <select
                      id="target-medium-select"
                      value={targetMedium}
                      onChange={(e) => setTargetMedium(e.target.value as 'english' | 'hindi')}
                      className={`${styles.select} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]`}
                    >
                      <option value="english">English Medium</option>
                      <option value="hindi">Hindi Medium</option>
                    </select>
                  </div>
                </div>
              )}

              {errors.general && (
                <span className={styles.errorText} role="alert">
                  {errors.general}
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`${styles.submitBtn} neu-raised-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2`}
          >
            Review & Send Notification
          </button>
        </form>
      </section>

      {/* Confirmation Modal Dialog */}
      {showConfirmModal && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          ref={modalRef}
        >
          <div className={styles.modalCard}>
            <h2 id="confirm-modal-title" className={styles.modalTitle}>
              Confirm Push Dispatch
            </h2>
            <p className={styles.modalSubtitle}>
              Please review the notification details carefully before sending to student devices.
            </p>

            <div className={styles.summaryBox}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Audience Target</span>
                <span className={styles.summaryValue}>{formattedAudienceText}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Title</span>
                <span className={styles.summaryValue}>{title.trim()}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Message Body</span>
                <span className={styles.summaryValue}>{message.trim()}</span>
              </div>
            </div>

            <div className={styles.warningBox}>
              ⚠️ Warning: Confirming will immediately dispatch live Web Push payloads to all active matching subscriber devices.
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConfirmModal(false)}
                className={`${styles.cancelBtn} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400`}
              >
                Cancel
              </button>
              <button
                type="button"
                ref={confirmBtnRef}
                disabled={isSubmitting}
                onClick={handleConfirmSend}
                className={`${styles.confirmBtn} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2`}
              >
                {isSubmitting ? 'Sending...' : 'Confirm and Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sent Announcement History */}
      <section className={`${styles.card} neu-raised`}>
        <h2 className={styles.cardTitle}>Recent Announcement Dispatches</h2>

        {loadingHistory ? (
          <p className={styles.emptyState}>Loading announcement history...</p>
        ) : historyError ? (
          <div className={styles.bannerError}>{historyError}</div>
        ) : history.length === 0 ? (
          <p className={styles.emptyState}>No previous announcements found.</p>
        ) : (
          <div className={styles.historyTableWrapper}>
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>Title & Body</th>
                  <th>Audience</th>
                  <th>Status</th>
                  <th>Delivered / Attempted</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((ann) => (
                  <tr key={ann.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{ann.title}</div>
                      <div style={{ fontSize: '0.8125rem', color: '#4b5563', marginTop: '0.25rem' }}>
                        {ann.body}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {ann.target_class === 'all' && ann.target_medium === 'all'
                        ? 'General (All)'
                        : `Class ${ann.target_class} (${ann.target_medium})`}
                    </td>
                    <td>
                      <span
                        className={
                          ann.status === 'sent' ? styles.statusBadgeSent : styles.statusBadgeFailed
                        }
                      >
                        {ann.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {ann.total_successful} / {ann.total_sent}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem', color: '#6b7280' }}>
                      {ann.created_at ? new Date(ann.created_at).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminNotifications;
