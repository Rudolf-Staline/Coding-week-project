# 🩺 AppendixAI — Pediatric Appendicitis Decision Support

**AI-powered clinical decision support for pediatric appendicitis diagnosis with explainable ML (SHAP)**

[![CI Pipeline](https://github.com/YOUR_REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_REPO/actions)
![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)
![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Dataset Analysis](#dataset-analysis)
- [Model Performance](#model-performance)
- [SHAP Explainability](#shap-explainability)
- [Project Architecture](#project-architecture)
- [Testing](#testing)
- [Docker](#docker)
- [Prompt Engineering Documentation](#prompt-engineering-documentation)
- [Critical Questions](#critical-questions)

---

## 🎯 Project Overview

AppendixAI is a clinical decision-support application designed to assist pediatricians in the accurate diagnosis of appendicitis in children. It uses **machine learning** with **SHAP explainability** to provide transparent, reliable, and interpretable predictions.

The system analyzes symptoms, demographic data, laboratory results, and clinical scores to produce:
- A **risk probability** for appendicitis
- **SHAP-based explanations** showing which clinical factors influenced the prediction
- A **clinical recommendation** based on the risk level

---

## ✨ Features

- **4 ML Models** evaluated: SVM, Random Forest, LightGBM, CatBoost
- **CatBoost** selected as best model (ROC-AUC: 98.7%)
- **SHAP Explainability** — global feature importance + per-prediction waterfall plots
- **Premium Web Interface** — dark-mode startup-style UI with glassmorphism & animations
- **Memory Optimization** — 93.4% reduction via `optimize_memory(df)`
- **Automated Testing** — 9 pytest tests for data processing & model prediction
- **CI/CD Pipeline** — GitHub Actions for automated testing
- **Docker Support** — containerized deployment
- **JSON API** — `POST /api/predict` for programmatic access

---

## 🚀 Installation

### Prerequisites
- Python 3.11+
- pip

### Steps

```bash
# Clone the repository
git clone https://github.com/YOUR_REPO/project.git
cd project

# Install dependencies
pip install -r requirements.txt

# Train the model (downloads dataset automatically)
python src/train_model.py

# Generate evaluation plots
python src/evaluate_model.py

# Launch the web application
python app/app.py
```

Then open **http://localhost:5000** in your browser.

---

## 📊 Dataset Analysis

### Source
- **Dataset**: [Regensburg Pediatric Appendicitis](https://archive.ics.uci.edu/dataset/938/regensburg+pediatric+appendicitis) (UCI ML Repository)
- **Size**: 782 patients, 53 features
- **Target**: Binary classification (appendicitis vs. no appendicitis)

### Missing Values
Significant missing values were found across 53 columns:
- **High missingness (>90%)**: `Segmented_Neutrophils`, `Appendicolith`, `Perfusion`, `Perforation`, `Coprostasis`, `Ileus`, `Enteritis`, `Gynecological_Findings`, `Abscess_Location`
- **Moderate missingness (25-70%)**: `Appendix_Diameter` (36%), `Ketones_in_Urine` (26%), `WBC_in_Urine` (25%)
- **Low missingness (<5%)**: `Age`, `Sex`, `Weight`, `Body_Temperature`, `WBC_Count`

**Treatment**: Median imputation for numeric features, mode imputation for categorical features.

### Outliers
Outliers were detected and **capped** (not removed) using the IQR method (1.5 × IQR) to preserve data while limiting extreme values.

### Class Balance
| Class | Count | Percentage |
|-------|-------|------------|
| Appendicitis | 463 | 59.2% |
| No Appendicitis | 317 | 40.5% |
| Missing | 2 | 0.3% |

The dataset is **approximately balanced**. Class-weighted models were used (`class_weight="balanced"`) to handle the slight imbalance without oversampling.

### Correlation
Highly correlated features were identified (e.g., `Alvarado_Score` and `Paedriatic_Appendicitis_Score` with clinical symptoms). One-hot encoding was applied to categorical features after imputation.

---

## 📈 Model Performance

Four models were trained with 5-fold cross-validation:

| Model | Accuracy | Precision | Recall | F1 Score | ROC-AUC |
|-------|----------|-----------|--------|----------|---------|
| SVM | 87.9% | 93.0% | 86.0% | 89.4% | 94.9% |
| Random Forest | 92.4% | 92.6% | 94.6% | 93.6% | 97.5% |
| LightGBM | 93.0% | 91.0% | 97.9% | 94.3% | 98.1% |
| **CatBoost ★** | **95.5%** | **94.8%** | **97.9%** | **96.3%** | **98.7%** |

### Why CatBoost?
- **Highest ROC-AUC** (98.7%): Best overall discrimination
- **Highest F1** (96.3%): Best balance of precision and recall
- **High Recall** (97.9%): Critical in medical context to minimize missed appendicitis cases
- Handles missing values and categorical features natively
- Robust to overfitting with built-in regularization

---

## 🔍 SHAP Explainability

SHAP (SHapley Additive exPlanations) provides transparent explanations of model predictions:

### Global Feature Importance (Top Influential Features)
Based on SHAP analysis, the most influential clinical features are:

1. **Appendix on US (yes)** — Ultrasound detection of appendix
2. **Length of Stay** — Duration of hospital stay
3. **Peritonitis (no)** — Absence of peritonitis
4. **Neutrophil Percentage** — Blood neutrophil levels
5. **CRP** — C-reactive protein levels
6. **Body Temperature** — Patient's temperature
7. **WBC Count** — White blood cell count
8. **Alvarado Score** — Clinical scoring system

### Individual Predictions
Each prediction includes:
- A **SHAP waterfall plot** showing feature contributions
- Feature bars showing positive (increases appendicitis risk) and negative (decreases risk) impacts
- Clinical recommendation based on risk level

---

## 🏗 Project Architecture

```
project/
├── data/                          # Dataset (auto-downloaded)
│   └── appendicitis.csv
├── notebooks/
│   └── eda.ipynb                  # Exploratory data analysis
├── src/
│   ├── __init__.py
│   ├── data_processing.py         # Data loading, cleaning, optimize_memory()
│   ├── train_model.py             # Model training pipeline
│   └── evaluate_model.py          # Evaluation & SHAP plots
├── app/
│   ├── app.py                     # Flask web application
│   ├── static/
│   │   ├── css/style.css          # Premium dark-mode CSS
│   │   ├── js/main.js             # Animations & interactions
│   │   └── images/                # SHAP plots, ROC curve, etc.
│   └── templates/
│       ├── base.html              # Base layout
│       ├── index.html             # Home page + form
│       ├── result.html            # Prediction results
│       └── about.html             # Model explainability
├── models/
│   ├── best_model.pkl             # Trained CatBoost model
│   ├── scaler.pkl                 # StandardScaler
│   ├── feature_names.pkl          # Feature name list
│   └── metrics.json               # Performance metrics
├── tests/
│   ├── __init__.py
│   └── test_data_processing.py    # 9 automated tests
├── .github/workflows/ci.yml       # CI/CD pipeline
├── requirements.txt
├── Dockerfile
└── README.md
```

---

## 🧪 Testing

Run the automated test suite:

```bash
pytest tests/ -v
```

### Test Cases:
| Test | Description |
|------|-------------|
| `test_data_loads_successfully` | Dataset loads with correct structure |
| `test_data_shape` | 782 rows, 50+ columns |
| `test_optimize_memory_reduces_usage` | Memory reduction >30% |
| `test_optimize_memory_preserves_data` | Data integrity after optimization |
| `test_missing_values_handling` | No NaN values after cleaning |
| `test_clean_data_preserves_rows` | ≥90% rows preserved |
| `test_preprocess_produces_valid_splits` | Valid train/test shapes |
| `test_target_encoding` | Target encoded as {0, 1} |
| `test_model_loading_and_prediction` | Model loads and predicts correctly |

---

## 🐳 Docker

```bash
# Build the image
docker build -t appendixai .

# Run the container
docker run -p 5000:5000 appendixai
```

---

## 🤖 Prompt Engineering Documentation

### Selected Task: Memory Optimization Function

**Prompt 1**: *"Create a Python function `optimize_memory(df)` that systematically downcasts numeric types (float64→float32, int64→int32) and converts low-cardinality object columns to category dtype. Log memory before and after."*

**Result**: Generated a working function but missed edge cases (e.g., columns with all NaN that couldn't be downcast).

**Prompt 2 (Refined)**: *"Improve `optimize_memory(df)` to use `pd.to_numeric(downcast='float')` and `pd.to_numeric(downcast='integer')` for safer downcasting. Only convert object columns to category if cardinality < 50% of rows. Add comprehensive logging with MB values."*

**Result**: Produced the final robust implementation with 93.4% memory reduction (1.30 MB → 0.09 MB).

**Key Learnings**:
- **Specific library calls** (e.g., `pd.to_numeric(downcast=...)`) yield better results than generic descriptions
- **Edge case examples** in the prompt prevent common bugs
- **Iterative refinement** with specific failure modes improves output quality
- **Quantitative expectations** (e.g., "log MB values") ensure measurable outputs

---

## ❓ Critical Questions

### 1. Was the dataset balanced?
The dataset was **approximately balanced** (~59% appendicitis, ~41% no appendicitis). We used `class_weight="balanced"` in all models as a precaution. No oversampling (like SMOTE) was needed. The slight imbalance had minimal impact — the model achieved 97.9% recall for appendicitis cases.

### 2. Which ML model performed best?
**CatBoost** achieved the best performance:
- ROC-AUC: **98.7%**
- F1 Score: **96.3%**
- Accuracy: **95.5%**
- Recall: **97.9%** (critical for medical applications)

### 3. Which medical features most influenced predictions?
Based on SHAP analysis:
- **Appendix visualization on ultrasound** (strongest predictor)
- **Length of hospital stay**
- **Peritonitis status**
- **Neutrophil percentage and WBC count** (inflammatory markers)
- **CRP levels** (inflammation marker)
- **Alvarado Score** (clinical scoring system)

### 4. What insights did prompt engineering provide?
- Iterative prompt refinement yields dramatically better code
- Including specific API calls and library methods produces more accurate implementations
- Providing edge cases in prompts prevents common bugs
- Quantitative requirements ensure measurable outputs

---

## 📝 License

This project was developed as part of the Coding Week 2026 — Project 5.

---

*Built with ❤️ by the AppendixAI team*
