import { useState, useEffect } from 'react';
import type React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { mockResources, mockCategories } from '../../data/mock';
import type { Category, Resource } from '../../types';

const Library: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryQuery = searchParams.get('category') as Category | null;

  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [filteredResources, setFilteredResources] = useState<Resource[]>(mockResources);

  useEffect(() => {
    if (categoryQuery && mockCategories.includes(categoryQuery)) {

      setActiveCategory(categoryQuery);
    } else {

      setActiveCategory('All');
    }
  }, [categoryQuery]);

  useEffect(() => {
    if (activeCategory === 'All') {

      setFilteredResources(mockResources);
    } else {

      setFilteredResources(mockResources.filter(r => r.category === activeCategory));
    }
  }, [activeCategory]);

  const handleCategoryChange = (category: Category | 'All') => {
    if (category === 'All') {
      setSearchParams({});
    } else {
      setSearchParams({ category });
    }
  };

  return (
    <div>
      <h2 className="text-h1 uppercase mb-8 pb-4 text-ink">Resource Library</h2>

      {/* Category Filter */}
      <div className="mb-8 flex gap-4 flex-wrap">
        <button
          onClick={() => handleCategoryChange('All')}
          className={`min-h-[44px] px-4 py-2 font-bold rounded-md ${activeCategory === 'All' ? 'neu-recessed text-ink' : 'neu-raised text-ink hover:neu-raised-hover'}`}
        >
          All
        </button>
        {mockCategories.map(category => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className={`min-h-[44px] px-4 py-2 font-bold rounded-md ${activeCategory === category ? 'neu-recessed text-ink' : 'neu-raised text-ink hover:neu-raised-hover'}`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Resource Grid */}
      {filteredResources.length === 0 ? (
        <div className="neu-recessed rounded-2xl p-8 text-center">
          <p className="font-bold text-body1">No resources found for this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-6">
          {filteredResources.map(resource => (
            <div key={resource.id} className="neu-card p-4 rounded-2xl flex flex-col">
              <div className="h-32 neu-recessed text-muted-foreground rounded-lg mb-4 flex items-center justify-center font-bold font-mono border-none">
                [Thumbnail Placeholder]
              </div>
              <h4 className="text-h2 font-bold mb-2">{resource.title}</h4>
              <p className="mb-4 text-caption flex-1">{resource.description}</p>
              <div className="flex justify-between items-center mt-auto pt-4">
                <span className="text-caption font-bold neu-recessed p-1 rounded-sm inline-block">
                  {resource.category}
                </span>
                <Link to={`/resource/${resource.id}`} className="inline-block p-2 font-bold neu-raised rounded-md hover:neu-raised-hover no-underline">View Details</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Library;
