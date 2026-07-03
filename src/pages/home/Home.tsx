import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LiquidGlassGroup, LiquidGlassItem } from '../../components/ui/LiquidGlass';
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
        <Link to="/" className={`${styles.brandLogoDesktop} liquid-glass`}>
          <img src="/assets/favicon/logo.png" alt="Horizon Logo" className={styles.brandLogoImg} />
          <div className={styles.brandLogoDivider}></div>
          <span className={styles.brandLogoText}>
            Horizon
          </span>
        </Link>

        {/* Navigation */}
        <LiquidGlassGroup as="nav" className={`${styles.navGroup} liquid-glass`}>
          {navLinks.filter(link => link.showOnDesktop).map((link, index) => (
            <LiquidGlassItem
              key={index}
              value={link.label}
              to={link.path}
              className={styles.navItem}
            >
              {link.label}
            </LiquidGlassItem>
          ))}
        </LiquidGlassGroup>

        {/* Get Started */}
        <Link to="/" className={`${styles.getStartedBtn} liquid-glass`}>
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
              className={`${styles.hamburgerBtn} liquid-glass ${scrolledPastHero || isMobileMenuOpen ? styles.hamburgerVisible : styles.hamburgerHidden}`}
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
              <div className={`${styles.menuPanel} liquid-glass ${isMobileMenuOpen ? styles.menuPanelActive : styles.menuPanelInactive}`}>
                {/* Menu Header */}
                <div className={styles.menuHeader}>
                  {/* Pink Icon Box */}
                  <div className={styles.menuPinkIcon}>
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      {/* Simple asterisk shape */}
                      <path d="M13 3v7.267l6.294-3.633-1 1.732-6.294 3.634H19v2h-6.999l6.294 3.634-1 1.732L11 15.733V23h-2v-7.267l-6.294 3.633-1-1.732 6.294-3.634H2v-2h6.999L2.705 8.366l1-1.732L10 10.267V3h2z" />
                    </svg>
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
    <video autoPlay loop muted playsInline className={styles.heroVideo} src="/assets/video/bg.mp4" />

    {/* Dark overlay */}
    <div className={styles.heroOverlay} />

    {/* Content */}
    <div className={styles.heroContent}>

      {/* Brand Pill Logo */}
      <div className={`animate-fade-rise ${styles.heroBrandPill} liquid-glass`}>
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

      <div className={`animate-fade-rise-delay-2 ${styles.heroCtaGroup}`}>
        <Link to="/" className={`${styles.heroCtaBtn} liquid-glass`}>
          Explore Library
        </Link>
        <Link to="/" className={`${styles.heroCtaBtn} liquid-glass`}>
          Browse Notes
        </Link>
      </div>
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
          <div key={i} className={`${styles.featureCard} liquid-glass animate-fade-rise ${i % 2 === 1 ? 'animate-fade-rise-delay' : ''}`}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: '57%',
                background: 'radial-gradient(ellipse 160% 100% at 50% 100%, #F0F9FF 0%, #38BDF8 20%, rgba(2,132,199,0.72) 50%, transparent 88%)',
                opacity: 1,
                pointerEvents: 'none',
              }}
            />
            <div
              className="fire-flame"
              style={{
                position: 'absolute',
                left: '-3%',
                bottom: 0,
                width: '22%',
                height: '64%',
                borderRadius: '50% 50% 40% 40% / 85% 85% 15% 15%',
                background: 'radial-gradient(ellipse 90% 55% at 50% 100%, #0284C7 0%, #0284C7dd 18%, #0284C788 44%, #0284C733 68%, transparent 88%)',
                filter: 'blur(8px)',
                opacity: 0.98,
                transformOrigin: 'bottom center',
                animation: 'fire4 3.2s ease-in-out infinite',
                animationDelay: '0s',
                pointerEvents: 'none',
                willChange: 'transform',
              }}
            />
            <div
              className="fire-flame"
              style={{
                position: 'absolute',
                left: '5%',
                bottom: 0,
                width: '26%',
                height: '80%',
                borderRadius: '50% 50% 40% 40% / 85% 85% 15% 15%',
                background: 'radial-gradient(ellipse 90% 55% at 50% 100%, #38BDF8 0%, #38BDF8dd 18%, #38BDF888 44%, #38BDF833 68%, transparent 88%)',
                filter: 'blur(10px)',
                opacity: 0.98,
                transformOrigin: 'bottom center',
                animation: 'fire1 2.7s ease-in-out infinite',
                animationDelay: '0.5s',
                pointerEvents: 'none',
                willChange: 'transform',
              }}
            />
            <div
              className="fire-flame"
              style={{
                position: 'absolute',
                left: '18%',
                bottom: 0,
                width: '30%',
                height: '90%',
                borderRadius: '50% 50% 40% 40% / 85% 85% 15% 15%',
                background: 'radial-gradient(ellipse 90% 55% at 50% 100%, #BAE6FD 0%, #BAE6FDdd 18%, #BAE6FD88 44%, #BAE6FD33 68%, transparent 88%)',
                filter: 'blur(11px)',
                opacity: 0.98,
                transformOrigin: 'bottom center',
                animation: 'fire3 3.4s ease-in-out infinite',
                animationDelay: '0.9s',
                pointerEvents: 'none',
                willChange: 'transform',
              }}
            />
            <div
              className="fire-flame"
              style={{
                position: 'absolute',
                left: '36%',
                bottom: 0,
                width: '32%',
                height: '96%',
                borderRadius: '50% 50% 40% 40% / 85% 85% 15% 15%',
                background: 'radial-gradient(ellipse 90% 55% at 50% 100%, #F0F9FF 0%, #F0F9FFdd 18%, #F0F9FF88 44%, #F0F9FF33 68%, transparent 88%)',
                filter: 'blur(12px)',
                opacity: 0.90,
                transformOrigin: 'bottom center',
                animation: 'fire2 2.5s ease-in-out infinite',
                animationDelay: '1.2s',
                pointerEvents: 'none',
                willChange: 'transform',
              }}
            />
            <div
              className="fire-flame"
              style={{
                position: 'absolute',
                left: '55%',
                bottom: 0,
                width: '28%',
                height: '86%',
                borderRadius: '50% 50% 40% 40% / 85% 85% 15% 15%',
                background: 'radial-gradient(ellipse 90% 55% at 50% 100%, #7DD3FC 0%, #7DD3FCdd 18%, #7DD3FC88 44%, #7DD3FC33 68%, transparent 88%)',
                filter: 'blur(10px)',
                opacity: 0.98,
                transformOrigin: 'bottom center',
                animation: 'fire5 3.7s ease-in-out infinite',
                animationDelay: '0.7s',
                pointerEvents: 'none',
                willChange: 'transform',
              }}
            />
            <div
              className="fire-flame"
              style={{
                position: 'absolute',
                left: '69%',
                bottom: 0,
                width: '24%',
                height: '74%',
                borderRadius: '50% 50% 40% 40% / 85% 85% 15% 15%',
                background: 'radial-gradient(ellipse 90% 55% at 50% 100%, #38BDF8 0%, #38BDF8dd 18%, #38BDF888 44%, #38BDF833 68%, transparent 88%)',
                filter: 'blur(9px)',
                opacity: 0.98,
                transformOrigin: 'bottom center',
                animation: 'fire6 2.9s ease-in-out infinite',
                animationDelay: '1.5s',
                pointerEvents: 'none',
                willChange: 'transform',
              }}
            />
            <div
              className="fire-flame"
              style={{
                position: 'absolute',
                left: '80%',
                bottom: 0,
                width: '22%',
                height: '66%',
                borderRadius: '50% 50% 40% 40% / 85% 85% 15% 15%',
                background: 'radial-gradient(ellipse 90% 55% at 50% 100%, #0284C7 0%, #0284C7dd 18%, #0284C788 44%, #0284C733 68%, transparent 88%)',
                filter: 'blur(8px)',
                opacity: 0.98,
                transformOrigin: 'bottom center',
                animation: 'fire7 3.3s ease-in-out infinite',
                animationDelay: '0.3s',
                pointerEvents: 'none',
                willChange: 'transform',
              }}
            />
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
      <Link to="/" className={`liquid-glass ${styles.highlightsCtaBtn}`}>
        Explore Now
      </Link>
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

      {/* Newsletter */}
      <div className={styles.footerNewsletterCol}>
        <h4 className={styles.footerLinksTitle}>Stay Updated</h4>
        <p className={styles.footerNewsletterDesc}>Subscribe to get the latest announcements and updates.</p>
        <form className={styles.footerForm} onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            placeholder="Your email"
            className={`liquid-glass ${styles.footerInput}`}
          />
          <button className={`liquid-glass ${styles.footerSubmitBtn}`}>
            Subscribe
          </button>
        </form>
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
    <div className="min-h-screen w-full flex flex-col bg-[#03111A] font-sans">
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
