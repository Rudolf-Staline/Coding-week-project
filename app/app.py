"""
Flask Web Application — Pediatric Appendicitis Decision Support
=================================================================
Premium startup-style interface for pediatric appendicitis prediction
with SHAP explainability integration.
"""

import os
import sys
import uuid
import json
import logging
import warnings
import numpy as np
import pandas as pd
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from flask import Flask, render_template, request, jsonify, url_for

# ---- Paths ----
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
IMAGES_DIR = os.path.join(STATIC_DIR, "images")

os.makedirs(IMAGES_DIR, exist_ok=True)

# ---- Load model artifacts ----
model = joblib.load(os.path.join(MODELS_DIR, "best_model.pkl"))
scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.pkl"))
feature_names = joblib.load(os.path.join(MODELS_DIR, "feature_names.pkl"))

with open(os.path.join(MODELS_DIR, "metrics.json"), "r") as f:
    metrics_data = json.load(f)

logger.info("Loaded model: %s", type(model).__name__)
logger.info("Features: %d", len(feature_names))

# ---- Core clinical features the form will collect ----
FORM_FIELDS = {
    "demographics": {
        "title": "Demographics",
        "icon": "👤",
        "fields": [
            {"name": "Age", "label": "Age (years)", "type": "number", "step": "0.1", "min": "0", "max": "18", "placeholder": "e.g. 8"},
            {"name": "Sex_male", "label": "Sex", "type": "select", "options": [("0", "Female"), ("1", "Male")]},
            {"name": "Height", "label": "Height (cm)", "type": "number", "step": "0.1", "min": "50", "max": "200", "placeholder": "e.g. 128"},
            {"name": "Weight", "label": "Weight (kg)", "type": "number", "step": "0.1", "min": "5", "max": "120", "placeholder": "e.g. 26"},
            {"name": "BMI", "label": "BMI", "type": "number", "step": "0.1", "min": "10", "max": "40", "placeholder": "e.g. 15.9"},
        ],
    },
    "symptoms": {
        "title": "Clinical Symptoms",
        "icon": "🩺",
        "fields": [
            {"name": "Migratory_Pain_yes", "label": "Migratory Pain", "type": "select", "options": [("0", "No"), ("1", "Yes")]},
            {"name": "Lower_Right_Abd_Pain_yes", "label": "Lower Right Abdominal Pain", "type": "select", "options": [("0", "No"), ("1", "Yes")]},
            {"name": "Contralateral_Rebound_Tenderness_yes", "label": "Contralateral Rebound Tenderness", "type": "select", "options": [("0", "No"), ("1", "Yes")]},
            {"name": "Coughing_Pain_yes", "label": "Coughing Pain", "type": "select", "options": [("0", "No"), ("1", "Yes")]},
            {"name": "Nausea_yes", "label": "Nausea", "type": "select", "options": [("0", "No"), ("1", "Yes")]},
            {"name": "Loss_of_Appetite_yes", "label": "Loss of Appetite", "type": "select", "options": [("0", "No"), ("1", "Yes")]},
            {"name": "Body_Temperature", "label": "Body Temperature (°C)", "type": "number", "step": "0.1", "min": "35", "max": "42", "placeholder": "e.g. 37.5"},
            {"name": "Peritonitis_local", "label": "Peritonitis (Local)", "type": "select", "options": [("0", "No"), ("1", "Yes")]},
            {"name": "Psoas_Sign_yes", "label": "Psoas Sign", "type": "select", "options": [("0", "No"), ("1", "Yes")]},
            {"name": "Dysuria_yes", "label": "Dysuria", "type": "select", "options": [("0", "No"), ("1", "Yes")]},
        ],
    },
    "lab_results": {
        "title": "Laboratory Results",
        "icon": "🔬",
        "fields": [
            {"name": "WBC_Count", "label": "WBC Count (×10³/µL)", "type": "number", "step": "0.01", "min": "0", "max": "50", "placeholder": "e.g. 13.5"},
            {"name": "CRP", "label": "CRP (mg/L)", "type": "number", "step": "0.1", "min": "0", "max": "500", "placeholder": "e.g. 24.0"},
            {"name": "Neutrophil_Percentage", "label": "Neutrophil %", "type": "number", "step": "0.1", "min": "0", "max": "100", "placeholder": "e.g. 78.0"},
            {"name": "Neutrophilia_yes", "label": "Neutrophilia", "type": "select", "options": [("0", "No"), ("1", "Yes")]},
            {"name": "RBC_Count", "label": "RBC Count (×10⁶/µL)", "type": "number", "step": "0.01", "min": "0", "max": "10", "placeholder": "e.g. 4.5"},
            {"name": "Hemoglobin", "label": "Hemoglobin (g/dL)", "type": "number", "step": "0.1", "min": "5", "max": "20", "placeholder": "e.g. 13.2"},
            {"name": "Thrombocyte_Count", "label": "Thrombocyte Count (×10³/µL)", "type": "number", "step": "1", "min": "50", "max": "800", "placeholder": "e.g. 290"},
        ],
    },
    "scores": {
        "title": "Clinical Scores & Imaging",
        "icon": "📊",
        "fields": [
            {"name": "Alvarado_Score", "label": "Alvarado Score (0-10)", "type": "number", "step": "1", "min": "0", "max": "10", "placeholder": "e.g. 6"},
            {"name": "Paedriatic_Appendicitis_Score", "label": "PAS Score (0-10)", "type": "number", "step": "1", "min": "0", "max": "10", "placeholder": "e.g. 7"},
            {"name": "Appendix_on_US_yes", "label": "Appendix Seen on US", "type": "select", "options": [("0", "No"), ("1", "Yes")]},
            {"name": "Appendix_Diameter", "label": "Appendix Diameter (mm)", "type": "number", "step": "0.1", "min": "0", "max": "30", "placeholder": "e.g. 8.0"},
            {"name": "Free_Fluids_yes", "label": "Free Fluids on US", "type": "select", "options": [("0", "No"), ("1", "Yes")]},
        ],
    },
}


