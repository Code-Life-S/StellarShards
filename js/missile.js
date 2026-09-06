const DETONATE_MIN_MS = 200;
const DETONATE_MAX_MS = 1000;

const MISSILE_BASE = {
  speed: 8,
  damage: 1,
  fireRate: 400,
  count: 1,
  spread: 0,
  pierce: 0,
  explosionRadius: 0,
  zigzagAmp: 0,
  size: 4,
  color: '#64c8ff',
  splitCount: 0,
  splitSpread: 0,
  shockRadius: 0,
  shockDamage: 0,
  pelletCount: 0,
  pelletDamage: 1,
  pelletSpeed: 4,
  pelletRange: 120
};

const AUGMENTS = {
  RAPID:   { color: '#ef4444', levels: [0.85, 0.85, 0.85, 0.85, 0.85] },
  SPREAD:  { color: '#f59e0b', levels: [1, 2, 3, 4, 5] },
  PIERCING:{ color: '#34d399', levels: [1, 2, 3, 4, 5] },
  HEAVY:   { color: '#a78bfa', levels: [15, 22, 33, 49, 74] },
  ZIGZAG:  { color: '#22d3ee', levels: [8, 13, 18, 23, 28] },
  SPLIT: {
    color: '#fb7185',
    levels: [
      { count: 2, spread: 20 },
      { count: 3, spread: 22 },
      { count: 4, spread: 24 },
      { count: 5, spread: 26 },
      { count: 6, spread: 28 }
    ]
  },
  SHOCK: {
    color: '#facc15',
    levels: [
      { radius: 50, damage: 1 },
      { radius: 75, damage: 2 },
      { radius: 100, damage: 3 },
      { radius: 125, damage: 4 },
      { radius: 150, damage: 5 }
    ]
  },
  PELLET: {
    color: '#e879f9',
    levels: [
      { count: 4, damage: 1, speed: 4, range: 120 },
      { count: 6, damage: 1, speed: 5, range: 140 },
      { count: 8, damage: 2, speed: 6, range: 160 },
      { count: 10, damage: 2, speed: 7, range: 180 },
      { count: 12, damage: 3, speed: 8, range: 200 }
    ]
  }
};

function buildMissileConfig(augments) {
  const cfg = { ...MISSILE_BASE };
  for (const a of augments) {
    switch (a.type) {
      case 'RAPID':
        cfg.fireRate *= a.level > 0 ? Math.pow(0.85, a.level) : 1;
        break;
      case 'SPREAD':
        cfg.count = 1 + a.level;
        cfg.spread = a.level * 6;
        break;
      case 'PIERCING':
        cfg.pierce = a.level;
        break;
      case 'HEAVY':
        cfg.explosionRadius = AUGMENTS.HEAVY.levels[a.level - 1];
        break;
      case 'ZIGZAG':
        cfg.zigzagAmp = AUGMENTS.ZIGZAG.levels[a.level - 1];
        break;
      case 'SPLIT': {
        const lv = AUGMENTS.SPLIT.levels[a.level - 1];
        cfg.splitCount = lv.count;
        cfg.splitSpread = lv.spread;
        break;
      }
      case 'SHOCK': {
        const lv = AUGMENTS.SHOCK.levels[a.level - 1];
        cfg.shockRadius = lv.radius;
        cfg.shockDamage = lv.damage;
        break;
      }
      case 'PELLET': {
        const lv = AUGMENTS.PELLET.levels[a.level - 1];
        cfg.pelletCount = lv.count;
        cfg.pelletDamage = lv.damage;
        cfg.pelletSpeed = lv.speed;
        cfg.pelletRange = lv.range;
        break;
      }
    }
  }
  return cfg;
}

class Missile {
  constructor(x, y, vx, vy, config) {
    this.baseX = x;
    this.baseY = y;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.active = true;
    this.pierced = 0;
    this.damage = config.damage;
    this.pierce = config.pierce || 0;
    this.explosionRadius = config.explosionRadius || 0;
    this.size = config.size || 4;
    this.color = config.color || '#64c8ff';
    this.zigzagAmp = config.zigzagAmp || 0;
    this.splitCount = config.splitCount || 0;
    this.splitSpread = config.splitSpread || 0;
    this.shockRadius = config.shockRadius || 0;
    this.shockDamage = config.shockDamage || 0;
    this.pelletCount = config.pelletCount || 0;
    this.pelletDamage = config.pelletDamage || 1;
    this.pelletSpeed = config.pelletSpeed || 4;
    this.pelletRange = config.pelletRange || 120;
    this.speed = Math.sqrt(vx * vx + vy * vy);
    this.age = 0;
    this.traveled = 0;
    this.maxRange = 0;
    this.splitTimer = this.splitCount > 0 ? this.randomTimer() : 0;
    this.shockTimer = this.shockRadius > 0 ? this.randomTimer() : 0;
    this.pelletTimer = this.pelletCount > 0 ? this.randomTimer() : 0;
    this.splitFired = false;
    this.shockFired = false;
    this.pelletFired = false;
    this.readyToSplit = false;
    this.readyToShock = false;
    this.readyToPellet = false;
    this.wobbleOffset = Math.random() * Math.PI * 2;
  }

  randomTimer() {
    return DETONATE_MIN_MS + Math.random() * (DETONATE_MAX_MS - DETONATE_MIN_MS);
  }

  update(dt) {
    this.baseX += this.vx;
    this.baseY += this.vy;
    this.x = this.baseX;
    this.y = this.baseY;
    this.traveled += this.speed;

    if (this.zigzagAmp > 0) {
      this.wobbleOffset += 0.15;
      const len = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (len > 0.01) {
        const px = -this.vy / len;
        const py = this.vx / len;
        const wobble = Math.sin(this.wobbleOffset) * this.zigzagAmp;
        this.x += px * wobble;
        this.y += py * wobble;
      }
    }

    this.age += dt;
    const nearTop = this.y < 80;
    if (this.splitCount > 0 && !this.splitFired && (this.age >= this.splitTimer || nearTop)) {
      this.splitFired = true;
      this.readyToSplit = true;
    }
    if (this.shockRadius > 0 && !this.shockFired && (this.age >= this.shockTimer || nearTop)) {
      this.shockFired = true;
      this.readyToShock = true;
    }
    if (this.pelletCount > 0 && !this.pelletFired && (this.age >= this.pelletTimer || nearTop)) {
      this.pelletFired = true;
      this.readyToPellet = true;
    }

    if (this.maxRange > 0 && this.traveled >= this.maxRange) {
      this.active = false;
    }

    if (this.y < -40 || this.y > 2000) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (this.zigzagAmp > 0) {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.baseX - this.vx * 2.5, this.baseY - this.vy * 2.5);
    } else {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.vx * 2.5, this.y - this.vy * 2.5);
    }
    ctx.strokeStyle = `rgba(${hexToRgb(this.color)}, 0.4)`;
    ctx.lineWidth = this.size * 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();
  }

  onHit() {
    this.pierced++;
    if (this.pierced > this.pierce) {
      this.active = false;
    }
  }

  shouldExplode() {
    return this.explosionRadius > 0;
  }
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
