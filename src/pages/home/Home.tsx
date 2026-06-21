import type React from 'react';
import { Link } from 'react-router-dom';

const Header = () => (
  <header className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
    <div className="flex items-center justify-between w-full max-w-5xl px-6 py-3 bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100">
      <div className="flex items-center">
        <Link to="/" className="text-2xl font-bold tracking-tight text-black">Horizon</Link>
      </div>

      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center gap-8">
        <Link to="/" className="text-sm font-medium text-black transition-colors">Home</Link>
        <Link to="/" className="text-sm font-medium text-gray-500 hover:text-black transition-colors">Library</Link>
        <Link to="/" className="text-sm font-medium text-gray-500 hover:text-black transition-colors">Notes</Link>
        <Link to="/" className="text-sm font-medium text-gray-500 hover:text-black transition-colors">Previous Papers</Link>
        <Link to="/" className="text-sm font-medium text-gray-500 hover:text-black transition-colors">Announcements</Link>
      </nav>

      <div className="hidden md:flex items-center">
        <Link to="/" className="px-6 py-3 text-sm font-bold text-white bg-black rounded-full hover:bg-gray-800 hover:shadow-lg transition-all active:scale-95">Explore Library</Link>
      </div>

      {/* Mobile Menu Icon */}
      <button className="md:hidden p-2 text-black">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
    </div>
  </header>
);

