# RavenDent (Stage 5: admin dashboard, QR scanner, simpler patient dashboard)

Next.js 15 (App Router) + TypeScript + Tailwind, Supabase Postgres, deployed on Vercel. Emails go through Brevo (Stage 6).

## Status

| Area | State |
|---|---|
| Database schema, RLS, booking / reschedule / cancel / verify functions | Done (`supabase/schema.sql`) |
| Public homepage (hero, about, hours, services, dentists, FAQ, contact, footer) | Done, content comes from the database |
| Public availability calendar (month view, 12-hour slots, polling every 30s) | Done, uses the live RPCs |
| Register, login, logout, email confirmation, forgot/reset password | Done (Supabase Auth) |
| Patient profile, medical information (with consent), account settings, notifications | Done |
| Customer dashboard (overview, upcoming, history are read-only lists) | Done |
| Booking wizard (service, dentist, date, time, review, confirm) with race-safe saving | Done |
| Appointment ticket with QR code (view, download PNG, print) | Done |
| Reschedule (can change service; duration recalculated) and cancel with confirmation and deadlines | Done |
| Admin dashboard (overview charts, appointments, doctors and times, services, hours, holidays, patients, staff, reports, audit log) | Done |
| Camera QR scanner for staff (`/admin/scan`) with manual reference fallback | Done |
| Patient dashboard redesigned for phones (bottom tab bar, single next-visit card) | Done |
| Falling black feathers background | Done (hidden for reduced-motion users) |
| Booking limits and rate limiting (database level) | Done |

| Brevo emails, reminders, tests | Stage 6 |

## Setup

1. Supabase: create a project, open SQL Editor, run `supabase/migrations/001_init.sql`, then `002_booking.sql`, then `003_admin.sql`. (Already ran earlier ones? Run only the files you have not run yet, in order.)
2. Copy `.env.example` to `.env.local` and fill in the Project URL, anon key (Project Settings > API), and site URL.
3. `npm install` then `npm run dev` and open http://localhost:3000.
4. Supabase > Authentication:
   - URL Configuration: set Site URL to your site, and add `http://localhost:3000/**` and your Vercel URL `/**` to Redirect URLs.
   - Emails > SMTP Settings: enable custom SMTP with Brevo (host `smtp-relay.brevo.com`, port 587, your Brevo SMTP login and key, a verified sender address).
   - Emails > Templates: paste `supabase/email-templates/confirm-signup.html` and `reset-password.html` (they use token links that work on any device).
   - Sign In / Providers > Email: keep "Confirm email" on.
5. Optional: drop a dental clinic photo at `public/hero.jpg`. The hero darkens it automatically; without it you get the crimson gradient.
6. Vercel: import the repo, add the same three env vars, deploy.

Edit clinic address, phone, email, hours, services, and dentists in the Supabase Table Editor for now (`clinic_settings`, `clinic_hours`, `dental_services`, `dentists`). The admin dashboard replaces this in Stage 5.

## Security notes

| Topic | How it is handled |
|---|---|
| Passwords | Hashed by Supabase Auth. Policy enforced server-side: 10 to 72 characters with a letter and a number |
| Sessions | HTTP-only cookies, refreshed in middleware; every protected request is validated with `getUser()`. Set JWT expiry and inactivity timeout in Supabase > Authentication > Sessions |
| Remember me | Not offered: sessions already persist across browser restarts, and a shorter session is a Supabase setting |
| Account enumeration | Registration and password reset return the same message whether or not the email exists |
| Open redirects | `next` parameters accept same-site paths only |
| CSRF | Server Actions check the request origin |
| Authorization | `/dashboard` and `/book` need a session; data access is enforced by RLS in the database, not just the UI |
| Rate limiting | Auth: Supabase Auth limits (Authentication > Rate Limits). Booking: at most 20 booking, reschedule, or cancel actions per patient per hour, and at most `max_active_appointments` (default 5) upcoming appointments, enforced inside the database functions |
| Medical data | Visible to the patient, dentists, and admins only; never shown to receptionists |
| Admin access | Every admin page and action re-checks the role on the server; the database also refuses writes from the wrong role |

## Tests

`npm test` runs the validation unit tests (email, phone, password, date of birth, redirect safety, registration, patient and medical forms).

## Booking rules worth knowing

