const WEAPONS = {
  BASIC: {
    levels: [
      { speed: 8, damage: 1, fireRate: 250, count: 1, spread: 0, pierce: 0, color: '#64c8ff', size: 4 },
      { speed: 9, damage: 1, fireRate: 200, count: 1, spread: 0, pierce: 0, color: '#64c8ff', size: 4 },
      { speed: 10, damage: 1, fireRate: 200, count: 2, spread: 3, pierce: 0, color: '#64c8ff', size: 4 }
    ]
  },
  SPREAD: {
    levels: [
      { speed: 7, damage: 1, fireRate: 400, count: 3, spread: 15, pierce: 0, color: '#f59e0b', size: 3 },
      { speed: 7.5, damage: 1, fireRate: 360, count: 4, spread: 15, pierce: 0, color: '#f59e0b', size: 3 },
      { speed: 8, damage: 1, fireRate: 320, count: 5, spread: 18, pierce: 0, color: '#f59e0b', size: 3 }
    ]
  },
  RAPID: {
    levels: [
      { speed: 9, damage: 1, fireRate: 100, count: 1, spread: 0, pierce: 0, color: '#ef4444', size: 3 },
      { speed: 10, damage: 1, fireRate: 80, count: 1, spread: 0, pierce: 0, color: '#ef4444', size: 3 },
      { speed: 11, damage: 2, fireRate: 60, count: 1, spread: 0, pierce: 0, color: '#ef4444', size: 3 }
    ]
  },
  HEAVY: {
    levels: [
      { speed: 5, damage: 3, fireRate: 600, count: 1, spread: 0, pierce: 0, color: '#a78bfa', size: 6, explosionRadius: 30 },
      { speed: 5.5, damage: 4, fireRate: 500, count: 1, spread: 0, pierce: 0, color: '#a78bfa', size: 6, explosionRadius: 40 },
      { speed: 6, damage: 5, fireRate: 400, count: 1, spread: 0, pierce: 0, color: '#a78bfa', size: 6, explosionRadius: 50 }
    ]
  },
  PIERCING: {
    levels: [
      { speed: 8, damage: 1, fireRate: 300, count: 1, spread: 0, pierce: 1, color: '#34d399', size: 4 },
      { speed: 8.5, damage: 1, fireRate: 280, count: 1, spread: 0, pierce: 2, color: '#34d399', size: 4 },
      { speed: 9, damage: 2, fireRate: 260, count: 1, spread: 0, pierce: 3, color: '#34d399', size: 4 }
    ]
  }
};

class Missile {
  constructor(x, y, vx, vy, type, level) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.type = type;
    this.level = level;
    this.active = true;
    this.pierced = 0;
    const cfg = WEAPONS[type].levels[level - 1];
    this.damage = cfg.damage;
    this.pierce = cfg.pierce || 0;
    this.explosionRadius = cfg.explosionRadius || 0;
    this.size = cfg.size || 4;
    this.color = cfg.color;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.y < -40 || this.y > 2000) {
      this.active = false;
    }
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 2.5, this.y - this.vy * 2.5);
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
