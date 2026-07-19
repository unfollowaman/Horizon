import { useState, useEffect, useMemo } from 'react';
import type React from 'react';
import { Link } from 'react-router-dom';
import type { Resource } from '../../types';
import { supabase } from '../../services/supabase';
import styles from './Library.module.css';

const Library: React.FC = () => {
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedClass, setSelectedClass] = useState<string>('Class 10');
  const [selectedSubject, setSelectedSubject] = useState<string>('All Subjects');
  const [selectedYear, setSelectedYear] = useState<string>('All Years');

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

    if (selectedClass && selectedClass !== 'All Classes') {
      filtered = filtered.filter(r => r.class === selectedClass);
    }
    if (selectedSubject !== 'All Subjects') {
      filtered = filtered.filter(r => r.subject === selectedSubject);
    }
    if (selectedYear !== 'All Years') {
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
    <div className="w-[min(96vw,1600px)] mx-auto px-[clamp(16px,2vw,32px)] max-md:pt-[10px] md:pt-[8px] pb-[clamp(24px,3vw,48px)]">
      {/* New Page Header */}
      <div className="flex flex-col items-start max-md:gap-[32px] md:gap-[12px] mb-[clamp(12px,3vw,20px)]">
        <div className={`animate-fade-rise ${styles.heroBrandPill} neu-raised`}>
          <img src="/assets/favicon/logo.png" alt="Horizon Logo" className={styles.heroBrandPillImg} />
          <div className={styles.heroBrandPillDivider}></div>
          <span className={styles.heroBrandPillText}>Horizon</span>
        </div>
        <h2 className="text-[clamp(36px,5vw,56px)] leading-tight uppercase text-ink">PYQ Papers</h2>
      </div>

      {/* Filter Controls */}
      <div className="mb-[clamp(24px,4vw,40px)] flex w-full gap-[12px]">
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="relative w-full neu-recessed rounded-lg h-[clamp(48px,6vw,64px)] flex items-center px-[clamp(8px,1.5vw,16px)] cursor-pointer focus-within:ring-2 focus-within:ring-ink/20">
            <svg className="h-[1.2em] w-[1.2em] text-ink/70 shrink-0 mr-[clamp(4px,1vw,12px)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
            <span className="text-ink text-[clamp(14px,1.5vw,18px)] font-bold flex-1 truncate pointer-events-none">{selectedClass}</span>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
            >
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
            <svg className="h-[1.2em] w-[1.2em] text-ink shrink-0 ml-[clamp(4px,1vw,12px)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        <div className="flex-[1.5] min-w-0 flex flex-col gap-2">
          <div className="relative w-full neu-recessed rounded-lg h-[clamp(48px,6vw,64px)] flex items-center px-[clamp(8px,1.5vw,16px)] cursor-pointer focus-within:ring-2 focus-within:ring-ink/20">
            <svg className="h-[1.2em] w-[1.2em] text-ink/70 shrink-0 mr-[clamp(4px,1vw,12px)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
            </svg>
            <span className="text-ink text-[clamp(14px,1.5vw,18px)] font-bold flex-1 truncate pointer-events-none">{selectedSubject}</span>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
            >
              <option value="All Subjects">All Subjects</option>
              {uniqueSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
            <svg className="h-[1.2em] w-[1.2em] text-ink shrink-0 ml-[clamp(4px,1vw,12px)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="relative w-full neu-recessed rounded-lg h-[clamp(48px,6vw,64px)] flex items-center px-[clamp(8px,1.5vw,16px)] cursor-pointer focus-within:ring-2 focus-within:ring-ink/20">
            <svg className="h-[1.2em] w-[1.2em] text-ink/70 shrink-0 mr-[clamp(4px,1vw,12px)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className="text-ink text-[clamp(14px,1.5vw,18px)] font-bold flex-1 truncate pointer-events-none">{selectedYear}</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
            >
              <option value="All Years">All Years</option>
              {uniqueYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <svg className="h-[1.2em] w-[1.2em] text-ink shrink-0 ml-[clamp(4px,1vw,12px)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
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
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[clamp(16px,2vw,32px)]">
          {filteredResources.map(resource => (
            <div key={resource.id} className="neu-raised p-[clamp(18px,2vw,24px)] rounded-xl flex flex-col h-full items-center text-center aspect-square">
              <div className="w-full flex-1 min-h-0 neu-recessed text-muted-foreground rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                {resource.thumbnailUrl ? (
                  <img src={resource.thumbnailUrl} alt={resource.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold font-mono text-xs p-2">PDF</span>
                )}
              </div>
              <h4 className="text-[clamp(22px,2.5vw,32px)] font-bold mb-1 text-ink leading-tight line-clamp-1">{`${resource.class} ${resource.subject} PYQ`}</h4>
              <p className="text-[clamp(14px,1.5vw,16px)] mb-3 text-ink/70 font-bold">{resource.year}</p>
              <div className="w-full flex gap-2 mt-auto">
                <Link to={`/resource/${resource.id}`} className="flex-1 h-[44px] flex items-center justify-center whitespace-nowrap text-sm font-bold neu-raised rounded-md hover:neu-raised-hover no-underline text-ink">
                  View
                </Link>
                {resource.pdfUrl && (
                  <a href={resource.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex-1 h-[44px] flex items-center justify-center whitespace-nowrap text-sm font-bold neu-raised rounded-md hover:neu-raised-hover no-underline text-ink">
                    Download
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Library;
