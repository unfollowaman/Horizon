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
          View
        </Link>
        {resource.pdfUrl && (
          <a
            href={resource.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="md:flex-1 md:min-w-0 p-[6px_12px] md:p-[6px_4px] flex items-center justify-center whitespace-normal text-[11px] leading-[1.15] gap-[4px] font-bold neu-raised-sm rounded-md hover:neu-raised-sm-hover no-underline text-ink text-center"
          >
            Download
          </a>
        )}
      </div>
    </div>
  );
};

export default MaterialCard;
