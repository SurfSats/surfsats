import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalUrl, pageMeta } from "./seo.ts";

test("canonical is www, never apex", () => {
  assert.equal(canonicalUrl("/tab"), "https://www.surfsats.com/tab");
  assert.equal(canonicalUrl("/"), "https://www.surfsats.com/");
  const meta = pageMeta({
    title: "THE TAB",
    description: "21 sats. One sitting. No KYC.",
    path: "/tab",
  });
  assert.equal(meta.alternates?.canonical, "https://www.surfsats.com/tab");
  assert.equal(meta.openGraph?.url, "https://www.surfsats.com/tab");
  assert.equal(
    String(meta.openGraph?.url).startsWith("https://surfsats.com"),
    false,
  );
});

test("document and OG titles follow {Page} · SurfSats", () => {
  const meta = pageMeta({
    title: "THE TAB",
    description: "21 sats. One sitting.",
    path: "/tab",
  });
  assert.equal(meta.title, "THE TAB");
  assert.equal(meta.openGraph?.title, "THE TAB · SurfSats");
  assert.equal(meta.twitter?.title, "THE TAB · SurfSats");
  assert.equal(meta.twitter?.card, "summary_large_image");
});

test("article OG description is the excerpt, not the homepage slogan", () => {
  const excerpt =
    "Fiat is a mind virus. Bitcoin is the Doom Destroyer. A raw dispatch on Cantillonaires.";
  const meta = pageMeta({
    title: "ITS ALWAYS DARKEST BEFORE DAWN STRIKES",
    description: excerpt,
    path: "/articles/its-always-darkest-before-dawn-strikes",
    type: "article",
  });
  assert.equal(meta.description, excerpt);
  assert.equal(meta.openGraph?.description, excerpt);
  assert.equal(meta.twitter?.description, excerpt);
  assert.notEqual(
    meta.openGraph?.description,
    "No banks. No bosses. No closed beach signs.",
  );
});

test("home can use an absolute title and a real description", () => {
  const meta = pageMeta({
    title: "SurfSats · no banks, no bosses",
    description: "Lightning sandbox. Five machines on the floor. 21 sats. No accounts.",
    path: "/",
    absoluteTitle: true,
  });
  assert.deepEqual(meta.title, { absolute: "SurfSats · no banks, no bosses" });
  assert.equal(meta.openGraph?.title, "SurfSats · no banks, no bosses");
  assert.equal(meta.alternates?.canonical, "https://www.surfsats.com/");
  assert.ok((meta.description ?? "").length > 0);
});
