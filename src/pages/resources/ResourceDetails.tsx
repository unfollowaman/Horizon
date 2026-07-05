import type React from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockResources } from '../../data/mock';

const ResourceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const resource = mockResources.find(r => r.id === id);

  if (!resource) {
    return (
      <div className="text-center p-8 neu-raised rounded-2xl">
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
      <Link to="/library" className="inline-block p-2 mb-4 font-bold neu-raised rounded-md hover:neu-raised-hover no-underline text-ink">
        &larr; Back to Library
      </Link>

      <div className="flex gap-8 flex-wrap">

        {/* Main Content Area */}
        <div className="flex-[3] min-w-[300px]">
          <h2 className="text-h1 uppercase mb-2">{resource.title}</h2>
          <p className="text-body1 font-bold mb-8">{resource.description}</p>

          <div className="neu-raised rounded-2xl p-4">
            <div className="h-96 neu-recessed rounded-xl p-2 flex flex-col items-center justify-center mb-6 text-muted-foreground">
              <span className="text-h2 font-bold font-mono">[ PDF Viewer Placeholder ]</span>
            </div>
            <button className="w-full neu-raised hover:neu-raised-hover p-3 rounded-full font-bold text-ink">
              Download PDF
            </button>
          </div>
        </div>

        {/* Sidebar / Metadata */}
        <aside className="flex-1 min-w-[250px]">
          <section className="neu-raised rounded-2xl p-6 mb-8">
            <h3 className="text-h2 uppercase mb-4 pb-2 text-ink">Details</h3>
            <ul className="list-none p-0 m-0 text-body1">
              <li className="mb-2 pb-2 flex justify-between">
                <strong>Category:</strong> <span>{resource.category}</span>
              </li>
              <li className="mb-2 pb-2 flex justify-between">
                <strong>Uploaded:</strong> <span>{new Date(resource.uploadDate).toLocaleDateString()}</span>
              </li>
              <li className="flex justify-between">
                <strong>ID:</strong> <span className="font-mono neu-recessed p-1 rounded-sm text-caption">{resource.id}</span>
              </li>
            </ul>
          </section>

          <section className="neu-raised rounded-2xl p-6">
            <h3 className="text-h2 font-bold uppercase mb-4 pb-2 text-ink">Related</h3>
            {relatedResources.length > 0 ? (
              <ul className="list-none p-0 m-0">
                {relatedResources.map((related) => (
                  <li key={related.id} className="mb-4 pb-2">
                    <Link to={`/resource/${related.id}`} className="inline-block p-2 font-bold neu-raised rounded-md hover:neu-raised-hover no-underline block text-ink">
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
