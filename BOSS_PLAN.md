# Plan d'implémentation — Retours visuels du BOSS

> ✅ **STATUT : IMPLÉMENTÉ ET VALIDÉ** — voir §7 (critères cochés) et §10 (résultats mesurés).
> Projet : StellarShards (jeu d'arcade canvas, JS vanilla, pas de build).

## 1. Objectifs

Trois modifications indépendantes :

1. **Retour visuel de dégâts** : l'anneau externe rotatif du boss doit **rétrécir** à mesure
   que le boss perd des PV, pour que le joueur constate ses dégâts.
2. **HUD boss sans chevauchement** : le nom du boss ("Le Noyau") et sa barre de vie se
   superposent actuellement aux niveaux d'armes (`#module-icons`). Il faut un affichage dédié,
   propre, sans recouvrement avec le reste de l'IHM.
3. **Couleur liée aux dégâts, pas aux attaques** : supprimer le changement de couleur pendant
   la phase d'attaque (télégraphe). Le boss ne change de couleur qu'en **subissant** des dégâts.

## 2. Périmètre

- `js/boss.js` — visuel (anneau, couleurs) + suppression de la barre canvas.
- `index.html` — ajout du bloc HUD boss.
- `style.css` — styles du HUD boss.
- `js/game.js` — mise à jour/affichen du HUD boss, retrait de `drawHPBar`.

Aucun changement de gameplay (patterns, PV, dégâts, récompenses).

## 3. Contexte actuel (ancres)

- `js/boss.js:140-188` — `draw(ctx)`. Variables/points clés :
  - `const charging = this.pendingAttack !== null;` (ligne 142) → sert **uniquement** à colorer.
  - Aura : `this.radius * 2.6` (144-150).
  - Anneau externe : rayon fixe `this.radius * 1.5` (159), couleur jaune si `charging` sinon
    violet (161-163).
  - Corps : flash blanc si `this.hitFlash > 0` (172-173) — **déjà correct**.
  - Noyau/œil : `charging ? '#fde047' : '#f472b6'` (183).
- `js/boss.js:190-217` — `drawHPBar(ctx, width)` : barre à `y = 64`, nom `LE NOYAU` à `y - 6`.
- `js/boss.js:129-138` — `hit(damage)` : fixe `this.hitFlash = 120` (ms) et `active = false` à 0 PV.
- `js/game.js:857-859` — `Game.render` appelle `this.boss.drawHPBar(ctx, w)` après `ctx.restore()`.
- `js/game.js:694` — `updateModuleHUD()` injecte `#module-icons` (dont `#shield-display`).
- `index.html:13-25` — `#hud` = `#hud-left` (score/timer), `#hud-center` (`#module-icons`),
  `#hud-right` (⚡ / vies). `#hud` est en `position:absolute; top:16px`.
- `style.css:31-44` — `#hud` (flex, `pointer-events:none`).

Cause du chevauchement : le nom est dessiné **au-dessus** de la barre à `y≈58`, ce qui entre
dans la zone de `#hud-center`; la colonne `#hud-left` (score + timer) descend jusqu'à ~56 px,
et `#module-icons` peut passer sur 2 lignes sur petit écran.

## 4. Modification A — Anneau qui rétrécit avec les PV

**Fichier : `js/boss.js`, méthode `draw`.**

- Calculer le ratio : `const hpRatio = Math.max(0, this.hp / this.maxHp);`
- Remplacer le rayon fixe de l'anneau par une interpolation :
  - `const ringR = this.radius * (1.1 + 0.4 * hpRatio);` → **1.5·r à 100 % PV**, **1.1·r à 0 %**.
  - Important : bornage à ≥ ~1.1·r pour que l'anneau reste **à l'extérieur** du corps
    (rayon du corps = `this.radius`), sinon il se retrouve à l'intérieur.
- Utiliser `ringR` dans la boucle `ctx.arc(0, 0, ringR, ...)` (remplace la ligne 159).
- *(Optionnel, renforce la lisibilité)* faire varier l'aura avec les PV :
  `const auraR = this.radius * (2.2 + 0.4 * hpRatio);` (≈2.6 → 2.2) et l'utiliser aux lignes
  144 et 149. Ne pas descendre sous ~2·r.

## 5. Modification B — Couleur sur dégâts, plus sur attaque

**Fichier : `js/boss.js`, méthode `draw`.**

- **Supprimer** la variable `const charging = ...` (142) : `pendingAttack` reste utilisé par
  `update()`/`fire()`, on découple seulement le visuel.
- Ajouter `const damaged = this.hitFlash > 0;`
- **Anneau** (161-163) :
  ```js
  ctx.strokeStyle = damaged
    ? 'rgba(255, 90, 90, ' + (0.6 + 0.4 * Math.sin(t * 25)) + ')'  // flash de dégâts
    : 'rgba(216, 180, 254, 0.5)';                                   // état normal
  ```
- **Aura** (optionnel) : teinte rouge quand `damaged` :
  `aura.addColorStop(0, damaged ? 'rgba(255,120,120,0.45)' : 'rgba(168,85,247,0.35)');`
- **Noyau/œil** (183) : `ctx.fillStyle = damaged ? '#ffffff' : '#f472b6';`
- Corps (172-173) : **inchangé** (déjà basé sur `hitFlash`).
- *(Optionnel)* `hit()` utilise `hitFlash = 120` ms. Passer à ~160-200 ms pour un flash plus
  lisible ; ne pas dépasser la cadence de tir sinon le flash devient permanent.

## 6. Modification C — HUD boss dédié, sans chevauchement

Approche recommandée : **bloc HTML/CSS dédié** (cohérent avec la séparation
structure/présentation du projet et avec le pattern DOM de `Game`). On supprime la barre
dessinée en canvas.

### 6.1 `index.html`

Insérer **à l'intérieur de `#game-container`**, de préférence juste après le bloc `#hud`
(après la ligne 25), avant `#title-screen` :

```html
<div id="boss-hud" class="hidden">
  <div id="boss-name">LE NOYAU</div>
  <div id="boss-hp-track"><div id="boss-hp-fill"></div></div>
</div>
```

### 6.2 `style.css`

Ajouter (par ex. après les règles `#hud*`) :

```css
#boss-hud {
  position: absolute;
  top: 72px;                 /* sous la zone #hud (top:16 + ~40-56px) */
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  pointer-events: none;      /* les clics traversent vers le canvas */
}
#boss-hud.hidden { display: none; }
#boss-name {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 3px;
  color: #f0abfc;
  text-shadow: 0 0 12px rgba(168, 85, 247, 0.8);
}
#boss-hp-track {
  width: min(520px, 60%);
  height: 16px;
  background: rgba(0, 0, 0, 0.55);
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  overflow: hidden;
}
#boss-hp-fill {
  height: 100%;
  width: 100%;
  background: linear-gradient(90deg, #f472b6, #a855f7);
  transition: width 0.12s linear;
}
```

Repère visuel de la disposition :

```
top:16   [ Score/Timer ]      [ Modules armes ]      [ ⚡  ♥♥♥ ]
top:72                 LE NOYAU
                       [ #########--------- ]        <- #boss-hp-track/fill
≈130                     ( boss )                  <- Boss.y
```

### 6.3 `js/game.js`

- Dans `Boss` (constructor de `boss.js`), ajouter `this.name = 'LE NOYAU';` afin d'éviter la
  duplication du libellé (DRY) et de préparer de futurs boss.
- Ajouter une méthode `Game.updateBossHUD()` :
  ```js
  updateBossHUD() {
    const hud = document.getElementById('boss-hud');
    if (!this.boss) { hud.classList.add('hidden'); return; }
    hud.classList.remove('hidden');
    document.getElementById('boss-name').textContent = this.boss.name;
    const ratio = Math.max(0, this.boss.hp / this.boss.maxHp);
    document.getElementById('boss-hp-fill').style.width = (ratio * 100) + '%';
  },
  ```
- Appeler `this.updateBossHUD();` :
  - dans `updateBossLevel()` (rafraîchit la barre chaque frame pendant le combat) ;
  - dans `setupBossLevel()` (affiche dès le début) ;
  - dans les méthodes de reset où `boss = null` : `init()`, `startGame()`, `startNextLevel()`
    (masque). `quitToTitle()` appelle déjà `init()`.
- Supprimer l'appel `this.boss.drawHPBar(ctx, w);` dans `render()` (game.js:857-859).
- Supprimer la méthode `drawHPBar` de `js/boss.js` (190-217), désormais inutile.

## 7. Critères d'acceptation

- [x] L'anneau externe rétrécit progressivement et visiblement quand les PV baissent
      (≈1.5·r à 100 %, ≈1.1·r à 0 %), sans jamais passer à l'intérieur du corps.
- [x] Plus aucun changement de couleur déclenché par l'attaque : le boss ne change de couleur
      (anneau/aura/œil) **que** lors des dégâts (`hitFlash`).
- [x] Le nom du boss et la barre de vie sont lisibles et **ne chevauchent ni** `#module-icons`,
      ni le score/timer, ni ⚡/vies, en desktop **et** en mobile (largeur ≤ 600 px).
- [x] La largeur de `#boss-hp-fill` suit exactement les PV ; le HUD boss est masqué en dehors
      d'un combat de boss (titre, niveau normal, boutique, pause, game over).
- [x] Non-régression : bouton TEST BOSS, phases 1/2/3, collision balles→joueur, défaite
      (+1 vie, +500 ⚡, écran de fin de niveau) fonctionnent toujours.

## 8. Tests manuels

1. Ouvrir `index.html` (ou via serveur local), `SPACE` pour jouer, `Échap` → **TEST BOSS**.
2. Vérifier la disposition du HUD boss (nom + barre) vs modules d'armes → aucun recouvrement.
3. Tirer sur le boss : observer la barre descendre **et** l'anneau rétrécir, avec un flash rouge
   à chaque impact.
4. Console : `Game.boss.hp = Game.boss.maxHp * 0.1` puis `Game.render()` → anneau proche du minimum.
5. Redimensionner la fenêtre / mode mobile devtools → toujours aucun chevauchement.
6. Vaincre le boss → `#boss-hud` disparaît, récompenses OK.

## 9. Hors périmètre / notes

- Ne pas réintroduire d'indicateur visuel d'attaque (choix produit explicite).
- Pas de nouveau pattern, pas de changement de dégâts/PV.
- ~~Risque à surveiller : si `#module-icons` passe sur plusieurs lignes sur écran très étroit,
  `top:72px` pourrait se rapprocher.~~ → **Pris en charge** : méthode
  `Game.updateBossHudPosition()` applique `#hud.getBoundingClientRect().bottom + 12px` à
  `#boss-hud.style.top`. Appelée dans `resize()` et dans `setupBossLevel()`.
  Si `#hud` est masquée (écran titre/vignette), on réinitialise `style.top` à `''`
  (retombe sur la valeur CSS `72px`). Un seul `getBoundingClientRect` par resize/démarrage
  de combat : pas de recalcul par frame.

## 10. Résultats de validation

Mesures effectuées en navigateur (viewport 1280×720, serveur local) + harnais Node avec
stubs DOM/canvas.

| Critère | Mesure | Résultat |
|---|---|---|
| Anneau 100 % PV | `46 × (1.1 + 0.4×1)` | **69 px** |
| Anneau 30 % PV | `46 × (1.1 + 0.4×0.3)` | **56 px** |
| Anneau 0 % PV | `46 × (1.1 + 0.4×0)` | **50.6 px** (toujours > corps 46 px) |
| Chevauchement `#boss-hud` / `#module-icons` | `getBoundingClientRect()` | **false** (écart `gapIcons` = 27 px) |
| Marge sous `#hud` (normal) | `#boss-hud.top − #hud.bottom` | **12 px** (80 − 68) |
| Marge sous `#hud` (HUD simulé 110 px, icônes sur 2 lignes) | idem | **12 px** (138 − 126) |
| Barre = PV | `hit(maxHp × 0.6)` puis 1 frame | **40 %** |
| HUD masqué | `init` / `startGame` / `startNextLevel` / défaite | **masqué** (×4) |
| HUD visible en combat | `setupBossLevel` | **visible**, nom = `LE NOYAU` |
| Couleur = dégâts | `charging` résiduel dans `boss.js` | **absent** |
| Non-régression défaite | `hit()` → 1 frame | `levelComplete`, `boss=null`, **+500 ⚡**, **+1 vie** |
| Erreurs console | 0 après rechargement complet | **0** |

**Diff final :** `index.html +5`, `style.css +40`, `js/boss.js ±63`, `js/game.js +34`.
