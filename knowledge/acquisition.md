# Acquisition — pistes et statut

> Rédigé le 29/07/2026. Note de travail interne — **pas** un argumentaire de rendez-vous.
> Contexte : les mots-clés « recherche d'EHPAD » sont très disputés (6-7 acteurs sérieux, dont
> deux à ~1 M€/mois). Se battre sur les requêtes transactionnelles génériques est perdu d'avance.

## Le principe qui organise tout

Le problème n'est pas que les mots-clés soient chers. C'est que **la seule chose qu'on sache
faire d'un visiteur aujourd'hui, c'est un formulaire** — et un formulaire ne rentabilise que les
requêtes transactionnelles, là où tout le monde enchérit.

Personne n'enchérit sur « comment remplir le dossier APA », « obligation alimentaire enfants
EHPAD », « GIR 2 c'est quoi », « que faire quand ma mère ne peut plus rester seule ». Pas par
manque de volume — **parce que ça ne convertit pas en formulaire**. Quelqu'un qui cherche une
réponse administrative ne franchit pas 18 écrans. Le clic est perdu.

Ces mêmes personnes **parlent** à Emma. Elles cherchent exactement ce qu'elle sait faire :
expliquer, rassurer, pré-remplir. Et elles sont **2 à 6 mois avant la décision**.

Deux conséquences directes :
1. Ce trafic est **bien moins cher**, parce que personne d'autre ne peut le monétiser.
2. Le lead qui en sort est **structurellement moins dupliqué** — on arrive avant les autres, pas
   seulement plus vite. C'est la réponse non technique à la contrainte de dédup qui a tué le
   modèle « vente de leads » (cf. `DECISIONS.md`, 28/07).

> ⚠️ « Personne n'enchérit dessus » est un raisonnement, pas une mesure. À confirmer par un
> relevé de CPC réel sur un échantillon de ces requêtes avant d'engager du budget.

---

## Les pistes

### 1. 🟢 La base froide de Cap Retraite — la plus sûre, et gratuite

Il route ses leads par qualité, urgence, capacité financière et département. Les « trop tôt »,
les budgets qui ne passent pas, les départements sans place sont abandonnés — un conseiller ne
peut pas se le permettre, son temps est rare.

Emma les reprend à **coût marginal nul**. Zéro enchère, zéro canal nouveau, données déjà chez
lui, consentement déjà obtenu à la collecte initiale.

**C'est le pilote idéal** : rien à acheter, rien à intégrer, aucun risque pour lui, mesurable en
semaines. C'est la demande de fin de rendez-vous, à la place d'un lot de leads payants. Et c'est
le seul terrain où l'inconnue d'adoption se teste sans que personne ne paie pour le savoir.

### 2. 🟢 La longue traîne administrative — le plan de contenu existe déjà

`data/documents.json` catalogue **9 documents** : dossier d'admission, volet médical, grille
AGGIR, demande d'APA, adresses des Conseils départementaux, aide-mémoire de visite, préparation
d'entrée, accès métro, visite vidéo.

**Ce catalogue *est* le plan de contenu.** Chaque document répond à une requête réelle,
informationnelle, peu disputée, et se termine naturellement par « Emma vous le pré-remplit ». Ce
n'est pas du contenu fabriqué pour ranker — c'est de la vraie utilité, avec l'outil au bout.

Levier décisif : **l'adresse du bon Conseil départemental est calculée automatiquement** depuis
la ville (`_geo.js`). Soit ~100 pages départementales à intention forte (« où envoyer mon dossier
APA dans le 92 »), quasi sans concurrence publicitaire, et impossibles à traiter par un
formulaire.

### 3. 🟢 L'outil GIR gratuit — l'aimant, déjà codé

Le widget AGGIR interactif tourne déjà dans `demo.html`. Sorti en **page publique autonome**
(« estimez le GIR de votre parent en 6 questions ») :

- requête qui existe et se cherche par son nom ;
- c'est un **outil**, pas un formulaire — donc partageable, citable, et il attire des liens
  (le nerf du SEO, et ce qui fait baisser le coût de tout le reste) ;
