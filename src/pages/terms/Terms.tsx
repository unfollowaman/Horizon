import type React from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './Terms.module.css';

const Terms: React.FC = () => {
  useEffect(() => {
    document.title = 'Terms of Service | Horizon - Free Student Library';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        'Terms of Service for Horizon, an open educational platform. Read about accepted terms, educational resource usage, and platform guidelines.'
      );
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content =
        'Terms of Service for Horizon, an open educational platform. Read about accepted terms, educational resource usage, and platform guidelines.';
      document.head.appendChild(newMeta);
    }
  }, []);

  return (
    <div className={styles.termsContainer}>
      <header className={`${styles.header} neu-raised`}>
        <h1 className={styles.pageTitle}>Terms of <span className={styles.textGradient}>Service</span></h1>
        <p className={styles.lastUpdated}>Last Updated: May 15, 2024</p>
      </header>

      <div className={`${styles.contentCard} neu-card`}>
        <section className={styles.section}>
          <h2>1. Acceptance of Terms</h2>
          <p>
            Welcome to Horizon. By accessing, browsing, or creating an account on Horizon, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use our platform.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Description of Horizon</h2>
          <p>
            Horizon is a free student library and open educational platform created to provide accessible study materials, curated student notes, and previous year examination papers to support learning and academic preparation.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Educational Content and Usage</h2>
          <p>
            All study material, notes, past papers, and resources hosted on Horizon are provided exclusively for personal, educational, and non-commercial use.
          </p>
          <ul>
            <li><strong>Personal Study:</strong> You may view and study materials on the platform for your own educational improvement.</li>
            <li><strong>Non-Commercial Purpose:</strong> Content from Horizon may not be resold, redistributed for profit, or packaged into commercial study offerings without permission.</li>
            <li><strong>Accuracy & Updates:</strong> While we aim to provide accurate and updated educational content, resources are provided for supplemental study purposes.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. User Accounts & Responsibilities</h2>
          <p>
            Certain features, such as tracking study progress or customizing study preferences, require an account. When creating an account, you agree to:
          </p>
          <ul>
            <li>Provide accurate account information during registration.</li>
            <li>Maintain the confidentiality of your account credentials.</li>
            <li>Promptly notify us if you suspect unauthorized access to your account.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. Intellectual Property & Copyright</h2>
          <p>
            The Horizon logo, website design, branding, custom UI components, and software code are the intellectual property of Horizon. Educational resources, past papers, and study material hosted on the platform remain the property of their respective original copyright holders or contributors. If you believe any content infringes your copyright, please reach out through our <Link to="/contact" className={styles.inlineLink}>Contact</Link> page.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Prohibited & Abusive Use</h2>
          <p>
            To maintain a safe and reliable learning environment for all users, you agree not to:
          </p>
          <ul>
            <li>Attempt to bypass platform security, PDF view protections, or access controls.</li>
            <li>Use automated scripts, bots, or scraping tools to download bulk content off the platform.</li>
            <li>Use Horizon to distribute malicious software or disrupt site operations.</li>
            <li>Attempt to access another student's account or personal data.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>7. Third-Party Services</h2>
          <p>
            Horizon relies on trusted infrastructure providers including Supabase (data & authentication), Cloudflare Pages (hosting & content delivery), and Google Analytics (usage metrics). Your interaction with these third-party services is subject to their respective terms and our <Link to="/privacy-policy" className={styles.inlineLink}>Privacy Policy</Link>.
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. Service Availability & Changes</h2>
          <p>
            We strive to maintain constant availability of Horizon's learning resources. However, we reserve the right to modify, suspend, or update platform features, content, or study materials at any time to improve educational accuracy or system performance.
          </p>
        </section>

        <section className={styles.section}>
          <h2>9. Account Suspension & Termination</h2>
          <p>
            We reserve the right to suspend or terminate account access if a user violates these Terms of Service or engages in abusive behavior on the platform. You may also request deletion of your account at any time as described in our Privacy Policy.
          </p>
        </section>

        <section className={styles.section}>
          <h2>10. Disclaimer of Warranties</h2>
          <p>
            Horizon is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied. We do not guarantee that the platform will always be error-free, uninterrupted, or completely free of technical bugs.
          </p>
        </section>

        <section className={styles.section}>
          <h2>11. Limitation of Liability</h2>
          <p>
            In no event shall Horizon or its maintainers be liable for any indirect, incidental, or consequential damages arising from your use of or inability to access the platform or its study resources.
          </p>
        </section>

        <section className={styles.section}>
          <h2>12. Changes to Terms</h2>
          <p>
            We may update these Terms of Service periodically. Updated terms will be posted on this page with a revised "Last Updated" date. Continued use of Horizon after updates signifies acceptance of the revised terms.
          </p>
        </section>

        <section className={styles.section}>
          <h2>13. Contact Information</h2>
          <p>
            If you have questions regarding these Terms of Service or platform guidelines, please visit our <Link to="/contact" className={styles.inlineLink}>Contact</Link> page.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Terms;
