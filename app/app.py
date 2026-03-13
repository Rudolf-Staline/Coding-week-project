"""
Flask Application — Pediatric Appendicitis Diagnosis
=====================================================
"""

import os
import sys
import json
import secrets
import numpy as np
import pandas as pd
import joblib
import matplotlib
matplotlib.use("Agg")

from flask import Flask, render_template, request, redirect, url_for

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
IMAGES_DIR = os.path.join(BASE_DIR, "app", "static", "images")

# ── Load model artifacts ─────────────────────────────────────────────────────
model = joblib.load(os.path.join(MODELS_DIR, "best_model.pkl"))
scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.pkl"))
feature_names = list(joblib.load(os.path.join(MODELS_DIR, "feature_names.pkl")))

with open(os.path.join(MODELS_DIR, "metrics.json")) as f:
    metrics_data = json.load(f)

# ── Feature mappings ─────────────────────────────────────────────────────────
NUMERIC_FEATURES = [
    "Age", "BMI", "Height", "Weight", "Length_of_Stay",
    "Alvarado_Score", "Paedriatic_Appendicitis_Score",
    "Appendix_Diameter", "Body_Temperature",
    "WBC_Count", "Neutrophil_Percentage", "Segmented_Neutrophils",
    "RBC_Count", "Hemoglobin", "RDW", "Thrombocyte_Count", "CRP",
]

BINARY_FEATURES = [
    "Migratory_Pain", "Lower_Right_Abd_Pain",
    "Contralateral_Rebound_Tenderness", "Coughing_Pain",
    "Nausea", "Loss_of_Appetite", "Neutrophilia",
    "Dysuria", "Psoas_Sign", "Ipsilateral_Rebound_Tenderness",
    "US_Performed", "Appendix_on_US", "Free_Fluids",
    "Target_Sign", "Surrounding_Tissue_Reaction",
    "Pathological_Lymph_Nodes", "Bowel_Wall_Thickening",
    "Conglomerate_of_Bowel_Loops", "Ileus", "Coprostasis",
    "Meteorism", "Enteritis",
]

CATEGORICAL_FEATURES = {
    "Ketones_in_Urine": ["no", "++", "+++"],
    "RBC_in_Urine": ["no", "++", "+++"],
    "WBC_in_Urine": ["no", "++", "+++"],
    "Stool": ["normal", "diarrhea", "constipation, diarrhea"],
    "Peritonitis": ["no", "local"],
    "Appendix_Wall_Layers": ["partially raised", "raised", "upset"],
    "Appendicolith": ["yes", "suspected"],
    "Perfusion": ["no", "present", "hypoperfused"],
    "Perforation": ["yes", "suspected", "not excluded"],
    "Appendicular_Abscess": ["yes", "suspected"],
}

