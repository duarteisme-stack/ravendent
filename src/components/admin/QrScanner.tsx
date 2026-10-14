"use client";

import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { completeFromScanAction, verifyCodeAction, type ScanResult } from "@/app/actions/admin";
import { fmtDateTz, fmtSlot } from "@/lib/format";
import { parseScanned } from "@/lib/qr";

type Phase = "idle" | "starting" | "scanning";

export default function QrScanner({ timezone, canComplete }: { timezone: string; canComplete: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef(0);
  const last = useRef(0);
  const busy = useRef(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [camError, setCamError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [pending, startTransition] = useTransition();

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setPhase("idle");
  }, []);

  useEffect(() => stop, [stop]);

  const check = useCallback((raw: string) => {
    setNotice(null);
    setCompleted(false);
    startTransition(async () => {
      setResult(await verifyCodeAction(raw));
      busy.current = false;
    });
  }, []);

  const tick = useCallback(() => {
    raf.current = requestAnimationFrame(tick);
    const v = video.current, c = canvas.current;
    const now = performance.now();
    if (!v || !c || v.readyState < 2 || busy.current || now - last.current < 140) return;
    last.current = now;

    const scale = Math.min(1, 640 / v.videoWidth);
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
    if (!hit?.data) return;

    if (!parseScanned(hit.data)) {
      busy.current = true;
      setNotice("That QR code is not a RavenDent appointment ticket.");
      setTimeout(() => { busy.current = false; }, 1800);
      return;
    }
    busy.current = true;
    stop();
    check(hit.data);
  }, [check, stop]);

  const start = async () => {
    setCamError(null); setResult(null); setNotice(null); setPhase("starting");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError("This browser cannot open the camera here. Use the box below to enter the reference instead."); setPhase("idle"); return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      stream.current = s;
      const v = video.current!;
      v.srcObject = s;
      v.setAttribute("playsinline", "true");
      await v.play();
      busy.current = false;
      setPhase("scanning");
      raf.current = requestAnimationFrame(tick);
    } catch {
      setCamError("The camera is blocked or unavailable. Allow camera access in the browser, or enter the reference below.");
      stop();
    }
  };

  const complete = (id: string) => startTransition(async () => {
    const r = await completeFromScanAction(id);
    if (r.ok) { setCompleted(true); setResult((p) => (p && p.state === "ok" ? { ...p, status: "completed", valid: false } : p)); }
    else setNotice(r.error ?? "Something went wrong.");
  });

  const ok = result?.state === "ok" ? result : null;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="adm-card p-5 sm:p-6" aria-labelledby="cam">
        <h2 id="cam" className="text-2xl">Camera</h2>
        <div className="relative mt-4 aspect-square overflow-hidden rounded-xl border border-night-line bg-black">
          <video ref={video} muted playsInline className={`h-full w-full object-cover ${phase === "scanning" ? "" : "invisible"}`} />
          <canvas ref={canvas} className="hidden" />
          {phase === "scanning" && (
            <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-[#22d3ee]/80" aria-hidden="true">
              <span className="absolute inset-x-0 top-1/2 h-px animate-pulse bg-[#22d3ee]/80" />
            </div>
          )}
          {phase !== "scanning" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <p className="text-silver">{phase === "starting" ? "Opening camera..." : "Point the camera at a patient's QR ticket."}</p>
              <button type="button" onClick={start} disabled={phase === "starting"} className="adm-btn-primary">{result ? "Scan next ticket" : "Start scanning"}</button>
            </div>
          )}
        </div>
        {phase === "scanning" && <button type="button" onClick={stop} className="adm-btn-ghost mt-4">Stop camera</button>}
        {camError && <p role="alert" className="mt-4 rounded-lg border border-crimson/60 bg-crimson/10 px-3 py-2 text-sm">{camError}</p>}
        {notice && <p role="status" className="mt-4 rounded-lg border border-night-line bg-night px-3 py-2 text-sm">{notice}</p>}

        <form className="mt-6 border-t border-night-line pt-5" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); check(String(f.get("code") ?? "")); }}>
          <label htmlFor="code" className="mb-1.5 block text-sm text-silver">No camera? Enter the reference</label>
          <div className="flex gap-2">
            <input id="code" name="code" placeholder="RD-261027-1A2B3C4D" autoComplete="off" className="field" />
            <button type="submit" className="adm-btn-ghost">Check</button>
          </div>
        </form>
      </section>

      <section className="adm-card p-5 sm:p-6" aria-live="polite" aria-labelledby="res">
        <h2 id="res" className="text-2xl">Result</h2>
        {pending && !result && <p className="mt-4 text-muted">Checking...</p>}
        {!result && !pending && <p className="mt-4 text-muted">Scan a ticket to see the appointment here.</p>}

        {result && result.state !== "ok" && (
          <div className="mt-4 rounded-xl border border-crimson/60 bg-crimson/10 p-5">
            <p className="font-display text-4xl text-crimson-light">Not valid</p>
            <p className="mt-1 text-silver">
              {result.state === "notfound" ? "No appointment matches this code." : result.state === "unreadable" ? "That is not a RavenDent ticket or reference." : "The check could not be completed. Try again."}
            </p>
          </div>
        )}

        {ok && (
          <div className={`mt-4 rounded-xl border p-5 ${ok.valid ? "border-emerald/60 bg-emerald/10" : "border-crimson/60 bg-crimson/10"}`}>
            <p className={`font-display text-5xl ${ok.valid ? "text-emerald-light" : "text-crimson-light"}`}>{completed ? "Checked in" : ok.valid ? "Valid" : "Not valid"}</p>
            {!ok.valid && !completed && (
              <p className="mt-1 text-silver">
                {ok.status === "confirmed" ? "This QR code was replaced when the appointment changed. Ask for the current ticket, or search by reference."
                  : ok.status === "pending" ? "This appointment is still waiting for approval."
                  : `This appointment is ${ok.status.replace("_", " ")}.`}
              </p>
            )}
            <dl className="mt-5 divide-y divide-night-line border-y border-night-line">
              {([["Patient", ok.patient], ["Service", ok.service], ["Dentist", ok.dentist], ["Date", fmtDateTz(ok.starts_at, timezone)], ["Time", `${fmtSlot(ok.starts_at, timezone)} to ${fmtSlot(ok.ends_at, timezone)}`], ["Reference", ok.reference]] as const).map(([k, v]) => (
                <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[7rem_1fr]"><dt className="text-sm text-muted">{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
            {canComplete && ok.valid && !completed && (
              <button type="button" onClick={() => complete(ok.id)} disabled={pending} className="adm-btn-primary mt-5">{pending ? "Saving..." : "Mark visit as completed"}</button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
