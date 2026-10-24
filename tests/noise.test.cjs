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
    storage: Object.assign(
      options.storedThreshold === undefined ? {} : { noise_threshold: String(options.storedThreshold) },
      options.showEstimatedDb === undefined ? {} : { noise_showEstimatedDb: String(options.showEstimatedDb) }
    )
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
    clipboard: { writeText(value) { data.copiedText = value; return Promise.resolve(); } },
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

test('20-second reference measurement averages energy and pauses noise alerts', async () => {
  const app = simulator({ rms: 0.4 });
  await app.click('start');
  app.element('threshold').value = '10';
  app.element('delay').value = '2';
  assert.equal(app.element('measureStart').disabled, false);
  app.click('measureStart');
  assert.equal(app.element('test').disabled, true);
  assert.equal(app.element('calibrate').disabled, true);
  for (let step = 1; step <= 145; step++) app.frame(step * 140);
  assert.equal(app.element('measureCancel').disabled, true);
  assert.equal(app.element('measureStart').disabled, false);
  assert.equal(app.element('measureProgress').style.width, '100%');
  assert.ok(Math.abs(Number(app.element('measureValue').textContent) - 89.4) < 0.15);
  assert.equal(app.element('count').textContent, '0', 'alarms must remain muted during the measurement');
  app.element('nioshValue').value = '73';
  app.click('saveReference');
  const rows = JSON.parse(app.storage.noise_referenceRows);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].niosh, 73);
  assert.equal(rows[0].noise, 89.4);
  assert.match(app.element('measureEstimate').textContent, /110 dB\(A\) estimés/);
  assert.match(app.element('measureEstimate').textContent, /hors plage/);
  assert.match(app.element('referenceHistory').textContent, /NIOSH 73\.0 dB\(A\)/);
  assert.equal(app.element('threshold').value, '10', 'measurement must not change alarm threshold');
  app.click('stop');
  assert.equal(app.streams, app.stops);
});

test('cancelling a partial measurement never stores a partial reference value', async () => {
  const app = simulator();
  await app.click('start');
  app.click('measureStart');
  for (let step = 1; step <= 25; step++) app.frame(step * 140);
  app.click('measureCancel');
  assert.equal(app.element('measureValue').textContent, '—');
  assert.equal(app.element('saveReference').disabled, true);
  assert.equal(app.element('measureStart').disabled, false);
  assert.equal(app.storage.noise_referenceRows, undefined);
  app.click('stop');
});

test('stopping monitoring midway through measurement safely resets measurement controls', async () => {
  const app = simulator();
  await app.click('start');
  app.click('measureStart');
  app.frame(1000);
  app.click('stop');
  assert.equal(app.element('measureCancel').disabled, true);
  assert.equal(app.element('measureStart').disabled, true);
  assert.equal(app.element('saveReference').disabled, true);
  assert.equal(app.streams, app.stops);
  await app.click('start');
  assert.equal(app.element('measureStart').disabled, false);
  app.click('stop');
});

test('invalid NIOSH value does not create a saved reference', async () => {
  const app = simulator();
  await app.click('start');
  app.click('measureStart');
  for (let step = 1; step <= 145; step++) app.frame(step * 140);
  app.element('nioshValue').value = '200';
  app.click('saveReference');
  assert.equal(app.storage.noise_referenceRows, undefined);
  assert.match(app.element('measureStatus').textContent, /valide/);
  app.click('stop');
});

test('stored reference rows can be erased without changing the alarm settings', async () => {
  const app = simulator();
  await app.click('start');
  app.element('threshold').value = '63';
  app.click('measureStart');
  for (let step = 1; step <= 145; step++) app.frame(step * 140);
  app.element('nioshValue').value = '66.5';
  app.click('saveReference');
  assert.equal(JSON.parse(app.storage.noise_referenceRows).length, 1);
  app.click('clearReferences');
  assert.equal(JSON.parse(app.storage.noise_referenceRows).length, 0);
  assert.equal(app.element('threshold').value, '63');
  app.click('stop');
});


test('saved paired readings can be copied with one tap', async () => {
  const app = simulator({ rms: 0.4 });
  await app.click('start');
  app.click('measureStart');
  for (let step = 1; step <= 145; step++) app.frame(step * 140);
  app.element('nioshValue').value = '79';
  app.click('saveReference');
  assert.equal(app.element('copyReferences').disabled, false);
  app.click('copyReferences');
  await Promise.resolve();
  assert.match(app.copiedText, /NIOSH 79\.0 dB\(A\)/);
  assert.match(app.copiedText, /NOISE 89\.4\/100/);
  app.click('clearReferences');
  assert.equal(app.element('copyReferences').disabled, true);
  app.click('stop');
});

test('experimental dB(A) display is optional, persistent and independent of alert threshold', async () => {
  // RMS -> relative NOISE index near 50 once the live smoothing has settled.
  const rms = 10 ** ((50 * 0.75 - 75) / 20);
  const app = simulator({ rms });
  assert.equal(app.element('showEstimatedDb').checked, true);
  assert.equal(app.element('estimatedPanel').hidden, false);
  assert.equal(app.element('estimatedDb').textContent, '—');
  await app.click('start');
  const oldThreshold = app.element('threshold').value;
  for (let step = 1; step <= 70; step++) app.frame(step * 140);
  assert.equal(app.element('level').textContent, 50);
  assert.equal(app.element('estimatedDb').textContent, '73');
  assert.match(app.element('estimatedNote').textContent, /non certifiée/);
  assert.equal(app.element('threshold').value, oldThreshold);

  app.element('showEstimatedDb').checked = false;
  app.element('showEstimatedDb').listeners.change();
  assert.equal(app.element('estimatedPanel').hidden, true);
  assert.equal(app.storage.noise_showEstimatedDb, 'false');
  assert.equal(app.element('threshold').value, oldThreshold);

  app.element('showEstimatedDb').checked = true;
  app.element('showEstimatedDb').listeners.change();
  assert.equal(app.element('estimatedPanel').hidden, false);
  assert.equal(app.storage.noise_showEstimatedDb, 'true');

  app.click('stop');
  assert.equal(app.element('estimatedDb').textContent, '—');
  assert.equal(app.streams, app.stops);
});

test('saved choice to hide dB(A) estimate restores when app starts', () => {
  const app = simulator({ showEstimatedDb: false });
  assert.equal(app.element('showEstimatedDb').checked, false);
  assert.equal(app.element('estimatedPanel').hidden, true);
  assert.equal(app.element('threshold').value, '55');
});

test('estimate warns when the live noise index is outside tested calibration range', async () => {
  const app = simulator({ rms: 0.4 });
  await app.click('start');
  for (let step = 1; step <= 50; step++) app.frame(step * 140);
  assert.ok(Number(app.element('level').textContent) > 58.2);
  assert.match(app.element('estimatedNote').textContent, /extrapolation très incertaine/);
  app.click('stop');
});
