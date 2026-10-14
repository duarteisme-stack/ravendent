import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTicketText, parseScanned } from "../src/lib/qr";
import { addDays, localDayEndISO, localDayStartISO, localToUtcISO } from "../src/lib/format";

const TOKEN = "3f9a1c0be27d4455a6b8c9d0e1f2a3b4c5d6";
const info = { reference: "RD-261027-1A2B3C4D", patient: "Ana Reyes", service: "Root Canal Treatment", date: "Tue, Oct 27, 2026", start: "10:00 AM", end: "11:30 AM", dentist: "Dr. Elena Cruz", code: TOKEN };

test("ticket text is readable and round-trips to the code", () => {
  const text = buildTicketText(info);
  assert.ok(text.includes("Patient: Ana Reyes") && text.includes("10:00 AM - 11:30 AM"));
  assert.ok(!/https?:\/\//.test(text), "must not contain a link");
  assert.deepEqual(parseScanned(text), { kind: "token", value: TOKEN });
});

test("ticket text never carries medical data or contact details", () => {
  const text = buildTicketText(info).toLowerCase();
  for (const word of ["allerg", "medic", "phone", "email", "@"]) assert.ok(!text.includes(word), word);
});

test("scanner accepts bare tokens, references and legacy links; rejects junk", () => {
  assert.deepEqual(parseScanned(TOKEN), { kind: "token", value: TOKEN });
  assert.deepEqual(parseScanned("rd-261027-1a2b3c4d"), { kind: "reference", value: "RD-261027-1A2B3C4D" });
  assert.deepEqual(parseScanned(`https://x.test/staff/verify?code=${TOKEN}`), { kind: "token", value: TOKEN });
  assert.equal(parseScanned("hello world"), null);
  assert.equal(parseScanned("   "), null);
});

test("clinic-local day boundaries in Manila (UTC+8)", () => {
  assert.equal(localToUtcISO("2026-11-03", "08:00", "Asia/Manila"), "2026-11-03T00:00:00.000Z");
  assert.equal(localToUtcISO("2026-11-03", "00:00", "Asia/Manila"), "2026-11-02T16:00:00.000Z");
  assert.equal(localDayStartISO("2026-11-03", "Asia/Manila"), "2026-11-02T16:00:00.000Z");
  assert.equal(localDayEndISO("2026-11-03", "Asia/Manila"), "2026-11-03T16:00:00.000Z");
});

test("DST-aware conversion (New York)", () => {
  assert.equal(localToUtcISO("2026-07-01", "09:00", "America/New_York"), "2026-07-01T13:00:00.000Z"); // EDT
  assert.equal(localToUtcISO("2026-12-01", "09:00", "America/New_York"), "2026-12-01T14:00:00.000Z"); // EST
});

test("addDays crosses month and year", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});
