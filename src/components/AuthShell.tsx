export default function AuthShell({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-5 py-16 sm:px-8">
      <h1 className="text-5xl">{title}</h1>
      {intro && <p className="mt-3 text-muted">{intro}</p>}
      <div className="panel mt-8 p-6 sm:p-8">{children}</div>
    </section>
  );
}
