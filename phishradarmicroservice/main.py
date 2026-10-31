#!/usr/bin/env python3
"""
PhishRadar Intelligent ML Microservice
Provides real-time multi-modal inference and Explainable AI (XAI) threat explanations.
"""

import os
import math
import joblib
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse

app = FastAPI(title="PhishRadar ML Microservice", version="2.0.0")

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "phishradar_classifier.joblib")
META_PATH = os.path.join(MODEL_DIR, "model_metadata.joblib")

model = None
metadata = None

FEATURE_COLUMNS = [
    'URLLength', 'DomainLength', 'IsDomainIP', 'TLDLength', 'NoOfSubDomain',
    'HasObfuscation', 'NoOfObfuscatedChar', 'NoOfLettersInURL', 'LetterRatioInURL',
    'NoOfDegitsInURL', 'DegitRatioInURL', 'NoOfEqualsInURL', 'NoOfQMarkInURL',
    'NoOfAmpersandInURL', 'NoOfOtherSpecialCharsInURL', 'SpacialCharRatioInURL',
    'IsHTTPS', 'HasTitle', 'HasFavicon', 'NoOfiFrame',
    'HasExternalFormSubmit', 'HasSubmitButton', 'HasHiddenFields',
    'HasPasswordField', 'NoOfImage', 'NoOfCSS', 'NoOfJS'
]

def load_model():
    global model, metadata
    if os.path.exists(MODEL_PATH) and os.path.exists(META_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            metadata = joblib.load(META_PATH)
            print(f"[PhishRadar ML] Model loaded successfully: {metadata.get('version')} (Accuracy: {metadata.get('accuracy', 0)*100:.2f}%)")
        except Exception as e:
            print(f"[PhishRadar ML] Error loading model: {e}")
    else:
        print("[PhishRadar ML] Warning: Model file not yet created. Train model first.")

# Automatically load on module import
load_model()

class PredictRequest(BaseModel):
    url: str
    features: Optional[Dict[str, Any]] = None
    domFeatures: Optional[Dict[str, Any]] = None

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "model_version": metadata.get("version") if metadata else "NotLoaded"
    }

def calculate_entropy(s: str) -> float:
    if not s:
        return 0.0
    prob = [float(s.count(c)) / len(s) for c in dict.fromkeys(list(s))]
    return -sum([p * math.log(p) / math.log(2.0) for p in prob])

@app.post("/predict")
def predict(req: PredictRequest):
    url = req.url or ""
    features_in = req.features or {}
    dom_in = req.domFeatures or {}

    parsed = urlparse(url)
    domain = parsed.hostname or ""

    # Build feature row matching FEATURE_COLUMNS
    row = []
    for col in FEATURE_COLUMNS:
        if col in features_in:
            row.append(float(features_in[col]))
        elif col in dom_in:
            row.append(float(dom_in[col]))
        else:
            row.append(0.0)

    explanations = []

    # Intelligent Heuristic & Contextual Checks
    has_pwd = bool(dom_in.get("hasPasswordField", False))
    has_ext_form = bool(dom_in.get("hasExternalFormSubmit", False))
    brand_mismatch = bool(dom_in.get("suspiciousBrandMismatch", False))
    impersonated = dom_in.get("impersonatedBrand")

    if has_pwd and has_ext_form:
        explanations.append("Critical: Password field detected submitting credentials to an external host.")
    elif has_pwd and not brand_mismatch and not (domain.endswith("google.com") or domain.endswith("microsoft.com") or domain.endswith("apple.com")):
        explanations.append("Credential entry form present on non-standard authentication host.")

    if brand_mismatch and impersonated:
        explanations.append(f"High Risk: Webpage content impersonates recognized brand '{impersonated}' on unauthorized domain '{domain}'.")

    # Domain Entropy Check
    dom_entropy = calculate_entropy(domain)
    if dom_entropy > 3.9:
        explanations.append(f"Abnormally high domain character randomness / entropy ({dom_entropy:.2f}), indicative of algorithmic domain generation (DGA).")

    # URL length and structure
    if len(url) > 90:
        explanations.append(f"Excessive URL length ({len(url)} characters) with nested token parameters.")

    if features_in.get("IsDomainIP", 0) == 1.0 or domain.replace(".", "").isdigit():
        explanations.append("Website is hosted directly on a raw numeric IP address rather than a registered domain name.")

    # Model inference
    phishing_prob = 0.0
    classification = "LEGITIMATE"
    confidence = 0.5

    if model is not None:
        import pandas as pd
        X = pd.DataFrame([row], columns=FEATURE_COLUMNS)
        probs = model.predict_proba(X)[0]
        # In our training: 0 = Legitimate, 1 = Phishing
        phishing_prob = round(float(probs[1]) * 100.0, 2)
        confidence = round(float(max(probs[0], probs[1])), 4)
        classification = "PHISHING" if phishing_prob >= 50.0 else "LEGITIMATE"
    else:
        # Fallback if model hasn't been loaded
        if has_pwd and has_ext_form:
            phishing_prob = 95.0
            classification = "PHISHING"
        elif brand_mismatch:
            phishing_prob = 88.0
            classification = "PHISHING"
        else:
            phishing_prob = 20.0
            classification = "LEGITIMATE"

    # Enforce risk floor on critical indicators
    if has_pwd and has_ext_form:
        phishing_prob = max(phishing_prob, 95.0)
        classification = "PHISHING"
    elif brand_mismatch:
        phishing_prob = max(phishing_prob, 88.0)
        classification = "PHISHING"

    return {
        "prediction": classification,
        "phishingProbability": phishing_prob,
        "confidence": confidence,
        "explanations": explanations,
        "modelVersion": metadata.get("version", "HistGradientBoosting-v2-MultiModal") if metadata else "Heuristic-MultiModal"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
