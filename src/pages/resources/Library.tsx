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
      <h2>Resource Library</h2>

      {/* Category Filter */}
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => handleCategoryChange('All')}
          style={{ fontWeight: activeCategory === 'All' ? 'bold' : 'normal', padding: '0.5rem 1rem' }}
        >
          All
        </button>
        {mockCategories.map(category => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            style={{ fontWeight: activeCategory === category ? 'bold' : 'normal', padding: '0.5rem 1rem' }}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Resource Grid */}
      {filteredResources.length === 0 ? (
        <p>No resources found for this category.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {filteredResources.map(resource => (
            <div key={resource.id} style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '4px' }}>
              <div style={{ height: '120px', backgroundColor: '#e0e0e0', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#666' }}>[Thumbnail Placeholder]</span>
              </div>
              <h4 style={{ margin: '0 0 0.5rem 0' }}>{resource.title}</h4>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#555' }}>{resource.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', backgroundColor: '#eee', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                  {resource.category}
                </span>
                <Link to={`/resource/${resource.id}`}>View Details</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Library;
