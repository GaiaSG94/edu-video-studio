# EduVideo Studio

Générateur de **vidéos éducatives à partir d'un texte**. Le site envoie le texte à **Claude** (Anthropic) qui produit un storyboard structuré, puis **HyperFrames** assemble une vidéo 1920×1080 avec animation et voix off.

## Fonctionnement

1. L'utilisateur colle un texte et choisit la langue.
2. Claude renvoie un storyboard JSON (titre, 3 à 5 scènes, points clés, narration) via un outil structuré.
   - Sans `ANTHROPIC_API_KEY`, un générateur local de démo prend le relais pour que le site reste utilisable.
3. La voix off est générée avec ElevenLabs si une clé est présente, sinon avec Kokoro en local via `hyperframes tts`, sinon la vidéo est muette.
4. La durée de chaque scène est calée sur son audio, la composition HTML est construite, puis HyperFrames rend le MP4.
5. L'interface affiche la progression, le storyboard et le lecteur vidéo.

## Prérequis

- Node.js 20+ (testé avec Node 24)
- Chrome ou Chromium
- FFmpeg / FFprobe dans le `PATH`
- Un compte Anthropic avec une clé API (pour la génération réelle du storyboard)

## Installation

```bash
npm install
cp .env.example .env.local
# Renseigne ANTHROPIC_API_KEY dans .env.local
npm run dev
```

Ouvre http://localhost:3000.

### Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `ANTHROPIC_API_KEY` | Clé du compte Claude. Obligatoire pour le mode réel. |
| `ANTHROPIC_MODEL` | Modèle utilisé (défaut `claude-sonnet-4-5`). |
| `ELEVENLABS_API_KEY` | Active la voix off ElevenLabs. |
| `ELEVENLABS_VOICE_ID` | Voix ElevenLabs (défaut Rachel). |

Ne jamais committer `.env.local` : il est ignoré par Git. Les clés peuvent aussi être injectées en mémoire via le script Bitwarden `HACKATONS/tools/with-secrets.ps1` du workspace parent.

## Commandes

```bash
npm run dev        # serveur de développement
npm run build      # build de production
npm run start      # serveur de production
npm run lint       # ESLint
npm run typecheck  # TypeScript
```

## API

- `POST /api/generate` — `{ "text": "...", "language": "fr", "voice": true }` → `{ "id": "..." }`
- `GET /api/jobs/:id` — état et progression de la tâche
- `GET /api/video/:id` — diffusion du MP4

## Limites

- Les tâches sont stockées en mémoire : redémarrer le serveur efface l'historique.
- Le rendu se fait sur le serveur avec Chrome + FFmpeg : prévoir un serveur Node persistant (pas un déploiement serverless sans ces outils).
- Le texte est limité à 8000 caractères et produit 3 à 5 scènes.
