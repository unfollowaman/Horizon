import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

  return (
    <div className={`${styles.menuOverlayWrapper} ${isMobileMenuOpen ? styles.menuOverlayVisible : styles.menuOverlayHidden}`}>
      <div className={styles.menuBackdrop} onClick={closeMenu} aria-hidden="true" />
      <div className={styles.menuContentWrapper}>
        <div className={`${styles.menuPanel} neu-raised ${isMobileMenuOpen ? styles.menuPanelActive : styles.menuPanelInactive}`}>
          <div className={styles.menuHeader}>
            {user ? <div className={styles.menuProfileContainer}><ProfileButton onClick={closeMenu} /></div> : <div style={{ width: '40px', height: '40px' }} />}
            <button type="button" aria-label="Close menu" onClick={closeMenu} className={styles.menuCloseBtn}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className={`${styles.menuNavLinks} ${user ? styles.menuNavLinksAuth : ''}`}>
            {navLinks.filter(link => link.showOnMobile).map((link, index, array) => (
              <React.Fragment key={link.id || index}>
                <Link
                  to={link.path}
                  onClick={closeMenu}
                  className={styles.menuNavLink}
                >
                  {link.label}
                </Link>
                {(index < array.length - 1 || user) && <div className={styles.menuDivider} />}
              </React.Fragment>
            ))}

            {user && (
              <React.Fragment>
                <Link
                  to="/dashboard"
                  onClick={closeMenu}
                  className={styles.menuNavLink}
                >
                  Profile
                </Link>
                <div className={styles.menuDivider} />
                <button
                  onClick={async () => {
                    closeMenu();
                    await signOut();
                    navigate('/');
                  }}
                  className={styles.menuSignOutBtn}
                >
                  Log Out
                </button>
              </React.Fragment>
            )}
          </nav>
          {(!user) && (
            <div className={styles.menuActionButtons}>
              <Link to="/login" onClick={closeMenu} className={styles.menuSignInBtn}>
                Sign in
              </Link>
              <Link to="/register" onClick={closeMenu} className={styles.menuGetNowBtn}>
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
