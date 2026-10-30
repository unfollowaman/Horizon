import React from 'react';

const SlimRouteLoader: React.FC = () => (
  <div className="w-full flex flex-col items-center justify-start min-h-[40vh] pt-8 px-4" role="status" aria-label="Loading page route">
    <span className="sr-only">Loading page content...</span>
    <div className="w-full max-w-xl neu-recessed h-2 rounded-full overflow-hidden relative">
      <div className="h-full bg-gradient-to-r from-[#E91E8C] via-[#C2185B] to-[#8B0A50] animate-pulse rounded-full w-2/3 mx-auto" />
    </div>
  </div>
);

export default SlimRouteLoader;
