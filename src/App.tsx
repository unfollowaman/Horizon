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
import About from './pages/about/About';
import PrivacyPolicy from './pages/privacy/PrivacyPolicy';
import ScrollToTop from './components/ScrollToTop';

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route element={<MainLayout />}>
          <Route path="/about" element={<About />} />
          <Route path="/library" element={<Library />} />
          <Route path="/resource/:id" element={<ResourceDetails />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings/notifications" element={<NotificationSettings />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        </Route>
        {/* Catch-all route for 404s */}
        <Route path="*" element={<div style={{ padding: '2rem', textAlign: 'center' }}><h2>404 - Page Not Found</h2></div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
