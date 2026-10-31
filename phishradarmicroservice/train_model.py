#!/usr/bin/env python3
"""
PhishRadar Intelligent ML Model Trainer
Trains a multi-modal Gradient Boosting Classifier on the PhiUSIIL dataset
incorporating both URL structural and DOM telemetry features.
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score, accuracy_score

DATASET_PATH = os.path.join(
    os.path.dirname(__file__),
    "../phishradarbackend/src/main/resources/dataset/PhiUSIIL_Phishing_URL_Dataset.csv"
)
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Selected multi-modal features combining lexical and DOM signals
FEATURE_COLUMNS = [
    'URLLength', 'DomainLength', 'IsDomainIP', 'TLDLength', 'NoOfSubDomain',
    'HasObfuscation', 'NoOfObfuscatedChar', 'NoOfLettersInURL', 'LetterRatioInURL',
    'NoOfDegitsInURL', 'DegitRatioInURL', 'NoOfEqualsInURL', 'NoOfQMarkInURL',
    'NoOfAmpersandInURL', 'NoOfOtherSpecialCharsInURL', 'SpacialCharRatioInURL',
    'IsHTTPS', 'HasTitle', 'HasFavicon', 'NoOfiFrame',
    'HasExternalFormSubmit', 'HasSubmitButton', 'HasHiddenFields',
    'HasPasswordField', 'NoOfImage', 'NoOfCSS', 'NoOfJS'
]

def train():
    print(f"Loading dataset from: {DATASET_PATH} ...")
    df = pd.read_csv(DATASET_PATH)
    print(f"Dataset loaded: {len(df):,} records.")

    # In PhiUSIIL: 1 = Legitimate, 0 = Phishing (or vice versa).
    # Let's inspect: In PhiUSIIL standard benchmark: label 1 is benign/legitimate, 0 is phishing.
    # We will standardize our binary target: 1 = PHISHING, 0 = LEGITIMATE.
    # In PhiUSIIL: southbankmosaics.com has label 1 (legitimate).
    # So in PhiUSIIL, 0 = phishing, 1 = legitimate.
    # We map: is_phishing = (label == 0).astype(int)
    # Check if 'label' column exists
    if 'label' not in df.columns:
        raise ValueError("Missing 'label' column in dataset.")

    y = (df['label'] == 0).astype(int)
    X = df[FEATURE_COLUMNS].copy()

    # Fill any NaNs
    X = X.fillna(0)

    print(f"Training distribution - Legitimate (0): {(y == 0).sum():,}, Phishing (1): {(y == 1).sum():,}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    print(f"Training HistGradientBoostingClassifier on {len(X_train):,} samples...")
    model = HistGradientBoostingClassifier(
        max_iter=150,
        learning_rate=0.08,
        max_leaf_nodes=31,
        random_state=42
    )
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)

    print("\n" + "="*50)
    print("MODEL PERFORMANCE REPORT")
    print("="*50)
    print(f"Accuracy: {acc * 100:.2f}%")
    print(f"ROC-AUC:  {auc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["Legitimate", "Phishing"]))

    # Save model and feature configuration
    model_path = os.path.join(OUTPUT_DIR, "phishradar_classifier.joblib")
    meta_path = os.path.join(OUTPUT_DIR, "model_metadata.joblib")

    joblib.dump(model, model_path)
    joblib.dump({
        'features': FEATURE_COLUMNS,
        'accuracy': acc,
        'roc_auc': auc,
        'version': 'HistGradientBoosting-v2-MultiModal'
    }, meta_path)

    print(f"\nModel saved successfully to: {model_path}")
    print(f"Metadata saved to: {meta_path}")

if __name__ == '__main__':
    train()

