## Rules (Not wasting tokens)
- Lire le minimum de fichiers nécessaire
- Toujours proposer un plan avant de coder
- Limiter les réponses à 150 mots
- Produire des diffs plutôt que du code complet
- Ne jamais relire un fichier déjà analysé sauf demande
- Ignorer node_modules, build, dist, coverage
- Utiliser ripgrep avant d'ouvrir des fichiers
- Modifier uniquement les fichiers explicitement cités

## Tools to use (installed for you)
You can use the followinf CLI tools : 
- rg (ripgrep) instead of grep : find text quickly
- fzf (fuzzy finder)
- fd instead of find : locate files without traversing manually
- bat instead of cat : display files with line numbers and syntax highlighting
- jq : inspect JSON files
- yq : inspect YAML files
- tree : summarize project layout

## Architecture Overview

We use a modular, template-based architecture with clean separation of concerns:
- **HTML**: Structure and content only
- **CSS**: Presentation and styling only
- **JavaScript**: Logic and behavior only

We want a clear separation of concerns, so no HTML or CSS code should be in JS files - or only when absolutely necessary to update a style or a part of the DOM.
Follow DRY principles : Don't Repeat Yourself : no code duplication.
If a few lines or code are in more than one place, we then should create a component that we can reuse.