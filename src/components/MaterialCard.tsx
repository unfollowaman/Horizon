import type React from 'react';
import { useId } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Resource } from '../types';

interface MaterialCardProps {
  resource: Resource;
}

const PyqIllustration: React.FC = () => {
  const rawId = useId().replace(/:/g, '');
  const gradId = `pyqGrad-${rawId}`;
  const paperGrad = `url(#${gradId})`;

  return (
    <svg
      className="w-full h-full block"
      viewBox="0 0 540 260"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Animated stack of previous year question papers surrounded by study doodles"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradId} x1="190" y1="56" x2="346" y2="208" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E91E8C" />
          <stop offset="52%" stopColor="#C2185B" />
          <stop offset="100%" stopColor="#8B0A50" />
        </linearGradient>
        <filter id={`paperGlow-${rawId}`} x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="12" stdDeviation="8" floodColor="#C2185B" floodOpacity="0.16" />
        </filter>
        <style>{`
          .pyq-doodle{fill:none;stroke:#5f6264;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;opacity:.74;vector-effect:non-scaling-stroke}.pyq-faint{opacity:.24;stroke-width:1.3}.pyq-tick{stroke-width:1.1;opacity:.42}.pyq-float{transform-box:fill-box;transform-origin:center;animation:pyqFloat 6s ease-in-out infinite}.d1{animation-duration:6.4s;animation-delay:-.4s}.d2{animation-duration:7.1s;animation-delay:-2.1s}.d3{animation-duration:5.8s;animation-delay:-1.3s}.d4{animation-duration:6.8s;animation-delay:-3.2s}.d5{animation-duration:5.9s;animation-delay:-4.4s}.d6{animation-duration:7.4s;animation-delay:-.9s}.d7{animation-duration:6.2s;animation-delay:-2.8s}.d8{animation-duration:6.9s;animation-delay:-5s}.d9{animation-duration:5.7s;animation-delay:-1.9s}.d10{animation-duration:7.6s;animation-delay:-3.8s}.d11{animation-duration:6.1s;animation-delay:-.7s}.d12{animation-duration:6.6s;animation-delay:-4.8s}@keyframes pyqFloat{0%,100%{transform:translate(0,0) rotate(-1.4deg)}50%{transform:translate(2px,-4px) rotate(1.8deg)}}.pyq-stack{transform-box:fill-box;transform-origin:center;filter:url(#paperGlow-${rawId})}.pyq-paper{transform-box:fill-box;transform-origin:78% 12%;animation-duration:6s;animation-timing-function:cubic-bezier(.45,0,.2,1);animation-iteration-count:infinite}.paper-one{animation-name:cycleOne}.paper-two{animation-name:cycleTwo}.paper-three{animation-name:cycleThree}@keyframes cycleOne{0%{transform:translate(0,0) rotate(0);opacity:1}18%{transform:translate(26px,-22px) rotate(10deg);opacity:.96}28%{transform:translate(10px,16px) rotate(-4deg);opacity:.72}34%,100%{transform:translate(-28px,16px) rotate(-6deg);opacity:.9}}@keyframes cycleTwo{0%,28%{transform:translate(-14px,8px) rotate(-3deg);opacity:.93}34%{transform:translate(0,0) rotate(0);opacity:1}51%{transform:translate(26px,-22px) rotate(10deg);opacity:.96}61%{transform:translate(10px,16px) rotate(-4deg);opacity:.72}67%,100%{transform:translate(-28px,16px) rotate(-6deg);opacity:.9}}@keyframes cycleThree{0%,61%{transform:translate(-28px,16px) rotate(-6deg);opacity:.9}67%{transform:translate(0,0) rotate(0);opacity:1}84%{transform:translate(26px,-22px) rotate(10deg);opacity:.96}94%{transform:translate(10px,16px) rotate(-4deg);opacity:.72}100%{transform:translate(-28px,16px) rotate(-6deg);opacity:.9}}@media (prefers-reduced-motion:reduce){.pyq-float,.pyq-paper{animation:none}}`}</style>
      </defs>

      <rect width="540" height="260" fill="transparent" />
      <g id="background-doodles">
        <g id="doodle-notebook" className="pyq-doodle pyq-float d1" transform="translate(20 -18) rotate(-21)"><rect x="0" y="0" width="76" height="112" rx="3"/><path d="M18 0v112M34 17h27M34 34h29M34 51h25M34 68h30M34 85h24" className="pyq-faint"/><path d="M13 13h10M13 31h10M13 49h10M13 67h10M13 85h10"/></g>
        <g id="doodle-pencil-left" className="pyq-doodle pyq-float d2" transform="translate(126 0) rotate(-25)"><path d="M7 0h12l5 76-11 19L2 76z"/><path d="M3 75h20M7 8h12M13 95l-2-12h8z"/></g>
        <g id="doodle-star-top" className="pyq-doodle pyq-float d3" transform="translate(171 12)"><path d="M15 0l4 10 11 1-8 7 3 11-10-6-10 6 3-11-8-7 11-1z"/></g>
        <path className="pyq-doodle pyq-faint pyq-float d4" d="M201 44c24 13-17 45-43 27-17-12 8-37 24-54" strokeDasharray="8 10"/>
        <g id="doodle-eraser" className="pyq-doodle pyq-float d5" transform="translate(342 -5) rotate(-28)"><path d="M0 22L38 0l22 24-38 22z"/><path d="M38 0l10 38M7 26l21 24" className="pyq-faint"/></g>
        <g id="doodle-book-top" className="pyq-doodle pyq-float d6" transform="translate(405 -8) rotate(10)"><path d="M0 58c25-9 42 0 58 17 15-17 35-25 59-16V7c-24-7-43 0-59 16C41 7 22 0 0 8z"/><path d="M58 23v52M13 20c17-4 29 1 39 11M67 31c11-8 25-12 40-9M14 38c15-3 28 2 39 10M68 49c12-8 24-10 38-7" className="pyq-faint"/></g>
        <g id="doodle-pen-right" className="pyq-doodle pyq-float d7" transform="translate(492 28) rotate(68)"><path d="M8 0h13l6 87-13 23L2 87z"/><path d="M4 86h22M8 12h14M14 110l-2-13h8z"/></g>
        <g id="doodle-protractor" className="pyq-doodle pyq-float d8" transform="translate(-30 70) rotate(19)"><path d="M0 82a82 82 0 0 1 164 0z"/><path d="M43 82a39 39 0 0 1 78 0z"/><path d="M22 78l0-9M43 76l0-8M63 75l0-10M82 72v-12M102 75l0-10M123 76l0-8M144 78l0-9" className="pyq-tick"/></g>
        <g id="doodle-triangle" className="pyq-doodle pyq-float d9" transform="translate(421 91) rotate(-11)"><path d="M0 68L104 0l17 92z"/><path d="M43 57l43-28 7 39z"/><path d="M11 67l78-50" className="pyq-tick"/></g>
        <g id="doodle-ruler" className="pyq-doodle pyq-float d10" transform="translate(-8 178) rotate(12)"><rect x="0" y="0" width="135" height="22"/><path d="M12 0v7M24 0v10M36 0v7M48 0v10M60 0v7M72 0v10M84 0v7M96 0v10M108 0v7M120 0v10" className="pyq-tick"/></g>
        <g id="doodle-backpack" className="pyq-doodle pyq-float d11" transform="translate(6 211)"><path d="M9 49V18C9 6 20 0 34 0s25 6 25 18v31"/><rect x="0" y="21" width="69" height="66" rx="14"/><path d="M16 55h37v28H16zM8 38c-9 8-9 24-2 31M62 38c10 8 9 24 2 31" className="pyq-faint"/></g>
        <g id="doodle-books" className="pyq-doodle pyq-float d12" transform="translate(399 207) rotate(-7)"><path d="M0 15h111v28H0c-10 0-10-28 0-28zM14 0h104v27H14c-10 0-10-27 0-27zM8 43h119v28H8c-10 0-10-28 0-28z"/><path d="M25 7h83M19 23h91M18 51h94" className="pyq-faint"/></g>
        <g id="doodle-bulb" className="pyq-doodle pyq-float d4" transform="translate(406 74)"><path d="M20 52h18M22 60h14M25 66h8M19 52c-1-13-14-17-14-32C5 9 14 0 29 0s24 9 24 20c0 15-13 19-14 32"/><path d="M24 45c2-13-4-18-1-22 5-5 7 8 7 8s3-13 8-8c4 4-3 9-1 22" className="pyq-faint"/></g>
        <path className="pyq-doodle pyq-float d3" d="M87 94l6 14 14 6-14 6-6 15-6-15-14-6 14-6zM448 167l4 11 11 4-11 5-4 11-5-11-11-5 11-4z"/>
        <path className="pyq-doodle pyq-float d5" d="M383 186c-13-6-4-22 8-15M392 171c13 6 4 23-8 16M100 231l9 9M109 231l-9 9M461 145l6 12M476 145l-6 12"/>
        <path className="pyq-doodle pyq-faint pyq-float d7" d="M492 64c30 4 6 57 35 66" strokeDasharray="8 10"/>
      </g>

      <g id="pyq-paper-stack" className="pyq-stack">
        <g id="paper-3" className="pyq-paper paper-three"><path d="M230 58h63l30 30v85a16 16 0 0 1-16 16h-77a16 16 0 0 1-16-16V74a16 16 0 0 1 16-16z" fill="#fff" stroke={paperGrad} strokeWidth="9" strokeLinejoin="round"/><path d="M293 59v26a10 10 0 0 0 10 10h20" fill="#F92A82" opacity=".56"/></g>
        <g id="paper-2" className="pyq-paper paper-two"><path d="M230 58h63l30 30v85a16 16 0 0 1-16 16h-77a16 16 0 0 1-16-16V74a16 16 0 0 1 16-16z" fill="#fff" stroke={paperGrad} strokeWidth="9" strokeLinejoin="round"/><path d="M293 59v26a10 10 0 0 0 10 10h20" fill="#F92A82" opacity=".66"/></g>
        <g id="paper-1" className="pyq-paper paper-one">
          <path d="M230 58h63l30 30v85a16 16 0 0 1-16 16h-77a16 16 0 0 1-16-16V74a16 16 0 0 1 16-16z" fill="#fff" stroke={paperGrad} strokeWidth="9" strokeLinejoin="round" />
          <path d="M293 59v26a10 10 0 0 0 10 10h20" fill="#F92A82" opacity=".86" />
          <text x="237" y="112" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="29" fill={paperGrad}>PYQ</text>
          <circle cx="239" cy="137" r="7" fill={paperGrad}/><path d="M254 137h54M239 158h69M239 178h69" stroke={paperGrad} strokeWidth="7" strokeLinecap="round"/>
        </g>
      </g>
    </svg>
  );
};

