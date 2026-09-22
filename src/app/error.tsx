'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="panel setup">
      <h1>Something didn’t load.</h1>
      <p>
        Please try again. If this is a new installation, check the service
        credentials and database migration.
      </p>
      <button className="primary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