| Rule | Where |
|---|---|
| Double booking is impossible | Database exclusion constraint on dentist and time range, plus a row lock on reschedule |
| Reschedule is one atomic update | Old slot is released and the new one reserved in the same statement; QR token rotates |
| QR contains | Plain text: reference, patient name, service, date, time, dentist, and a random verification code. Any phone camera shows it; no link opens. Never medical data, phone, or email |
| Approval | Services flagged `requires_approval` (or `clinic_settings.require_approval`) start as pending |
| Change deadlines | `cancel_deadline_hours` and `reschedule_deadline_hours` in `clinic_settings` (default 24). Staff are exempt |
| Emails | In-app notifications are created now; Brevo emails for them arrive in Stage 6 |

## Admin dashboard

| Page | Who | What you can do |
|---|---|---|
| Overview | All staff | Today's count, pending approvals, trend, weekday, service and new-vs-returning charts (dentists see only their own numbers) |
| Appointments | All staff | Filter and search; approve or decline requests, complete, mark missed, reschedule, cancel (dentists: complete or missed on their own only) |
| Scan QR | All staff | Camera scan or type the reference; Valid or Not valid; mark visit completed |
| Doctors and times | Admin | Add, edit, delete doctors; set weekly working windows per doctor; link a doctor's login |
| Services | Admin | Add, edit, delete services; duration, price range, preparation, approval rule, shown or hidden |
| Hours and settings | Admin | Opening hours and lunch breaks, clinic details, notice, deadlines, limits |
| Holidays and leave | Admin, receptionist | Close the clinic or one doctor for days or part of a day; warns about appointments inside the block |
| Patients | All staff | Contact details and history; medical information only for admin and dentists |
| Staff and roles | Admin | Give or remove access, change roles, deactivate accounts |
| Reports, Audit log | Reports: all staff; Audit: admin | Counts by status, service, doctor for any range; who changed what |

To become admin: register on the website, then run once in the SQL Editor:
`update profiles set role = 'admin' where email = 'YOUR-EMAIL';`
Staff sign in at the normal login page and land on the admin dashboard.

The scanner needs HTTPS for the camera (Vercel provides it) and the browser's camera permission.
Deleting a service or doctor that has appointments is refused; hide it instead (untick "shown on the website").

## Test accounts

Create users in Supabase > Authentication > Users (tick Auto Confirm), then run the promote snippet at the bottom of `supabase/migrations/001_init.sql`.

## Test checklist

| # | Check | Expected |
|---|---|---|
| 1 | Open `/` while logged out | Whole page loads, no login needed |
| 2 | Pick Root Canal Treatment, then a Tuesday | Starts from 8:00 AM, none between 10:30 AM and 1:00 PM, last start 4:30 PM |
| 3 | Pick a Sunday | Day is greyed out and cannot be selected |
| 4 | Insert a row in `blocked_slots` for a date | That day shows Closed after the next refresh |
| 5 | Insert an appointment row manually for one dentist | Slot disappears for that dentist, remains for others |
| 6 | Resize to phone width | Menu collapses, calendar and slot list stack |
| 7 | Tab through the page | Skip link, nav, calendar days, and slots all show a focus ring |
| 8 | Visit `/dashboard` logged out | Redirects to `/login?next=/dashboard` |
| 9 | Register with a new email | "Check your email" message; confirmation email arrives from Brevo; link opens Patient Profile |
| 10 | Register again with the same email | Same neutral message, no new account |
| 11 | Log in with a wrong password | "Incorrect email or password." |
| 12 | Log in before confirming | Offer to resend the confirmation email |
| 13 | Click a calendar slot while logged out | Login page, then back to `/book` with the slot kept |
| 14 | Save the patient profile without ticking consent | Error on the consent checkbox, nothing saved |
| 15 | Save medical info with all fields empty but consent ticked | Saved (empty answers allowed) |
| 16 | Forgot password, open the link on your phone | Reset form opens; new password works; other sessions end |
| 17 | As customer A, open `/dashboard/profile` | Only A's data (RLS blocks B's rows even if requested directly) |
| 18 | Log in as a new user, click a calendar slot | Sent to patient profile, then medical info, then back to the booking review with your slot kept |
| 19 | Book a Consultation | Confirmation page with ticket, QR, 12-hour times, status Confirmed, and a notification |
| 20 | Book Root Canal | Status Pending, no QR yet, message explains approval |
| 21 | In Table Editor set that appointment's status to `confirmed` | QR appears on the ticket |
| 22 | Two browsers book the same slot at once | One succeeds; the other is told the time was just taken and returns to time selection |
| 23 | Reschedule 9:00 to 9:30 (a 60-minute service) | Allowed even though it overlaps your own old time; old QR stops validating |
| 24 | Reschedule to a different service | Duration and end time recalculated before you confirm |
| 25 | Cancel | Confirmation prompt first; slot reappears on the public calendar; QR stops validating |
| 26 | Appointment starting inside the 24-hour deadline | Reschedule and Cancel hidden, contact-the-clinic message shown |
| 27 | Customer opens another customer's appointment URL | 404 |
| 28 | Promote a user to `receptionist`, scan the ticket QR with a phone | `/staff/verify` shows Valid with patient name, service, dentist, time |
| 29 | Scan the old QR after a reschedule | Not valid, with a message to get the current ticket |
| 30 | Open `/staff/verify` as a customer | "Staff only", no data |
| 31 | Print the ticket page | Only the ticket prints, black on white |
| 32 | Scan a ticket QR with the phone camera | Shows appointment details as text; no link or browser opens |
| 33 | Log in as admin | Lands on `/admin` with charts matching your data |
| 34 | Services: add one, edit its duration, hide one | Website and booking calendar change within a minute or on next refresh |
| 35 | Doctors: add a doctor, add Mon to Fri 9 AM to 5 PM | Doctor appears in booking; slots follow those hours |
| 36 | Holidays: close tomorrow for the whole clinic | Tomorrow shows Closed on the public calendar; a warning lists affected bookings |
| 37 | Appointments: approve a pending request | Patient gets a notification and the QR appears on their ticket |
| 38 | Scan from `/admin/scan` | Valid for a current ticket; Not valid for one replaced by a reschedule |
| 39 | Log in as a receptionist, open a patient | Contact details shown, medical information hidden |
| 40 | Open `/admin` as a customer | Redirected to the patient dashboard |
| 41 | Phone width: homepage, calendar, booking, dashboard, admin | No sideways scrolling; bottom tab bar on the patient dashboard; admin menu opens as a drawer |

