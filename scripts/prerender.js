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

  let title = item.title ?? '';
  if (item.resource_type === 'notes') {
    const rawTitle = item.title ? String(item.title).trim() : '';
    const chapterObj = item.chapters || null;
    const chapterNum = chapterObj?.chapter_number;

    if (rawTitle) {
      if (/^chapter\s+[^:]+:/i.test(rawTitle)) {
        title = item.title ?? '';
      } else if (chapterNum !== undefined && chapterNum !== null) {
        title = `Chapter ${chapterNum}: ${item.title}`;
      } else {
        title = item.title ?? '';
      }
    } else if (chapterObj && chapterNum !== undefined && chapterNum !== null) {
      title = `Chapter ${chapterNum}: ${chapterObj.chapter_name}`;
    }
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

  const chapterName = resource.chapters?.chapter_name;
  const chapterNum = resource.chapters?.chapter_number;
  const titleLower = resource.title.toLowerCase();
  const chapterNameLower = chapterName?.toLowerCase() || '';

  const titleAlreadyHasChapterNum = chapterNum !== undefined && chapterNum !== null && (
    titleLower.startsWith(`chapter ${chapterNum}:`) ||
    titleLower.startsWith(`chapter ${chapterNum}`)
  );
  const titleAlreadyHasChapterName = chapterNameLower ? titleLower.includes(chapterNameLower) : false;
  const isLanguageMismatch = resource.medium === 'english' && Boolean(chapterName && /[\u0900-\u097F]/.test(chapterName));

  const showSubtitle = Boolean(
    isNotes &&
    chapterName &&
    !titleAlreadyHasChapterName &&
    !titleAlreadyHasChapterNum &&
    !isLanguageMismatch
  );

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

export function wrapInMainLayout(contentHtml) {
  const currentYear = new Date().getFullYear();
  return `
    <div class="flex flex-col min-h-screen bg-[var(--bg-base)] font-body text-ink w-full max-w-full overflow-x-clip">
      <main class="flex-1 flex flex-col w-full max-w-full max-md:px-0 max-md:py-0 md:p-8 min-w-0">
        ${contentHtml}
      </main>
      <footer class="p-3 sm:p-4 text-center text-muted-foreground neu-recessed mt-auto text-xs sm:text-sm overflow-hidden w-full max-w-full">
        <p class="m-0 break-words max-w-full">&copy; ${currentYear} Horizon Educational Platform. All rights reserved.</p>
      </footer>
    </div>
  `;
}

export const PUBLIC_STATIC_PAGES = [
  {
    path: '/',
    title: 'Horizon - Free Educational Resources for Every Learner',
    description: 'Study notes, past papers, and practice materials — everything for class 8th to 12th, in one place. Free learning platform on Horizon.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': 'Horizon',
      'url': BASE_URL,
      'description': 'Resources for every learner. Study notes, past papers, and practice materials for class 8th to 12th.',
    },
    isHome: true,
    contentHtml: `
      <div class="min-h-screen w-full flex flex-col bg-[var(--bg-base)]">
        <header>
          <div class="flex justify-between items-center p-4">
            <a href="/" class="neu-raised flex items-center gap-2 p-2 rounded-xl no-underline text-ink">
              <img src="/assets/favicon/logo.avif" alt="Horizon Logo" class="w-8 h-8 rounded-full" />
              <span class="font-bold text-lg">Horizon</span>
            </a>
            <nav class="flex items-center gap-4" aria-label="Main navigation">
              <a href="/library" class="no-underline text-ink font-medium">Library</a>
              <a href="/notes" class="no-underline text-ink font-medium">Study Notes</a>
              <a href="/about" class="no-underline text-ink font-medium">About</a>
              <a href="/contact" class="no-underline text-ink font-medium">Contact</a>
            </nav>
            <a href="/register" class="neu-raised neu-raised-hover px-4 py-2 rounded-xl font-bold no-underline text-ink">Get Started</a>
          </div>
        </header>
        <main class="flex-1 w-full flex flex-col">
          <section class="text-center py-12 px-4 max-w-4xl mx-auto space-y-6">
            <a href="/" class="neu-raised inline-flex items-center gap-2 px-4 py-1.5 rounded-full no-underline text-ink font-bold">
              <img src="/assets/favicon/logo.avif" alt="Horizon Logo" class="w-5 h-5 rounded-full" />
              <span>Horizon</span>
            </a>
            <h1 class="text-3xl sm:text-5xl font-extrabold text-ink leading-tight">
              Resources for <em>every</em> learner.
            </h1>
            <p class="text-lg sm:text-xl text-ink/80 max-w-2xl mx-auto">
              Study notes, past papers, and practice materials — everything for class 8th to 12th, in one place.
            </p>
          </section>
          <section class="py-12 px-4 max-w-6xl mx-auto w-full">
            <div class="text-center mb-8">
              <h2 class="text-2xl sm:text-3xl font-bold text-ink">Everything in <span class="text-gradient">one</span> place</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div class="neu-card p-6 rounded-2xl relative">
                <a href="/library" class="absolute inset-0 z-20" aria-label="Go to Revision Sheets"></a>
                <h3 class="text-xl font-bold text-ink mb-2">Revision Sheets</h3>
                <p class="text-ink/80">Concise summary sheets for quick pre-exam revision.</p>
              </div>
              <div class="neu-card p-6 rounded-2xl relative">
                <a href="/library" class="absolute inset-0 z-20" aria-label="Go to Previous-Year Papers"></a>
                <h3 class="text-xl font-bold text-ink mb-2">Previous-Year Papers</h3>
                <p class="text-ink/80">Solve official past exam papers to understand question patterns.</p>
              </div>
              <div class="neu-card p-6 rounded-2xl relative">
                <a href="/notes" class="absolute inset-0 z-20" aria-label="Go to Chapter Notes"></a>
                <h3 class="text-xl font-bold text-ink mb-2">Chapter Notes</h3>
                <p class="text-ink/80">Structured study notes with definitions, key concepts, and diagrams.</p>
              </div>
              <div class="neu-card p-6 rounded-2xl relative">
                <a href="/library" class="absolute inset-0 z-20" aria-label="Go to Practice Questions"></a>
                <h3 class="text-xl font-bold text-ink mb-2">Practice Questions</h3>
                <p class="text-ink/80">Topic-wise problem sets to test your understanding.</p>
              </div>
              <div class="neu-card p-6 rounded-2xl relative">
                <a href="/library" class="absolute inset-0 z-20" aria-label="Go to Question Bank"></a>
                <h3 class="text-xl font-bold text-ink mb-2">Question Bank</h3>
                <p class="text-ink/80">Curated collections of essential exam questions.</p>
              </div>
              <div class="neu-card p-6 rounded-2xl relative">
                <a href="/notes" class="absolute inset-0 z-20" aria-label="Go to Study Guides"></a>
                <h3 class="text-xl font-bold text-ink mb-2">Study Guides</h3>
                <p class="text-ink/80">Step-by-step guidance on tackling complex topics.</p>
              </div>
            </div>
          </section>
          <section class="py-12 px-4 max-w-xl mx-auto text-center">
            <h2 class="text-2xl font-bold text-ink mb-2">New here?</h2>
            <p class="text-ink/80 mb-4">Subscribe to get the latest announcements and updates.</p>
            <form class="space-y-3">
              <input type="text" placeholder="Your name" required class="w-full p-3 neu-recessed rounded-xl" />
              <input type="email" placeholder="Your email" required class="w-full p-3 neu-recessed rounded-xl" />
              <input type="password" placeholder="Password" required class="w-full p-3 neu-recessed rounded-xl" />
              <button type="submit" class="w-full p-3 neu-raised neu-raised-hover rounded-xl font-bold text-ink">Subscribe</button>
            </form>
          </section>
        </main>
        <footer class="py-8 px-4 border-t border-ink/10">
          <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <img src="/assets/favicon/logo.avif" alt="Horizon Logo" class="w-6 h-6 rounded-full" />
                <h3 class="font-bold text-lg text-ink">Horizon</h3>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <h4 class="font-bold text-ink mb-2">Explore</h4>
                <nav aria-label="Explore navigation" class="flex flex-col space-y-1">
                  <a href="/library" class="text-ink/80 no-underline">Library</a>
                  <a href="/notes" class="text-ink/80 no-underline">Study Notes</a>
                </nav>
              </div>
              <div>
                <h4 class="font-bold text-ink mb-2">Info</h4>
                <nav aria-label="Footer navigation" class="flex flex-col space-y-1">
                  <a href="/about" class="text-ink/80 no-underline">About Us</a>
                  <a href="/contact" class="text-ink/80 no-underline">Contact</a>
                  <a href="/terms" class="text-ink/80 no-underline">Terms of Service</a>
                  <a href="/privacy-policy" class="text-ink/80 no-underline">Privacy Policy</a>
                  <a href="/attribution" class="text-ink/80 no-underline">Attribution</a>
                </nav>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <a href="https://www.instagram.com/unfollowaman_" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><img src="/assets/Social Links/instagram.png" alt="Instagram" class="w-6 h-6" /></a>
              <a href="https://x.com/unfollowaman" target="_blank" rel="noopener noreferrer" aria-label="X (formerly Twitter)"><img src="/assets/Social Links/twitter-x.png" alt="X (formerly Twitter)" class="w-6 h-6" /></a>
              <a href="mailto:tryhorizon18@gmail.com" aria-label="Gmail"><img src="/assets/Social Links/gmail.png" alt="Gmail" class="w-6 h-6" /></a>
              <a href="https://github.com/unfollowaman" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><img src="/assets/Social Links/github.png" alt="GitHub" class="w-6 h-6" /></a>
              <a href="https://substack.com/@unfollowaman" target="_blank" rel="noopener noreferrer" aria-label="Substack"><img src="/assets/Social Links/substack.png" alt="Substack" class="w-6 h-6" /></a>
            </div>
          </div>
        </footer>
      </div>
    `,
  },
  {
    path: '/about',
    title: 'About Us | Horizon - Free Learning Platform',
    description: 'Learn more about Horizon, a free online library offering study material, student notes, and previous year papers to simplify your educational experience.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': 'Horizon',
      'url': BASE_URL,
      'description': 'Horizon is a free learning platform dedicated to providing students with high-quality educational resources, including study notes and past papers.',
      'foundingDate': '2024',
    },
    contentHtml: wrapInMainLayout(`
      <div class="space-y-6 max-w-4xl mx-auto w-full">
        <header class="neu-raised p-6 sm:p-8 rounded-2xl">
          <h1 class="text-2xl sm:text-4xl font-bold text-ink mb-2">About <span class="text-gradient">Horizon</span></h1>
          <p class="text-ink/80 text-base sm:text-lg">Empowering students through accessible, high-quality learning resources.</p>
        </header>
        <section class="space-y-6">
          <div class="neu-raised p-6 rounded-2xl">
            <h3 class="text-xl font-bold text-ink mb-3">Our Mission</h3>
            <p class="text-ink/90 leading-relaxed">Welcome to Horizon! We believe that finding reliable study material shouldn't be the hardest part of your education. Our mission is simple: to make quality educational resources easily accessible to every student. By reducing the time and effort you spend searching for dependable student notes, we help you focus on what really matters—learning and growing. We want to keep your educational experience simple, organized, and entirely distraction-free.</p>
          </div>
          <div class="neu-raised p-6 rounded-2xl">
            <h3 class="text-xl font-bold text-ink mb-3">An Evolving Online Library</h3>
            <p class="text-ink/90 leading-relaxed">Horizon isn't just a static website; it's a growing free learning platform. We are continuously expanding our collection to include more learning materials, detailed student notes, previous year papers, and specialized educational resources. As you progress in your academic journey, you can count on Horizon to grow alongside you, always bringing fresh and relevant content to your fingertips. Check out our <a href="/library" class="text-[#E91E8C] font-semibold underline">Library</a> to see our current offerings.</p>
          </div>
          <div class="neu-raised p-6 rounded-2xl">
            <h3 class="text-xl font-bold text-ink mb-3">Our Principles</h3>
            <ul class="list-disc list-inside space-y-2 text-ink/90">
              <li><strong>Quality over quantity:</strong> We carefully select materials that offer real value.</li>
              <li><strong>Carefully organized content:</strong> So you can find what you need without the hassle.</li>
              <li><strong>Simple user experience:</strong> A clean, intuitive design that gets out of your way.</li>
              <li><strong>Fast performance:</strong> Less waiting, more studying.</li>
              <li><strong>Mobile-friendly &amp; Accessible:</strong> Learn comfortably from any device, anywhere.</li>
            </ul>
          </div>
          <div class="neu-raised p-6 rounded-2xl">
            <h3 class="text-xl font-bold text-ink mb-3">Transparency &amp; Quality</h3>
            <p class="text-ink/90 leading-relaxed">Trust is the foundation of any good educational platform. Our study material is meticulously selected and reviewed to ensure accuracy and relevance. We understand that educational standards and syllabi change, which is why our content is regularly updated to reflect the latest requirements. If you ever spot a mistake or come across outdated material, we strongly encourage you to let us know. You can reach out through our <a href="/contact" class="text-[#E91E8C] font-semibold underline">Contact</a> page or check back regularly for updates.</p>
          </div>
          <div class="neu-raised p-6 rounded-2xl">
            <h3 class="text-xl font-bold text-ink mb-3">Privacy &amp; Trust</h3>
            <p class="text-ink/90 leading-relaxed">We respect your privacy as much as we value your education. Horizon uses secure authentication methods to protect your account. We firmly believe in collecting only what is absolutely necessary to improve your learning experience—no unnecessary data harvesting, and no compromising your personal information. Your peace of mind is paramount to us.</p>
          </div>
          <div class="neu-raised p-6 rounded-2xl">
            <h3 class="text-xl font-bold text-ink mb-3">Looking Forward</h3>
            <p class="text-ink/90 leading-relaxed">Our vision for Horizon extends far beyond today. We aim to establish a long-term educational platform that stands as a reliable pillar of support for generations of students. By continuing to listen to our community and adapting to their needs, we will ensure that Horizon remains your trusted partner in learning.</p>
          </div>
        </section>
      </div>
    `),
  },
  {
    path: '/contact',
    title: 'Contact Us | Horizon - Free Student Library',
    description: 'Get in touch with Horizon. We welcome student feedback, support requests, issue reports, and suggestions for expanding our study library.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': 'Horizon',
      'url': BASE_URL,
      'contactPoint': {
        '@type': 'ContactPoint',
        'contactType': 'customer support',
      },
    },
    contentHtml: wrapInMainLayout(`
      <div class="space-y-6 max-w-4xl mx-auto w-full">
        <header class="neu-raised p-6 sm:p-8 rounded-2xl">
          <h1 class="text-2xl sm:text-4xl font-bold text-ink mb-2">Contact <span class="text-gradient">Horizon</span></h1>
          <p class="text-ink/80 text-base sm:text-lg">Have questions, feedback, or need support? We are dedicated to providing students with an accessible, distraction-free educational experience.</p>
        </header>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section class="neu-raised p-6 rounded-2xl space-y-4">
            <h2 class="text-xl font-bold text-ink">How Can We Help?</h2>
            <p class="text-ink/90 leading-relaxed">Horizon is a free online student library providing study notes, previous year papers, and educational resources. We value community input to keep our platform accurate and relevant.</p>
            <ul class="list-disc list-inside space-y-2 text-ink/90">
              <li><strong>Support &amp; Guidance:</strong> Assistance with navigating study materials or using platform features.</li>
              <li><strong>Content Feedback:</strong> Reporting typos, errors, or outdated material in study notes and past papers.</li>
              <li><strong>Resource Requests:</strong> Recommending new subjects, classes, or papers to add to our library.</li>
              <li><strong>Technical Issues:</strong> Reporting website bugs or accessibility concerns.</li>
            </ul>
          </section>
          <section class="neu-raised p-6 rounded-2xl space-y-4">
            <h2 class="text-xl font-bold text-ink">Connect &amp; Support</h2>
            <p class="text-ink/90 leading-relaxed">Reach out directly or connect with us on social media for updates, feedback, and support:</p>
            <div class="grid grid-cols-1 gap-3">
              <a href="mailto:tryhorizon18@gmail.com" class="neu-raised neu-raised-hover p-3 rounded-xl flex items-center gap-3 no-underline text-ink">
                <img src="/assets/Social Links/gmail.png" alt="Gmail" class="w-6 h-6 shrink-0" />
                <div class="flex-1 min-w-0">
                  <span class="font-bold block">Gmail</span>
                  <span class="text-xs text-ink/70 block truncate">tryhorizon18@gmail.com</span>
                </div>
              </a>
              <a href="https://x.com/unfollowaman" target="_blank" rel="noopener noreferrer" class="neu-raised neu-raised-hover p-3 rounded-xl flex items-center gap-3 no-underline text-ink">
                <img src="/assets/Social Links/twitter-x.png" alt="X" class="w-6 h-6 shrink-0" />
                <div class="flex-1 min-w-0">
                  <span class="font-bold block">X</span>
                  <span class="text-xs text-ink/70 block truncate">@unfollowaman</span>
                </div>
              </a>
              <a href="https://github.com/unfollowaman" target="_blank" rel="noopener noreferrer" class="neu-raised neu-raised-hover p-3 rounded-xl flex items-center gap-3 no-underline text-ink">
                <img src="/assets/Social Links/github.png" alt="GitHub" class="w-6 h-6 shrink-0" />
                <div class="flex-1 min-w-0">
                  <span class="font-bold block">GitHub</span>
                  <span class="text-xs text-ink/70 block truncate">@unfollowaman</span>
                </div>
              </a>
              <a href="https://www.instagram.com/unfollowaman_" target="_blank" rel="noopener noreferrer" class="neu-raised neu-raised-hover p-3 rounded-xl flex items-center gap-3 no-underline text-ink">
                <img src="/assets/Social Links/instagram.png" alt="Instagram" class="w-6 h-6 shrink-0" />
                <div class="flex-1 min-w-0">
                  <span class="font-bold block">Instagram</span>
                  <span class="text-xs text-ink/70 block truncate">@unfollowaman_</span>
                </div>
              </a>
              <a href="https://substack.com/@unfollowaman" target="_blank" rel="noopener noreferrer" class="neu-raised neu-raised-hover p-3 rounded-xl flex items-center gap-3 no-underline text-ink">
                <img src="/assets/Social Links/substack.png" alt="Substack" class="w-6 h-6 shrink-0" />
                <div class="flex-1 min-w-0">
                  <span class="font-bold block">Substack</span>
                  <span class="text-xs text-ink/70 block truncate">@unfollowaman</span>
                </div>
              </a>
            </div>
            <p class="text-ink/90 leading-relaxed text-sm pt-2">Before reaching out, you may also find quick answers regarding data privacy and platform operations on our <a href="/privacy-policy" class="text-[#E91E8C] font-semibold underline">Privacy Policy</a> page or learn more about our mission on the <a href="/about" class="text-[#E91E8C] font-semibold underline">About Us</a> page.</p>
          </section>
        </div>
      </div>
    `),
  },
  {
    path: '/terms',
    title: 'Terms of Service | Horizon - Free Student Library',
    description: 'Terms of Service for Horizon, an open educational platform. Read about accepted terms, educational resource usage, and platform guidelines.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'Terms of Service',
      'url': `${BASE_URL}/terms`,
    },
    contentHtml: wrapInMainLayout(`
      <div class="space-y-6 max-w-4xl mx-auto w-full">
        <header class="neu-raised p-6 sm:p-8 rounded-2xl">
          <h1 class="text-2xl sm:text-4xl font-bold text-ink mb-2">Terms of <span class="text-gradient">Service</span></h1>
          <p class="text-ink/70 text-sm font-semibold">Last Updated: May 15, 2024</p>
        </header>
        <div class="neu-card p-6 sm:p-8 rounded-2xl space-y-6">
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">1. Acceptance of Terms</h2>
            <p class="text-ink/90 leading-relaxed">Welcome to Horizon. By accessing, browsing, or creating an account on Horizon, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use our platform.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">2. Description of Horizon</h2>
            <p class="text-ink/90 leading-relaxed">Horizon is a free student library and open educational platform created to provide accessible study materials, curated student notes, and previous year examination papers to support learning and academic preparation.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">3. Educational Content and Usage</h2>
            <p class="text-ink/90 leading-relaxed">All study material, notes, past papers, and resources hosted on Horizon are provided exclusively for personal, educational, and non-commercial use.</p>
            <ul class="list-disc list-inside space-y-1 text-ink/90">
              <li><strong>Personal Study:</strong> You may view and study materials on the platform for your own educational improvement.</li>
              <li><strong>Non-Commercial Purpose:</strong> Content from Horizon may not be resold, redistributed for profit, or packaged into commercial study offerings without permission.</li>
              <li><strong>Accuracy &amp; Updates:</strong> While we aim to provide accurate and updated educational content, resources are provided for supplemental study purposes.</li>
            </ul>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">4. User Accounts &amp; Responsibilities</h2>
            <p class="text-ink/90 leading-relaxed">Certain features, such as tracking study progress or customizing study preferences, require an account. When creating an account, you agree to:</p>
            <ul class="list-disc list-inside space-y-1 text-ink/90">
              <li>Provide accurate account information during registration.</li>
              <li>Maintain the confidentiality of your account credentials.</li>
              <li>Promptly notify us if you suspect unauthorized access to your account.</li>
            </ul>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">5. Intellectual Property &amp; Copyright</h2>
            <p class="text-ink/90 leading-relaxed">The Horizon logo, website design, branding, custom UI components, and software code are the intellectual property of Horizon. Educational resources, past papers, and study material hosted on the platform remain the property of their respective original copyright holders or contributors. If you believe any content infringes your copyright, please reach out through our <a href="/contact" class="text-[#E91E8C] font-semibold underline">Contact</a> page.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">6. Prohibited &amp; Abusive Use</h2>
            <p class="text-ink/90 leading-relaxed">To maintain a safe and reliable learning environment for all users, you agree not to:</p>
            <ul class="list-disc list-inside space-y-1 text-ink/90">
              <li>Attempt to bypass platform security, PDF view protections, or access controls.</li>
              <li>Use automated scripts, bots, or scraping tools to download bulk content off the platform.</li>
              <li>Use Horizon to distribute malicious software or disrupt site operations.</li>
              <li>Attempt to access another student's account or personal data.</li>
            </ul>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">7. Third-Party Services</h2>
            <p class="text-ink/90 leading-relaxed">Horizon relies on trusted infrastructure providers including Supabase (data &amp; authentication), Cloudflare Pages (hosting &amp; content delivery), and Google Analytics (usage metrics). Your interaction with these third-party services is subject to their respective terms and our <a href="/privacy-policy" class="text-[#E91E8C] font-semibold underline">Privacy Policy</a>.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">8. Service Availability &amp; Changes</h2>
            <p class="text-ink/90 leading-relaxed">We strive to maintain constant availability of Horizon's learning resources. However, we reserve the right to modify, suspend, or update platform features, content, or study materials at any time to improve educational accuracy or system performance.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">9. Account Suspension &amp; Termination</h2>
            <p class="text-ink/90 leading-relaxed">We reserve the right to suspend or terminate account access if a user violates these Terms of Service or engages in abusive behavior on the platform. You may also request deletion of your account at any time as described in our Privacy Policy.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">10. Disclaimer of Warranties</h2>
            <p class="text-ink/90 leading-relaxed">Horizon is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied. We do not guarantee that the platform will always be error-free, uninterrupted, or completely free of technical bugs.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">11. Limitation of Liability</h2>
            <p class="text-ink/90 leading-relaxed">In no event shall Horizon or its maintainers be liable for any indirect, incidental, or consequential damages arising from your use of or inability to access the platform or its study resources.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">12. Changes to Terms</h2>
            <p class="text-ink/90 leading-relaxed">We may update these Terms of Service periodically. Updated terms will be posted on this page with a revised "Last Updated" date. Continued use of Horizon after updates signifies acceptance of the revised terms.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">13. Contact Information</h2>
            <p class="text-ink/90 leading-relaxed">If you have questions regarding these Terms of Service or platform guidelines, please visit our <a href="/contact" class="text-[#E91E8C] font-semibold underline">Contact</a> page.</p>
          </section>
        </div>
      </div>
    `),
  },
  {
    path: '/privacy-policy',
    title: 'Privacy Policy | Horizon - Free Student Library',
    description: 'Privacy Policy for Horizon, a free online educational platform offering study material and student library resources. Read how we protect your information.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'Privacy Policy',
      'url': `${BASE_URL}/privacy-policy`,
    },
    contentHtml: wrapInMainLayout(`
      <div class="space-y-6 max-w-4xl mx-auto w-full">
        <header class="neu-raised p-6 sm:p-8 rounded-2xl">
          <h1 class="text-2xl sm:text-4xl font-bold text-ink mb-2">Privacy <span class="text-gradient">Policy</span></h1>
          <p class="text-ink/70 text-sm font-semibold">Last Updated: May 15, 2024</p>
        </header>
        <div class="neu-card p-6 sm:p-8 rounded-2xl space-y-6">
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">1. Introduction</h2>
            <p class="text-ink/90 leading-relaxed">Welcome to Horizon. We are committed to protecting your privacy and ensuring a secure learning environment. Horizon is a free student library and educational platform designed to provide study material, notes, and previous year papers. This Privacy Policy explains how we handle your personal information when you use our website.</p>
            <p class="text-ink/90 leading-relaxed">By accessing or using Horizon, you agree to the practices described in this Privacy Policy. We aim to keep our policies simple, transparent, and easy for students and parents to understand.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">2. Information We Collect</h2>
            <p class="text-ink/90 leading-relaxed">We strongly believe in collecting only the absolute minimum amount of information necessary to provide you with our educational platform.</p>
            <h3 class="text-lg font-bold text-ink">Information You Provide</h3>
            <p class="text-ink/90 leading-relaxed">When you create an account on Horizon, we collect the following information:</p>
            <ul class="list-disc list-inside space-y-1 text-ink/90">
              <li><strong>Email Address:</strong> Used for account creation, authentication, and password recovery.</li>
              <li><strong>Password:</strong> A secure, encrypted password used to protect your account.</li>
              <li><strong>Profile Information:</strong> Any optional information you choose to add to your user profile.</li>
            </ul>
            <h3 class="text-lg font-bold text-ink">Information Collected Automatically</h3>
            <p class="text-ink/90 leading-relaxed">We do not collect unnecessary technical data. When you access Horizon, standard server logs may temporarily record basic information such as your IP address and browser type. This information is strictly used for ensuring platform security and preventing abuse.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">3. How We Use Your Information</h2>
            <p class="text-ink/90 leading-relaxed">We use the information we collect for the following specific purposes:</p>
            <ul class="list-disc list-inside space-y-1 text-ink/90">
              <li>To create and manage your secure user account.</li>
              <li>To authenticate you when you log in.</li>
              <li>To maintain your preferences and saved study materials.</li>
              <li>To ensure the overall security and stability of the platform.</li>
            </ul>
            <p class="text-ink/90 leading-relaxed">We do not use your personal information for targeted advertising, and we do not send promotional or marketing emails.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">4. Authentication and Account Security</h2>
            <p class="text-ink/90 leading-relaxed">Horizon uses <strong>Supabase Authentication</strong> to handle secure user logins. When you sign up, your credentials are processed securely by Supabase. Your passwords are encrypted and never stored in plain text. We prioritize your account security and follow industry-standard practices to protect your data against unauthorized access.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">5. Cookies and Local Storage</h2>
            <p class="text-ink/90 leading-relaxed">Horizon <strong>does not</strong> use tracking cookies for marketing or advertising purposes.</p>
            <p class="text-ink/90 leading-relaxed">We only use essential local storage mechanisms (such as browser <code>localStorage</code> or secure session tokens provided by Supabase) solely to keep you logged in securely while you use the platform. These strictly necessary tokens are required for the website to function correctly.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">6. Third-Party Services</h2>
            <p class="text-ink/90 leading-relaxed">To provide you with a fast and reliable educational platform, Horizon relies on a carefully selected group of trusted third-party infrastructure providers:</p>
            <ul class="list-disc list-inside space-y-1 text-ink/90">
              <li><strong>Supabase Database &amp; Storage:</strong> We use Supabase to securely store your account profile information and host our library of educational resources.</li>
              <li><strong>Cloudflare Pages:</strong> We use Cloudflare to host our website securely and deliver content to you quickly.</li>
              <li><strong>Google Analytics (GA4):</strong> We use Google Analytics to measure site usage and performance to help improve our educational platform.</li>
            </ul>
            <p class="text-ink/90 leading-relaxed">We do not use tracking pixels for advertising, nor do we share personal user information with third-party advertising networks.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">7. Data Sharing and Disclosure</h2>
            <p class="text-ink/90 leading-relaxed">Your trust is extremely important to us. <strong>We do not sell, rent, or trade your personal information to anyone.</strong></p>
            <p class="text-ink/90 leading-relaxed">We will only disclose your information if required to do so by law, or to protect the rights, property, and safety of Horizon, its users, or the public.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">8. Data Retention</h2>
            <p class="text-ink/90 leading-relaxed">We retain your email address and profile information only for as long as your Horizon account remains active. This is necessary to provide you with ongoing access to our study materials. If you choose to delete your account, your personal information will be permanently removed from our active databases.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">9. User Rights</h2>
            <p class="text-ink/90 leading-relaxed">You have full control over the data you provide to Horizon. You have the right to:</p>
            <ul class="list-disc list-inside space-y-1 text-ink/90">
              <li>Access the personal information we hold about you.</li>
              <li>Correct any inaccurate or incomplete information.</li>
              <li>Request the deletion of your account and associated personal data.</li>
            </ul>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">10. Account Deletion</h2>
            <p class="text-ink/90 leading-relaxed">You can request to delete your account at any time. When you initiate an account deletion request, your profile information and authentication data will be permanently erased from our Supabase database. Because we do not maintain complex user tracking, deletion is a straightforward process.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">11. Children's Privacy</h2>
            <p class="text-ink/90 leading-relaxed">Horizon is an educational platform designed for students of various ages. However, we do not knowingly collect personal information from children under the age of 13 without verifiable parental consent. If you are a parent or guardian and believe we have inadvertently collected information from your child, please contact us so we can promptly delete the data.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">12. Security Measures</h2>
            <p class="text-ink/90 leading-relaxed">We take the security of your data very seriously. Horizon employs technical and organizational measures to safeguard your information, including the use of HTTPS encryption for all data transmitted between your device and our servers, and secure authentication protocols provided by Supabase. While no system can be completely secure, we continually review our practices to ensure your data remains protected.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">13. International Data Transfers</h2>
            <p class="text-ink/90 leading-relaxed">Horizon and its infrastructure providers (such as Supabase and Cloudflare) operate globally. By using our platform, you acknowledge that your basic account information may be transferred to and processed in countries outside of your country of residence, where data protection laws may differ. We rely on standard industry safeguards to ensure this data remains protected.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">14. Policy Updates</h2>
            <p class="text-ink/90 leading-relaxed">We may update this Privacy Policy occasionally to reflect changes in our platform or legal requirements. When we make updates, we will revise the "Last Updated" date at the top of this page. We encourage you to review this policy periodically. Your continued use of Horizon after any changes indicates your acceptance of the updated policy.</p>
          </section>
          <section class="space-y-2">
            <h2 class="text-xl font-bold text-ink">15. Contact Information</h2>
            <p class="text-ink/90 leading-relaxed">If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle your personal information, please feel free to reach out to us. You can find our contact details on the <a href="/contact" class="text-[#E91E8C] font-semibold underline">Contact</a> page of our website.</p>
          </section>
        </div>
      </div>
    `),
  },
  {
    path: '/attribution',
    title: 'Attribution | Horizon - Free Student Library',
    description: 'Attribution for third-party illustrations and icons used in Horizon.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'Attribution',
      'url': `${BASE_URL}/attribution`,
    },
    contentHtml: wrapInMainLayout(`
      <div class="space-y-6 max-w-4xl mx-auto w-full">
        <header class="neu-raised p-6 sm:p-8 rounded-2xl">
          <h1 class="text-2xl sm:text-4xl font-bold text-ink mb-2"><span class="text-gradient">Attribution</span></h1>
        </header>
        <div class="space-y-6">
          <div class="neu-raised p-6 rounded-2xl">
            <p class="text-ink/80 text-base leading-relaxed m-0">Horizon uses third-party illustrations and icons throughout the platform. We gratefully acknowledge the creators and services that provide these resources.</p>
          </div>
          <section class="neu-raised p-6 rounded-2xl space-y-4">
            <h2 class="text-xl font-bold text-ink">Illustrations</h2>
            <h3 class="text-lg font-bold text-ink">Storyset</h3>
            <ul class="list-disc list-inside space-y-2 text-ink/90">
              <li><a href="https://storyset.com/education" target="_blank" rel="noopener noreferrer" class="text-[#E91E8C] font-semibold underline">Education illustrations — Storyset</a></li>
              <li><a href="https://storyset.com/people" target="_blank" rel="noopener noreferrer" class="text-[#E91E8C] font-semibold underline">People illustrations — Storyset</a></li>
              <li><a href="https://storyset.com/work" target="_blank" rel="noopener noreferrer" class="text-[#E91E8C] font-semibold underline">Work illustrations — Storyset</a></li>
              <li><a href="https://storyset.com/city" target="_blank" rel="noopener noreferrer" class="text-[#E91E8C] font-semibold underline">City illustrations — Storyset</a></li>
              <li><a href="https://storyset.com/user" target="_blank" rel="noopener noreferrer" class="text-[#E91E8C] font-semibold underline">User illustrations — Storyset</a></li>
              <li><a href="https://storyset.com/communication" target="_blank" rel="noopener noreferrer" class="text-[#E91E8C] font-semibold underline">Communication illustrations — Storyset</a></li>
            </ul>
          </section>
          <section class="neu-raised p-6 rounded-2xl space-y-4">
            <h2 class="text-xl font-bold text-ink">Icons</h2>
            <h3 class="text-lg font-bold text-ink">Icons8</h3>
            <p class="text-ink/90">Icons used in Horizon are provided by <a href="https://icons8.com" target="_blank" rel="noopener noreferrer" class="text-[#E91E8C] font-semibold underline">Icons8</a>.</p>
            <ul class="list-disc list-inside space-y-2 text-ink/90">
              <li><a href="https://icons8.com/icon/32292/instagram" target="_blank" rel="noopener noreferrer" class="text-[#E91E8C] font-semibold underline">Instagram — Icons8</a></li>
              <li><a href="https://icons8.com/icon/fJp7hepMryiw/x" target="_blank" rel="noopener noreferrer" class="text-[#E91E8C] font-semibold underline">X — Icons8</a></li>
              <li><a href="https://icons8.com/icon/rUgzXdXFnhmg/gmail" target="_blank" rel="noopener noreferrer" class="text-[#E91E8C] font-semibold underline">Gmail — Icons8</a></li>
              <li><a href="https://icons8.com/icon/v551nqGeHhGn/github" target="_blank" rel="noopener noreferrer" class="text-[#E91E8C] font-semibold underline">GitHub — Icons8</a></li>
              <li><a href="https://icons8.com/icon/ios/substack" target="_blank" rel="noopener noreferrer" class="text-[#E91E8C] font-semibold underline">Substack — Icons8</a></li>
            </ul>
          </section>
        </div>
      </div>
    `),
  },
];

