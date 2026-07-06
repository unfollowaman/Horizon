import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { navLinks } from '../../data/navigation';
import styles from './Home.module.css';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Assuming hero section is ~100vh
      const threshold = window.innerHeight * 0.8;
      setScrolledPastHero(window.scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className={styles.headerContainer}>
      {/* Desktop Header */}
      <div className={`${styles.desktopHeader} ${scrolledPastHero ? styles.desktopHeaderScrolled : styles.desktopHeaderTop}`}>
        {/* Brand Logo (Desktop) */}
        <Link to="/" className={`${styles.brandLogoDesktop} neu-raised`}>
          <img src="/assets/favicon/logo.png" alt="Horizon Logo" className={styles.brandLogoImg} />
          <div className={styles.brandLogoDivider}></div>
          <span className={styles.brandLogoText}>
            Horizon
          </span>
        </Link>

        {/* Navigation */}
        <nav className={`${styles.navGroup} neu-raised`}>
          {navLinks.filter(link => link.showOnDesktop).map((link, index) => (
            <Link
              key={index}
              to={link.path}
              className={styles.navItem}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Get Started */}
        <Link to="/" className={`${styles.getStartedBtn} neu-raised neu-raised-hover`}>
          Get Started
        </Link>
      </div>

      {/* Mobile Header Component */}
      <div className={styles.mobileHeaderContainer}>
        <div className={styles.mobileHeaderRelative}>
          {/* Top Bar */}
          <div className={styles.mobileTopBar}>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`${styles.hamburgerBtn} neu-raised ${scrolledPastHero || isMobileMenuOpen ? styles.hamburgerVisible : styles.hamburgerHidden}`}
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <svg className={styles.hamburgerIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Expanded Menu Overlay */}
          <div className={`${styles.menuOverlayWrapper} ${isMobileMenuOpen ? styles.menuOverlayVisible : styles.menuOverlayHidden}`}>
            <div className={styles.menuBackdrop} onClick={closeMenu} aria-hidden="true" />

            <div className={styles.menuContentWrapper}>
              <div className={`${styles.menuPanel} neu-raised ${isMobileMenuOpen ? styles.menuPanelActive : styles.menuPanelInactive}`}>
                {/* Menu Header */}
                <div className={styles.menuHeader}>
                  {/* Logo */}
                  <div className={styles.menuBrandIcon}>
                    <img src="/assets/favicon/logo.png" alt="Horizon Logo" className={styles.menuBrandLogoImg} />
                  </div>
                  {/* Close Button */}
                  <button onClick={closeMenu} className={styles.menuCloseBtn}>
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Navigation Links */}
                <nav className={styles.menuNavLinks}>
                  {navLinks.filter(link => link.showOnMobile).map((link, index) => (
                    <Link
                      key={index}
                      to={link.path}
                      onClick={closeMenu}
                      className={styles.menuNavLink}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                {/* Action Buttons */}
                <div className={styles.menuActionButtons}>
                  <Link to="/" onClick={closeMenu} className={styles.menuSignInBtn}>
                    Sign in
                  </Link>
                  <Link to="/" onClick={closeMenu} className={styles.menuGetNowBtn}>
                    Get now
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

const HeroSection = () => (
  <section className={styles.heroSection}>
    {/* Video background */}


    {/* Video to Next Section Blend Overlays */}
    <div className={styles.heroVignette} />
    <div className={styles.heroGradientFade} />

    {/* Content */}
    <div className={styles.heroContent}>

      {/* Brand Pill Logo */}
      <div className={`animate-fade-rise ${styles.heroBrandPill} neu-raised`}>
        <img src="/assets/favicon/logo.png" alt="Horizon Logo" className={styles.heroBrandPillImg} />
        <div className={styles.heroBrandPillDivider}></div>
        <span className={styles.heroBrandPillText}>
          Horizon
        </span>
      </div>

      <h1 className={`animate-fade-rise ${styles.heroTitle}`}>
        Resources for <em className={styles.heroTitleEm}>every</em> learner.
      </h1>

      <p className={`animate-fade-rise-delay ${styles.heroSubtitle}`}>
        Study notes, past papers, and practice materials — everything your class needs, in one place.
      </p>
    </div>
  </section>
);

const features = [
  { title: "PYQ Papers", desc: "Past papers to help you prepare effectively." },
  { title: "Flashcards", desc: "Quick-recall cards for fast revision." },
  { title: "MCQ Sets", desc: "Exam-oriented questions and practice material." },
  { title: "Revision Sheets", desc: "Condensed sheets for quick topic overview." },
  { title: "Study Notes", desc: "Comprehensive notes for all subjects." },
  { title: "Announcements/Updates", desc: "Stay updated with newly uploaded resources." }
];

const FeaturesSection = () => (
  <section className={styles.featuresSection}>
    <div className={styles.featuresContainer}>
      <div className={styles.featuresHeader}>
        <h2 className={styles.featuresTitle}>Everything in one place</h2>
      </div>

      <div className={styles.featuresGrid}>
        {features.map((f, i) => (
          <div key={i} className={`${styles.featureCard} animate-fade-rise ${i % 3 === 1 ? 'animate-fade-rise-delay' : i % 3 === 2 ? 'animate-fade-rise-delay-2' : ''}`}>
            <div className={styles.featureCardInner} />
            <div className={styles.featureCardContent}>
              <h3 className={styles.featureCardTitle}>{f.title}</h3>
              <p className={styles.featureCardDesc}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const HighlightsSection = () => (
  <section className={styles.highlightsSection}>
    <div className={styles.highlightsContainer}>
      <h2 className={styles.highlightsTitle}>New here?</h2>
      <div className={styles.highlightsNewsletterWrapper}>
        <p className={styles.highlightsNewsletterDesc}>Subscribe to get the latest announcements and updates.</p>
        <form className={styles.highlightsForm} onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            placeholder="Your email"
            className={`neu-recessed ${styles.highlightsInput}`}
          />
          <button className={`neu-raised neu-raised-hover ${styles.highlightsSubmitBtn}`}>
            Subscribe
          </button>
        </form>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className={styles.footer}>
    <div className={styles.footerContainer}>

      {/* Brand Column */}
      <div className={styles.footerBrandCol}>
        <h3 className={styles.footerBrandTitle}>Horizon</h3>
        <p className={styles.footerBrandDesc}>
          Your Path. Your Future.<br/>
          Built for students.<br/>
          Designed for success.
        </p>
        <div className={styles.footerSocials}>
          {[1, 2, 3, 4].map((i) => (
            <Link key={i} to="/" className={styles.footerSocialLink}>
              <span className={styles.footerSocialIcon}></span>
            </Link>
          ))}
        </div>
      </div>

      {/* Explore Links */}
      <div className={styles.footerLinksCol}>
        <h4 className={styles.footerLinksTitle}>Explore</h4>
        <nav className={styles.footerNav}>
          {navLinks.map((link, index) => (
            <Link key={index} to={link.path} className={styles.footerNavLink}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Info Links */}
      <div className={styles.footerLinksCol}>
        <h4 className={styles.footerLinksTitle}>Info</h4>
        <nav className={styles.footerNav}>
          <Link to="/" className={styles.footerNavLink}>Announcements</Link>
          <Link to="/" className={styles.footerNavLink}>About Us</Link>
          <Link to="/" className={styles.footerNavLink}>Contact</Link>
          <Link to="/" className={styles.footerNavLink}>Privacy Policy</Link>
          <Link to="/" className={styles.footerNavLink}>Terms of Use</Link>
        </nav>
      </div>

    </div>

    {/* Copyright Strip */}
    <div className={styles.footerCopyright}>
      <p className={styles.footerCopyrightText}>© {new Date().getFullYear()} Horizon. All rights reserved.</p>
    </div>
  </footer>
);

const Home: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex flex-col bg-[var(--bg-base)] font-sans">
      <Header />
      <main className="flex-1 w-full flex flex-col">
        <HeroSection />
        <FeaturesSection />
        <HighlightsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
