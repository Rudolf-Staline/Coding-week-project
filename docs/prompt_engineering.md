# Prompt Engineering -- Journal de bord

Ce document retrace comment on a utilise des agents IA (Claude, ChatGPT,
Copilot) pour developper PediAppend. On est 5 dans l'equipe. Le principe
est simple : on prend la tache, on cree les dossiers et les fichiers
vides, et l'agent IA implemente directement dans le code. On relit
tout avant de merge.

---

## Table des matieres

1. [Workflow general](#1-workflow-general)
2. [Phase 1 -- Exploration des donnees (EDA)](#2-phase-1----exploration-des-donnees-eda)
3. [Phase 2 -- Pipeline de preprocessing](#3-phase-2----pipeline-de-preprocessing)
4. [Phase 3 -- Entrainement et selection du modele](#4-phase-3----entrainement-et-selection-du-modele)
5. [Phase 4 -- Explainability (SHAP)](#5-phase-4----explainability-shap)
6. [Phase 5 -- Application web Flask](#6-phase-5----application-web-flask)
7. [Phase 6 -- Tests et CI/CD](#7-phase-6----tests-et-cicd)
8. [Phase 7 -- Revue finale et refactoring](#8-phase-7----revue-finale-et-refactoring)
9. [Bilan](#9-bilan)

---

## 1. Workflow general

```
  Developpeur                          Agent IA
  -----------                          --------
  Comprend la tache assignee
  Cree la structure de dossiers
  et les fichiers vides
          ---- prompt -------->
                                       Implemente les fonctions
                                       dans les fichiers existants
          <--- code genere ----
  Revue de code
  Validation / demande
  de corrections
          ---- correction ---->
                                       Corrige le code
          <--- code corrige ---
  Merge dans main
```

On repete ce cycle plusieurs fois par tache. Les sections suivantes
montrent les prompts reels envoyes et ce qu'on a obtenu.

---

## 2. Phase 1 -- Exploration des donnees (EDA)

Responsable : Membre 1
Fichier : `notebooks/eda.ipynb`

### Prompt 1

> J'ai cree un notebook `notebooks/eda.ipynb` avec les sections suivantes
> en markdown : chargement, valeurs manquantes, equilibre des classes,
> outliers, correlations, optimisation memoire. Pour chaque section,
> implemente le code correspondant en utilisant le dataset UCI #938
> (Regensburg Pediatric Appendicitis). Utilise seaborn et matplotlib
> pour les visualisations. Sauvegarde les figures dans `reports/figures/`.

L'agent a produit tout le code d'un coup : telechargement via `ucimlrepo`,
heatmaps de valeurs manquantes, barplots de classes, boxplots, matrice de
Pearson, tests Mann-Whitney U. Il avait meme choisi une palette coherente
sans qu'on le demande (rouge = appendicite, vert = sain).

### Prompt 2

> Dans la section "Valeurs manquantes", ajoute une demonstration de
> l'imputation par regression lineaire. Identifie les paires de variables
> avec une correlation >= 0.80, montre un scatter plot avec la droite de
> regression, et compare la distribution des valeurs predites vs originales.

Ca a marche du premier coup. Scatter plot, histogramme de densite, et
un fallback propre quand aucune paire ne contient de NaN.

### Prompt 3

> Le notebook est fonctionnel mais les cellules de code contiennent des
> blocs de commentaires trop lourds (# ===...===). Deplace les
> explications dans les cellules markdown et garde seulement des
> commentaires inline courts dans le code.

On a du faire ce prompt parce que l'agent avait mis des bandeaux de
10 lignes de commentaires au debut de chaque cellule de code. Le resultat
etait illisible. Apres correction, les explications sont dans le markdown
et le code est propre.

---

## 3. Phase 2 -- Pipeline de preprocessing

Responsable : Membre 2
Fichiers : `src/data_processing.py`, `src/config.py`

### Prompt 1

> J'ai cree `src/data_processing.py` avec les signatures suivantes :
> `load_data()`, `optimize_memory(df)`, `clean_data(df)`,
> `preprocess_data(df)`. Implemente chaque fonction. `load_data` doit
> essayer UCI d'abord, sinon lire le CSV local. `clean_data` doit
> supprimer les colonnes a fuite, reconstruire le BMI, imputer par
> regression les paires correlees, faire du feature engineering
> (WBC_CRP_Ratio), capper les outliers par IQR, et supprimer les
> features redondantes.

L'agent a implemente les 4 fonctions avec 9 etapes de nettoyage.
En revue de code on a change le seuil de correlation : l'IA l'avait mis
a 0.80, on l'a baisse a 0.69 pour capturer plus de paires. C'est le
genre de decision metier que l'IA ne peut pas prendre toute seule.

### Prompt 2

> Deplace tous les hyperparametres hardcodes (RANDOM_STATE, TEST_SIZE,
> seuils, chemins de fichiers) dans un fichier `src/config.py` separe.

Fait sans probleme. L'agent a cree le fichier et corrige les imports
dans les modules qui dependaient de ces constantes.

---

## 4. Phase 3 -- Entrainement et selection du modele

Responsable : Membre 3
Fichiers : `src/train_model.py`, `src/tuning.py`, `src/run.py`

### Prompt 1

> Implemente `src/train_model.py`. Le fichier doit entrainer 4 modeles
> (SVM RBF, Random Forest, LightGBM, CatBoost) avec cross-validation
> 5-fold sur le train set, calculer accuracy/precision/recall/F1/AUC
> sur le test set, puis selectionner le meilleur modele en priorisant
> le recall (contexte medical : il faut minimiser les faux negatifs).
> Sauvegarde le modele, le scaler, les feature names et les metriques
> dans `models/`.

L'agent a decompose ca en `get_models()`, `train_and_evaluate()`,
`select_best_model()` et `save_artifacts()`. La selection lexicographique
(recall > precision > AUC) etait correcte du premier coup.

En revue, on a ajoute `min_samples_split=5` au Random Forest. L'IA avait
laisse le defaut (2), ce qui overfittait sur nos 782 patients.

### Prompt 2

> Cree `src/tuning.py` qui fait un grid search cartesien pour les 4
> modeles avec stratified 5-fold CV. Definis des grilles raisonnables
> pour chaque modele. Sauvegarde les resultats dans
> `models/param_search_results.json` avec les top-3 par modele.

La structure etait bonne mais les grilles etaient trop etroites. On a
elargi le Random Forest (ajout `max_depth=None` et `n_estimators=300`)
et le CatBoost (ajout `iterations=400`).

### Prompt 3

> Cree `src/run.py` qui orchestre tout : load_data, optimize_memory,
> clean_data, preprocess_data, puis appelle train_model.main(). Ce
> fichier doit etre le point d'entree principal.

Script court, rien a redire. L'agent a aussi ajoute un `__main__`
block dans `train_model.py` pour l'execution directe, ce qu'on
n'avait pas demande mais qui s'est avere utile.

---

## 5. Phase 4 -- Explainability (SHAP)

Responsable : Membre 3
Fichiers : `src/evaluate_model.py`, `app/shap_utils.py`

### Prompt 1

> Dans `src/evaluate_model.py`, charge le modele sauvegarde, recalcule
> les metriques sur le test set, et genere les plots suivants dans
> `reports/images/` : matrice de confusion, courbe ROC, SHAP summary bar,
> SHAP beeswarm. Utilise TreeExplainer pour les modeles arborescents et
> KernelExplainer pour SVM.

L'agent a fait la detection automatique du type de modele pour choisir
le bon explainer. Fonctionnel du premier coup.

### Prompt 2

> Cree `app/shap_utils.py` avec deux fonctions : `init_explainer(model)`
> qui detecte le type de modele et initialise l'explainer SHAP, et
> `compute_shap_values(X_scaled, model, feature_names, explainer)` qui
> retourne les top-N features avec leur contribution. Traduis les noms
> de features en francais.

Ca a demande quelques aller-retours. Le premier code ne gerait pas le
format des SHAP values pour les classifieurs binaires (list vs array 3D),
et on a du ajouter la gestion du `VotingClassifier` nous-memes en revue.
Le dictionnaire de traduction FR etait correct.

---

## 6. Phase 5 -- Application web Flask

Responsables : Membres 4 et 5
Fichiers : `app/app.py`, `app/auth.py`, `app/config.py`, templates, CSS, JS

### Prompt 1

> J'ai cree la structure suivante dans `app/` : `app.py`, `auth.py`,
> `config.py`, `templates/base.html`. Implemente `app.py` avec les
> routes `/` (landing), `/diagnosis` (formulaire), `/predict` (POST,
> prediction). Le formulaire doit avoir 3 etapes : donnees
> demographiques, symptomes cliniques, resultats de labo. La route
> predict doit construire le vecteur de features a partir du formulaire,
> appliquer le scaler, lancer la prediction, calculer les SHAP values,
> et afficher le resultat.

Le builder de feature vector etait le morceau le plus delicat. L'agent
devait gerer les features numeriques, les binaires (one-hot), et le ratio
WBC/CRP. En revue on a verifie que l'ordre des features correspondait
a `feature_names.pkl`, parce qu'un decalage d'une colonne fausse toute
la prediction. C'etait bon.

### Prompt 2

> Implemente `app/auth.py` comme un Blueprint Flask avec
> register/login/logout/profile/history/admin. Utilise Flask-Login
> et bcrypt pour le hash des mots de passe. Stocke les utilisateurs
> et l'historique des predictions dans SQLite.

L'agent a sorti le Blueprint complet, avec creation auto du compte
admin au demarrage et historique filtrable. On a ajoute la validation
de longueur min pour username (3) et password (6) qu'il n'avait pas
mise.

### Prompt 3

> Cree les templates et les fichiers CSS/JS. Le design doit etre sombre
> avec un style glassmorphism. Le formulaire de diagnostic doit etre un
> wizard multi-etapes. La page de resultat doit afficher un anneau de
> probabilite et les barres SHAP animees en pur HTML/CSS (pas d'image).

C'est la partie ou on a le plus itere. Le premier rendu etait correct
structurellement mais les couleurs ne collaient pas, et les animations
etaient trop lentes. Ca a pris plusieurs passes pour arriver a quelque
chose de propre. L'agent a fini par produire 6 fichiers CSS modulaires
(`core.css`, `form.css`, `landing.css`, `pages.css`, `result.css`,
`style.css`) et un JS par page.

---

## 7. Phase 6 -- Tests et CI/CD

Responsable : Membre 2
Fichiers : `tests/`, `.github/workflows/ci.yml`

### Prompt 1

> Cree une suite de tests pytest couvrant tout le projet. Un fichier
> par module :
> - `test_data_processing.py` : chargement, nettoyage, preprocessing
> - `test_train_model.py` : entrainement, selection, artefacts
> - `test_evaluate_model.py` : metriques, generation de plots
> - `test_app.py` : routes Flask, builder de features, auth
> - `test_run.py` : integration du pipeline
> - `test_tuning.py` : grid search, scoring
>
> Utilise des fixtures session-scoped dans `conftest.py` pour ne pas
> recharger les donnees a chaque test.

80 tests generes d'un coup, repartis dans 6 fichiers. La plupart
passaient directement. On a rajoute manuellement des tests de validation
des artefacts (est-ce que les .pkl existent, est-ce que le nombre de
features correspond).

### Prompt 2

> Cree `.github/workflows/ci.yml` avec des jobs separes pour :
> validation des imports, tests unitaires, pipeline de donnees,
> routes Flask, artefacts ML. Ajoute un job de release conditionnel
> sur les tags `v*`.

Workflow a 6 jobs avec cache pip. On a verifie que la chaine de
dependances etait correcte (release attend les 4 autres jobs).

---

## 8. Phase 7 -- Revue finale et refactoring

Responsable : toute l'equipe

### Prompt

> Parcours la totalite du projet (src/, app/, tests/, notebooks/,
> configurations). Releve tout ce qui pourrait poser probleme :
> imports manquants, incoherences entre modules, code mort,
> chemins hardcodes, failles de securite, fichiers oublies.
> Propose des corrections.

L'agent a trouve des trucs qu'on n'avait pas vus :

- imports redondants dans `train_model.py`
- `np.fill_diagonal` qui crashait sous pandas 2.3 avec Copy-on-Write
  (corrige par `.to_numpy()`)
- des emojis dans les `print()` du notebook qui ne s'affichaient pas
  sur certains terminaux
- `favicon.svg` absent de la doc

Corriges et commites un par un.

---

## 9. Bilan

### Ce qui a marche

On a vite compris qu'il fallait structurer avant de generer. Creer les
dossiers, les noms de fichiers et les signatures de fonctions en premier,
puis demander a l'IA de remplir. Sinon l'agent invente sa propre
architecture et ca part dans tous les sens.

Travailler avec des agents qui modifient directement les fichiers
(au lieu de copier-coller depuis un chat) a ete beaucoup plus rapide.
Moins d'erreurs de copie, moins de contexte perdu.

La revue de code, on l'a faite systematiquement. On a corrige des
seuils, ajoute des hyperparametres, ajuste des details metier. L'IA
ne connait pas nos contraintes cliniques.

### Ce qui a pose probleme

Sur les gros fichiers (300+ lignes), l'agent perd le fil. Il oublie
des imports, casse des dependances entre fonctions. La parade : decouper
en modifications ciblees, un bout a la fois.

L'agent a utilise des parametres SHAP qui n'existent pas dans la version
qu'on avait d'installee. Les tests ont attrape ca, mais ca aurait pu
passer inapercu sans eux.

L'IA sur-ingenierie par defaut. Classes wrapper, decorateurs,
abstractions, alors qu'une fonction de 20 lignes suffit. Il faut lui
dire explicitement de faire simple.

### Repartition du travail

| Membre | Taches |
|:-------|:-------|
| 1 | Notebook EDA, visualisations |
| 2 | Pipeline de donnees (`data_processing.py`, `config.py`), tests, CI/CD |
| 3 | Entrainement (`train_model.py`, `tuning.py`), SHAP, evaluation |
| 4 | Application Flask (routes, backend, SHAP dans l'app) |
| 5 | Frontend (templates, CSS, JS), authentification |

### Outils utilises

| Outil | Usage |
|:------|:------|
| Claude (Anthropic) | Agent principal : generation de code, refactoring, revues de projet |
| ChatGPT (OpenAI) | Questions ponctuelles sur des API, brainstorming |
| GitHub Copilot | Autocompletion dans l'editeur pour les petites modifs |
