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

function App() {
  return (
    <BrowserRouter>
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
        </Route>
        {/* Catch-all route for 404s */}
        <Route path="*" element={<div style={{ padding: '2rem', textAlign: 'center' }}><h2>404 - Page Not Found</h2></div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
