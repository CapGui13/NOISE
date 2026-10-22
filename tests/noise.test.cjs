'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(code, 'NOISE must contain an inline script');

function simulator(options = {}) {
  const data = {
    elements: {}, timers: new Map(), events: {}, time: 0,
    contexts: 0, streams: 0, stops: 0, oscillators: 0, pending: [],
    storage: options.storedThreshold === undefined ? {} : { noise_threshold: String(options.storedThreshold) }
  };
  let hidden = false, frame = null, timerId = 0;
  const canvas = { clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, setLineDash() {} };
  const initial = { threshold: '55', delay: '4', cooldown: '60', volume: '80', sound: 'loud' };
  const minimums = { threshold: '10', delay: '2', cooldown: '15', volume: '10' };
  const maximums = { threshold: '95', delay: '15', cooldown: '300', volume: '100' };
  const document = {
    get hidden() { return hidden; },
    addEventListener(name, cb) { data.events[name] = cb; },
    getElementById(id) {
      if (!data.elements[id]) {
        data.elements[id] = {
          value: initial[id] || '', min: minimums[id] || '0', max: maximums[id] || '100',
          disabled: ['stop', 'calibrate', 'capture'].includes(id), textContent: '',
          className: '', style: {}, width: 600, height: 144, listeners: {},
          addEventListener(name, cb) { this.listeners[name] = cb; },
          getContext() { return canvas; }
        };
      }
      return data.elements[id];
    }
  };
  function AudioContext() {
    data.contexts++;
    let audioState = 'running';
    return {
      get state() { return audioState; },
      get currentTime() { return data.time / 1000; },
      destination: {},
      resume() { audioState = 'running'; return Promise.resolve(); },
      close() { audioState = 'closed'; return Promise.resolve(); },
      createMediaStreamSource() { return { connect() {}, disconnect() {} }; },
      createAnalyser() {
        return { fftSize: 2048, connect() {}, disconnect() {},
          getFloatTimeDomainData(arr) { arr.fill(options.rms ?? 0.4); } };
      },
      createOscillator() {
        if (options.failSound) throw Error('Output device unavailable');
        return { frequency: { setValueAtTime() {} }, connect() {},
          start() { data.oscillators++; }, stop() {} };
      },
      createGain() {
        return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
      }
    };
  }
  function makeStream() {
    data.streams++;
    let live = true;
    const track = { onended: null, stop() { if (live) data.stops++; live = false; } };
    return { get active() { return live; }, getTracks() { return [track]; }, getAudioTracks() { return [track]; } };
  }
  const navigator = {
    mediaDevices: {
      getUserMedia() {
        if (options.pendingMicro) return new Promise(resolve => data.pending.push(resolve));
        return Promise.resolve(makeStream());
      }
    }
  };
  const window = { AudioContext, isSecureContext: true, addEventListener() {} };
  new Function(
    'document', 'window', 'navigator', 'localStorage',
    'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout', 'clearTimeout', code
  )(
    document, window, navigator,
    { getItem(key) { return data.storage[key] ?? null; },
      setItem(key, value) { data.storage[key] = String(value); } },
    cb => { frame = cb; return 1; },
    () => { frame = null; },
    { now() { return data.time; } },
    (fn, ms) => { const id = ++timerId; data.timers.set(id, { fn, ms }); return id; },
    id => data.timers.delete(id)
  );
  data.element = id => data.elements[id];
  data.click = id => data.elements[id].listeners.click();
  data.frame = ms => { data.time = ms; if (frame) frame(ms); };
  data.hide = () => { hidden = true; data.events.visibilitychange(); };
  data.makeStream = makeStream;
  data.fireTimeouts = duration => {
    for (const [id, timer] of [...data.timers]) {
      if (timer.ms <= duration) { data.timers.delete(id); timer.fn(); }
    }
  };
  return data;
}

test('50 successive start/stop cycles reuse one context and release every microphone', async () => {
  const app = simulator();
  for (let i = 0; i < 50; i++) {
    await app.click('start');
    assert.equal(app.element('micLabel').textContent, '● Micro actif');
    app.click('stop');
    assert.equal(app.element('micLabel').textContent, 'Micro inactif');
  }
  assert.equal(app.contexts, 1);
  assert.equal(app.streams, app.stops);
});

test('test sound can be cancelled even while microphone permission is pending', async () => {
  const app = simulator({ pendingMicro: true });
  const running = app.click('test');
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  assert.equal(app.element('stop').disabled, false);
  app.click('stop');
  await running;
  const late = app.makeStream();
  app.pending.shift()(late);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(app.streams, app.stops);
  assert.equal(app.element('start').disabled, false);
});

test('cancelled startup cannot resurrect an old microphone stream', async () => {
  const app = simulator({ pendingMicro: true });
  const starting = app.click('start');
  await Promise.resolve(); await Promise.resolve();
  app.click('stop');
  app.pending.shift()(app.makeStream());
  await starting;
  assert.equal(app.element('micLabel').textContent, 'Micro inactif');
  assert.equal(app.streams, app.stops);
});

test('hiding Safari cancels an unfinished audio test', async () => {
  const app = simulator({ pendingMicro: true });
  const running = app.click('test');
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  app.hide();
  await running;
  assert.equal(app.element('start').disabled, false);
  assert.equal(app.element('state').textContent, 'Surveillance interrompue');
});

test('a microphone permission request times out without blocking the interface', async () => {
  const app = simulator({ pendingMicro: true });
  const running = app.click('test');
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  app.fireTimeouts(15000);
  await running;
  assert.equal(app.element('start').disabled, false);
  assert.equal(app.element('test').disabled, false);
  assert.equal(app.element('stop').disabled, true);
});

test('failure to generate sound does not falsely increment alert count', async () => {
  const app = simulator({ failSound: true });
  await app.click('start');
  app.element('threshold').value = '10';
  app.element('delay').value = '2';
  for (let step = 1; step < 70; step++) app.frame(step * 160);
  assert.equal(app.element('count').textContent, '0');
});

test('saved thresholds migrate to the new relative scale without erasing preferences', () => {
  const app = simulator({ storedThreshold: 55 });
  assert.equal(Number(app.element('threshold').value), 67);
  assert.equal(app.storage.noise_scale, 'rms75');
  assert.equal(app.element('sound').value, 'loud');
});
