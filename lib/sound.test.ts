import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MECHANICAL_LATCH,
  playMechanicalLatch,
  scheduleMechanicalLatch,
  type LatchAudioContext,
} from "./sound.ts";

test("mechanical latch is a 40ms square snap from 140Hz to 30Hz", () => {
  assert.equal(MECHANICAL_LATCH.durationSec, 0.04);
  assert.equal(MECHANICAL_LATCH.startHz, 140);
  assert.equal(MECHANICAL_LATCH.endHz, 30);
  assert.equal(MECHANICAL_LATCH.startGain, 0.7);
  assert.equal(MECHANICAL_LATCH.endGain, 0.01);
  assert.equal(MECHANICAL_LATCH.type, "square");
});

test("scheduleMechanicalLatch ramps frequency and gain over 40ms", () => {
  const freq: Array<[number, number]> = [];
  const gain: Array<[number, number]> = [];
  let oscType = "";
  let started = false;
  let stopAt = -1;
  let connectedToGain = false;
  let connectedToDest = false;

  const ctx: LatchAudioContext = {
    currentTime: 10,
    destination: { kind: "dest" },
    createOscillator() {
      return {
        type: "sine",
        frequency: {
          setValueAtTime(value, time) {
            freq.push([value, time]);
          },
          exponentialRampToValueAtTime(value, time) {
            freq.push([value, time]);
          },
        },
        connect() {
          connectedToGain = true;
        },
        start() {
          started = true;
        },
        stop(when) {
          stopAt = when ?? -1;
        },
      };
    },
    createGain() {
      return {
        gain: {
          setValueAtTime(value, time) {
            gain.push([value, time]);
          },
          exponentialRampToValueAtTime(value, time) {
            gain.push([value, time]);
          },
        },
        connect() {
          connectedToDest = true;
        },
      };
    },
  };

  const osc = scheduleMechanicalLatch({ ctx });
  oscType = osc.type;

  assert.equal(oscType, "square");
  assert.equal(started, true);
  assert.equal(stopAt, 10.04);
  assert.equal(connectedToGain, true);
  assert.equal(connectedToDest, true);
  assert.deepEqual(freq, [
    [140, 10],
    [30, 10.04],
  ]);
  assert.deepEqual(gain, [
    [0.7, 10],
    [0.01, 10.04],
  ]);
});

test("playMechanicalLatch is a no-op without a window", () => {
  assert.equal(typeof window, "undefined");
  playMechanicalLatch();
});
