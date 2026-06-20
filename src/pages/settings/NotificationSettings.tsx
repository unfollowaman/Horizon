import React from 'react';

const NotificationSettings: React.FC = () => {
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem' }}>
      <h2>Notification Settings</h2>
      <p>Configure how you receive updates and alerts. (Push notifications coming soon)</p>

      <div style={{ border: '1px solid #ccc', padding: '1rem', marginTop: '1.5rem', backgroundColor: '#fafafa' }}>
        <h3>Push Notifications</h3>
        <p style={{ fontSize: '0.9rem', color: '#666' }}>Receive real-time alerts on your device for new resources and announcements.</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
          <label>
            <input type="checkbox" disabled /> Enable Push Notifications
          </label>
          <span style={{ fontSize: '0.8rem', color: '#888' }}>(Coming Soon)</span>
        </div>
      </div>

      <div style={{ border: '1px solid #ccc', padding: '1rem', marginTop: '1.5rem', backgroundColor: '#fafafa' }}>
        <h3>Email Preferences</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '0.5rem' }}>
            <label><input type="checkbox" disabled checked /> New Announcements</label>
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <label><input type="checkbox" disabled /> New Resources in your enrolled categories</label>
          </li>
          <li>
            <label><input type="checkbox" disabled /> Weekly Digest</label>
          </li>
        </ul>
        <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '1rem' }}>(Coming Soon)</p>
      </div>
    </div>
  );
};

export default NotificationSettings;
