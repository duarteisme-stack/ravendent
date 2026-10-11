import { test } from "node:test";
import assert from "node:assert/strict";
import {
  safeNext, validateDob, validateEmail, validateMedical, validatePassword, validatePatientProfile, validatePhone, validateRegister,
} from "../src/lib/validation";

const form = (o: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(o)) fd.set(k, v);
  return fd;
};

test("email", () => {
  assert.equal(validateEmail("a@b.co"), null);
  assert.ok(validateEmail("nope"));
  assert.ok(validateEmail(""));
  assert.ok(validateEmail("a b@c.com"));
});

test("phone accepts PH formats, rejects junk", () => {
  assert.equal(validatePhone("0917 123 4567"), null);
  assert.equal(validatePhone("+63 917 123 4567"), null);
  assert.ok(validatePhone("abc"));
  assert.ok(validatePhone("123"));
  assert.ok(validatePhone(""));
  assert.equal(validatePhone("", false), null);
});

test("password policy", () => {
  assert.ok(validatePassword("short1"));
  assert.ok(validatePassword("alllettersnonumber"));
  assert.ok(validatePassword("12345678901"));
  assert.equal(validatePassword("raven-dental-42"), null);
});

test("dob", () => {
  const now = new Date("2026-10-11T00:00:00Z");
  assert.equal(validateDob("1990-05-17", now), null);
  assert.ok(validateDob("2027-01-01", now));
  assert.ok(validateDob("1990-02-31", now));
  assert.ok(validateDob("17/05/1990", now));
  assert.ok(validateDob("1850-01-01", now));
});

test("safeNext blocks open redirects", () => {
  assert.equal(safeNext("/book?service=1&start=2026"), "/book?service=1&start=2026");
  assert.equal(safeNext("https://evil.test"), "/dashboard");
  assert.equal(safeNext("//evil.test"), "/dashboard");
  assert.equal(safeNext("/\\evil.test"), "/dashboard");
  assert.equal(safeNext(null), "/dashboard");
  assert.equal(safeNext("javascript:alert(1)"), "/dashboard");
});

test("register requires terms, matching passwords, and normalizes phone/email", () => {
  const base = { full_name: "Ana Reyes", email: "ANA@Example.com", phone: "0917 123 4567", password: "raven-dental-42", confirm_password: "raven-dental-42", accept_terms: "on" };
  const ok = validateRegister(form(base));
  assert.deepEqual(ok.errors, {});
  assert.equal(ok.values.email, "ana@example.com");
  assert.equal(ok.values.phone, "09171234567");
  assert.ok(validateRegister(form({ ...base, accept_terms: "" })).errors.accept_terms);
  assert.ok(validateRegister(form({ ...base, confirm_password: "different-pw-1" })).errors.confirm_password);
  assert.ok(validateRegister(form({ ...base, full_name: "A" })).errors.full_name);
});

test("patient profile requires consent and emergency contact", () => {
  const base = { legal_name: "Ana Reyes", date_of_birth: "1990-05-17", phone: "09171234567", emergency_contact_name: "Ben Reyes", emergency_contact_phone: "09181234567", privacy_consent: "on" };
  assert.deepEqual(validatePatientProfile(form(base)).errors, {});
  assert.ok(validatePatientProfile(form({ ...base, privacy_consent: "" })).errors.privacy_consent);
  assert.ok(validatePatientProfile(form({ ...base, emergency_contact_name: "" })).errors.emergency_contact_name);
});

test("medical info requires explicit consent, caps length, allows empty answers", () => {
  assert.deepEqual(validateMedical(form({ health_consent: "on" })).errors, {});
  assert.ok(validateMedical(form({})).errors.health_consent);
  assert.ok(validateMedical(form({ health_consent: "on", allergies: "x".repeat(2001) })).errors.allergies);
});
