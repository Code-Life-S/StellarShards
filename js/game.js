const DEBUG_START_LEVEL = 5; // Niveau de départ pour tester (1+)

const CONFIG = {
  areaRatio: 0.30,
  areaTopRatio: 0.15,
  areaBottomRatio: 0.08,
  zigzagAmpMin: 5,
  zigzagAmpMax: 40,
  zigzagFreqMin: 0.02,
  zigzagFreqMax: 0.07,
  playerSpeed: 12,
  baseLevelDuration: 45000,
  levelDurationIncrement: 15000,
  maxLevelDuration: 120000
};

const Game = {
  score: 0,
  currency: 0,
  lives: 3,
  maxLives: 3,
  phase: 'title',
  canvas: null,
  ctx: null,
  objects: [],
  missiles: [],
  boss: null,
  enemyBullets: [],
  consecutiveStars: 0,
  hasShield: false,
  shieldAppearTimer: 0,
  titleTimer: 0,
  playLeft: 0, playRight: 0, playTop: 0, playBottom: 0,
  currentLevel: 1,
  levelTimer: 0,
  levelDuration: 60000,
  shopCards: [],
  rerollsLeft: 2,
  shopSelectedIndex: 0,

  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.calcPlayArea();

    this.score = 0;
    this.currency = 0;
    this.lives = this.maxLives;
    this.phase = 'title';
    this.objects = [];
    this.missiles = [];
    this.boss = null;
    this.enemyBullets = [];
    this.consecutiveStars = 0;
    this.hasShield = false;
    this.shieldAppearTimer = 0;
    this.titleTimer = 0;
    this.currentLevel = DEBUG_START_LEVEL;
    this.rerollsLeft = 2;
    this.shopSelectedIndex = 0;
    this.titleSelectedIndex = 0;
    this.pauseSelectedIndex = 0;
    this.optionsSelectedIndex = 0;
    this.optionsOpen = false;
    this.optionsReturn = null;

    Player.init(this.canvas.width, this.canvas.height);
    Spawner.init();
    Renderer.init(this.canvas.width, this.canvas.height);

    document.getElementById('title-screen').classList.remove('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('level-complete').classList.add('hidden');
    document.getElementById('shop-overlay').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('options-screen').classList.add('hidden');
    document.getElementById('score').textContent = '0';
    document.getElementById('currency-display').textContent = '0';
    this.updateLivesDisplay();
    this.updateModuleHUD();
    this.updateBossHUD();
  },

  calcPlayArea() {
    this.playLeft = this.canvas.width * CONFIG.areaRatio;
    this.playRight = this.canvas.width * (1 - CONFIG.areaRatio);
    this.playTop = this.canvas.height * CONFIG.areaTopRatio;
    this.playBottom = this.canvas.height * (1 - CONFIG.areaBottomRatio);
  },

  startGame() {
    this.calcPlayArea();
    this.score = 0;
    this.currency = 0;
    this.lives = this.maxLives;
    this.phase = 'playing';
    this.objects = [];
    this.missiles = [];
    this.boss = null;
    this.enemyBullets = [];
    this.consecutiveStars = 0;
    this.hasShield = false;
    this.shieldAppearTimer = 0;
    this.titleTimer = 0;
    this.currentLevel = DEBUG_START_LEVEL;
    this.rerollsLeft = 2;
    this.shopSelectedIndex = 0;

    Player.init(this.canvas.width, this.canvas.height);
    Spawner.init();
    Renderer.init(this.canvas.width, this.canvas.height);
    Music.stop();
    Music.start(Audio.ctx);

    this.levelDuration = this.getLevelDuration();
    this.levelTimer = this.levelDuration;

    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('level-complete').classList.add('hidden');
    document.getElementById('shop-overlay').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('score').textContent = '0';
    document.getElementById('currency-display').textContent = '0';
    this.updateLivesDisplay();
    this.updateModuleHUD();
    this.updateBossHUD();
  },

  getDifficulty() {
    const l = this.currentLevel - 1;
    return {
      baseFallSpeed: 2.0 + l * 0.3,
      fastFallSpeed: 3.5 + l * 0.4,
      fastChance: Math.min(0.05 + l * 0.04, 0.35),
      spawnInterval: Math.max(400, 1400 - l * 100),
      weights: {
        STAR: Math.max(20, 55 - l * 4),
        DIAMOND: Math.max(5, 15 - l),
        SKULL: 15 + l * 6,
        INDESTRUCTIBLE: l >= 1 ? l * 5 : 0
      }
    };
  },

  getLevelDuration() {
    const dur = CONFIG.baseLevelDuration + (this.currentLevel - 1) * CONFIG.levelDurationIncrement;
    return Math.min(dur, CONFIG.maxLevelDuration);
  },

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.calcPlayArea();
    Player.y = this.canvas.height - 50;
    Player.trail = [];
    if (this.boss) {
      this.boss.onResize(this.canvas.width, this.canvas.height, this.playLeft, this.playRight);
    }
    this.updateBossHudPosition();
  },

  update(dt, timestamp) {
    if (this.phase !== 'playing') {
      if (this.phase === 'title') {
        this.renderTitleDemo();
      }
      if (this.phase === 'paused') {
        // Still render the game scene but frozen
        Renderer.update(dt, this.canvas.width, this.canvas.height);
      } else {
        Renderer.update(dt, this.canvas.width, this.canvas.height);
      }
      return;
    }

    Player.update(this.playLeft, this.playRight, this.playTop, this.playBottom);

    if (this.shieldAppearTimer > 0) {
      this.shieldAppearTimer -= dt;
      if (this.shieldAppearTimer < 0) this.shieldAppearTimer = 0;
    }

    if (Input.isShooting() && Player.canShoot(timestamp)) {
      const newMissiles = Player.fire(timestamp);
      this.missiles.push(...newMissiles);
    }

    this.updateMissiles(dt);

    if (this.boss) {
      this.updateBossLevel(dt);
      Renderer.update(dt, this.canvas.width, this.canvas.height);
      return;
    }

    this.levelTimer -= dt;
    if (this.levelTimer <= 0) {
      this.completeLevel();
      return;
    }
    document.getElementById('timer').textContent = Math.ceil(this.levelTimer / 1000);

    const diff = this.getDifficulty();
    Spawner.update(timestamp, this.objects, this.playLeft, this.playRight, diff, this.currentLevel);

    this.checkMissileCollisions();
    this.checkObjectCollisions();

    if (this.currentLevel >= 2 && this.objects.length === 0 && Spawner.inPause) {
      Spawner.schedulePowerup();
    }

    Renderer.update(dt, this.canvas.width, this.canvas.height);
  },

  updateMissiles(dt) {
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.update(dt);
      if (m.readyToSplit) {
        m.readyToSplit = false;
        this.splitMissile(m);
      }
      if (m.readyToShock) {
        m.readyToShock = false;
        this.shockwaveAt(m.x, m.y, m.shockRadius, m.shockDamage);
      }
      if (m.readyToPellet) {
        m.readyToPellet = false;
        this.scatterPellets(m.x, m.y, m.pelletCount, m.pelletDamage, m.pelletSpeed, m.pelletRange);
      }
      if (!m.active) {
        this.missiles.splice(i, 1);
      }
    }
  },

  splitMissile(m) {
    const baseAngle = Math.atan2(m.vx, -m.vy);
    const step = m.splitSpread * Math.PI / 180;
    const startAngle = -(m.splitCount - 1) * step / 2;
    const childCfg = {
      damage: m.damage,
      pierce: m.pierce,
      explosionRadius: m.explosionRadius,
      zigzagAmp: m.zigzagAmp,
      size: Math.max(2, m.size - 1),
      color: m.color,
      splitCount: 0,
      shockRadius: 0,
      pelletCount: 0
    };
    for (let i = 0; i < m.splitCount; i++) {
      const angle = baseAngle + startAngle + i * step;
      const vx = Math.sin(angle) * m.speed;
      const vy = -Math.cos(angle) * m.speed;
      this.missiles.push(new Missile(m.x, m.y, vx, vy, childCfg));
    }
  },

  checkMissileCollisions() {
    for (let mi = this.missiles.length - 1; mi >= 0; mi--) {
      const m = this.missiles[mi];
      if (!m.active) continue;

      for (let oi = this.objects.length - 1; oi >= 0; oi--) {
        const obj = this.objects[oi];
        if (!obj.active || !obj.destroyable) continue;

        const dx = m.x - obj.x;
        const dy = m.y - obj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < m.size + obj.radius) {
          const destroyed = obj.hit(m.damage);
          if (destroyed) {
            this.onObjectDestroyed(obj);
            this.objects.splice(oi, 1);
          }
          m.onHit();
          if (m.shouldExplode()) {
            this.explosionAt(m.x, m.y, m.explosionRadius);
          }
          if (!m.active) {
            break;
          }
        }
      }
    }
  },

  updateBossLevel(dt) {
    const boss = this.boss;
    boss.update(dt, Player, this.enemyBullets);

    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.update(this.canvas.width, this.canvas.height, dt);
      if (!b.active) {
        this.enemyBullets.splice(i, 1);
        continue;
      }
      const dx = Player.x - b.x;
      const dy = Player.y - b.y;
      if (Math.sqrt(dx * dx + dy * dy) < Player.radius + b.radius) {
        this.enemyBullets.splice(i, 1);
        this.hitPlayer(b.x, b.y, hexToRgb(b.color));
      }
    }

    // Contact direct avec le boss (si le boss est "contactDamage").
    if (boss.contactDamage > 0) {
      if (boss.ramCooldown > 0) {
        boss.ramCooldown -= dt;
      } else {
        const dx = Player.x - boss.x;
        const dy = Player.y - boss.y;
        if (Math.sqrt(dx * dx + dy * dy) < Player.radius + boss.radius * 0.9) {
          boss.ramCooldown = 1200;
          this.hitPlayer(boss.x, boss.y, hexToRgb('#ffb454'));
        }
      }
    }

    this.checkBossMissileCollisions();
    this.updateBossHUD();

    if (!boss.active) {
      this.onBossDefeated();
    }
  },

  updateBossHUD() {
    const hud = document.getElementById('boss-hud');
    // Unite "s" du timer masquee pendant un combat de boss.
    document.getElementById('timer-display').classList.toggle('boss', !!this.boss);
    // Masque le HUD en dehors d'une partie jouee (titre, pause, game over...).
    if (!this.boss || this.phase !== 'playing') {
      hud.classList.add('hidden');
      return;
    }
    hud.classList.remove('hidden');
    document.getElementById('boss-name').textContent = this.boss.name;
    const ratio = Math.max(0, this.boss.hp / this.boss.maxHp);
    document.getElementById('boss-hp-fill').style.width = (ratio * 100) + '%';
  },

  // Evite tout chevauchement avec #hud : on place #boss-hud juste sous le HUD principal.
  updateBossHudPosition() {
    const hud = document.getElementById('hud');
    const bossHud = document.getElementById('boss-hud');
    if (!hud || !bossHud) return;
    const bottom = hud.getBoundingClientRect().bottom;
    // #hud peut etre masquee (ecrans hors partie) : on retombe sur la valeur par defaut du CSS.
    bossHud.style.top = bottom > 0 ? (bottom + 12) + 'px' : '';
  },

  checkBossMissileCollisions() {
    const boss = this.boss;
    if (!boss || !boss.active) return;
    const targets = boss.getTargets();

    for (let mi = this.missiles.length - 1; mi >= 0; mi--) {
      const m = this.missiles[mi];
      if (!m.active) continue;

      for (let ti = targets.length - 1; ti >= 0; ti--) {
        const t = targets[ti];
        if (t.active === false) continue;
        const dx = m.x - t.x;
        const dy = m.y - t.y;
        // Cible circulaire par defaut ; une cible peut definir contains() pour
        // un impact rectangulaire (colonnes de L'Architecte).
        const impact = t.contains
          ? t.contains(m.x, m.y, m.size)
          : Math.sqrt(dx * dx + dy * dy) < m.size + t.radius;
        if (impact) {
          const destroyed = t.hit(m.damage);
          const points = t.points || 2;
          this.score += points;
          document.getElementById('score').textContent = this.score;
          Renderer.addParticles(m.x, m.y, t.colorRGB || '216, 180, 254', destroyed ? 10 : 3);
          Renderer.addFloatingText(m.x, m.y - 8, '+' + points, t.colorHex || '#c4b5fd');
          if (m.shouldExplode()) {
            this.explosionAt(m.x, m.y, m.explosionRadius);
          }
          m.onHit();
          if (boss.onTargetDestroyed && destroyed) {
            boss.onTargetDestroyed(t);
          }
          if (!m.active) break;
        }
      }
    }
  },

  hitPlayer(x, y, colorRGB) {
    this.consecutiveStars = 0;
    if (this.hasShield) {
      this.breakShield();
      Renderer.addParticles(x, y, '100, 200, 255', 12);
      Renderer.addFloatingText(x, y - 10, 'BLOCKED', '#64c8ff');
      Audio.asteroid();
    } else {
      this.loseLife();
      Renderer.addParticles(x, y, colorRGB || '255, 85, 102', 12);
    }
  },

  onBossDefeated() {
    const boss = this.boss;
    Renderer.addParticles(boss.x, boss.y, '216, 180, 254', 40);
    Renderer.addParticles(boss.x, boss.y, '251, 191, 36', 30);
    Renderer.shake(16, 600);
    Audio.explosion();
    Audio.levelComplete();

    this.score += 500;
    document.getElementById('score').textContent = this.score;
    this.enemyBullets = [];
    this.boss = null;
    this.updateBossHUD();

    if (this.lives < this.maxLives) {
      this.lives++;
      this.updateLivesDisplay();
      Renderer.addFloatingText(Player.x, Player.y - 40, '+1 LIFE', '#ff6b6b');
    }

    this.completeLevel();
  },

  onObjectDestroyed(obj) {
    this.score += obj.points;
    document.getElementById('score').textContent = this.score;
    Renderer.addParticles(obj.x, obj.y, obj.colorRGB, 10);
    Renderer.addFloatingText(obj.x, obj.y - 10, '+' + obj.points, obj.color);
    Audio.explosion();
    Renderer.shake(3, 100);
  },

  explosionAt(x, y, radius) {
    Renderer.shake(8, 200);
    Renderer.addParticles(x, y, '255, 200, 100', 15);
    for (let oi = this.objects.length - 1; oi >= 0; oi--) {
      const obj = this.objects[oi];
      if (!obj.active || !obj.destroyable) continue;
      const dx = x - obj.x;
      const dy = y - obj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) {
        const destroyed = obj.hit(2);
        if (destroyed) {
          this.onObjectDestroyed(obj);
          this.objects.splice(oi, 1);
        }
      }
    }
  },

  shockwaveAt(x, y, radius, damage) {
    Renderer.addShockwave(x, y, radius);
    Renderer.shake(3, 120);
    Audio.explosion();
    for (let oi = this.objects.length - 1; oi >= 0; oi--) {
      const obj = this.objects[oi];
      if (!obj.active || !obj.destroyable) continue;
      const dx = x - obj.x;
      const dy = y - obj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) {
        const destroyed = obj.hit(damage);
        if (destroyed) {
          this.onObjectDestroyed(obj);
          this.objects.splice(oi, 1);
        }
      }
    }
  },

  scatterPellets(x, y, count, damage, speed, range) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const cfg = { ...MISSILE_BASE, damage, size: 3, color: AUGMENTS.PELLET.color };
      const pellet = new Missile(x, y, vx, vy, cfg);
      pellet.maxRange = range;
      this.missiles.push(pellet);
    }
  },

  checkObjectCollisions() {
    const playerBounds = Player;

    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      obj.update(this.canvas.height);

      if (!obj.active && obj.y > this.canvas.height - 20 && obj.type === 'SKULL') {
        this.handleSkullGround();
        this.objects.splice(i, 1);
        continue;
      }

      if (!obj.active) {
        this.objects.splice(i, 1);
        continue;
      }

      const dx = playerBounds.x - obj.x;
      const dy = playerBounds.y - obj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitDist = playerBounds.radius + obj.radius;

      if (dist < hitDist) {
        this.handleCollision(obj, i);
      }
    }
  },

  handleSkullGround() {
    this.consecutiveStars = 0;
    if (this.hasShield) {
      this.breakShield();
      Renderer.addParticles(
        this.playLeft + (this.playRight - this.playLeft) / 2,
        this.canvas.height - 20,
        '100, 200, 255', 15
      );
    } else {
      this.loseLife();
    }
  },

  handleCollision(obj, index) {
    if (obj.type === 'STAR' || obj.type === 'DIAMOND') {
      const points = obj.type === 'STAR' ? 10 : 25;
      this.score += points;
      this.consecutiveStars++;
      document.getElementById('score').textContent = this.score;
      Renderer.addParticles(obj.x, obj.y, obj.colorRGB, 8);
      Renderer.addFloatingText(obj.x, obj.y - 10, `+${points}`, obj.color);
      if (obj.type === 'STAR') Audio.star();
      else Audio.diamond();

      if (this.consecutiveStars >= 3) {
        this.consecutiveStars = 0;
        this.activateShield();
        Renderer.addFloatingText(obj.x, obj.y - 40, 'SHIELD!', '#64c8ff');
        Audio.shield();
      }
      } else if (obj.type === 'POWERUP') {
      const types = Object.keys(AUGMENTS).filter(t => {
        const owned = Player.getAugment(t);
        return !owned || owned.level < 5;
      });
      if (types.length > 0) {
        const newType = types[Math.floor(Math.random() * types.length)];
        Player.addAugment(newType);
        this.updateModuleHUD();
        const aug = Player.getAugment(newType);
        const label = aug.level > 1 ? newType + ' Lv' + aug.level : newType;
        Renderer.addParticles(obj.x, obj.y, '251, 191, 36', 15);
        Renderer.addFloatingText(obj.x, obj.y - 10, label, '#fbbf24');
        Audio.powerup();
      }
    } else {
      this.consecutiveStars = 0;
      if (this.hasShield) {
        this.breakShield();
        Renderer.addParticles(obj.x, obj.y, '100, 200, 255', 12);
        Renderer.addFloatingText(obj.x, obj.y - 10, 'BLOCKED', '#64c8ff');
        Audio.asteroid();
      } else if (obj.type === 'SKULL' || obj.type === 'INDESTRUCTIBLE') {
        this.loseLife();
        Renderer.addParticles(obj.x, obj.y, obj.colorRGB, 12);
        if (obj.type === 'SKULL') Audio.skull();
        else Audio.asteroid();
      }
    }

    this.objects.splice(index, 1);
  },

  loseLife() {
    this.lives--;
    this.updateLivesDisplay();
    this.triggerDamageEffect();
    const el = document.getElementById('lives-display');
    el.classList.remove('damage');
    void el.offsetWidth;
    el.classList.add('damage');
    setTimeout(() => el.classList.remove('damage'), 600);
    if (this.lives <= 0) {
      this.gameOver();
    }
  },

  triggerDamageEffect() {
    Renderer.shake(8, 400);
    Renderer.redOverlay = 1.0;
  },

  activateShield() {
    this.hasShield = true;
    this.shieldAppearTimer = 400;
    const el = document.getElementById('shield-display');
    el.classList.remove('hidden');
  },

  breakShield() {
    this.hasShield = false;
    this.shieldAppearTimer = 0;
    document.getElementById('shield-display').classList.add('hidden');
    Audio.shieldBreak();
    Renderer.shieldBreakEffect(Player.x, Player.y);
  },

  completeLevel() {
    this.phase = 'levelComplete';
    const earned = this.score;
    this.currency += earned;
    document.getElementById('lc-score').textContent = this.score;
    document.getElementById('lc-currency').textContent = '+' + earned + ' \u26A1';
    document.getElementById('level-complete').classList.remove('hidden');
    Audio.levelComplete();
  },

  openShop() {
    this.phase = 'shop';
    this.shopSelectedIndex = 0;
    document.getElementById('level-complete').classList.add('hidden');
    document.getElementById('shop-currency-amount').textContent = this.currency;
    document.getElementById('shop-level').textContent = this.currentLevel + 1;
    this.generateShopCards();
    this.updateShopUI();
    document.getElementById('shop-overlay').classList.remove('hidden');
  },

  generateShopCards() {
    const types = Object.keys(AUGMENTS);
    const candidates = types.filter(t => {
      const owned = Player.getAugment(t);
      return !owned || owned.level < 5;
    });

    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    this.shopCards = candidates.slice(0, 3).map(type => {
      const owned = Player.getAugment(type);
      const level = owned ? owned.level + 1 : 1;
      const price = 40 + level * 25;
      return { type, level, price };
    });
  },

  shopNavigate(dir) {
    if (this.shopCards.length === 0) return;
    this.shopSelectedIndex = (this.shopSelectedIndex + dir + this.shopCards.length) % this.shopCards.length;
    this.updateShopUI();
  },

  buySelectedCard() {
    this.buyCard(this.shopSelectedIndex);
  },

  updateShopUI() {
    const container = document.getElementById('shop-cards');
    container.innerHTML = '';
    this.shopCards.forEach((card, i) => {
      const el = document.createElement('div');
      el.className = 'shop-card' +
        (this.currency < card.price ? ' disabled' : '') +
        (i === this.shopSelectedIndex ? ' selected' : '');
      el.innerHTML =
        '<div class="shop-card-name">' + card.type + '</div>' +
        '<div class="shop-card-level">Lv.' + card.level + '</div>' +
        '<div class="shop-card-price">\u26A1 ' + card.price + '</div>' +
        '<button class="shop-buy-btn" data-index="' + i + '">BUY</button>';
      container.appendChild(el);
    });
    document.getElementById('shop-reroll-count').textContent = this.rerollsLeft > 0 ? '' + this.rerollsLeft + ' free' : '20\u26A1';
    document.getElementById('shop-currency-amount').textContent = this.currency;
  },

  buyCard(index) {
    const card = this.shopCards[index];
    if (!card || this.currency < card.price) return;
    this.currency -= card.price;
    Player.addAugment(card.type);
    this.updateModuleHUD();
    Audio.shopBuy();
    this.closeShop();
  },

  rerollShop() {
    if (this.rerollsLeft > 0) {
      this.rerollsLeft--;
    } else if (this.currency >= 20) {
      this.currency -= 20;
    } else {
      return;
    }
    this.shopSelectedIndex = 0;
    this.generateShopCards();
    this.updateShopUI();
  },

  closeShop() {
    document.getElementById('shop-overlay').classList.add('hidden');
    this.startNextLevel();
  },

  startNextLevel() {
    this.currentLevel++;
    this.score = 0;
    this.missiles = [];
    this.objects = [];
    this.boss = null;
    this.enemyBullets = [];
    this.consecutiveStars = 0;
    this.hasShield = false;
    this.shieldAppearTimer = 0;
    this.phase = 'playing';
    this.levelDuration = this.getLevelDuration();
    this.levelTimer = this.levelDuration;
    this.shopSelectedIndex = 0;

    document.getElementById('shield-display').classList.add('hidden');
    document.getElementById('score').textContent = '0';
    document.getElementById('timer').textContent = Math.ceil(this.levelDuration / 1000);
    this.updateLivesDisplay();
    this.updateModuleHUD();
    this.updateBossHUD();

    Spawner.init();
    Player.lastShot = 0;

    const tempo = Math.min(100 + (this.currentLevel - 1) * 5, 130);
    Music.setTempo(tempo);
  },

  updateLivesDisplay() {
    const el = document.getElementById('lives-display');
    if (el) {
      el.textContent = '\u2764\uFE0F'.repeat(this.lives) + '\uD83D\uDDA4'.repeat(this.maxLives - this.lives);
    }
  },

  updateModuleHUD() {
    const container = document.getElementById('module-icons');
    if (!container) return;
    const types = Object.keys(AUGMENTS);
    container.innerHTML = types.map(type => {
      const owned = Player.getAugment(type);
      const color = AUGMENTS[type].color;
      if (owned) {
        return '<span class="module-icon owned" style="border-color:' + color + ';color:' + color + '">' + type[0] + ' Lv' + owned.level + '</span>';
      } else {
        return '<span class="module-icon missing">' + type[0] + ' —</span>';
      }
    }).join('') +
    '<span class="module-spacer"></span>' +
    '<span id="shield-display" class="' + (this.hasShield ? '' : 'hidden ') + '">&#128737;</span>';
  },

  gameOver() {
    this.phase = 'gameover';
    Audio.gameover();
    this.updateBossHUD();
    document.getElementById('final-score').textContent = this.score;
    document.getElementById('final-currency').textContent = this.currency;
    document.getElementById('final-level').textContent = this.currentLevel;
    document.getElementById('game-over').classList.remove('hidden');
  },

  restart() {
    this.startGame();
  },

  pauseGame() {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.pauseSelectedIndex = 0;
    this.updateBossHUD();
    document.getElementById('pause-menu').classList.remove('hidden');
    this.updatePauseMenuUI();
    Music.pause();
  },

  resumeGame() {
    if (this.phase !== 'paused') return;
    this.phase = 'playing';
    this.updateBossHUD();
    document.getElementById('pause-menu').classList.add('hidden');
    Music.resume();
  },

  // --- Menus (titre / pause / options) ------------------------------------
  // Un seul moteur de navigation : conteneur CSS + nom du champ d'index.

  updateMenuUI(selector, indexProp) {
    const buttons = document.querySelectorAll(selector);
    buttons.forEach((btn, i) => {
      btn.classList.toggle('selected', i === this[indexProp]);
    });
  },

  menuNavigate(selector, indexProp, dir) {
    const count = document.querySelectorAll(selector).length;
    if (!count) return;
    this[indexProp] = (this[indexProp] + dir + count) % count;
    this.updateMenuUI(selector, indexProp);
  },

  pauseNavigate(dir) {
    if (this.phase !== 'paused' || this.optionsOpen) return;
    this.menuNavigate('#pause-buttons button', 'pauseSelectedIndex', dir);
  },

  pauseSelect() {
    if (this.phase !== 'paused' || this.optionsOpen) return;
    const btn = document.querySelectorAll('#pause-buttons button')[this.pauseSelectedIndex];
    if (!btn) return;

    const action = btn.dataset.action;
    if (action === 'boss') {
      this.startBossTest(btn.dataset.kind);
    } else if (action === 'options') {
      this.openOptions();
    } else if (action === 'quit') {
      this.quitToTitle();
    } else {
      this.resumeGame();
    }
  },

  updatePauseMenuUI() {
    this.updateMenuUI('#pause-buttons button', 'pauseSelectedIndex');
  },

  titleNavigate(dir) {
    if (this.phase !== 'title' || this.optionsOpen) return;
    this.menuNavigate('#title-menu button', 'titleSelectedIndex', dir);
  },

  titleSelect() {
    if (this.phase !== 'title' || this.optionsOpen) return;
    const btn = document.querySelectorAll('#title-menu button')[this.titleSelectedIndex];
    if (!btn) return;
    if (btn.dataset.action === 'options') this.openOptions();
    else this.startGame();
  },

  // Ecran options ouvert par-dessus le titre ou par-dessus la pause : le jeu ne
  // change pas de phase, on masque simplement l'ecran hote (sinon les deux
  // menus translucides se melangent).
  openOptions() {
    this.optionsOpen = true;
    this.optionsReturn = this.phase === 'paused' ? 'pause-menu' : 'title-screen';
    this.optionsSelectedIndex = 0;
    document.getElementById(this.optionsReturn).classList.add('hidden');
    document.getElementById('options-screen').classList.remove('hidden');
    this.updateOptionsUI();
  },

  closeOptions() {
    if (!this.optionsOpen) return;
    this.optionsOpen = false;
    document.getElementById('options-screen').classList.add('hidden');
    if (this.optionsReturn) {
      document.getElementById(this.optionsReturn).classList.remove('hidden');
      this.optionsReturn = null;
    }
  },

  optionsNavigate(dir) {
    if (!this.optionsOpen) return;
    this.menuNavigate('#options-buttons button', 'optionsSelectedIndex', dir);
  },

  optionsSelect() {
    if (!this.optionsOpen) return;
    const btn = document.querySelectorAll('#options-buttons button')[this.optionsSelectedIndex];
    if (!btn) return;
    if (btn.dataset.action === 'toggle') Options.toggle(btn.dataset.key);
    else this.closeOptions();
    this.updateOptionsUI();
  },

  updateOptionsUI() {
    document.querySelectorAll('#options-buttons button.opt-toggle').forEach(btn => {
      const value = btn.querySelector('.opt-value');
      const on = Options.data[btn.dataset.key];
      value.textContent = Options.label(btn.dataset.key);
      value.className = 'opt-value ' + (on ? 'on' : 'off');
    });
    this.updateMenuUI('#options-buttons button', 'optionsSelectedIndex');
  },

  startBossTest(kind) {
    if (this.phase !== 'paused') return;
    document.getElementById('pause-menu').classList.add('hidden');
    Music.resume();

    this.phase = 'playing';
    this.objects = [];
    this.missiles = [];
    this.enemyBullets = [];
    this.consecutiveStars = 0;
    this.hasShield = false;
    this.shieldAppearTimer = 0;
    this.score = 0;
    document.getElementById('score').textContent = '0';

    this.setupBossLevel(this.currentLevel, kind);
  },

  setupBossLevel(level, kind) {
    this.calcPlayArea();
    Player.lastShot = 0;
    this.enemyBullets = [];
    this.boss = createBoss(
      kind || 'NOYAU',
      this.canvas.width, this.canvas.height, this.playLeft, this.playRight,
      level || this.currentLevel
    );

    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('timer').textContent = 'BOSS';
    this.updateBossHudPosition();
    this.updateLivesDisplay();
    this.updateModuleHUD();
    document.getElementById('shield-display').classList.add('hidden');
    this.updateBossHUD();
  },

  updatePauseMenuUI() {
    this.updateMenuUI('#pause-buttons button', 'pauseSelectedIndex');
  },

  quitToTitle() {
    this.phase = 'title';
    Music.stop();
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('title-screen').classList.remove('hidden');
    this.init();
  },

  renderTitleDemo() {
    if (this.objects.length < 8 && Math.random() < 0.03) {
      const types = ['STAR', 'DIAMOND', 'SKULL'];
      const type = types[Math.floor(Math.random() * types.length)];
      const x = this.playLeft + 20 + Math.random() * (this.playRight - this.playLeft - 40);
      const speed = 1.5 + Math.random() * 2;
      this.objects.push(new FallingObject(x, type, speed, this.playLeft, this.playRight));
    }
    for (let i = this.objects.length - 1; i >= 0; i--) {
      this.objects[i].update(this.canvas.height);
      if (!this.objects[i].active) this.objects.splice(i, 1);
    }
  },

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    Renderer.applyShake(ctx);

    Renderer.drawBackground(ctx, w, h, this.score, this.playLeft, this.playRight);
    Renderer.drawWalls(ctx, this.playLeft, this.playRight, w, h, this.score);

    for (const obj of this.objects) {
      obj.draw(ctx);
    }

    for (const m of this.missiles) {
      m.draw(ctx);
    }

    for (const b of this.enemyBullets) {
      b.draw(ctx);
    }

    if (this.boss) {
      this.boss.draw(ctx);
    }

    Player.draw(ctx);

    if (this.hasShield) {
      Renderer.drawShield(ctx, Player.x, Player.y, Player.radius, this.shieldAppearTimer);
    }

    Renderer.drawParticles(ctx);
    Renderer.drawShockwaves(ctx);
    Renderer.drawFloatingTexts(ctx);

    ctx.restore();

    Renderer.drawDamageOverlay(ctx, w, h);
  }
};
