import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
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
  const [pdfScale, setPdfScale] = useState(1);

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

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth - 32; // Account for padding

        // standard aspect ratio of A4 is 1:1.414
        // we want to fit ~1.5 pages vertically into 85vh
        // let page height be h. 1.5h = 85vh
        // h = 85vh / 1.5
        // w = h / 1.414
        const targetHeight = (window.innerHeight * 0.85) / 1.2;
        const targetWidthByHeight = targetHeight / 1.414;

        // pdf.js base width for A4 is roughly 595px at scale 1
        const BASE_WIDTH = 595;

        // We want the width to be at most the container width, but also small enough to show 1.5 pages
        const finalWidth = Math.min(width, targetWidthByHeight);

        // To be safe for mobiles where width is very small, always use full width if targetWidthByHeight > containerWidth
        const scale = finalWidth / BASE_WIDTH;

        // Give a slight bump to scale for better readability, or just use container width for mobile
        if (window.innerWidth < 768) {
             setPdfScale(width / BASE_WIDTH);
        } else {
             setPdfScale(scale);
        }
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [loading]);


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
            className="p-2 px-4 font-bold neu-raised rounded-md hover:neu-raised-hover text-ink flex items-center gap-2"
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
          <h1 className="text-h2 md:text-h1 uppercase text-ink px-4">{resource.title}</h1>
          <p className="text-body1 text-ink/70 font-bold mt-2">
            {resource.class && resource.subject ? `${resource.class} • ${resource.subject}` : resource.category}
          </p>
        </div>

        {/* PDF Reader Container */}
        <div
          ref={containerRef}
          className={`${styles.viewerContainer} neu-recessed`}
        >
          <Document
            file={resource.pdfUrl.startsWith('http') ? resource.pdfUrl : supabase.storage.from('pdfs').getPublicUrl(resource.pdfUrl).data.publicUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div className="p-4 font-bold">Rendering PDF...</div>}
          >
            {Array.from(new Array(numPages || 0), (_, index) => (
              <div key={`page_${index + 1}`} className={styles.reactPdfPage}>
                 <Page
                   pageNumber={index + 1}
                   scale={pdfScale}
                   renderTextLayer={false}
                   renderAnnotationLayer={false}
                   loading={<div className="h-64 w-full animate-pulse bg-gray-200 rounded-md"></div>}
                 />
              </div>
            ))}
          </Document>

          {/* Download Button Below Last Page */}
          <div className={styles.downloadSection}>
            <a
              href={resource.pdfUrl.startsWith('http') ? resource.pdfUrl : supabase.storage.from('pdfs').getPublicUrl(resource.pdfUrl).data.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 px-6 flex items-center justify-center whitespace-normal text-body1 gap-2 font-bold neu-raised rounded-md hover:neu-raised-hover no-underline text-ink"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" x2="12" y1="15" y2="3"/>
              </svg>
              <span>Download PDF</span>
            </a>
          </div>
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
