import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Pages
import Home from './pages/home/Home';
import MainLayout from './layouts/MainLayout';
import Library from './pages/resources/Library';
import ResourceDetails from './pages/resources/ResourceDetails';
import Dashboard from './pages/user/Dashboard';
import NotificationSettings from './pages/settings/NotificationSettings';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Onboarding from './pages/onboarding/Onboarding';
import About from './pages/about/About';
import PrivacyPolicy from './pages/privacy/PrivacyPolicy';
import ScrollToTop from './components/ScrollToTop';
import PdfViewer from './pages/resources/PdfViewer';
import StudyNotes from './pages/resources/StudyNotes';
import AuthListener from './components/AuthListener';
import ComingSoon from './pages/coming-soon/ComingSoon';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthListener />
        <ScrollToTop />
        <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<Home />} />
        <Route element={<MainLayout />}>
          <Route path="/about" element={<About />} />
          <Route path="/library" element={<Library />} />
          <Route path="/notes" element={<StudyNotes />} />
          <Route path="/resource/:id" element={<ResourceDetails />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings/notifications" element={<NotificationSettings />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/coming-soon" element={<ComingSoon />} />
        </Route>

        {/* Standalone PDF Viewer Route */}
        <Route path="/view/:id" element={<PdfViewer />} />

          {/* Catch-all route for 404s */}
          <Route path="*" element={<div style={{ padding: '2rem', textAlign: 'center' }}><h2>404 - Page Not Found</h2></div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
