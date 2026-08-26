import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import type { Resource, ResourceType } from '../../types';
import { fetchLearningResources } from '../../services/learningResourcesAPI';
import {
  slugToClass,
  slugToMedium,
  slugToSubject,
  buildCategoryUrl,
  isMediumSlug,
} from '../../utils/urlHelper';

import { Dropdown } from '../../components/Dropdown';
import LibraryInFeedAd from '../../components/LibraryInFeedAd';
import MaterialCard from '../../components/MaterialCard';
import MaterialCardSkeleton from '../../components/MaterialCardSkeleton';
import OtherResources from '../../components/OtherResources';
import ProfileButton from '../../components/ProfileButton';
import LibraryEducationalGuide from './components/LibraryEducationalGuide';
import NotesEducationalGuide from './components/NotesEducationalGuide';

export interface ResourcePageConfig {
  resourceType: ResourceType;
  title: string;
  metaTitle: string;
  metaDescription: string;
  includeChapters?: boolean;
  thirdFilterType: 'year' | 'medium';
  emptyMessageTitle: string;
  emptyMessageSubtitle: string;
  otherResourcesCategory: ResourceType | 'updates';
  showInFeedAd?: boolean;
  getThirdFilterDesktopLabel: (defaultLabel: string) => string;
  getThirdFilterMobileLabel: (defaultLabel: string) => string;
  extractThirdFilterValues: (resources: Resource[]) => string[];
  filterByThirdFilter: (resources: Resource[], filterValue: string) => Resource[];
  sortResources: (resources: Resource[]) => Resource[];
}

interface ResourcePageProps {
  config: ResourcePageConfig;
}