export function generateStaticPageHtml(pageConfig, templateHtml) {
  const { title, description, path: pagePath, jsonLd, contentHtml } = pageConfig;
  const canonicalUrl = `${BASE_URL}${pagePath === '/' ? '' : pagePath}`;

  let outputHtml = templateHtml;

  // Replace <title>
  outputHtml = outputHtml.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  // Head insertions
  const headAdditions = `
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    ${jsonLd ? `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>` : ''}
  `;

  outputHtml = outputHtml.replace('</head>', `${headAdditions}\n  </head>`);

  // Inject into <div id="root">
  outputHtml = outputHtml.replace('<div id="root"></div>', `<div id="root">${contentHtml}</div>`);

  assertSecurityCompliance(outputHtml, {});

  return outputHtml;
}

export function assertSecurityCompliance(htmlContent, resourceRaw = {}) {
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

  console.log('Pre-rendering public static information pages...');
  for (const pageConfig of PUBLIC_STATIC_PAGES) {
    const pageHtml = generateStaticPageHtml(pageConfig, templateHtml);
    if (pageConfig.isHome) {
      fs.writeFileSync(templatePath, pageHtml, 'utf-8');
      console.log('  ✓ Pre-rendered / -> dist/index.html');
    } else {
      const pageDir = path.join(distDir, pageConfig.path.slice(1));
      fs.mkdirSync(pageDir, { recursive: true });
      fs.writeFileSync(path.join(pageDir, 'index.html'), pageHtml, 'utf-8');
      console.log(`  ✓ Pre-rendered ${pageConfig.path} -> dist${pageConfig.path}/index.html`);
    }
  }

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

  console.log('Pre-rendering public category listing pages...');
  const categoryRoutes = generateCategoryUrls(mappedResources.map(m => m.mapped));
  let categoryCount = 0;

  for (const catConfig of categoryRoutes) {
    const pageHtml = generateCategoryHtml(catConfig, templateHtml, mappedResources.map(m => m.mapped));
    const relPath = catConfig.path.startsWith('/') ? catConfig.path.slice(1) : catConfig.path;
    const categoryDir = path.join(distDir, relPath);
    fs.mkdirSync(categoryDir, { recursive: true });

    const categoryOutputFile = path.join(categoryDir, 'index.html');
    fs.writeFileSync(categoryOutputFile, pageHtml, 'utf-8');
    categoryCount++;
  }

  console.log(`Pre-rendering complete! Successfully generated ${categoryCount} static category listing pages.`);
}

