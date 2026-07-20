import type React from 'react';
import { Link } from 'react-router-dom';
import type { Resource } from '../types';

interface MaterialCardProps {
  resource: Resource;
}

const MaterialCard: React.FC<MaterialCardProps> = ({ resource }) => {
  return (
    <div className="neu-raised p-[14px] rounded-xl flex flex-col h-full items-center text-center">
      <div className="w-full h-[100px] neu-recessed text-muted-foreground rounded-md mb-[12px] flex items-center justify-center overflow-hidden shrink-0">
        {resource.thumbnailUrl ? (
          <img src={resource.thumbnailUrl} alt={resource.title} className="w-full h-full object-cover" />
        ) : (
          <span className="font-bold font-mono text-xs p-2">PDF</span>
        )}
      </div>
      <h4 className="text-[15px] leading-[1.25] font-bold mb-[3px] text-ink line-clamp-2 overflow-hidden w-full text-center">
        {resource.type === 'pyq' ? `${resource.class} ${resource.subject} PYQ` : resource.title}
      </h4>
      <p className="text-[12px] mb-[14px] text-ink/70 font-bold w-full text-center">
        {resource.year || resource.subject}
      </p>
      <div className="w-full flex justify-center gap-[4px] md:gap-[8px] mt-auto">
        <Link
          to={`/resource/${resource.id}`}
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
