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
  color: '#64c8ff'
};

const AUGMENTS = {
  RAPID:   { color: '#ef4444', levels: [0.85, 0.85, 0.85, 0.85, 0.85] },
  SPREAD:  { color: '#f59e0b', levels: [1, 2, 3, 4, 5] },
  PIERCING:{ color: '#34d399', levels: [1, 2, 3, 4, 5] },
  HEAVY:   { color: '#a78bfa', levels: [15, 22, 33, 49, 74] },
  ZIGZAG:  { color: '#22d3ee', levels: [8, 13, 18, 23, 28] }
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
    this.wobbleOffset = Math.random() * Math.PI * 2;
  }

  update() {
    this.baseX += this.vx;
    this.baseY += this.vy;
    this.x = this.baseX;
    this.y = this.baseY;

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
