import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { fetchLearningResourceById, fetchLearningResources } from '../../services/learningResourcesAPI';
import type { Resource } from '../../types';
import { RESOURCE_CATEGORIES } from '../../config/resources';
import { isResourceProtected } from '../../utils/resourceHelper';

const ResourceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [resource, setResource] = useState<Resource | null>(null);
  const [relatedResources, setRelatedResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResourceAndRelated = async () => {
      if (!id) return;
      setLoading(true);

      const { data: mappedResource, error } = await fetchLearningResourceById(id, false);

      if (error) {
        console.error("Error fetching resource:", error);
        setLoading(false);
        return;
      }

      if (mappedResource) {
        setResource(mappedResource);

        if (isResourceProtected(mappedResource)) {
          supabase.functions.invoke('resource-access', {
            body: { resource_id: mappedResource.id },
          }).then(({ data: edgeData, error: edgeError }) => {
            if (edgeError || !edgeData?.success) {
              setPdfError(edgeData?.error || 'Failed to load protected resource');
            } else {
              setSignedUrl(edgeData.signed_url);
            }
          }).catch(() => {
            setPdfError('Error accessing protected resource');
          });
        } else {
          setSignedUrl(mappedResource.pdfUrl);
        }

        // Fetch related
        const { data: relatedData, error: relatedError } = await fetchLearningResources({
          resource_type: mappedResource.resource_type,
          student_class: mappedResource.student_class || undefined,
          subject: mappedResource.subject || undefined,
          medium: mappedResource.medium || undefined,
          neqId: mappedResource.id,
          limit: 3
        });

        if (relatedError) {
          console.error("Error fetching related resources:", relatedError);
        } else if (relatedData) {
          setRelatedResources(relatedData);
        }
      }
      setLoading(false);
    };

    fetchResourceAndRelated();
  }, [id]);


  if (loading) {
    return (
        <div className="text-center p-8 neu-card rounded-2xl">
            <h2 className="text-h2 uppercase mb-4 text-ink">Loading Resource...</h2>
        </div>
    );
  }

  const backPath = resource && resource.resource_type ? RESOURCE_CATEGORIES[resource.resource_type]?.path || '/' : '/';
  const backText = resource && resource.resource_type ? `Back to ${RESOURCE_CATEGORIES[resource.resource_type]?.title || 'Library'}` : 'Back to Home';

  if (!resource) {
    return (
      <div className="text-center p-8 neu-card rounded-2xl">
        <h2 className="text-h2 uppercase mb-4 text-accent-red">Resource not found</h2>
        <Link to="/" className="inline-block p-2 font-bold neu-raised rounded-md hover:neu-raised-hover no-underline text-ink">Back to Home</Link>
      </div>
    );
  }

  return (
    <div>
      <Link to={backPath} className="inline-flex items-center h-11 p-2 px-4 mb-4 font-bold neu-raised rounded-md hover:neu-raised-hover no-underline text-ink">
        &larr; {backText}
      </Link>

      <div className="flex gap-8 flex-wrap">

        {/* Main Content Area */}
        <div className="flex-[3] min-w-[300px]">
          <h2 className="text-h1 uppercase mb-2">{resource.title}</h2>
          <p className="text-body1 font-bold mb-8">{resource.description}</p>

          <div className="neu-card rounded-2xl p-4">
            <div className="h-[600px] neu-recessed rounded-xl p-2 flex flex-col items-center justify-center text-muted-foreground overflow-hidden">
               {pdfError ? (
                 <div className="text-accent-red font-bold">{pdfError}</div>
               ) : signedUrl ? (
                 <iframe
                   src={signedUrl}
                   width="100%"
                   height="100%"
                   style={{ border: 'none' }}
                   title={resource.title}
                 />
               ) : (
                 <div>Loading PDF...</div>
               )}
            </div>
          </div>
        </div>

        {/* Sidebar / Metadata */}
        <aside className="flex-1 min-w-[250px]">
          <section className="neu-card rounded-2xl p-6 mb-8">
            <h3 className="text-h2 uppercase mb-4 pb-2 text-ink">Details</h3>
            <ul className="list-none p-0 m-0 text-body1">
              <li className="mb-2 pb-2 flex justify-between">
                <strong>Type:</strong> <span>{resource.resource_type}</span>
              </li>
              <li className="mb-2 pb-2 flex justify-between">
                <strong>Uploaded:</strong> <span>{new Date(resource.uploadDate).toLocaleDateString()}</span>
              </li>
              <li className="flex justify-between">
                <strong>ID:</strong> <span className="font-mono neu-recessed p-1 rounded-sm text-caption">{resource.id}</span>
              </li>
            </ul>
          </section>

          <section className="neu-card rounded-2xl p-6">
            <h3 className="text-h2 font-bold uppercase mb-4 pb-2 text-ink">Related</h3>
            {relatedResources.length > 0 ? (
              <ul className="list-none p-0 m-0">
                {relatedResources.map((related) => (
                  <li key={related.id} className="mb-4 pb-2">
                    <Link to={`/view/${related.id}`} className="inline-block p-2 font-bold neu-raised rounded-md hover:neu-raised-hover no-underline block text-ink">
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
