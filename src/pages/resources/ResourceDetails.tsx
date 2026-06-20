import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockResources } from '../../data/mock';

const ResourceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const resource = mockResources.find(r => r.id === id);

  if (!resource) {
    return (
      <div className="text-center p-8 border-2 border-ink bg-paper shadow-elevated">
        <h2 className="text-h2 uppercase mb-4 text-accent-red">Resource not found</h2>
        <Link to="/library" className="btn btn-filled">Back to Library</Link>
      </div>
    );
  }

  // Find related resources based on the same category
  const relatedResources = mockResources
    .filter(r => r.category === resource.category && r.id !== resource.id)
    .slice(0, 3);

  return (
    <div>
      <Link to="/library" className="inline-block p-2 mb-4 font-bold border-b-2 border-ink hover:bg-accent-yellow transition-colors focus-visible:outline-accent-yellow">
        &larr; Back to Library
      </Link>

      <div className="flex gap-8 flex-wrap">

        {/* Main Content Area */}
        <div className="flex-[3] min-w-[300px]">
          <h2 className="text-h1 uppercase mb-2">{resource.title}</h2>
          <p className="text-body1 font-bold mb-8">{resource.description}</p>

          <div className="border-2 border-ink bg-paper p-4 shadow-elevated">
            <div className="h-96 bg-ink text-paper flex flex-col items-center justify-center mb-6 border-2 border-ink">
              <span className="text-h2 font-bold font-mono">[ PDF Viewer Placeholder ]</span>
            </div>
            <button className="btn btn-filled w-full">
              Download PDF
            </button>
          </div>
        </div>

        {/* Sidebar / Metadata */}
        <aside className="flex-1 min-w-[250px]">
          <section className="border-2 border-ink p-4 mb-8 bg-surface shadow-elevated">
            <h3 className="text-h2 uppercase mb-4 border-b-2 border-ink pb-2">Details</h3>
            <ul className="list-none p-0 m-0 text-body1">
              <li className="mb-2 pb-2 border-b-2 border-ink flex justify-between">
                <strong>Category:</strong> <span>{resource.category}</span>
              </li>
              <li className="mb-2 pb-2 border-b-2 border-ink flex justify-between">
                <strong>Uploaded:</strong> <span>{new Date(resource.uploadDate).toLocaleDateString()}</span>
              </li>
              <li className="flex justify-between">
                <strong>ID:</strong> <span className="font-mono bg-paper p-1 border-2 border-ink text-caption">{resource.id}</span>
              </li>
            </ul>
          </section>

          <section className="border-2 border-ink p-4 bg-paper shadow-elevated">
            <h3 className="text-h2 font-bold uppercase mb-4 border-b-2 border-ink pb-2">Related</h3>
            {relatedResources.length > 0 ? (
              <ul className="list-none p-0 m-0">
                {relatedResources.map((related, index) => (
                  <li key={related.id} className={`mb-4 pb-2 ${index !== relatedResources.length - 1 ? 'border-b-2 border-ink' : ''}`}>
                    <Link to={`/resource/${related.id}`} className="inline-block p-2 font-bold underline decoration-2 underline-offset-4 hover:bg-accent-yellow block">
                      {related.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-bold text-caption">No related resources found.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default ResourceDetails;
