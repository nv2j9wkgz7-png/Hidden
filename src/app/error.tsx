'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="panel setup">
      <img src="/hidn-arrow-mark.svg" alt="" width={72} height={72} />
      <h1>Something didn’t load.</h1>
      <p>We couldn’t load this page. Try again in a moment.</p>
      <button className="primary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
