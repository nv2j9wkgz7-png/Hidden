import { VerifyPurchaseRecovery } from '@/components/purchase-recovery';
export const metadata = { title: 'Verify checkout email' };
export default function Verify() {
  return (
    <section className="recovery-layout">
      <VerifyPurchaseRecovery />
    </section>
  );
}
