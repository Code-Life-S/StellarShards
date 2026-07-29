const Player = {
  x: 400,
  y: 550,
  radius: 18,
  trail: [],
  weapons: [],
  activeWeaponIdx: 0,
  lastShot: 0,

  init(canvasWidth, canvasHeight) {
    this.x = canvasWidth / 2;
    this.y = canvasHeight - 50;
    this.trail = [];
    this.weapons = [{ type: 'BASIC', level: 1 }];
    this.activeWeaponIdx = 0;
    this.lastShot = 0;
  },

  resetWeapons() {
    this.weapons = [{ type: 'BASIC', level: 1 }];
    this.activeWeaponIdx = 0;
  },

  update(playLeft, playRight, playTop, playBottom) {
    if (Input.isLeft()) {
      this.x -= CONFIG.playerSpeed;
    }
    if (Input.isRight()) {
      this.x += CONFIG.playerSpeed;
    }
    if (Input.isUp()) {
      this.y -= CONFIG.playerSpeed;
    }
    if (Input.isDown()) {
      this.y += CONFIG.playerSpeed;
    }

    this.x = Math.max(playLeft + this.radius, Math.min(playRight - this.radius, this.x));
    this.y = Math.max(playTop + this.radius, Math.min(playBottom - this.radius, this.y));

    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > 12) {
      this.trail.pop();
    }

    if (Input.switchLeft()) {
      this.switchWeapon(-1);
    }
    if (Input.switchRight()) {
      this.switchWeapon(1);
    }
  },

  switchWeapon(dir) {
    if (this.weapons.length < 2) return;
    this.activeWeaponIdx = (this.activeWeaponIdx + dir + this.weapons.length) % this.weapons.length;
    document.getElementById('weapon-name').textContent = this.weapons[this.activeWeaponIdx].type;
    document.getElementById('weapon-level').textContent = 'Lv.' + this.weapons[this.activeWeaponIdx].level;
  },

  getActiveWeapon() {
    return this.weapons[this.activeWeaponIdx];
  },

  canShoot(timestamp) {
    const weapon = this.getActiveWeapon();
    const cfg = WEAPONS[weapon.type].levels[weapon.level - 1];
    return timestamp - this.lastShot >= cfg.fireRate;
  },

  fire(timestamp) {
    const weapon = this.getActiveWeapon();
    const cfg = WEAPONS[weapon.type].levels[weapon.level - 1];
    this.lastShot = timestamp;

    const missiles = [];
    const angleStep = cfg.spread > 0 ? (cfg.spread * Math.PI / 180) : 0;
    const startAngle = cfg.count > 1 ? -(cfg.count - 1) * angleStep / 2 : 0;

    for (let i = 0; i < cfg.count; i++) {
      const angle = startAngle + i * angleStep;
      const vx = Math.sin(angle) * cfg.speed;
      const vy = -Math.cos(angle) * cfg.speed;
      const m = new Missile(this.x, this.y - this.radius, vx, vy, weapon.type, weapon.level);
      missiles.push(m);
    }

    const soundMap = {
      BASIC: 'shoot',
      SPREAD: 'spread',
      RAPID: 'rapid',
      HEAVY: 'heavy',
      PIERCING: 'piercing'
    };
    Audio[soundMap[weapon.type]]();

    return missiles;
  },

  hasWeapon(type) {
    return this.weapons.some(w => w.type === type);
  },

  getWeapon(type) {
    return this.weapons.find(w => w.type === type);
  },

  unlockWeapon(type) {
    if (this.hasWeapon(type)) {
      const w = this.getWeapon(type);
      if (w.level < 3) {
        w.level++;
      }
    } else {
      this.weapons.push({ type, level: 1 });
      this.activeWeaponIdx = this.weapons.length - 1;
    }
    document.getElementById('weapon-name').textContent = this.weapons[this.activeWeaponIdx].type;
    document.getElementById('weapon-level').textContent = 'Lv.' + this.weapons[this.activeWeaponIdx].level;
  },

  draw(ctx) {
    for (let i = 0; i < this.trail.length; i++) {
      const t = 1 - i / this.trail.length;
      const alpha = t * 0.25;
      const r = this.radius * (0.3 + t * 0.7);
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
      this.x - 5, this.y - 5, 2,
      this.x, this.y, this.radius
    );
    gradient.addColorStop(0, '#88ddff');
    gradient.addColorStop(1, '#44aadd');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = '#b3eeff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
};
