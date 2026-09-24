import type React from 'react';
import { useNavigate } from 'react-router-dom';

const NotificationSettings: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Navigation Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleBack}
          className="w-11 h-11 neu-raised rounded-full neu-raised-hover flex items-center justify-center shrink-0 cursor-pointer text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2"
          aria-label="Go Back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <div>
          <span className="text-xs font-bold tracking-widest text-[#E91E8C] uppercase block">Account Settings</span>
          <h1 className="text-2xl sm:text-3xl font-bold uppercase text-ink leading-tight">Notification Settings</h1>
        </div>
      </div>

      <p className="text-sm sm:text-body1 text-ink/80 leading-relaxed">
        Configure how you receive updates and study alerts. (Push notifications coming soon)
      </p>

      {/* Push Notifications Card */}
      <section className="neu-card rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-ink">Push Notifications</h2>
        <p className="text-sm text-ink/70 leading-relaxed">
          Receive real-time alerts on your device for new resources and announcements.
        </p>

        <div className="flex items-center gap-3 pt-2">
          <input
            id="push-notifications-toggle"
            type="checkbox"
            disabled
            aria-disabled="true"
            title="Push notification settings coming soon"
            className="w-4 h-4 text-[#E91E8C] rounded border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] cursor-not-allowed"
          />
          <label htmlFor="push-notifications-toggle" className="text-sm font-semibold text-ink/80 cursor-not-allowed">
            Enable Push Notifications
          </label>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/5 text-ink/60">(Coming Soon)</span>
        </div>
      </section>

      {/* Email Preferences Card */}
      <section className="neu-card rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-ink">Email Preferences</h2>
        <ul className="space-y-3 list-none p-0 m-0">
          <li className="flex items-center gap-3">
            <input
              id="email-announcements-toggle"
              type="checkbox"
              disabled
              checked
              readOnly
              aria-disabled="true"
              title="Email preferences coming soon"
              className="w-4 h-4 text-[#E91E8C] rounded border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] cursor-not-allowed"
            />
            <label htmlFor="email-announcements-toggle" className="text-sm font-semibold text-ink/80 cursor-not-allowed">
              New Announcements
            </label>
          </li>
          <li className="flex items-center gap-3">
            <input
              id="email-enrolled-toggle"
              type="checkbox"
              disabled
              aria-disabled="true"
              title="Email preferences coming soon"
              className="w-4 h-4 text-[#E91E8C] rounded border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] cursor-not-allowed"
            />
            <label htmlFor="email-enrolled-toggle" className="text-sm font-semibold text-ink/80 cursor-not-allowed">
              New Resources in your enrolled categories
            </label>
          </li>
          <li className="flex items-center gap-3">
            <input
              id="email-digest-toggle"
              type="checkbox"
              disabled
              aria-disabled="true"
              title="Email preferences coming soon"
              className="w-4 h-4 text-[#E91E8C] rounded border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] cursor-not-allowed"
            />
            <label htmlFor="email-digest-toggle" className="text-sm font-semibold text-ink/80 cursor-not-allowed">
              Weekly Digest
            </label>
          </li>
        </ul>
        <p className="text-xs text-ink/60 font-semibold pt-2 border-t border-ink/5">(Coming Soon)</p>
      </section>
    </div>
  );
};

export default NotificationSettings;
