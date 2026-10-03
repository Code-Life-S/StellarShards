// BOSS "LE NOYAU" : ennemi de fin d'arene qui siege en haut de l'ecran.
// 3 phases selon ses PV restants, deux patterns de tir :
//   - radial  : anneau de projectiles tout autour du boss
//   - vise    : salve orientee vers la position du joueur
// Chaque attaque est precedee d'un telegraph (le noyau pulse en jaune).

const BOSS_PHASES = {
  1: { interval: 1600, telegraph: 380, radialCount: 10, radialSpeed: 2.6, aimedCount: 3, aimedSpread: 14, aimedSpeed: 4.0, moveSpeed: 0.0009 },
  2: { interval: 1100, telegraph: 320, radialCount: 14, radialSpeed: 3.0, aimedCount: 5, aimedSpread: 12, aimedSpeed: 4.6, moveSpeed: 0.0013 },
  3: { interval: 800,  telegraph: 260, radialCount: 18, radialSpeed: 3.4, aimedCount: 7, aimedSpread: 10, aimedSpeed: 5.2, moveSpeed: 0.0018 }
};

class EnemyBullet {
  constructor(x, y, vx, vy, radius) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius || 6;
    this.color = '#ff5566';
    this.active = true;
  }

  update(canvasWidth, canvasHeight) {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < -40 || this.x > canvasWidth + 40 || this.y < -40 || this.y > canvasHeight + 40) {
      this.active = false;
    }
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 85, 102, 0.15)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

class Boss {
  constructor(canvasWidth, canvasHeight, playLeft, playRight, level) {
    this.level = level || 1;
    this.maxHp = 100 + (this.level - 1) * 30;
    this.hp = this.maxHp;
    this.radius = 46;
    this.playLeft = playLeft;
    this.playRight = playRight;
    this.amplitude = (playRight - playLeft) * 0.3;
    this.x = (playLeft + playRight) / 2;
    this.y = canvasHeight * 0.18;
    this.time = 0;
    this.active = true;
    this.hitFlash = 0;
    this.attackTimer = 1200;
    this.telegraph = 0;
    this.pendingAttack = null;
    this.attackToggle = 0;
  }

  getPhase() {
    const ratio = this.hp / this.maxHp;
    if (ratio > 0.66) return 1;
    if (ratio > 0.33) return 2;
    return 3;
  }

  update(dt, player, spawnBullets) {
    const phase = BOSS_PHASES[this.getPhase()];
    this.time += dt;

    const center = (this.playLeft + this.playRight) / 2;
    this.x = center + Math.sin(this.time * phase.moveSpeed) * this.amplitude;

    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      if (this.hitFlash < 0) this.hitFlash = 0;
    }

    if (this.pendingAttack === null) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.pendingAttack = (this.attackToggle++ % 2 === 0) ? 'radial' : 'aimed';
        this.telegraph = phase.telegraph;
      }
    } else {
      this.telegraph -= dt;
      if (this.telegraph <= 0) {
        this.fire(this.pendingAttack, player, spawnBullets);
        this.pendingAttack = null;
        this.attackTimer = phase.interval;
      }
    }
  }

  fire(kind, player, spawnBullets) {
    const phase = BOSS_PHASES[this.getPhase()];
    if (kind === 'radial') {
      for (let i = 0; i < phase.radialCount; i++) {
        const a = (i / phase.radialCount) * Math.PI * 2 + this.time * 0.001;
        spawnBullets.push(new EnemyBullet(
          this.x, this.y,
          Math.cos(a) * phase.radialSpeed,
          Math.sin(a) * phase.radialSpeed
        ));
      }
    } else {
      const base = Math.atan2(player.y - this.y, player.x - this.x);
      const step = phase.aimedSpread * Math.PI / 180;
      const start = base - step * (phase.aimedCount - 1) / 2;
      for (let i = 0; i < phase.aimedCount; i++) {
        const a = start + i * step;
        spawnBullets.push(new EnemyBullet(
          this.x, this.y,
          Math.cos(a) * phase.aimedSpeed,
          Math.sin(a) * phase.aimedSpeed
        ));
      }
    }
  }

  hit(damage) {
    this.hp -= damage;
    this.hitFlash = 120;
    if (this.hp <= 0) {
      this.hp = 0;
      this.active = false;
      return true;
    }
    return false;
  }

  draw(ctx) {
    const t = Date.now() * 0.001;
    const charging = this.pendingAttack !== null;

    const aura = ctx.createRadialGradient(this.x, this.y, this.radius * 0.4, this.x, this.y, this.radius * 2.6);
    aura.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
    aura.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Anneau externe rotatif (jaune pendant le telegraph).
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(t * 0.6);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a0 = i * Math.PI / 3;
      ctx.arc(0, 0, this.radius * 1.5, a0, a0 + Math.PI / 3 * 0.6);
    }
    ctx.strokeStyle = charging
      ? 'rgba(255, 220, 120, ' + (0.5 + 0.4 * Math.sin(t * 12)) + ')'
      : 'rgba(216, 180, 254, 0.5)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // Corps.
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(this.x - 12, this.y - 12, 4, this.x, this.y, this.radius);
    grad.addColorStop(0, this.hitFlash > 0 ? '#ffffff' : '#a855f7');
    grad.addColorStop(1, this.hitFlash > 0 ? '#ffdddd' : '#4c1d95');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#c4b5fd';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Noyau / oeil.
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = charging ? '#fde047' : '#f472b6';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  drawHPBar(ctx, width) {
    const barW = Math.min(520, width * 0.6);
    const barH = 16;
    const x = (width - barW) / 2;
    const y = 64;
    const ratio = Math.max(0, this.hp / this.maxHp);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(x - 3, y - 3, barW + 6, barH + 6);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(x, y, barW, barH);

    const grad = ctx.createLinearGradient(x, 0, x + barW, 0);
    grad.addColorStop(0, '#f472b6');
    grad.addColorStop(1, '#a855f7');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barW * ratio, barH);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barW, barH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('LE NOYAU', width / 2, y - 6);
  }
}
