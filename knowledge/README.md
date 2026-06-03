# Biblio Emma — apprendre des vrais appels

Ce dossier est le **corpus qui fait progresser Emma**. On part de vrais appels de conseillers
(comme Alex ↔ famille) pour extraire les réflexes d'une vraie conseillère, puis on en distille
des règles qui affinent le prompt d'Emma (`pages/functions/api/chat.js`).

Emma ne fait **pas** de fine-tuning : elle s'améliore parce que son **prompt** s'enrichit de ce corpus.

## La boucle d'apprentissage

```
Appels réels (.m4a)
   └─(Whisper)──────────→ transcripts
        └─(Claude, tool use)──→ fiches conseillères structurées   → knowledge/fiches/
             └─(Claude, synthèse)─→ playbook                      → knowledge/emma-playbook.md
                  └─(humain)────────→ règles + formulations        → chat.js (BASE_SYSTEM_PROMPT)
```

À chaque nouvel appel ajouté, le corpus grandit et le playbook s'affine → Emma pose de meilleures
questions, capte mieux les données du lead (nom, date de naissance, CP+ville, puis délai/rayon/budget)
et gère mieux les objections.

## Outil

Tout se fait dans le notebook Colab :

**`notebooks/emma_transcription_biblio.ipynb`**

Ouvre-le directement dans Colab :
`https://colab.research.google.com/github/gityoni/smartseniors/blob/claude/tender-volta-zGmub/notebooks/emma_transcription_biblio.ipynb`
(repo privé → autorise Colab à accéder à GitHub, ou télécharge le `.ipynb` et fais `Importer un notebook`).

Le notebook :
1. **Transcrit** un ou plusieurs `.m4a` (Whisper `large-v3`, FR) — dépose plusieurs appels d'un coup.
2. **Extrait** une fiche conseillère structurée et **anonymisée** via `claude-opus-4-8` (tool use forcé + prompt caching).
3. **Synthétise** un playbook prêt à coller dans le prompt d'Emma.

> Pas de diarization : Claude attribue les rôles (conseiller / famille) à partir du contexte — plus simple et plus robuste dans Colab.

## Arborescence

| Dossier / fichier | Rôle | Versionné ? |
|---|---|---|
| `transcripts/raw/` | Transcripts bruts nominatifs | ❌ ignoré (git) — **RGPD** |
| `transcripts/clean/` | Transcripts anonymisés | ✅ |
| `fiches/` | Fiches conseillères structurées (JSON) | ✅ |
| `emma-playbook.md` | Synthèse → source du prompt Emma | ✅ |

## RGPD — règle absolue

Un appel réel contient des données personnelles et de santé d'une vraie famille.
- Les transcripts **bruts** restent en local dans `transcripts/raw/` (ignoré par git).
- On ne versionne que des versions **anonymisées** (`transcripts/clean/`) et les fiches.
- Le notebook anonymise déjà les verbatims des fiches (nom de famille, téléphone, email → `[ANONYMISÉ]`).
