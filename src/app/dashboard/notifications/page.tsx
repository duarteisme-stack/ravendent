import { markNotificationsReadAction } from "@/app/actions/profile";
import { getClinicData } from "@/lib/clinic";
import { fmtDateTz, fmtSlot } from "@/lib/format";
import { getSessionContext } from "@/lib/dashboard";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const { sb, user } = await getSessionContext();
  const { settings } = await getClinicData();
  const { data } = await sb.from("notifications").select("id, title, body, read_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  const items = data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div className="max-w-2xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-5xl">Notifications</h1>
        {unread > 0 && (
          <form action={markNotificationsReadAction}>
            <button type="submit" className="btn-ghost !py-2 !px-4 !text-sm">Mark all as read</button>
          </form>
        )}
      </header>

      {items.length === 0 ? (
        <div className="panel p-6">
          <p className="font-medium">No notifications yet.</p>
          <p className="mt-1 text-sm text-muted">Booking confirmations, schedule changes, and reminders will appear here.</p>
        </div>
      ) : (
        <ul className="divide-y divide-silver/15 border-y border-silver/15">
          {items.map((n) => (
            <li key={n.id} className="py-4">
              <div className="flex items-start justify-between gap-4">
                <h2 className={`text-xl ${n.read_at ? "text-silver" : "text-snow"}`}>
                  {!n.read_at && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-crimson-light align-middle" aria-label="Unread" />}
                  {n.title}
                </h2>
                <time dateTime={n.created_at} className="shrink-0 text-xs text-muted">{fmtDateTz(n.created_at, settings.timezone)}, {fmtSlot(n.created_at, settings.timezone)}</time>
              </div>
              {n.body && <p className="mt-1 text-sm text-muted">{n.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
