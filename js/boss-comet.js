// BOSS "LA COMETE" — mobile agressif.
// Cycle : REPOS (salves faibles) -> TELEGRAPH (ligne rouge) -> DASH (invulnerable,
// laisse une trainee de feu) -> CHOC/ETOURDI (fenetre de dps, degats x1.5).
// 3 phases selon les PV : cadence, vitesse, nombre de dashes enchaines.
// Difficulte (rebonds, bulles de trainee, fenetres...) : constante COMETE_DIFF.

const COMETE_PHASES = {
  1: { restTime: 1500, volleyDelay: 350, shotCount: 3, shotSpread: 16, shotSpeed: 3.6,
       telegraph: 520, dashSpeed: 15, chain: 1, trailInterval: 100,
       stun: 1300, vulnMult: 1.5 },
  2: { restTime: 1200, volleyDelay: 300, shotCount: 4, shotSpread: 14, shotSpeed: 4.2,
       telegraph: 440, dashSpeed: 18, chain: 2, trailInterval: 85,
       stun: 1100, vulnMult: 1.5 },
  3: { restTime: 950,  volleyDelay: 250, shotCount: 5, shotSpread: 12, shotSpeed: 4.8,
       telegraph: 360, dashSpeed: 22, chain: 3, trailInterval: 70,
       stun: 900,  vulnMult: 1.5 }
};

// Reglages de difficulte de LA COMETE.
// Un tableau = un reglage ; chaque entree correspond a un niveau de difficulte
// (index = CONFIG.difficultyLevel). Ajouter un niveau = ajouter une valeur
// dans chaque tableau + une entree dans CONFIG.difficultyLevels.
//   maxBounces    : rebonds (dashes enchaines) maximum.
//                   Plafonne phase.chain, et depasse jusqu'a 4 si > 3.
//   trailLife     : duree de vie (ms) des bulles de la trainee (obstacles).
//   telegraphMul  : multiplicateur de la fenetre d'anticipation (dash).
//   stunMul       : multiplicateur de la fenetre de vulnerabilite (DPS).
//   shotCountBonus: balles supplementaires par salve.
const COMETE_DIFF = {
  maxBounces:    [2, 3, 4, 4],          // facile (defaut) -> expert
  trailLife:     [1000, 2000, 3000, 4000],
  telegraphMul:  [1.2, 1.0, 0.9, 0.8],
  stunMul:       [1.3, 1.0, 0.85, 0.7],
  shotCountBonus:[0, 0, 1, 2]
};

class BossComete extends BossBase {
  constructor(canvasWidth, canvasHeight, playLeft, playRight, level) {
    super(canvasWidth, canvasHeight, playLeft, playRight, level);
    this.name = 'LA COMÈTE';
    this.maxHp = 90 + (this.level - 1) * 26;
    this.hp = this.maxHp;
    this.radius = 34;
    this.contactDamage = 1;
    this.points = 3;
    this.colorRGB = '255, 170, 80';
    this.colorHex = '#ffb454';

    this.homeY = canvasHeight * 0.19;
    this.amplitude = Math.max(0, (playRight - playLeft) / 2 - this.radius - 12);
    this.y = this.homeY;

    this.state = 'rest';
    this.stateTimer = COMETE_PHASES[this.getPhase()].restTime;
    this.volleyTimer = this.volleyDelayAt();
    this.volleyFired = false;
    this.dashVX = 0;
    this.dashVY = 0;
    this.dashesLeft = 0;
    this.trailTimer = 0;
    this.targetX = this.x;
    this.targetY = canvasHeight * 0.9;
    this.telegraphDur = 520;
    this.shakeT = 0;
  }

  volleyDelayAt() {
    return COMETE_PHASES[this.getPhase()].volleyDelay;
  }

  // Reglage de difficulte courant (voir COMETE_DIFF).
  d(key) {
    return this.diff(COMETE_DIFF[key]);
  }

  onResize(canvasWidth, canvasHeight, playLeft, playRight) {
    super.onResize(canvasWidth, canvasHeight, playLeft, playRight);
    this.homeY = canvasHeight * 0.19;
    this.amplitude = Math.max(0, (playRight - playLeft) / 2 - this.radius - 12);
    this.targetY = canvasHeight * 0.9;
  }

  // --- etats -----------------------------------------------------------------

