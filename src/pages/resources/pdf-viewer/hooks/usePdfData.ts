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
        } else if (errorMessage.includes('404')) {
          setPdfError('Resource not found');
        } else {
          setPdfError('403_FORBIDDEN');
        }
        return null;
      } else if (!edgeData?.success) {
        const dataError = edgeData?.error?.toLowerCase() || '';
        if (dataError.includes('unauthorized') || dataError.includes('401')) {
          setPdfError('401_UNAUTHORIZED');
          return null;
        }
        setPdfError(edgeData?.error || '403_FORBIDDEN');
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

      const { data: mappedResource, rawData: data, error } = await fetchLearningResourceById(id, true);

      if (error) {
        console.error("Error fetching resource:", error);
        setLoading(false);
        return;
      }

      if (mappedResource && data) {
        setResource(mappedResource);

        if (isResourceProtected(mappedResource)) {
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
      }
      setLoading(false);
    };

    fetchResourceAndRelated();
  }, [id, user, authLoading, fetchSignedUrl]);

  return {
    resource,
    signedUrl,
    pdfError,
    loading,
    fetchSignedUrl
  };
};