# ---- Flask App ----
app = Flask(__name__, static_folder=STATIC_DIR, template_folder=os.path.join(os.path.dirname(__file__), "templates"))


@app.route("/")
def index():
    """Home page with patient data input form."""
    return render_template("index.html", form_fields=FORM_FIELDS, metrics=metrics_data)


@app.route("/predict", methods=["POST"])
def predict():
    """Process prediction form submission."""
    try:
        # Build feature vector from form data + defaults
        features = {}
        for name in feature_names:
            features[name] = 0.0  # Default to 0

        # Fill in form values
        for section in FORM_FIELDS.values():
            for field in section["fields"]:
                val = request.form.get(field["name"], "")
                if val != "":
                    try:
                        features[field["name"]] = float(val)
                    except ValueError:
                        pass

        # Handle Peritonitis_no (inverse of local)
        if "Peritonitis_local" in features and features.get("Peritonitis_local", 0) == 0:
            features["Peritonitis_no"] = 1.0

        # Build DataFrame and scale
        df_input = pd.DataFrame([features])
        df_input = df_input[feature_names]
        X_scaled = scaler.transform(df_input.values)

        # Predict
        proba = model.predict_proba(X_scaled)[0]
        prediction = int(model.predict(X_scaled)[0])
        confidence = float(max(proba))
        risk_score = float(proba[1])  # probability of appendicitis

        # Generate SHAP waterfall for this prediction
        import shap
        shap_filename = f"shap_pred_{uuid.uuid4().hex[:8]}.png"
        shap_path = os.path.join(IMAGES_DIR, shap_filename)

        try:
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X_scaled)
            if isinstance(shap_values, list):
                shap_values = shap_values[1]
            base_value = explainer.expected_value
            if isinstance(base_value, (list, np.ndarray)):
                base_value = base_value[1] if len(base_value) > 1 else base_value[0]

            explanation = shap.Explanation(
                values=shap_values[0],
                base_values=float(base_value),
                data=X_scaled[0],
                feature_names=feature_names,
            )

            plt.figure(figsize=(10, 7))
            shap.waterfall_plot(explanation, show=False, max_display=12)
            plt.title("Feature Contributions to This Prediction", fontsize=13, fontweight="bold")
            plt.tight_layout()
            plt.savefig(shap_path, dpi=120, bbox_inches="tight", facecolor="white")
            plt.close()
        except Exception as e:
            logger.warning("SHAP plot generation failed: %s", e)
            shap_filename = None

        # Determine risk level
        if risk_score < 0.3:
            risk_level = "low"
            risk_label = "Low Risk"
            recommendation = "Based on this analysis, appendicitis is unlikely. Consider monitoring the patient and reassessing if symptoms persist or worsen."
        elif risk_score < 0.7:
            risk_level = "moderate"
            risk_label = "Moderate Risk"
            recommendation = "There is a moderate probability of appendicitis. Further clinical evaluation and possibly additional imaging are recommended."
        else:
            risk_level = "high"
            risk_label = "High Risk"
            recommendation = "High probability of appendicitis detected. Urgent surgical consultation is strongly recommended."

        # Get top contributing features from SHAP
        top_features = []
        try:
            sv = shap_values[0] if isinstance(shap_values, np.ndarray) and len(shap_values.shape) > 1 else shap_values[0]
            indices = np.argsort(np.abs(sv))[::-1][:8]
            for idx in indices:
                top_features.append({
                    "name": feature_names[idx].replace("_", " "),
                    "value": float(sv[idx]),
                    "abs_value": float(abs(sv[idx])),
                })
        except Exception:
            pass

        return render_template(
            "result.html",
            prediction=prediction,
            confidence=round(confidence * 100, 1),
            risk_score=round(risk_score * 100, 1),
            risk_level=risk_level,
            risk_label=risk_label,
            recommendation=recommendation,
            shap_plot=shap_filename,
            top_features=top_features,
            metrics=metrics_data,
            input_features=features,
        )

    except Exception as e:
        logger.error("Prediction error: %s", e, exc_info=True)
        return render_template("index.html", form_fields=FORM_FIELDS, metrics=metrics_data, error=str(e))


