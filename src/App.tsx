import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Core layout and non-lazy components
import Home from './pages/home/Home';
import MainLayout from './layouts/MainLayout';
import ScrollToTop from './components/ScrollToTop';
import AuthListener from './components/AuthListener';
import { AuthProvider } from './context/AuthContext';
import PageLoader from './components/loading/PageLoader';
import RenderingScreen from './components/RenderingScreen/RenderingScreen';

// Lazy loaded pages
const Library = lazy(() => import('./pages/resources/LibraryRoute'));
const ResourceDetails = lazy(() => import('./pages/resources/ResourceDetails'));
const Dashboard = lazy(() => import('./pages/user/Dashboard'));
const NotificationSettings = lazy(() => import('./pages/settings/NotificationSettings'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Onboarding = lazy(() => import('./pages/onboarding/Onboarding'));
import About from './pages/about/About';
import Contact from './pages/contact/Contact';
import Terms from './pages/terms/Terms';
import PrivacyPolicy from './pages/privacy/PrivacyPolicy';
import Attribution from './pages/attribution/Attribution';
const PdfViewer = lazy(() => import('./pages/resources/PdfViewer'));
const StudyNotes = lazy(() => import('./pages/resources/StudyNotesRoute'));
const SyllabusPage = lazy(() => import('./pages/syllabus/SyllabusPage'));
const ComingSoon = lazy(() => import('./pages/coming-soon/ComingSoon'));

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthListener />
        <ScrollToTop />
        <Routes>
          <Route path="/onboarding" element={<Suspense fallback={<PageLoader />}><Onboarding /></Suspense>} />
          <Route path="/" element={<Home />} />

          <Route element={<MainLayout />}>
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
