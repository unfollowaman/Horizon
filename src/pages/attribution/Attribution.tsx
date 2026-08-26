import type React from 'react';
import { useEffect } from 'react';
import styles from './Attribution.module.css';

const Attribution: React.FC = () => {
  useEffect(() => {
    document.title = 'Attribution | Horizon - Free Student Library';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Attribution for third-party illustrations and icons used in Horizon.');
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content = 'Attribution for third-party illustrations and icons used in Horizon.';
      document.head.appendChild(newMeta);
    }
  }, []);

  return (
    <div className={styles.privacyContainer}>
      <header className={`${styles.header} neu-raised`}>
        <h1 className={styles.pageTitle}><span className={styles.textGradient}>Attribution</span></h1>
      </header>

      <div className={styles.contentCard}>
        <div className={`${styles.section} neu-raised`}>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '1.125rem', lineHeight: '1.7', margin: 0 }}>
            Horizon uses third-party illustrations and icons throughout the platform. We gratefully acknowledge the creators and services that provide these resources.
          </p>
        </div>

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
