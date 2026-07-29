const Spawner = {
  spawnInterval: 1200,
  lastSpawn: 0,
  weights: { STAR: 45, DIAMOND: 15, SKULL: 30, INDESTRUCTIBLE: 0 },
  inPause: false,
  spawnPhaseEnd: 0,
  pausePhaseEnd: 0,
  nextIsPowerup: false,

  init() {
    this.spawnInterval = 1200;
    this.lastSpawn = 0;
    this.weights = { STAR: 45, DIAMOND: 15, SKULL: 30, INDESTRUCTIBLE: 0 };
    this.inPause = false;
    this.spawnPhaseEnd = 0;
    this.pausePhaseEnd = 0;
    this.nextIsPowerup = false;
  },

  update(timestamp, objects, playLeft, playRight, difficulty, level) {
    const cycleActive = level >= 2;

    if (cycleActive) {
      if (!this.inPause) {
        if (this.spawnPhaseEnd === 0) {
          this.spawnPhaseEnd = timestamp + 15000 + Math.random() * 10000;
        }
        if (timestamp > this.spawnPhaseEnd) {
          this.inPause = true;
          this.pausePhaseEnd = timestamp + 2000 + Math.random() * 1000;
          this.spawnPhaseEnd = 0;
          return;
        }
      } else {
        if (timestamp > this.pausePhaseEnd) {
          this.inPause = false;
          this.spawnPhaseEnd = timestamp + 15000 + Math.random() * 10000;
          this.pausePhaseEnd = 0;
        }
        return;
      }
    }

    this.spawnInterval = difficulty.spawnInterval;
    this.weights = { ...difficulty.weights };

    if (timestamp - this.lastSpawn > this.spawnInterval) {
      this.lastSpawn = timestamp;
      this.spawn(objects, playLeft, playRight, difficulty);
    }
  },

  spawn(objects, playLeft, playRight, difficulty) {
    const margin = 25;
    const x = playLeft + margin + Math.random() * (playRight - playLeft - margin * 2);
    let type;
    if (this.nextIsPowerup) {
      type = 'POWERUP';
      this.nextIsPowerup = false;
    } else {
      type = this.pickType();
    }
    const isFast = Math.random() < difficulty.fastChance;
    const speed = isFast ? difficulty.fastFallSpeed + Math.random() * 0.5 : difficulty.baseFallSpeed + Math.random() * 0.8;
    const obj = new FallingObject(x, type, speed, playLeft, playRight);
    objects.push(obj);
  },

  schedulePowerup() {
    this.nextIsPowerup = true;
  },

  pickType() {
    const total = Object.values(this.weights).reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (const [type, weight] of Object.entries(this.weights)) {
      if (weight <= 0) continue;
      r -= weight;
      if (r <= 0) return type;
    }
    return 'STAR';
  }
};
