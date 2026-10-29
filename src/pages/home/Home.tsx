import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { navLinks } from '../../data/navigation';
import { HeroPhoneAnimation } from './HeroPhoneAnimation';
import ProfilePopover from '../../components/ProfilePopover';
import ProfileButton from '../../components/ProfileButton';
import { useAuth } from '../../context/AuthContext';
import styles from './Home.module.css';

const Header = React.memo(({ isDarkMode, onToggle }: { isDarkMode: boolean, onToggle: () => void }) => {
  const { session, loading, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      // Assuming hero section is ~100vh
      const threshold = window.innerHeight * 0.8;
      const isPast = window.scrollY > threshold;
      setScrolledPastHero((prev) => (prev !== isPast ? isPast : prev));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
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
          <img src="/assets/favicon/logo.avif" alt="Horizon Logo" width="32" height="32" loading="eager" decoding="async" className={styles.brandLogoImg} />
          <div className={styles.brandLogoDivider}></div>
          <span className={styles.brandLogoText}>
            Horizon
          </span>
        </Link>

        {/* Navigation */}
        <nav className={`${styles.navGroup} neu-raised`} aria-label="Main navigation">
          {navLinks.reduce<React.ReactNode[]>((acc, link, index) => {
            if (link.showOnDesktop) {
              const isActive = location.pathname === link.path;
              acc.push(
                <Link
                  key={link.id || index}
                  to={link.path}
                  className={styles.navItem}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              );
            }
            return acc;
          }, [])}
        </nav>

        {/* Get Started or Profile Popover */}
        {!loading && (
          session ? (
            <ProfilePopover />
          ) : (
            <Link to="/register" className={`${styles.getStartedBtn} neu-raised neu-raised-hover`}>
              Get Started
            </Link>
          )
        )}
      </div>

      {/* Mobile Header Component */}
      <div className={styles.mobileHeaderContainer}>
        <div className={styles.mobileHeaderRelative}>
          {/* Top Bar */}
          <div className={styles.mobileTopBar}>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`${styles.hamburgerBtn} neu-raised ${scrolledPastHero || isMobileMenuOpen ? styles.hamburgerVisible : styles.hamburgerHidden} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2`}
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
              <div
                className={`${styles.menuPanel} neu-raised ${isMobileMenuOpen ? styles.menuPanelActive : styles.menuPanelInactive}`}
                role="dialog"
                aria-modal="true"
                aria-label="Mobile navigation menu"
              >
                {/* Menu Header */}
                <div className={styles.menuHeader}>
                  {/* Theme Toggle */}
                  <div className="flex items-center">
                    <button type="button" aria-label="Toggle Royal Dark Mode" onClick={onToggle} className="neu-raised rounded-full p-2 mr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]">
                      {isDarkMode ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                      )}
                    </button>
                    {/* Logo */}
                    {session ? <div className={styles.menuProfileContainer}><ProfileButton onClick={closeMenu} /></div> : <div style={{ width: '40px', height: '40px' }} />}
                  </div>
                  {/* Close Button */}
                  <button
                    type="button"
                    aria-label="Close menu"
                    onClick={closeMenu}
                    className={`${styles.menuCloseBtn} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 rounded-lg`}
                  >
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Navigation Links */}
                <nav className={`${styles.menuNavLinks} ${session ? styles.menuNavLinksAuth : ''}`} aria-label="Mobile navigation">
                  {(() => {
                    const lastMobileIndex = navLinks.findLastIndex(link => link.showOnMobile);
                    return navLinks.reduce<React.ReactNode[]>((acc, link, index) => {
                      if (link.showOnMobile) {
                        const isActive = location.pathname === link.path;
                        const showDivider = index < lastMobileIndex || Boolean(session);
                        acc.push(
                          <React.Fragment key={link.id || index}>
                            <Link
                              to={link.path}
                              onClick={closeMenu}
                              className={`${styles.menuNavLink} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 rounded-md`}
                              aria-current={isActive ? 'page' : undefined}
                            >
                              {link.label}
                            </Link>
                            {showDivider && <div className={styles.menuDivider} />}
                          </React.Fragment>
                        );
                      }
                      return acc;
                    }, []);
                  })()}

                  {session && (
                    <React.Fragment>
                      <Link
                        to="/dashboard"
                        onClick={closeMenu}
                        className={`${styles.menuNavLink} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 rounded-md`}
                        aria-current={location.pathname === '/dashboard' ? 'page' : undefined}
                      >
                        Profile
                      </Link>
                      <div className={styles.menuDivider} />
                      <button
                        type="button"
                        aria-label="Log out of your account"
                        onClick={async () => {
                          closeMenu();
                          await signOut();
                          navigate('/');
                        }}
                        className={`${styles.menuSignOutBtn} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 rounded-md`}
                      >
                        Log Out
                      </button>
                    </React.Fragment>
                  )}
                </nav>

                {/* Action Buttons */}
                {!loading && !session && (
                  <div className={styles.menuActionButtons}>
                    <Link
                      to="/login"
                      onClick={closeMenu}
                      className={`${styles.menuSignInBtn} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 rounded-xl`}
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/register"
                      onClick={closeMenu}
                      className={`${styles.menuGetNowBtn} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 rounded-xl`}
                    >
                      Get Started
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
});
Header.displayName = 'Header';

