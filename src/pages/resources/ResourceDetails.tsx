import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchLearningResourceById, fetchLearningResources } from '../../services/learningResourcesAPI';
import type { Resource } from '../../types';
import { RESOURCE_CATEGORIES } from '../../config/resources';
import { handleDownload } from '../../utils/download';
import { canDownload } from '../../utils/permissions';
import { buildCategoryUrl } from '../../utils/urlHelper';

const ResourceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [resource, setResource] = useState<Resource | null>(null);
  const [relatedResources, setRelatedResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResourceAndRelated = async () => {
      if (!id) return;
      setLoading(true);

      const { data: mappedResource, error } = await fetchLearningResourceById(id, true);

      if (error) {
        console.error("Error fetching resource:", error);
        setLoading(false);
        return;
      }

      if (mappedResource) {
        setResource(mappedResource);

        // Fetch related resources (same class, subject, or resource type)
        const { data: relatedData, error: relatedError } = await fetchLearningResources({
          resource_type: mappedResource.resource_type,
          student_class: mappedResource.student_class || undefined,
          subject: mappedResource.subject || undefined,
          medium: mappedResource.medium || undefined,
          includeChapters: true,
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

  // Update SEO metadata dynamically
  useEffect(() => {
    if (!resource) return;

    const originalTitle = document.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    const originalDesc = metaDesc ? metaDesc.getAttribute('content') : null;

    const pageTitle = `${resource.title}${resource.student_class ? ` | ${resource.student_class}` : ''}${resource.subject ? ` ${resource.subject}` : ''} | Horizon`;
    document.title = pageTitle;

    const detailsContext = [resource.student_class, resource.subject].filter(Boolean).join(' ');
    const descriptionText = `Access educational summary, syllabus breakdown, and study guidance for ${resource.title}${detailsContext ? ` (${detailsContext})` : ''}. Free learning materials on Horizon.`;

    if (metaDesc) {
      metaDesc.setAttribute('content', descriptionText);
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content = descriptionText;
      document.head.appendChild(newMeta);
    }

    // Update canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const canonicalUrl = `${window.location.origin}/resource/${resource.id}`;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    const originalCanonical = canonicalLink.href;
    canonicalLink.href = canonicalUrl;

    return () => {
      document.title = originalTitle;
      if (metaDesc && originalDesc !== null) {
        metaDesc.setAttribute('content', originalDesc);
      }
      if (canonicalLink && originalCanonical) {
        canonicalLink.href = originalCanonical;
      }
    };
  }, [resource]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="text-center p-8 neu-card rounded-2xl">
          <h1 className="text-h2 uppercase mb-4 text-ink">Loading Educational Landing Page...</h1>
        </div>
      </div>
    );
  }

  const categoryBasePath = resource && resource.resource_type ? RESOURCE_CATEGORIES[resource.resource_type]?.path || '/' : '/';
  const backPath = resource
    ? buildCategoryUrl({
        basePath: categoryBasePath,
        studentClass: resource.student_class,
        medium: resource.medium,
        subject: resource.subject,
        year: resource.year,
      })
    : '/';
  const backText = resource && resource.resource_type ? `Back to ${RESOURCE_CATEGORIES[resource.resource_type]?.title || 'Library'}` : 'Back to Home';

  if (!resource) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="text-center p-8 neu-card rounded-2xl">
          <h1 className="text-h2 uppercase mb-4 text-accent-red">Resource not found</h1>
          <p className="text-body1 mb-6 text-ink">The requested educational material could not be found or may have been moved.</p>
          <Link to="/" className="inline-block p-3 font-bold neu-raised rounded-xl hover:neu-raised-hover no-underline text-ink">Back to Home</Link>
        </div>
      </div>
    );
  }

  const isNotes = resource.resource_type === 'notes';
  const isPYQ = resource.resource_type === 'pyq';

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://unfollowaman.tech';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalResource',
    name: resource.title,
    description: resource.description || `Access educational summary, syllabus breakdown, and study guidance for ${resource.title}${[resource.student_class, resource.subject].filter(Boolean).join(' ') ? ` (${[resource.student_class, resource.subject].filter(Boolean).join(' ')})` : ''}. Free learning materials on Horizon.`,
    url: `${origin}/resource/${resource.id}`,
    ...(resource.student_class ? { educationalLevel: resource.student_class } : {}),
    ...(resource.subject ? { about: { '@type': 'Thing', name: resource.subject } } : {}),
    ...(resource.medium ? { inLanguage: resource.medium === 'hindi' ? 'hi' : 'en' } : {}),
    learningResourceType:
      resource.resource_type === 'notes'
        ? 'Study Note'
        : resource.resource_type === 'pyq'
        ? 'Previous Year Question Paper'
        : resource.resource_type === 'revision_sheets'
        ? 'Revision Sheet'
        : resource.resource_type === 'mcq'
        ? 'Multiple Choice Questions'
        : resource.resource_type === 'flashcards'
        ? 'Flashcard'
        : 'Educational Resource',
    provider: {
      '@type': 'Organization',
      name: 'Horizon',
      url: origin,
    },
    isPartOf: {
      '@type': 'WebSite',
      name: 'Horizon',
      url: origin,
    },
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb">
        <Link to={backPath} className="inline-flex items-center h-11 px-4 font-bold neu-raised rounded-xl hover:neu-raised-hover no-underline text-ink text-sm">
          &larr; {backText}
        </Link>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main Content Area (2 cols on large) */}
        <main className="lg:col-span-2 space-y-6">

          {/* Primary Resource Header Card */}
          <article className="neu-card rounded-2xl p-6 md:p-8 space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              {resource.student_class && (
                <span className="neu-recessed px-3 py-1 rounded-full text-caption font-bold text-ink/80">
                  {resource.student_class}
                </span>
              )}
              {resource.subject && (
                <span className="neu-recessed px-3 py-1 rounded-full text-caption font-bold text-ink/80">
                  {resource.subject}
                </span>
              )}
              {resource.medium && (
                <span className="neu-recessed px-3 py-1 rounded-full text-caption font-bold text-ink/80 uppercase">
                  {resource.medium} Medium
                </span>
              )}
              <span className="neu-recessed px-3 py-1 rounded-full text-caption font-bold text-ink/80 uppercase">
                {resource.resource_type}
              </span>
            </div>

            <h1 className="text-h1 uppercase text-ink leading-tight">
              {resource.title}
            </h1>

            {resource.chapters && (
              <p className="text-body1 font-bold text-ink/70">
                Chapter {resource.chapters.chapter_number}: {resource.chapters.chapter_name}
              </p>
            )}

            {/* Protected PDF Access Call-to-Action */}
            <div className="neu-recessed rounded-xl p-6 my-6 text-center space-y-3">
              <h2 className="text-h2 uppercase text-ink m-0">Full Study Resource</h2>
              <p className="text-body1 text-ink/80 max-w-md mx-auto">
                {isNotes
                  ? 'Access the complete interactive study note with structured chapter pages and reading progress tracking.'
                  : 'Open the full document in Horizon\'s reader for structured review and exam preparation.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  to={`/view/${resource.id}`}
                  className="inline-flex items-center justify-center px-6 py-3 font-bold text-body1 neu-raised rounded-xl hover:neu-raised-hover no-underline text-ink min-w-[200px]"
                >
                  {isNotes ? 'Open Full Notes' : 'View Full Resource'} &rarr;
                </Link>
                {resource.pdfUrl && canDownload(resource) && (
                  <button
                    type="button"
                    onClick={(e) => handleDownload(resource.pdfUrl, resource, e)}
                    className="inline-flex items-center justify-center px-6 py-3 font-bold text-body1 neu-raised rounded-xl hover:neu-raised-hover no-underline text-ink cursor-pointer"
                  >
                    Download Resource
                  </button>
                )}
              </div>
            </div>
          </article>

          {/* Educational Overview Section */}
          <section className="neu-card rounded-2xl p-6 md:p-8 space-y-4">
            <h2 className="text-h2 uppercase text-ink pb-2 border-b border-ink/10">Chapter & Resource Overview</h2>
            <p className="text-body1 leading-relaxed text-ink/90">
              {isNotes ? (
                <>
                  This study note covers <strong>{resource.title}</strong> for {resource.student_class || 'students'} studying {resource.subject || 'this subject'} in {resource.medium === 'hindi' ? 'Hindi' : 'English'} medium. Prepared according to the prescribed curriculum, it synthesizes essential theoretical foundations, definitions, and key exam concepts to streamline student revision and improve subject mastery.
                </>
              ) : isPYQ ? (
                <>
                  This Previous Year Question (PYQ) paper for {resource.student_class || 'students'} {resource.subject || ''} {resource.year ? `(${resource.year})` : ''} provides authentic board exam questions in {resource.medium === 'hindi' ? 'Hindi' : 'English'} medium. Practicing with past examination papers enables students to analyze question patterns, time management, and mark distribution.
                </>
              ) : (
                <>
                  This educational resource for {resource.student_class || 'students'} {resource.subject || ''} offers structured learning material in {resource.medium === 'hindi' ? 'Hindi' : 'English'} medium. Designed to support active learning and exam preparation for school assessments.
                </>
              )}
            </p>
            {resource.description && (
              <div className="neu-recessed p-4 rounded-xl text-body1 text-ink/80 italic">
                "{resource.description}"
              </div>
            )}
          </section>

          {/* Topics & Syllabus Context Section */}
          <section className="neu-card rounded-2xl p-6 md:p-8 space-y-4">
            <h2 className="text-h2 uppercase text-ink pb-2 border-b border-ink/10">Topics Covered & Key Concepts</h2>
            <p className="text-body1 text-ink/80">
              Key syllabus areas addressed in this resource include:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-body1 text-ink/90">
              {isNotes ? (
                <>
                  <li>Fundamental definitions, laws, and core theoretical concepts.</li>
                  <li>Structured breakdown of key chapter subtopics and formulas.</li>
                  <li>High-yield exam points and recurring conceptual questions.</li>
                  <li>Diagrams, illustrative examples, and chapter summaries.</li>
                </>
              ) : isPYQ ? (
                <>
                  <li>Multiple-choice and objective assessment questions.</li>
                  <li>Short-answer conceptual problems and numerical exercises.</li>
                  <li>Long-answer analytical and structured essay/diagram questions.</li>
                  <li>Direct insight into board exam question formats and weightage.</li>
                </>
              ) : (
                <>
                  <li>Comprehensive topic review and core definitions.</li>
                  <li>Practice questions and self-assessment exercises.</li>
                  <li>Key takeaways for quick revision before tests.</li>
                </>
              )}
            </ul>
          </section>

          {/* Study Guidance Section */}
          <section className="neu-card rounded-2xl p-6 md:p-8 space-y-4">
            <h2 className="text-h2 uppercase text-ink pb-2 border-b border-ink/10">Study Guidance & Preparation Tips</h2>
            <ol className="list-decimal pl-6 space-y-3 text-body1 text-ink/90">
              <li>
                <strong>Initial Review:</strong> Read through the chapter overview to establish a clear conceptual framework before delving into details.
              </li>
              <li>
                <strong>Active Recall:</strong> Test yourself on key definitions and concepts without looking at the reference material.
              </li>
              <li>
                <strong>Practice Questions:</strong> Work through example problems and practice questions under timed conditions.
              </li>
              <li>
                <strong>Interactive Note Viewing:</strong> Click <em>Open Full Notes</em> above to access Horizon's full interactive viewer with page tracking and layout tools.
              </li>
            </ol>
          </section>

        </main>

        {/* Sidebar (1 col on large) */}
        <aside className="space-y-6">

          {/* Resource Details Metadata Card */}
          <section className="neu-card rounded-2xl p-6 space-y-4">
            <h3 className="text-h2 uppercase text-ink pb-2 border-b border-ink/10">Resource Details</h3>
            <dl className="space-y-3 text-body1">
              {resource.student_class && (
                <div className="flex justify-between items-center">
                  <dt className="text-ink/70 font-bold">Class:</dt>
                  <dd className="m-0 font-bold text-ink">{resource.student_class}</dd>
                </div>
              )}
              {resource.subject && (
                <div className="flex justify-between items-center">
                  <dt className="text-ink/70 font-bold">Subject:</dt>
                  <dd className="m-0 font-bold text-ink">{resource.subject}</dd>
                </div>
              )}
              {resource.medium && (
                <div className="flex justify-between items-center">
                  <dt className="text-ink/70 font-bold">Medium:</dt>
                  <dd className="m-0 font-bold text-ink capitalize">{resource.medium}</dd>
                </div>
              )}
              <div className="flex justify-between items-center">
                <dt className="text-ink/70 font-bold">Type:</dt>
                <dd className="m-0 font-bold text-ink capitalize">{resource.resource_type}</dd>
              </div>
              {resource.year && (
                <div className="flex justify-between items-center">
                  <dt className="text-ink/70 font-bold">Academic Year:</dt>
                  <dd className="m-0 font-bold text-ink">{resource.year}</dd>
                </div>
              )}
              <div className="flex justify-between items-center">
                <dt className="text-ink/70 font-bold">Added On:</dt>
                <dd className="m-0 font-bold text-ink">{new Date(resource.uploadDate).toLocaleDateString()}</dd>
              </div>
            </dl>
          </section>

          {/* Action CTA Sidebar Card */}
          <section className="neu-card rounded-2xl p-6 text-center space-y-3">
            <h3 className="text-h2 uppercase text-ink">Ready to Study?</h3>
            <p className="text-caption text-ink/80">
              Open the full notes in Horizon's dedicated reader to start studying now.
            </p>
            <Link
              to={`/view/${resource.id}`}
              className="block w-full py-3 font-bold neu-raised rounded-xl hover:neu-raised-hover no-underline text-ink text-center"
            >
              {isNotes ? 'Open Full Notes' : 'View Full Resource'} &rarr;
            </Link>
          </section>

          {/* Related Resources Card */}
          <section className="neu-card rounded-2xl p-6 space-y-4">
            <h3 className="text-h2 uppercase text-ink pb-2 border-b border-ink/10">Related Resources</h3>
            {relatedResources.length > 0 ? (
              <ul className="list-none p-0 m-0 space-y-3">
                {relatedResources.map((related) => (
                  <li key={related.id}>
                    <Link
                      to={`/resource/${related.id}`}
                      className="block p-3 font-bold neu-raised rounded-xl hover:neu-raised-hover no-underline text-ink text-sm leading-snug"
                    >
                      {related.title}
                      <span className="block text-caption text-ink/60 font-medium mt-1">
                        {related.student_class} {related.subject}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-caption font-bold text-ink/60 m-0">No related resources found.</p>
            )}
          </section>

        </aside>

      </div>
    </div>
  );
};

export default ResourceDetails;
