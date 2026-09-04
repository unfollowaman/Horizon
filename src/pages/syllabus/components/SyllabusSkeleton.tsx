import React from 'react';

export const SyllabusSkeleton: React.FC = () => {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <div className="h-8 bg-black/5 rounded-xl w-1/3"></div>
      <div className="h-4 bg-black/5 rounded-lg w-2/3"></div>

      <div className="space-y-4 pt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="neu-card rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-6 bg-black/5 rounded-lg w-1/2"></div>
              <div className="h-8 w-8 bg-black/5 rounded-full"></div>
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-4 bg-black/5 rounded w-3/4"></div>
              <div className="h-4 bg-black/5 rounded w-5/6"></div>
              <div className="h-4 bg-black/5 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SyllabusSkeleton;
