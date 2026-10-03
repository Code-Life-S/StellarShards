const OBJECT_TYPES = {
  STAR:   { radius: 15, color: '#4ade80', rgb: '74, 222, 128', label: '⭐', destroyable: false, points: 10 },
  DIAMOND:{ radius: 14, color: '#60a5fa', rgb: '96, 165, 250', label: '💎', destroyable: false, points: 25 },
  SKULL:  { radius: 16, color: '#c084fc', rgb: '192, 132, 252', label: '☠️', destroyable: true, points: 15 },
  INDESTRUCTIBLE: { radius: 20, color: '#b91c1c', rgb: '185, 28, 28', label: '🪨', destroyable: false, points: 0 },
  HEART: { radius: 16, color: '#ff6b6b', rgb: '255, 107, 107', label: '❤️', destroyable: false, points: 0 }
};

class FallingObject {
  constructor(x, type, speed, playLeft, playRight, level) {
    this.baseX = x;
    this.x = x;
    this.y = -20;
    this.type = type;
    this.speed = speed;
    this.active = true;
    this.playLeft = playLeft;
    this.playRight = playRight;
    this.wobbleOffset = Math.random() * Math.PI * 2;
    this.wobbleAmp = CONFIG.zigzagAmpMin + Math.random() * (CONFIG.zigzagAmpMax - CONFIG.zigzagAmpMin);
    this.wobbleFreq = CONFIG.zigzagFreqMin + Math.random() * (CONFIG.zigzagFreqMax - CONFIG.zigzagFreqMin);

    const cfg = OBJECT_TYPES[type];
    this.radius = cfg.radius;
    this.color = cfg.color;
    this.colorRGB = cfg.rgb;
    this.label = cfg.label;
    this.destroyable = cfg.destroyable;
    this.points = cfg.points;
    if (type === 'SKULL') {
      this.hitPoints = Math.min(1 + Math.floor(((level || 1) - 1) / 5), 3);
    } else {
      this.hitPoints = 0;
    }
  }

  update(canvasHeight) {
    this.y += this.speed;
    if (this.type !== 'INDESTRUCTIBLE') {
      this.wobbleOffset += this.wobbleFreq;
      this.x = this.baseX + Math.sin(this.wobbleOffset) * this.wobbleAmp;
    } else {
      this.x = this.baseX + Math.sin(this.wobbleOffset) * this.wobbleAmp;
      this.wobbleOffset += this.wobbleFreq * 0.5;
    }
    this.x = Math.max(this.playLeft + this.radius, Math.min(this.playRight - this.radius, this.x));
    if (this.y > canvasHeight + 60) {
      this.active = false;
    }
  }

  hit(damage) {
    if (!this.destroyable) return false;
    this.hitPoints -= damage;
    if (this.hitPoints <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  draw(ctx) {
    if (this.type === 'INDESTRUCTIBLE') {
      this.drawAsteroid(ctx);
      return;
    }
    if (this.type === 'HEART') {
      this.drawHeart(ctx);
      return;
    }

    const glow = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius * 2
    );
    glow.addColorStop(0, this.color + '40');
    glow.addColorStop(1, this.color + '00');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = `${this.radius}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.label, this.x, this.y + 1);
  }

  drawAsteroid(ctx) {
    const glow = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius * 3
    );
    glow.addColorStop(0, 'rgba(185, 28, 28, 0.3)');
    glow.addColorStop(0.5, 'rgba(120, 50, 20, 0.1)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
    ctx.fill();

    const sides = 7 + Math.floor(Math.sin(this.wobbleOffset * 3) * 2);
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2 + this.wobbleOffset * 2;
      const r = this.radius * (0.7 + 0.3 * Math.sin(i * 3.7 + this.wobbleOffset));
      const px = this.x + Math.cos(a) * r;
      const py = this.y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const grad = ctx.createRadialGradient(this.x - 4, this.y - 4, 0, this.x, this.y, this.radius);
    grad.addColorStop(0, '#451a03');
    grad.addColorStop(0.6, '#291804');
    grad.addColorStop(1, '#1a0f02');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.x - 3, this.y - 3, this.radius * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(252, 165, 55, 0.5)';
    ctx.fill();
  }

  drawHeart(ctx) {
    const pulse = 1 + 0.12 * Math.sin(Date.now() * 0.006);
    const r = this.radius * pulse;

    const glow = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, r * 3
    );
    glow.addColorStop(0, 'rgba(255, 107, 107, 0.35)');
    glow.addColorStop(1, 'rgba(255, 107, 107, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 3, 0, Math.PI * 2);
    ctx.fill();

    // Coeur construit dans un repere normalise (-10..10), puis mis a l'echelle.
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(r / 10, r / 10);
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-14, -2, -9, -13, 0, -5);
    ctx.bezierCurveTo(9, -13, 14, -2, 0, 8);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, -13, 0, 8);
    grad.addColorStop(0, '#ff9a9a');
    grad.addColorStop(1, '#e03131');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }
}
