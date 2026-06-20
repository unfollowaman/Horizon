import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Layouts
import MainLayout from './layouts/MainLayout';

// Pages
import Home from './pages/home/Home';
import Library from './pages/resources/Library';
import ResourceDetails from './pages/resources/ResourceDetails';

// Auth & User Pages (Placeholders)
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/user/Dashboard';

// Settings Pages (Placeholders)
import NotificationSettings from './pages/settings/NotificationSettings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="library" element={<Library />} />
          <Route path="resource/:id" element={<ResourceDetails />} />

          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="dashboard" element={<Dashboard />} />

          <Route path="settings/notifications" element={<NotificationSettings />} />

          {/* Catch-all route for 404s */}
          <Route path="*" element={<div style={{ padding: '2rem', textAlign: 'center' }}><h2>404 - Page Not Found</h2></div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
