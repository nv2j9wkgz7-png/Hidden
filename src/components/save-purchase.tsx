'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NavigationLink as Link } from './navigation-link';
import { PurchaseVerification } from './purchase-verification';
import { api } from '@/lib/client-api';
export function SavePurchase({
  dropId,
  title,
  slug,
}: {
  dropId: string;
  title: string;
  slug: string;
}) {
  const router = useRouter();
  const started = useRef(false);
  const [verification, setVerification] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  async function save() {
    setBusy(true);
    setError('');
    try {
      const result = await api('/api/purchases/save', { drop_id: dropId });
      if (result.verification_required) {
        setVerification(true);
        setBusy(false);
        return;
      }
      router.replace('/purchases');
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to save this purchase.',
      );
      setBusy(false);
    }
  }
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void save();
    // The explicit Save to my account action continues once after authentication.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <section className="panel" style={{ maxWidth: 560, margin: '48px auto' }}>
      <div className="eyebrow">Your private library</div>
      <h1>{busy ? 'Saving your purchase…' : 'Save your purchase'}</h1>
      <p>{title}</p>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {verification && (
        <PurchaseVerification
          dropId={dropId}
          onVerified={() => {
            setVerification(false);
            void save();
          }}
        />
      )}
      {!busy && !verification && (
        <button className="primary" onClick={save}>
          Try again
        </button>
      )}
      {error && (
        <p>
          <Link href="/purchases/recover">
            Recover using your checkout email
          </Link>
        </p>
      )}
      <p>
        <Link restoreScroll href={`/d/${slug}?preview=buyer`}>
          Back to your purchase
        </Link>
      </p>
    </section>
  );
}