import { getAllFeatures } from '../../config/resources';
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll';

const preloadLibrary = () => {
  import('../resources/LibraryRoute').catch(() => {});
};
const preloadStudyNotes = () => {
  import('../resources/StudyNotesRoute').catch(() => {});
};

const HeroSection = React.memo(() => (
  <section className={styles.heroSection}>
    {/* Content */}
    <div className={styles.heroContent}>

      {/* Brand Pill Logo */}
      <Link to="/" onClick={() => window.scrollTo(0, 0)} className={`animate-fade-rise ${styles.heroBrandPill} neu-raised no-underline`}>
        <img src="/assets/favicon/logo.avif" alt="Horizon Logo" width="24" height="24" loading="eager" decoding="async" className={styles.heroBrandPillImg} />
        <span className={styles.heroBrandPillText}>
          Horizon
        </span>
      </Link>

      <h1 className={`animate-fade-rise ${styles.heroTitle}`}>
        Resources for <em className={styles.heroTitleEm}>every</em> learner.
      </h1>

      <p className={`animate-fade-rise-delay ${styles.heroSubtitle}`}>
        Study notes, past papers, and practice materials — everything for class 8th to 12th, in one place.
      </p>

      <div className={styles.preserveLight}>
        <HeroPhoneAnimation />
      </div>
    </div>
  </section>
));
HeroSection.displayName = 'HeroSection';

const getFeatureIllustration = (id: string) => {
  if (id === 'syllabus') {
    return (
      <img
        src="/assets/SVG Illustrations/syllabus.svg"
        alt="Syllabus illustration"
        className="w-full h-full object-contain"
      />
    );
  }
  if (id === 'notes') {
    return (
      <img
        src="/assets/SVG Illustrations/notes.svg"
        alt="Study Notes illustration"
        className="w-full h-full object-contain"
      />
    );
  }
  if (id === 'pyq') {
    return (
      <img
        src="/assets/SVG Illustrations/pyqs.svg"
        alt="PYQ Papers illustration"
        className="w-full h-full object-contain"
      />
    );
  }
  return null;
};

