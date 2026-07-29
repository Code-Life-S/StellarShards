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
    this.consecutiveStars = 0;
    this.hasShield = false;
    this.shieldAppearTimer = 0;
    this.titleTimer = 0;
    this.currentLevel = 1;
    this.rerollsLeft = 2;
    this.shopSelectedIndex = 0;

    Player.init(this.canvas.width, this.canvas.height);
    Spawner.init();
    Renderer.init(this.canvas.width, this.canvas.height);

    document.getElementById('title-screen').classList.remove('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('level-complete').classList.add('hidden');
    document.getElementById('shop-overlay').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('score').textContent = '0';
    document.getElementById('currency-display').textContent = '0';
    this.updateLivesDisplay();
    this.updateModuleHUD();
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
    this.consecutiveStars = 0;
    this.hasShield = false;
    this.shieldAppearTimer = 0;
    this.titleTimer = 0;
    this.currentLevel = 1;
    this.rerollsLeft = 2;
    this.shopSelectedIndex = 0;

    Player.init(this.canvas.width, this.canvas.height);
    Spawner.init();
    Renderer.init(this.canvas.width, this.canvas.height);
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
  },

  update(dt, timestamp) {
    if (this.phase !== 'playing') {
      if (this.phase === 'title') {
        this.renderTitleDemo();
      }
      Renderer.update(dt, this.canvas.width, this.canvas.height);
      return;
    }

    Player.update(this.playLeft, this.playRight, this.playTop, this.playBottom);

    if (this.shieldAppearTimer > 0) {
      this.shieldAppearTimer -= dt;
      if (this.shieldAppearTimer < 0) this.shieldAppearTimer = 0;
    }

    this.levelTimer -= dt;
    if (this.levelTimer <= 0) {
      this.completeLevel();
      return;
    }
    document.getElementById('timer').textContent = Math.ceil(this.levelTimer / 1000);

    const diff = this.getDifficulty();
    Spawner.update(timestamp, this.objects, this.playLeft, this.playRight, diff, this.currentLevel);

    if (Input.isShooting() && Player.canShoot(timestamp)) {
      const newMissiles = Player.fire(timestamp);
      this.missiles.push(...newMissiles);
    }

    this.updateMissiles();
    this.checkMissileCollisions();
    this.checkObjectCollisions();

    if (this.currentLevel >= 2 && this.objects.length === 0 && Spawner.inPause) {
      Spawner.schedulePowerup();
    }

    Renderer.update(dt, this.canvas.width, this.canvas.height);
  },

  updateMissiles() {
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      this.missiles[i].update();
      if (!this.missiles[i].active) {
        this.missiles.splice(i, 1);
      }
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
    document.getElementById('final-score').textContent = this.score;
    document.getElementById('final-currency').textContent = this.currency;
    document.getElementById('final-level').textContent = this.currentLevel;
    document.getElementById('game-over').classList.remove('hidden');
  },

  restart() {
    this.startGame();
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

    Player.draw(ctx);

    if (this.hasShield) {
      Renderer.drawShield(ctx, Player.x, Player.y, Player.radius, this.shieldAppearTimer);
    }

    Renderer.drawParticles(ctx);
    Renderer.drawFloatingTexts(ctx);

    ctx.restore();

    Renderer.drawDamageOverlay(ctx, w, h);
  }
};
