import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../../services/supabase';
import { fetchLearningResourceById, fetchLearningResources } from '../../../../services/learningResourcesAPI';
import type { Resource } from '../../../../types';
import { isResourceProtected } from '../../../../utils/resourceHelper';
import type { User } from '@supabase/supabase-js';
import { usePdfDownload, type DownloadStage } from './usePdfDownload';

interface UsePdfDataProps {
  id?: string;
  user: User | null;
  authLoading: boolean;
}

export const usePdfData = ({ id, user, authLoading }: UsePdfDataProps) => {
  const [resource, setResource] = useState<Resource | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);

  const download = usePdfDownload(signedUrl);

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
      setMetaLoading(true);
      setSignedUrl(null);
      setPdfError(null);

      const { data: mappedResource, rawData: data, error } = await fetchLearningResourceById(id, true);

      if (error) {
        console.error("Error fetching resource:", error);
        setMetaLoading(false);
        return;
      }

      if (mappedResource && data) {
        setResource(mappedResource);

        const isProtected = isResourceProtected(mappedResource);
        if (isProtected) {
          if (!user) {
            setPdfError('401_UNAUTHORIZED');
            setMetaLoading(false);
            return;
          }
          await fetchSignedUrl(mappedResource.id);
        } else {
          setSignedUrl(mappedResource.pdfUrl);
        }

        setMetaLoading(false);

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
        setMetaLoading(false);
      }
    };

    fetchResourceAndRelated();
  }, [id, user, authLoading, fetchSignedUrl]);

  const effectiveError = pdfError || download.error;

  const pdfData = useMemo<ArrayBuffer | null>(() => {
    if (!download.data) return null;
    return download.data.buffer.slice(
      download.data.byteOffset,
      download.data.byteOffset + download.data.byteLength
    ) as ArrayBuffer;
  }, [download.data]);

  let currentStage: DownloadStage = download.stage;
  if (metaLoading || (!signedUrl && !effectiveError)) {
    currentStage = 'connecting';
  }

  return {
    resource,
    signedUrl,
    pdfData,
    pdfError: effectiveError,
    loading: metaLoading || (!effectiveError && download.stage !== 'ready'),
    stage: currentStage,
    loadedBytes: download.loadedBytes,
    totalBytes: download.totalBytes,
    setReady: download.setReady,
    fetchSignedUrl
  };
};
