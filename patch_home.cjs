const fs = require('fs');
const content = fs.readFileSync('src/pages/home/Home.tsx', 'utf-8');

let newContent = content.replace(
  /<div className={styles\.menuBrandIcon}>\s*<img src="\/assets\/favicon\/logo\.png" alt="Horizon Logo" className={styles\.menuBrandLogoImg} \/>\s*<\/div>/g,
  `{session ? <div className={styles.menuProfileContainer}><ProfilePopover /></div> : <div style={{ width: '40px', height: '40px' }} />}`
);

newContent = newContent.replace(
  /<nav className={styles\.menuNavLinks}>/g,
  `<nav className={\`\${styles.menuNavLinks} \${session ? styles.menuNavLinksAuth : ''}\`}>`
);

newContent = newContent.replace(
  /{navLinks\.filter\(link => link\.showOnMobile\)\.map\(\(link, index\) => \(\s*<Link\s*key={index}\s*to={link\.path}\s*onClick={closeMenu}\s*className={styles\.menuNavLink}\s*>\s*{link\.label}\s*<\/Link>\s*\)\)}/g,
  `{navLinks.filter(link => link.showOnMobile).map((link, index, array) => (
                    <React.Fragment key={index}>
                      <Link
                        to={link.path}
                        onClick={closeMenu}
                        className={styles.menuNavLink}
                      >
                        {link.label}
                      </Link>
                      {index < array.length - 1 && <div className={styles.menuDivider} />}
                    </React.Fragment>
                  ))}`
);

newContent = newContent.replace(
  /{!loading && \(\s*<div className={styles\.menuActionButtons}>\s*{session \? \(\s*<div style={{ alignSelf: 'center', margin: 'auto' }}>\s*<ProfilePopover \/>\s*<\/div>\s*\) : \(\s*<>\s*<Link to="\/login" onClick={closeMenu} className={styles\.menuSignInBtn}>\s*Sign in\s*<\/Link>\s*<Link to="\/register" onClick={closeMenu} className={styles\.menuGetNowBtn}>\s*Get Started\s*<\/Link>\s*<\/>\s*\)}\s*<\/div>\s*\)}/g,
  `{!loading && !session && (
                  <div className={styles.menuActionButtons}>
                    <Link to="/login" onClick={closeMenu} className={styles.menuSignInBtn}>
                      Sign in
                    </Link>
                    <Link to="/register" onClick={closeMenu} className={styles.menuGetNowBtn}>
                      Get Started
                    </Link>
                  </div>
                )}`
);

fs.writeFileSync('src/pages/home/Home.tsx', newContent, 'utf-8');
console.log('Patched Home.tsx successfully.');
