import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

const LibraryInFeedAd: React.FC = () => {
  const adRef = useRef<HTMLModElement>(null);
  const isPushedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate push if already pushed or initialized by AdSense
    if (isPushedRef.current) return;

    if (adRef.current && adRef.current.getAttribute('data-adsbygoogle-status')) {
      isPushedRef.current = true;
      return;
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      isPushedRef.current = true;
    } catch (e) {
      console.error('AdSense push error:', e);
    }
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center neu-raised p-4 rounded-xl min-h-[250px] overflow-hidden">
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
        data-ad-format="fluid"
        data-ad-layout-key="+1u+s2-y-1h+6i"
        data-ad-client="ca-pub-9895594998996093"
        data-ad-slot="4471690440"
      />
    </div>
  );
};

export default LibraryInFeedAd;
