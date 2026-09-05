import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BATHYMETRIC_DEPTH_PATH,
  BATHYMETRIC_TRACE_PATH,
  BATHYMETRIC_VIA_RADIUS,
  BATHYMETRIC_VIAS,
  BATHYMETRIC_VIEWBOX,
} from "./bathymetric-pcb.ts";

test("bathymetric board is a 1200x32 strip with four vias", () => {
  assert.equal(BATHYMETRIC_VIEWBOX, "0 0 1200 32");
  assert.equal(BATHYMETRIC_VIAS.length, 4);
  assert.equal(BATHYMETRIC_VIA_RADIUS, 2.5);
});

test("vias sit on the PCB trace kinks", () => {
  for (const via of BATHYMETRIC_VIAS) {
    assert.match(
      BATHYMETRIC_TRACE_PATH,
      new RegExp(`L${via.cx} ${via.cy}`),
    );
  }
});

test("depth contour and trace span the full board", () => {
  assert.match(BATHYMETRIC_DEPTH_PATH, /^M0 /);
  assert.match(BATHYMETRIC_DEPTH_PATH, /L1200 /);
  assert.match(BATHYMETRIC_TRACE_PATH, /^M0 /);
  assert.match(BATHYMETRIC_TRACE_PATH, /L1200 /);
});
