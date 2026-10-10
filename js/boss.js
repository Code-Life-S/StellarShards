// BOSS — socle commun + BOSS "LE NOYAU".
//
// Interface consommee par Game (tous les boss doivent la respecter) :
//   champs     : name, hp, maxHp, active, x, y, radius,
//                contactDamage, ramCooldown, points, colorRGB, colorHex
//   methodes   : update(dt, player, spawnBullets) / draw(ctx)
//                getTargets()  -> [{x, y, radius, points, colorRGB, colorHex, hit(d)}]
//                onResize(canvasWidth, canvasHeight, playLeft, playRight)
//
// Chaque fichier de boss s'enregistre dans BOSS_FACTORIES.
// Ordre des scripts obligatoire : boss.js avant boss-*.js.

const BOSS_FACTORIES = {};

function createBoss(kind, canvasWidth, canvasHeight, playLeft, playRight, level) {
  const factory = BOSS_FACTORIES[kind] || BOSS_FACTORIES.NOYAU;
  return factory(canvasWidth, canvasHeight, playLeft, playRight, level);
}

class EnemyBullet {
  constructor(x, y, vx, vy, radius, life, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius || 6;
    this.color = color || '#ff5566';
    this.life = life || 0; // 0 = duree illimitee
    this.active = true;
  }

  update(canvasWidth, canvasHeight, dt) {
    this.x += this.vx;
    this.y += this.vy;

    if (this.life > 0) {
      this.life -= dt;
      if (this.life <= 0) {
        this.active = false;
        return;
      }
    }

    if (this.x < -40 || this.x > canvasWidth + 40 || this.y < -40 || this.y > canvasHeight + 40) {
      this.active = false;
    }
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
    ctx.fillStyle = this.color + '26';
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

// Commune a tous les boss.
class BossBase {
  constructor(canvasWidth, canvasHeight, playLeft, playRight, level) {
    this.level = level || 1;
    this.name = 'BOSS';
    this.maxHp = 100 + (this.level - 1) * 30;
    this.hp = this.maxHp;
    this.radius = 46;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.playLeft = playLeft;
    this.playRight = playRight;
    this.x = (playLeft + playRight) / 2;
    this.y = canvasHeight * 0.18;
    this.time = 0;
    this.active = true;
    this.hitFlash = 0;
    this.invulnerable = false;   // ignore totalement les degats
    this.damageMult = 1;         // multiplicateur de degats recus
    this.contactDamage = 0;      // >0 : le boss blesse au contact
    this.ramCooldown = 0;
    // Le boss est sa propre cible (voir getTargets()).
    this.points = 2;             // score accorde par impact
    this.colorRGB = '216, 180, 254';
    this.colorHex = '#c4b5fd';
    this._targets = [this];
  }

  get hpRatio() {
    return Math.max(0, this.hp / this.maxHp);
  }

  getPhase() {
    const ratio = this.hpRatio;
    if (ratio > 0.66) return 1;
    if (ratio > 0.33) return 2;
    return 3;
  }

  // Reglage de difficulte courant : `values` est un tableau indexe par niveau
  // de difficulte (CONFIG.difficultyLevel, 0 = facile). Voir *_DIFF dans boss.
  diff(values) {
    const idx = Math.max(0, Math.min(values.length - 1, CONFIG.difficultyLevel || 0));
    return values[idx];
  }

  hit(damage) {
    if (this.invulnerable) return false;
    this.hp -= damage * this.damageMult;
    this.hitFlash = 160;
    if (this.hp <= 0) {
      this.hp = 0;
      this.active = false;
      return true;
    }
    return false;
  }

  getTargets() {
    return this._targets;
  }

  tick(dt) {
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      if (this.hitFlash < 0) this.hitFlash = 0;
    }
  }

  onResize(canvasWidth, canvasHeight, playLeft, playRight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.playLeft = playLeft;
    this.playRight = playRight;
    this.x = Math.max(playLeft + this.radius, Math.min(playRight - this.radius, this.x));
  }
}

// ---------------------------------------------------------------------------
// LE NOYAU — turret statique, bullet-hell (radial + vise).
// ---------------------------------------------------------------------------
// Reglages de difficulte du NOYAU — un tableau par reglage, chaque entree
// correspond a un niveau (index = CONFIG.difficultyLevel : FACILE, NORMAL,
// DIFFICILE, EXPERT). Ajouter un niveau = ajouter une valeur a chaque tableau.
//   intervalMul    : cadence entre deux attaques (plus grand = plus de repos).
//   telegraphMul   : duree d'anticipation avant le tir.
//   bulletSpeedMul : vitesse des balles.
//   radialBonus    : balles radiales supplementaires par salve.
//   aimedBonus     : balles vis supplementaires par salve.
//   moveSpeedMul   : vitesse de va-et-vient horizontal.
const NOYAU_DIFF = {
  intervalMul:    [1.3, 1.0, 0.85, 0.7],
  telegraphMul:   [1.4, 1.0, 0.9, 0.8],
  bulletSpeedMul: [0.75, 1.0, 1.15, 1.3],
  radialBonus:    [0, 0, 2, 4],
  aimedBonus:     [0, 0, 1, 2],
  moveSpeedMul:   [0.8, 1.0, 1.1, 1.2]
};

const NOYAU_PHASES = {
  1: { interval: 1600, telegraph: 380, radialCount: 10, radialSpeed: 2.6, aimedCount: 3, aimedSpread: 14, aimedSpeed: 4.0, moveSpeed: 0.0009 },
  2: { interval: 1100, telegraph: 320, radialCount: 14, radialSpeed: 3.0, aimedCount: 5, aimedSpread: 12, aimedSpeed: 4.6, moveSpeed: 0.0013 },
  3: { interval: 800,  telegraph: 260, radialCount: 18, radialSpeed: 3.4, aimedCount: 7, aimedSpread: 10, aimedSpeed: 5.2, moveSpeed: 0.0018 }
};

class BossNoyau extends BossBase {
  constructor(canvasWidth, canvasHeight, playLeft, playRight, level) {
    super(canvasWidth, canvasHeight, playLeft, playRight, level);
    this.name = 'LE NOYAU';
    this.radius = 46;
    this.amplitude = (playRight - playLeft) * 0.3;
    this.y = canvasHeight * 0.18;
    this.attackTimer = 1200;
    this.telegraph = 0;
    this.pendingAttack = null;
    this.attackToggle = 0;
  }

