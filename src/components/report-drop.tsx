'use client';
import { useState } from 'react';
import { reportCategories } from '@/lib/report-input';
import { api } from '@/lib/client-api';
export function ReportDrop({ dropId }: { dropId: string }) {
  const [open, setOpen] = useState(false),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      await api('/api/reports', {
        drop_id: dropId,
        category: form.get('category'),
        details: form.get('details'),
        contact_email: form.get('email'),
      });
      setSent(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not submit your report.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="report-drop">
      <button
        className="text-button"
        aria-expanded={open}
        aria-controls="drop-report-form"
        onClick={() => setOpen(!open)}
      >
        Report this drop
      </button>
      {open && (
        <div id="drop-report-form" className="panel">
          <h2>Report this drop</h2>
          <p>
            Tell us what needs review. Your report is private and isn’t shared
            with the creator.
          </p>
          {sent ? (
            <p className="notice" role="status">
              Report received. Our team will review it. Reporting doesn’t
              automatically stop sales.
            </p>
          ) : (
            <form onSubmit={submit}>
              <div className="field">
                <label htmlFor="report-category">What’s the concern?</label>
                <select
                  id="report-category"
                  name="category"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Choose a reason
                  </option>
                  {Object.entries(reportCategories).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="report-details">Details</label>
                <textarea
                  id="report-details"
                  name="details"
                  rows={5}
                  minLength={10}
                  maxLength={2000}
                  required
                  placeholder="Describe the concern and which file it relates to. Don’t include sensitive images or personal identity documents."
                />
              </div>
              <div className="field">
                <label htmlFor="report-email">Contact email (optional)</label>
                <input
                  id="report-email"
                  name="email"
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                />
                <small>Only if you want us to be able to follow up.</small>
              </div>
              {error && (
                <p className="notice error" role="alert">
                  {error}
                </p>
              )}
              <button className="secondary" disabled={busy}>
                {busy ? 'Sending…' : 'Submit report'}
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
