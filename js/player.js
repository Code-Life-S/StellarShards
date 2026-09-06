// Niveaux de départ de chaque augment pour tester (0-5). 0 = non possédé.
const DEBUG_START_AUGMENTS = {
  RAPID: 0,
  SPREAD: 3,
  PIERCING: 0,
  HEAVY: 0,
  ZIGZAG: 0,
  SPLIT: 5,
  SHOCK: 5,
  PELLET: 5
};

const Player = {
  x: 400,
  y: 550,
  radius: 18,
  trail: [],
  augments: [],
  lastShot: 0,

  init(canvasWidth, canvasHeight) {
    this.x = canvasWidth / 2;
    this.y = canvasHeight - 50;
    this.trail = [];
    this.augments = Object.keys(DEBUG_START_AUGMENTS)
      .filter(type => DEBUG_START_AUGMENTS[type] > 0)
      .map(type => ({ type, level: DEBUG_START_AUGMENTS[type] }));
    this.lastShot = 0;
  },

  resetAugments() {
    this.augments = [];
    this.lastShot = 0;
  },

  update(playLeft, playRight, playTop, playBottom) {
    if (Input.isLeft()) {
      this.x -= CONFIG.playerSpeed;
    }
    if (Input.isRight()) {
      this.x += CONFIG.playerSpeed;
    }
    if (Input.isUp()) {
      this.y -= CONFIG.playerSpeed;
    }
    if (Input.isDown()) {
      this.y += CONFIG.playerSpeed;
    }

    this.x = Math.max(playLeft + this.radius, Math.min(playRight - this.radius, this.x));
    this.y = Math.max(playTop + this.radius, Math.min(playBottom - this.radius, this.y));

    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > 12) {
      this.trail.pop();
    }
  },

  hasAugment(type) {
    return this.augments.some(a => a.type === type);
  },

  getAugment(type) {
    return this.augments.find(a => a.type === type);
  },

  addAugment(type) {
    if (this.hasAugment(type)) {
      const a = this.getAugment(type);
      if (a.level < 5) a.level++;
    } else {
      this.augments.push({ type, level: 1 });
    }
  },

  canShoot(timestamp) {
    const cfg = buildMissileConfig(this.augments);
    return timestamp - this.lastShot >= cfg.fireRate;
  },

  fire(timestamp) {
    const cfg = buildMissileConfig(this.augments);
    this.lastShot = timestamp;

    const missiles = [];
    const angleStep = cfg.spread > 0 ? (cfg.spread * Math.PI / 180) : 0;
    const startAngle = cfg.count > 1 ? -(cfg.count - 1) * angleStep / 2 : 0;

    for (let i = 0; i < cfg.count; i++) {
      const angle = startAngle + i * angleStep;
      const vx = Math.sin(angle) * cfg.speed;
      const vy = -Math.cos(angle) * cfg.speed;
      const m = new Missile(this.x, this.y - this.radius, vx, vy, cfg);
      missiles.push(m);
    }

    Audio.shoot();
    return missiles;
  },

  draw(ctx) {
    for (let i = 0; i < this.trail.length; i++) {
      const t = 1 - i / this.trail.length;
      const alpha = t * 0.25;
      const r = this.radius * (0.3 + t * 0.7);
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
      this.x - 5, this.y - 5, 2,
      this.x, this.y, this.radius
    );
    gradient.addColorStop(0, '#88ddff');
    gradient.addColorStop(1, '#44aadd');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = '#b3eeff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
};
