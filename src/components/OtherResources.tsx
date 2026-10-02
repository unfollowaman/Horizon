import React, { useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import styles from './OtherResources.module.css';
import { getAllFeatures } from '../config/resources';
import type { ResourceType } from '../types';

interface OtherResourcesProps {
  currentCategoryId: ResourceType | 'updates'; // The id of the current category to exclude
}

const OtherResourcesComponent: React.FC<OtherResourcesProps> = ({ currentCategoryId }) => {
  // Memoize feature filtering to prevent redundant array allocations and method calls on parent re-renders
  const displayFeatures = useMemo(() => {
    return getAllFeatures()
      .filter(f => f.id !== currentCategoryId)
      .slice(0, 4);
  }, [currentCategoryId]);

  return (
    <div className={styles.otherResourcesContainer}>
      <div className={styles.featuresGrid}>
        {displayFeatures.map((f, i) => (
          <div key={i} className={`${styles.featureCard} animate-fade-rise`}>
            {f.path ? (
              <Link to={f.path} className="absolute inset-0 z-20 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2" aria-label={`Go to ${f.title}`} onClick={() => window.scrollTo(0, 0)} />
            ) : null}
            <div className={styles.featureCardInner} />
            <div className={styles.featureCardContent}>
              <h3 className={styles.featureCardTitle}>{f.title}</h3>
              <p className={styles.featureCardDesc}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const OtherResources = memo(OtherResourcesComponent);
OtherResources.displayName = 'OtherResources';

export default OtherResources;
