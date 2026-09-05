import assert from "node:assert/strict";
import { test } from "node:test";
import { cn } from "./cn.ts";

test("cn joins truthy class names and drops empties", () => {
  assert.equal(cn("btn", false, "mt-2", null, undefined), "btn mt-2");
});

test("cn last conflicting tailwind utility wins", () => {
  assert.equal(cn("p-2", "p-4"), "p-4");
  assert.equal(cn("text-red-500", "text-cyan-400"), "text-cyan-400");
});

test("cn keeps custom classes while merging utilities", () => {
  assert.equal(cn("btn", "px-2", "px-4"), "btn px-4");
});

test("cn accepts nested arrays and objects", () => {
  assert.equal(cn(["btn", { hidden: true, ghost: false }]), "btn hidden");
});
