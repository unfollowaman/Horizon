import React, { useState, useEffect } from 'react';
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
      <h2 className="text-h1 uppercase mb-8 border-b-4 border-ink pb-4">Resource Library</h2>

      {/* Category Filter */}
      <div className="mb-8 flex gap-4 flex-wrap">
        <button
          onClick={() => handleCategoryChange('All')}
          className={`min-h-[44px] px-4 py-2 font-bold border-2 border-ink focus-visible:outline-accent-yellow ${activeCategory === 'All' ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-surface'}`}
        >
          All
        </button>
        {mockCategories.map(category => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className={`min-h-[44px] px-4 py-2 font-bold border-2 border-ink focus-visible:outline-accent-yellow ${activeCategory === category ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-surface'}`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Resource Grid */}
      {filteredResources.length === 0 ? (
        <div className="border-2 border-dashed border-ink p-8 text-center bg-paper">
          <p className="font-bold text-body1">No resources found for this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-6">
          {filteredResources.map(resource => (
            <div key={resource.id} className="border-2 border-ink p-4 rounded-md bg-paper shadow-elevated flex flex-col">
              <div className="h-32 bg-ink text-paper mb-4 flex items-center justify-center font-bold font-mono">
                [Thumbnail Placeholder]
              </div>
              <h4 className="text-h2 font-bold mb-2">{resource.title}</h4>
              <p className="mb-4 text-caption flex-1">{resource.description}</p>
              <div className="flex justify-between items-center mt-auto border-t-2 border-ink pt-4">
                <span className="text-caption font-bold border-2 border-ink p-1 bg-surface inline-block">
                  {resource.category}
                </span>
                <Link to={`/resource/${resource.id}`} className="inline-block p-2 font-bold underline decoration-2 underline-offset-4 hover:bg-accent-yellow">View Details</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Library;
