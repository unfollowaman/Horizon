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
        const mappedResources: Resource[] = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          category: item.type as any,
          uploadDate: item.created_at || new Date().toISOString(),
          pdfUrl: item.file_path ? supabase.storage.from('pdfs').getPublicUrl(item.file_path).data.publicUrl : (item.pdf_url || ''),
          thumbnailUrl: item.thumbnail_url || '',
          class: item.class,
          subject: item.subject,
          year: item.year ? item.year.toString() : undefined,
        }));
        setAllResources(mappedResources);
      }
      setLoading(false);
    };

    fetchResources();
  }, []);

  const uniqueClasses = useMemo(() => {
    const classes = new Set(allResources.map(r => r.class).filter(Boolean) as string[]);
    const sorted = Array.from(classes).sort();
    if (!sorted.includes('Class 10')) {
      sorted.unshift('Class 10');
    }
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
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12">
      {/* New Page Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
        <div className={`animate-fade-rise ${styles.heroBrandPill} neu-raised`}>
          <img src="/assets/favicon/logo.png" alt="Horizon Logo" className={styles.heroBrandPillImg} />
          <div className={styles.heroBrandPillDivider}></div>
          <span className={styles.heroBrandPillText}>Horizon</span>
        </div>
        <h2 className="text-h2 uppercase text-ink md:mb-4">PYQ Papers</h2>
      </div>

      {/* Filter Controls */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-caption font-bold text-ink">Class</label>
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="neu-recessed p-3 rounded-lg text-ink font-bold bg-transparent outline-none cursor-pointer"
          >
            {uniqueClasses.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-caption font-bold text-ink">Subject</label>
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="neu-recessed p-3 rounded-lg text-ink font-bold bg-transparent outline-none cursor-pointer"
          >
            <option value="All Subjects">All Subjects</option>
            {uniqueSubjects.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-caption font-bold text-ink">Year</label>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="neu-recessed p-3 rounded-lg text-ink font-bold bg-transparent outline-none cursor-pointer"
          >
            <option value="All Years">All Years</option>
            {uniqueYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredResources.map(resource => (
            <div key={resource.id} className="neu-raised p-3 md:p-4 rounded-xl flex flex-col items-center text-center">
              <div className="w-full aspect-[3/4] neu-recessed text-muted-foreground rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                {resource.thumbnailUrl ? (
                  <img src={resource.thumbnailUrl} alt={resource.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold font-mono text-xs p-2">PDF</span>
                )}
              </div>
              <h4 className="text-body1 font-bold mb-1 text-ink leading-tight line-clamp-2">{resource.subject || resource.title}</h4>
              <p className="text-caption mb-3 text-ink/70 font-bold">{resource.year}</p>
              <div className="w-full flex gap-2 mt-auto">
                <Link to={`/resource/${resource.id}`} className="flex-1 py-2 text-sm font-bold neu-raised rounded-md hover:neu-raised-hover no-underline text-ink">
                  View
                </Link>
                {resource.pdfUrl && (
                  <a href={resource.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 text-sm font-bold neu-raised rounded-md hover:neu-raised-hover no-underline text-ink">
                    Open
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
