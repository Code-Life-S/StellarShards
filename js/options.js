// Options persistees (localStorage).
//
// Chaque option est une cle booleenne de Options.data. Ajouter une option :
//   1. l'ajouter ici,
//   2. ajouter un bouton .opt-toggle dans #options-screen (index.html),
//   3. l'appliquer dans apply().
const Options = {
  storageKey: 'stellarShards.options',
  data: { sound: true, music: true },

  load() {
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') {
        for (const key in this.data) {
          if (key in parsed) this.data[key] = !!parsed[key];
        }
      }
    } catch (_) {}
    this.apply();
  },

  save() {
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (_) {}
  },

  toggle(key) {
    this.set(key, !this.data[key]);
  },

  set(key, value) {
    if (!(key in this.data)) return;
    this.data[key] = !!value;
    this.save();
    this.apply();
  },

  // Applique immediatement (son coupe au vol, musique en fondu sur le gain).
  apply() {
    Audio.enabled = this.data.sound;
    if (this.data.music) Music.unmute();
    else Music.mute();
  },

  label(key) {
    return this.data[key] ? 'ON' : 'OFF';
  }
};