const MaterialCard: React.FC<MaterialCardProps> = ({ resource }) => {
  const navigate = useNavigate();

  return (
    <div
      className="neu-raised p-[14px] rounded-xl flex flex-col h-full items-center text-center cursor-pointer"
      onClick={() => navigate(`/view/${resource.id}`)}
    >
      <div className="w-full h-[100px] neu-recessed text-muted-foreground rounded-md mb-[12px] flex items-center justify-center overflow-hidden shrink-0">
        {resource.thumbnailUrl ? (
          <img src={resource.thumbnailUrl} alt={resource.title} className="w-full h-full object-cover" />
        ) : (
          <PyqIllustration />
        )}
      </div>
      <h4 className="text-[15px] leading-[1.25] font-bold mb-[3px] text-ink line-clamp-2 overflow-hidden w-full text-center">
        {resource.resource_type === 'pyq' ? `${resource.student_class} ${resource.subject} PYQ` : resource.title}
      </h4>
      <p className="text-[12px] mb-[14px] text-ink/70 font-bold w-full text-center">
        {resource.year || resource.subject}
      </p>
      <div className="w-full flex justify-center gap-[4px] md:gap-[8px] mt-auto">
        <Link
          to={`/view/${resource.id}`}
          onClick={(e) => e.stopPropagation()}
          className="md:flex-1 md:min-w-0 p-[6px_12px] md:p-[6px_4px] flex items-center justify-center whitespace-normal text-[11px] leading-[1.15] gap-[4px] font-bold neu-raised-sm rounded-md hover:neu-raised-sm-hover no-underline text-ink text-center"
        >
          <svg className="hidden md:block shrink-0" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={`url(#pdfGrad-${resource.id})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id={`pdfGrad-${resource.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E91E8C" />
                <stop offset="50%" stopColor="#C2185B" />
                <stop offset="100%" stopColor="#8B0A50" />
              </linearGradient>
            </defs>
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14 2 14 8 20 8"/>
            <path d="M8 18v-4h1.5a1 1 0 0 1 0 2H8" />
            <path d="M11 14h1.5a2 2 0 0 1 0 4H11v-4z" />
            <path d="M16 18v-4h2M16 16h1.5" />
          </svg>
          <span className="shrink-0">View</span>
        </Link>
        {resource.pdfUrl && (
          <a
            href={resource.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="md:flex-1 md:min-w-0 p-[6px_12px] md:p-[6px_4px] flex items-center justify-center whitespace-normal text-[11px] leading-[1.15] gap-[4px] font-bold neu-raised-sm rounded-md hover:neu-raised-sm-hover no-underline text-ink text-center"
          >
            <svg className="hidden md:block shrink-0" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={`url(#dlGrad-${resource.id})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id={`dlGrad-${resource.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E91E8C" />
                  <stop offset="50%" stopColor="#C2185B" />
                  <stop offset="100%" stopColor="#8B0A50" />
                </linearGradient>
              </defs>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
            <span className="shrink-0">Download</span>
          </a>
        )}
      </div>
    </div>
  );
};

export default MaterialCard;
