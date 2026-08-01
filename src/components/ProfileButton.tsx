import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProfileButton: React.FC = () => {
  const { user, profile } = useAuth();
  const initials = profile?.name ? profile.name.substring(0, 2).toUpperCase() : 'U';

  const content = user && profile ? (
    profile.avatar_url ? (
      <img src={profile.avatar_url} alt="Profile Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '9999px' }} />
    ) : (
      <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--ink)' }}>{initials}</span>
    )
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );

  return (
    <Link
      to={user ? "/dashboard" : "/login"}
      className="w-11 h-11 neu-raised rounded-full neu-raised-hover flex items-center justify-center cursor-pointer no-underline overflow-hidden"
      aria-label="Go to Profile"
    >
      {content}
    </Link>
  );
};

export default ProfileButton;
