import React from 'react';
import { Link } from 'react-router-dom';
import { mockAnnouncements, mockResources, mockCategories } from '../../data/mock';

const Home: React.FC = () => {
  const latestUploads = mockResources.slice(0, 3); // Get 3 latest uploads

  return (
    <div>
      {/* Hero Section */}
      <section style={{ padding: '3rem 1rem', textAlign: 'center', backgroundColor: '#f0f0f0', marginBottom: '2rem' }}>
        <h2>Welcome to Horizon</h2>
        <p>Your one-stop platform for educational resources, notes, and previous year papers.</p>
        <Link to="/library">
          <button style={{ padding: '0.5rem 1rem', fontSize: '1rem', cursor: 'pointer' }}>Explore Library</button>
        </Link>
      </section>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Main Content Area */}
        <div style={{ flex: 3, minWidth: '300px' }}>

          {/* Latest Uploads */}
          <section style={{ marginBottom: '2rem' }}>
            <h3>Latest Uploads</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {latestUploads.map(resource => (
                <div key={resource.id} style={{ border: '1px solid #ddd', padding: '1rem' }}>
                  <h4>{resource.title}</h4>
                  <p>{resource.description}</p>
                  <Link to={`/resource/${resource.id}`}>View Details</Link>
                </div>
              ))}
            </div>
          </section>

          {/* Categories / Resource Types */}
          <section style={{ marginBottom: '2rem' }}>
            <h3>Browse by Category</h3>
            <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', listStyle: 'none', padding: 0 }}>
              {mockCategories.map(category => (
                <li key={category} style={{ border: '1px solid #ddd', padding: '1rem', textAlign: 'center' }}>
                  <Link to={`/library?category=${category}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    {category}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Sidebar / Announcements */}
        <aside style={{ flex: 1, minWidth: '250px' }}>
          <section style={{ border: '1px solid #ddd', padding: '1rem', backgroundColor: '#fafafa' }}>
            <h3>Announcements</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {mockAnnouncements.map(announcement => (
                <li key={announcement.id} style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>{announcement.title}</h4>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>{announcement.description}</p>
                  <small style={{ color: '#666' }}>{new Date(announcement.date).toLocaleDateString()}</small>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default Home;
