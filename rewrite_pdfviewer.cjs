const fs = require('fs');

const path = 'src/pages/resources/PdfViewer.tsx';
let content = fs.readFileSync(path, 'utf8');

// We will replace the entire return statement.
// First let's find where the return statement starts.
const returnStartIndex = content.indexOf('return (\n    <div className={styles.pageContainer}>');
if (returnStartIndex === -1) {
    console.error("Could not find return statement");
    process.exit(1);
}

// State hooks to add
const stateHooks = `  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isThreeDotsMenuOpen, setIsThreeDotsMenuOpen] = useState(false);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(\`.\${styles.threeDotsWrapper}\`)) {
        setIsThreeDotsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hamburger Menu Handlers
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const closeMenu = () => setIsMobileMenuOpen(false);
`;

const newReturnStatement = `return (
    <div className={styles.pageContainer}>
      {/* Floating Controls */}
      <button
        onClick={() => navigate(-1)}
        className={\`\${styles.floatingTopLeft} neu-raised\`}
        aria-label="Go Back"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>

      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className={\`\${styles.floatingTopRight} neu-raised\`}
        aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
      >
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Expanded Hamburger Menu Overlay (Replicated from Home.tsx) */}
      <div className={\`\${styles.menuOverlayWrapper} \${isMobileMenuOpen ? styles.menuOverlayVisible : styles.menuOverlayHidden}\`}>
        <div className={styles.menuBackdrop} onClick={closeMenu} aria-hidden="true" />
        <div className={styles.menuContentWrapper}>
          <div className={\`\${styles.menuPanel} neu-raised \${isMobileMenuOpen ? styles.menuPanelActive : styles.menuPanelInactive}\`}>
            <div className={styles.menuHeader}>
              <div className={styles.menuBrandIcon}>
                <img src="/assets/favicon/logo.png" alt="Horizon Logo" className={styles.menuBrandLogoImg} />
              </div>
              <button onClick={closeMenu} className={styles.menuCloseBtn}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className={styles.menuNavLinks}>
              <Link to="/library" onClick={closeMenu} className={styles.menuNavLink}>PYQ Papers</Link>
              <Link to="/" onClick={closeMenu} className={styles.menuNavLink}>Flashcards</Link>
              <Link to="/" onClick={closeMenu} className={styles.menuNavLink}>MCQ Sets</Link>
              <Link to="/" onClick={closeMenu} className={styles.menuNavLink}>Revision Sheets</Link>
              <Link to="/notes" onClick={closeMenu} className={styles.menuNavLink}>Study Notes</Link>
              <Link to="/" onClick={closeMenu} className={styles.menuNavLink}>Updates</Link>
            </nav>
            <div className={styles.menuActionButtons}>
              {user ? (
                <Link to="/dashboard" onClick={closeMenu} className={styles.menuSignInBtn}>Dashboard</Link>
              ) : (
                <>
                  <Link to="/login" onClick={closeMenu} className={styles.menuSignInBtn}>Sign in</Link>
                  <Link to="/register" onClick={closeMenu} className={styles.menuGetNowBtn}>Get Started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Reader Container (Full screen) */}
      <div
        ref={containerRef}
        className={styles.viewerContainer}
      >
        <div className={styles.transformWrapperContainer}>
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={4}
            centerOnInit
            wheel={{
              wheelDisabled: false,
              activationKeys: ['Control', 'Shift', 'Meta', 'Alt']
            }}
            panning={{ excluded: ['a', 'button', 'input'] }}
            trackPadPanning={{ disabled: false }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {/* Desktop Zoom Controls (Optional, keeping as per original) */}
                <div className={styles.zoomControls}>
                  <button onClick={() => zoomOut()} className="neu-raised-sm rounded-md p-2 hover:neu-raised-hover" title="Zoom Out">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                  <button onClick={() => resetTransform()} className="neu-raised-sm rounded-md p-2 hover:neu-raised-hover font-bold text-sm" title="Reset Zoom">
                    Reset
                  </button>
                  <button onClick={() => zoomIn()} className="neu-raised-sm rounded-md p-2 hover:neu-raised-hover" title="Zoom In">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                </div>

                {/* Floating Bottom Right Three-Dots Menu */}
                <div className={\`\${styles.floatingBottomRight} \${styles.threeDotsWrapper}\`}>
                  {isThreeDotsMenuOpen && (
                    <div className={\`\${styles.threeDotsMenu} neu-raised\`}>
                      <button onClick={() => { zoomIn(); setIsThreeDotsMenuOpen(false); }} className={styles.threeDotsMenuItem}>
                        Zoom In
                      </button>
                      <button onClick={() => { zoomOut(); setIsThreeDotsMenuOpen(false); }} className={styles.threeDotsMenuItem}>
                        Zoom Out
                      </button>
                      <a
                        href={resource.pdfUrl.startsWith('http') ? resource.pdfUrl : supabase.storage.from('pdfs').getPublicUrl(resource.pdfUrl).data.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.threeDotsMenuItem}
                        onClick={() => setIsThreeDotsMenuOpen(false)}
                      >
                        Download PDF
                      </a>
                    </div>
                  )}
                  <button
                    onClick={() => setIsThreeDotsMenuOpen(!isThreeDotsMenuOpen)}
                    className={\`\${styles.threeDotsBtn} neu-raised\`}
                    aria-label="More options"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1"></circle>
                      <circle cx="12" cy="5" r="1"></circle>
                      <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                  </button>
                </div>

                <TransformComponent wrapperClass={styles.transformWrapper} contentClass={styles.transformContent}>
                  <div className={styles.pdfScrollContainer}>
                    <Document
                      file={resource.pdfUrl.startsWith('http') ? resource.pdfUrl : supabase.storage.from('pdfs').getPublicUrl(resource.pdfUrl).data.publicUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      loading={<div className="p-4 font-bold flex justify-center w-full">Rendering PDF...</div>}
                      className={styles.pdfDocument}
                    >
                      {Array.from(new Array(numPages || 0), (_, index) => (
                        <div
                          key={\`page_\${index + 1}\`}
                          className={styles.reactPdfPage}
                          ref={(el) => { pageRefs.current[index] = el; }}
                          data-page-index={index}
                        >
                          <Page
                            pageNumber={index + 1}
                            width={containerWidth || Math.min(window.innerWidth, 800)}
                            scale={1}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            loading={<div className="h-64 w-full animate-pulse bg-gray-200 rounded-md"></div>}
                          />
                        </div>
                      ))}
                    </Document>
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        </div>
      </div>
    </div>
  );
};

export default PdfViewer;
`;

// Now find where to insert the new state hooks (right before `function onDocumentLoadSuccess`)
const onDocLoadIndex = content.indexOf('function onDocumentLoadSuccess');
let newContent = content.slice(0, onDocLoadIndex) + stateHooks + '\n  ' + content.slice(onDocLoadIndex, returnStartIndex) + newReturnStatement;

fs.writeFileSync(path, newContent);
console.log("Rewrite complete.");