export function generateCategoryUrls(resources = []) {
  const categoryMap = new Map();

  const addCategory = (routePath, basePath, resourceType, studentClass = null, medium = null, subject = null) => {
    const cleanPath = routePath.startsWith('/') ? routePath : `/${routePath}`;
    if (!categoryMap.has(cleanPath)) {
      categoryMap.set(cleanPath, {
        path: cleanPath,
        basePath,
        resourceType,
        studentClass,
        medium,
        subject
      });
    }
  };

  addCategory('/library', '/library', 'pyq');
  addCategory('/notes', '/notes', 'notes');

  resources.forEach(resource => {
    const isNotes = resource.resource_type === 'notes';
    const basePath = isNotes ? '/notes' : '/library';
    const resType = isNotes ? 'notes' : 'pyq';

    const rawClass = resource.student_class;
    const rawMedium = resource.medium;
    const rawSubject = resource.subject;

    const cSlug = classToSlug(rawClass);
    const mSlug = mediumToSlug(rawMedium);
    const sSlug = subjectToSlug(rawSubject);

    if (cSlug) {
      addCategory(`${basePath}/${cSlug}`, basePath, resType, rawClass, null, null);

      if (mSlug) {
        addCategory(`${basePath}/${cSlug}/${mSlug}`, basePath, resType, rawClass, rawMedium, null);

        if (sSlug) {
          addCategory(`${basePath}/${cSlug}/${mSlug}/${sSlug}`, basePath, resType, rawClass, rawMedium, rawSubject);
        }
      } else if (sSlug) {
        addCategory(`${basePath}/${cSlug}/all-mediums/${sSlug}`, basePath, resType, rawClass, null, rawSubject);
      }
    }
  });

  return Array.from(categoryMap.values());
}