const HeroSection = () => (
  <section className="w-full max-w-6xl mx-auto px-4 pt-40 pb-20 md:pt-48 md:pb-32 flex flex-col md:flex-row items-center gap-12">
    <div className="flex-1 flex flex-col items-start text-left">
      <span className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-gray-600 bg-gray-200 rounded-full mb-8">Your Path. Your Future.</span>
      <h1 className="text-5xl md:text-6xl lg:text-[72px] font-bold leading-[1.05] tracking-tight mb-8 text-black">Everything you need to learn, all in one place.</h1>
      <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-lg leading-relaxed">
        Horizon provides students with curated educational resources, well-structured notes, and practice materials designed for success.
      </p>
      <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
        <button className="w-full sm:w-auto px-8 py-4 text-base font-bold text-white bg-black rounded-full hover:shadow-[0_8px_20px_rgb(0,0,0,0.15)] hover:-translate-y-0.5 transition-all active:scale-95">Explore Library</button>
        <button className="w-full sm:w-auto px-8 py-4 text-base font-bold text-black bg-white rounded-full border border-gray-200 shadow-sm hover:shadow-[0_8px_20px_rgb(0,0,0,0.05)] hover:-translate-y-0.5 transition-all active:scale-95">Browse Notes</button>
      </div>
    </div>

    <div className="flex-1 w-full max-w-lg md:max-w-none mt-12 md:mt-0">
      <div className="w-full aspect-square bg-white rounded-[2.5rem] shadow-[0_20px_40px_rgb(0,0,0,0.06)] flex items-center justify-center p-8 border border-gray-100 relative overflow-hidden group">
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_center,_#000_1px,_transparent_1px)]" style={{ backgroundSize: '24px 24px' }}></div>

        {/* Monochrome sketch-style illustration */}
        <svg className="w-full h-full max-w-sm text-black relative z-10 transition-transform duration-700 group-hover:scale-105" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Desk Base */}
          <rect x="60" y="260" width="280" height="12" rx="6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M80 272L70 360M320 272L330 360" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>

          {/* Laptop */}
          <rect x="140" y="180" width="120" height="80" rx="6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="110" y="260" width="180" height="8" rx="4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M190 200V180H210" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>

          {/* Lamp */}
          <circle cx="310" cy="140" r="24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M310 164L310 260" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M290 260H330" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M295 125L280 110M325 125L340 110M310 116V95" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>

          {/* Books */}
          <path d="M80 230L120 230M80 245L120 245" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M70 260V220C70 215 75 210 80 210H120C125 210 130 215 130 220V260" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
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
  <section className="w-full max-w-6xl mx-auto px-4 py-24">
    <div className="flex flex-col items-center text-center mb-20">
      <span className="text-sm font-bold tracking-[0.2em] text-gray-400 uppercase mb-4">WHAT YOU'LL GET</span>
      <h2 className="text-4xl md:text-5xl font-bold mb-6 text-black">Everything in one place</h2>
      <p className="text-xl text-gray-500 max-w-2xl">Curated resources to help students learn better and achieve more.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {features.map((f, i) => (
        <div key={i} className="group flex flex-col p-10 bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1.5 transition-all duration-300">
          <div className="w-16 h-16 bg-[#F5F5F0] rounded-2xl flex items-center justify-center text-black mb-8 group-hover:scale-110 transition-transform duration-300">
            {f.icon}
          </div>
          <h3 className="text-2xl font-bold mb-4 text-black">{f.title}</h3>
          <p className="text-lg text-gray-500 mb-10 flex-1 leading-relaxed">{f.desc}</p>
          <div className="mt-auto">
            <button className="w-12 h-12 rounded-full bg-[#F5F5F0] flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors duration-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  </section>
);

const SecondaryCTASection = () => (
  <section className="w-full max-w-6xl mx-auto px-4 py-16 pb-32">
    <div className="w-full bg-black text-white rounded-[3rem] p-12 md:p-20 flex flex-col md:flex-row items-center justify-between gap-12 shadow-[0_20px_40px_rgb(0,0,0,0.15)] relative overflow-hidden">
      {/* Decorative subtle background circle */}
      <div className="absolute -right-20 -top-40 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>

      <div className="flex-1 max-w-2xl text-left relative z-10">
        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">New here?</h2>
        <p className="text-gray-300 text-xl md:text-2xl leading-relaxed">Start exploring resources that help you learn, practice and succeed.</p>
      </div>
      <div className="w-full md:w-auto relative z-10">
        <button className="w-full md:w-auto whitespace-nowrap px-10 py-5 text-lg font-bold text-black bg-white rounded-full hover:bg-gray-100 hover:scale-105 transition-all active:scale-95 shadow-xl">Explore Now</button>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="w-full bg-white pt-24 pb-12 px-4 md:px-8 border-t border-gray-100">
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
      <div className="flex flex-col">
        <h3 className="text-3xl font-bold text-black mb-2">Horizon</h3>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">Your Path. Your Future.</p>
        <p className="text-lg text-gray-500 leading-relaxed">Built for students.<br/>Designed for success.</p>
      </div>

      <div className="flex flex-col">
        <h4 className="text-xl font-bold text-black mb-8">Explore</h4>
        <nav className="flex flex-col gap-5">
          <Link to="/" className="text-lg text-gray-500 hover:text-black transition-colors">Library</Link>
          <Link to="/" className="text-lg text-gray-500 hover:text-black transition-colors">Notes</Link>
          <Link to="/" className="text-lg text-gray-500 hover:text-black transition-colors">Previous Papers</Link>
          <Link to="/" className="text-lg text-gray-500 hover:text-black transition-colors">Study Materials</Link>
          <Link to="/" className="text-lg text-gray-500 hover:text-black transition-colors">Practice Questions</Link>
        </nav>
      </div>

      <div className="flex flex-col">
        <h4 className="text-xl font-bold text-black mb-8">Information</h4>
        <nav className="flex flex-col gap-5">
          <Link to="/" className="text-lg text-gray-500 hover:text-black transition-colors">Announcements</Link>
          <Link to="/" className="text-lg text-gray-500 hover:text-black transition-colors">About</Link>
          <Link to="/" className="text-lg text-gray-500 hover:text-black transition-colors">Contact</Link>
          <Link to="/" className="text-lg text-gray-500 hover:text-black transition-colors">Privacy Policy</Link>
        </nav>
      </div>

      <div className="flex flex-col">
        <h4 className="text-xl font-bold text-black mb-8">Stay Updated</h4>
        <p className="text-lg text-gray-500 mb-6 leading-relaxed">Subscribe to get notified when new study materials and resources are uploaded.</p>
        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full px-5 py-4 text-lg bg-[#F5F5F0] border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-black placeholder-gray-400"
          />
          <button className="w-full px-5 py-4 text-lg bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-colors active:scale-[0.98]">Subscribe</button>
        </form>
      </div>
    </div>
    <div className="max-w-6xl mx-auto pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between text-base text-gray-400">
      <p>© {new Date().getFullYear()} Horizon. All rights reserved.</p>
    </div>
  </footer>
);

const Home: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex flex-col selection:bg-gray-200 selection:text-black">
      <Header />
      <main className="flex-1 w-full">
        <HeroSection />
        <FeaturesSection />
        <SecondaryCTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
