document.addEventListener('DOMContentLoaded', () => {
  Audio.init();
  Input.init();
  Game.init();
  Options.load();

  let lastTimestamp = 0;

  const onMenuAction = () => {
    Audio.resume();
    if (Game.phase === 'title') {
      Game.startGame();
    } else if (Game.phase === 'gameover') {
      Game.restart();
    }
  };

  const isNavUp = k => k === 'ArrowUp' || k === 'z' || k === 'Z';
  const isNavDown = k => k === 'ArrowDown' || k === 's' || k === 'S';
  const isSelect = k => k === 'Enter' || k === ' ';

  document.addEventListener('keydown', e => {
    // Ecran options : pris en priorite, quel que soit l'ecran d'ouverture.
    if (Game.optionsOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        Game.closeOptions();
      } else if (isNavUp(e.key) || isNavDown(e.key)) {
        e.preventDefault();
        Game.optionsNavigate(isNavUp(e.key) ? -1 : 1);
      } else if (isSelect(e.key)) {
        e.preventDefault();
        Game.optionsSelect();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (Game.phase === 'playing') {
        Game.pauseGame();
      } else if (Game.phase === 'paused') {
        Game.resumeGame();
      }
      return;
    }
    if (Game.phase === 'paused') {
      if (isNavUp(e.key) || isNavDown(e.key)) {
        e.preventDefault();
        Game.pauseNavigate(isNavUp(e.key) ? -1 : 1);
      } else if (isSelect(e.key)) {
        e.preventDefault();
        Game.pauseSelect();
      }
      return;
    }
    if (e.key === ' ') {
      e.preventDefault();
      if (Game.phase === 'playing') return;
      Audio.resume();
      if (Game.phase === 'title') {
        Game.titleSelect();
      } else if (Game.phase === 'gameover') {
        onMenuAction();
      } else if (Game.phase === 'levelComplete') {
        Game.openShop();
      } else if (Game.phase === 'shop') {
        Game.buySelectedCard();
      }
    } else if (Game.phase === 'title') {
      if (isNavUp(e.key) || isNavDown(e.key)) {
        e.preventDefault();
        Game.titleNavigate(isNavUp(e.key) ? -1 : 1);
      } else if (isSelect(e.key)) {
        e.preventDefault();
        Game.titleSelect();
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
      } else if (e.key === 's' || e.key === 'S') {
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

  // Menus : un seul ecouteur delogue par conteneur, meme logique que le clavier.
  function bindMenu(containerId, indexProp, selectFn) {
    document.getElementById(containerId).addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const buttons = document.querySelectorAll('#' + containerId + ' button');
      Game[indexProp] = Array.prototype.indexOf.call(buttons, btn);
      Game.updateMenuUI('#' + containerId + ' button', indexProp);
      Audio.resume();
      selectFn();
    });
  }

  bindMenu('pause-buttons', 'pauseSelectedIndex', () => Game.pauseSelect());
  bindMenu('title-menu', 'titleSelectedIndex', () => Game.titleSelect());
  bindMenu('options-buttons', 'optionsSelectedIndex', () => Game.optionsSelect());

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