@app.route("/about")
def about():
    """About page with SHAP global explanations and model info."""
    return render_template("about.html", metrics=metrics_data)


@app.route("/api/predict", methods=["POST"])
def api_predict():
    """JSON API for predictions and real-time SHAP analysis."""
    try:
        data = request.get_json()
        features = {name: 0.0 for name in feature_names}
        
        # Parse incoming features
        for k, v in data.items():
            if k in features and v != "":
                try:
                    features[k] = float(v)
                except ValueError:
                    pass
                    
        # Handle inverse logic for Peritonitis
        if "Peritonitis_local" in features and features.get("Peritonitis_local", 0) == 0:
            features["Peritonitis_no"] = 1.0
        else:
            features["Peritonitis_no"] = 0.0

        df_input = pd.DataFrame([features])[feature_names]
        X_scaled = scaler.transform(df_input.values)

        proba = model.predict_proba(X_scaled)[0]
        prediction = int(model.predict(X_scaled)[0])
        risk_score = float(proba[1])

        # Calculate SHAP values for real-time update
        import shap
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_scaled)
        if isinstance(shap_values, list):
            shap_values = shap_values[1]
            
        sv = shap_values[0] if isinstance(shap_values, np.ndarray) and len(shap_values.shape) > 1 else shap_values[0]
        
        # Package top features for frontend
        top_features = []
        indices = np.argsort(np.abs(sv))[::-1][:8]
        for idx in indices:
            top_features.append({
                "name": feature_names[idx],
                "label": feature_names[idx].replace("_", " "),
                "value": float(sv[idx]),
                "abs_value": float(abs(sv[idx])),
            })

        return jsonify({
            "prediction": prediction,
            "risk_score": round(risk_score * 100, 1),
            "confidence": round(float(max(proba)) * 100, 1),
            "top_features": top_features
        })
    except Exception as e:
        logger.error("API Predict Error: %s", e, exc_info=True)
        return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
