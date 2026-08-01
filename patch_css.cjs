const fs = require('fs');
let css = fs.readFileSync('src/pages/home/Home.module.css', 'utf-8');

// Replace .menuBrandIcon and .menuBrandLogoImg with .menuProfileContainer
css = css.replace(
  /\.menuBrandIcon \{[\s\S]*?\}\n\.menuBrandLogoImg \{[\s\S]*?\}/g,
  `.menuProfileContainer button {
  width: 40px !important;
  height: 40px !important;
}`
);

// Add .menuDivider and .menuNavLinksAuth right after .menuNavLinks rules
css = css.replace(
  /\.menuNavLink:focus \{[\s\S]*?\}/g,
  `$&

.menuDivider {
  height: 1px;
  background-color: rgba(0, 0, 0, 0.5);
  margin: 8px var(--spacing-1);
  border: none;
}

.menuNavLinksAuth {
  margin-bottom: 0;
}`
);

fs.writeFileSync('src/pages/home/Home.module.css', css, 'utf-8');
console.log('Patched CSS successfully.');
