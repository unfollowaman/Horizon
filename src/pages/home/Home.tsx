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
        <Link to="/" className={`${styles.brandLogoDesktop} ${styles.liquidGlass}`}>
          <img src="/assets/favicon/logo.png" alt="Horizon Logo" className={styles.brandLogoImg} />
          <div className={styles.brandLogoDivider}></div>
          <span className={styles.brandLogoText}>
            Horizon
          </span>
        </Link>

        {/* Navigation */}
        <LiquidGlassGroup as="nav" className={`${styles.navGroup} ${styles.liquidGlass}`}>
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
        <Link to="/" className={`${styles.getStartedBtn} ${styles.liquidGlass}`}>
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
              className={`${styles.hamburgerBtn} ${styles.liquidGlass} ${scrolledPastHero || isMobileMenuOpen ? styles.hamburgerVisible : styles.hamburgerHidden}`}
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
              <div className={`${styles.menuPanel} ${styles.liquidGlass} ${isMobileMenuOpen ? styles.menuPanelActive : styles.menuPanelInactive}`}>
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
      <div className={`animate-fade-rise ${styles.heroBrandPill} ${styles.liquidGlass}`}>
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
        <Link to="/" className={`${styles.heroCtaBtn} ${styles.liquidGlass}`}>
          Explore Library
        </Link>
        <Link to="/" className={`${styles.heroCtaBtn} ${styles.liquidGlass}`}>
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
  <section className="w-full bg-[#03111A] px-6 pt-12 pb-24 md:pt-16 md:pb-32">
    <div className="max-w-[1200px] mx-auto flex flex-col">
      <div className="flex flex-col items-center text-center mb-16 md:mb-20">
        <h2 className="text-4xl md:text-5xl text-white font-normal" style={{ fontFamily: "'Instrument Serif', serif" }}>Everything in one place</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <div key={i} className={`liquid-glass rounded-2xl p-6 flex flex-col animate-fade-rise relative overflow-hidden ${i % 3 === 1 ? 'animate-fade-rise-delay' : i % 3 === 2 ? 'animate-fade-rise-delay-2' : ''}`}>
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
            <div style={{ position: 'relative', zIndex: 10 }}>
              <h3 className="text-white text-lg font-medium mb-3">{f.title}</h3>
              <p className="text-[#9A9AA8] text-sm leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const SecondaryCTASection = () => (
  <section className="w-full bg-[#03111A] px-6 py-20 pb-32">
    <div className="max-w-[1200px] mx-auto flex flex-col items-center text-center">
      <h2 className="text-3xl md:text-4xl text-white font-normal mb-8" style={{ fontFamily: "'Instrument Serif', serif" }}>New here?</h2>
      <Link to="/" className="liquid-glass rounded-full px-10 py-4 text-white hover:scale-[1.03] transition-transform focus:outline-none focus:ring-2 focus:ring-white inline-flex items-center justify-center">
        Explore Now
      </Link>
    </div>
  </section>
);

const Footer = () => (
  <footer className="w-full bg-[#03111A] pt-20 pb-12 px-6 border-t border-[#2E2E2E]">
    <div className="w-full max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-20">

      {/* Brand Column */}
      <div className="flex flex-col lg:col-span-4 pr-0 lg:pr-8">
        <h3 className="text-2xl text-white mb-6 font-normal" style={{ fontFamily: "'Instrument Serif', serif" }}>Horizon</h3>
        <p className="text-[#9A9AA8] mb-8 text-sm leading-relaxed">
          Your Path. Your Future.<br/>
          Built for students.<br/>
          Designed for success.
        </p>
        <div className="flex items-center gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Link key={i} to="/" className="w-11 h-11 flex items-center justify-center text-white hover:opacity-70 transition-opacity focus:outline-none focus:ring-2 focus:ring-white rounded-full">
              <span className="w-5 h-5 bg-white rounded-sm block"></span>
            </Link>
          ))}
        </div>
      </div>

      {/* Explore Links */}
      <div className="flex flex-col lg:col-span-2">
        <h4 className="text-white mb-6 font-medium text-sm">Explore</h4>
        <nav className="flex flex-col gap-4">
          <Link to="/" className="text-[#9A9AA8] text-sm hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white w-fit rounded-sm">PYQ Papers</Link>
          <Link to="/" className="text-[#9A9AA8] text-sm hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white w-fit rounded-sm">Flashcards</Link>
          <Link to="/" className="text-[#9A9AA8] text-sm hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white w-fit rounded-sm">MCQ Sets</Link>
          <Link to="/" className="text-[#9A9AA8] text-sm hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white w-fit rounded-sm">Revision Sheets</Link>
          <Link to="/" className="text-[#9A9AA8] text-sm hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white w-fit rounded-sm">Study Notes</Link>
          <Link to="/" className="text-[#9A9AA8] text-sm hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white w-fit rounded-sm">Announcements/Updates</Link>
        </nav>
      </div>

      {/* Info Links */}
      <div className="flex flex-col lg:col-span-2">
        <h4 className="text-white mb-6 font-medium text-sm">Info</h4>
        <nav className="flex flex-col gap-4">
          <Link to="/" className="text-[#9A9AA8] text-sm hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white w-fit rounded-sm">Announcements</Link>
          <Link to="/" className="text-[#9A9AA8] text-sm hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white w-fit rounded-sm">About Us</Link>
          <Link to="/" className="text-[#9A9AA8] text-sm hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white w-fit rounded-sm">Contact</Link>
          <Link to="/" className="text-[#9A9AA8] text-sm hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white w-fit rounded-sm">Privacy Policy</Link>
          <Link to="/" className="text-[#9A9AA8] text-sm hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white w-fit rounded-sm">Terms of Use</Link>
        </nav>
      </div>

      {/* Newsletter */}
      <div className="flex flex-col lg:col-span-4">
        <h4 className="text-white mb-6 font-medium text-sm">Stay Updated</h4>
        <p className="text-[#9A9AA8] text-sm mb-6 max-w-sm leading-relaxed">Subscribe to get the latest announcements and updates.</p>
        <form className="flex flex-col sm:flex-row gap-3 w-full max-w-md" onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            placeholder="Your email"
            className="liquid-glass rounded-full px-5 py-2.5 text-sm text-white placeholder:text-[#9A9AA8] focus:outline-none focus:ring-2 focus:ring-white flex-1 min-h-[44px]"
          />
          <button className="liquid-glass rounded-full px-6 py-2.5 text-sm text-white hover:scale-[1.03] transition-transform focus:outline-none focus:ring-2 focus:ring-white min-h-[44px]">
            Subscribe
          </button>
        </form>
      </div>

    </div>

    {/* Copyright Strip */}
    <div className="w-full max-w-[1200px] mx-auto pt-8 border-t border-[#2E2E2E] flex justify-center">
      <p className="text-xs text-[#9A9AA8]">© {new Date().getFullYear()} Horizon. All rights reserved.</p>
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
        <SecondaryCTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
