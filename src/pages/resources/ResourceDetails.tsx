import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import type { Resource } from '../../types';
import { RESOURCE_CATEGORIES } from '../../config/resources';
import { getResourceUrl, isResourceProtected } from '../../utils/resourceHelper';

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

      const { data, error } = await supabase
        .from('learning_resources')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error("Error fetching resource:", error);
        setLoading(false);
        return;
      }

      if (data) {
        const mappedResource: Resource = {
          id: data.id,
          title: data.title,
          description: data.description,
          resource_type: data.resource_type,
          medium: data.medium,
          uploadDate: data.created_at || new Date().toISOString(),
          pdfUrl: getResourceUrl(data),
          thumbnailUrl: data.thumbnail_url || '',
          student_class: data.student_class || undefined,
          subject: data.subject || undefined,
          allow_download: data.allow_download ?? undefined,
          storage_bucket: data.storage_bucket,
          file_path: data.file_path,
        };
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
        const { data: relatedData, error: relatedError } = await supabase
          .from('learning_resources')
          .select('*')
          .eq('resource_type', data.resource_type)
          .neq('id', data.id)
          .limit(3);

        if (relatedError) {
          console.error("Error fetching related resources:", relatedError);
        } else if (relatedData) {
            const mappedRelated: Resource[] = relatedData.map(item => ({
                id: item.id,
                title: item.title,
                description: item.description,
                resource_type: item.resource_type,
                medium: item.medium,
                uploadDate: item.created_at || new Date().toISOString(),
                pdfUrl: getResourceUrl(item),
                thumbnailUrl: item.thumbnail_url || '',
                student_class: item.student_class || undefined,
                subject: item.subject || undefined,
                allow_download: item.allow_download ?? undefined,
                storage_bucket: item.storage_bucket,
                file_path: item.file_path,
            }));
            setRelatedResources(mappedRelated);
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
