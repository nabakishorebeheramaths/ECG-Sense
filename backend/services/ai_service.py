from __future__ import annotations

import json
import os
import re
from typing import Any

from dotenv import load_dotenv
from google import genai


# ============================================================
# ECG-SENSE AI EXPLANATION SERVICE
# ============================================================

load_dotenv()


API_KEY = os.getenv(
    "GEMINI_API_KEY"
)

MODEL_NAME = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.6-flash",
).strip()


class GeminiServiceError(RuntimeError):
    pass


# ============================================================
# CLIENT
# ============================================================

def get_client() -> genai.Client:
    if not API_KEY:
        raise GeminiServiceError(
            "GEMINI_API_KEY is not configured."
        )

    try:
        return genai.Client(
            api_key=API_KEY
        )
    except Exception as exc:
        raise GeminiServiceError(
            f"Unable to initialize Gemini client: {exc}"
        ) from exc


# ============================================================
# JSON PARSER
# ============================================================

def clean_json_text(
    text: str,
) -> str:

    cleaned = (
        text
        .strip()
        .replace("\ufeff", "")
    )

    cleaned = re.sub(
        r"^```json\s*",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )

    cleaned = re.sub(
        r"^```\s*",
        "",
        cleaned,
    )

    cleaned = re.sub(
        r"\s*```$",
        "",
        cleaned,
    )

    return cleaned.strip()


def parse_json_response(
    text: str,
) -> dict[str, Any]:

    cleaned = clean_json_text(
        text
    )

    try:
        data = json.loads(
            cleaned
        )
    except json.JSONDecodeError as exc:
        raise GeminiServiceError(
            "Gemini returned invalid JSON."
        ) from exc

    if not isinstance(
        data,
        dict,
    ):
        raise GeminiServiceError(
            "Gemini response must be a JSON object."
        )

    return data


# ============================================================
# VALIDATION
# ============================================================

REQUIRED_FIELDS = {
    "headline",
    "summary",
    "signal_quality",
    "what_was_detected",
    "what_metrics_mean",
    "next_step",
    "medical_disclaimer",
}


def validate_result(
    result: dict[str, Any],
) -> dict[str, str]:

    missing = (
        REQUIRED_FIELDS
        - set(result.keys())
    )

    if missing:
        raise GeminiServiceError(
            "Gemini response is missing: "
            + ", ".join(
                sorted(missing)
            )
        )

    output: dict[str, str] = {}

    for field in REQUIRED_FIELDS:

        value = result.get(
            field
        )

        if value is None:
            raise GeminiServiceError(
                f"Gemini returned null field: {field}"
            )

        value = str(value).strip()

        if not value:
            raise GeminiServiceError(
                f"Gemini returned empty field: {field}"
            )

        output[field] = value

    return output


# ============================================================
# PROMPT
# ============================================================

def build_prompt(
    analysis: dict[str, Any],
) -> str:

    verified = {
        "record":
            analysis.get("record"),

        "sampling_rate":
            analysis.get("sampling_rate"),

        "signal_samples":
            analysis.get("signal_samples"),

        "duration_seconds":
            analysis.get("duration_seconds"),

        "reference_available":
            analysis.get(
                "reference_available",
                False,
            ),

        "reference_beats":
            analysis.get("reference_beats"),

        "detected_peaks":
            analysis.get("detected_peaks"),

        "signal_quality":
            analysis.get(
                "signal_quality",
                "Unknown",
            ),

        "tp":
            analysis.get("tp"),

        "fp":
            analysis.get("fp"),

        "fn":
            analysis.get("fn"),

        "sensitivity":
            analysis.get("sensitivity"),

        "precision":
            analysis.get("precision"),

        "f1":
            analysis.get("f1"),
    }

    return f"""
You are ECG-Sense's explanation layer.

The ECG-Sense deterministic signal-processing engine
has already analyzed the ECG.

The supplied values are verified.

Your job is to explain them in simple language.

You are NOT:
- the ECG detector
- a medical diagnostician
- a substitute for a doctor

STRICT RULES:

1. Never invent measurements.
2. Never change supplied numbers.
3. Never estimate missing values.
4. Never diagnose disease.
5. Never claim a person is healthy.
6. Never claim a person is unhealthy.
7. Never claim clinical normality.
8. Explain heartbeat detection as signal processing.
9. Clearly distinguish engineering validation from medical diagnosis.
10. If reference_available is false, explain that
    TP, FP, FN, sensitivity, precision and F1 are unavailable
    for this uploaded ECG without reference annotations.
11. If reference_available is true, explain that the metrics
    describe detector performance against reference annotations.
12. Keep the language understandable for a normal user.
13. Be concise.
14. Return ONLY valid JSON.
15. Do not use markdown code fences.
16. Do not add additional fields.

Verified ECG-Sense data:

{json.dumps(
    verified,
    indent=2,
)}

Return exactly:

{{
  "headline": "Short title",
  "summary": "Simple result explanation",
  "signal_quality": "Good or Review Recommended",
  "what_was_detected": "What the signal-processing engine detected",
  "what_metrics_mean": "Meaning of the available engineering metrics",
  "next_step": "Cautious next step",
  "medical_disclaimer": "Clear non-diagnostic disclaimer"
}}
""".strip()


# ============================================================
# GEMINI INTERACTIONS API
# ============================================================

def explain_analysis(
    analysis: dict[str, Any],
) -> dict[str, str]:

    client = get_client()

    prompt = build_prompt(
        analysis
    )

    try:

        interaction = client.interactions.create(
            model=MODEL_NAME,
            input=prompt,
        )

    except Exception as exc:

        raise GeminiServiceError(
            f"Gemini request failed: {exc}"
        ) from exc

    output_text = getattr(
        interaction,
        "output_text",
        None,
    )

    if not output_text:

        raise GeminiServiceError(
            "Gemini returned no text output."
        )

    result = parse_json_response(
        output_text
    )

    return validate_result(
        result
    )


# ============================================================
# SERVICE INFO
# ============================================================

def ai_service_info() -> dict[str, Any]:

    return {
        "configured": bool(API_KEY),
        "model": MODEL_NAME,
        "api": "Gemini Interactions API",
        "purpose": (
            "AI-assisted ECG explanation and reporting"
        ),
        "diagnosis_enabled": False,
        "source_of_truth":
            "ECG-Sense deterministic DSP engine",
    }