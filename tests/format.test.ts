import { test } from "node:test";
import assert from "node:assert/strict";
import { durationLabel, fmtSlot, fmtTime12, pesoRange, ymdInTz } from "../src/lib/format";

test("12-hour times in the clinic time zone", () => {
  // 00:00 UTC = 8:00 AM in Manila (UTC+8)
  assert.equal(fmtSlot("2026-11-03T00:00:00Z", "Asia/Manila"), "8:00 AM");
  assert.equal(fmtSlot("2026-11-03T04:00:00Z", "Asia/Manila"), "12:00 PM");
  assert.equal(fmtSlot("2026-11-03T09:30:00Z", "Asia/Manila"), "5:30 PM");
  assert.equal(fmtSlot("2026-11-03T16:00:00Z", "Asia/Manila"), "12:00 AM");
  assert.ok(!fmtSlot("2026-11-03T00:00:00Z", "Asia/Manila").includes("\u202f"));
});

test("clinic-local date can differ from the UTC date", () => {
  assert.equal(ymdInTz("2026-11-02T17:00:00Z", "Asia/Manila"), "2026-11-03");
  assert.equal(ymdInTz("2026-11-03T15:59:00Z", "Asia/Manila"), "2026-11-03");
});

test("time-of-day strings", () => {
  assert.equal(fmtTime12("08:00:00"), "8:00 AM");
  assert.equal(fmtTime12("13:00:00"), "1:00 PM");
  assert.equal(fmtTime12("00:30:00"), "12:30 AM");
  assert.equal(fmtTime12("12:00:00"), "12:00 PM");
});

test("duration and price labels", () => {
  assert.equal(durationLabel(30), "30 min");
  assert.equal(durationLabel(90), "1 hr 30 min");
  assert.equal(durationLabel(120), "2 hr");
  assert.equal(pesoRange(500, 800), "₱500 to ₱800");
  assert.equal(pesoRange(500, null), "From ₱500");
  assert.equal(pesoRange(null, null), null);
});
