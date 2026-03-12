"""
Parameter Search — Pediatric Appendicitis Diagnosis
=====================================================
Ce script teste systématiquement différentes combinaisons de paramètres
fixes pour chaque modèle et identifie lesquels donnent les meilleurs scores.

Contrairement à Optuna (qui explore un espace continu de façon bayésienne),
ce script teste des grilles de valeurs discrètes choisies manuellement —
plus transparent et plus contrôlable sur un petit dataset.

Résultats sauvegardés dans : models/param_search_results.json
"""

import os
import sys
import json
import logging
import warnings
import itertools
import numpy as np

from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import recall_score, precision_score, roc_auc_score
from lightgbm import LGBMClassifier
from catboost import CatBoostClassifier

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from src.data_processing import load_data, optimize_memory, clean_data, preprocess_data

warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

MODELS_DIR  = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
RESULTS_FILE = os.path.join(MODELS_DIR, "param_search_results.json")


# ─────────────────────────────────────────────────────────────────────────────
# GRILLES DE PARAMÈTRES À TESTER
# ─────────────────────────────────────────────────────────────────────────────
# Chaque entrée est une liste de valeurs à tester pour ce paramètre.
# Le script génère toutes les combinaisons possibles (produit cartésien).
# ─────────────────────────────────────────────────────────────────────────────

