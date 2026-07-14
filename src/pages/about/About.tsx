import type React from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './About.module.css';

const About: React.FC = () => {
  useEffect(() => {
    document.title = 'About Us | Horizon - Free Learning Platform';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Learn more about Horizon, a free online library offering study material, student notes, and previous year papers to simplify your educational experience.');
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content = 'Learn more about Horizon, a free online library offering study material, student notes, and previous year papers to simplify your educational experience.';
      document.head.appendChild(newMeta);
    }
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Horizon",
    "url": "https://horizon.com",
    "description": "Horizon is a free learning platform dedicated to providing students with high-quality educational resources, including study notes and past papers.",
    "foundingDate": "2024"
  };

  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
      <div className={styles.aboutContainer}>
        <header className={`${styles.aboutHeader} neu-raised`}>
          <h2 className={styles.pageTitle}>About <span className={styles.textGradient}>Horizon</span></h2>
          <p className={styles.pageSubtitle}>Empowering students through accessible, high-quality learning resources.</p>
        </header>

        <section className={styles.contentSection}>
          <div className={`${styles.card} neu-raised`}>
            <h3 className={styles.sectionTitle}>Our Mission</h3>
            <p className={styles.paragraph}>
              Welcome to Horizon! We believe that finding reliable study material shouldn't be the hardest part of your education. Our mission is simple: to make quality educational resources easily accessible to every student. By reducing the time and effort you spend searching for dependable student notes, we help you focus on what really matters—learning and growing. We want to keep your educational experience simple, organized, and entirely distraction-free.
            </p>
          </div>

          <div className={`${styles.card} neu-raised`}>
            <h3 className={styles.sectionTitle}>An Evolving Online Library</h3>
            <p className={styles.paragraph}>
              Horizon isn't just a static website; it's a growing free learning platform. We are continuously expanding our collection to include more books, detailed student notes, previous year papers, and specialized educational resources. As you progress in your academic journey, you can count on Horizon to grow alongside you, always bringing fresh and relevant content to your fingertips.
              Check out our <Link to="/library" className={styles.inlineLink}>Library</Link> to see our current offerings.
            </p>
          </div>

          <div className={`${styles.card} neu-raised`}>
            <h3 className={styles.sectionTitle}>Our Principles</h3>
            <ul className={styles.list}>
              <li><strong>Quality over quantity:</strong> We carefully select materials that offer real value.</li>
              <li><strong>Carefully organized content:</strong> So you can find what you need without the hassle.</li>
              <li><strong>Simple user experience:</strong> A clean, intuitive design that gets out of your way.</li>
              <li><strong>Fast performance:</strong> Less waiting, more studying.</li>
              <li><strong>Mobile-friendly & Accessible:</strong> Learn comfortably from any device, anywhere.</li>
            </ul>
          </div>

          <div className={`${styles.card} neu-raised`}>
            <h3 className={styles.sectionTitle}>Transparency & Quality</h3>
            <p className={styles.paragraph}>
              Trust is the foundation of any good educational platform. Our study material is meticulously selected and reviewed to ensure accuracy and relevance. We understand that educational standards and syllabi change, which is why our content is regularly updated to reflect the latest requirements. If you ever spot a mistake or come across outdated material, we strongly encourage you to let us know. You can reach out through our <Link to="/" className={styles.inlineLink}>Contact</Link> page or watch our <Link to="/" className={styles.inlineLink}>Announcements</Link> for updates.
            </p>
          </div>

          <div className={`${styles.card} neu-raised`}>
            <h3 className={styles.sectionTitle}>Privacy & Trust</h3>
            <p className={styles.paragraph}>
              We respect your privacy as much as we value your education. Horizon uses secure authentication methods to protect your account. We firmly believe in collecting only what is absolutely necessary to improve your learning experience—no unnecessary data harvesting, and no compromising your personal information. Your peace of mind is paramount to us.
            </p>
          </div>

          <div className={`${styles.card} neu-raised`}>
            <h3 className={styles.sectionTitle}>Looking Forward</h3>
            <p className={styles.paragraph}>
              Our vision for Horizon extends far beyond today. We aim to establish a long-term educational platform that stands as a reliable pillar of support for generations of students. By continuing to listen to our community and adapting to their needs, we will ensure that Horizon remains your trusted partner in learning.
            </p>
          </div>
        </section>
      </div>
    </>
  );
};

export default About;