export function filterResourcesForCategory(allResources, categoryConfig) {
  const { resourceType, studentClass, medium, subject } = categoryConfig;

  const filtered = allResources.filter(r => {
    const isNotes = r.resource_type === 'notes';
    if (resourceType === 'notes' && !isNotes) return false;
    if (resourceType === 'pyq' && isNotes) return false;

    if (studentClass) {
      if (!r.student_class) return false;
      if (classToSlug(r.student_class) !== classToSlug(studentClass)) return false;
    }

    if (medium) {
      if (!r.medium) return false;
      if (mediumToSlug(r.medium) !== mediumToSlug(medium)) return false;
    }

    if (subject) {
      if (!r.subject) return false;
      if (subjectToSlug(r.subject) !== subjectToSlug(subject)) return false;
    }

    return true;
  });

  if (resourceType === 'pyq') {
    filtered.sort((a, b) => {
      const yearA = a.year ? parseInt(a.year, 10) : 0;
      const yearB = b.year ? parseInt(b.year, 10) : 0;
      if (yearB !== yearA) return yearB - yearA;
      return (a.title || '').localeCompare(b.title || '');
    });
  } else {
    filtered.sort((a, b) => {
      const chA = a.chapters?.chapter_number ?? 999;
      const chB = b.chapters?.chapter_number ?? 999;
      if (chA !== chB) return chA - chB;
      return (a.title || '').localeCompare(b.title || '');
    });
  }

  return filtered;
}

