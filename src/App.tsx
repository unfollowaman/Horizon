import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Pages
import Home from './pages/home/Home';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Catch-all route for 404s */}
        <Route path="*" element={<div style={{ padding: '2rem', textAlign: 'center' }}><h2>404 - Page Not Found</h2></div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
