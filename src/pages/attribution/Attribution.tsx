import type React from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './Attribution.module.css';

const Attribution: React.FC = () => {
  useEffect(() => {
    document.title = 'Attribution & Sourcing | Horizon - Free Student Library';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Content sourcing policy, examination paper attributions, third-party illustrations, and copyright takedown contact details for Horizon.');
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content = 'Content sourcing policy, examination paper attributions, third-party illustrations, and copyright takedown contact details for Horizon.';
      document.head.appendChild(newMeta);
    }
  }, []);

  return (
    <div className={styles.privacyContainer}>
      <header className={`${styles.header} neu-raised`}>
        <h1 className={styles.pageTitle}><span className={styles.textGradient}>Attribution &amp; Sourcing</span></h1>
      </header>

      <div className={styles.contentCard}>
        <div className={`${styles.section} neu-raised`}>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '1.125rem', lineHeight: '1.7', margin: 0 }}>
            Horizon is committed to full transparency regarding third-party creative assets and official examination material used across our educational platform.
          </p>
        </div>

        <section className={`${styles.section} neu-raised`}>
          <h2>Educational Content Sourcing</h2>
          <p>
            Previous Year Question (PYQ) papers hosted on Horizon are official examination papers originally published by the <strong>Rajasthan Board of Secondary Education (RBSE)</strong> via their official website (<a href="https://rajeduboard.rajasthan.gov.in" target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>rajeduboard.rajasthan.gov.in</a>).
          </p>
          <p>
            Horizon reformats these question papers to enhance readability, layout consistency, and responsive viewing on mobile devices and digital displays. Horizon does not claim authorship or ownership of original examination questions or board paper content — all copyright and intellectual property rights to the original examination papers remain with the Rajasthan Board of Secondary Education (RBSE).
          </p>
          <p>
            These papers are provided free of charge strictly for personal, non-commercial educational use by students for revision, self-assessment, and exam preparation.
          </p>
          <p>
            Horizon respects the intellectual property rights of original educational publishers and examination boards. If you are a representative of RBSE or another authorized rights holder and wish to request content removal or modification, please contact us at <a href="mailto:tryhorizon18@gmail.com" className={styles.inlineLink}>tryhorizon18@gmail.com</a> or visit our <Link to="/contact" className={styles.inlineLink}>Contact</Link> page. Valid rights-holder takedown requests will be processed promptly.
          </p>
        </section>

        <section className={`${styles.section} neu-raised`}>
          <h2>Illustrations</h2>
          <h3>Storyset</h3>
          <ul>
            <li>
              <a href="https://storyset.com/education" target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                Education illustrations — Storyset
              </a>
            </li>
            <li>
              <a href="https://storyset.com/people" target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                People illustrations — Storyset
              </a>
            </li>
            <li>
              <a href="https://storyset.com/work" target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                Work illustrations — Storyset
              </a>
            </li>
            <li>
              <a href="https://storyset.com/city" target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                City illustrations — Storyset
              </a>
            </li>
            <li>
              <a href="https://storyset.com/user" target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                User illustrations — Storyset
              </a>
            </li>
            <li>
              <a href="https://storyset.com/communication" target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                Communication illustrations — Storyset
              </a>
            </li>
          </ul>
        </section>

        <section className={`${styles.section} neu-raised`}>
          <h2>Icons</h2>
          <h3>Icons8</h3>
          <p>
            Icons used in Horizon are provided by <a href="https://icons8.com" target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>Icons8</a>.
          </p>
          <ul>
            <li>
              <a href="https://icons8.com/icon/32292/instagram" target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                Instagram — Icons8
              </a>
            </li>
            <li>
              <a href="https://icons8.com/icon/fJp7hepMryiw/x" target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                X — Icons8
              </a>
            </li>
            <li>
              <a href="https://icons8.com/icon/rUgzXdXFnhmg/gmail" target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                Gmail — Icons8
              </a>
            </li>
            <li>
              <a href="https://icons8.com/icon/v551nqGeHhGn/github" target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                GitHub — Icons8
              </a>
            </li>
            <li>
              <a href="https://icons8.com/icon/ios/substack" target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                Substack — Icons8
              </a>
            </li>
          </ul>
        </section>

      </div>
    </div>
  );
};

export default Attribution;
