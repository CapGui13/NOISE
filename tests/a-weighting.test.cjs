'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const worklet = fs.readFileSync(path.join(__dirname, '..', 'a-weighting-worklet.js'), 'utf8');
function meter(fs = 48000) {
  class FakeAudioWorkletProcessor {
    constructor() {
      this.port = { messages: [], onmessage: null, postMessage(message) { this.messages.push(message); } };
    }
  }
  let Class = null;
  new Function('AudioWorkletProcessor', 'sampleRate', 'registerProcessor', worklet)(
    FakeAudioWorkletProcessor, fs, (name, Processor) => {
      assert.equal(name, 'noise-a-meter-v5');
      Class = Processor;
    }
  );
  assert.ok(Class);
  return new Class();
}
function processSine(instance, fs, frequency, seconds, amplitude = 0.1) {
  const blocks = Math.ceil(fs * seconds / 128);
  const output = [new Float32Array(128)];
  for (let block = 0; block < blocks; block++) {
    const wave = new Float32Array(128);
    for (let i = 0; i < wave.length; i++) {
      const sample = block * 128 + i;
      wave[i] = amplitude * Math.sin((2 * Math.PI * frequency * sample) / fs);
    }
    assert.equal(instance.process([[wave]], [output]), true);
    assert.ok(output[0].every(v => v === 0), 'silent processing must never feed the mic back to speakers');
  }
}
function levelAt(fs, freq) {
  const m = meter(fs);
  processSine(m, fs, freq, 0.6);
  const values = m.port.messages.filter(p => p.type === 'level').map(p => p.dbfsA);
  return values[values.length - 1];
}

test('A-weighting filter matches reference curve near key bands (44.1 and 48 kHz)', () => {
  for (const fs of [44100, 48000]) {
    const unity = levelAt(fs, 1000);
    assert.ok(Math.abs(unity - (-23.0103)) < 0.16, `1 kHz normalization failed at ${fs}: ${unity}`);
    const bands = [
      [125, -16.2], [250, -8.67], [500, -3.25], [2000, 1.20],
      [4000, 0.95], [8000, -1.6]
    ];
    for (const [freq, expected] of bands) {
      const value = levelAt(fs, freq) - unity;
      assert.ok(Math.abs(value - expected) < 0.45, `${freq} Hz at ${fs}: ${value} instead of ${expected}`);
    }
  }
});

test('20-second A-weighted measurement integrates continuous samples, not sparse analyser snapshots', () => {
  const fs = 48000, m = meter(fs);
  m.port.onmessage({ data: { type: 'beginMeasurement', id: 13 } });
  processSine(m, fs, 1000, 20);
  const rows = m.port.messages.filter(p => p.type === 'measurement');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 13);
  assert.equal(rows[0].seconds, 20);
  assert.ok(Math.abs(rows[0].dbfsA - (-23.01)) < 0.1);
  assert.ok(m.port.messages.every(p => !('audio' in p) && !('samples' in p)));
});

test('an interrupted reference measurement cannot be stored by the worklet', () => {
  const fs = 44100, m = meter(fs);
  m.port.onmessage({ data: { type: 'beginMeasurement', id: 8 } });
  processSine(m, fs, 1000, 3);
  m.port.onmessage({ data: { type: 'cancelMeasurement' } });
  processSine(m, fs, 1000, 21);
  assert.equal(m.port.messages.filter(p => p.type === 'measurement').length, 0);
});

test('processor tolerates disconnected microphone input while keeping its silent output', () => {
  const m = meter(48000);
  assert.equal(m.process([], [[new Float32Array(128)]]), true);
  assert.equal(m.port.messages[0].type, 'ready');
  assert.equal(m.port.messages[0].sampleRate, 48000);
});
