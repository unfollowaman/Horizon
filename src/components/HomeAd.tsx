import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

const HomeAd: React.FC = () => {
  const adRef = useRef<HTMLModElement>(null);
  const isPushedRef = useRef(false);

  useEffect(() => {
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
    <div className="mt-8 md:mt-12 w-full flex justify-center items-center overflow-hidden min-h-[100px]">
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
        data-ad-client="ca-pub-9895594998996093"
        data-ad-slot="5844481863"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default HomeAd;
