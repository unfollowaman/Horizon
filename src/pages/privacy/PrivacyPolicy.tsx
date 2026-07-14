import type React from 'react';
import { useEffect } from 'react';
import styles from './PrivacyPolicy.module.css';

const PrivacyPolicy: React.FC = () => {
  useEffect(() => {
    document.title = 'Privacy Policy | Horizon - Free Student Library';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Privacy Policy for Horizon, a free online educational platform offering study material and student library resources. Read how we protect your information.');
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content = 'Privacy Policy for Horizon, a free online educational platform offering study material and student library resources. Read how we protect your information.';
      document.head.appendChild(newMeta);
    }
  }, []);

  return (
    <div className={styles.privacyContainer}>
      <header className={`${styles.header} neu-raised`}>
        <h1 className={styles.pageTitle}>Privacy <span className={styles.textGradient}>Policy</span></h1>
        <p className={styles.lastUpdated}>Last Updated: May 15, 2024</p>
      </header>

      <div className={`${styles.contentCard} neu-card`}>
        <section className={styles.section}>
          <h2>1. Introduction</h2>
          <p>
            Welcome to Horizon. We are committed to protecting your privacy and ensuring a secure learning environment. Horizon is a free student library and educational platform designed to provide study material, notes, and previous year papers. This Privacy Policy explains how we handle your personal information when you use our website.
          </p>
          <p>
            By accessing or using Horizon, you agree to the practices described in this Privacy Policy. We aim to keep our policies simple, transparent, and easy for students and parents to understand.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Information We Collect</h2>
          <p>
            We strongly believe in collecting only the absolute minimum amount of information necessary to provide you with our educational platform.
          </p>

          <h3>Information You Provide</h3>
          <p>
            When you create an account on Horizon, we collect the following information:
          </p>
          <ul>
            <li><strong>Email Address:</strong> Used for account creation, authentication, and password recovery.</li>
            <li><strong>Password:</strong> A secure, encrypted password used to protect your account.</li>
            <li><strong>Profile Information:</strong> Any optional information you choose to add to your user profile.</li>
          </ul>

          <h3>Information Collected Automatically</h3>
          <p>
            We do not collect unnecessary technical data. When you access Horizon, standard server logs may temporarily record basic information such as your IP address and browser type. This information is strictly used for ensuring platform security and preventing abuse.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. How We Use Your Information</h2>
          <p>
            We use the information we collect for the following specific purposes:
          </p>
          <ul>
            <li>To create and manage your secure user account.</li>
            <li>To authenticate you when you log in.</li>
            <li>To maintain your preferences and saved study materials.</li>
            <li>To ensure the overall security and stability of the platform.</li>
          </ul>
          <p>
            We do not use your personal information for targeted advertising, and we do not send promotional or marketing emails.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Authentication and Account Security</h2>
          <p>
            Horizon uses <strong>Supabase Authentication</strong> to handle secure user logins. When you sign up, your credentials are processed securely by Supabase. Your passwords are encrypted and never stored in plain text. We prioritize your account security and follow industry-standard practices to protect your data against unauthorized access.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Cookies and Local Storage</h2>
          <p>
            Horizon <strong>does not</strong> use tracking cookies for marketing or advertising purposes.
          </p>
          <p>
            We only use essential local storage mechanisms (such as browser <code>localStorage</code> or secure session tokens provided by Supabase) solely to keep you logged in securely while you use the platform. These strictly necessary tokens are required for the website to function correctly.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Third-Party Services</h2>
          <p>
            To provide you with a fast and reliable educational platform, Horizon relies on a carefully selected group of trusted third-party infrastructure providers:
          </p>
          <ul>
            <li><strong>Supabase Database & Storage:</strong> We use Supabase to securely store your account profile information and host our library of educational resources.</li>
            <li><strong>Cloudflare Pages:</strong> We use Cloudflare to host our website securely and deliver content to you quickly.</li>
          </ul>
          <p>
            We explicitly <strong>do not</strong> use third-party analytics services (such as Google Analytics), tracking pixels, or third-party advertising networks.
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. Data Sharing and Disclosure</h2>
          <p>
            Your trust is extremely important to us. <strong>We do not sell, rent, or trade your personal information to anyone.</strong>
          </p>
          <p>
            We will only disclose your information if required to do so by law, or to protect the rights, property, and safety of Horizon, its users, or the public.
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. Data Retention</h2>
          <p>
            We retain your email address and profile information only for as long as your Horizon account remains active. This is necessary to provide you with ongoing access to our study materials. If you choose to delete your account, your personal information will be permanently removed from our active databases.
          </p>
        </section>

        <section className={styles.section}>
          <h2>9. User Rights</h2>
          <p>
            You have full control over the data you provide to Horizon. You have the right to:
          </p>
          <ul>
            <li>Access the personal information we hold about you.</li>
            <li>Correct any inaccurate or incomplete information.</li>
            <li>Request the deletion of your account and associated personal data.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>10. Account Deletion</h2>
          <p>
            You can request to delete your account at any time. When you initiate an account deletion request, your profile information and authentication data will be permanently erased from our Supabase database. Because we do not maintain complex user tracking, deletion is a straightforward process.
          </p>
        </section>

        <section className={styles.section}>
          <h2>11. Children's Privacy</h2>
          <p>
            Horizon is an educational platform designed for students of various ages. However, we do not knowingly collect personal information from children under the age of 13 without verifiable parental consent. If you are a parent or guardian and believe we have inadvertently collected information from your child, please contact us so we can promptly delete the data.
          </p>
        </section>

        <section className={styles.section}>
          <h2>12. Security Measures</h2>
          <p>
            We take the security of your data very seriously. Horizon employs technical and organizational measures to safeguard your information, including the use of HTTPS encryption for all data transmitted between your device and our servers, and secure authentication protocols provided by Supabase. While no system can be completely secure, we continually review our practices to ensure your data remains protected.
          </p>
        </section>

        <section className={styles.section}>
          <h2>13. International Data Transfers</h2>
          <p>
            Horizon and its infrastructure providers (such as Supabase and Cloudflare) operate globally. By using our platform, you acknowledge that your basic account information may be transferred to and processed in countries outside of your country of residence, where data protection laws may differ. We rely on standard industry safeguards to ensure this data remains protected.
          </p>
        </section>

        <section className={styles.section}>
          <h2>14. Policy Updates</h2>
          <p>
            We may update this Privacy Policy occasionally to reflect changes in our platform or legal requirements. When we make updates, we will revise the "Last Updated" date at the top of this page. We encourage you to review this policy periodically. Your continued use of Horizon after any changes indicates your acceptance of the updated policy.
          </p>
        </section>

        <section className={styles.section}>
          <h2>15. Contact Information</h2>
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle your personal information, please feel free to reach out to us. You can find our contact details on the <a href="/" className={styles.inlineLink}>Contact</a> page of our website.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;