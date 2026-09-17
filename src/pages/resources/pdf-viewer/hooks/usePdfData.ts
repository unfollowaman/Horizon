import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../services/supabase';
import { fetchLearningResourceById, fetchLearningResources } from '../../../../services/learningResourcesAPI';
import type { Resource } from '../../../../types';
import { isResourceProtected } from '../../../../utils/resourceHelper';
import type { User } from '@supabase/supabase-js';

interface UsePdfDataProps {
  id?: string;
  user: User | null;
  authLoading: boolean;
}

export const usePdfData = ({ id, user, authLoading }: UsePdfDataProps) => {
  const [resource, setResource] = useState<Resource | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSignedUrl = useCallback(async (resourceId: string) => {
    try {
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('resource-access', {
        body: { resource_id: resourceId },
      });
      if (edgeError) {
        const errorMessage = edgeError.message?.toLowerCase() || '';
        if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
          setPdfError('401_UNAUTHORIZED');
          return null;
        } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
          setPdfError('Resource not found');
        } else if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
          setPdfError('403_FORBIDDEN');
        } else {
          setPdfError(edgeError.message || 'Error accessing protected resource');
        }
        return null;
      } else if (!edgeData?.success) {
        const dataError = edgeData?.error?.toLowerCase() || '';
        if (dataError.includes('unauthorized') || dataError.includes('401')) {
          setPdfError('401_UNAUTHORIZED');
          return null;
        } else if (dataError.includes('not found') || dataError.includes('404')) {
          setPdfError('Resource not found');
          return null;
        }
        setPdfError(edgeData?.error || 'Error accessing protected resource');
        return null;
      } else {
        setSignedUrl(edgeData.signed_url);
        return edgeData.signed_url;
      }
    } catch {
      setPdfError('Error accessing protected resource');
      return null;
    }
  }, []);

  useEffect(() => {
    const fetchResourceAndRelated = async () => {
      if (!id || authLoading) return;
      setLoading(true);
      setPdfData(null);
      setPdfError(null);

      const { data: mappedResource, rawData: data, error } = await fetchLearningResourceById(id, true);

      if (error) {
        console.error("Error fetching resource:", error);
        setLoading(false);
        return;
      }

      if (mappedResource && data) {
        setResource(mappedResource);

        const isProtected = isResourceProtected(mappedResource);
        if (isProtected) {
          if (!user) {
            setPdfError('401_UNAUTHORIZED');
            setLoading(false);
            return;
          }
          await fetchSignedUrl(mappedResource.id);
        } else {
          setSignedUrl(mappedResource.pdfUrl);
        }

        const { error: relatedError } = await fetchLearningResources({
          resource_type: mappedResource.resource_type,
          student_class: mappedResource.student_class || undefined,
          subject: mappedResource.subject || undefined,
          medium: mappedResource.medium || undefined,
          includeChapters: true,
          neqId: mappedResource.id,
          limit: 4
        });

        if (relatedError) {
          console.error("Error fetching related resources:", relatedError);
        }
      } else {
        setLoading(false);
      }
    };

    fetchResourceAndRelated();
  }, [id, user, authLoading, fetchSignedUrl]);

  useEffect(() => {
    if (!signedUrl) {
      setPdfData(null);
      return;
    }

    const controller = new AbortController();
    let isSubscribed = true;

    const fetchPdfBytes = async () => {
      try {
        const response = await fetch(signedUrl, { signal: controller.signal });
        if (!response.ok) {
          if (isSubscribed) {
            setPdfError(`Failed to load PDF (${response.status} ${response.statusText})`);
            setLoading(false);
          }
          return;
        }
        const buffer = await response.arrayBuffer();
        if (isSubscribed) {
          setPdfData(buffer);
          setLoading(false);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (isSubscribed) {
          console.error("Error pre-fetching PDF bytes:", err);
          setPdfError('Failed to load PDF file.');
          setLoading(false);
        }
      }
    };

    fetchPdfBytes();

    return () => {
      isSubscribed = false;
      controller.abort();
    };
  }, [signedUrl]);

  return {
    resource,
    signedUrl,
    pdfData,
    pdfError,
    loading,
    fetchSignedUrl
  };
};
