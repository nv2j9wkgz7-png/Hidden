import Link from 'next/link';
import { Settings2 } from 'lucide-react';
export function Setup() {
  return (
    <section className="panel setup">
      <div className="status-icon">
        <Settings2 />
      </div>
      <h1>Connect your workspace</h1>
      <p>
        Hidn is installed. Add your service credentials to start creating
        drops.
      </p>
      <ol>
        <li>
          Copy <code>.env.example</code> to <code>.env.local</code> and fill in
          the Supabase and Stripe keys.
        </li>
        <li>Run the database migration in Supabase.</li>
        <li>Restart the app.</li>
      </ol>
      <p className="hint">
        The README includes the full setup and payment test checklist.
      </p>
      <Link href="/" className="button secondary">
        Back home
      </Link>
    </section>
  );
}
