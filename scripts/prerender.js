import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BASE_URL = 'https://unfollowaman.tech';

export const RESOURCE_CATEGORIES = {
  notes: { path: '/notes' },
  revision_sheets: { path: '/library' },
  mcq: { path: '/library' },
  flashcards: { path: '/library' },
  pyq: { path: '/library' },
};

export function classToSlug(classVal) {
  if (!classVal) return null;
  const match = String(classVal).match(/\d+/);
  return match ? `class-${match[0]}` : String(classVal).toLowerCase().trim().replace(/\s+/g, '-');
}

export function mediumToSlug(mediumVal) {
  if (!mediumVal) return null;
  const lower = String(mediumVal).toLowerCase().trim();
  if (lower.startsWith('english')) return 'english-medium';
  if (lower.startsWith('hindi')) return 'hindi-medium';
  return lower.replace(/\s+/g, '-');
}

export function subjectToSlug(subjectVal) {
  if (!subjectVal) return null;
  return String(subjectVal)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

export function buildCategoryUrl({ basePath, studentClass, medium, subject, year }) {
  const cSlug = classToSlug(studentClass);
  const mSlug = mediumToSlug(medium);
  const sSlug = subjectToSlug(subject);

  if (cSlug) {
    if (mSlug && sSlug) {
      return `${basePath}/${cSlug}/${mSlug}/${sSlug}`;
    }
    if (mSlug) {
      return `${basePath}/${cSlug}/${mSlug}`;
    }
    if (sSlug) {
      return `${basePath}/${cSlug}/all-mediums/${sSlug}`;
    }
    return `${basePath}/${cSlug}`;
  }

  const queryParams = new URLSearchParams();
  if (mSlug) queryParams.set('medium', mSlug);
  if (sSlug) queryParams.set('subject', sSlug);
  if (year) queryParams.set('year', String(year));

  const queryString = queryParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function mapLearningResource(item) {
  let className;
  if (item.student_class) {
    const strClass = String(item.student_class);
    const trimmed = strClass.trim();
    if (/^\d+$/.test(trimmed)) {
      className = `Class ${trimmed}`;
    } else if (/^class\s+\d+$/i.test(trimmed)) {
      const numMatch = trimmed.match(/\d+/);
      if (numMatch) {
        className = `Class ${numMatch[0]}`;
      } else {
        className = trimmed;
      }
    } else {
      className = trimmed;
    }
  } else {
    className = item.student_class === null ? null : undefined;
  }

  let title = item.title;
  if (item.resource_type === 'notes' && item.chapters) {
    title = `Chapter ${item.chapters.chapter_number}: ${item.chapters.chapter_name}`;
  }

  const chapterObj = item.chapters || null;

  const chapterSummary = item.chapter_summary || chapterObj?.chapter_summary || null;
  const topics = item.topics || chapterObj?.topics || null;
  const keyConcepts = item.key_concepts || chapterObj?.key_concepts || null;
  const importantTerms = item.important_terms || chapterObj?.important_terms || null;
  const learningObjectives = item.learning_objectives || chapterObj?.learning_objectives || null;
  const examRelevantThemes = item.exam_relevant_themes || chapterObj?.exam_relevant_themes || null;
  const studyGuidance = item.study_guidance || chapterObj?.study_guidance || null;

  return {
    id: String(item.id),
    title: title,
    description: item.description || '',
    resource_type: item.resource_type,
    medium: item.medium,
    uploadDate: item.created_at || new Date().toISOString(),
    student_class: className,
    subject: item.subject,
    year: item.year ? item.year.toString() : undefined,
    chapter_id: item.chapter_id,
    chapters: chapterObj,
    allow_download: item.allow_download ?? undefined,
    chapter_summary: chapterSummary,
    topics: topics,
    key_concepts: keyConcepts,
    important_terms: importantTerms,
    learning_objectives: learningObjectives,
    exam_relevant_themes: examRelevantThemes,
    study_guidance: studyGuidance,
    total_pages: item.total_pages || null,
    total_marks: item.total_marks || null,
    duration: item.duration || null,
  };
}

export function generateResourceHtml(resource, templateHtml, relatedResources = []) {
  const isNotes = resource.resource_type === 'notes';
  const isPYQ = resource.resource_type === 'pyq';

  const categoryBasePath = RESOURCE_CATEGORIES[resource.resource_type]?.path || '/';
  const backPath = buildCategoryUrl({
    basePath: categoryBasePath,
    studentClass: resource.student_class,
    medium: resource.medium,
    subject: resource.subject,
    year: resource.year,
  });

  const pageTitle = `${resource.title}${resource.student_class ? ` | ${resource.student_class}` : ''}${resource.subject ? ` ${resource.subject}` : ''} | Horizon`;

  const detailsContext = [resource.student_class, resource.subject].filter(Boolean).join(' ');
  const summaryOrDesc = resource.description || resource.chapter_summary;
  const descriptionText = summaryOrDesc
    ? summaryOrDesc.slice(0, 155) + (summaryOrDesc.length > 155 ? '...' : '')
    : `Access educational summary, syllabus breakdown, and study guidance for ${resource.title}${detailsContext ? ` (${detailsContext})` : ''}. Free learning materials on Horizon.`;

  const canonicalUrl = `${BASE_URL}/resource/${resource.id}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalResource',
    name: resource.title,
    description: resource.description || resource.chapter_summary || descriptionText,
    url: canonicalUrl,
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
      url: BASE_URL,
    },
    isPartOf: {
      '@type': 'WebSite',
      name: 'Horizon',
      url: BASE_URL,
    },
  };

  const kickerText = isNotes
    ? (resource.chapters?.chapter_number ? `CHAPTER ${resource.chapters.chapter_number}` : 'STUDY NOTE')
    : isPYQ
    ? (resource.student_class && resource.subject
        ? `${resource.student_class} ${resource.subject} — PREVIOUS-YEAR QUESTION PAPER`
        : 'PREVIOUS-YEAR QUESTION PAPER')
    : 'EDUCATIONAL RESOURCE';

  const showSubtitle =
    isNotes &&
    resource.chapters &&
    resource.chapters.chapter_name &&
    !resource.title.toLowerCase().includes(resource.chapters.chapter_name.toLowerCase());

  // Topics HTML construction
  const topicsList = [];
  if (Array.isArray(resource.topics) && resource.topics.length > 0) {
    resource.topics.forEach(t => {
      if (typeof t === 'string') topicsList.push(t);
      else if (t && typeof t === 'object' && 'title' in t) topicsList.push(String(t.title));
    });
  }
  if (Array.isArray(resource.key_concepts) && resource.key_concepts.length > 0) {
    resource.key_concepts.forEach(k => {
      if (typeof k === 'string') topicsList.push(k);
      else if (k && typeof k === 'object' && 'title' in k) topicsList.push(String(k.title));
    });
  }
  if (Array.isArray(resource.important_terms) && resource.important_terms.length > 0) {
    resource.important_terms.forEach(term => {
      if (typeof term === 'string') topicsList.push(term);
      else if (term && typeof term === 'object' && 'term' in term) topicsList.push(String(term.term));
    });
  }

  let topicsHtml = '';
  if (topicsList.length > 0) {
    topicsHtml = topicsList.map(topicItem => `
      <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
        <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0">
          <svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <span class="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">
          ${escapeHtml(topicItem)}
        </span>
      </div>
    `).join('');
  } else if (isNotes) {
    topicsHtml = `
      <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
        <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0">
          <svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <span class="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">Fundamental definitions, laws, and core theoretical concepts.</span>
      </div>
      <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
        <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0">
          <svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <span class="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">Structured breakdown of key chapter subtopics and formulas.</span>
      </div>
      <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
        <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0">
          <svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <span class="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">High-yield exam points and recurring conceptual questions.</span>
      </div>
      <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
        <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0">
          <svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <span class="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">Diagrams, illustrative examples, and chapter summaries.</span>
      </div>
    `;
  } else if (isPYQ) {
    topicsHtml = `
      <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
        <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0">
          <svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <span class="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">Multiple-choice and objective assessment questions.</span>
      </div>
      <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
        <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0">
          <svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <span class="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">Short-answer conceptual problems and core syllabus coverage.</span>
      </div>
      <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
        <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0">
          <svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <span class="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">Long-answer analytical and structured essay questions.</span>
      </div>
      <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
        <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0">
          <svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <span class="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">Direct insight into examination question formats and marking weightage.</span>
      </div>
    `;
  } else {
    topicsHtml = `
      <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
        <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0">
          <svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <span class="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">Comprehensive topic review and core definitions.</span>
      </div>
      <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
        <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0">
          <svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <span class="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">Practice questions and self-assessment exercises.</span>
      </div>
      <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
        <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0">
          <svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <span class="text-xs sm:text-body1 text-ink/90 font-medium break-words min-w-0 flex-1 leading-normal">Key takeaways for quick revision before tests.</span>
      </div>
    `;
  }

  // Study Guidance HTML construction
  let studyGuidanceHtml = '';
  if (Array.isArray(resource.study_guidance) && resource.study_guidance.length > 0) {
    studyGuidanceHtml = resource.study_guidance.map((stepItem, idx) => {
      const stepTitle = typeof stepItem === 'string' ? `Step ${idx + 1}` : (stepItem.title || `Step ${idx + 1}`);
      const stepDesc = typeof stepItem === 'string' ? stepItem : stepItem.description;
      return `
        <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
          <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0">
            <svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div class="space-y-0.5 min-w-0 flex-1">
            <h3 class="text-xs sm:text-body1 font-bold text-ink m-0 break-words">${escapeHtml(stepTitle)}</h3>
            <p class="text-xs sm:text-body1 text-ink/80 leading-relaxed m-0 break-words">${escapeHtml(stepDesc)}</p>
          </div>
        </div>
      `;
    }).join('');
  } else if (isPYQ) {
    studyGuidanceHtml = `
      <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
        <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0"><svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
        <div class="space-y-0.5 min-w-0 flex-1"><h3 class="text-xs sm:text-body1 font-bold text-ink m-0 break-words">Closed-Book Attempt</h3><p class="text-xs sm:text-body1 text-ink/80 leading-relaxed m-0 break-words">Attempt the paper without referring to notes or textbooks to test true recall.</p></div>
      </div>
      <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
        <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0"><svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
        <div class="space-y-0.5 min-w-0 flex-1"><h3 class="text-xs sm:text-body1 font-bold text-ink m-0 break-words">Timed Practice</h3><p class="text-xs sm:text-body1 text-ink/80 leading-relaxed m-0 break-words">Follow the prescribed time limit where available to improve speed and exam stamina.</p></div>
      </div>
      <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
        <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0"><svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
        <div class="space-y-0.5 min-w-0 flex-1"><h3 class="text-xs sm:text-body1 font-bold text-ink m-0 break-words">Self-Evaluation</h3><p class="text-xs sm:text-body1 text-ink/80 leading-relaxed m-0 break-words">Review incorrect or incomplete answers systematically to spot knowledge gaps.</p></div>
      </div>
      <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
        <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0"><svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
        <div class="space-y-0.5 min-w-0 flex-1"><h3 class="text-xs sm:text-body1 font-bold text-ink m-0 break-words">Identify Patterns</h3><p class="text-xs sm:text-body1 text-ink/80 leading-relaxed m-0 break-words">Identify recurring concepts and high-weightage question formats across multiple years.</p></div>
      </div>
      <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
        <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0"><svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
        <div class="space-y-0.5 min-w-0 flex-1"><h3 class="text-xs sm:text-body1 font-bold text-ink m-0 break-words">Targeted Revision</h3><p class="text-xs sm:text-body1 text-ink/80 leading-relaxed m-0 break-words">Revisit relevant chapter notes for topics where errors occurred during practice.</p></div>
      </div>
    `;
  } else {
    studyGuidanceHtml = `
      <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
        <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0"><svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
        <div class="space-y-0.5 min-w-0 flex-1"><h3 class="text-xs sm:text-body1 font-bold text-ink m-0 break-words">Initial Review</h3><p class="text-xs sm:text-body1 text-ink/80 leading-relaxed m-0 break-words">Read through the chapter overview to establish a clear conceptual framework before delving into details.</p></div>
      </div>
      <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
        <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0"><svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
        <div class="space-y-0.5 min-w-0 flex-1"><h3 class="text-xs sm:text-body1 font-bold text-ink m-0 break-words">Active Recall</h3><p class="text-xs sm:text-body1 text-ink/80 leading-relaxed m-0 break-words">Test yourself on key definitions and concepts without looking at the reference material.</p></div>
      </div>
      <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
        <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0"><svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
        <div class="space-y-0.5 min-w-0 flex-1"><h3 class="text-xs sm:text-body1 font-bold text-ink m-0 break-words">Practice Questions</h3><p class="text-xs sm:text-body1 text-ink/80 leading-relaxed m-0 break-words">Work through example problems and practice questions under timed conditions.</p></div>
      </div>
      <div class="neu-recessed p-1 sm:p-2 rounded-xl flex items-center gap-1 sm:gap-2 min-w-0">
        <div class="w-7 h-7 neu-raised-sm rounded-full flex items-center justify-center shrink-0"><svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
        <div class="space-y-0.5 min-w-0 flex-1"><h3 class="text-xs sm:text-body1 font-bold text-ink m-0 break-words">Interactive Note Viewing</h3><p class="text-xs sm:text-body1 text-ink/80 leading-relaxed m-0 break-words">Click <em>Open Full Notes</em> above to access Horizon's full interactive viewer with page tracking and layout tools.</p></div>
      </div>
    `;
  }

  // Overview paragraphs HTML construction
  let overviewHtml = '';
  if (resource.chapter_summary) {
    overviewHtml = resource.chapter_summary
      .split(/\n\n|\n/)
      .filter(Boolean)
      .map(para => `<p class="break-words m-0">${escapeHtml(para.trim())}</p>`)
      .join('');
  } else if (isPYQ) {
    overviewHtml = `
      <p class="break-words m-0">This previous-year question paper contains official questions for ${escapeHtml(resource.student_class || 'students')} ${escapeHtml(resource.subject || 'subject')} ${resource.year ? `(${escapeHtml(resource.year)})` : ''} based on the prescribed curriculum in ${resource.medium === 'hindi' ? 'Hindi' : 'English'} medium. It can be used to understand question patterns, practice written answers, and assess examination readiness.</p>
      <p class="break-words m-0">Solving past examination papers builds familiarity with question distribution, time allocation, and recurring exam concepts, serving as an effective diagnostic tool before major tests.</p>
    `;
  } else {
    overviewHtml = `
      <p class="break-words m-0">${isNotes ? `This study note covers <strong>${escapeHtml(resource.title)}</strong> for ${escapeHtml(resource.student_class || 'students')} studying ${escapeHtml(resource.subject || 'this subject')} in ${resource.medium === 'hindi' ? 'Hindi' : 'English'} medium. Prepared according to the prescribed curriculum, it synthesizes essential theoretical foundations, definitions, and key exam concepts to streamline student revision and improve subject mastery.` : `This educational resource for ${escapeHtml(resource.student_class || 'students')} ${escapeHtml(resource.subject || '')} offers structured learning material in ${resource.medium === 'hindi' ? 'Hindi' : 'English'} medium. Designed to support active learning and exam preparation for school assessments.`}</p>
      <p class="break-words m-0">Designed as a comprehensive revision companion, this resource presents complex academic topics with clarity and structured emphasis on key syllabus objectives, enabling students to perform active recall and retain core subject matter effectively.</p>
    `;
  }

  // Related Resources HTML
  let relatedResourcesHtml = '';
  if (relatedResources.length > 0) {
    const items = relatedResources.map(related => `
      <li class="min-w-0">
        <a href="/resource/${escapeHtml(related.id)}" class="block p-3 sm:p-3.5 font-bold neu-raised rounded-xl hover:neu-raised-hover no-underline text-ink text-xs sm:text-sm leading-snug group min-w-0">
          <span class="group-hover:text-[#E91E8C] transition-colors break-words block min-w-0">${escapeHtml(related.title)}</span>
          <span class="block text-caption text-ink/60 font-medium mt-1 truncate">${escapeHtml(related.student_class || '')} ${escapeHtml(related.subject || '')}</span>
        </a>
      </li>
    `).join('');
    relatedResourcesHtml = `<ul class="list-none p-0 m-0 space-y-2.5 sm:space-y-3 min-w-0">${items}</ul>`;
  } else {
    relatedResourcesHtml = `
      <div class="neu-recessed p-3.5 sm:p-4 rounded-xl text-center min-w-0">
        <p class="text-caption font-semibold text-ink/60 m-0 break-words">No related resources found in this category.</p>
      </div>
    `;
  }

  // Content HTML inside #root
  const appContentHtml = `
    <div class="w-[min(96vw,1600px)] mx-auto px-[clamp(16px,2vw,32px)] max-md:pt-[10px] md:-mt-[20px] pb-[clamp(24px,3vw,48px)] min-w-0">
      <div class="flex justify-between items-center mb-[clamp(12px,3vw,20px)] w-full min-w-0">
        <a href="${escapeHtml(backPath)}" class="w-11 h-11 neu-raised rounded-full neu-raised-hover flex items-center justify-center cursor-pointer shrink-0 no-underline text-ink" aria-label="Go Back">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </a>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-8 items-start w-full min-w-0">
        <main class="lg:col-span-2 space-y-5 sm:space-y-6 md:space-y-8 min-w-0 w-full">
          <article class="neu-card rounded-2xl px-4 py-3.5 sm:px-8 sm:py-6 md:px-10 md:py-7 space-y-3 sm:space-y-4 relative overflow-hidden min-w-0 w-full">
            <div class="flex flex-nowrap gap-1.5 sm:gap-2 items-center justify-start relative z-10 min-w-0 w-full overflow-x-auto no-scrollbar">
              ${resource.student_class ? `<span class="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-ink/80 bg-black/5 shrink-0">${escapeHtml(resource.student_class)}</span>` : ''}
              ${resource.subject ? `<span class="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-ink/80 bg-black/5 shrink-0">${escapeHtml(resource.subject)}</span>` : ''}
              ${resource.medium ? `<span class="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-ink/80 uppercase bg-black/5 shrink-0">${escapeHtml(resource.medium.toUpperCase())} MEDIUM</span>` : ''}
            </div>

            <header class="space-y-1.5 sm:space-y-2 relative z-10 min-w-0">
              <p class="text-[11px] sm:text-xs font-bold tracking-widest text-[#E91E8C] uppercase break-words">${escapeHtml(kickerText)}</p>
              <h1 class="text-xl sm:text-3xl md:text-4xl font-bold uppercase text-ink leading-snug sm:leading-tight text-left break-words min-w-0">${escapeHtml(resource.title)}</h1>
              ${showSubtitle ? `<p class="text-sm sm:text-body1 font-semibold text-ink/70 pt-0.5 sm:pt-1 break-words min-w-0">Chapter ${escapeHtml(String(resource.chapters.chapter_number))}: ${escapeHtml(resource.chapters.chapter_name)}</p>` : ''}
            </header>

            ${isNotes && resource.description ? `<p class="text-sm sm:text-body1 text-ink/80 leading-relaxed max-w-2xl pt-2 sm:pt-3 border-t border-ink/5 relative z-10 break-words min-w-0">${escapeHtml(resource.description)}</p>` : ''}
          </article>

          <section class="neu-card rounded-2xl p-4 sm:p-8 space-y-3.5 sm:space-y-4 relative overflow-hidden min-w-0 w-full">
            <div class="flex items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-ink/10 min-w-0">
              <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div class="w-11 h-11 neu-raised rounded-full flex items-center justify-center shrink-0">
                  <svg class="w-2 h-2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <span class="text-[10px] sm:text-xs font-bold tracking-widest text-[#E91E8C] uppercase block truncate">${isNotes ? 'FULL STUDY RESOURCE' : isPYQ ? 'EXAM PRACTICE PAPER' : 'FULL STUDY RESOURCE'}</span>
                  <h2 class="text-base sm:text-h2 font-bold text-ink uppercase m-0 leading-snug break-words min-w-0">${isNotes ? 'Open Complete Study Notes' : isPYQ ? 'Open Question Paper' : 'Access Full Document'}</h2>
                </div>
              </div>
            </div>

            <p class="text-xs sm:text-body1 text-ink/80 leading-relaxed break-words min-w-0">
              ${isNotes ? 'Access the complete interactive study note in Horizon\'s reader featuring full-page rendering, structured subtopics, and reading progress tracking.' : isPYQ ? 'Open the complete question paper in Horizon\'s dedicated reader for full-screen practice, zooming, and examination review.' : 'Open the full document in Horizon\'s reader for structured review, zooming, and comprehensive exam revision.'}
            </p>

            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1 sm:pt-2 min-w-0">
              <a href="/view/${escapeHtml(resource.id)}" class="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 font-bold text-xs sm:text-body1 text-white bg-gradient-to-r from-[#E91E8C] via-[#C2185B] to-[#8B0A50] rounded-xl shadow-md hover:opacity-95 transition-all no-underline text-center cursor-pointer group min-w-0">
                <span class="truncate">${isNotes ? 'Open Full Notes' : isPYQ ? 'Open Question Paper' : 'View Full Resource'}</span>
                <span class="transition-transform group-hover:translate-x-1 shrink-0">&rarr;</span>
              </a>
            </div>
          </section>

          <section class="neu-card rounded-2xl p-4 sm:p-8 md:p-10 space-y-3.5 sm:space-y-4 min-w-0 w-full">
            <div class="flex items-center gap-2.5 sm:gap-3 pb-2.5 sm:pb-3 border-b border-ink/10 min-w-0">
              <div class="w-2 sm:w-2.5 h-5 sm:h-6 bg-gradient-to-b from-[#E91E8C] to-[#8B0A50] rounded-full shrink-0"></div>
              <h2 class="text-base sm:text-h2 font-bold uppercase text-ink m-0 break-words min-w-0 flex-1 leading-snug">${isPYQ ? 'Paper Overview' : 'Chapter &amp; Resource Overview'}</h2>
            </div>
            <div class="space-y-3 sm:space-y-4 text-xs sm:text-body1 leading-relaxed text-ink/90 min-w-0">${overviewHtml}</div>
          </section>

          <section class="neu-card rounded-2xl p-4 sm:p-8 md:p-10 space-y-4 sm:space-y-5 min-w-0 w-full">
            <div class="flex items-center gap-2.5 sm:gap-3 pb-2.5 sm:pb-3 border-b border-ink/10 min-w-0">
              <div class="w-2 sm:w-2.5 h-5 sm:h-6 bg-gradient-to-b from-[#E91E8C] to-[#8B0A50] rounded-full shrink-0"></div>
              <h2 class="text-base sm:text-h2 font-bold uppercase text-ink m-0 break-words min-w-0 flex-1 leading-snug">${isPYQ ? 'Subject Areas &amp; Question Coverage' : 'Topics Covered &amp; Key Concepts'}</h2>
            </div>
            <p class="text-xs sm:text-body1 text-ink/80 break-words m-0">${isPYQ ? 'Subject areas and question types represented in this question paper include:' : 'Key syllabus areas addressed in this educational resource include:'}</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 min-w-0">${topicsHtml}</div>
          </section>

          <section class="neu-card rounded-2xl p-4 sm:p-8 md:p-10 space-y-4 sm:space-y-5 min-w-0 w-full">
            <div class="flex items-center gap-2.5 sm:gap-3 pb-2.5 sm:pb-3 border-b border-ink/10 min-w-0">
              <div class="w-2 sm:w-2.5 h-5 sm:h-6 bg-gradient-to-b from-[#E91E8C] to-[#8B0A50] rounded-full shrink-0"></div>
              <h2 class="text-base sm:text-h2 font-bold uppercase text-ink m-0 break-words min-w-0 flex-1 leading-snug">${isPYQ ? 'How to Use This Paper' : 'Study Guidance &amp; Preparation Tips'}</h2>
            </div>
            <div class="space-y-3 sm:space-y-4 min-w-0">${studyGuidanceHtml}</div>
          </section>
        </main>

        <aside class="space-y-5 sm:space-y-6 md:space-y-8 min-w-0 w-full">
          <section class="neu-card rounded-2xl p-4 sm:p-6 space-y-3.5 sm:space-y-4 min-w-0 w-full">
            <h2 class="text-base sm:text-h2 uppercase text-ink pb-2 border-b border-ink/10 break-words">Resource Details</h2>
            <dl class="space-y-2 text-xs sm:text-body1 m-0 min-w-0">
              ${resource.student_class ? `
                <div class="flex flex-row items-center justify-between gap-2 py-1.5 border-b border-ink/5 min-w-0">
                  <dt class="text-ink/70 font-semibold text-caption flex items-center gap-1.5 shrink-0">
                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E91E8C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path></svg>
                    Class:
                  </dt>
                  <dd class="m-0 font-bold text-ink text-right break-words text-caption min-w-0">${escapeHtml(resource.student_class)}</dd>
                </div>
              ` : ''}

              ${resource.subject ? `
                <div class="flex flex-row items-center justify-between gap-2 py-1.5 border-b border-ink/5 min-w-0">
                  <dt class="text-ink/70 font-semibold text-caption flex items-center gap-1.5 shrink-0">
                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E91E8C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                    Subject:
                  </dt>
                  <dd class="m-0 font-bold text-ink text-right break-words text-caption min-w-0">${escapeHtml(resource.subject)}</dd>
                </div>
              ` : ''}

              ${resource.medium ? `
                <div class="flex flex-row items-center justify-between gap-2 py-1.5 border-b border-ink/5 min-w-0">
                  <dt class="text-ink/70 font-semibold text-caption flex items-center gap-1.5 shrink-0">
                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E91E8C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path></svg>
                    Medium:
                  </dt>
                  <dd class="m-0 font-bold text-ink capitalize text-right break-words text-caption min-w-0">${escapeHtml(resource.medium)}</dd>
                </div>
              ` : ''}

              ${isNotes && resource.chapters ? `
                <div class="flex flex-row items-center justify-between gap-2 py-1.5 border-b border-ink/5 min-w-0">
                  <dt class="text-ink/70 font-semibold text-caption flex items-center gap-1.5 shrink-0">
                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E91E8C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                    Chapter:
                  </dt>
                  <dd class="m-0 font-bold text-ink text-right break-words text-caption min-w-0">Chapter ${escapeHtml(String(resource.chapters.chapter_number))}</dd>
                </div>
              ` : ''}

              <div class="flex flex-row items-center justify-between gap-2 py-1.5 border-b border-ink/5 min-w-0">
                <dt class="text-ink/70 font-semibold text-caption flex items-center gap-1.5 shrink-0">
                  <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E91E8C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h10M7 11h10M7 15h10M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"></path></svg>
                  Type:
                </dt>
                <dd class="m-0 font-bold text-ink capitalize text-right break-words text-caption min-w-0">${isPYQ ? 'Previous Year Paper' : escapeHtml(resource.resource_type.replace('_', ' '))}</dd>
              </div>

              ${resource.year ? `
                <div class="flex flex-row items-center justify-between gap-2 py-1.5 border-b border-ink/5 min-w-0">
                  <dt class="text-ink/70 font-semibold text-caption flex items-center gap-1.5 shrink-0">
                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E91E8C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    ${isPYQ ? 'Exam Year:' : 'Academic Year:'}
                  </dt>
                  <dd class="m-0 font-bold text-ink text-right break-words text-caption min-w-0">${escapeHtml(resource.year)}</dd>
                </div>
              ` : ''}

              ${resource.total_pages ? `
                <div class="flex flex-row items-center justify-between gap-2 py-1.5 border-b border-ink/5 min-w-0">
                  <dt class="text-ink/70 font-semibold text-caption flex items-center gap-1.5 shrink-0">
                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E91E8C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    Total Pages:
                  </dt>
                  <dd class="m-0 font-bold text-ink text-right break-words text-caption min-w-0">${escapeHtml(String(resource.total_pages))}</dd>
                </div>
              ` : ''}

              ${isPYQ && resource.total_marks ? `
                <div class="flex flex-row items-center justify-between gap-2 py-1.5 border-b border-ink/5 min-w-0">
                  <dt class="text-ink/70 font-semibold text-caption flex items-center gap-1.5 shrink-0">
                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E91E8C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Total Marks:
                  </dt>
                  <dd class="m-0 font-bold text-ink text-right break-words text-caption min-w-0">${escapeHtml(String(resource.total_marks))}</dd>
                </div>
              ` : ''}

              ${isPYQ && resource.duration ? `
                <div class="flex flex-row items-center justify-between gap-2 py-1.5 border-b border-ink/5 min-w-0">
                  <dt class="text-ink/70 font-semibold text-caption flex items-center gap-1.5 shrink-0">
                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E91E8C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Duration:
                  </dt>
                  <dd class="m-0 font-bold text-ink text-right break-words text-caption min-w-0">${escapeHtml(resource.duration)}</dd>
                </div>
              ` : ''}

              <div class="flex flex-row items-center justify-between gap-2 py-1.5 min-w-0">
                <dt class="text-ink/70 font-semibold text-caption flex items-center gap-1.5 shrink-0">
                  <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E91E8C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  Added On:
                </dt>
                <dd class="m-0 font-bold text-ink text-right break-words text-caption min-w-0">${escapeHtml(new Date(resource.uploadDate).toLocaleDateString('en-US'))}</dd>
              </div>
            </dl>
          </section>

          <section class="neu-card rounded-2xl p-4 sm:p-6 text-center space-y-2.5 sm:space-y-3 bg-gradient-to-br from-[#E91E8C]/10 via-[#C2185B]/5 to-transparent border border-[#E91E8C]/20 relative overflow-hidden min-w-0 w-full">
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#E91E8C] via-[#C2185B] to-[#8B0A50] text-white flex items-center justify-center mx-auto shadow-md shrink-0">
              <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            </div>
            <h2 class="text-base sm:text-h2 uppercase text-ink m-0 break-words">${isPYQ ? 'Ready to Practice?' : 'Ready to Study?'}</h2>
            <p class="text-caption text-ink/80 max-w-xs mx-auto break-words">${isPYQ ? 'Open the question paper in Horizon\'s dedicated reader to start practicing now.' : 'Open the full notes in Horizon\'s dedicated reader to start studying now.'}</p>
            <a href="/view/${escapeHtml(resource.id)}" class="inline-flex items-center justify-center gap-2 w-full py-2.5 sm:py-3 font-bold neu-raised rounded-xl hover:neu-raised-hover no-underline text-ink text-center text-xs sm:text-sm border-2 border-[#E91E8C]/20 group min-w-0">
              <span class="truncate">${isNotes ? 'Open Full Notes' : isPYQ ? 'Open Question Paper' : 'View Full Resource'}</span>
              <span class="text-[#E91E8C] transition-transform group-hover:translate-x-1 shrink-0">&rarr;</span>
            </a>
          </section>

          <section class="neu-card rounded-2xl p-4 sm:p-6 space-y-3.5 sm:space-y-4 min-w-0 w-full">
            <h2 class="text-base sm:text-h2 uppercase text-ink pb-2 border-b border-ink/10 break-words">${isPYQ ? 'Related Practice Resources' : 'Related Resources'}</h2>
            ${relatedResourcesHtml}
          </section>
        </aside>
      </div>
    </div>
  `;

  // Inject meta tags, title, json-ld, and app HTML into template HTML
  let outputHtml = templateHtml;

  // Replace <title>
  outputHtml = outputHtml.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);

  // Head insertions
  const headAdditions = `
    <meta name="description" content="${escapeHtml(descriptionText)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
    </script>
  `;

  outputHtml = outputHtml.replace('</head>', `${headAdditions}\n  </head>`);

  // Inject into <div id="root">
  outputHtml = outputHtml.replace('<div id="root"></div>', `<div id="root">${appContentHtml}</div>`);

  // Security check: verify no private fields or storage bucket paths leak
  assertSecurityCompliance(outputHtml, resource);

  return outputHtml;
}

export function assertSecurityCompliance(htmlContent, resourceRaw) {
  const forbiddenPatterns = [
    /storage\/v1\/object/i,
    /\.pdf\?/i,
    /token=/i,
    /signedUrl/i,
  ];

  if (resourceRaw.file_path && resourceRaw.file_path.length > 5) {
    if (htmlContent.includes(resourceRaw.file_path)) {
      throw new Error(`SECURITY VIOLATION: Pre-rendered HTML contains file_path "${resourceRaw.file_path}"`);
    }
  }

  if (resourceRaw.storage_bucket && resourceRaw.storage_bucket.length > 2) {
    if (htmlContent.includes(resourceRaw.storage_bucket)) {
      throw new Error(`SECURITY VIOLATION: Pre-rendered HTML contains storage_bucket "${resourceRaw.storage_bucket}"`);
    }
  }

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(htmlContent)) {
      throw new Error(`SECURITY VIOLATION: Pre-rendered HTML contains forbidden string matching pattern ${pattern}`);
    }
  }
}

export async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.');
    process.exit(1);
  }

  const distDir = path.resolve(__dirname, '../dist');
  const templatePath = path.join(distDir, 'index.html');

  if (!fs.existsSync(templatePath)) {
    console.error(`Error: Production template ${templatePath} does not exist. Ensure vite build has run.`);
    process.exit(1);
  }

  const templateHtml = fs.readFileSync(templatePath, 'utf-8');

  console.log('Connecting to Supabase to fetch learning resources...');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const selectQuery = 'id, title, description, resource_type, medium, created_at, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path, chapter_summary, topics, key_concepts, important_terms, learning_objectives, exam_relevant_themes, study_guidance, is_active, chapters(id, chapter_number, chapter_name, chapter_summary, topics, key_concepts, important_terms, learning_objectives, exam_relevant_themes, study_guidance)';

  const { data: initialData, error: initialError } = await supabase
    .from('learning_resources')
    .select(selectQuery);

  let rawRows = initialData;
  let error = initialError;

  if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('column'))) {
    console.warn('Fallback query triggered for pre-rendering due to missing database columns...');
    const legacySelect = 'id, title, resource_type, medium, created_at, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path, is_active, chapters(id, chapter_number, chapter_name)';
    const legacyResult = await supabase
      .from('learning_resources')
      .select(legacySelect);

    rawRows = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    console.error('Error fetching learning resources from Supabase for pre-rendering:', error.message);
    process.exit(1);
  }

  if (!rawRows || rawRows.length === 0) {
    console.error('Error: Zero learning resources returned from database query.');
    process.exit(1);
  }

  const activeRows = rawRows.filter(r => r.is_active !== false);

  if (activeRows.length === 0) {
    console.error('Error: Zero active learning resources found to pre-render.');
    process.exit(1);
  }

  console.log(`Mapping ${activeRows.length} active resources for pre-rendering...`);

  const mappedResources = activeRows.map(row => ({
    mapped: mapLearningResource(row),
    raw: row,
  }));

  let generatedCount = 0;

  for (const { mapped, raw } of mappedResources) {
    // Find up to 3 related resources matching class/subject/resource_type
    const related = mappedResources
      .filter(item => item.mapped.id !== mapped.id && (
        item.mapped.resource_type === mapped.resource_type ||
        item.mapped.student_class === mapped.student_class ||
        item.mapped.subject === mapped.subject
      ))
      .slice(0, 3)
      .map(item => item.mapped);

    const pageHtml = generateResourceHtml(mapped, templateHtml, related);

    const resourceOutputDir = path.join(distDir, 'resource', String(mapped.id));
    fs.mkdirSync(resourceOutputDir, { recursive: true });

    const resourceOutputFile = path.join(resourceOutputDir, 'index.html');
    fs.writeFileSync(resourceOutputFile, pageHtml, 'utf-8');
    generatedCount++;
  }

  console.log(`Pre-rendering complete! Successfully generated ${generatedCount} static resource pages in dist/resource/<id>/index.html.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('Build failure during pre-rendering:', err);
    process.exit(1);
  });
}