- l'entrée en conversation la plus naturelle : à la fin du calcul, Emma est déjà là.

C'est précisément l'écran où le comparateur concurrent demande à la famille de trancher elle-même
son GIR. On ne critique pas leur parcours — on publie la version qui aide.

### 4. 🟡 Les prescripteurs — solide mais lent

Assistantes sociales hospitalières, CLIC, services APA des Conseils départementaux, France
Alzheimer, médecins traitants. **C'est là que la demande naît, avant Google.** Une assistante
sociale d'hôpital gère des sorties toutes les semaines et cherche des outils à donner aux
familles.

Zéro enchère, prescription répétée, légitimité qu'aucune publicité n'achète. Mais ça s'installe
en mois : à lancer maintenant, à ne pas compter dessus pour le trimestre.

### 5. 🟡 Le local **qualifié**, pas le local générique

Sur « EHPAD [ville] », les gros sont déjà premiers : s'y battre est perdu d'avance. Un cran plus
bas, la concurrence s'effondre et l'intention monte :

- « EHPAD habilité aide sociale [département] »
- « EHPAD unité protégée Alzheimer [ville] »
- « EHPAD moins de 2 500 € [département] »

On a les données pour générer ces pages : les 350 résidences de `data/ehpads.json` portent tarif,
département et type. C'est le SEO programmatique déjà prévu (~390 pages), mais braqué sur les
requêtes que les gros ne descendent pas chercher.

### 6. 🟢 Emma sur une toile de sites existante

Si le partenariat se fait : le trafic est **déjà acheté**, l'autorité **déjà construite**. Chaque
point de conversion gagné est de la marge pure sur un coût déjà engagé. C'est la version rapide,
sans acquisition nouvelle — mais elle suppose l'intégration, donc elle vient après le pilote.

---

## ⚠️ Une nouvelle marque ne résout **pas** le coût des mots-clés

À dire clairement si l'idée revient : une marque neuve part de zéro en autorité, paie les mêmes
enchères, et met 12-18 mois à ranker. « On lance une landing pour capter moins cher » ne marchera
pas.

Une entité distincte se justifie pour de vraies raisons, mais **aucune n'est une raison
d'acquisition** :

- **ne pas cannibaliser** un SEO existant (deux sites du même groupe sur la même requête = perte
  nette) ;
- **porter un positionnement** qu'une marque de comparateur ne peut pas tenir — « l'outil qui
  vous aide gratuitement » n'est pas crédible sous une enseigne qui vend des mises en relation ;
- **isoler juridiquement** l'usage des données d'entraînement.

**Recommandation** : le volume immédiat par le trafic existant ; une marque distincte **seulement**
pour le contenu administratif et l'outil GIR, parce que ce contenu perd sa crédibilité sous une
marque de comparateur.

---

## Récapitulatif

| Piste | Statut | Délai |
|---|---|---|
| Base froide réactivée | **Sûr** — zéro coût, données existantes | semaines |
| Contenu administratif + outil GIR | **Sûr sur le fond**, incertain sur le délai | 3-6 mois |
| Emma sur un trafic existant | **Sûr** — déjà payé | suppose l'intégration |
| Prescripteurs | Solide | mois |
| Local qualifié (longue traîne) | Solide | 3-6 mois |
| Nouvelle marque pour capter moins cher | **Ne marchera pas** | — |

## L'inconnue qui commande tout

Le **taux d'engagement en conversation des 45-65 ans**. Toutes ces pistes en dépendent. Seuils de
validation déjà posés : engagement chat > 8 % · étape 3 > 35 % des engagés · complétion > 50 %.
En dessous → framing hybride « Emma + conseiller humain », dont le mécanisme existe déjà
(`leads.js`, `CONSEILLER_TEL`).

Une conversation coûte ≈ 0,20 € : **risque paramétrique, pas existentiel**. Raison de plus de
commencer par la base froide, où l'échec ne coûte rien.
