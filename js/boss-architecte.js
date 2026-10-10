// BOSS "L'ARCHITECTE" — forteresse modulaire.
//
// Composition :
//   - un NOYAU en haut de l'arene ;
//   - 4 PILASTRES en orbite qui le protegent : tant qu'il en reste un, le noyau
//     ne subit que 25 % des degats (barre de vie qui avance doucement) ;
//   - des COLONNES verticales oscillantes qui ABSORBENT les missiles du joueur :
//     les tirs frontaux sont bloques, il faut trouver un angle lateral ou
//     detruire la colonne.
// Les 4 pilastres detruits ouvrent une fenetre de vulnerabilite (tout se
// retracte, compteur dessine autour du noyau) ; ensuite tout se reconstruit,
// avec des pilastres plus resistants selon la phase.
//
// Interface consommee par Game : voir l'en-tete de js/boss.js.
// Nouveau : la cible peut fournir contains(mx, my, msize) pour un impact
// rectangulaire plutot que circulaire.

// Reglages de difficulte de L'ARCHITECTE — un tableau par reglage, chaque
// entree correspond a un niveau (index = CONFIG.difficultyLevel).
//   fireIntervalMul : cadence de tir des pilastres.
//   burstBonus      : balles supplementaires par rafale.
//   windowMsMul     : duree de la fenetre de vulnerabilite (DPS).
//   shieldMult      : degats acceptes par le noyau tant qu'un pilastre vit
//                     (plus grand = plus facile a entamer).
//   pilastreHpMul   : robustesse des pilastres.
//   colHpMul        : robustesse des colonnes.
const ARCH_DIFF = {
  fireIntervalMul: [1.35, 1.0, 0.85, 0.7],
  burstBonus:      [0, 0, 0, 1],
  windowMsMul:     [1.4, 1.0, 0.85, 0.7],
  shieldMult:      [0.5, 0.25, 0.2, 0.15],
  pilastreHpMul:   [0.7, 1.0, 1.3, 1.6],
  colHpMul:        [0.75, 1.0, 1.2, 1.5]
};

const ARCH_PHASES = {
  1: { columns: 1, colOscSpeed: 0.0011, pilastreHp: 4, colHp: 8,  fireInterval: 2200, burst: 1, windowMs: 8000 },
  2: { columns: 2, colOscSpeed: 0.0016, pilastreHp: 6, colHp: 11, fireInterval: 1700, burst: 1, windowMs: 7000 },
  3: { columns: 2, colOscSpeed: 0.0022, pilastreHp: 8, colHp: 14, fireInterval: 1300, burst: 2, windowMs: 6000 }
};

class Pilastre {
  constructor(index, hp) {
    this.index = index;
    this.baseAngle = index * Math.PI / 2 + Math.PI / 4;
    this.radius = 16;
    this.maxHp = hp;
    this.hp = hp;
    this.active = true;
    this.hitFlash = 0;
    this.fireTimer = 320 + index * 280;
    this.x = 0;
    this.y = 0;
    this.points = 8;
    this.colorRGB = '251, 191, 36';
    this.colorHex = '#fbbf24';
  }

  hit(damage) {
    if (!this.active) return false;
    this.hp -= damage;
    this.hitFlash = 160;
    if (this.hp <= 0) {
      this.hp = 0;
      this.active = false;
      return true;
    }
    return false;
  }
}

class Colonne {
  constructor(width, hp) {
    this.width = width;
    this.maxHp = hp;
    this.hp = hp;
    this.active = true;
    this.retracted = false;
    this.hitFlash = 0;
    this.points = 5;
    this.colorRGB = '103, 232, 249';
    this.colorHex = '#67e8f9';
    this.radius = 0;          // inutilise : impact via contains()
    this.x = 0;
    this.y = 0;
    this.x0 = 0;
    this.x1 = 0;
    this.y0 = 0;
    this.y1 = 0;
  }

  contains(mx, my, msize) {
    if (!this.active) return false;
    const s = msize || 0;
    return mx + s >= this.x0 && mx - s <= this.x1 &&
           my + s >= this.y0 && my - s <= this.y1;
  }

