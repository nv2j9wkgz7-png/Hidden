'use client';
import { NavigationLink as Link } from '@/components/navigation-link';
import { useRouter } from 'next/navigation';
export function ReviewActions({ draft }: { draft: boolean }) {
  const router = useRouter();
  return (
    <div className="review-actions">
      {draft && (
        <button
          className="button"
          type="submit"
          form="drop-details-form"
          name="action"
          value="save-draft"
          onClick={() => {
            if (!document.getElementById('drop-details-form'))
              router.push('/dashboard');
          }}
        >
          Save as draft
        </button>
      )}
      <Link className="text-button" href="/dashboard">
        {draft ? 'Cancel' : 'Done'}
      </Link>
    </div>
  );
}