GRIDS = {
    "SVM": {
        "C":            [0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 50.0, 100.0],
        "gamma":        ["scale", "auto", 0.001, 0.01, 0.1],
        "class_weight": ["balanced", None],
    },
    "Random Forest": {
        "n_estimators":      [50, 100, 150, 200, 300, 400, 500],
        "max_depth":         [3, 5, 7, 8, 10, 12, 15, 20, None],
        "min_samples_split": [2, 3, 5, 8, 10, 15, 20],
        "min_samples_leaf":  [1, 2, 3, 4, 5],
        "class_weight":      ["balanced", None],
    },
    "LightGBM": {
        "n_estimators":  [50, 100, 150, 200, 300, 400],
        "max_depth":     [3, 4, 5, 6, 7, 8, 10],
        "learning_rate": [0.01, 0.03, 0.05, 0.08, 0.1, 0.15, 0.2, 0.3],
        "num_leaves":    [15, 20, 31, 40, 50, 63],
        "class_weight":  ["balanced", None],
    },
    "CatBoost": {
        "iterations":    [50, 100, 150, 200, 300, 400, 500],
        "depth":         [3, 4, 5, 6, 7, 8, 10],
        "learning_rate": [0.01, 0.03, 0.05, 0.08, 0.1, 0.15, 0.2],
        "auto_class_weights": ["Balanced", None],
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# FONCTIONS UTILITAIRES
# ─────────────────────────────────────────────────────────────────────────────

def build_model(name: str, params: dict):
    """Instancie le bon modèle selon son nom avec les params donnés."""
    if name == "SVM":
        return SVC(**params, kernel="rbf", probability=True, random_state=42)
    elif name == "Random Forest":
        return RandomForestClassifier(**params, random_state=42, n_jobs=-1)
    elif name == "LightGBM":
        return LGBMClassifier(**params, random_state=42, verbose=-1, n_jobs=-1)
    elif name == "CatBoost":
        return CatBoostClassifier(**params, random_seed=42, verbose=0)


def evaluate(model, X_train, X_test, y_train, y_test) -> dict:
    """Entraîne le modèle et retourne ses métriques sur le test set."""
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    return {
        "recall":    round(recall_score(y_test, y_pred, zero_division=0), 4),
        "precision": round(precision_score(y_test, y_pred, zero_division=0), 4),
        "roc_auc":   round(roc_auc_score(y_test, y_prob), 4),
    }


def grid_combinations(grid: dict) -> list:
    """
    Génère toutes les combinaisons possibles d'une grille de paramètres.

    Exemple :
      grid = {"a": [1, 2], "b": ["x", "y"]}
      → [{"a": 1, "b": "x"}, {"a": 1, "b": "y"},
         {"a": 2, "b": "x"}, {"a": 2, "b": "y"}]
    """
    keys   = list(grid.keys())
    values = list(grid.values())
    return [dict(zip(keys, combo)) for combo in itertools.product(*values)]


# ─────────────────────────────────────────────────────────────────────────────
# RECHERCHE PRINCIPALE
# ─────────────────────────────────────────────────────────────────────────────

def search(X_train, X_test, y_train, y_test) -> dict:
    """
    Pour chaque modèle, teste toutes les combinaisons de la grille et
    conserve le top 3 par score (Recall, Précision, AUC).
    """
    all_results = {}

    for model_name, grid in GRIDS.items():
        combos = grid_combinations(grid)
        logger.info("%-16s — %d combinaisons à tester...", model_name, len(combos))

        scores = []
        for i, params in enumerate(combos, 1):
            try:
                model   = build_model(model_name, params)
                metrics = evaluate(model, X_train, X_test, y_train, y_test)
                scores.append({"params": params, "metrics": metrics})
            except Exception as e:
                # Certaines combinaisons peuvent être invalides — on les ignore
                logger.debug("Combinaison ignorée (%s) : %s", params, e)

        # Tri lexicographique : Recall > Précision > AUC
        scores.sort(
            key=lambda x: (
                x["metrics"]["recall"],
                x["metrics"]["precision"],
                x["metrics"]["roc_auc"],
            ),
            reverse=True
        )

        best    = scores[0]
        top3    = scores[:3]
        all_results[model_name] = {"best": best, "top3": top3}

        logger.info(
            "  ★ Meilleur → Recall=%.4f | Prec=%.4f | AUC=%.4f | params=%s",
            best["metrics"]["recall"],
            best["metrics"]["precision"],
            best["metrics"]["roc_auc"],
            best["params"],
        )

    return all_results


# ─────────────────────────────────────────────────────────────────────────────
# AFFICHAGE DU RAPPORT
# ─────────────────────────────────────────────────────────────────────────────

def print_report(results: dict):
    """Affiche un tableau récapitulatif des meilleurs paramètres trouvés."""
    print("\n" + "=" * 80)
    print("RÉSULTATS DE LA RECHERCHE DE PARAMÈTRES")
    print("=" * 80)

    for model_name, data in results.items():
        best = data["best"]
        print(f"\n{'─' * 80}")
        print(f"  {model_name}")
        print(f"{'─' * 80}")
        print(f"  Recall    : {best['metrics']['recall']:.4f}")
        print(f"  Précision : {best['metrics']['precision']:.4f}")
        print(f"  ROC-AUC   : {best['metrics']['roc_auc']:.4f}")
        print(f"  Paramètres :")
        for k, v in best["params"].items():
            print(f"    {k:<22} = {v}")

        print(f"\n  Top 3 :")
        print(f"  {'Recall':>8} {'Précision':>10} {'AUC':>8}   Params clés")
        print(f"  {'─'*60}")
        for entry in data["top3"]:
            m = entry["metrics"]
            # Affiche seulement les params qui diffèrent du meilleur
            diff = {k: v for k, v in entry["params"].items()
                    if v != best["params"].get(k)}
            diff_str = ", ".join(f"{k}={v}" for k, v in diff.items()) or "identique"
            print(f"  {m['recall']:>8.4f} {m['precision']:>10.4f} {m['roc_auc']:>8.4f}"
                  f"   {diff_str}")

    print("\n" + "=" * 80)


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main():
    logger.info("=" * 65)
    logger.info("PARAMETER SEARCH — PEDIATRIC APPENDICITIS")
    logger.info("=" * 65)

    # Chargement des données
    df = load_data()
    df = optimize_memory(df)
    df = clean_data(df)
    X_train, X_test, y_train, y_test, scaler, feature_names = preprocess_data(df)

    # Recherche
    results = search(X_train, X_test, y_train, y_test)

    # Rapport console
    print_report(results)

    # Sauvegarde JSON
    os.makedirs(MODELS_DIR, exist_ok=True)
    with open(RESULTS_FILE, "w") as f:
        json.dump(results, f, indent=2, default=str)
    logger.info("Résultats sauvegardés → %s", RESULTS_FILE)

    return results


if __name__ == "__main__":
    main()