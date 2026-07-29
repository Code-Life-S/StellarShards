const Input = {
  keys: {},
  justPressed: {},

  init() {
    document.addEventListener('keydown', e => {
      if (!this.keys[e.key]) {
        this.justPressed[e.key] = true;
      }
      this.keys[e.key] = true;
      if (e.key === ' ') e.preventDefault();
    });
    document.addEventListener('keyup', e => {
      this.keys[e.key] = false;
    });
  },

  isLeft() {
    return !!(this.keys['ArrowLeft'] || this.keys['q'] || this.keys['Q']);
  },

  isRight() {
    return !!(this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']);
  },

  isUp() {
    return !!(this.keys['ArrowUp'] || this.keys['z'] || this.keys['Z']);
  },

  isDown() {
    return !!(this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']);
  },

  isShooting() {
    return !!this.keys[' '];
  },

  consumePress(key) {
    if (this.justPressed[key]) {
      this.justPressed[key] = false;
      return true;
    }
    return false;
  },

  clearPressed() {
    this.justPressed = {};
  }
};
