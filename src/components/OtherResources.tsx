import type React from 'react';
import { Link } from 'react-router-dom';
import styles from './OtherResources.module.css';

interface OtherResourcesProps {
  currentCategory: string; // The title of the current category to exclude
}

const allFeatures = [
  { title: "PYQ Papers", desc: "Past papers to help you prepare effectively.", path: "/library" },
  { title: "Flashcards", desc: "Quick-recall cards for fast revision.", path: "/coming-soon" },
  { title: "MCQ Sets", desc: "Exam-oriented questions and practice material.", path: "/coming-soon" },
  { title: "Revision Sheets", desc: "Condensed sheets for quick topic overview.", path: "/coming-soon" },
  { title: "Study Notes", desc: "Comprehensive notes for all subjects.", path: "/notes" },
  { title: "Updates", desc: "Stay updated with newly uploaded resources.", path: "/coming-soon" }
];

const OtherResources: React.FC<OtherResourcesProps> = ({ currentCategory }) => {
  // Filter out the current category and take the first 4
  const displayFeatures = allFeatures
    .filter(f => f.title !== currentCategory)
    .slice(0, 4);

  return (
    <div className={styles.otherResourcesContainer}>
      <div className={styles.featuresGrid}>
        {displayFeatures.map((f, i) => (
          <div key={i} className={`${styles.featureCard} animate-fade-rise`}>
            {f.path ? (
              <Link to={f.path} className="absolute inset-0 z-20" aria-label={`Go to ${f.title}`} onClick={() => window.scrollTo(0, 0)} />
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

export default OtherResources;
