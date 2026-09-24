import { RecoveryFrame } from '@/components/recovery-frame';
import { VerifyPurchaseRecovery } from '@/components/purchase-recovery';
export const metadata = { title: 'Verify checkout email' };
export default function Verify() {
  return (
    <RecoveryFrame>
      <VerifyPurchaseRecovery />
    </RecoveryFrame>
  );
}
