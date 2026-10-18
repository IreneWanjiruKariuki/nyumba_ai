from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd


# Path to the models folder
_BASE_DIR  = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = _BASE_DIR / "models"


# Geo-score table
GEO_SCORES: dict[str, float] = {
    "Runda": 0.97,      "Karen": 0.96,      "Gigiri": 0.94,
    "Muthaiga": 0.95,   "Kilimani": 0.92,   "Kitisuru": 0.91,
    "Westlands": 0.90,  "Lavington": 0.89,  "Kileleshwa": 0.88,
    "Parklands": 0.85,  "Hurlingham": 0.84, "Upper Hill": 0.83,
    "Ngong Road": 0.78, "Langata": 0.74,    "South B": 0.72,
    "South C": 0.70,    "Rongai": 0.62,     "Ruaka": 0.60,
    "Kasarani": 0.58,   "Thika Road": 0.57, "Donholm": 0.56,
    "Embakasi": 0.55,   "Umoja": 0.52,      "Buruburu": 0.54,
    "Eastleigh": 0.50,
}


# Lazy model loading 
@lru_cache(maxsize=1)
def _load_artefacts() -> dict:
    required = [
        "sale_model.joblib",
        "rental_model.joblib",
        "encoder_propertyType.joblib",
        "encoder_location.joblib",
        "sale_features.json",
        "rental_features.json",
    ]

    # Check all files exist before trying to load any of them.
    # This gives a clear error message at startup instead of a cryptic crash later.
    missing = [f for f in required if not (MODELS_DIR / f).exists()]
    if missing:
        raise FileNotFoundError(
            f"Missing model file(s) in {MODELS_DIR}: {missing}\n"
            "Run the training notebook and copy outputs to nyumbaai/models/"
        )

    # Load the feature column lists saved by the notebook.
    # These tell us exactly which columns each model was trained on,
    # in the exact order XGBoost expects them.
    with open(MODELS_DIR / "sale_features.json") as f:
        sale_feats: list[str] = json.load(f)
    with open(MODELS_DIR / "rental_features.json") as f:
        rental_feats: list[str] = json.load(f)

    return {
        "sale_model":   joblib.load(MODELS_DIR / "sale_model.joblib"),
        "rental_model": joblib.load(MODELS_DIR / "rental_model.joblib"),
        "le_type":      joblib.load(MODELS_DIR / "encoder_propertyType.joblib"),
        "le_loc":       joblib.load(MODELS_DIR / "encoder_location.joblib"),
        "sale_feats":   sale_feats,
        "rental_feats": rental_feats,
    }


# The public prediction function 
# This is the only function the router needs to import.
def predict_prices(
    property_type: str,
    location:      str,
    bedrooms:      int,
    bathrooms:     int,
    size_sqm:      float,
    has_parking:   bool,
    has_dsq:       bool,
    has_garden:    bool,
    has_borehole:  bool,
    is_furnished:  bool = False,
) -> dict:
    art = _load_artefacts()   # hits cache after first call

    # Look up geo score; unknown locations default to 0.60 (mid-range)
    geo_score = GEO_SCORES.get(location, 0.60)

    # Encode the two categorical columns using the LabelEncoders fitted
    # during training. .transform() maps the string to the integer the
    # model saw in training e.g. "Apartment" → 0, "Bungalow" → 1, etc.
    try:
        pt_enc = int(art["le_type"].transform([property_type])[0])
    except ValueError:
        raise ValueError(
            f"Unknown propertyType '{property_type}'. "
            f"Valid: {list(art['le_type'].classes_)}"
        )
    try:
        loc_enc = int(art["le_loc"].transform([location])[0])
    except ValueError:
        raise ValueError(
            f"Unknown location '{location}'. "
            f"Valid: {list(art['le_loc'].classes_)}"
        )

    # Build a dictionary of ALL possible features.
    # Each model will slice out only the columns it was trained on.
    all_features = {
        "propertyType_enc": pt_enc,
        "location_enc":     loc_enc,
        "geoScore":         geo_score,
        "bedrooms":         float(bedrooms),
        "bathrooms":        float(bathrooms),
        "sizeSqm":          float(size_sqm),
        "hasParking":       float(has_parking),
        "hasDSQ":           float(has_dsq),
        "hasGarden":        float(has_garden),
        "hasBorehole":      float(has_borehole),
        "isFurnished":      float(is_furnished),  # only used by rental model
    }

    # Build the two single-row DataFrames the models expect.
    # Column ORDER matters — XGBoost is strict about it.
    X_sale = pd.DataFrame(
        [[all_features[f] for f in art["sale_feats"]]],
        columns=art["sale_feats"]
    )
    X_rental = pd.DataFrame(
        [[all_features[f] for f in art["rental_feats"]]],
        columns=art["rental_feats"]
    )

    raw_sale   = float(art["sale_model"].predict(X_sale)[0])
    raw_rental = float(art["rental_model"].predict(X_rental)[0])

    # Round to commercially sensible figures:
    # sale prices → nearest KES 50,000  (e.g. 8,450,000 not 8,447,231)
    # rental prices → nearest KES 500   (e.g. 45,000 not 44,837)
    sale_price   = int(round(max(raw_sale,   0) / 50_000) * 50_000)
    rental_price = int(round(max(raw_rental, 0) /    500) *    500)

    return {
        "predicted_sale_price":   sale_price,
        "predicted_rental_price": rental_price,
        "location":               location,
        "geo_score":              geo_score,
    }