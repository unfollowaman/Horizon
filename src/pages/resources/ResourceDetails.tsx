import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchLearningResourceById, fetchLearningResources } from '../../services/learningResourcesAPI';
import type { Resource } from '../../types';
import { RESOURCE_CATEGORIES } from '../../config/resources';
import { handleDownload } from '../../utils/download';
import { canDownload } from '../../utils/permissions';
import ProfileButton from '../../components/ProfileButton';
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
      <div className="w-[min(96vw,1600px)] mx-auto px-[clamp(16px,2vw,32px)] max-md:pt-[10px] md:-mt-[20px] pb-[clamp(24px,3vw,48px)]">
        <div className="text-center p-6 sm:p-12 neu-card rounded-2xl min-w-0">
          <div className="w-10 h-10 border-4 border-[#E91E8C]/20 border-t-[#E91E8C] rounded-full animate-spin mx-auto mb-4" />
          <h1 className="text-xl sm:text-h2 uppercase text-ink break-words">Loading Educational Landing Page...</h1>
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

  if (!resource) {
    return (
      <div className="w-[min(96vw,1600px)] mx-auto px-[clamp(16px,2vw,32px)] max-md:pt-[10px] md:-mt-[20px] pb-[clamp(24px,3vw,48px)]">
        <div className="text-center p-6 sm:p-12 neu-card rounded-2xl min-w-0">
          <h1 className="text-xl sm:text-h2 uppercase text-accent-red mb-4 break-words">Resource not found</h1>
          <p className="text-sm sm:text-body1 mb-6 text-ink/80 break-words">The requested educational material could not be found or may have been moved.</p>
          <Link to="/" className="inline-block px-5 sm:px-6 py-2.5 sm:py-3 font-bold neu-raised rounded-xl hover:neu-raised-hover no-underline text-ink text-sm sm:text-base">Back to Home</Link>
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

  // Chapter Kicker calculations
  const chapterKicker = resource.chapters?.chapter_number
    ? `CHAPTER ${resource.chapters.chapter_number}`
    : isNotes
    ? 'STUDY NOTE'
    : isPYQ
    ? 'BOARD EXAM RESOURCE'
    : 'EDUCATIONAL RESOURCE';

  const showSubtitle =
    resource.chapters &&
    resource.chapters.chapter_name &&
    !resource.title.toLowerCase().includes(resource.chapters.chapter_name.toLowerCase());

  return (
    <div className="w-[min(96vw,1600px)] mx-auto px-[clamp(16px,2vw,32px)] max-md:pt-[10px] md:-mt-[20px] pb-[clamp(24px,3vw,48px)] min-w-0">
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>

      {/* Top Header Navigation */}
      <div className="flex justify-between items-center mb-[clamp(12px,3vw,20px)] w-full min-w-0">
        <button
          type="button"
          onClick={() => window.history.length > 1 ? window.history.back() : window.location.href = backPath}
          className="w-11 h-11 neu-raised rounded-full neu-raised-hover flex items-center justify-center cursor-pointer shrink-0"
          aria-label="Go Back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <ProfileButton />
      </div>

      {/* Editorial Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-8 items-start w-full min-w-0">

        {/* Main Content Column (2 cols on desktop) */}
        <main className="lg:col-span-2 space-y-5 sm:space-y-6 md:space-y-8 min-w-0 w-full">

          {/* Chapter Header Card */}
          <article className="neu-card rounded-2xl px-4 py-3.5 sm:px-8 sm:py-6 md:px-10 md:py-7 space-y-3 sm:space-y-4 relative overflow-hidden min-w-0 w-full">
            {/* Badges Row */}
            <div className="flex flex-nowrap gap-1.5 sm:gap-2 items-center justify-start relative z-10 min-w-0 w-full overflow-x-auto no-scrollbar">
              {resource.student_class && (
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-ink/80 bg-black/5 shrink-0">
                  {resource.student_class}
                </span>
              )}
              {resource.subject && (
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-ink/80 bg-black/5 shrink-0">
                  {resource.subject}
                </span>
              )}
              {resource.medium && (
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-ink/80 uppercase bg-black/5 shrink-0">
                  {resource.medium} MEDIUM
                </span>
              )}
            </div>

            {/* Chapter Number & Title Header */}
            <header className="space-y-1.5 sm:space-y-2 relative z-10 min-w-0">
              <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#E91E8C] uppercase break-words">
                {chapterKicker}
              </p>
              <h1 className="text-xl sm:text-3xl md:text-4xl font-bold uppercase text-ink leading-snug sm:leading-tight text-left break-words min-w-0">
                {resource.title}
              </h1>
              {showSubtitle && (
                <p className="text-sm sm:text-body1 font-semibold text-ink/70 pt-0.5 sm:pt-1 break-words min-w-0">
                  Chapter {resource.chapters?.chapter_number}: {resource.chapters?.chapter_name}
                </p>
              )}
            </header>

            {/* Introductory Description */}
            <p className="text-sm sm:text-body1 text-ink/80 leading-relaxed max-w-2xl pt-2 sm:pt-3 border-t border-ink/5 relative z-10 break-words min-w-0">
              {resource.description || (
                isNotes
                  ? `Comprehensive study material for ${resource.student_class || 'students'} covering essential theory, board exam concepts, and syllabus notes for ${resource.subject || 'this subject'}.`
                  : `Official ${resource.student_class || ''} ${resource.subject || ''} ${resource.year ? `(${resource.year})` : ''} learning resource curated for guided study and exam preparation.`
              )}
            </p>
          </article>

          {/* Protected PDF CTA Banner */}
          <section className="neu-card rounded-2xl p-4 sm:p-8 space-y-3.5 sm:space-y-4 relative overflow-hidden min-w-0 w-full">
            <div className="flex items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-ink/10 min-w-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 neu-raised rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] sm:text-xs font-bold tracking-widest text-[#E91E8C] uppercase block truncate">
                    FULL STUDY RESOURCE
                  </span>
                  <h2 className="text-base sm:text-h2 font-bold text-ink uppercase m-0 leading-snug break-words min-w-0">
                    {isNotes ? 'Open Complete Study Notes' : 'Access Full Document'}
                  </h2>
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-body1 text-ink/80 leading-relaxed break-words min-w-0">
              {isNotes
                ? 'Access the complete interactive study note in Horizon\'s reader featuring full-page rendering, structured subtopics, and reading progress tracking.'
                : 'Open the full document in Horizon\'s reader for structured review, zooming, and comprehensive exam revision.'}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1 sm:pt-2 min-w-0">
              <Link
                to={`/view/${resource.id}`}
                className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 font-bold text-xs sm:text-body1 text-white bg-gradient-to-r from-[#E91E8C] via-[#C2185B] to-[#8B0A50] rounded-xl shadow-md hover:opacity-95 transition-all no-underline text-center cursor-pointer group min-w-0"
              >
                <span className="truncate">{isNotes ? 'Open Full Notes' : 'View Full Resource'}</span>
                <span className="transition-transform group-hover:translate-x-1 shrink-0">&rarr;</span>
              </Link>

              {resource.pdfUrl && canDownload(resource) && (
                <button
                  type="button"
                  onClick={(e) => handleDownload(resource.pdfUrl, resource, e)}
                  className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 font-bold text-xs sm:text-body1 neu-raised rounded-xl hover:neu-raised-hover no-underline text-ink text-center cursor-pointer min-w-0"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E91E8C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="truncate">Download Resource</span>
                </button>
              )}
            </div>
          </section>

          {/* Chapter & Resource Overview Section */}
          <section className="neu-card rounded-2xl p-4 sm:p-8 md:p-10 space-y-3.5 sm:space-y-4 min-w-0 w-full">
            <div className="flex items-center gap-2.5 sm:gap-3 pb-2.5 sm:pb-3 border-b border-ink/10 min-w-0">
              <div className="w-2 sm:w-2.5 h-5 sm:h-6 bg-gradient-to-b from-[#E91E8C] to-[#8B0A50] rounded-full shrink-0" />
              <h2 className="text-base sm:text-h2 font-bold uppercase text-ink m-0 break-words min-w-0 flex-1 leading-snug">
                Chapter & Resource Overview
              </h2>
            </div>

            <div className="space-y-3 sm:space-y-4 text-xs sm:text-body1 leading-relaxed text-ink/90 min-w-0">
              <p className="break-words m-0">
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
                <blockquote className="neu-recessed p-3 sm:p-4 rounded-xl text-xs sm:text-body1 text-ink/80 italic border-l-4 border-l-[#E91E8C] my-3 sm:my-4 break-words min-w-0">
                  "{resource.description}"
                </blockquote>
              )}

              <p className="break-words m-0">
                Designed as a comprehensive revision companion, this resource presents complex academic topics with clarity and structured emphasis on key syllabus objectives, enabling students to perform active recall and retain core subject matter effectively.
              </p>
            </div>
          </section>

          {/* Topics Covered & Key Concepts Section */}
          <section className="neu-card rounded-2xl p-4 sm:p-8 md:p-10 space-y-4 sm:space-y-5 min-w-0 w-full">
            <div className="flex items-center gap-2.5 sm:gap-3 pb-2.5 sm:pb-3 border-b border-ink/10 min-w-0">
              <div className="w-2 sm:w-2.5 h-5 sm:h-6 bg-gradient-to-b from-[#E91E8C] to-[#8B0A50] rounded-full shrink-0" />
              <h2 className="text-base sm:text-h2 font-bold uppercase text-ink m-0 break-words min-w-0 flex-1 leading-snug">
                Topics Covered & Key Concepts
              </h2>
            </div>

            <p className="text-xs sm:text-body1 text-ink/80 break-words m-0">
              Key syllabus areas addressed in this educational resource include:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 min-w-0">
              {isNotes ? (
                <>
                  <div className="neu-recessed p-3 sm:p-4 rounded-xl flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-11 h-11 neu-raised rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">
                      Fundamental definitions, laws, and core theoretical concepts.
                    </span>
                  </div>
                  <div className="neu-recessed p-3 sm:p-4 rounded-xl flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-11 h-11 neu-raised rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">
                      Structured breakdown of key chapter subtopics and formulas.
                    </span>
                  </div>
                  <div className="neu-recessed p-3 sm:p-4 rounded-xl flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-11 h-11 neu-raised rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">
                      High-yield exam points and recurring conceptual questions.
                    </span>
                  </div>
                  <div className="neu-recessed p-3 sm:p-4 rounded-xl flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-11 h-11 neu-raised rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">
                      Diagrams, illustrative examples, and chapter summaries.
                    </span>
                  </div>
                </>
              ) : isPYQ ? (
                <>
                  <div className="neu-recessed p-3 sm:p-4 rounded-xl flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-11 h-11 neu-raised rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">
                      Multiple-choice and objective assessment questions.
                    </span>
                  </div>
                  <div className="neu-recessed p-3 sm:p-4 rounded-xl flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-11 h-11 neu-raised rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">
                      Short-answer conceptual problems and numerical exercises.
                    </span>
                  </div>
                  <div className="neu-recessed p-3 sm:p-4 rounded-xl flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-11 h-11 neu-raised rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">
                      Long-answer analytical and structured essay/diagram questions.
                    </span>
                  </div>
                  <div className="neu-recessed p-3 sm:p-4 rounded-xl flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-11 h-11 neu-raised rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">
                      Direct insight into board exam question formats and weightage.
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="neu-recessed p-3 sm:p-4 rounded-xl flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-11 h-11 neu-raised rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">
                      Comprehensive topic review and core definitions.
                    </span>
                  </div>
                  <div className="neu-recessed p-3 sm:p-4 rounded-xl flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-11 h-11 neu-raised rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">
                      Practice questions and self-assessment exercises.
                    </span>
                  </div>
                  <div className="neu-recessed p-3 sm:p-4 rounded-xl flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-11 h-11 neu-raised rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">
                      Key takeaways for quick revision before tests.
                    </span>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Study Guidance & Preparation Tips Section */}
          <section className="neu-card rounded-2xl p-4 sm:p-8 md:p-10 space-y-4 sm:space-y-6 min-w-0 w-full">
            <div className="flex items-center gap-2.5 sm:gap-3 pb-2.5 sm:pb-3 border-b border-ink/10 min-w-0">
              <div className="w-2 sm:w-2.5 h-5 sm:h-6 bg-gradient-to-b from-[#E91E8C] to-[#8B0A50] rounded-full shrink-0" />
              <h2 className="text-base sm:text-h2 font-bold uppercase text-ink m-0 break-words min-w-0 flex-1 leading-snug">
                Study Guidance & Preparation Tips
              </h2>
            </div>

            <div className="space-y-3 sm:space-y-4 min-w-0">
              {/* Step 01 */}
              <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 neu-recessed rounded-xl min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#E91E8C] via-[#C2185B] to-[#8B0A50] text-white font-bold flex items-center justify-center text-xs sm:text-sm shrink-0 shadow-sm mt-0.5">
                  01
                </div>
                <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                  <h3 className="text-xs sm:text-body1 font-bold text-ink m-0 break-words">
                    Initial Review
                  </h3>
                  <p className="text-xs sm:text-body1 text-ink/80 leading-relaxed m-0 break-words">
                    Read through the chapter overview to establish a clear conceptual framework before delving into details.
                  </p>
                </div>
              </div>

              {/* Step 02 */}
              <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 neu-recessed rounded-xl min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#E91E8C] via-[#C2185B] to-[#8B0A50] text-white font-bold flex items-center justify-center text-xs sm:text-sm shrink-0 shadow-sm mt-0.5">
                  02
                </div>
                <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                  <h3 className="text-xs sm:text-body1 font-bold text-ink m-0 break-words">
                    Active Recall
                  </h3>
                  <p className="text-xs sm:text-body1 text-ink/80 leading-relaxed m-0 break-words">
                    Test yourself on key definitions and concepts without looking at the reference material.
                  </p>
                </div>
              </div>

              {/* Step 03 */}
              <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 neu-recessed rounded-xl min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#E91E8C] via-[#C2185B] to-[#8B0A50] text-white font-bold flex items-center justify-center text-xs sm:text-sm shrink-0 shadow-sm mt-0.5">
                  03
                </div>
                <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                  <h3 className="text-xs sm:text-body1 font-bold text-ink m-0 break-words">
                    Practice Questions
                  </h3>
                  <p className="text-xs sm:text-body1 text-ink/80 leading-relaxed m-0 break-words">
                    Work through example problems and practice questions under timed conditions.
                  </p>
                </div>
              </div>

              {/* Step 04 */}
              <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 neu-recessed rounded-xl min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#E91E8C] via-[#C2185B] to-[#8B0A50] text-white font-bold flex items-center justify-center text-xs sm:text-sm shrink-0 shadow-sm mt-0.5">
                  04
                </div>
                <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                  <h3 className="text-xs sm:text-body1 font-bold text-ink m-0 break-words">
                    Interactive Note Viewing
                  </h3>
                  <p className="text-xs sm:text-body1 text-ink/80 leading-relaxed m-0 break-words">
                    Click <em>Open Full Notes</em> above to access Horizon's full interactive viewer with page tracking and layout tools.
                  </p>
                </div>
              </div>
            </div>
          </section>

        </main>

        {/* Right Sidebar Column (1 col on desktop) */}
        <aside className="space-y-5 sm:space-y-6 md:space-y-8 min-w-0 w-full">

          {/* Resource Details Metadata Card */}
          <section className="neu-card rounded-2xl p-4 sm:p-6 space-y-3.5 sm:space-y-4 min-w-0 w-full">
            <h2 className="text-base sm:text-h2 uppercase text-ink pb-2 border-b border-ink/10 break-words">
              Resource Details
            </h2>

            <dl className="space-y-2 text-xs sm:text-body1 m-0 min-w-0">
              {resource.student_class && (
                <div className="flex flex-row items-center justify-between gap-2 py-1.5 border-b border-ink/5 min-w-0">
                  <dt className="text-ink/70 font-semibold text-caption flex items-center gap-1.5 shrink-0">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E91E8C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                    Class:
                  </dt>
                  <dd className="m-0 font-bold text-ink text-right break-words text-caption min-w-0">{resource.student_class}</dd>
                </div>
              )}

              {resource.subject && (
                <div className="flex flex-row items-center justify-between gap-2 py-1.5 border-b border-ink/5 min-w-0">
                  <dt className="text-ink/70 font-semibold text-caption flex items-center gap-1.5 shrink-0">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E91E8C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Subject:
                  </dt>
                  <dd className="m-0 font-bold text-ink text-right break-words text-caption min-w-0">{resource.subject}</dd>
                </div>
              )}

              {resource.medium && (
                <div className="flex flex-row items-center justify-between gap-2 py-1.5 border-b border-ink/5 min-w-0">
                  <dt className="text-ink/70 font-semibold text-caption flex items-center gap-1.5 shrink-0">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E91E8C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    Medium:
                  </dt>
                  <dd className="m-0 font-bold text-ink capitalize text-right break-words text-caption min-w-0">{resource.medium}</dd>
                </div>
              )}

              <div className="flex flex-row items-center justify-between gap-2 py-1.5 border-b border-ink/5 min-w-0">
                <dt className="text-ink/70 font-semibold text-caption flex items-center gap-1.5 shrink-0">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E91E8C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h10M7 11h10M7 15h10M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                  </svg>
                  Type:
                </dt>
                <dd className="m-0 font-bold text-ink capitalize text-right break-words text-caption min-w-0">{resource.resource_type.replace('_', ' ')}</dd>
              </div>

              {resource.year && (
                <div className="flex flex-row items-center justify-between gap-2 py-1.5 border-b border-ink/5 min-w-0">
                  <dt className="text-ink/70 font-semibold text-caption flex items-center gap-1.5 shrink-0">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E91E8C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Academic Year:
                  </dt>
                  <dd className="m-0 font-bold text-ink text-right break-words text-caption min-w-0">{resource.year}</dd>
                </div>
              )}

              <div className="flex flex-row items-center justify-between gap-2 py-1.5 min-w-0">
                <dt className="text-ink/70 font-semibold text-caption flex items-center gap-1.5 shrink-0">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E91E8C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Added On:
                </dt>
                <dd className="m-0 font-bold text-ink text-right break-words text-caption min-w-0">{new Date(resource.uploadDate).toLocaleDateString()}</dd>
              </div>
            </dl>
          </section>

          {/* Ready to Study CTA Card */}
          <section className="neu-card rounded-2xl p-4 sm:p-6 text-center space-y-2.5 sm:space-y-3 bg-gradient-to-br from-[#E91E8C]/10 via-[#C2185B]/5 to-transparent border border-[#E91E8C]/20 relative overflow-hidden min-w-0 w-full">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#E91E8C] via-[#C2185B] to-[#8B0A50] text-white flex items-center justify-center mx-auto shadow-md shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-base sm:text-h2 uppercase text-ink m-0 break-words">
              Ready to Study?
            </h2>
            <p className="text-caption text-ink/80 max-w-xs mx-auto break-words">
              Open the full notes in Horizon's dedicated reader to start studying now.
            </p>
            <Link
              to={`/view/${resource.id}`}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 sm:py-3 font-bold neu-raised rounded-xl hover:neu-raised-hover no-underline text-ink text-center text-xs sm:text-sm border-2 border-[#E91E8C]/20 group min-w-0"
            >
              <span className="truncate">{isNotes ? 'Open Full Notes' : 'View Full Resource'}</span>
              <span className="text-[#E91E8C] transition-transform group-hover:translate-x-1 shrink-0">&rarr;</span>
            </Link>
          </section>

          {/* Related Resources Card */}
          <section className="neu-card rounded-2xl p-4 sm:p-6 space-y-3.5 sm:space-y-4 min-w-0 w-full">
            <h2 className="text-base sm:text-h2 uppercase text-ink pb-2 border-b border-ink/10 break-words">
              Related Resources
            </h2>

            {relatedResources.length > 0 ? (
              <ul className="list-none p-0 m-0 space-y-2.5 sm:space-y-3 min-w-0">
                {relatedResources.map((related) => (
                  <li key={related.id} className="min-w-0">
                    <Link
                      to={`/resource/${related.id}`}
                      className="block p-3 sm:p-3.5 font-bold neu-raised rounded-xl hover:neu-raised-hover no-underline text-ink text-xs sm:text-sm leading-snug group min-w-0"
                    >
                      <span className="group-hover:text-[#E91E8C] transition-colors break-words block min-w-0">{related.title}</span>
                      <span className="block text-caption text-ink/60 font-medium mt-1 truncate">
                        {related.student_class} {related.subject}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="neu-recessed p-3.5 sm:p-4 rounded-xl text-center min-w-0">
                <p className="text-caption font-semibold text-ink/60 m-0 break-words">
                  No related resources found in this category.
                </p>
              </div>
            )}
          </section>

        </aside>

      </div>
    </div>
  );
};

export default ResourceDetails;
