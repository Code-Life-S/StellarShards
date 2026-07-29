const Renderer = {
  particles: [],
  ambientParticles: [],
  floatingTexts: [],
  shakeIntensity: 0,
  shakeRemaining: 0,
  redOverlay: 0,
  stars: [],

  init(width, height) {
    this.redOverlay = 0;
    this.stars = [];
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.5 + Math.random() * 2,
        baseAlpha: 0.05 + Math.random() * 0.2,
        speed: 0.005 + Math.random() * 0.02,
        offset: Math.random() * Math.PI * 2
      });
    }
    this.ambientParticles = [];
    for (let i = 0; i < 30; i++) {
      this.ambientParticles.push(this.makeAmbient(width, height));
    }
  },

  makeAmbient(width, height) {
    const left = Math.random() < 0.5;
    return {
      x: left ? Math.random() * width * 0.2 : width - Math.random() * width * 0.2,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -0.1 - Math.random() * 0.3,
      life: 0.3 + Math.random() * 0.7,
      radius: 1 + Math.random() * 2,
      colorRGB: Math.random() < 0.5 ? '100, 200, 255' : '180, 130, 255'
    };
  },

  addParticles(x, y, colorRGB, count) {
    count = count || 8;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.015 + Math.random() * 0.025,
        colorRGB,
        radius: 2 + Math.random() * 3
      });
    }
  },

  addFloatingText(x, y, text, color) {
    this.floatingTexts.push({ x, y, text, color, life: 1, vy: -1.8 });
  },

  shake(intensity, duration) {
    this.shakeIntensity = intensity || 6;
    this.shakeRemaining = duration || 250;
  },

  update(dt, width, height) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      p.life -= p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.ambientParticles.length - 1; i >= 0; i--) {
      const a = this.ambientParticles[i];
      a.x += a.vx;
      a.y += a.vy;
      a.life -= 0.002;
      if (a.life <= 0 || a.y < -10) {
        this.ambientParticles.splice(i, 1);
      }
    }
    while (this.ambientParticles.length < 30) {
      this.ambientParticles.push(this.makeAmbient(width, height));
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.life -= 0.018;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    if (this.shakeRemaining > 0) {
      this.shakeRemaining -= dt;
      if (this.shakeRemaining < 0) this.shakeRemaining = 0;
    }

    if (this.redOverlay > 0) {
      this.redOverlay -= dt * 0.001;
      if (this.redOverlay < 0) this.redOverlay = 0;
    }
  },

  drawBackground(ctx, width, height, score, playLeft, playRight) {
    const t = Math.min(score / 150, 1);
    const r = Math.floor(10 + t * 20);
    const g = Math.floor(8 + t * 10);
    const b = Math.floor(25 + t * 20);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `rgb(${r + 10}, ${g + 5}, ${b + 15})`);
    gradient.addColorStop(0.5, `rgb(${r}, ${g + 2}, ${b + 5})`);
    gradient.addColorStop(0.85, `rgb(${r * 2}, ${g * 2}, ${b * 3})`);
    gradient.addColorStop(1, `rgb(${r * 3}, ${g * 3}, ${b * 4})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (const s of this.stars) {
      const alpha = s.baseAlpha + 0.15 * Math.sin(Date.now() * s.speed + s.offset);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 210, 255, ${Math.max(0, alpha)})`;
      ctx.fill();
    }

    const floorGlow = ctx.createRadialGradient(
      playLeft + (playRight - playLeft) / 2, height - 20, 10,
      playLeft + (playRight - playLeft) / 2, height, (playRight - playLeft) / 2
    );
    floorGlow.addColorStop(0, `rgba(100, 200, 255, ${0.04 + t * 0.04})`);
    floorGlow.addColorStop(1, 'rgba(100, 200, 255, 0)');
    ctx.fillStyle = floorGlow;
    ctx.fillRect(0, height - 40, width, 40);
  },

  drawWalls(ctx, playLeft, playRight, canvasWidth, canvasHeight, score) {
    const wallGradL = ctx.createLinearGradient(0, 0, playLeft, 0);
    wallGradL.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    wallGradL.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = wallGradL;
    ctx.fillRect(0, 0, playLeft, canvasHeight);

    const wallGradR = ctx.createLinearGradient(canvasWidth - (canvasWidth - playRight), 0, canvasWidth, 0);
    wallGradR.addColorStop(0, 'rgba(0, 0, 0, 0)');
    wallGradR.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    ctx.fillStyle = wallGradR;
    ctx.fillRect(playRight, 0, canvasWidth - playRight, canvasHeight);

    const pillarAlpha = 0.08 + 0.05 * Math.sin(Date.now() * 0.002);
    const pillarGlowL = ctx.createLinearGradient(playLeft - 8, 0, playLeft + 2, 0);
    pillarGlowL.addColorStop(0, `rgba(100, 200, 255, 0)`);
    pillarGlowL.addColorStop(0.5, `rgba(100, 200, 255, ${pillarAlpha})`);
    pillarGlowL.addColorStop(1, `rgba(100, 200, 255, 0)`);
    ctx.fillStyle = pillarGlowL;
    ctx.fillRect(playLeft - 8, 0, 10, canvasHeight);

    const pillarGlowR = ctx.createLinearGradient(playRight - 2, 0, playRight + 8, 0);
    pillarGlowR.addColorStop(0, `rgba(100, 200, 255, 0)`);
    pillarGlowR.addColorStop(0.5, `rgba(100, 200, 255, ${pillarAlpha})`);
    pillarGlowR.addColorStop(1, `rgba(100, 200, 255, 0)`);
    ctx.fillStyle = pillarGlowR;
    ctx.fillRect(playRight - 2, 0, 10, canvasHeight);

    for (const a of this.ambientParticles) {
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.radius * a.life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${a.colorRGB}, ${a.life * 0.3})`;
      ctx.fill();
    }
  },

  drawParticles(ctx) {
    for (const p of this.particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.colorRGB}, ${p.life})`;
      ctx.fill();
    }
  },

  drawFloatingTexts(ctx) {
    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = ft.life;
      ctx.font = 'bold 22px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 10;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  },

  applyShake(ctx) {
    if (this.shakeRemaining > 0) {
      const intensity = this.shakeIntensity * (this.shakeRemaining / 250);
      const dx = (Math.random() - 0.5) * intensity;
      const dy = (Math.random() - 0.5) * intensity;
      ctx.translate(dx, dy);
    }
  },

  drawShield(ctx, px, py, pr, appearTimer) {
    const time = Date.now() * 0.003;
    const appear = Math.min(1, 1 - appearTimer / 400);
    const pulse = 1 + 0.05 * Math.sin(time * 2);
    const r = pr * 2.2 * pulse * appear;

    const glow = ctx.createRadialGradient(px, py, pr * 1.2, px, py, r);
    glow.addColorStop(0, `rgba(100, 200, 255, ${0.15 * appear})`);
    glow.addColorStop(0.5, `rgba(100, 200, 255, ${0.07 * appear})`);
    glow.addColorStop(1, 'rgba(100, 200, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, pr * 1.4 * appear, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(100, 200, 255, ${(0.35 + 0.15 * Math.sin(time)) * appear})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    const cells = 6;
    for (let i = 0; i < cells; i++) {
      const angle = time * 0.4 + i * Math.PI * 2 / cells;
      const cx = px + Math.cos(angle) * pr * 1.15 * appear;
      const cy = py + Math.sin(angle) * pr * 1.15 * appear;

      ctx.beginPath();
      for (let j = 0; j < 6; j++) {
        const a = time * 0.6 + j * Math.PI / 3;
        const hr = pr * 0.2 * appear;
        const hx = cx + Math.cos(a) * hr;
        const hy = cy + Math.sin(a) * hr;
        if (j === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(100, 200, 255, ${(0.25 + 0.1 * Math.sin(time + i)) * appear})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.beginPath();
    for (let i = 0; i < cells; i++) {
      const angle = time * 0.4 + i * Math.PI * 2 / cells;
      const cx = px + Math.cos(angle) * pr * 1.15 * appear;
      const cy = py + Math.sin(angle) * pr * 1.15 * appear;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(100, 200, 255, ${0.12 * appear})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  },

  shieldBreakEffect(x, y) {
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.012 + Math.random() * 0.02,
        colorRGB: '100, 200, 255',
        radius: 2 + Math.random() * 4
      });
    }
    this.addFloatingText(x, y - 25, 'SHIELD BROKEN!', '#64c8ff');
  },

  drawDamageOverlay(ctx, width, height) {
    if (this.redOverlay > 0) {
      ctx.fillStyle = `rgba(200, 30, 30, ${this.redOverlay * 0.3})`;
      ctx.fillRect(0, 0, width, height);
    }
  }
};