  hit(damage) {
    if (!this.active) return false;
    this.hp -= damage;
    this.hitFlash = 160;
    if (this.hp <= 0) {
      this.hp = 0;
      this.active = false;
      return true;
    }
    return false;
  }
}

class BossArchitecte extends BossBase {
  constructor(canvasWidth, canvasHeight, playLeft, playRight, level) {
    super(canvasWidth, canvasHeight, playLeft, playRight, level);
    this.name = "L'ARCHITECTE";
    this.radius = 44;
    this.points = 3;
    this.colorRGB = '56, 189, 248';
    this.colorHex = '#38bdf8';

    this.orbitX = 92;
    this.orbitY = 62;
    this.colWidth = 30;
    this.damageMult = this.diff(ARCH_DIFF.shieldMult);
    this.shieldWindow = 0;
    this.windowTotal = 1;
    this.pilastres = [];
    this.colonnes = [];

    this.applyGeometry();
    this.y = this.homeY;
    const p1 = ARCH_PHASES[1];
    this.pilastres = [0, 1, 2, 3].map(i =>
      new Pilastre(i, Math.round(p1.pilastreHp * this.diff(ARCH_DIFF.pilastreHpMul))));
    this.syncColumns(ARCH_PHASES[1]);
    this.updateColonnes(ARCH_PHASES[1], 0);
  }

  // --- geometrie -----------------------------------------------------------

  applyGeometry() {
    this.homeY = this.canvasHeight * 0.24;
    this.colBottom = this.canvasHeight * 0.58;
    this.playTopY = this.canvasHeight * 0.17;
    this.amplitude = Math.max(0,
      (this.playRight - this.playLeft) / 2 - this.orbitX - this.radius - 16);
  }

  onResize(canvasWidth, canvasHeight, playLeft, playRight) {
    super.onResize(canvasWidth, canvasHeight, playLeft, playRight);
    this.applyGeometry();
    this.y = this.homeY;
  }

  // --- cibles --------------------------------------------------------------

  getTargets() {
    const list = [this];
    for (const p of this.pilastres) if (p.active) list.push(p);
    for (const c of this.colonnes) if (c.active) list.push(c);
    return list;
  }

  syncColumns(phase) {
    while (this.colonnes.length < phase.columns) {
      this.colonnes.push(new Colonne(this.colWidth,
        Math.round(phase.colHp * this.diff(ARCH_DIFF.colHpMul))));
    }
    while (this.colonnes.length > phase.columns) {
      this.colonnes.pop();
    }
  }

  rebuild(phase) {
    this.pilastres = [0, 1, 2, 3].map(i =>
      new Pilastre(i, Math.round(phase.pilastreHp * this.diff(ARCH_DIFF.pilastreHpMul))));
    this.colonnes = [];
    this.syncColumns(phase);
    this.updateColonnes(phase, 0);
    this.damageMult = this.diff(ARCH_DIFF.shieldMult);
    Renderer.addParticles(this.x, this.y, '56, 189, 248', 24);
    Audio.spread();
  }

  // --- update --------------------------------------------------------------

  update(dt, player, spawnBullets) {
    this.tick(dt);
    this.time += dt;

    const phase = ARCH_PHASES[this.getPhase()];
    const center = (this.playLeft + this.playRight) / 2;

    this.x = center + Math.sin(this.time * 0.0011) * this.amplitude;
    this.y = this.homeY;
    this.syncColumns(phase);

    this.updatePilastres(dt);
    this.updateShield(dt, phase);
    this.updateColonnes(phase, dt);
    this.updateFire(dt, phase, player, spawnBullets);
  }

  updatePilastres(dt) {
    const rot = this.time * 0.0014;
    for (const p of this.pilastres) {
      if (p.hitFlash > 0) {
        p.hitFlash -= dt;
        if (p.hitFlash < 0) p.hitFlash = 0;
      }
      if (!p.active) continue;
      const a = p.baseAngle + rot;
      p.x = this.x + Math.cos(a) * this.orbitX;
      p.y = this.y + Math.sin(a) * this.orbitY;
      p.x = Math.max(this.playLeft + p.radius, Math.min(this.playRight - p.radius, p.x));
      p.y = Math.max(this.playTopY, p.y);
    }
  }

