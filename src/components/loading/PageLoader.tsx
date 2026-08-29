import React from 'react';
import Spinner from './Spinner';

const PageLoader: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] w-full p-4">
    <div className="neu-card w-[calc(100%-2rem)] max-w-[400px] mx-auto p-8 flex flex-col items-center justify-center text-center animate-fade-rise">
      <Spinner size="lg" className="mb-4" />
      <h2 className="text-h2 text-ink uppercase tracking-wider">Loading...</h2>
    </div>
  </div>
);

export default PageLoader;
