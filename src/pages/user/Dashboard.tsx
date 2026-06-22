import type React from 'react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  return (
    <div>
      <h2>User Dashboard Placeholder</h2>
      <p>This area will contain personalized content for logged-in users.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
        <div style={{ padding: '1rem', border: '1px solid #ccc', backgroundColor: '#fafafa' }}>
          <h3>Saved Resources</h3>
          <p>You have not saved any resources yet.</p>
          <Link to="/library">Browse Library</Link>
        </div>

        <div style={{ padding: '1rem', border: '1px solid #ccc', backgroundColor: '#fafafa' }}>
          <h3>Recent Activity</h3>
          <p>No recent activity found.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