# ── Form organisation by body region ─────────────────────────────────────────
FEATURE_GROUPS = {
    "patient_info": {
        "label": "Informations Patient",
        "icon": "user",
        "fields": [
            {"name": "Age", "label": "Âge", "unit": "ans", "type": "number",
             "min": 0, "max": 18, "step": "0.1"},
            {"name": "Sex", "label": "Sexe", "type": "select",
             "options": [("", "—"), ("female", "Féminin"), ("male", "Masculin")]},
            {"name": "Height", "label": "Taille", "unit": "cm", "type": "number",
             "min": 50, "max": 200, "step": "0.1"},
            {"name": "Weight", "label": "Poids", "unit": "kg", "type": "number",
             "min": 3, "max": 150, "step": "0.1"},
            {"name": "BMI", "label": "IMC", "unit": "kg/m²", "type": "number",
             "min": 10, "max": 50, "step": "0.1"},
            {"name": "Body_Temperature", "label": "Température", "unit": "°C",
             "type": "number", "min": 35, "max": 42, "step": "0.1"},
        ],
    },
    "abdominal": {
        "label": "Symptômes Abdominaux",
        "icon": "abdomen",
        "fields": [
            {"name": "Migratory_Pain", "label": "Douleur migratrice", "type": "toggle"},
            {"name": "Lower_Right_Abd_Pain", "label": "Douleur fosse iliaque droite", "type": "toggle"},
            {"name": "Contralateral_Rebound_Tenderness", "label": "Défense controlatérale", "type": "toggle"},
            {"name": "Coughing_Pain", "label": "Douleur à la toux", "type": "toggle"},
            {"name": "Nausea", "label": "Nausées", "type": "toggle"},
            {"name": "Loss_of_Appetite", "label": "Perte d'appétit", "type": "toggle"},
            {"name": "Peritonitis", "label": "Péritonite", "type": "select",
             "options": [("", "Non évaluée"), ("no", "Absente"), ("local", "Locale")]},
            {"name": "Psoas_Sign", "label": "Signe du psoas", "type": "toggle"},
            {"name": "Ipsilateral_Rebound_Tenderness", "label": "Défense ipsilatérale", "type": "toggle"},
            {"name": "Stool", "label": "Selles", "type": "select",
             "options": [("", "—"), ("normal", "Normales"), ("diarrhea", "Diarrhée"),
                         ("constipation, diarrhea", "Constipation / Diarrhée")]},
        ],
    },
    "blood": {
        "label": "Analyses Sanguines",
        "icon": "blood",
        "fields": [
            {"name": "WBC_Count", "label": "Leucocytes (WBC)", "unit": "10³/µL",
             "type": "number", "min": 0, "max": 50, "step": "0.01"},
            {"name": "Neutrophil_Percentage", "label": "Neutrophiles", "unit": "%",
             "type": "number", "min": 0, "max": 100, "step": "0.1"},
            {"name": "Segmented_Neutrophils", "label": "Neutro. segmentés", "unit": "%",
             "type": "number", "min": 0, "max": 100, "step": "0.1"},
            {"name": "Neutrophilia", "label": "Neutrophilie", "type": "toggle"},
            {"name": "RBC_Count", "label": "Globules rouges", "unit": "10⁶/µL",
             "type": "number", "min": 0, "max": 10, "step": "0.01"},
            {"name": "Hemoglobin", "label": "Hémoglobine", "unit": "g/dL",
             "type": "number", "min": 0, "max": 20, "step": "0.1"},
            {"name": "RDW", "label": "IDR (RDW)", "unit": "%",
             "type": "number", "min": 0, "max": 30, "step": "0.1"},
            {"name": "Thrombocyte_Count", "label": "Plaquettes", "unit": "10³/µL",
             "type": "number", "min": 0, "max": 800, "step": "1"},
            {"name": "CRP", "label": "CRP", "unit": "mg/L",
             "type": "number", "min": 0, "max": 500, "step": "0.1"},
        ],
    },
    "urinary": {
        "label": "Analyses Urinaires",
        "icon": "urine",
        "fields": [
            {"name": "Ketones_in_Urine", "label": "Cétones urinaires", "type": "select",
             "options": [("", "—"), ("no", "Absent"), ("++", "++"), ("+++", "+++")]},
            {"name": "RBC_in_Urine", "label": "Hématurie", "type": "select",
             "options": [("", "—"), ("no", "Absent"), ("++", "++"), ("+++", "+++")]},
            {"name": "WBC_in_Urine", "label": "Leucocyturie", "type": "select",
             "options": [("", "—"), ("no", "Absent"), ("++", "++"), ("+++", "+++")]},
            {"name": "Dysuria", "label": "Dysurie", "type": "toggle"},
        ],
    },
    "imaging": {
        "label": "Échographie",
        "icon": "ultrasound",
        "fields": [
            {"name": "US_Performed", "label": "Échographie réalisée", "type": "toggle"},
            {"name": "Appendix_on_US", "label": "Appendice visible", "type": "toggle"},
            {"name": "Appendix_Diameter", "label": "Diamètre appendice", "unit": "mm",
             "type": "number", "min": 0, "max": 30, "step": "0.1"},
            {"name": "Free_Fluids", "label": "Liquide libre", "type": "toggle"},
            {"name": "Appendix_Wall_Layers", "label": "Couches paroi", "type": "select",
             "options": [("", "—"), ("partially raised", "Partiellement épaissies"),
                         ("raised", "Épaissies"), ("upset", "Perturbées")]},
            {"name": "Target_Sign", "label": "Signe de la cible", "type": "toggle"},
            {"name": "Appendicolith", "label": "Appendicolithe", "type": "select",
             "options": [("", "—"), ("yes", "Oui"), ("suspected", "Suspecté")]},
            {"name": "Perfusion", "label": "Perfusion", "type": "select",
             "options": [("", "—"), ("present", "Présente"), ("no", "Absente"),
                         ("hypoperfused", "Hypoperfusion")]},
            {"name": "Perforation", "label": "Perforation", "type": "select",
             "options": [("", "—"), ("yes", "Oui"), ("suspected", "Suspectée"),
                         ("not excluded", "Non exclue")]},
            {"name": "Surrounding_Tissue_Reaction", "label": "Réaction péri-appendiculaire", "type": "toggle"},
            {"name": "Appendicular_Abscess", "label": "Abcès appendiculaire", "type": "select",
             "options": [("", "—"), ("yes", "Oui"), ("suspected", "Suspecté")]},
            {"name": "Pathological_Lymph_Nodes", "label": "Ganglions pathologiques", "type": "toggle"},
            {"name": "Bowel_Wall_Thickening", "label": "Épaississement paroi intestinale", "type": "toggle"},
            {"name": "Ileus", "label": "Iléus", "type": "toggle"},
            {"name": "Coprostasis", "label": "Coprostase", "type": "toggle"},
            {"name": "Meteorism", "label": "Météorisme", "type": "toggle"},
            {"name": "Enteritis", "label": "Entérite", "type": "toggle"},
        ],
    },
    "scores": {
        "label": "Scores Cliniques",
        "icon": "score",
        "fields": [
            {"name": "Alvarado_Score", "label": "Score d'Alvarado", "type": "number",
             "min": 0, "max": 10, "step": "1"},
            {"name": "Paedriatic_Appendicitis_Score", "label": "Score PAS", "type": "number",
             "min": 0, "max": 10, "step": "1"},
            {"name": "Length_of_Stay", "label": "Durée de séjour", "unit": "jours",
             "type": "number", "min": 0, "max": 60, "step": "1"},
        ],
    },
}


