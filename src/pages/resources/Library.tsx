import { useState, useEffect, useMemo } from 'react';
import type React from 'react';
import { Link } from 'react-router-dom';
import type { Resource } from '../../types';
import { supabase } from '../../services/supabase';
import styles from './Library.module.css';
import { Dropdown } from '../../components/Dropdown';
import MaterialCard from '../../components/MaterialCard';

const Library: React.FC = () => {
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
  );

  const [selectedClass, setSelectedClass] = useState<string>(isDesktop ? 'Classes' : 'Class 10');
  const [selectedSubject, setSelectedSubject] = useState<string>(isDesktop ? 'All Subjects' : 'Subjects');
  const [selectedYear, setSelectedYear] = useState<string>(isDesktop ? 'All Years' : 'Years');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      if (e.matches) {
        setSelectedSubject(prev => prev === 'Subjects' ? 'All Subjects' : prev);
        setSelectedYear(prev => prev === 'Years' ? 'All Years' : prev);
        // Only switch Class 10 to Classes if it's considered the "default" transition.
        // We do this to ensure they see the desktop default when resizing from mobile default.
        setSelectedClass(prev => prev === 'Class 10' ? 'Classes' : prev);
      } else {
        setSelectedSubject(prev => prev === 'All Subjects' ? 'Subjects' : prev);
        setSelectedYear(prev => prev === 'All Years' ? 'Years' : prev);
        setSelectedClass(prev => prev === 'Classes' ? 'Class 10' : prev);
      }
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('books').select('*').eq('type', 'pyq');

      if (error) {
        console.error('Error fetching resources:', error);
        setAllResources([]);
      } else if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedResources: Resource[] = data.map((item: any) => {
          let className = item.class;
          if (className) {
            const strClass = String(className);
            const trimmed = strClass.trim();
            if (/^\d+$/.test(trimmed)) {
              className = `Class ${trimmed}`;
            } else if (/^class\s+\d+$/i.test(trimmed)) {
              const numMatch = trimmed.match(/\d+/);
              if (numMatch) {
                className = `Class ${numMatch[0]}`;
              }
            } else {
              className = trimmed;
            }
          }

          return {
            id: item.id,
            title: item.title,
            description: item.description,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            category: item.type as any,
            uploadDate: item.created_at || new Date().toISOString(),
            pdfUrl: item.file_path ? supabase.storage.from('pdfs').getPublicUrl(item.file_path).data.publicUrl : (item.pdf_url || ''),
            thumbnailUrl: item.thumbnail_url || '',
            class: className,
            subject: item.subject,
            year: item.year ? item.year.toString() : undefined,
          };
        });
        setAllResources(mappedResources);
      }
      setLoading(false);
    };

    fetchResources();
  }, []);

  const uniqueClasses = useMemo(() => {
    const classes = new Set(allResources.map(r => r.class).filter(Boolean) as string[]);
    if (!classes.has('Class 10')) {
      classes.add('Class 10');
    }
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

  const uniqueYears = useMemo(() => {
    const years = new Set(allResources.map(r => r.year).filter(Boolean) as string[]);
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [allResources]);

  const filteredResources = useMemo(() => {
    let filtered = allResources;

    if (selectedClass && selectedClass !== 'All Classes' && selectedClass !== 'Classes') {
      filtered = filtered.filter(r => r.class === selectedClass);
    }
    if (selectedSubject !== 'Subjects' && selectedSubject !== 'All Subjects') {
      filtered = filtered.filter(r => r.subject === selectedSubject);
    }
    if (selectedYear !== 'Years' && selectedYear !== 'All Years') {
      filtered = filtered.filter(r => r.year === selectedYear);
    }

    // Sort descending by year
    return filtered.sort((a, b) => {
      const yearA = a.year ? parseInt(a.year) : 0;
      const yearB = b.year ? parseInt(b.year) : 0;
      return yearB - yearA;
    });
  }, [allResources, selectedClass, selectedSubject, selectedYear]);

  return (
    <div className="w-[min(96vw,1600px)] mx-auto px-[clamp(16px,2vw,32px)] max-md:pt-[10px] md:-mt-[20px] pb-[clamp(24px,3vw,48px)]">
      {/* New Page Header */}
      <div className="flex flex-col items-start max-md:gap-[32px] md:gap-[12px] mb-[clamp(12px,3vw,20px)]">
        <Link to="/" onClick={() => window.scrollTo(0, 0)} className={`animate-fade-rise ${styles.heroBrandPill} neu-raised no-underline`}>
          <img src="/assets/favicon/logo.png" alt="Horizon Logo" className={styles.heroBrandPillImg} />
          <div className={styles.heroBrandPillDivider}></div>
          <span className={styles.heroBrandPillText}>Horizon</span>
        </Link>
        <h2 className="text-[clamp(36px,5vw,56px)] leading-tight uppercase text-ink">PYQ Papers</h2>
      </div>

      {/* Filter Controls */}
      <div className="mb-[clamp(24px,4vw,40px)] flex w-full gap-[12px]">
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <Dropdown
            value={selectedClass}
            onChange={setSelectedClass}
            options={isDesktop ? ['Classes', ...uniqueClasses] : uniqueClasses}
          />
        </div>

        <div className="flex-[1.5] min-w-0 flex flex-col gap-2">
          <Dropdown
            value={selectedSubject}
            onChange={setSelectedSubject}
            options={isDesktop ? ['All Subjects', ...uniqueSubjects] : ['Subjects', ...uniqueSubjects]}
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <Dropdown
            value={selectedYear}
            onChange={setSelectedYear}
            options={isDesktop ? ['All Years', ...uniqueYears] : ['Years', ...uniqueYears]}
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="neu-recessed rounded-2xl p-8 text-center">
          <p className="font-bold text-body1">Loading resources...</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="neu-recessed rounded-2xl p-8 text-center">
          <p className="font-bold text-body1 mb-2">No previous year papers found.</p>
          <p className="text-caption">Try selecting a different class, subject, or year.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[18px]">
          {filteredResources.map(resource => (
            <MaterialCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Library;