  enterRest(phase) {
    this.state = 'rest';
    this.stateTimer = phase.restTime;
    this.volleyTimer = phase.volleyDelay;
    this.volleyFired = false;
    this.invulnerable = false;
    this.damageMult = 1;
    this.contactDamage = 0;
  }

  enterTelegraph(phase, player) {
    this.state = 'telegraph';
    const dur = phase.telegraph * this.d('telegraphMul');
    this.stateTimer = dur;
    this.telegraphDur = dur;
    this.lockDashTarget(player);
  }

  lockDashTarget(player) {
    this.targetX = Math.max(this.playLeft + this.radius + 4,
      Math.min(this.playRight - this.radius - 4, player.x));
    this.targetY = this.canvasHeight * 0.9;
  }

  startDash(phase) {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.dashVX = (dx / len) * phase.dashSpeed;
    this.dashVY = (dy / len) * phase.dashSpeed;
    this.state = 'dash';
    this.invulnerable = true;
    this.contactDamage = 1;
    this.trailTimer = 0;
    Renderer.shake(5, 200);
  }

  endDash(phase) {
    this.invulnerable = false;
    this.contactDamage = 0;
    this.state = 'stun';
    this.stateTimer = phase.stun * this.d('stunMul');
    this.damageMult = phase.vulnMult;
    this.ramCooldown = 0;
    Renderer.shake(10, 300);
    Audio.asteroid();
  }

  // --- update ----------------------------------------------------------------

  update(dt, player, spawnBullets) {
    this.tick(dt);
    this.time += dt;
    this.lastPlayer = player;

    const phase = COMETE_PHASES[this.getPhase()];
    this.stateTimer -= dt;

    switch (this.state) {
      case 'rest': this.updateRest(dt, phase, player, spawnBullets); break;
      case 'telegraph': this.updateTelegraph(dt, phase, player); break;
      case 'dash': this.updateDash(dt, phase, spawnBullets); break;
      case 'stun': this.updateStun(dt, phase); break;
    }
  }

  updateRest(dt, phase, player, spawnBullets) {
    const center = (this.playLeft + this.playRight) / 2;
    this.x = center + Math.sin(this.time * 0.0018) * this.amplitude;
    this.y += (this.homeY - this.y) * 0.06;

    if (!this.volleyFired) {
      this.volleyTimer -= dt;
      if (this.volleyTimer <= 0) {
        this.volleyFired = true;
        this.fireVolley(phase, player, spawnBullets);
      }
    }

    if (this.stateTimer <= 0) this.enterTelegraph(phase, player);
  }

  updateTelegraph(dt, phase, player) {
    if (this.stateTimer <= 0) {
      // Rebonds max plafonnes par la difficulte (maxBounces).
      const maxBounces = this.d('maxBounces');
      const extra = Math.max(0, maxBounces - 3);
      this.dashesLeft = Math.min(phase.chain, maxBounces) + extra;
      this.startDash(phase);
    }
  }

  updateDash(dt, phase, spawnBullets) {
    this.x += this.dashVX;
    this.y += this.dashVY;
    this.x = Math.max(this.playLeft + this.radius, Math.min(this.playRight - this.radius, this.x));
    this.y = Math.max(this.homeY, this.y);

    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = phase.trailInterval;
      spawnBullets.push(new EnemyBullet(
        this.x, this.y,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        7, this.d('trailLife'), '#ff9a3c'
      ));
    }

    const hitBottom = this.y >= this.targetY;
    const hitSide = this.x <= this.playLeft + this.radius || this.x >= this.playRight - this.radius;
    if (!hitBottom && !hitSide) return;

