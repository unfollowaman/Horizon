import { useState, useEffect, useMemo } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Resource, ResourceType } from '../../types';
import { fetchLearningResources } from '../../services/learningResourcesAPI';

import { Dropdown } from '../../components/Dropdown';
import MaterialCard from '../../components/MaterialCard';
import OtherResources from '../../components/OtherResources';
import ProfileButton from '../../components/ProfileButton';

export interface ResourcePageConfig {
  resourceType: ResourceType;
  title: string;
  includeChapters?: boolean;
  thirdFilterType: 'year' | 'medium';
  emptyMessageTitle: string;
  emptyMessageSubtitle: string;
  otherResourcesCategory: ResourceType | 'updates';
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
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
  );

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

      {/* Filter Controls */}
      <div className="mb-[clamp(24px,4vw,40px)] flex w-full gap-[12px]">
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <Dropdown
            value={selectedClass || classAllLabel}
            onChange={(val) => setSelectedClass(val === classAllLabel ? '' : val)}
            options={[classAllLabel, ...uniqueClasses]}
          />
        </div>

        <div className="flex-[1.5] min-w-0 flex flex-col gap-2">
          <Dropdown
            value={selectedSubject || subjectAllLabel}
            onChange={(val) => setSelectedSubject(val === subjectAllLabel ? '' : val)}
            options={[subjectAllLabel, ...uniqueSubjects]}
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <Dropdown
            value={selectedThirdFilter || thirdFilterAllLabel}
            onChange={(val) => setSelectedThirdFilter(val === thirdFilterAllLabel ? '' : val)}
            options={[thirdFilterAllLabel, ...uniqueThirdFilterValues]}
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="neu-recessed rounded-2xl p-8 text-center">
          <p className="font-bold text-body1">Loading resources...</p>
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
          {filteredResources.map(resource => (
            <MaterialCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}

      {/* Feature Tiles at the Bottom */}
      <OtherResources currentCategoryId={config.otherResourcesCategory} />
    </div>
  );
};

export default ResourcePage;
