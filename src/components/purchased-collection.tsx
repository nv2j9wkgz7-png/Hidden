'use client';
import { useState } from 'react';
import { PaidGallery } from './paid-gallery';
import { api } from '@/lib/client-api';

export function PurchasedCollection({
  dropId,
  assets,
}: {
  dropId: string;
  assets: {
    id: string;
    original_filename: string;
    size_bytes: number;
    mime_type: string;
  }[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function download(assetId: string) {
    setBusy(true);
    setError('');
    try {
      const { files } = await api('/api/downloads', {
        drop_id: dropId,
        asset_id: assetId,
      });
      const link = document.createElement('a');
      link.href = files[0].url;
      link.rel = 'noreferrer';
      link.click();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Download failed. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <PaidGallery
        dropId={dropId}
        assets={assets}
        busy={busy}
        download={download}
      />
    </>
  );
}
