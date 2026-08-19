import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './ProfilePopover.module.css';

const ProfilePopover: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const togglePopover = () => setIsOpen(!isOpen);
  const closePopover = () => setIsOpen(false);

  const handleSignOut = async () => {
    await signOut();
    closePopover();
    navigate('/');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        closePopover();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePopover();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!user || !profile) return null;

  const initials = profile.name ? profile.name.substring(0, 2).toUpperCase() : 'U';

  return (
    <div className={styles.popoverContainer} ref={popoverRef}>
      <button
        className={`${styles.avatarBtn} neu-raised neu-raised-hover`}
        onClick={togglePopover}
        aria-expanded={isOpen}
      >
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="Profile Avatar" className={styles.avatarImg} />
        ) : (
          <span className={styles.avatarInitials}>{initials}</span>
        )}
      </button>

      {isOpen && (
        <div className={`${styles.popoverMenu} neu-raised`}>
          <div className={styles.popoverHeader}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile Avatar" className={styles.popoverAvatar} />
            ) : (
              <div className={styles.popoverAvatarPlaceholder}>{initials}</div>
            )}
            <div className={styles.popoverUserInfo}>
              <div className={styles.popoverName}>{profile.name || 'User'}</div>
              <div className={styles.popoverEmail}>{user.email}</div>
            </div>
          </div>
          <div className={styles.divider} />
          <div className={styles.popoverActions}>
            <Link
              to="/dashboard"
              className={styles.popoverLink}
              onClick={closePopover}
            >
              View Profile
            </Link>
            <button
              onClick={handleSignOut}
              className={styles.popoverSignOutBtn}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePopover;
