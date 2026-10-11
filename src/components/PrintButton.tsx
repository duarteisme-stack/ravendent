"use client";

export default function PrintButton() {
  return <button type="button" className="btn-ghost" onClick={() => window.print()}>Print ticket</button>;
}
