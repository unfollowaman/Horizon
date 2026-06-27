import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';


const navLinks = [
  {
    label: 'MCQ sheet',
    path: '/',
    showOnMobile: true,
    showOnDesktop: false,
    icon: <svg className="w-[20px] h-[20px] text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
  },
  {
    label: 'PYQ Papers',
    path: '/',
    showOnMobile: true,
    showOnDesktop: false,
    icon: <svg className="w-[20px] h-[20px] text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
  },
  {
    label: 'Library',
    path: '/',
    showOnMobile: true,
    showOnDesktop: true,
    icon: <svg className="w-[20px] h-[20px] text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
  },
  { label: 'Notes', path: '/', showOnMobile: false, showOnDesktop: true },
  { label: 'Past Papers', path: '/', showOnMobile: false, showOnDesktop: true },
  { label: 'Announcements', path: '/', showOnMobile: false, showOnDesktop: true },
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
    <header className="fixed top-[5px] left-0 right-0 z-50 flex justify-center px-4 w-full">
      {/* Desktop Header */}
      <div className="hidden md:flex w-full max-w-[1200px] justify-between items-center gap-4 px-4 py-2 bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.07)] mx-6">
        {/* Tile 1: Logo */}
        <div className="flex h-14 items-center px-6 bg-white rounded-full border border-gray-100 shrink-0">
          <Link to="/" className="text-2xl font-bold tracking-tight text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent rounded-sm whitespace-nowrap">Horizon</Link>
        </div>

        {/* Tile 2: Navigation */}
        <nav className="flex h-14 items-center px-2 bg-white rounded-full border border-gray-100 shrink-0">
          <div className="flex items-center gap-0 bg-surface p-1 rounded-full border border-gray-100">
            {navLinks.filter(link => link.showOnDesktop).map((link, index) => (
              <Link key={index} to={link.path} className="px-4 py-1.5 text-[13px] tracking-tight font-medium text-gray-500 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-full whitespace-nowrap">{link.label}</Link>
            ))}
          </div>
        </nav>

        {/* Tile 3: Get Started */}
        <Link to="/" className="flex h-14 px-8 items-center justify-center text-sm font-medium tracking-tight text-white bg-slate-900 rounded-full hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 whitespace-nowrap shrink-0">
          Get Started
        </Link>

        {/* Tile 4: Theme Toggle */}
        <button className="flex h-14 w-14 shrink-0 items-center justify-center bg-white rounded-full border border-gray-100 text-slate-600 hover:text-slate-900 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-accent" aria-label="Toggle theme">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </button>
      </div>

      {/* Mobile Header Component */}
      <div className="flex md:hidden flex-col w-full">
        {/* Backdrop for open menu */}
        <div className={`fixed inset-0 bg-[rgba(0,0,0,0.1)] backdrop-blur-[6px] z-[-1] transition-opacity duration-200 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={closeMenu} aria-hidden="true" />

        <div className="relative w-full">
          {/* Top Pill / Closed State */}
          <div
            className="flex items-center justify-between w-full h-[64px] px-5 transition-all duration-300 ease-in-out z-30 relative rounded-full overflow-visible"
            style={{
              background: 'rgba(255, 255, 255, 0.55)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 0 rgba(255, 255, 255, 0.2)'
            }}
          >
            {/* Top rim highlight */}
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 0,
                left: '8%',
                right: '8%',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9) 30%, rgba(255,255,255,0.9) 70%, transparent)',
                borderRadius: '9999px',
                pointerEvents: 'none'
              }}
            />
            <Link to="/" className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-accent rounded-sm relative z-10" onClick={closeMenu}>
              <img src="/assets/favicon/favicon.svg" alt="Horizon Logo" className="w-8 h-8" />
              <span className="text-xl font-bold tracking-tight text-slate-900">Horizon</span>
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center justify-center w-11 h-11 rounded-full text-slate-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent transition-colors relative z-10"
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Expanded Menu */}
          <div
            className={`fixed top-0 left-4 right-4 w-auto bg-white/70 backdrop-blur-[12px] border-b border-white/40 shadow-lg transition-all duration-200 ease-out z-20 flex flex-col h-auto max-h-[50dvh] overflow-y-auto pt-[96px] pb-4 px-5 rounded-b-[32px] ${isMobileMenuOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-4 opacity-0 pointer-events-none'}`}
          >
            <nav className="flex flex-col mb-[56px] overflow-y-auto no-scrollbar w-full">
              {navLinks.filter(link => link.showOnMobile).map((link, index, array) => (
                <Link
                  key={index}
                  to={link.path}
                  onClick={closeMenu}
                  className={`flex items-center justify-between py-4 min-h-[56px] text-[18px] font-medium text-slate-900 hover:bg-gray-50/50 focus:outline-none focus:bg-gray-50/50 rounded-2xl transition-colors ${index !== array.length - 1 ? 'border-b border-gray-200/60' : ''}`}
                >
                  <div className="flex items-center gap-[14px]">
                    {link.icon}
                    <span className="tracking-tight">{link.label}</span>
                  </div>
                  <svg className="w-[16px] h-[16px] text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              ))}
            </nav>

            {/* Get Started CTA at bottom */}
            <div className="mt-auto">
              <Link
                to="/"
                onClick={closeMenu}
                className="flex w-full h-[56px] items-center justify-center text-[15px] font-medium tracking-tight text-white bg-slate-900 rounded-full hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};


const HeroSection = () => (
  <section className="w-full max-w-[1200px] px-4 mx-auto pt-[93px] pb-6 md:pt-[93px] md:pb-8 flex flex-col">
    <div className="flex flex-col md:flex-row items-center md:items-start gap-12 lg:gap-20 px-6 py-8 md:px-12 md:py-12 bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.07)] md:mx-6">
      {/* Left Content Column */}
      <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left justify-start w-full">

      {/* Main Typography */}
      <h1 className="text-5xl md:text-display-hero text-slate-900 mb-2 max-w-[800px]">
        Resources<br />
        for every<br />
        learner.
      </h1>

      <p className="text-lg md:text-body-large text-slate-600 max-w-[500px] mb-4">
        A growing collection of educational resources for students.
      </p>

      {/* Actions */}
      <div className="flex flex-row items-center justify-center md:justify-start gap-2 sm:gap-4 w-full sm:w-auto mt-2 md:mt-0">
        <button className="flex-1 sm:flex-none px-2 sm:px-8 py-3.5 text-[15px] sm:text-base font-medium text-white bg-slate-900 rounded-lg hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 whitespace-nowrap">
          Explore Library
        </button>
        <button className="flex-1 sm:flex-none px-2 sm:px-8 py-3.5 text-[15px] sm:text-base font-medium text-slate-900 bg-surface rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 whitespace-nowrap">
          Browse Notes
        </button>
      </div>

    </div>

    {/* Right Illustration Column - Hidden on Mobile */}
    <div className="hidden md:flex flex-1 w-full justify-end md:-mt-8">
      <div className="w-full max-w-[500px] aspect-[4/3] relative flex items-center justify-center">
        {/* We use a structured SVG composition to mimic the sketch style seen in the reference */}
        <svg viewBox="0 0 500 375" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-contain mix-blend-multiply opacity-90">
          {/* Desk Base */}
          <path d="M50 320 L450 320" stroke="#334155" strokeWidth="2" strokeLinecap="round" />

          {/* Stack of Books */}
          <rect x="80" y="270" width="100" height="15" rx="2" fill="#F8FAFC" stroke="#334155" strokeWidth="2" />
          <rect x="85" y="255" width="90" height="15" rx="2" fill="#F1F5F9" stroke="#334155" strokeWidth="2" />
          <rect x="75" y="240" width="105" height="15" rx="2" fill="#E2E8F0" stroke="#334155" strokeWidth="2" />
          <rect x="80" y="225" width="95" height="15" rx="2" fill="#F8FAFC" stroke="#334155" strokeWidth="2" />
          <rect x="85" y="210" width="85" height="15" rx="2" fill="#F1F5F9" stroke="#334155" strokeWidth="2" />

          {/* Laptop */}
          <path d="M210 320 L240 230 L360 230 L350 320 Z" fill="#F1F5F9" stroke="#334155" strokeWidth="2" strokeLinejoin="round" />
          <path d="M245 240 L345 240 L335 305 L235 305 Z" fill="#E2E8F0" stroke="#334155" strokeWidth="2" strokeLinejoin="round" />
          <rect x="190" y="320" width="180" height="8" rx="4" fill="#94A3B8" stroke="#334155" strokeWidth="2" />

          {/* Lamp Base & Arm */}
          <circle cx="400" cy="315" r="25" fill="#E2E8F0" stroke="#334155" strokeWidth="2" />
          <path d="M400 290 L420 150 L350 100" stroke="#334155" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="420" cy="150" r="4" fill="#334155" />
          <circle cx="350" cy="100" r="4" fill="#334155" />

          {/* Lamp Head */}
          <path d="M350 100 L310 140 C300 130 310 110 330 90 Z" fill="#F1F5F9" stroke="#334155" strokeWidth="2" strokeLinejoin="round" />
          <path d="M305 145 L320 130" stroke="#334155" strokeWidth="2" strokeLinecap="round" />

          {/* Coffee Mug / Pencil Cup */}
          <path d="M100 320 L100 290 C100 280 120 280 120 290 L120 320 Z" fill="#F8FAFC" stroke="#334155" strokeWidth="2" />
          <path d="M105 285 L100 260" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
          <path d="M110 285 L115 255" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
          <path d="M115 285 L125 265" stroke="#334155" strokeWidth="2" strokeLinecap="round" />

          {/* Light Rays */}
          <path d="M290 160 L270 190 M270 150 L240 170 M310 170 L300 200" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
    </div>
  </section>
);

const features = [
  {
    title: "Study Notes",
    desc: "Well-structured notes for better understanding of concepts.",
    icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
  },
  {
    title: "Previous Year Papers",
    desc: "Access past papers to understand patterns and prepare effectively.",
    icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  },
  {
    title: "Study Materials",
    desc: "Handpicked educational resources and learning materials.",
    icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
  },
  {
    title: "Practice Questions",
    desc: "Exam-oriented questions and revision material.",
    icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  },
  {
    title: "Announcements",
    desc: "Stay updated with newly uploaded resources and updates.",
    icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
  },
  {
    title: "PDF Library",
    desc: "Browse all educational resources in one organized place.",
    icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
  }
];

const FeaturesSection = () => (
  <section className="w-full px-4 md:px-8 pt-[32px] pb-24 md:pt-[32px] md:pb-32">
    <div className="flex flex-col items-center text-center mb-[44px] md:mb-[76px]">
      <h2 className="text-4xl md:text-display-section text-slate-900 mb-[52px]">Everything in one place</h2>
      <p className="text-lg md:text-body-large text-slate-600 max-w-2xl">Curated resources to help you study better and achieve more.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
      {features.map((f, i) => (
        <div key={i} className="group flex flex-col items-start p-8 md:p-10 bg-white rounded-3xl shadow-card border border-gray-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          {/* Icon Container - No Shadow */}
          <div className="w-8 md:w-9 h-8 md:h-9 shrink-0 bg-surface rounded-full flex items-center justify-center text-slate-700 mb-8">
            {f.icon}
          </div>

          {/* Text Content */}
          <div className="flex flex-col flex-1 text-left w-full">
            <h3 className="text-heading-card text-slate-900 mb-4">{f.title}</h3>
            <p className="text-body-base text-slate-600 mb-10 flex-1">{f.desc}</p>
          </div>

          {/* Action Button */}
          <div className="mt-auto">
            <button className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-slate-700 group-hover:bg-accent group-hover:text-white transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  </section>
);

const SecondaryCTASection = () => (
  <section className="w-full px-4 md:px-8 py-16 pb-32">
        <div className="w-full bg-[#0B1120] rounded-[3rem] p-12 md:p-20 flex flex-col md:flex-row items-center md:items-stretch justify-between gap-12">
      <div className="flex-1 text-left flex flex-col justify-center">
        <h2 className="text-4xl md:text-[3.5rem] leading-tight text-white mb-6 font-bold">New<br/>here?</h2>
        <p className="text-slate-300 text-lg md:text-xl max-w-[200px] leading-relaxed">Start exploring resources that help you learn, practice and succeed.</p>
      </div>
      <div className="w-full md:w-auto flex shrink-0 items-center">
        <button className="w-full md:w-auto px-10 py-5 flex items-center justify-center gap-3 text-lg font-medium text-white bg-slate-800 rounded-full hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-slate-900">
          Explore Now
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </button>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="w-full bg-white pt-24 pb-12 px-4 md:px-8 border-t border-gray-100 flex flex-col items-center">
    <div className="w-full max-w-[1200px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-20">

      {/* Brand Column */}
      <div className="flex flex-col lg:col-span-4 pr-8">
        <h3 className="text-2xl font-bold text-slate-900 mb-6">Horizon</h3>
        <p className="text-body-base text-slate-600 mb-8 max-w-xs">
          Your Path. Your Future.<br/>
          Built for students.<br/>
          Designed for success.
        </p>

                {/* Social Icons Placeholder */}
        <div className="flex items-center gap-4 mt-4">
          {[1, 2, 3, 4].map((i) => (
            <button key={i} className="w-5 h-7 rounded-full bg-surface flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-accent">
              <span className="w-5 h-5 bg-[#CBD5E1] rounded-sm"></span>
            </button>
          ))}
        </div>
      </div>

      {/* Explore Links */}
      <div className="flex flex-col lg:col-span-2">
        <h4 className="text-heading-card text-slate-900 mb-6">Explore</h4>
        <nav className="flex flex-col gap-4">
          <Link to="/" className="text-body-base text-slate-500 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm inline-block w-fit">Library</Link>
          <Link to="/" className="text-body-base text-slate-500 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm inline-block w-fit">Notes</Link>
          <Link to="/" className="text-body-base text-slate-500 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm inline-block w-fit">Past Papers</Link>
          <Link to="/" className="text-body-base text-slate-500 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm inline-block w-fit">Study Materials</Link>
          <Link to="/" className="text-body-base text-slate-500 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm inline-block w-fit">Practice Questions</Link>
        </nav>
      </div>

      {/* Info Links */}
      <div className="flex flex-col lg:col-span-2">
        <h4 className="text-heading-card text-slate-900 mb-6">Info</h4>
        <nav className="flex flex-col gap-4">
          <Link to="/" className="text-body-base text-slate-500 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm inline-block w-fit">Announcements</Link>
          <Link to="/" className="text-body-base text-slate-500 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm inline-block w-fit">About Us</Link>
          <Link to="/" className="text-body-base text-slate-500 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm inline-block w-fit">Contact</Link>
          <Link to="/" className="text-body-base text-slate-500 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm inline-block w-fit">Privacy Policy</Link>
          <Link to="/" className="text-body-base text-slate-500 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm inline-block w-fit">Terms of Use</Link>
        </nav>
      </div>

      {/* Newsletter */}
      <div className="flex flex-col lg:col-span-4">
        <h4 className="text-heading-card text-slate-900 mb-6">Stay Updated</h4>
        <p className="text-body-base text-slate-500 mb-6 max-w-sm">Subscribe to get the latest announcements and updates.</p>
        <form className="relative max-w-md" onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            placeholder="Your email"
            className="w-full pl-5 pr-14 py-3.5 text-base bg-surface border border-transparent rounded-lg focus:outline-none focus:border-gray-200 focus:bg-white focus:ring-2 focus:ring-accent placeholder-slate-400 text-slate-900 transition-all"
          />
          <button className="absolute right-2 top-2 bottom-2 w-10 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-md">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </form>
      </div>

    </div>

    {/* Copyright Strip */}
    <div className="w-full max-w-[1200px] pt-8 border-t border-gray-100 flex justify-center">
      <p className="text-sm text-slate-500">© {new Date().getFullYear()} Horizon. All rights reserved.</p>
    </div>
  </footer>
);

const Home: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex flex-col bg-white selection:bg-gray-200 selection:text-black text-slate-900 font-sans">
      <Header />
      <main className="flex-1 w-full flex flex-col items-center">
        <div className="w-full max-w-[1200px] flex flex-col items-center">
          <HeroSection />
          <FeaturesSection />
          <SecondaryCTASection />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Home;
