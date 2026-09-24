import { RequestPurchaseRecovery } from '@/components/purchase-recovery';
export const metadata = { title: 'Recover purchases' };
export default async function Recover({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  return (
    <section className="recovery-layout">
      <RequestPurchaseRecovery expired={(await searchParams).expired === '1'} />
    </section>
  );
}
