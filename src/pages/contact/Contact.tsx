import type React from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './Contact.module.css';

const Contact: React.FC = () => {
  useEffect(() => {
    document.title = 'Contact Us | Horizon - Free Student Library';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        'Get in touch with Horizon. We welcome student feedback, support requests, issue reports, and suggestions for expanding our study library.'
      );
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content =
        'Get in touch with Horizon. We welcome student feedback, support requests, issue reports, and suggestions for expanding our study library.';
      document.head.appendChild(newMeta);
    }
  }, []);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Horizon',
    url: 'https://unfollowaman.tech',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support'
    }
  };

  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
      <div className={styles.contactContainer}>
        <header className={`${styles.header} neu-raised`}>
          <h1 className={styles.pageTitle}>Contact <span className={styles.textGradient}>Horizon</span></h1>
          <p className={styles.pageSubtitle}>
            Have questions, feedback, or need support? We are dedicated to providing students with an accessible, distraction-free educational experience.
          </p>
        </header>

        <div className={styles.contentGrid}>
          <section className={`${styles.card} neu-raised`}>
            <h2 className={styles.cardTitle}>How Can We Help?</h2>
            <p className={styles.paragraph}>
              Horizon is a free online student library providing study notes, previous year papers, and educational resources. We value community input to keep our platform accurate and relevant.
            </p>
            <ul className={styles.list}>
              <li><strong>Support & Guidance:</strong> Assistance with navigating study materials or using platform features.</li>
              <li><strong>Content Feedback:</strong> Reporting typos, errors, or outdated material in study notes and past papers.</li>
              <li><strong>Resource Requests:</strong> Recommending new subjects, classes, or papers to add to our library.</li>
              <li><strong>Technical Issues:</strong> Reporting website bugs or accessibility concerns.</li>
            </ul>
          </section>

          <section className={`${styles.card} neu-raised`}>
            <h2 className={styles.cardTitle}>Connect & Support</h2>
            <p className={styles.paragraph}>
              Reach out directly or connect with us on social media for updates, feedback, and support:
            </p>
            <div className={styles.socialGrid}>
              <a href="mailto:tryhorizon18@gmail.com" className={`${styles.socialItem} neu-raised neu-raised-hover`}>
                <img src="/assets/Social Links/gmail.png" alt="Gmail" className={styles.socialIcon} />
                <span className={styles.socialLabel}>Gmail</span>
                <span className={styles.socialHandle}>tryhorizon18@gmail.com</span>
              </a>
              <a href="https://x.com/unfollowaman" target="_blank" rel="noopener noreferrer" className={`${styles.socialItem} neu-raised neu-raised-hover`}>
                <img src="/assets/Social Links/twitter-x.png" alt="X" className={styles.socialIcon} />
                <span className={styles.socialLabel}>X</span>
                <span className={styles.socialHandle}>@unfollowaman</span>
              </a>
              <a href="https://github.com/unfollowaman" target="_blank" rel="noopener noreferrer" className={`${styles.socialItem} neu-raised neu-raised-hover`}>
                <img src="/assets/Social Links/github.png" alt="GitHub" className={styles.socialIcon} />
                <span className={styles.socialLabel}>GitHub</span>
                <span className={styles.socialHandle}>@unfollowaman</span>
              </a>
              <a href="https://www.instagram.com/unfollowaman_" target="_blank" rel="noopener noreferrer" className={`${styles.socialItem} neu-raised neu-raised-hover`}>
                <img src="/assets/Social Links/instagram.png" alt="Instagram" className={styles.socialIcon} />
                <span className={styles.socialLabel}>Instagram</span>
                <span className={styles.socialHandle}>@unfollowaman_</span>
              </a>
              <a href="https://substack.com/@unfollowaman" target="_blank" rel="noopener noreferrer" className={`${styles.socialItem} neu-raised neu-raised-hover`}>
                <img src="/assets/Social Links/substack.png" alt="Substack" className={styles.socialIcon} />
                <span className={styles.socialLabel}>Substack</span>
                <span className={styles.socialHandle}>@unfollowaman</span>
              </a>
            </div>
            <p className={styles.paragraph} style={{ marginTop: 'var(--spacing-2)' }}>
              Before reaching out, you may also find quick answers regarding data privacy and platform operations on our <Link to="/privacy-policy" className={styles.inlineLink}>Privacy Policy</Link> page or learn more about our mission on the <Link to="/about" className={styles.inlineLink}>About Us</Link> page.
            </p>
          </section>
        </div>
      </div>
    </>
  );
};

export default Contact;
