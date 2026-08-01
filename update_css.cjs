const fs = require('fs');

const path = 'src/pages/resources/PdfViewer.module.css';

const newCss = `
.pageContainer {
  height: 100vh;
  height: 100dvh; /* For mobile browsers */
  width: 100vw;
  background-color: var(--bg-base);
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.viewerContainer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0;
  position: relative;
  overflow: hidden;
}

.transformWrapperContainer {
  width: 100%;
  flex: 1;
  position: relative;
  overflow: hidden;
  height: 100%;
}

.transformWrapper {
  width: 100% !important;
  height: 100% !important;
}

.transformContent {
  width: 100% !important;
  height: max-content !important;
  display: flex !important;
  justify-content: center;
  align-items: flex-start;
  min-height: 100%;
}

.pdfScrollContainer {
  width: 100%;
  height: 100%;
  overflow-y: auto;
}

.pdfDocument {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  /* Remove page gaps to make it feel like a seamless reader */
  gap: 0;
}

/* Customize react-pdf pages */
.reactPdfPage {
  margin-bottom: 8px; /* Slight gap between pages */
  width: 100%;
  display: flex;
  justify-content: center;
  background: white;
}

.reactPdfPage canvas {
  width: 100% !important;
  height: auto !important;
  max-width: 100%;
}

/* Floating Controls */
.floatingTopLeft {
  position: absolute;
  top: max(var(--spacing-4), env(safe-area-inset-top, var(--spacing-4)));
  left: max(var(--spacing-4), env(safe-area-inset-left, var(--spacing-4)));
  z-index: 50;
  width: var(--spacing-11);
  height: var(--spacing-11);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink);
  background-color: var(--bg-base);
}

.floatingTopRight {
  position: absolute;
  top: max(var(--spacing-4), env(safe-area-inset-top, var(--spacing-4)));
  right: max(var(--spacing-4), env(safe-area-inset-right, var(--spacing-4)));
  z-index: 50;
  width: var(--spacing-11);
  height: var(--spacing-11);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink);
  background-color: var(--bg-base);
}

.threeDotsWrapper {
  position: absolute;
  bottom: max(var(--spacing-6), env(safe-area-inset-bottom, var(--spacing-6)));
  right: max(var(--spacing-6), env(safe-area-inset-right, var(--spacing-6)));
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--spacing-2);
}

.threeDotsBtn {
  width: var(--spacing-11);
  height: var(--spacing-11);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink);
  background-color: var(--bg-base);
}

.threeDotsMenu {
  display: flex;
  flex-direction: column;
  background-color: var(--bg-base);
  border-radius: var(--radius-lg);
  overflow: hidden;
  min-width: 160px;
  /* Adjust animation or just let it snap for now */
  animation: fadeRise 0.2s ease-out;
}

@keyframes fadeRise {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.threeDotsMenuItem {
  padding: var(--spacing-3) var(--spacing-4);
  text-align: left;
  font-weight: 500;
  color: var(--color-ink);
  background: transparent;
  border: none;
  width: 100%;
  cursor: pointer;
  text-decoration: none;
  display: block;
  font-family: inherit;
}

.threeDotsMenuItem:hover,
.threeDotsMenuItem:focus {
  background-color: rgba(0,0,0,0.05);
  outline: none;
}

/* Expanded Menu Overlay (from Home.module.css) */
.menuOverlayWrapper {
  position: fixed;
  inset: 0;
  z-index: 60;
  transition: opacity 300ms;
}
.menuOverlayVisible {
  opacity: 1;
  pointer-events: auto;
}
.menuOverlayHidden {
  opacity: 0;
  pointer-events: none;
}
.menuBackdrop {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}
.menuContentWrapper {
  position: absolute;
  top: var(--spacing-2);
  left: var(--spacing-2);
  right: var(--spacing-2);
  display: flex;
  justify-content: center;
}
.menuPanel {
  width: 100%;
  max-width: 24rem; /* max-w-sm */
  background-color: var(--bg-base);
  --tw-radius: var(--radius-2xl);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-6);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-8);
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
.menuPanelActive {
  transform: translateY(0) scale(1);
}
.menuPanelInactive {
  transform: translateY(-1rem) scale(0.95);
}
.menuHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.menuBrandIcon {
  width: var(--spacing-10); /* w-10 */
  height: var(--spacing-10); /* h-10 */
  display: flex;
  align-items: center;
  justify-content: center;
}
.menuBrandLogoImg {
  height: 2rem;
  width: auto;
  object-fit: contain;
}
.menuCloseBtn {
  width: var(--spacing-10); /* w-10 */
  height: var(--spacing-10); /* h-10 */
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--color-ink);
  opacity: 0.7;
  transition: all 200ms;
  background-color: transparent;
}
.menuCloseBtn:hover {
  opacity: 1;
  background-color: rgba(0,0,0,0.05);
}
.menuCloseBtn:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-ink);
}
.menuCloseBtn svg {
  width: 1.5rem; /* w-6 */
  height: 1.5rem; /* h-6 */
}
.menuNavLinks {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
.menuNavLink {
  display: flex;
  align-items: center;
  padding: var(--spacing-3) var(--spacing-4); /* py-3 px-4 */
  border-radius: var(--radius-xl);
  font-weight: 500;
  font-size: 1.125rem; /* text-lg */
  color: var(--color-ink);
  transition: all 200ms;
  text-decoration: none;
}
.menuNavLink:hover {
  background-color: rgba(0,0,0,0.05);
  transform: translateX(4px);
}
.menuNavLink:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-ink);
}
.menuActionButtons {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  margin-top: var(--spacing-4);
}
.menuSignInBtn {
  width: 100%;
  padding: var(--spacing-3);
  text-align: center;
  font-weight: 600;
  color: var(--color-ink);
  background-color: transparent;
  border-radius: var(--radius-xl);
  transition: background-color 200ms;
  text-decoration: none;
}
.menuSignInBtn:hover {
  background-color: rgba(0,0,0,0.05);
}
.menuSignInBtn:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-ink);
}
.menuGetNowBtn {
  width: 100%;
  padding: var(--spacing-3);
  text-align: center;
  font-weight: 600;
  color: white;
  background-color: var(--color-ink);
  border-radius: var(--radius-xl);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: all 200ms;
  text-decoration: none;
}
.menuGetNowBtn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
.menuGetNowBtn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.3);
}
`;

fs.writeFileSync(path, newCss);
console.log("CSS updated.");