const FeaturesSection = React.memo(() => {
  const features = getAllFeatures();
  const { visibleIndices, registerRef } = useRevealOnScroll(features.length, 0.2);

  return (
    <section className={styles.featuresSection}>
      <div className={styles.featuresContainer}>
        <div className={styles.featuresHeader}>
          <h2 className={styles.featuresTitle}>Everything in <span className={styles.textGradient}>one</span> place</h2>
        </div>

        <div className={styles.featuresGrid}>
          {features.map((f, i) => (
            <div
              key={i}
              ref={registerRef(i)}
              data-reveal-index={i}
              style={{ transitionDelay: `${i * 120}ms` }}
              className={`${styles.featureCard} group ${visibleIndices[i] ? styles.isVisible : ''}`}
              onMouseEnter={() => {
                if (f.path === '/library') preloadLibrary();
                if (f.path === '/notes') preloadStudyNotes();
              }}
            >
              {f.path ? (
                <Link to={f.path} className="absolute inset-0 z-20 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2" aria-label={`Go to ${f.title}`} />
              ) : null}
              <div className={styles.featureCardInner} />
              <div className={styles.featureCardContent}>
                {/* LEFT: Compact Icon Container */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 neu-recessed rounded-md flex items-center justify-center p-0 shrink-0 overflow-hidden">
                  {getFeatureIllustration(f.id)}
                </div>

                {/* CENTER: Title & Left-Aligned Description */}
                <div className="flex-1 min-w-0 space-y-1 text-left">
                  <h3 className={styles.featureCardTitle}>{f.title}</h3>
                  <p className={styles.featureCardDesc}>{f.desc}</p>
                </div>

                {/* RIGHT: Circular Neumorphic Arrow Action Button */}
                <div className="w-8 h-8 sm:w-9 sm:h-9 neu-raised-sm group-hover:neu-raised-sm-hover rounded-full flex items-center justify-center shrink-0 transition-all">
                  <svg
                    aria-hidden="true"
                    className="w-2 h-2 text-[#E91E8C] shrink-0"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
FeaturesSection.displayName = 'FeaturesSection';

const HighlightsSection = React.memo(() => {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [isSuccess, setIsSuccess] = React.useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { register } = await import('../../services/auth');
      await register(email, password, name);
      setIsSuccess(true);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  return (
  <section className={styles.highlightsSection}>
    <div className={styles.highlightsContainer}>
      <h2 className={styles.highlightsTitle}>New here?</h2>
      <div className={styles.highlightsNewsletterWrapper}>
        {isSuccess ? (
          <div className="text-center p-4">
            <h3 className="text-xl font-bold mb-2">Check your email</h3>
            <p>
              {email
                ? `We sent a verification link to ${email}. Open your email and tap the verification link to activate your account.`
                : 'We sent you a verification link. Open your email and tap the verification link to activate your account.'}
            </p>
          </div>
        ) : (
          <>
            <p className={styles.highlightsNewsletterDesc}>Subscribe to get the latest announcements and updates.</p>
            {error && <p role="alert" className="text-red-500 mb-2">{error}</p>}
            <form className={styles.highlightsForm} onSubmit={handleSubscribe}>
              <label htmlFor="newsletter-name" className="sr-only">Your name</label>
              <input
                id="newsletter-name"
                type="text"
                placeholder="Your name"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className={`neu-recessed ${styles.highlightsInput}`}
                style={{ marginBottom: '0.5rem' }}
              />
              <label htmlFor="newsletter-email" className="sr-only">Your email</label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="Your email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={`neu-recessed ${styles.highlightsInput}`}
                style={{ marginBottom: '0.5rem' }}
              />
              <label htmlFor="newsletter-password" className="sr-only">Password</label>
              <input
                id="newsletter-password"
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`neu-recessed ${styles.highlightsInput}`}
                style={{ marginBottom: '0.5rem' }}
              />
              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className={`neu-raised neu-raised-hover ${styles.highlightsSubmitBtn}`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Subscribing...</span>
                  </>
                ) : (
                  'Subscribe'
                )}
              </button>
        </form>
        </>
        )}
      </div>
    </div>
  </section>
  );
});
HighlightsSection.displayName = 'HighlightsSection';

const Footer = React.memo(() => {
  const location = useLocation();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>

        {/* Brand Section */}
        <div className={styles.footerBrandCol}>
          <div className={styles.footerBrandTitleWrapper}>
            <img src="/assets/favicon/logo.avif" alt="Horizon Logo" width="24" height="24" loading="lazy" decoding="async" className={styles.footerLogo} />
            <h3 className={styles.footerBrandTitle}>Horizon</h3>
          </div>
        </div>

        <div className={styles.footerNavWrapper}>
          {/* Explore Links */}
          <div className={styles.footerLinksCol}>
            <h4 className={styles.footerLinksTitle}>Explore</h4>
            <nav className={styles.footerNav} aria-label="Explore navigation">
              {navLinks.map((link, index) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={index}
                    to={link.path}
                    className={styles.footerNavLink}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Info Links */}
          <div className={styles.footerLinksCol}>
            <h4 className={styles.footerLinksTitle}>Info</h4>
            <nav className={styles.footerNav} aria-label="Footer navigation">
              <Link to="/about" className={styles.footerNavLink} aria-current={location.pathname === '/about' ? 'page' : undefined}>About Us</Link>
              <Link to="/contact" className={styles.footerNavLink} aria-current={location.pathname === '/contact' ? 'page' : undefined}>Contact</Link>
              <Link to="/terms" className={styles.footerNavLink} aria-current={location.pathname === '/terms' ? 'page' : undefined}>Terms of Service</Link>
              <Link to="/privacy-policy" className={styles.footerNavLink} aria-current={location.pathname === '/privacy-policy' ? 'page' : undefined}>Privacy Policy</Link>
              <Link to="/attribution" className={styles.footerNavLink} aria-current={location.pathname === '/attribution' ? 'page' : undefined}>Attribution</Link>
            </nav>
          </div>
        </div>

        {/* Socials */}
        <div className={styles.footerSocials}>
          <a href="https://www.instagram.com/unfollowaman_" target="_blank" rel="noopener noreferrer" className={styles.footerSocialLink} aria-label="Instagram" title="Instagram">
            <img src="/assets/Social Links/instagram.png" alt="Instagram" width="24" height="24" loading="lazy" decoding="async" className={styles.footerSocialIcon} />
          </a>
          <a href="https://x.com/unfollowaman" target="_blank" rel="noopener noreferrer" className={styles.footerSocialLink} aria-label="X (formerly Twitter)" title="X (formerly Twitter)">
            <img src="/assets/Social Links/twitter-x.png" alt="X (formerly Twitter)" width="24" height="24" loading="lazy" decoding="async" className={styles.footerSocialIcon} />
          </a>
          <a href="mailto:tryhorizon18@gmail.com" className={styles.footerSocialLink} aria-label="Gmail" title="Gmail">
            <img src="/assets/Social Links/gmail.png" alt="Gmail" width="24" height="24" loading="lazy" decoding="async" className={styles.footerSocialIcon} />
          </a>
          <a href="https://github.com/unfollowaman" target="_blank" rel="noopener noreferrer" className={styles.footerSocialLink} aria-label="GitHub" title="GitHub">
            <img src="/assets/Social Links/github.png" alt="GitHub" width="24" height="24" loading="lazy" decoding="async" className={styles.footerSocialIcon} />
          </a>
          <a href="https://substack.com/@unfollowaman" target="_blank" rel="noopener noreferrer" className={styles.footerSocialLink} aria-label="Substack" title="Substack">
            <img src="/assets/Social Links/substack.png" alt="Substack" width="24" height="24" loading="lazy" decoding="async" className={styles.footerSocialIcon} />
          </a>
        </div>

      </div>
    </footer>
  );
});
Footer.displayName = 'Footer';

const Home: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("horizon-homepage-theme") === "dark";
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      localStorage.setItem("horizon-homepage-theme", "dark");
    } else {
      localStorage.setItem("horizon-homepage-theme", "light");
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (isDarkMode) {
        document.documentElement.classList.add("theme-royal-dark");
      } else {
        document.documentElement.classList.remove("theme-royal-dark");
      }
    }
  }, [isDarkMode]);

  useEffect(() => {
    return () => {
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove("theme-royal-dark");
      }
    };
  }, []);

  const handleToggle = () => {
    setIsDarkMode(prev => !prev);
  };

  const { session, loading } = useAuth();

  return (
    <div id="home-root" className={`min-h-screen w-full flex flex-col bg-[var(--bg-base)] ${isDarkMode ? "theme-royal-dark" : ""}`}>
      <Header isDarkMode={isDarkMode} onToggle={handleToggle} />
      <main className="flex-1 w-full flex flex-col">
        <HeroSection />
        <FeaturesSection />
        {!loading && !session && <HighlightsSection />}
      </main>
      <Footer />
    </div>
  );
};

export default Home;
