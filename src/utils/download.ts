import { canDownload } from './permissions';
import type { Resource } from '../types';
import { supabase } from '../services/supabase';
import { isResourceProtected } from './resourceHelper';

export const handleDownload = async (url: string, resource: Resource, e?: { preventDefault: () => void; stopPropagation: () => void }) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (!canDownload(resource)) {
    console.warn("Download blocked by permissions.");
    return;
  }

  let finalUrl = url;

  if (isResourceProtected(resource)) {
    const { data, error } = await supabase.functions.invoke('resource-access', {
      body: { resource_id: resource.id },
    });
    if (error || !data?.success) {
      console.error("Failed to generate signed url for download", error || data?.error);
      return;
    }
    finalUrl = data.signed_url;
  }

  // Extract filename from URL (use the resource file_path if available to get a clean name)
  const pathForName = resource.file_path || finalUrl;
  const urlParts = pathForName.split('/');
  const filename = urlParts[urlParts.length - 1].split('?')[0];

  try {
    // Primary approach: Fetch and create a Blob
    const response = await fetch(finalUrl);
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
    const fallbackUrl = finalUrl.includes('?') ? `${finalUrl}&download=` : `${finalUrl}?download=`;

    const a = document.createElement('a');
    a.href = fallbackUrl;
    a.download = filename; // Attempt to hint the browser
    document.body.appendChild(a);
    a.click();

    // Cleanup
    document.body.removeChild(a);
  }
};
