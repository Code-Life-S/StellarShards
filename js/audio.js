const Audio = {
  ctx: null,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) {}
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  _tone(freq, duration, type, volume) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume || 0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  },

  _noise(duration, volume) {
    if (!this.ctx) return;
    const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.04, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
    source.stop(this.ctx.currentTime + duration + 0.01);
  },

  star()     { this._tone(880, 0.08, 'square'); },
  diamond()  { this._tone(1100, 0.06, 'sine', 0.1); setTimeout(() => Audio._tone(1400, 0.08, 'sine', 0.1), 70); },
  shield()   { this._tone(660, 0.1, 'sine', 0.06); setTimeout(() => Audio._tone(880, 0.1, 'sine', 0.06), 100); setTimeout(() => Audio._tone(1100, 0.12, 'sine', 0.06), 200); },
  skull()    { this._tone(200, 0.15, 'sawtooth', 0.05); },
  bomb()     { this._tone(100, 0.3, 'sawtooth', 0.08); setTimeout(() => Audio._tone(80, 0.4, 'sawtooth', 0.06), 150); },
  gameover() { this._tone(400, 0.15, 'square', 0.06); setTimeout(() => Audio._tone(300, 0.15, 'square', 0.06), 150); setTimeout(() => Audio._tone(200, 0.3, 'square', 0.06), 300); },
  die()      { this._tone(300, 0.1, 'sawtooth', 0.05); setTimeout(() => Audio._tone(200, 0.15, 'sawtooth', 0.05), 100); },
  shoot()    { this._tone(600, 0.05, 'square', 0.04); },
  spread()   { this._tone(500, 0.04, 'square', 0.03); setTimeout(() => Audio._tone(700, 0.03, 'sine', 0.03), 30); },
  rapid()    { this._tone(800, 0.03, 'square', 0.02); },
  heavy()    { this._tone(200, 0.1, 'sawtooth', 0.06); this._noise(0.08, 0.03); },
  piercing() { this._tone(1000, 0.06, 'sine', 0.04); },
  explosion() { this._noise(0.15, 0.06); this._tone(80, 0.2, 'sawtooth', 0.05); },
  powerup()  { this._tone(660, 0.08, 'sine', 0.06); setTimeout(() => Audio._tone(880, 0.08, 'sine', 0.06), 80); setTimeout(() => Audio._tone(1100, 0.1, 'sine', 0.06), 160); },
  levelComplete() { this._tone(523, 0.1, 'sine', 0.06); setTimeout(() => Audio._tone(659, 0.1, 'sine', 0.06), 120); setTimeout(() => Audio._tone(784, 0.15, 'sine', 0.06), 240); },
  shopBuy()  { this._tone(440, 0.08, 'sine', 0.05); setTimeout(() => Audio._tone(660, 0.12, 'sine', 0.05), 100); },
  asteroid() { this._tone(150, 0.2, 'sawtooth', 0.03); },
  shieldBreak() { this._tone(400, 0.06, 'sine', 0.06); setTimeout(() => Audio._tone(300, 0.06, 'square', 0.05), 60); setTimeout(() => Audio._noise(0.12, 0.04), 120); }
};