    this.dashesLeft--;
    if (this.dashesLeft > 0) {
      // Repart du haut vers une nouvelle cible.
      const center = (this.playLeft + this.playRight) / 2;
      this.x = center + (Math.random() - 0.5) * this.amplitude;
      this.y = this.homeY;
      this.lockDashTarget(this.lastPlayer);
      this.startDash(phase);
    } else {
      this.endDash(phase);
    }
  }

  updateStun(dt, phase) {
    const center = (this.playLeft + this.playRight) / 2;
    this.x += (center - this.x) * 0.05;
    this.y += (this.homeY - this.y) * 0.05;

    if (this.stateTimer <= 0) this.enterRest(phase);
  }

  fireVolley(phase, player, spawnBullets) {
    const base = Math.atan2(player.y - this.y, player.x - this.x);
    const step = phase.shotSpread * Math.PI / 180;
    const count = phase.shotCount + this.d('shotCountBonus');
    const start = base - step * (count - 1) / 2;
    for (let i = 0; i < count; i++) {
      const a = start + i * step;
      spawnBullets.push(new EnemyBullet(
        this.x, this.y,
        Math.cos(a) * phase.shotSpeed,
        Math.sin(a) * phase.shotSpeed,
        6, 0, '#ff8855'
      ));
    }
    Audio.spread();
  }

  // --- dessin ----------------------------------------------------------------

  draw(ctx) {
    const t = Date.now() * 0.001;
    const hpRatio = this.hpRatio;
    const damaged = this.hitFlash > 0;
    const stunned = this.state === 'stun';

    // Ligne de telegraph vers la cible.
    if (this.state === 'telegraph') {
      const k = 0.6 + 0.4 * Math.abs(Math.sin(t * 22));
      ctx.save();
      ctx.setLineDash([14, 10]);
      ctx.lineDashOffset = -t * 70;
      ctx.strokeStyle = 'rgba(255, 90, 90, ' + k + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.targetX, this.targetY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(this.targetX, this.targetY, 24 * (0.85 + 0.15 * Math.sin(t * 22)), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 90, 90, ' + (k * 0.7) + ')';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Aura proportionnelle aux PV.
    const auraR = this.radius * (2.6 + 0.5 * hpRatio);
    const aura = ctx.createRadialGradient(this.x, this.y, this.radius * 0.4, this.x, this.y, auraR);
    aura.addColorStop(0, damaged ? 'rgba(255, 120, 120, 0.45)' : 'rgba(255, 170, 80, 0.30)');
    aura.addColorStop(1, damaged ? 'rgba(255, 120, 120, 0)' : 'rgba(255, 170, 80, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(this.x, this.y, auraR, 0, Math.PI * 2);
    ctx.fill();

    // Trainee de feu pendant le dash (dessinee par-dessus l'aura).
    if (this.state === 'dash') {
      const len = Math.sqrt(this.dashVX * this.dashVX + this.dashVY * this.dashVY) || 1;
      const ux = this.dashVX / len;
      const uy = this.dashVY / len;
      const px = -uy;
      const py = ux;
      const r = this.radius;
      const tail = r * 3.4;
      const g = ctx.createLinearGradient(this.x, this.y, this.x - ux * tail, this.y - uy * tail);
      g.addColorStop(0, 'rgba(255, 235, 190, 0.9)');
      g.addColorStop(0.35, 'rgba(255, 160, 60, 0.75)');
      g.addColorStop(1, 'rgba(255, 110, 30, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(this.x + px * r, this.y + py * r);
      ctx.lineTo(this.x - px * r, this.y - py * r);
      ctx.lineTo(this.x - ux * tail, this.y - uy * tail);
      ctx.closePath();
      ctx.fill();
    }

    // Eclat de phase d'impact (stun) : cercle pointille qui se contracte.
    if (stunned) {
      const k = this.stateTimer / (COMETE_PHASES[this.getPhase()].stun || 1);
      ctx.save();
      ctx.setLineDash([6, 8]);
      ctx.lineDashOffset = t * 40;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * (1.6 + 0.6 * k), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 230, 120, ' + (0.35 + 0.4 * (1 - k)) + ')';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    // Anneau : reduit avec les PV.
    const ringR = this.radius * (1.15 + 0.4 * hpRatio);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(-t * 1.4);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a0 = i * Math.PI * 2 / 3;
      ctx.arc(0, 0, ringR, a0, a0 + Math.PI * 0.7);
    }
    ctx.strokeStyle = damaged
      ? 'rgba(255, 90, 90, ' + (0.6 + 0.4 * Math.sin(t * 25)) + ')'
      : 'rgba(255, 200, 140, 0.55)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Corps.
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(this.x - 8, this.y - 8, 3, this.x, this.y, this.radius);
    grad.addColorStop(0, damaged ? '#ffffff' : '#ffe9c9');
    grad.addColorStop(1, damaged ? '#ffdddd' : '#ff8c3a');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = stunned ? '#fde047' : '#ffb454';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Noyau.
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = damaged ? '#ffffff' : (stunned ? '#fde047' : '#fff7ed');
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

BOSS_FACTORIES.COMETE = (w, h, l, r, level) => new BossComete(w, h, l, r, level);