  onResize(canvasWidth, canvasHeight, playLeft, playRight) {
    super.onResize(canvasWidth, canvasHeight, playLeft, playRight);
    this.amplitude = (playRight - playLeft) * 0.3;
    this.y = canvasHeight * 0.18;
  }

  update(dt, player, spawnBullets) {
    const phase = NOYAU_PHASES[this.getPhase()];
    this.time += dt;
    this.tick(dt);

    const center = (this.playLeft + this.playRight) / 2;
    this.x = center + Math.sin(this.time * phase.moveSpeed * this.diff(NOYAU_DIFF.moveSpeedMul)) * this.amplitude;

    if (this.pendingAttack === null) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.pendingAttack = (this.attackToggle++ % 2 === 0) ? 'radial' : 'aimed';
        this.telegraph = phase.telegraph * this.diff(NOYAU_DIFF.telegraphMul);
      }
    } else {
      this.telegraph -= dt;
      if (this.telegraph <= 0) {
        this.fire(this.pendingAttack, player, spawnBullets);
        this.pendingAttack = null;
        this.attackTimer = phase.interval * this.diff(NOYAU_DIFF.intervalMul);
      }
    }
  }

  fire(kind, player, spawnBullets) {
    const phase = NOYAU_PHASES[this.getPhase()];
    const speedMul = this.diff(NOYAU_DIFF.bulletSpeedMul);
    if (kind === 'radial') {
      const count = phase.radialCount + this.diff(NOYAU_DIFF.radialBonus);
      const speed = phase.radialSpeed * speedMul;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + this.time * 0.001;
        spawnBullets.push(new EnemyBullet(
          this.x, this.y,
          Math.cos(a) * speed,
          Math.sin(a) * speed
        ));
      }
    } else {
      const count = phase.aimedCount + this.diff(NOYAU_DIFF.aimedBonus);
      const speed = phase.aimedSpeed * speedMul;
      const base = Math.atan2(player.y - this.y, player.x - this.x);
      const step = phase.aimedSpread * Math.PI / 180;
      const start = base - step * (count - 1) / 2;
      for (let i = 0; i < count; i++) {
        const a = start + i * step;
        spawnBullets.push(new EnemyBullet(
          this.x, this.y,
          Math.cos(a) * speed,
          Math.sin(a) * speed
        ));
      }
    }
  }

  draw(ctx) {
    const t = Date.now() * 0.001;
    const hpRatio = this.hpRatio;
    const damaged = this.hitFlash > 0;

    // Aura : reduit avec les PV, vire au rouge quand le boss prend des degats.
    const auraR = this.radius * (2.2 + 0.4 * hpRatio);
    const aura = ctx.createRadialGradient(this.x, this.y, this.radius * 0.4, this.x, this.y, auraR);
    aura.addColorStop(0, damaged ? 'rgba(255, 120, 120, 0.45)' : 'rgba(168, 85, 247, 0.35)');
    aura.addColorStop(1, damaged ? 'rgba(255, 120, 120, 0)' : 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(this.x, this.y, auraR, 0, Math.PI * 2);
    ctx.fill();

    // Anneau externe rotatif : rayon proportionnel aux PV restants.
    const ringR = this.radius * (1.1 + 0.4 * hpRatio);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(t * 0.6);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a0 = i * Math.PI / 3;
      ctx.arc(0, 0, ringR, a0, a0 + Math.PI / 3 * 0.6);
    }
    ctx.strokeStyle = damaged
      ? 'rgba(255, 90, 90, ' + (0.6 + 0.4 * Math.sin(t * 25)) + ')'
      : 'rgba(216, 180, 254, 0.5)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // Corps.
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(this.x - 12, this.y - 12, 4, this.x, this.y, this.radius);
    grad.addColorStop(0, damaged ? '#ffffff' : '#a855f7');
    grad.addColorStop(1, damaged ? '#ffdddd' : '#4c1d95');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#c4b5fd';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Noyau / oeil.
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = damaged ? '#ffffff' : '#f472b6';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

BOSS_FACTORIES.NOYAU = (w, h, l, r, level) => new BossNoyau(w, h, l, r, level);
