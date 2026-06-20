import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockResources } from '../../data/mock';

const ResourceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const resource = mockResources.find(r => r.id === id);

  if (!resource) {
    return <div><h2>Resource not found</h2><Link to="/library">Back to Library</Link></div>;
  }

  // Find related resources based on the same category
  const relatedResources = mockResources
    .filter(r => r.category === resource.category && r.id !== resource.id)
    .slice(0, 3);

  return (
    <div>
      <Link to="/library" style={{ display: 'inline-block', marginBottom: '1rem' }}>&larr; Back to Library</Link>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>

        {/* Main Content Area */}
        <div style={{ flex: 3, minWidth: '300px' }}>
          <h2>{resource.title}</h2>
          <p>{resource.description}</p>

          <div style={{ margin: '2rem 0', padding: '1rem', border: '1px solid #ccc', backgroundColor: '#fafafa' }}>
            <div style={{ height: '400px', backgroundColor: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.2rem', color: '#666' }}>[ PDF Viewer Placeholder ]</span>
            </div>
            <button style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
              Download PDF
            </button>
          </div>
        </div>

        {/* Sidebar / Metadata */}
        <aside style={{ flex: 1, minWidth: '250px' }}>
          <section style={{ border: '1px solid #ddd', padding: '1rem', marginBottom: '2rem' }}>
            <h3>Resource Details</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ marginBottom: '0.5rem' }}><strong>Category:</strong> {resource.category}</li>
              <li style={{ marginBottom: '0.5rem' }}><strong>Uploaded:</strong> {new Date(resource.uploadDate).toLocaleDateString()}</li>
              <li style={{ marginBottom: '0.5rem' }}><strong>ID:</strong> {resource.id}</li>
            </ul>
          </section>

          <section style={{ border: '1px solid #ddd', padding: '1rem' }}>
            <h3>Related Resources</h3>
            {relatedResources.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {relatedResources.map(related => (
                  <li key={related.id} style={{ marginBottom: '1rem' }}>
                    <Link to={`/resource/${related.id}`}>{related.title}</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No related resources found.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default ResourceDetails;
