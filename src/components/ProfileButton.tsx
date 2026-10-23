import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDefaultAvatar } from '../utils/avatar';

interface ProfileButtonProps {
  onClick?: () => void;
  className?: string;
}

const ProfileButton: React.FC<ProfileButtonProps> = ({ onClick, className }) => {
  const { user, profile } = useAuth();

  const ariaLabel = user
    ? profile?.name
      ? `${profile.name}'s Profile`
      : 'Go to Dashboard'
    : 'Log in';

  const defaultAvatarPath = getDefaultAvatar(user?.id || profile?.id);

  const content = user && profile ? (
    <img
      src={profile.avatar_url || defaultAvatarPath}
      alt=""
      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '9999px' }}
    />
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );

  return (
    <Link
      to={user ? "/dashboard" : "/login"}
      className={className || "w-11 h-11 neu-raised rounded-full neu-raised-hover flex items-center justify-center cursor-pointer no-underline overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2"}
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {content}
    </Link>
  );
};

export default ProfileButton;
