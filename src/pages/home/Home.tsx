import React, { useState, useEffect } from 'react';
import { register } from '../../services/auth';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { navLinks } from '../../data/navigation';
import { HeroPhoneAnimation } from './HeroPhoneAnimation';
import ProfilePopover from '../../components/ProfilePopover';
import ProfileButton from '../../components/ProfileButton';
import { useAuth } from '../../context/AuthContext';
import styles from './Home.module.css';

const Header = () => {
  const { session, loading, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const navigate = useNavigate();

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
          <img src="/assets/favicon/logo.avif" alt="Horizon Logo" className={styles.brandLogoImg} />
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
                  {session ? <div className={styles.menuProfileContainer}><ProfileButton onClick={closeMenu} /></div> : <div style={{ width: '40px', height: '40px' }} />}
                  {/* Close Button */}
                  <button onClick={closeMenu} className={styles.menuCloseBtn}>
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Navigation Links */}
                <nav className={`${styles.menuNavLinks} ${session ? styles.menuNavLinksAuth : ''}`}>
                  {navLinks.filter(link => link.showOnMobile).map((link, index, array) => (
                    <React.Fragment key={index}>
                      <Link
                        to={link.path}
                        onClick={closeMenu}
                        className={styles.menuNavLink}
                      >
                        {link.label}
                      </Link>
                      {(index < array.length - 1 || session) && <div className={styles.menuDivider} />}
                    </React.Fragment>
                  ))}

                  {session && (
                    <React.Fragment>
                      <Link
                        to="/dashboard"
                        onClick={closeMenu}
                        className={styles.menuNavLink}
                      >
                        Profile
                      </Link>
                      <div className={styles.menuDivider} />
                      <button
                        onClick={async () => {
                          closeMenu();
                          await signOut();
                          navigate('/');
                        }}
                        className={styles.menuSignOutBtn}
                      >
                        Log Out
                      </button>
                    </React.Fragment>
                  )}
                </nav>

                {/* Action Buttons */}
                {!loading && !session && (
                  <div className={styles.menuActionButtons}>
                    <Link to="/login" onClick={closeMenu} className={styles.menuSignInBtn}>
                      Sign in
                    </Link>
                    <Link to="/register" onClick={closeMenu} className={styles.menuGetNowBtn}>
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
};

import { getAllFeatures } from '../../config/resources';

const HeroSection = () => (
  <section className={styles.heroSection}>
    {/* Content */}
    <div className={styles.heroContent}>

      {/* Brand Pill Logo */}
      <Link to="/" onClick={() => window.scrollTo(0, 0)} className={`animate-fade-rise ${styles.heroBrandPill} neu-raised no-underline`}>
        <img src="/assets/favicon/logo.avif" alt="Horizon Logo" className={styles.heroBrandPillImg} />
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

      <HeroPhoneAnimation />
    </div>
  </section>
);

const FeaturesSection = () => (
  <section className={styles.featuresSection}>
    <div className={styles.featuresContainer}>
      <div className={styles.featuresHeader}>
        <h2 className={styles.featuresTitle}>Everything in <span className={styles.textGradient}>one</span> place</h2>
      </div>

      <div className={styles.featuresGrid}>
        {getAllFeatures().map((f, i) => (
          <div key={i} className={`${styles.featureCard} animate-fade-rise ${i % 3 === 1 ? 'animate-fade-rise-delay' : i % 3 === 2 ? 'animate-fade-rise-delay-2' : ''}`}>
            {f.path ? (
              <Link to={f.path} className="absolute inset-0 z-20" aria-label={`Go to ${f.title}`} />
            ) : null}
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

const HighlightsSection = () => {
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
            {error && <p className="text-red-500 mb-2">{error}</p>}
            <form className={styles.highlightsForm} onSubmit={handleSubscribe}>
              <input
            type="text"
            placeholder="Your name"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className={`neu-recessed ${styles.highlightsInput}`}
            style={{ marginBottom: '0.5rem' }}
          />
          <input
            type="email"
            placeholder="Your email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={`neu-recessed ${styles.highlightsInput}`}
            style={{ marginBottom: '0.5rem' }}
          />
          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={`neu-recessed ${styles.highlightsInput}`}
            style={{ marginBottom: '0.5rem' }}
          />
          <button type="submit" disabled={loading} className={`neu-raised neu-raised-hover ${styles.highlightsSubmitBtn}`}>
            {loading ? 'Subscribing...' : 'Subscribe'}
          </button>
        </form>
        </>
        )}
      </div>
    </div>
  </section>
  );
};

const Footer = () => (
  <footer className={styles.footer}>
    <div className={styles.footerContainer}>

      {/* Brand Section */}
      <div className={styles.footerBrandCol}>
        <div className={styles.footerBrandTitleWrapper}>
          <img src="/assets/favicon/logo.avif" alt="Horizon Logo" className={styles.footerLogo} />
          <h3 className={styles.footerBrandTitle}>Horizon</h3>
        </div>
      </div>

      <div className={styles.footerNavWrapper}>
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
            <Link to="/about" className={styles.footerNavLink}>About Us</Link>
            <Link to="/" className={styles.footerNavLink}>Contact</Link>
            <Link to="/privacy-policy" className={styles.footerNavLink}>Privacy Policy</Link>
            <Link to="/attribution" className={styles.footerNavLink}>Attribution</Link>
          </nav>
        </div>
      </div>

      {/* Socials */}
      <div className={styles.footerSocials}>
        <Link to="/" className={styles.footerSocialLink}>
          <img src="/assets/Social Links/instagram.png" alt="Instagram" className={styles.footerSocialIcon} />
        </Link>
        <Link to="/" className={styles.footerSocialLink}>
          <img src="/assets/Social Links/twitter-x.png" alt="Twitter/X" className={styles.footerSocialIcon} />
        </Link>
        <Link to="/" className={styles.footerSocialLink}>
          <img src="/assets/Social Links/gmail.png" alt="Gmail" className={styles.footerSocialIcon} />
        </Link>
        <Link to="/" className={styles.footerSocialLink}>
          <img src="/assets/Social Links/github.png" alt="GitHub" className={styles.footerSocialIcon} />
        </Link>
      </div>

    </div>
  </footer>
);

const Home: React.FC = () => {
  const { session, loading } = useAuth();

  return (
    <div className="min-h-screen w-full flex flex-col bg-[var(--bg-base)]">
      <Header />
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
