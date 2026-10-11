import Link from "next/link";

export default function ComingSoon({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-5 py-24 sm:px-8">
      <h1 className="text-5xl">{title}</h1>
      <p className="mt-4 text-muted">{children}</p>
      <div className="mt-8">
        <Link href="/#availability" className="btn-ghost">Back to available dates</Link>
      </div>
    </section>
  );
}