const ResourcePage: React.FC<ResourcePageProps> = ({ config }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ classSlug?: string; mediumSlug?: string; subjectSlug?: string }>();

  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
  );

  const basePath = config.resourceType === 'pyq' ? '/library' : '/notes';

  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedThirdFilter, setSelectedThirdFilter] = useState<string>('');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const classAllLabel = isDesktop ? 'All Classes' : 'Classes';
  const subjectAllLabel = isDesktop ? 'All Subjects' : 'Subjects';
  const thirdFilterAllLabel = isDesktop
    ? config.getThirdFilterDesktopLabel('')
    : config.getThirdFilterMobileLabel('');

  useEffect(() => {
    // Generate dynamic SEO Title and Meta Description based on selected filters
    let pageTitle = config.metaTitle;
    let pageDesc = config.metaDescription;

    const filterParts: string[] = [];
    if (selectedClass) filterParts.push(selectedClass);
    if (selectedSubject) filterParts.push(selectedSubject);
    if (selectedThirdFilter) {
      if (config.thirdFilterType === 'medium') {
        filterParts.push(`${selectedThirdFilter} Medium`);
      } else if (config.thirdFilterType === 'year' && selectedThirdFilter !== 'Years' && selectedThirdFilter !== 'All Years') {
        filterParts.push(`Year ${selectedThirdFilter}`);
      }
    }

    if (filterParts.length > 0) {
      const resourceTypeName = config.resourceType === 'pyq' ? 'PYQ Papers' : 'Study Notes';
      const categorySummary = filterParts.join(' ');
      pageTitle = `${categorySummary} ${resourceTypeName} | Horizon`;
      pageDesc = `Free ${categorySummary} ${resourceTypeName.toLowerCase()} for student exam preparation. Browse concepts, practice materials, and study guides on Horizon.`;
    }

    document.title = pageTitle;

    let metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', pageDesc);
    } else {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      metaDescription.setAttribute('content', pageDesc);
      document.head.appendChild(metaDescription);
    }

    // Dynamic Canonical Link Tag
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const currentCanonicalPath = buildCategoryUrl({
      basePath,
      studentClass: selectedClass,
      medium: config.thirdFilterType === 'medium' ? selectedThirdFilter : undefined,
      subject: selectedSubject,
      year: config.thirdFilterType === 'year' ? selectedThirdFilter : undefined,
    });
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://unfollowaman.tech';
    const fullCanonicalUrl = `${origin}${currentCanonicalPath}`;

    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    const originalCanonical = canonicalLink.href;
    canonicalLink.href = fullCanonicalUrl;

    return () => {
      if (canonicalLink && originalCanonical) {
        canonicalLink.href = originalCanonical;
      }
    };
  }, [
    config.metaTitle,
    config.metaDescription,
    config.resourceType,
    config.thirdFilterType,
    selectedClass,
    selectedSubject,
    selectedThirdFilter,
    basePath,
  ]);

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      const { data, error } = await fetchLearningResources({
        resource_type: config.resourceType,
        includeChapters: config.includeChapters
      });

      if (error) {
        console.error('Error fetching resources:', error);
        setAllResources([]);
      } else if (data) {
        setAllResources(data);
      }
      setLoading(false);
    };

    fetchResources();
  }, [config.resourceType, config.includeChapters]);

  const uniqueClasses = useMemo(() => {
    const classes = new Set(allResources.map(r => r.student_class).filter(Boolean) as string[]);
    ['Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].forEach(cls => {
      if (!classes.has(cls)) {
        classes.add(cls);
      }
    });
    const sorted = Array.from(classes).sort((a, b) => {
      const matchA = a.match(/Class (\d+)/i);
      const matchB = b.match(/Class (\d+)/i);

      const numA = matchA ? parseInt(matchA[1], 10) : 0;
      const numB = matchB ? parseInt(matchB[1], 10) : 0;

      if (numA && numB) {
        return numB - numA;
      }

      if (numA) return -1;
      if (numB) return 1;

      return a.localeCompare(b);
    });
    return sorted;
  }, [allResources]);

  const uniqueSubjects = useMemo(() => {
    const subjects = new Set(allResources.map(r => r.subject).filter(Boolean) as string[]);
    return Array.from(subjects).sort();
  }, [allResources]);

  const uniqueThirdFilterValues = useMemo(() => {
    return config.extractThirdFilterValues(allResources);
  }, [allResources, config]);

  // Synchronize URL parameters with filter state
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const qClass = searchParams.get('class');
    const qMedium = searchParams.get('medium');
    const qSubject = searchParams.get('subject');
    const qYear = searchParams.get('year');

    let targetClass = '';
    let targetSubject = '';
    let targetThirdFilter = '';

    const pathClassSlug = params.classSlug;
    const pathMediumSlug = params.mediumSlug;
    const pathSubjectSlug = params.subjectSlug;

    // 1. Resolve Class
    if (qClass) {
      targetClass = slugToClass(qClass, uniqueClasses) || '';
    } else if (pathClassSlug) {
      targetClass = slugToClass(pathClassSlug, uniqueClasses) || '';
    }

    // 2. Resolve Subject and Third Filter (Medium or Year)
    if (config.thirdFilterType === 'medium') {
      if (qMedium) {
        targetThirdFilter = slugToMedium(qMedium, uniqueThirdFilterValues) || '';
      } else if (pathMediumSlug && isMediumSlug(pathMediumSlug) && pathMediumSlug !== 'all-mediums') {
        targetThirdFilter = slugToMedium(pathMediumSlug, uniqueThirdFilterValues) || '';
      }

      if (qSubject) {
        targetSubject = slugToSubject(qSubject, uniqueSubjects) || '';
      } else if (pathSubjectSlug) {
        targetSubject = slugToSubject(pathSubjectSlug, uniqueSubjects) || '';
      } else if (pathMediumSlug && !isMediumSlug(pathMediumSlug)) {
        // Handle case where medium was omitted, e.g. /notes/class-10/geography
        targetSubject = slugToSubject(pathMediumSlug, uniqueSubjects) || '';
      }
    } else if (config.thirdFilterType === 'year') {
      if (qYear) {
        targetThirdFilter = qYear;
      } else if (pathMediumSlug && /^\d{4}$/.test(pathMediumSlug)) {
        targetThirdFilter = pathMediumSlug;
      } else if (pathMediumSlug && isMediumSlug(pathMediumSlug)) {
        // e.g. /library/class-10/english-medium/geography (medium specified in path slug)
        // If query has year, qYear handled above.
      }

      if (qSubject) {
        targetSubject = slugToSubject(qSubject, uniqueSubjects) || '';
      } else if (pathSubjectSlug) {
        targetSubject = slugToSubject(pathSubjectSlug, uniqueSubjects) || '';
      } else if (pathMediumSlug && !/^\d{4}$/.test(pathMediumSlug) && !isMediumSlug(pathMediumSlug)) {
        // Handle case where 2nd slug is subject: /library/class-10/geography
        targetSubject = slugToSubject(pathMediumSlug, uniqueSubjects) || '';
      }
    }

    setSelectedClass(targetClass);
    setSelectedSubject(targetSubject);
    setSelectedThirdFilter(targetThirdFilter);

    // If legacy query params were used, seamlessly convert to canonical URL
    if (qClass || qSubject || qMedium || (qYear && config.thirdFilterType === 'year')) {
      const canonicalUrl = buildCategoryUrl({
        basePath,
        studentClass: targetClass,
        medium: config.thirdFilterType === 'medium' ? targetThirdFilter : undefined,
        subject: targetSubject,
        year: config.thirdFilterType === 'year' ? targetThirdFilter : undefined,
      });
      if (canonicalUrl !== `${location.pathname}${location.search}`) {
        navigate(canonicalUrl, { replace: true });
      }
    }
  }, [
    location.pathname,
    location.search,
    params.classSlug,
    params.mediumSlug,
    params.subjectSlug,
    uniqueClasses,
    uniqueSubjects,
    uniqueThirdFilterValues,
    config.thirdFilterType,
    basePath,
    navigate,
  ]);

  const filteredResources = useMemo(() => {
    let filtered = allResources;

    if (selectedClass) {
      filtered = filtered.filter(r => r.student_class === selectedClass);
    }
    if (selectedSubject) {
      filtered = filtered.filter(r => r.subject === selectedSubject);
    }

    // Pass the actual current label for "all" so `config.filterByThirdFilter` can ignore it.
    // E.g., if selectedThirdFilter is '', pass `thirdFilterAllLabel` ('Years' or 'All Years').
    // If it's something else, pass it through.
    const effectiveThirdFilter = selectedThirdFilter || thirdFilterAllLabel;
    filtered = config.filterByThirdFilter(filtered, effectiveThirdFilter);

    return config.sortResources(filtered);
  }, [allResources, selectedClass, selectedSubject, selectedThirdFilter, thirdFilterAllLabel, config]);

  return (
    <div className="w-[min(96vw,1600px)] mx-auto px-[clamp(16px,2vw,32px)] max-md:pt-[10px] md:-mt-[20px] pb-[clamp(24px,3vw,48px)]">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-[clamp(12px,3vw,20px)] w-full">
        <button
          onClick={() => navigate(-1)}
          className="w-11 h-11 neu-raised rounded-full neu-raised-hover flex items-center justify-center cursor-pointer"
          aria-label="Go Back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <ProfileButton />
      </div>

      <div className="flex flex-col items-start max-md:gap-[32px] md:gap-[12px] mb-[clamp(12px,3vw,20px)]">
        <h1 className="text-[clamp(36px,5vw,56px)] leading-tight uppercase text-ink">{config.title}</h1>
      </div>

      {/* Educational Intro Section */}
      {config.resourceType === 'pyq' && (
        <LibraryEducationalGuide
          allResources={allResources}
          selectedClass={selectedClass}
          selectedSubject={selectedSubject}
          selectedYear={selectedThirdFilter}
        />
      )}
      {config.resourceType === 'notes' && (
        <NotesEducationalGuide
          allResources={allResources}
          selectedClass={selectedClass}
          selectedSubject={selectedSubject}
          selectedMedium={selectedThirdFilter}
        />
      )}

      {/* Filter Controls */}
      <div className="mb-[clamp(24px,4vw,40px)] flex w-full gap-[12px]">
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <Dropdown
            value={selectedClass || classAllLabel}
            onChange={(val) => {
              const newClass = val === classAllLabel ? '' : val;
              const targetUrl = buildCategoryUrl({
                basePath,
                studentClass: newClass,
                medium: config.thirdFilterType === 'medium' ? selectedThirdFilter : undefined,
                subject: selectedSubject,
                year: config.thirdFilterType === 'year' ? selectedThirdFilter : undefined,
              });
              navigate(targetUrl);
            }}
            options={[classAllLabel, ...uniqueClasses]}
          />
        </div>

        <div className="flex-[1.5] min-w-0 flex flex-col gap-2">
          <Dropdown
            value={selectedSubject || subjectAllLabel}
            onChange={(val) => {
              const newSubject = val === subjectAllLabel ? '' : val;
              const targetUrl = buildCategoryUrl({
                basePath,
                studentClass: selectedClass,
                medium: config.thirdFilterType === 'medium' ? selectedThirdFilter : undefined,
                subject: newSubject,
                year: config.thirdFilterType === 'year' ? selectedThirdFilter : undefined,
              });
              navigate(targetUrl);
            }}
            options={[subjectAllLabel, ...uniqueSubjects]}
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <Dropdown
            value={selectedThirdFilter || thirdFilterAllLabel}
            onChange={(val) => {
              const newThirdFilter = val === thirdFilterAllLabel ? '' : val;
              const targetUrl = buildCategoryUrl({
                basePath,
                studentClass: selectedClass,
                medium: config.thirdFilterType === 'medium' ? newThirdFilter : undefined,
                subject: selectedSubject,
                year: config.thirdFilterType === 'year' ? newThirdFilter : undefined,
              });
              navigate(targetUrl);
            }}
            options={[thirdFilterAllLabel, ...uniqueThirdFilterValues]}
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[18px]">
          {Array.from({ length: 8 }).map((_, idx) => (
            <MaterialCardSkeleton key={idx} />
          ))}
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="neu-raised rounded-2xl p-8 text-center flex flex-col items-center justify-center">
          <img
            src="/assets/SVG Illustrations/no-content-available.svg"
            alt=""
            className="w-48 h-48 mb-3 object-contain"
          />
          <p className="font-bold text-body1 mb-2">{config.emptyMessageTitle}</p>
          <p className="text-caption">{config.emptyMessageSubtitle}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[18px]">
          {filteredResources.map((resource, index) => {
            const showAd = config.showInFeedAd && index === 2;
            return (
              <Fragment key={resource.id}>
                {showAd && <LibraryInFeedAd key="library-in-feed-ad" />}
                <MaterialCard resource={resource} />
              </Fragment>
            );
          })}
        </div>
      )}

      {/* Feature Tiles at the Bottom */}
      <OtherResources currentCategoryId={config.otherResourcesCategory} />
    </div>
  );
};

export default ResourcePage;
