import assert from "node:assert/strict";
import { test } from "node:test";
import { formatAge, formatDate } from "./format.ts";

const NOW = Date.parse("2026-09-03T16:00:00Z");

test("formatAge uses minutes, hours, then days", () => {
  assert.equal(formatAge("2026-09-03T15:48:00Z", NOW), "12m");
  assert.equal(formatAge("2026-09-03T13:00:00Z", NOW), "3h");
  assert.equal(formatAge("2026-09-01T16:00:00Z", NOW), "2d");
});

test("formatAge falls back to calendar after a week", () => {
  assert.equal(formatAge("2026-08-01", NOW), formatDate("2026-08-01"));
});

test("formatAge keeps junk dates readable", () => {
  assert.equal(formatAge("soon", NOW), "soon");
});
