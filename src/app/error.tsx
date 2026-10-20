"use client";

import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-5 py-24 sm:px-8">
      <h1 className="text-5xl">Something went wrong</h1>
      <p className="mt-4 text-muted">We hit a problem loading this page. Please try again. If it keeps happening, tell the clinic or the site owner and quote the code below.</p>
      {error.digest && <p className="mt-3 text-sm text-silver">Error code: <code>{error.digest}</code></p>}
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" className="btn-primary" onClick={() => reset()}>Try again</button>
        <Link href="/" className="btn-ghost">Go to the homepage</Link>
      </div>
    </section>
  );
}
