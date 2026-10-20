import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-5 py-24 sm:px-8">
      <h1 className="text-6xl">Page not found</h1>
      <p className="mt-4 text-muted">That page does not exist or you may not have access to it.</p>
      <div className="mt-8"><Link href="/" className="btn-primary">Back to the homepage</Link></div>
    </section>
  );
}