  updateShield(dt, phase) {
    let alive = 0;
    for (const p of this.pilastres) if (p.active) alive++;

    if (alive > 0) {
      this.shieldWindow = 0;
      this.damageMult = this.diff(ARCH_DIFF.shieldMult);
      return;
    }

    this.damageMult = 1;

    if (this.shieldWindow <= 0) {
      this.shieldWindow = phase.windowMs * this.diff(ARCH_DIFF.windowMsMul);
      this.windowTotal = this.shieldWindow;
      for (const c of this.colonnes) {
        c.active = false;
        c.retracted = true;
      }
      Renderer.addFloatingText(this.x, this.y - 64, 'BOUCLIER HORS !', '#fbbf24');
      Renderer.addParticles(this.x, this.y, '251, 191, 36', 28);
      Audio.asteroid();
      return;
    }

    this.shieldWindow -= dt;
    if (this.shieldWindow <= 0) {
      this.shieldWindow = 0;
      this.rebuild(phase);
    }
  }

  updateColonnes(phase, dt) {
    const center = (this.playLeft + this.playRight) / 2;
    const amp = Math.max(0, (this.playRight - this.playLeft) / 2 - this.colWidth / 2 - 8);
    const s = Math.sin(this.time * phase.colOscSpeed);
    const y0 = this.y + this.orbitY + this.radius + 14;
    const y1 = this.colBottom;
    const n = this.colonnes.length;

    for (let i = 0; i < n; i++) {
      const c = this.colonnes[i];
      if (c.hitFlash > 0) {
        c.hitFlash -= dt;
        if (c.hitFlash < 0) c.hitFlash = 0;
      }
      // Une colonne oscille de part et d'autre du centre ; deux colonnes se
      // croisent et se separent en miroir (ouverture alternante).
      const sign = n === 1 ? 1 : (i === 0 ? 1 : -1);
      c.x = center + sign * s * amp;
      c.y = (y0 + y1) / 2;
      c.x0 = c.x - this.colWidth / 2;
      c.x1 = c.x + this.colWidth / 2;
      c.y0 = y0;
      c.y1 = y1;
    }
  }

  updateFire(dt, phase, player, spawnBullets) {
    for (const p of this.pilastres) {
      if (!p.active) continue;
      p.fireTimer -= dt;
      if (p.fireTimer > 0) continue;
      p.fireTimer = phase.fireInterval * this.diff(ARCH_DIFF.fireIntervalMul);

      const base = Math.atan2(player.y - p.y, player.x - p.x);
      const burst = phase.burst + this.diff(ARCH_DIFF.burstBonus);
      for (let b = 0; b < burst; b++) {
        const off = (b - (burst - 1) / 2) * 0.16;
        spawnBullets.push(new EnemyBullet(
          p.x, p.y,
          Math.cos(base + off) * 3.4,
          Math.sin(base + off) * 3.4,
          6, 0, '#fcd34d'
        ));
      }
    }
  }

  // --- dessin --------------------------------------------------------------