export function renderLibraryEducationalGuide(allResources, selectedClass, selectedSubject, selectedYear) {
  const availableClasses = Array.from(new Set(allResources.map(r => r.student_class).filter(Boolean))).sort((a, b) => {
    const numA = parseInt(String(a).replace(/\D/g, '') || '0', 10);
    const numB = parseInt(String(b).replace(/\D/g, '') || '0', 10);
    return numA - numB;
  });

  const availableSubjects = Array.from(new Set(allResources.map(r => r.subject).filter(Boolean))).sort();

  const years = allResources.map(r => (r.year ? parseInt(r.year, 10) : NaN)).filter(y => !isNaN(y));
  let yearRange = null;
  if (years.length > 0) {
    const min = Math.min(...years);
    const max = Math.max(...years);
    yearRange = min === max ? `${min}` : `${min}–${max}`;
  }

  const parts = [];
  if (selectedClass) parts.push(selectedClass);
  if (selectedSubject) parts.push(selectedSubject);
  if (selectedYear) parts.push(`Year ${selectedYear}`);

  const contextualFilterSummary = parts.length > 0
    ? `Currently displaying previous year question papers filtered for ${escapeHtml(parts.join(' • '))}.`
    : null;

  return `
    <section aria-label="Library Overview and Exam Preparation Guide" class="neu-raised rounded-2xl p-[clamp(16px,3vw,28px)] mb-[clamp(20px,3vw,32px)] text-ink">
      <div class="space-y-4">
        <div>
          <h2 class="text-[clamp(18px,2.5vw,22px)] font-bold mb-2">
            Horizon Previous Year Question Papers (PYQs)
          </h2>
          <p class="text-body2 text-muted-foreground leading-relaxed">
            The Horizon Library provides a structured repository of official previous year question papers designed to help students prepare for upcoming board and school examinations. Practicing with past papers offers direct insight into exam question formats, topic weightage, marking schemes, and time management strategies.
          </p>
        </div>

        ${contextualFilterSummary ? `<div class="neu-inset rounded-xl p-3 text-caption font-medium text-ink bg-opacity-50">${contextualFilterSummary}</div>` : ''}

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div class="neu-inset rounded-xl p-4">
            <h3 class="text-body1 font-semibold mb-2">Available Resource Categories</h3>
            <p class="text-caption text-muted-foreground mb-3 leading-relaxed">
              Our library is systematically organized to enable efficient browsing across academic levels, subjects, and examination years:
            </p>
            <ul class="list-disc list-inside text-caption text-muted-foreground space-y-1.5">
              <li>
                <strong>Classes Covered:</strong> ${escapeHtml(availableClasses.length > 0 ? availableClasses.join(', ') : 'Secondary & Higher Secondary grades')}
              </li>
              <li>
                <strong>Subjects Available:</strong> ${escapeHtml(availableSubjects.length > 0 ? availableSubjects.join(', ') : 'Mathematics, Science, Social Sciences')}
              </li>
              ${yearRange ? `<li><strong>Examination Years:</strong> ${escapeHtml(yearRange)} past exam papers</li>` : ''}
            </ul>
          </div>

          <div class="neu-inset rounded-xl p-4">
            <h3 class="text-body1 font-semibold mb-2">How to Use PYQs for Revision</h3>
            <ul class="list-disc list-inside text-caption text-muted-foreground space-y-1.5 leading-relaxed">
              <li>
                <strong>Simulate Exam Conditions:</strong> Solve complete past papers within the designated time limit to build speed and accuracy.
              </li>
              <li>
                <strong>Identify High-Frequency Topics:</strong> Analyze recurring question types and essential core concepts across multiple years.
              </li>
              <li>
                <strong>Assess Knowledge Gaps:</strong> Cross-check your answers against standard solutions to spot areas needing further study.
              </li>
              <li>
                <strong>Refine Writing Technique:</strong> Practice structured answer presentation, numerical steps, and labeled diagrams.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function renderNotesEducationalGuide(allResources, selectedClass, selectedSubject, selectedMedium) {
  const availableClasses = Array.from(new Set(allResources.map(r => r.student_class).filter(Boolean))).sort((a, b) => {
    const numA = parseInt(String(a).replace(/\D/g, '') || '0', 10);
    const numB = parseInt(String(b).replace(/\D/g, '') || '0', 10);
    return numA - numB;
  });

  const availableSubjects = Array.from(new Set(allResources.map(r => r.subject).filter(Boolean))).sort();

  const availableMediums = Array.from(new Set(allResources.map(r => r.medium).filter(Boolean)))
    .map(m => m.charAt(0).toUpperCase() + m.slice(1))
    .sort();

  const chapterCount = new Set(allResources.map(r => r.chapter_id).filter(Boolean)).size;

  const parts = [];
  if (selectedClass) parts.push(selectedClass);
  if (selectedSubject) parts.push(selectedSubject);
  if (selectedMedium) parts.push(`${selectedMedium.charAt(0).toUpperCase() + selectedMedium.slice(1)} Medium`);

  const contextualFilterSummary = parts.length > 0
    ? `Currently displaying study notes filtered for ${escapeHtml(parts.join(' • '))}.`
    : null;

  return `
    <section aria-label="Study Notes Overview and Learning Guide" class="neu-raised rounded-2xl p-[clamp(16px,3vw,28px)] mb-[clamp(20px,3vw,32px)] text-ink">
      <div class="space-y-4">
        <div>
          <h2 class="text-[clamp(18px,2.5vw,22px)] font-bold mb-2">
            Horizon Comprehensive Study Notes
          </h2>
          <p class="text-body2 text-muted-foreground leading-relaxed">
            Horizon Study Notes provide clear, chapter-wise concept summaries and structured academic guides designed to simplify learning and strengthen fundamental understanding. Each note module breaks down complex textbook topics into clear explanations, key formulas, essential definitions, and step-by-step topic outlines.
          </p>
        </div>

        ${contextualFilterSummary ? `<div class="neu-inset rounded-xl p-3 text-caption font-medium text-ink bg-opacity-50">${contextualFilterSummary}</div>` : ''}

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div class="neu-inset rounded-xl p-4">
            <h3 class="text-body1 font-semibold mb-2">Notes Organization &amp; Coverage</h3>
            <p class="text-caption text-muted-foreground mb-3 leading-relaxed">
              Notes are mapped sequentially to official curriculum chapters to support structured study throughout the academic year:
            </p>
            <ul class="list-disc list-inside text-caption text-muted-foreground space-y-1.5">
              <li>
                <strong>Classes Supported:</strong> ${escapeHtml(availableClasses.length > 0 ? availableClasses.join(', ') : 'Middle & High School grades')}
              </li>
              <li>
                <strong>Subjects Covered:</strong> ${escapeHtml(availableSubjects.length > 0 ? availableSubjects.join(', ') : 'Science, Social Studies, Mathematics')}
              </li>
              <li>
                <strong>Study Mediums:</strong> ${escapeHtml(availableMediums.length > 0 ? availableMediums.join(', ') : 'English and Hindi medium')}
              </li>
              ${chapterCount > 0 ? `<li><strong>Syllabus Chapters:</strong> Covers over ${chapterCount} curriculum chapters</li>` : ''}
            </ul>
          </div>

          <div class="neu-inset rounded-xl p-4">
            <h3 class="text-body1 font-semibold mb-2">Study &amp; Revision Strategy</h3>
            <ul class="list-disc list-inside text-caption text-muted-foreground space-y-1.5 leading-relaxed">
              <li>
                <strong>Pre-Class Preparation:</strong> Read note summaries before classroom lectures to familiarize yourself with key terminology.
              </li>
              <li>
                <strong>Active Concept Review:</strong> Revisit core formulas, definitions, and diagrams during weekly study sessions.
              </li>
              <li>
                <strong>Self-Assessment:</strong> Test your recall by explaining concepts in your own words after completing each chapter outline.
              </li>
              <li>
                <strong>Accessing Full Documents:</strong> Detailed interactive note materials can be accessed seamlessly. Complete protected document access may require logging into your free Horizon account.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function renderMaterialCardHtml(resource) {
  const isPYQ = resource.resource_type === 'pyq';
  const cardTitle = isPYQ
    ? `${resource.student_class || ''} ${resource.subject || ''} PYQ`.trim()
    : resource.title;
  const cardSubtitle = resource.year || resource.subject || '';

  const illustrationSrc = isPYQ
    ? '/assets/SVG Illustrations/pyq-papers.svg'
    : '/assets/SVG Illustrations/study-notes.svg';

  return `
    <div class="neu-raised p-[14px] rounded-xl flex flex-col h-full items-center text-center min-w-0">
      <a href="/resource/${escapeHtml(resource.id)}" class="w-full flex flex-col items-center text-center no-underline text-ink group min-w-0">
        <div class="w-full h-[100px] neu-recessed text-muted-foreground rounded-md mb-[12px] flex items-center justify-center overflow-hidden shrink-0">
          <img src="${illustrationSrc}" alt="${escapeHtml(cardTitle)}" class="w-full h-full object-contain" />
        </div>
        <h3 class="text-[15px] leading-[1.25] font-bold mb-[3px] text-ink line-clamp-2 overflow-hidden w-full text-center break-words">
          ${escapeHtml(cardTitle)}
        </h3>
        <p class="text-[12px] mb-[14px] text-ink/70 font-bold w-full text-center truncate">
          ${escapeHtml(cardSubtitle)}
        </p>
      </a>
      <div class="w-full flex justify-center gap-[4px] md:gap-[8px] mt-auto">
        <a href="/resource/${escapeHtml(resource.id)}" class="flex-1 min-w-0 p-[6px_8px] md:p-[6px_4px] flex items-center justify-center whitespace-normal text-[11px] leading-[1.15] gap-[4px] font-bold neu-raised-sm rounded-md hover:neu-raised-sm-hover no-underline text-ink text-center">
          <span class="shrink-0 truncate">View</span>
        </a>
      </div>
    </div>
  `;
}

export function renderEmptyStateHtml(categoryType) {
  const emptyTitle = categoryType === 'pyq' ? 'No previous year papers found.' : 'No study notes found.';
  const emptySubtitle = categoryType === 'pyq'
    ? 'Try selecting a different class, subject, or year.'
    : 'Try selecting a different class, subject, or medium.';

  return `
    <div class="neu-raised rounded-2xl p-8 text-center flex flex-col items-center justify-center">
      <img src="/assets/SVG Illustrations/no-content-available.svg" alt="" class="w-48 h-48 mb-3 object-contain" />
      <p class="font-bold text-body1 mb-2">${escapeHtml(emptyTitle)}</p>
      <p class="text-caption">${escapeHtml(emptySubtitle)}</p>
    </div>
  `;
}

export function renderOtherResourcesHtml(currentCategoryId) {
  const features = [
    { id: 'pyq', title: 'PYQ Papers', desc: 'Past papers to help you prepare effectively.', path: '/library' },
    { id: 'notes', title: 'Study Notes', desc: 'Comprehensive notes for all subjects.', path: '/notes' },
  ].filter(f => f.id !== currentCategoryId);

  const items = features.map(f => `
    <div class="neu-card p-4 sm:p-6 rounded-2xl relative">
      <a href="${escapeHtml(f.path)}" class="absolute inset-0 z-20" aria-label="Go to ${escapeHtml(f.title)}"></a>
      <h3 class="text-lg sm:text-xl font-bold text-ink mb-1.5">${escapeHtml(f.title)}</h3>
      <p class="text-xs sm:text-body2 text-ink/80 m-0">${escapeHtml(f.desc)}</p>
    </div>
  `).join('');

  return `
    <div class="mt-8 pt-8 border-t border-ink/10">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        ${items}
      </div>
    </div>
  `;
}

export function generateCategoryHtml(categoryConfig, templateHtml, allResources = []) {
  const { path: routePath, basePath, resourceType, studentClass, medium, subject } = categoryConfig;
  const isPYQ = resourceType === 'pyq';

  const catResources = allResources.filter(r => isPYQ ? r.resource_type !== 'notes' : r.resource_type === 'notes');
  const filteredResources = filterResourcesForCategory(allResources, categoryConfig);

  const filterParts = [];
  if (studentClass) filterParts.push(studentClass);
  if (subject) filterParts.push(subject);
  if (medium) filterParts.push(`${medium.charAt(0).toUpperCase() + medium.slice(1)} Medium`);

  let pageTitle = isPYQ
    ? 'Previous Year Question Papers (PYQs) | Horizon - Free Student Library'
    : 'Comprehensive Study Notes | Horizon - Free Student Library';

  let pageDesc = isPYQ
    ? 'Access free previous year question papers (PYQs) for Class 8 to Class 12. Practice past exam papers by class, subject, and year to improve exam preparation and performance.'
    : 'Explore free, subject-wise study notes organized by syllabus chapters for Class 8 to Class 12 in English and Hindi medium. Master concepts with clear chapter outlines and revision notes.';

  if (filterParts.length > 0) {
    const resourceTypeName = isPYQ ? 'PYQ Papers' : 'Study Notes';
    const categorySummary = filterParts.join(' ');
    pageTitle = `${categorySummary} ${resourceTypeName} | Horizon`;
    pageDesc = `Free ${categorySummary} ${resourceTypeName.toLowerCase()} for student exam preparation. Browse concepts, practice materials, and study guides on Horizon.`;
  }

  const canonicalUrl = `${BASE_URL}${routePath}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: pageTitle,
    description: pageDesc,
    url: canonicalUrl,
    provider: {
      '@type': 'Organization',
      name: 'Horizon',
      url: BASE_URL,
    },
  };

  const educationalGuideHtml = isPYQ
    ? renderLibraryEducationalGuide(catResources, studentClass, subject, null)
    : renderNotesEducationalGuide(catResources, studentClass, subject, medium);

  const gridContentHtml = filteredResources.length > 0
    ? `<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[18px]">
        ${filteredResources.map(r => renderMaterialCardHtml(r)).join('')}
       </div>`
    : renderEmptyStateHtml(resourceType);

  const categoryTitle = isPYQ ? 'PYQ PAPERS' : 'STUDY NOTES';

  const appContentHtml = `
    <div class="w-[min(96vw,1600px)] mx-auto px-[clamp(16px,2vw,32px)] max-md:pt-[10px] md:-mt-[20px] pb-[clamp(24px,3vw,48px)] min-w-0">
      <div class="flex justify-between items-center mb-[clamp(12px,3vw,20px)] w-full min-w-0">
        <a href="/" class="w-11 h-11 neu-raised rounded-full neu-raised-hover flex items-center justify-center cursor-pointer shrink-0 no-underline text-ink" aria-label="Go Back">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </a>
      </div>

      <div class="flex flex-col items-start max-md:gap-[32px] md:gap-[12px] mb-[clamp(12px,3vw,20px)]">
        <h1 class="text-[clamp(36px,5vw,56px)] leading-tight uppercase text-ink">${escapeHtml(categoryTitle)}</h1>
      </div>

      ${educationalGuideHtml}

      <div class="mb-[clamp(24px,4vw,40px)] grid grid-cols-1 sm:grid-cols-3 w-full gap-[12px]">
        <div class="neu-raised p-3 rounded-xl font-bold text-ink text-center">${escapeHtml(studentClass || 'All Classes')}</div>
        <div class="neu-raised p-3 rounded-xl font-bold text-ink text-center">${escapeHtml(subject || 'All Subjects')}</div>
        <div class="neu-raised p-3 rounded-xl font-bold text-ink text-center">${escapeHtml(medium ? `${medium.charAt(0).toUpperCase() + medium.slice(1)} Medium` : (isPYQ ? 'All Years' : 'All Mediums'))}</div>
      </div>

      ${gridContentHtml}

      ${renderOtherResourcesHtml(resourceType)}
    </div>
  `;

  const fullContentHtml = wrapInMainLayout(appContentHtml);

  let outputHtml = templateHtml;
  outputHtml = outputHtml.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);

  const headAdditions = `
    <meta name="description" content="${escapeHtml(pageDesc)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
    </script>
  `;

  outputHtml = outputHtml.replace('</head>', `${headAdditions}\n  </head>`);
  outputHtml = outputHtml.replace('<div id="root"></div>', `<div id="root">${fullContentHtml}</div>`);

  assertSecurityCompliance(outputHtml, {});

  return outputHtml;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('Build failure during pre-rendering:', err);
    process.exit(1);
  });
}
