import { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Core layout and non-lazy components
import Home from './pages/home/Home';
import ScrollToTop from './components/ScrollToTop';
import AuthListener from './components/AuthListener';
import { AuthProvider } from './context/AuthContext';
import PageLoader from './components/loading/PageLoader';
import { lazyWithRetry } from './utils/lazyWithRetry';

// Lazy loaded layout & pages with dynamic import retry mechanism
const MainLayout = lazyWithRetry(() => import('./layouts/MainLayout'));
const Library = lazyWithRetry(() => import('./pages/resources/LibraryRoute'));
const ResourceDetails = lazyWithRetry(() => import('./pages/resources/ResourceDetails'));
const Dashboard = lazyWithRetry(() => import('./pages/user/Dashboard'));
const NotificationSettings = lazyWithRetry(() => import('./pages/settings/NotificationSettings'));
const Login = lazyWithRetry(() => import('./pages/auth/Login'));
const Register = lazyWithRetry(() => import('./pages/auth/Register'));
const Onboarding = lazyWithRetry(() => import('./pages/onboarding/Onboarding'));
const About = lazyWithRetry(() => import('./pages/about/About'));
const Contact = lazyWithRetry(() => import('./pages/contact/Contact'));
const Terms = lazyWithRetry(() => import('./pages/terms/Terms'));
const PrivacyPolicy = lazyWithRetry(() => import('./pages/privacy/PrivacyPolicy'));
const Attribution = lazyWithRetry(() => import('./pages/attribution/Attribution'));
const PdfViewer = lazyWithRetry(() => import('./pages/resources/PdfViewer'));
const StudyNotes = lazyWithRetry(() => import('./pages/resources/StudyNotesRoute'));
const SyllabusPage = lazyWithRetry(() => import('./pages/syllabus/SyllabusPage'));
const ComingSoon = lazyWithRetry(() => import('./pages/coming-soon/ComingSoon'));
const RenderingScreen = lazyWithRetry(() => import('./components/RenderingScreen/RenderingScreen'));

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthListener />
        <ScrollToTop />
        <Routes>
          <Route path="/onboarding" element={<Suspense fallback={<PageLoader />}><Onboarding /></Suspense>} />
          <Route path="/" element={<Home />} />

          <Route element={<Suspense fallback={<PageLoader />}><MainLayout /></Suspense>}>
            {/* Small static pages are intentionally kept in the main bundle. */}
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/attribution" element={<Attribution />} />

            {/* Lazy-loaded heavy pages. MainLayout manages the suspense internally. */}
            <Route path="/library" element={<Library />} />
            <Route path="/library/:classSlug" element={<Library />} />
            <Route path="/library/:classSlug/:mediumSlug" element={<Library />} />
            <Route path="/library/:classSlug/:mediumSlug/:subjectSlug" element={<Library />} />

            <Route path="/notes" element={<StudyNotes />} />
            <Route path="/notes/:classSlug" element={<StudyNotes />} />
            <Route path="/notes/:classSlug/:mediumSlug" element={<StudyNotes />} />
            <Route path="/notes/:classSlug/:mediumSlug/:subjectSlug" element={<StudyNotes />} />

            {/* Syllabus routes */}
            <Route path="/syllabus" element={<SyllabusPage />} />
            <Route path="/syllabus/:classSlug" element={<SyllabusPage />} />
            <Route path="/syllabus/:classSlug/:subjectSlug" element={<SyllabusPage />} />

            <Route path="/resource/:id" element={<ResourceDetails />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings/notifications" element={<NotificationSettings />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/coming-soon" element={<ComingSoon />} />
          </Route>

          {/* Standalone PDF Viewer Route */}
          <Route path="/view/:id" element={<Suspense fallback={<RenderingScreen />}><PdfViewer /></Suspense>} />

          {/* Catch-all route for 404s */}
          <Route path="*" element={<div style={{ padding: '2rem', textAlign: 'center' }}><h2>404 - Page Not Found</h2></div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
