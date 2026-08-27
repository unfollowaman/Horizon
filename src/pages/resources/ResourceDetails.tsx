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
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="text-center p-8 sm:p-12 neu-card rounded-2xl">
          <div className="w-10 h-10 border-4 border-[#E91E8C]/20 border-t-[#E91E8C] rounded-full animate-spin mx-auto mb-4" />
          <h1 className="text-h2 uppercase text-ink">Loading Educational Landing Page...</h1>
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
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="text-center p-8 sm:p-12 neu-card rounded-2xl">
          <h1 className="text-h2 uppercase text-accent-red mb-4">Resource not found</h1>
          <p className="text-body1 mb-6 text-ink/80">The requested educational material could not be found or may have been moved.</p>
          <Link to="/" className="inline-block px-6 py-3 font-bold neu-raised rounded-xl hover:neu-raised-hover no-underline text-ink">Back to Home</Link>
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
    <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8">
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="pt-2">
        <Link
          to={backPath}
          className="inline-flex items-center gap-2 h-10 px-4 font-bold neu-raised rounded-xl hover:neu-raised-hover no-underline text-ink text-sm max-w-full truncate group transition-all"
        >
          <span className="text-[#E91E8C] transition-transform group-hover:-translate-x-0.5">&larr;</span>
          <span className="truncate">{backText}</span>
        </Link>
      </nav>

      {/* Editorial Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">

        {/* Main Content Column (2 cols on desktop) */}
        <main className="lg:col-span-2 space-y-6 md:space-y-8">

          {/* Chapter Header Card */}
          <article className="neu-card rounded-2xl p-6 sm:p-8 md:p-10 space-y-5 relative overflow-hidden">
            {/* Soft pink ambient highlight */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-gradient-to-br from-[#E91E8C]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

            {/* Badges Row */}
            <div className="flex flex-wrap gap-2 items-center justify-start relative z-10">
              {resource.student_class && (
                <span className="neu-recessed px-3 py-1 rounded-full text-caption font-bold text-ink/80 border-l-2 border-[#E91E8C] shrink-0">
                  {resource.student_class}
                </span>
              )}
              {resource.subject && (
                <span className="neu-recessed px-3 py-1 rounded-full text-caption font-bold text-ink/80 shrink-0">
                  {resource.subject}
                </span>
              )}
              {resource.medium && (
                <span className="neu-recessed px-3 py-1 rounded-full text-caption font-bold text-ink/80 uppercase shrink-0">
                  {resource.medium} Medium
                </span>
              )}
              <span className="neu-recessed px-3 py-1 rounded-full text-caption font-bold text-ink/80 uppercase shrink-0">
                {resource.resource_type.replace('_', ' ')}
              </span>
            </div>

            {/* Chapter Number & Title Header */}
            <header className="space-y-2 relative z-10">
              <p className="text-xs font-bold tracking-widest text-[#E91E8C] uppercase">
                {chapterKicker}
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold uppercase text-ink leading-tight text-left break-words">
                {resource.title}
              </h1>
              {showSubtitle && (
                <p className="text-body1 font-semibold text-ink/70 pt-1">
                  Chapter {resource.chapters?.chapter_number}: {resource.chapters?.chapter_name}
                </p>
              )}
            </header>

            {/* Introductory Description */}
            <p className="text-body1 text-ink/80 leading-relaxed max-w-2xl pt-1 border-t border-ink/5 relative z-10">
              {resource.description || (
                isNotes
                  ? `Comprehensive study material for ${resource.student_class || 'students'} covering essential theory, board exam concepts, and syllabus notes for ${resource.subject || 'this subject'}.`
                  : `Official ${resource.student_class || ''} ${resource.subject || ''} ${resource.year ? `(${resource.year})` : ''} learning resource curated for guided study and exam preparation.`
              )}
            </p>
          </article>

          {/* Protected PDF CTA Banner */}
          <section className="neu-card rounded-2xl p-6 sm:p-8 space-y-4 relative overflow-hidden border-l-4 border-l-[#E91E8C]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-ink/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E91E8C] via-[#C2185B] to-[#8B0A50] flex items-center justify-center text-white shrink-0 shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-bold tracking-widest text-[#E91E8C] uppercase block">
                    FULL STUDY RESOURCE
                  </span>
                  <h2 className="text-xl sm:text-h2 font-bold text-ink uppercase m-0 leading-snug">
                    {isNotes ? 'Open Complete Study Notes' : 'Access Full Document'}
                  </h2>
                </div>
              </div>
              <span className="neu-recessed px-3 py-1 rounded-full text-xs font-semibold text-ink/70 shrink-0">
                Protected Horizon Reader
              </span>
            </div>

            <p className="text-body1 text-ink/80 leading-relaxed">
              {isNotes
                ? 'Access the complete interactive study note in Horizon\'s reader featuring full-page rendering, structured subtopics, and reading progress tracking.'
                : 'Open the full document in Horizon\'s reader for structured review, zooming, and comprehensive exam revision.'}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link
                to={`/view/${resource.id}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 font-bold text-body1 text-white bg-gradient-to-r from-[#E91E8C] via-[#C2185B] to-[#8B0A50] rounded-xl shadow-md hover:opacity-95 transition-all no-underline text-center cursor-pointer group"
              >
                <span>{isNotes ? 'Open Full Notes' : 'View Full Resource'}</span>
                <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
              </Link>

              {resource.pdfUrl && canDownload(resource) && (
                <button
                  type="button"
                  onClick={(e) => handleDownload(resource.pdfUrl, resource, e)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 font-bold text-body1 neu-raised rounded-xl hover:neu-raised-hover no-underline text-ink text-center cursor-pointer"
                >
                  <svg className="w-4 h-4 text-[#E91E8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Download Resource</span>
                </button>
              )}
            </div>
          </section>

          {/* Chapter & Resource Overview Section */}
          <section className="neu-card rounded-2xl p-6 sm:p-8 md:p-10 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-ink/10">
              <div className="w-2.5 h-6 bg-gradient-to-b from-[#E91E8C] to-[#8B0A50] rounded-full" />
              <h2 className="text-xl sm:text-h2 font-bold uppercase text-ink m-0">
                Chapter & Resource Overview
              </h2>
            </div>

            <div className="space-y-4 text-body1 leading-relaxed text-ink/90">
              <p>
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
                <blockquote className="neu-recessed p-4 rounded-xl text-body1 text-ink/80 italic border-l-4 border-l-[#E91E8C] my-4">
                  "{resource.description}"
                </blockquote>
              )}

              <p>
                Designed as a comprehensive revision companion, this resource presents complex academic topics with clarity and structured emphasis on key syllabus objectives, enabling students to perform active recall and retain core subject matter effectively.
              </p>
            </div>
          </section>

          {/* Topics Covered & Key Concepts Section */}
          <section className="neu-card rounded-2xl p-6 sm:p-8 md:p-10 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-ink/10">
              <div className="w-2.5 h-6 bg-gradient-to-b from-[#E91E8C] to-[#8B0A50] rounded-full" />
              <h2 className="text-xl sm:text-h2 font-bold uppercase text-ink m-0">
                Topics Covered & Key Concepts
              </h2>
            </div>

            <p className="text-body1 text-ink/80">
              Key syllabus areas addressed in this educational resource include:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {isNotes ? (
                <>
                  <div className="neu-recessed p-4 rounded-xl flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#8B0A50] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span className="text-body1 text-ink/90 font-medium">
                      Fundamental definitions, laws, and core theoretical concepts.
                    </span>
                  </div>
                  <div className="neu-recessed p-4 rounded-xl flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#8B0A50] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span className="text-body1 text-ink/90 font-medium">
                      Structured breakdown of key chapter subtopics and formulas.
                    </span>
                  </div>
                  <div className="neu-recessed p-4 rounded-xl flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#8B0A50] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span className="text-body1 text-ink/90 font-medium">
                      High-yield exam points and recurring conceptual questions.
                    </span>
                  </div>
                  <div className="neu-recessed p-4 rounded-xl flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#8B0A50] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span className="text-body1 text-ink/90 font-medium">
                      Diagrams, illustrative examples, and chapter summaries.
                    </span>
                  </div>
                </>
              ) : isPYQ ? (
                <>
                  <div className="neu-recessed p-4 rounded-xl flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#8B0A50] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span className="text-body1 text-ink/90 font-medium">
                      Multiple-choice and objective assessment questions.
                    </span>
                  </div>
                  <div className="neu-recessed p-4 rounded-xl flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#8B0A50] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span className="text-body1 text-ink/90 font-medium">
                      Short-answer conceptual problems and numerical exercises.
                    </span>
                  </div>
                  <div className="neu-recessed p-4 rounded-xl flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#8B0A50] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span className="text-body1 text-ink/90 font-medium">
                      Long-answer analytical and structured essay/diagram questions.
                    </span>
                  </div>
                  <div className="neu-recessed p-4 rounded-xl flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#8B0A50] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span className="text-body1 text-ink/90 font-medium">
                      Direct insight into board exam question formats and weightage.
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="neu-recessed p-4 rounded-xl flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#8B0A50] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span className="text-body1 text-ink/90 font-medium">
                      Comprehensive topic review and core definitions.
                    </span>
                  </div>
                  <div className="neu-recessed p-4 rounded-xl flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#8B0A50] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span className="text-body1 text-ink/90 font-medium">
                      Practice questions and self-assessment exercises.
                    </span>
                  </div>
                  <div className="neu-recessed p-4 rounded-xl flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#8B0A50] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span className="text-body1 text-ink/90 font-medium">
                      Key takeaways for quick revision before tests.
                    </span>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Study Guidance & Preparation Tips Section */}
          <section className="neu-card rounded-2xl p-6 sm:p-8 md:p-10 space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-ink/10">
              <div className="w-2.5 h-6 bg-gradient-to-b from-[#E91E8C] to-[#8B0A50] rounded-full" />
              <h2 className="text-xl sm:text-h2 font-bold uppercase text-ink m-0">
                Study Guidance & Preparation Tips
              </h2>
            </div>

            <div className="space-y-4">
              {/* Step 01 */}
              <div className="flex items-start gap-4 p-4 neu-recessed rounded-xl">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E91E8C] via-[#C2185B] to-[#8B0A50] text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-sm">
                  01
                </div>
                <div className="space-y-1">
                  <h3 className="text-body1 font-bold text-ink m-0">
                    Initial Review
                  </h3>
                  <p className="text-body1 text-ink/80 leading-relaxed m-0">
                    Read through the chapter overview to establish a clear conceptual framework before delving into details.
                  </p>
                </div>
              </div>

              {/* Step 02 */}
              <div className="flex items-start gap-4 p-4 neu-recessed rounded-xl">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E91E8C] via-[#C2185B] to-[#8B0A50] text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-sm">
                  02
                </div>
                <div className="space-y-1">
                  <h3 className="text-body1 font-bold text-ink m-0">
                    Active Recall
                  </h3>
                  <p className="text-body1 text-ink/80 leading-relaxed m-0">
                    Test yourself on key definitions and concepts without looking at the reference material.
                  </p>
                </div>
              </div>

              {/* Step 03 */}
              <div className="flex items-start gap-4 p-4 neu-recessed rounded-xl">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E91E8C] via-[#C2185B] to-[#8B0A50] text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-sm">
                  03
                </div>
                <div className="space-y-1">
                  <h3 className="text-body1 font-bold text-ink m-0">
                    Practice Questions
                  </h3>
                  <p className="text-body1 text-ink/80 leading-relaxed m-0">
                    Work through example problems and practice questions under timed conditions.
                  </p>
                </div>
              </div>

              {/* Step 04 */}
              <div className="flex items-start gap-4 p-4 neu-recessed rounded-xl">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E91E8C] via-[#C2185B] to-[#8B0A50] text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-sm">
                  04
                </div>
                <div className="space-y-1">
                  <h3 className="text-body1 font-bold text-ink m-0">
                    Interactive Note Viewing
                  </h3>
                  <p className="text-body1 text-ink/80 leading-relaxed m-0">
                    Click <em>Open Full Notes</em> above to access Horizon's full interactive viewer with page tracking and layout tools.
                  </p>
                </div>
              </div>
            </div>
          </section>

        </main>

        {/* Right Sidebar Column (1 col on desktop) */}
        <aside className="space-y-6 md:space-y-8">

          {/* Resource Details Metadata Card */}
          <section className="neu-card rounded-2xl p-6 space-y-4">
            <h2 className="text-h2 uppercase text-ink pb-2 border-b border-ink/10 text-lg sm:text-xl">
              Resource Details
            </h2>

            <dl className="space-y-3 text-body1 m-0">
              {resource.student_class && (
                <div className="flex items-center justify-between gap-2 py-1 border-b border-ink/5">
                  <dt className="text-ink/70 font-semibold text-caption flex items-center gap-2 shrink-0">
                    <svg className="w-4 h-4 text-[#E91E8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                    Class:
                  </dt>
                  <dd className="m-0 font-bold text-ink text-right truncate text-caption">{resource.student_class}</dd>
                </div>
              )}

              {resource.subject && (
                <div className="flex items-center justify-between gap-2 py-1 border-b border-ink/5">
                  <dt className="text-ink/70 font-semibold text-caption flex items-center gap-2 shrink-0">
                    <svg className="w-4 h-4 text-[#E91E8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Subject:
                  </dt>
                  <dd className="m-0 font-bold text-ink text-right truncate text-caption">{resource.subject}</dd>
                </div>
              )}

              {resource.medium && (
                <div className="flex items-center justify-between gap-2 py-1 border-b border-ink/5">
                  <dt className="text-ink/70 font-semibold text-caption flex items-center gap-2 shrink-0">
                    <svg className="w-4 h-4 text-[#E91E8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    Medium:
                  </dt>
                  <dd className="m-0 font-bold text-ink capitalize text-right truncate text-caption">{resource.medium}</dd>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 py-1 border-b border-ink/5">
                <dt className="text-ink/70 font-semibold text-caption flex items-center gap-2 shrink-0">
                  <svg className="w-4 h-4 text-[#E91E8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h10M7 11h10M7 15h10M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                  </svg>
                  Type:
                </dt>
                <dd className="m-0 font-bold text-ink capitalize text-right truncate text-caption">{resource.resource_type.replace('_', ' ')}</dd>
              </div>

              {resource.year && (
                <div className="flex items-center justify-between gap-2 py-1 border-b border-ink/5">
                  <dt className="text-ink/70 font-semibold text-caption flex items-center gap-2 shrink-0">
                    <svg className="w-4 h-4 text-[#E91E8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Academic Year:
                  </dt>
                  <dd className="m-0 font-bold text-ink text-right truncate text-caption">{resource.year}</dd>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 py-1">
                <dt className="text-ink/70 font-semibold text-caption flex items-center gap-2 shrink-0">
                  <svg className="w-4 h-4 text-[#E91E8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Added On:
                </dt>
                <dd className="m-0 font-bold text-ink text-right truncate text-caption">{new Date(resource.uploadDate).toLocaleDateString()}</dd>
              </div>
            </dl>
          </section>

          {/* Ready to Study CTA Card */}
          <section className="neu-card rounded-2xl p-6 text-center space-y-3 bg-gradient-to-br from-[#E91E8C]/10 via-[#C2185B]/5 to-transparent border border-[#E91E8C]/20 relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E91E8C] via-[#C2185B] to-[#8B0A50] text-white flex items-center justify-center mx-auto shadow-md">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-h2 uppercase text-ink text-lg sm:text-xl m-0">
              Ready to Study?
            </h2>
            <p className="text-caption text-ink/80 max-w-xs mx-auto">
              Open the full notes in Horizon's dedicated reader to start studying now.
            </p>
            <Link
              to={`/view/${resource.id}`}
              className="inline-flex items-center justify-center gap-2 w-full py-3 font-bold neu-raised rounded-xl hover:neu-raised-hover no-underline text-ink text-center text-sm border-2 border-[#E91E8C]/20 group"
            >
              <span>{isNotes ? 'Open Full Notes' : 'View Full Resource'}</span>
              <span className="text-[#E91E8C] transition-transform group-hover:translate-x-1">&rarr;</span>
            </Link>
          </section>

          {/* Related Resources Card */}
          <section className="neu-card rounded-2xl p-6 space-y-4">
            <h2 className="text-h2 uppercase text-ink pb-2 border-b border-ink/10 text-lg sm:text-xl">
              Related Resources
            </h2>

            {relatedResources.length > 0 ? (
              <ul className="list-none p-0 m-0 space-y-3">
                {relatedResources.map((related) => (
                  <li key={related.id}>
                    <Link
                      to={`/resource/${related.id}`}
                      className="block p-3.5 font-bold neu-raised rounded-xl hover:neu-raised-hover no-underline text-ink text-sm leading-snug group"
                    >
                      <span className="group-hover:text-[#E91E8C] transition-colors">{related.title}</span>
                      <span className="block text-caption text-ink/60 font-medium mt-1">
                        {related.student_class} {related.subject}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="neu-recessed p-4 rounded-xl text-center">
                <p className="text-caption font-semibold text-ink/60 m-0">
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
