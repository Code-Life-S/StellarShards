document.addEventListener('DOMContentLoaded', () => {
  Audio.init();
  Input.init();
  Game.init();

  let lastTimestamp = 0;

  const onMenuAction = () => {
    Audio.resume();
    if (Game.phase === 'title') {
      Game.startGame();
    } else if (Game.phase === 'gameover') {
      Game.restart();
    }
  };

  document.addEventListener('keydown', e => {
    if (e.key === ' ') {
      e.preventDefault();
      if (Game.phase === 'playing') return;
      Audio.resume();
      if (Game.phase === 'title' || Game.phase === 'gameover') {
        onMenuAction();
      } else if (Game.phase === 'levelComplete') {
        Game.openShop();
      } else if (Game.phase === 'shop') {
        Game.buySelectedCard();
      }
    } else if (Game.phase === 'shop') {
      if (e.key === 'q' || e.key === 'Q' || e.key === 'ArrowLeft') {
        e.preventDefault();
        Game.shopNavigate(-1);
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        e.preventDefault();
        Game.shopNavigate(1);
      } else if (e.key === 'r' || e.key === 'R') {
        Game.rerollShop();
      } else if (e.key === 's' || e.key === 'S' || e.key === 'Escape') {
        Game.closeShop();
      }
    }
  });

  document.getElementById('game-canvas').addEventListener('click', () => {
    Audio.resume();
    if (Game.phase === 'title') {
      Game.startGame();
    } else if (Game.phase === 'gameover') {
      Game.restart();
    } else if (Game.phase === 'levelComplete') {
      Game.openShop();
    }
  });
  document.getElementById('game-canvas').addEventListener('touchstart', () => {
    Audio.resume();
    if (Game.phase === 'title') {
      Game.startGame();
    } else if (Game.phase === 'gameover') {
      Game.restart();
    } else if (Game.phase === 'levelComplete') {
      Game.openShop();
    }
  }, { passive: true });

  document.getElementById('shop-cards').addEventListener('click', e => {
    const btn = e.target.closest('.shop-buy-btn');
    if (btn && Game.phase === 'shop') {
      Game.buyCard(parseInt(btn.dataset.index));
    }
  });

  document.getElementById('shop-reroll').addEventListener('click', () => {
    if (Game.phase === 'shop') {
      Game.rerollShop();
    }
  });

  document.getElementById('shop-skip').addEventListener('click', () => {
    if (Game.phase === 'shop') {
      Game.closeShop();
    }
  });

  function gameLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const dt = Math.min(timestamp - lastTimestamp, 50);
    lastTimestamp = timestamp;

    Game.update(dt, timestamp);

    Game.render();
    Input.clearPressed();

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
});
