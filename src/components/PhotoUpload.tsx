"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

const BUCKET = "patient-photos";
const SIZE = 640;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Mode = "idle" | "camera" | "preview";

/** Crop to a centered square, scale down, and return a small JPEG. */
function toSquareJpeg(src: CanvasImageSource, w: number, h: number): Promise<Blob> {
  const side = Math.min(w, h);
  const c = document.createElement("canvas");
  c.width = c.height = Math.min(SIZE, side);
  c.getContext("2d")!.drawImage(src, (w - side) / 2, (h - side) / 2, side, side, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Could not process the image."))), "image/jpeg", 0.85));
}

export default function PhotoUpload({ userId, initialUrl }: { userId: string; initialUrl: string | null }) {
  const path = `${userId}/profile.jpg`;
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [mode, setMode] = useState<Mode>("idle");
  const [preview, setPreview] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const stopCamera = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
  useEffect(() => () => { stopCamera(); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  const showPreview = (blob: Blob) => { setPreview({ blob, url: URL.createObjectURL(blob) }); setMode("preview"); };

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    setError(null); setSaved(false);
    if (!f) return;
    if (!OK_TYPES.includes(f.type)) return setError("Please choose a JPG, PNG, or WebP picture.");
    if (f.size > 12 * 1024 * 1024) return setError("That picture is too large. Choose one under 12 MB.");
    try {
      const bmp = await createImageBitmap(f, { imageOrientation: "from-image" });
      showPreview(await toSquareJpeg(bmp, bmp.width, bmp.height));
      bmp.close();
    } catch { setError("We could not read that picture. Try another one."); }
  }

  async function openCamera() {
    setError(null); setSaved(false);
    if (!navigator.mediaDevices?.getUserMedia) return setError("This browser cannot open the camera. Use Upload a photo instead.");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1080 } }, audio: false });
      stream.current = s;
      setMode("camera");
      requestAnimationFrame(async () => {
        const v = video.current;
        if (!v) return;
        v.srcObject = s; v.setAttribute("playsinline", "true");
        await v.play().catch(() => undefined);
      });
    } catch { setError("The camera is blocked or unavailable. Allow camera access in your browser, or use Upload a photo."); }
  }

  async function snap() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    try { const blob = await toSquareJpeg(v, v.videoWidth, v.videoHeight); stopCamera(); showPreview(blob); }
    catch { setError("Could not take the photo. Please try again."); }
  }

  function cancel() { stopCamera(); setPreview(null); setMode("idle"); }

  async function save() {
    if (!preview) return;
    const sb = getSupabaseBrowser();
    if (!sb) return setError("The site is not connected yet.");
    setBusy(true); setError(null);
    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, preview.blob, { upsert: true, contentType: "image/jpeg", cacheControl: "60" });
    if (upErr) { setBusy(false); return setError("We could not save your photo. Please try again."); }
    const { data } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600);
    setUrl(data?.signedUrl ?? null); setSaved(true); setBusy(false); setPreview(null); setMode("idle");
  }

  async function remove() {
    const sb = getSupabaseBrowser();
    if (!sb) return;
    setBusy(true); setError(null); setSaved(false);
    const { error: rmErr } = await sb.storage.from(BUCKET).remove([path]);
    setBusy(false);
    if (rmErr) return setError("We could not remove your photo. Please try again.");
    setUrl(null);
  }

  return (
    <section aria-labelledby="photo-title" className="panel p-5 sm:p-6">
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border border-silver/30 bg-ink">
          {mode === "camera" ? (
            <video ref={video} muted playsInline aria-label="Camera preview" className="h-full w-full -scale-x-100 object-cover" />
          ) : preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.url} alt="Photo preview" className="h-full w-full object-cover" />
          ) : url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Your photo" className="h-full w-full object-cover" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-full w-full p-7 text-muted" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" /></svg>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 id="photo-title" className="text-2xl">Your photo <span className="text-base text-muted">(optional)</span></h2>
          <p className="mt-1 text-sm text-muted">Helps reception confirm it is you. Only you and clinic staff can see it.</p>

          <div className="mt-4 flex flex-wrap gap-2.5">
            {mode === "idle" && (
              <>
                <button type="button" className="btn-primary !py-2 !px-4 !text-sm" onClick={openCamera} disabled={busy}>Take a selfie</button>
                <button type="button" className="btn-ghost !py-2 !px-4 !text-sm" onClick={() => file.current?.click()} disabled={busy}>{url ? "Upload a new photo" : "Upload a photo"}</button>
                {url && <button type="button" className="btn-ghost !py-2 !px-4 !text-sm" onClick={remove} disabled={busy}>Remove</button>}
              </>
            )}
            {mode === "camera" && (
              <>
                <button type="button" className="btn-primary !py-2 !px-4 !text-sm" onClick={snap}>Take photo</button>
                <button type="button" className="btn-ghost !py-2 !px-4 !text-sm" onClick={cancel}>Cancel</button>
              </>
            )}
            {mode === "preview" && (
              <>
                <button type="button" className="btn-primary !py-2 !px-4 !text-sm" onClick={save} disabled={busy}>{busy ? "Saving..." : "Use this photo"}</button>
                <button type="button" className="btn-ghost !py-2 !px-4 !text-sm" onClick={openCamera} disabled={busy}>Retake</button>
                <button type="button" className="btn-ghost !py-2 !px-4 !text-sm" onClick={cancel} disabled={busy}>Cancel</button>
              </>
            )}
          </div>
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} className="sr-only" tabIndex={-1} aria-label="Choose a photo from your device" />
        </div>
      </div>
      <div aria-live="polite">
        {error && <p role="alert" className="mt-4 rounded-md border border-crimson/60 bg-crimson/10 px-3 py-2 text-sm">{error}</p>}
        {saved && <p role="status" className="mt-4 rounded-md border border-emerald/60 bg-emerald/10 px-3 py-2 text-sm">Photo saved.</p>}
      </div>
    </section>
  );
}
