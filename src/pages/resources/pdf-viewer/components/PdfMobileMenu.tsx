import React, { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ProfileButton from '../../../../components/ProfileButton';
import { navLinks } from '../../../../data/navigation';
import styles from '../../PdfViewer.module.css';

interface PdfMobileMenuProps {
  isMobileMenuOpen: boolean;
  closeMenu: () => void;
  user: import('@supabase/supabase-js').User | null;
  signOut: () => Promise<void>;
}

export const PdfMobileMenu: React.FC<PdfMobileMenuProps> = ({ isMobileMenuOpen, closeMenu, user, signOut }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        closeMenu();
      }
    };

    if (isMobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen, closeMenu]);

  return (
    <div className={`${styles.menuOverlayWrapper} ${isMobileMenuOpen ? styles.menuOverlayVisible : styles.menuOverlayHidden}`}>
      <div className={styles.menuBackdrop} onClick={closeMenu} aria-hidden="true" />
      <div className={styles.menuContentWrapper}>
        <div
          className={`${styles.menuPanel} neu-raised ${isMobileMenuOpen ? styles.menuPanelActive : styles.menuPanelInactive}`}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
        >
          <div className={styles.menuHeader}>
            {user ? <div className={styles.menuProfileContainer}><ProfileButton onClick={closeMenu} /></div> : <div style={{ width: '40px', height: '40px' }} />}
            <button
              type="button"
              aria-label="Close menu"
              onClick={closeMenu}
              className={`${styles.menuCloseBtn} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 rounded-lg`}
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className={`${styles.menuNavLinks} ${user ? styles.menuNavLinksAuth : ''}`} aria-label="Mobile navigation">
            {navLinks.filter(link => link.showOnMobile).map((link, index, array) => {
              const isActive = location.pathname === link.path;
              return (
                <React.Fragment key={link.id || index}>
                  <Link
                    to={link.path}
                    onClick={closeMenu}
                    className={`${styles.menuNavLink} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 rounded-md`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                  {(index < array.length - 1 || user) && <div className={styles.menuDivider} />}
                </React.Fragment>
              );
            })}

            {user && (
              <React.Fragment>
                <Link
                  to="/dashboard"
                  onClick={closeMenu}
                  className={`${styles.menuNavLink} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 rounded-md`}
                  aria-current={location.pathname === '/dashboard' ? 'page' : undefined}
                >
                  Profile
                </Link>
                <div className={styles.menuDivider} />
                <button
                  type="button"
                  aria-label="Log out of your account"
                  onClick={async () => {
                    closeMenu();
                    await signOut();
                    navigate('/');
                  }}
                  className={`${styles.menuSignOutBtn} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 rounded-md`}
                >
                  Log Out
                </button>
              </React.Fragment>
            )}
          </nav>
          {(!user) && (
            <div className={styles.menuActionButtons}>
              <Link
                to="/login"
                onClick={closeMenu}
                className={`${styles.menuSignInBtn} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 rounded-xl`}
              >
                Sign in
              </Link>
              <Link
                to="/register"
                onClick={closeMenu}
                className={`${styles.menuGetNowBtn} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 rounded-xl`}
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