## Troubleshooting

| Symptom | Fix |
|---|---|
| Calendar says availability is unavailable | Env vars missing or wrong; restart `npm run dev` after editing `.env.local` |
| Calendar says it could not load availability | Schema not run, or functions missing; re-run both migrations on a fresh project |
| Services section empty | `dental_services` has no active rows |
| Every day shows Closed | No `dentist_availability` rows, or `min_notice_hours` is larger than the time left today |
| Confirmation or reset link says invalid or expired | Site URL / Redirect URLs not set, templates not pasted, or the link was already used |
| No confirmation email | Check Brevo SMTP credentials and that the sender is verified; check Supabase Auth logs |
| "Email rate limit exceeded" | Supabase limits auth emails per hour; custom SMTP (Brevo) raises it |
| Fonts look plain | Google Fonts blocked by the network; the site falls back to Georgia and system sans |

## Structure

```
supabase/migrations/       001 tables, RLS, availability engine, seed data; 002 booking limits and reschedule-aware availability
src/app/                   homepage, auth pages, dashboard, privacy, terms, auth route handlers
src/app/actions/           server actions (auth, patient profile, medical, account)
src/middleware.ts          session refresh and route protection
tests/                     unit tests
src/components/            Navbar, Hero, FeatherArt, AvailabilityCalendar, Hours, Faq, Footer, Logo
src/lib/                   Supabase clients, validation, data loaders, 12-hour/time-zone formatting
supabase/email-templates/  Brevo-ready confirm and reset emails
```

## Deploy: GitHub and Vercel

1. Create an empty GitHub repository (private is fine) and push this folder to it. Never commit `.env.local` (it is git-ignored).
2. Vercel > Add New > Project > import the repository. Framework preset: Next.js (auto-detected). Build settings need no changes.
3. Before the first deploy, add Environment Variables (Production, Preview, Development):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon / publishable key |
| `NEXT_PUBLIC_SITE_URL` | Your Vercel URL, for example `https://ravendent.vercel.app` (no trailing slash) |
| `BREVO_API_KEY` | Brevo API key (used from Stage 6; keep it server-side, no `NEXT_PUBLIC_` prefix) |

4. Deploy, then in Supabase > Authentication > URL Configuration set Site URL to the Vercel URL and add `https://YOUR-APP.vercel.app/**` to Redirect URLs.
5. Redeploy after changing environment variables.
