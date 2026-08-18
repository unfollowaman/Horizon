import type React from 'react';
import { Link } from 'react-router-dom';

const ComingSoon: React.FC = () => {
  return (
    <div className="w-[min(96vw,1600px)] mx-auto px-[clamp(16px,2vw,32px)] pt-[10px] pb-[clamp(24px,3vw,48px)] flex flex-col items-center justify-center min-h-[50vh] text-center">
      <h1 className="text-[clamp(36px,5vw,56px)] leading-tight uppercase text-ink mb-4">Coming Soon</h1>
      <p className="text-body1 text-muted-foreground max-w-lg mx-auto mb-8">
        We are working hard to bring you this feature. Stay tuned for updates!
      </p>
      <img
        src="/assets/SVG Illustrations/coming-soon.svg"
        alt="Coming Soon"
        className="w-full max-w-md h-auto mx-auto mb-8 object-contain"
      />
      <Link to="/" className="neu-raised neu-raised-hover px-6 py-2 rounded-full text-ink text-body1 font-medium no-underline">
        Back to Home
      </Link>
    </div>
  );
};

export default ComingSoon;