  draw(ctx) {
    const t = Date.now() * 0.001;
    const hpRatio = this.hpRatio;
    const damaged = this.hitFlash > 0;
    let aliveP = 0;
    for (const p of this.pilastres) if (p.active) aliveP++;
    const shieldUp = aliveP > 0;

    // Aura proportionnelle aux PV.
    const auraR = this.radius * (2.4 + 0.5 * hpRatio);
    const aura = ctx.createRadialGradient(this.x, this.y, this.radius * 0.4, this.x, this.y, auraR);
    aura.addColorStop(0, damaged ? 'rgba(255, 120, 120, 0.45)' : 'rgba(56, 189, 248, 0.30)');
    aura.addColorStop(1, damaged ? 'rgba(255, 120, 120, 0)' : 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(this.x, this.y, auraR, 0, Math.PI * 2);
    ctx.fill();

    // Colonnes (derriere tout le reste).
    for (const c of this.colonnes) this.drawColonne(ctx, c);

    // Liens structurels noyau -> pilastres.
    ctx.save();
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.35)';
    ctx.lineWidth = 2;
    for (const p of this.pilastres) {
      if (!p.active) continue;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.restore();

    // Anneau : reduit avec les PV.
    const ringR = this.radius * (1.1 + 0.4 * hpRatio);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(t * 0.5);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a0 = i * Math.PI / 3;
      ctx.arc(0, 0, ringR, a0, a0 + Math.PI / 3 * 0.55);
    }
    ctx.strokeStyle = damaged
      ? 'rgba(255, 90, 90, ' + (0.6 + 0.4 * Math.sin(t * 25)) + ')'
      : 'rgba(125, 211, 252, 0.55)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Hexagone de bouclier : visible tant qu'un pilastre protege le noyau.
    if (shieldUp) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(t * 0.35);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        const r = this.radius * 1.42;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(103, 232, 249, ' + (0.30 + 0.20 * Math.sin(t * 4)) + ')';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    for (const p of this.pilastres) if (p.active) this.drawPilastre(ctx, p, t);

    // Corps du noyau.
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(this.x - 12, this.y - 12, 4, this.x, this.y, this.radius);
    grad.addColorStop(0, damaged ? '#ffffff' : '#bae6fd');
    grad.addColorStop(1, damaged ? '#ffdddd' : '#075985');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = damaged ? '#ff8888' : '#7dd3fc';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Coeur.
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = damaged ? '#ffffff' : (shieldUp ? '#67e8f9' : '#fbbf24');
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Compteur de fenetre de vulnerabilite.
    if (this.shieldWindow > 0) {
      const k = Math.max(0, this.shieldWindow / this.windowTotal);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 1.9, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.95)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }

  drawColonne(ctx, c) {
    const w = c.x1 - c.x0;
    const h = c.y1 - c.y0;
    if (w <= 0 || h <= 0) return;
    const flash = c.hitFlash > 0;

    ctx.save();
    ctx.globalAlpha = c.active ? 1 : 0.22;

    const grad = ctx.createLinearGradient(c.x0, 0, c.x1, 0);
    if (flash) {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, '#ffdddd');
      grad.addColorStop(1, '#ffffff');
    } else {
      grad.addColorStop(0, 'rgba(12, 44, 74, 0.9)');
      grad.addColorStop(0.5, 'rgba(103, 232, 249, 0.55)');
      grad.addColorStop(1, 'rgba(12, 44, 74, 0.9)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(c.x0, c.y0, w, h);

    ctx.strokeStyle = flash ? 'rgba(255, 90, 90, 0.95)' : 'rgba(103, 232, 249, 0.95)';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x0, c.y0, w, h);

    ctx.strokeStyle = 'rgba(6, 26, 44, 0.75)';
    ctx.lineWidth = 3;
    for (let y = c.y0 + 14; y < c.y1 - 6; y += 34) {
      ctx.beginPath();
      ctx.moveTo(c.x0 + 3, y);
      ctx.lineTo(c.x1 - 3, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawPilastre(ctx, p, t) {
    const flash = p.hitFlash > 0;
    const ratio = p.maxHp > 0 ? p.hp / p.maxHp : 0;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(t * 1.6 + p.index);

    ctx.beginPath();
    ctx.moveTo(0, -p.radius);
    ctx.lineTo(p.radius, 0);
    ctx.lineTo(0, p.radius);
    ctx.lineTo(-p.radius, 0);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -p.radius, 0, p.radius);
    g.addColorStop(0, flash ? '#ffffff' : '#fde68a');
    g.addColorStop(1, flash ? '#ffdddd' : '#d97706');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = flash ? '#ff5566' : '#fbbf24';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, p.radius * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = flash ? '#ffffff' : '#fffbeb';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    if (p.hp < p.maxHp) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(p.x - 14, p.y + p.radius + 5, 28, 4);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(p.x - 14, p.y + p.radius + 5, 28 * ratio, 4);
    }
  }
}

BOSS_FACTORIES.ARCHITECTE = (w, h, l, r, level) => new BossArchitecte(w, h, l, r, level);