# ── Routes ───────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    best = metrics_data.get("best_model", "")
    best_metrics = metrics_data.get("models", {}).get(best, {})
    return render_template("index.html", best_model=best, metrics=best_metrics,
                           all_models=metrics_data.get("models", {}))


@app.route("/diagnosis")
def diagnosis():
    return render_template("diagnosis.html", feature_groups=FEATURE_GROUPS)


@app.route("/predict", methods=["POST"])
def predict():
    input_dict = {f: 0.0 for f in feature_names}

    # ── Numeric features ─────────────────────────────────────────────────
    for feat in NUMERIC_FEATURES:
        val = request.form.get(feat, "")
        if val:
            try:
                input_dict[feat] = float(val)
            except ValueError:
                pass

    # ── Binary features (toggle → <feature>_yes = 1) ────────────────────
    for feat in BINARY_FEATURES:
        if request.form.get(feat) == "1":
            col = feat + "_yes"
            if col in input_dict:
                input_dict[col] = 1.0

    # ── Sex ──────────────────────────────────────────────────────────────
    if request.form.get("Sex") == "male":
        if "Sex_male" in input_dict:
            input_dict["Sex_male"] = 1.0

    # ── Categorical features (select → one-hot) ─────────────────────────
    for feat, options in CATEGORICAL_FEATURES.items():
        val = request.form.get(feat, "")
        if val:
            col = feat + "_" + val
            if col in input_dict:
                input_dict[col] = 1.0

    # ── Build DataFrame & scale ──────────────────────────────────────────
    df_input = pd.DataFrame([input_dict])[feature_names]
    X_scaled = scaler.transform(df_input)

    # ── Predict ──────────────────────────────────────────────────────────
    y_prob = model.predict_proba(X_scaled)[0]
    prediction = int(y_prob[1] >= 0.5)
    confidence = float(y_prob[1]) if prediction == 1 else float(y_prob[0])
    appendicitis_prob = float(y_prob[1])

    # ── SHAP explanation ─────────────────────────────────────────────────
    shap_available = False
    try:
        from src.evaluate_model import generate_single_prediction_shap
        os.makedirs(IMAGES_DIR, exist_ok=True)
        shap_path = os.path.join(IMAGES_DIR, "shap_prediction.png")
        generate_single_prediction_shap(model, scaler, feature_names,
                                        input_dict, shap_path)
        shap_available = True
    except Exception as e:
        print(f"SHAP generation skipped: {e}")

    best = metrics_data.get("best_model", "")
    best_metrics = metrics_data.get("models", {}).get(best, {})

    return render_template(
        "results.html",
        prediction=prediction,
        confidence=confidence,
        appendicitis_prob=appendicitis_prob,
        healthy_prob=float(y_prob[0]),
        best_model=best,
        metrics=best_metrics,
        shap_available=shap_available,
    )


# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
