import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const navLinks = [
  { label: 'MCQ Sheet', path: '/', showOnMobile: true, showOnDesktop: true },
  { label: 'PYQ Papers', path: '/', showOnMobile: true, showOnDesktop: true },
  { label: 'Library', path: '/', showOnMobile: true, showOnDesktop: true },
  { label: 'Notes', path: '/', showOnMobile: true, showOnDesktop: true },
  { label: 'Past Papers', path: '/', showOnMobile: true, showOnDesktop: true },
  { label: 'Announcements', path: '/', showOnMobile: true, showOnDesktop: true },
];

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <header className="absolute top-0 left-0 right-0 z-50 flex justify-center w-full">
      {/* Desktop Header */}
      <div className="hidden md:flex w-full max-w-7xl justify-between items-center px-8 py-6 mx-auto relative z-20">
        {/* Logo */}
        <Link to="/" className="liquid-glass rounded-full px-5 h-10 flex items-center justify-center gap-2 text-xl tracking-tight font-normal text-white focus:outline-none focus:ring-2 focus:ring-white" style={{ fontFamily: "'Instrument Serif', serif" }}>
          <img src="/assets/favicon/favicon.svg" alt="Horizon Logo" className="w-4 h-4" />
          Horizon
        </Link>

        {/* Navigation */}
        <nav className="liquid-glass rounded-full px-6 h-10 flex items-center justify-center gap-4">
          {navLinks.filter(link => link.showOnDesktop).map((link, index) => (
            <Link key={index} to={link.path} className="text-sm text-[#9A9AA8] hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white rounded-sm whitespace-nowrap">
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Get Started */}
        <Link to="/" className="liquid-glass rounded-full px-4 h-10 flex items-center justify-center text-sm text-white hover:scale-[1.03] transition-transform focus:outline-none focus:ring-2 focus:ring-white whitespace-nowrap">
          Get Started
        </Link>
      </div>

      {/* Mobile Header Component */}
      <div className="flex md:hidden flex-col w-full absolute top-0 left-0 right-0 z-50">
        <div className="relative w-full">
          {/* Top Bar */}
          <div className="flex items-center justify-between w-full h-[72px] px-6 transition-all duration-300 ease-in-out z-30 relative">
            <Link to="/" className="text-2xl tracking-tight font-normal text-white focus:outline-none focus:ring-2 focus:ring-white rounded-sm relative z-10" style={{ fontFamily: "'Instrument Serif', serif" }} onClick={closeMenu}>
              Horizon
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center justify-center w-11 h-11 text-white focus:outline-none focus:ring-2 focus:ring-white rounded-full relative z-10"
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Expanded Menu Overlay */}
          <div className={`fixed inset-0 z-40 transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-[#03111A]/90 backdrop-blur-md" onClick={closeMenu} aria-hidden="true" />

            <div className="absolute top-0 right-0 w-full max-w-sm h-full liquid-glass border-l border-[#2E2E2E]/50 flex flex-col pt-6 px-6 pb-8 transform transition-transform duration-300 ease-out" style={{ transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(100%)' }}>
              <div className="flex justify-end mb-8">
                <button onClick={closeMenu} className="w-11 h-11 flex items-center justify-center text-white focus:outline-none focus:ring-2 focus:ring-white rounded-full">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="flex flex-col gap-6 overflow-y-auto no-scrollbar mb-8">
                {navLinks.filter(link => link.showOnMobile).map((link, index) => (
                  <Link
                    key={index}
                    to={link.path}
                    onClick={closeMenu}
                    className="text-lg font-medium text-[#9A9AA8] hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white rounded-sm"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto">
                <Link to="/" onClick={closeMenu} className="liquid-glass flex w-full h-12 items-center justify-center text-sm font-medium text-white rounded-full focus:outline-none focus:ring-2 focus:ring-white">
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

const HeroSection = () => (
  <section className="relative flex flex-col items-center justify-center min-h-[100dvh] w-full overflow-hidden">
    {/* Video background */}
    <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0" src="/assets/video/bg.mp4" />

    {/* Dark overlay */}
    <div className="absolute inset-0 bg-black/40 z-[1]" />

    {/* Content */}
    <div className="relative z-10 flex flex-col items-center text-center px-6 pt-32 pb-40 w-full max-w-[1200px] mx-auto">
      <h1 className="animate-fade-rise text-white font-normal" style={{ fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(2.8rem, 8vw, 6rem)', lineHeight: 0.95, letterSpacing: '-2px', maxWidth: '900px' }}>
        Resources for <em style={{ fontStyle: 'italic', color: '#C8C8D0' }}>every</em> learner.
      </h1>

      <p className="animate-fade-rise-delay text-[#9A9AA8]" style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', maxWidth: '560px', marginTop: '2rem', lineHeight: 1.6 }}>
        Study notes, past papers, and practice materials — everything your class needs, in one place.
      </p>

      <div className="animate-fade-rise-delay-2 flex flex-col sm:flex-row gap-4 mt-10 w-full sm:w-auto justify-center">
        <Link to="/" className="liquid-glass rounded-full px-14 py-4 text-base text-white hover:scale-[1.03] transition-transform focus:outline-none focus:ring-2 focus:ring-white flex items-center justify-center">
          Explore Library
        </Link>
        <Link to="/" className="liquid-glass rounded-full px-14 py-4 text-base text-white hover:scale-[1.03] transition-transform focus:outline-none focus:ring-2 focus:ring-white flex items-center justify-center">
          Browse Notes
        </Link>
      </div>
    </div>
  </section>
);

const features = [
  { title: "Study Notes", desc: "Comprehensive notes for all subjects." },
  { title: "Previous Year Papers", desc: "Past papers to help you prepare effectively." },
  { title: "Study Materials", desc: "Extra materials to boost your understanding." },
  { title: "Practice Questions", desc: "Exam-oriented questions and revision material." },
  { title: "Announcements", desc: "Stay updated with newly uploaded resources." },
  { title: "PDF Library", desc: "Browse all educational resources in one place." }
];

const FeaturesSection = () => (
  <section className="w-full bg-[#03111A] px-6 pt-12 pb-24 md:pt-16 md:pb-32">
    <div className="max-w-[1200px] mx-auto flex flex-col">
      <div className="flex flex-col items-center text-center mb-16 md:mb-20">
        <h2 className="text-4xl md:text-5xl text-white font-normal" style={{ fontFamily: "'Instrument Serif', serif" }}>Everything in one place</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <div key={i} className={`liquid-glass rounded-2xl p-6 flex flex-col animate-fade-rise ${i % 3 === 1 ? 'animate-fade-rise-delay' : i % 3 === 2 ? 'animate-fade-rise-delay-2' : ''}`}>
            <h3 className="text-white text-lg font-medium mb-3">{f.title}</h3>
            <p className="text-[#9A9AA8] text-sm leading-relaxed">{f.desc}</p>
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
          <Link to="/" className="text-[#9A9AA8] text-sm hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white w-fit rounded-sm">Library</Link>
          <Link to="/" className="text-[#9A9AA8] text-sm hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white w-fit rounded-sm">Notes</Link>
          <Link to="/" className="text-[#9A9AA8] text-sm hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white w-fit rounded-sm">Past Papers</Link>
          <Link to="/" className="text-[#9A9AA8] text-sm hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white w-fit rounded-sm">Study Materials</Link>
          <Link to="/" className="text-[#9A9AA8] text-sm hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white w-fit rounded-sm">Practice Questions</Link>
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
