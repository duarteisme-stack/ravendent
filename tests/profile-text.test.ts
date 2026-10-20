import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTemplate, normalizeDob, parseProfileText } from "../src/lib/profile-text";

const sample = `# my details
Full name: Ana Reyes
Date of birth: May 17, 1990
Mobile: 0917 123 4567
EMAIL = Ana@Example.com
Address: 12 Mango St
Barangay Lahug, Cebu City
Emergency contact: Ben Reyes
Emergency phone: 0918 000 1111
Allergies: Penicillin
Latex
Blood type: O+
Medications: None
`;

test("maps labels (case and wording tolerant) to fields", () => {
  const { fields } = parseProfileText(sample);
  assert.equal(fields.full_name, "Ana Reyes");
  assert.equal(fields.date_of_birth, "1990-05-17");
  assert.equal(fields.phone, "0917 123 4567");
  assert.equal(fields.email, "ana@example.com");
  assert.equal(fields.emergency_contact_name, "Ben Reyes");
  assert.equal(fields.emergency_contact_phone, "0918 000 1111");
  assert.equal(fields.medications, "None");
});

test("multi-line answers continue, but unknown labels never leak into the previous field", () => {
  const { fields, ignoredLabels } = parseProfileText(sample);
  assert.equal(fields.address, "12 Mango St\nBarangay Lahug, Cebu City");
  assert.equal(fields.allergies, "Penicillin\nLatex");
  assert.ok(ignoredLabels.includes("Blood type"));
});

test("date formats", () => {
  assert.equal(normalizeDob("1990-5-7"), "1990-05-07");
  assert.equal(normalizeDob("17 May 1990"), "1990-05-17");
  assert.equal(normalizeDob("05/17/1990"), "1990-05-17");
  assert.equal(normalizeDob("17/05/1990"), "1990-05-17"); // day above 12 is read day first
  assert.equal(normalizeDob("03/04/1990"), "1990-03-04"); // ambiguous: month first
  assert.equal(normalizeDob("1990-02-31"), "");
  assert.equal(normalizeDob("someday"), "");
});

test("unreadable dates are reported and left empty", () => {
  const r = parseProfileText("Date of birth: someday\nName: Ana");
  assert.deepEqual(r.unreadable, ["date_of_birth"]);
  assert.equal(r.fields.date_of_birth, undefined);
  assert.equal(r.fields.full_name, "Ana");
});

test("junk, empty files, BOM and Windows line endings are safe", () => {
  assert.deepEqual(parseProfileText("").fields, {});
  assert.deepEqual(parseProfileText("hello\nworld").fields, {});
  assert.equal(parseProfileText("\uFEFFName: Ana\r\nPhone: 0917\r\n").fields.phone, "0917");
});

test("values are length-limited and never executable", () => {
  const r = parseProfileText(`Name: ${"x".repeat(500)}\nAddress: <script>alert(1)</script>`);
  assert.equal(r.fields.full_name!.length, 120);
  assert.equal(r.fields.address, "<script>alert(1)</script>"); // inserted as plain text into an input, never as HTML
});

test("template contains the requested labels and round-trips", () => {
  const t = buildTemplate(["full_name", "date_of_birth", "allergies"]);
  assert.ok(t.includes("Full name: ") && t.includes("Allergies: "));
  assert.deepEqual(parseProfileText(t).fields, {});
  const filled = t.replace("Full name: ", "Full name: Ana Reyes");
  assert.equal(parseProfileText(filled).fields.full_name, "Ana Reyes");
});
