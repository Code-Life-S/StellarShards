const Music = {
  ctx: null,
  enabled: false,
  muted: false,
  tempo: 70,
  gain: null,
  gainVolume: 0.20,
  scheduledTime: 0,
  timerID: null,
  loopDuration: 0,

  NOTES: {
    'C3': 130.81, 'Eb3': 155.56, 'F3': 174.61, 'G3': 196.00, 'Bb3': 233.08,
    'C4': 261.63, 'Eb4': 311.13, 'F4': 349.23, 'G4': 392.00, 'Bb4': 466.16,
    'C5': 523.25, 'Eb5': 622.25, 'F5': 698.46, 'G5': 783.99, 'Bb5': 932.33,
    'C6': 1046.50
  },

  melody: [
    {note: 'C5', dur: 0.25}, {note: 'G4', dur: 0.25}, {note: 'F5', dur: 0.25}, {note: 'Eb5', dur: 0.25},
    {note: 'G5', dur: 0.25}, {note: 'Eb5', dur: 0.25}, {note: 'C5', dur: 0.25}, {note: 'Bb4', dur: 0.25},
    {note: 'C5', dur: 0.25}, {note: 'G4', dur: 0.25}, {note: 'Eb5', dur: 0.25}, {note: 'F5', dur: 0.25},
    {note: 'G5', dur: 0.25}, {note: 'F5', dur: 0.25}, {note: 'Eb5', dur: 0.25}, {note: 'C5', dur: 0.25},
    {note: 'C5', dur: 0.25}, {note: 'Bb4', dur: 0.25}, {note: 'C5', dur: 0.25}, {note: 'G4', dur: 0.25},
    {note: 'F5', dur: 0.25}, {note: 'Eb5', dur: 0.25}, {note: 'F5', dur: 0.25}, {note: 'G5', dur: 0.25},
    {note: 'C5', dur: 0.25}, {note: 'Eb5', dur: 0.25}, {note: 'F5', dur: 0.25}, {note: 'Eb5', dur: 0.25},
    {note: 'C5', dur: 0.25}, {note: 'G4', dur: 0.25}, {note: 'Eb4', dur: 0.25}, {note: 'C4', dur: 0.25}
  ],

  bass: [
    {note: 'C3', dur: 1}, {note: 'G3', dur: 1},
    {note: 'Eb3', dur: 1}, {note: 'F3', dur: 1},
    {note: 'G3', dur: 1}, {note: 'Eb3', dur: 1},
    {note: 'F3', dur: 1}, {note: 'C3', dur: 1}
  ],

  start(ac) {
    if (!ac) return;
    this.ctx = ac;
    this.enabled = true;
    this.tempo = 70;
    this.gain = this.ctx.createGain();
    const vol = this.muted ? 0.001 : this.gainVolume;
    this.gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    this.gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.5);
    this.gain.connect(this.ctx.destination);
    this.scheduledTime = this.ctx.currentTime + 0.05;
    this.scheduleLoop();
  },

  stop() {
    this.enabled = false;
    if (this.timerID) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
    if (this.ctx && this.gain) {
      try {
        this.gain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.gain.gain.setValueAtTime(this.gain.gain.value || 0.20, this.ctx.currentTime);
        this.gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
        this.gain.disconnect();
      } catch (_) {}
      this.gain = null;
    }
  },

  setTempo(bpm) {
    this.tempo = Math.max(85, Math.min(105, bpm));
  },

  // Toutes les notes passent par this.gain : couper ce gain coupe la musique
  // sans interrompre la boucle ni rien reprogrammer.
  _rampGain(target, ms) {
    if (!this.ctx || !this.gain) return;
    try {
      const now = this.ctx.currentTime;
      this.gain.gain.cancelScheduledValues(now);
      this.gain.gain.setValueAtTime(this.gain.gain.value || target, now);
      this.gain.gain.linearRampToValueAtTime(target, now + ms);
    } catch (_) {}
  },

  mute() {
    this.muted = true;
    this._rampGain(0.001, 0.2);
  },

  unmute() {
    this.muted = false;
    this._rampGain(this.gainVolume, 0.2);
  },

  pause() {
    if (this.timerID) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
  },

  resume() {
    if (this.enabled && this.ctx) {
      this.scheduledTime = this.ctx.currentTime + 0.05;
      this.scheduleLoop();
    }
  },

  scheduleLoop() {
    if (!this.enabled) return;

    const beatDur = 60 / this.tempo;
    let t = this.scheduledTime;

    for (const m of this.melody) {
      this.playNote(t, this.NOTES[m.note], m.dur * beatDur, 'square', 0.025);
      t += m.dur * beatDur;
    }

    let bt = this.scheduledTime;
    for (const b of this.bass) {
      this.playNote(bt, this.NOTES[b.note], b.dur * beatDur, 'triangle', 0.04);
      bt += b.dur * beatDur;
    }

    const percInterval = 0.5 * beatDur;
    let pt = this.scheduledTime;
    while (pt < t - 0.01) {
      this.playNoise(pt, 0.03, 0.015);
      pt += percInterval;
    }

    this.scheduledTime = t;
    const waitMs = Math.max(50, (t - this.ctx.currentTime) * 1000 - 80);
    this.timerID = setTimeout(() => this.scheduleLoop(), waitMs);
  },

  playNote(time, freq, dur, type, vol) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);
      noteGain.gain.setValueAtTime(0, time);
      noteGain.gain.linearRampToValueAtTime(vol, time + 0.004);
      noteGain.gain.setValueAtTime(vol, time + dur * 0.7);
      noteGain.gain.exponentialRampToValueAtTime(0.001, time + dur);
      osc.connect(noteGain);
      noteGain.connect(this.gain);
      osc.start(time);
      osc.stop(time + dur + 0.01);
    } catch (_) {}
  },

  playNoise(time, dur, vol) {
    if (!this.ctx) return;
    try {
      const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(vol, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + dur);
      source.connect(noiseGain);
      noiseGain.connect(this.gain);
      source.start(time);
      source.stop(time + dur + 0.01);
    } catch (_) {}
  }
};
