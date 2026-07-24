import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { supabase } from '../../services/supabase';
import type { Resource } from '../../types';
import MaterialCard from '../../components/MaterialCard';
import styles from './PdfViewer.module.css';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PdfViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [resource, setResource] = useState<Resource | null>(null);
  const [relatedResources, setRelatedResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState<number | null>(null);

  // Ref to container to calculate scale dynamically
  const containerRef = useRef<HTMLDivElement>(null);

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
          category: (data.type || data.category) as Resource['category'],
          uploadDate: data.created_at || data.uploadDate || new Date().toISOString(),
          pdfUrl: data.file_path ? supabase.storage.from('pdfs').getPublicUrl(data.file_path).data.publicUrl : (data.pdf_url || data.pdfUrl || ''),
          thumbnailUrl: data.thumbnail_url || data.thumbnailUrl || '',
          class: data.class,
          subject: data.subject,
          type: data.type
        };
        setResource(mappedResource);

        // Fetch suggested PDFs based on class and subject
        let query = supabase.from('books').select('*').neq('id', data.id);
        if (data.class) query = query.eq('class', data.class);
        if (data.subject) query = query.eq('subject', data.subject);

        const { data: relatedData, error: relatedError } = await query.limit(4);

        if (relatedError) {
          console.error("Error fetching related resources:", relatedError);
        } else if (relatedData) {
            const mappedRelated: Resource[] = relatedData.map(item => ({
                id: item.id,
                title: item.title,
                description: item.description,
                category: (item.type || item.category) as Resource['category'],
                uploadDate: item.created_at || item.uploadDate || new Date().toISOString(),
                pdfUrl: item.file_path ? supabase.storage.from('pdfs').getPublicUrl(item.file_path).data.publicUrl : (item.pdf_url || item.pdfUrl || ''),
                thumbnailUrl: item.thumbnail_url || item.thumbnailUrl || '',
                class: item.class,
                subject: item.subject,
                type: item.type
            }));
            setRelatedResources(mappedRelated);
        }
      }
      setLoading(false);
    };

    fetchResourceAndRelated();
  }, [id]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className="text-center p-8 neu-card rounded-2xl w-full max-w-lg mt-20">
            <h2 className="text-h2 uppercase mb-4 text-ink">Loading PDF...</h2>
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className={styles.pageContainer}>
        <div className="text-center p-8 neu-card rounded-2xl w-full max-w-lg mt-20">
          <h2 className="text-h2 uppercase mb-4 text-accent-red">Resource not found</h2>
          <button onClick={() => navigate(-1)} className="inline-block p-2 font-bold neu-raised rounded-md hover:neu-raised-hover no-underline text-ink">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentWrapper}>
        {/* Header */}
        <header className={styles.header}>
          <button
            onClick={() => navigate(-1)}
            className="p-2 px-4 h-11 font-bold neu-raised rounded-md hover:neu-raised-hover text-ink flex items-center gap-2"
          >
            &larr; Back
          </button>

          <Link to="/" onClick={() => window.scrollTo(0, 0)} className={`${styles.heroBrandPill} neu-raised no-underline`}>
            <img src="/assets/favicon/logo.png" alt="Horizon Logo" className={styles.heroBrandPillImg} />
            <div className={styles.heroBrandPillDivider}></div>
            <span className={styles.heroBrandPillText}>Horizon</span>
          </Link>
        </header>

        {/* Title */}
        <div className="text-center my-2">
          <h1 className={`text-[clamp(36px,5vw,56px)] leading-tight uppercase text-ink px-4 ${styles.pdfTitle}`}>
            {resource.title}
          </h1>
          <p className="text-body1 text-ink/70 font-bold mt-2">
            {resource.class && resource.subject ? `${resource.class} • ${resource.subject}` : resource.category}
          </p>
        </div>

        {/* PDF Reader Container */}
        <div
          ref={containerRef}
          className={`${styles.viewerContainer} neu-raised rounded-xl`}
        >
          <div className={styles.transformWrapperContainer}>
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={4}
              centerOnInit
              wheel={{
                wheelDisabled: false,
                activationKeys: ['Control', 'Shift', 'Meta', 'Alt']
              }} // Require modifier key to zoom with wheel, otherwise let it scroll naturally
              panning={{ excluded: ['a', 'button', 'input'] }} // exclude some elements from panning
              trackPadPanning={{ disabled: false }} // Allows natural scrolling/panning using wheel/trackpad when zoom modifier is not active
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <div className={styles.zoomControls}>
                    <button onClick={() => zoomOut()} className="neu-raised-sm rounded-md p-2 hover:neu-raised-hover" title="Zoom Out">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                    <button onClick={() => resetTransform()} className="neu-raised-sm rounded-md p-2 hover:neu-raised-hover font-bold text-sm" title="Reset Zoom">
                      Reset
                    </button>
                    <button onClick={() => zoomIn()} className="neu-raised-sm rounded-md p-2 hover:neu-raised-hover" title="Zoom In">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                  </div>

                  <TransformComponent wrapperClass={styles.transformWrapper} contentClass={styles.transformContent}>
                    <div className={styles.pdfScrollContainer}>
                      <Document
                        file={resource.pdfUrl.startsWith('http') ? resource.pdfUrl : supabase.storage.from('pdfs').getPublicUrl(resource.pdfUrl).data.publicUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={<div className="p-4 font-bold flex justify-center w-full">Rendering PDF...</div>}
                        className={styles.pdfDocument}
                      >
                        {Array.from(new Array(numPages || 0), (_, index) => (
                          <div key={`page_${index + 1}`} className={styles.reactPdfPage}>
                            <Page
                              pageNumber={index + 1}
                              scale={1} // Base scale, react-zoom-pan-pinch handles the actual display scaling
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                              loading={<div className="h-64 w-full animate-pulse bg-gray-200 rounded-md"></div>}
                            />
                          </div>
                        ))}
                      </Document>
                    </div>
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          </div>
        </div>

        {/* Download Button Below Last Page */}
        <div className={styles.downloadSection}>
          <a
            href={resource.pdfUrl.startsWith('http') ? resource.pdfUrl : supabase.storage.from('pdfs').getPublicUrl(resource.pdfUrl).data.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 px-6 flex items-center justify-center whitespace-normal text-body1 gap-2 font-bold neu-raised rounded-md hover:neu-raised-hover no-underline text-ink"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="url(#pink-gradient-download)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="pink-gradient-download" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E91E8C" />
                  <stop offset="50%" stopColor="#C2185B" />
                  <stop offset="100%" stopColor="#8B0A50" />
                </linearGradient>
              </defs>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
            <span>Download PDF</span>
          </a>
        </div>

        {/* Suggested PDFs */}
        {relatedResources.length > 0 && (
          <section className={styles.suggestedSection}>
            <h3 className="text-h3 font-bold uppercase mb-4 text-ink">Suggested for you</h3>
            <div className={styles.suggestedGrid}>
              {relatedResources.map((related) => (
                <MaterialCard key={related.id} resource={related} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default PdfViewer;
