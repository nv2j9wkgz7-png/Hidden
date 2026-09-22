import Link from 'next/link';
export default function NotFound() {
  return (
    <section className="panel setup">
      <h1>This drop isn’t here.</h1>
      <p>The link may be incorrect, or the drop hasn’t been published yet.</p>
      <Link className="button" href="/">
        Back home
      </Link>
    </section>
  );
}
