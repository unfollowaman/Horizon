import { canDownload } from './permissions';
import type { Resource } from '../types';

export const handleDownload = async (url: string, resource: Pick<Resource, 'allow_download'>, e?: { preventDefault: () => void; stopPropagation: () => void }) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (!canDownload(resource)) {
    console.warn("Download blocked by permissions.");
    return;
  }

  // Extract filename from URL
  const urlParts = url.split('/');
  const filename = urlParts[urlParts.length - 1].split('?')[0];

  try {
    // Primary approach: Fetch and create a Blob
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    document.body.removeChild(a);
    window.URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.warn("Blob download failed, falling back to native download", error);

    // Fallback approach: Append ?download= to the URL and use native download
    // Supabase supports ?download= to force a Content-Disposition: attachment header
    const fallbackUrl = url.includes('?') ? `${url}&download=` : `${url}?download=`;

    const a = document.createElement('a');
    a.href = fallbackUrl;
    a.download = filename; // Attempt to hint the browser
    document.body.appendChild(a);
    a.click();

    // Cleanup
    document.body.removeChild(a);
  }
};
