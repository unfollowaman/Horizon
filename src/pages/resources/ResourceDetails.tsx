import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import type { Resource, Category } from '../../types';

const ResourceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [resource, setResource] = useState<Resource | null>(null);
  const [relatedResources, setRelatedResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResourceAndRelated = async () => {
      if (!id) return;
      setLoading(true);

      const { data, error } = await supabase
        .from('books')
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
          category: data.category as Category,
          uploadDate: data.created_at || data.uploadDate || new Date().toISOString(),
          pdfUrl: data.pdf_url || data.pdfUrl || '',
          thumbnailUrl: data.thumbnail_url || data.thumbnailUrl || '',
        };
        setResource(mappedResource);

        // Fetch related
        const { data: relatedData, error: relatedError } = await supabase
          .from('books')
          .select('*')
          .eq('category', data.category)
          .neq('id', data.id)
          .limit(3);

        if (relatedError) {
          console.error("Error fetching related resources:", relatedError);
        } else if (relatedData) {
            const mappedRelated: Resource[] = relatedData.map(item => ({
                id: item.id,
                title: item.title,
                description: item.description,
                category: item.category as Category,
                uploadDate: item.created_at || item.uploadDate || new Date().toISOString(),
                pdfUrl: item.pdf_url || item.pdfUrl || '',
                thumbnailUrl: item.thumbnail_url || item.thumbnailUrl || '',
            }));
            setRelatedResources(mappedRelated);
        }
      }
      setLoading(false);
    };

    fetchResourceAndRelated();
  }, [id]);

  const handleDownload = async () => {
      if (!resource?.pdfUrl) return;

      // The pdfUrl might be a full URL, or a path within a bucket.
      // Based on instructions "Load PDF URLs from Supabase Storage/database."
      // If it's a full URL, we can just open it.
      // If it's a storage path, we need to get the public URL.

      if (resource.pdfUrl.startsWith('http')) {
         window.open(resource.pdfUrl, '_blank');
      } else {
         // Assume it's a path in a bucket named 'pdfs' (or whatever default they use)
         // We will try to open it directly if it's already a full path or
         // get public url from 'books' bucket if they use that.
         // Let's check if it starts with a bucket name, for now, let's just use createSignedUrl or getPublicUrl
         // For a simpler approach, if we don't know the bucket, we might just try opening the path directly or use getPublicUrl on a known bucket.
         // Let's assume the pdfUrl stored is the path within the 'books' bucket, or we can just open the url.
         const { data } = supabase.storage.from('books').getPublicUrl(resource.pdfUrl);
         if (data?.publicUrl) {
             window.open(data.publicUrl, '_blank');
         } else {
            window.open(resource.pdfUrl, '_blank');
         }
      }
  };

  if (loading) {
    return (
        <div className="text-center p-8 neu-card rounded-2xl">
            <h2 className="text-h2 uppercase mb-4 text-ink">Loading Resource...</h2>
        </div>
    );
  }

  if (!resource) {
    return (
      <div className="text-center p-8 neu-card rounded-2xl">
        <h2 className="text-h2 uppercase mb-4 text-accent-red">Resource not found</h2>
        <Link to="/library" className="inline-block p-2 font-bold neu-raised rounded-md hover:neu-raised-hover no-underline text-ink">Back to Library</Link>
      </div>
    );
  }

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

          <div className="neu-card rounded-2xl p-4">
            <div className="h-96 neu-recessed rounded-xl p-2 flex flex-col items-center justify-center mb-6 text-muted-foreground overflow-hidden">
               {resource.thumbnailUrl ? (
                   <img src={resource.thumbnailUrl} alt={resource.title} className="max-w-full max-h-full object-contain" />
               ) : (
                  <span className="text-h2 font-bold font-mono">[ PDF Viewer Placeholder ]</span>
               )}
            </div>
            <button
                onClick={handleDownload}
                className="w-full neu-raised hover:neu-raised-hover p-3 rounded-full font-bold text-ink"
            >
              Download PDF
            </button>
          </div>
        </div>

        {/* Sidebar / Metadata */}
        <aside className="flex-1 min-w-[250px]">
          <section className="neu-card rounded-2xl p-6 mb-8">
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

          <section className="neu-card rounded-2xl p-6">
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
