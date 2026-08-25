from __future__ import annotations

from pathlib import Path
import uuid

import numpy as np
from scipy.signal import (
    butter,
    filtfilt,
    find_peaks,
    peak_widths,
)


# ============================================================
# ECG-SENSE UPLOADED ECG ANALYSIS SERVICE
# ============================================================

PROJECT_ROOT = (
    Path(__file__).resolve().parents[2]
)

STORAGE_DIR = (
    PROJECT_ROOT
    / "backend"
    / "storage"
)

STORAGE_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# ============================================================
# CONFIGURATION
# ============================================================

ALLOWED_EXTENSIONS = {
    ".csv",
    ".txt",
}

DEFAULT_SAMPLING_RATE = 360

BASELINE_WINDOW_SAMPLES = 180

LOWPASS_ORDER = 4

LOWPASS_CUTOFF_HZ = 40.0

MIN_PEAK_DISTANCE_SEC = 0.40

MIN_PEAK_PROMINENCE = 0.15

WIDTH_THRESHOLD_SAMPLES = 35


# ============================================================
# ANALYSIS ID
# ============================================================

def create_analysis_id() -> str:
    """
    Create a unique analysis identifier.
    """

    return (
        "ecg_"
        + uuid.uuid4().hex[:12]
    )


# ============================================================
# INPUT VALIDATION
# ============================================================

def validate_file(
    filename: str,
) -> str:

    clean_name = (
        Path(filename)
        .name
    )

    extension = (
        Path(clean_name)
        .suffix
        .lower()
    )

    if extension not in ALLOWED_EXTENSIONS:

        raise ValueError(
            "Unsupported ECG file type. "
            "Currently supported: CSV and TXT."
        )

    return clean_name


# ============================================================
# ECG FILE PARSER
# ============================================================

def parse_signal(
    content: bytes,
    filename: str,
):
    """
    Parse numeric ECG samples from CSV/TXT input.

    Rules:
    - UTF-8 text expected.
    - Header rows are ignored automatically.
    - Numeric rows are accepted.
    - When multiple numeric columns exist,
      the last numeric value is treated as the ECG sample.
    """

    filename = validate_file(
        filename
    )

    try:

        text = content.decode(
            "utf-8-sig"
        )

    except UnicodeDecodeError as exc:

        raise ValueError(
            "The uploaded ECG file must be UTF-8 text."
        ) from exc

    values: list[float] = []

    for raw_line in text.splitlines():

        line = raw_line.strip()

        if not line:
            continue

        parts = (
            line
            .replace(";", ",")
            .split(",")
        )

        numeric_values: list[float] = []

        for part in parts:

            value = part.strip()

            if not value:
                continue

            try:

                number = float(
                    value
                )

            except ValueError:

                continue

            if np.isfinite(number):

                numeric_values.append(
                    number
                )

        if numeric_values:

            # Use the last numeric column.
            values.append(
                numeric_values[-1]
            )

    if len(values) < 100:

        raise ValueError(
            "The ECG file must contain at least 100 numeric samples."
        )

    signal = np.asarray(
        values,
        dtype=np.float64,
    )

    if signal.ndim != 1:

        raise ValueError(
            "The ECG signal must be one-dimensional."
        )

    if not np.all(
        np.isfinite(signal)
    ):

        raise ValueError(
            "The ECG signal contains invalid numeric values."
        )

    return (
        signal,
        DEFAULT_SAMPLING_RATE,
    )


# ============================================================
# MOVING BASELINE
# ============================================================

def moving_mean(
    signal: np.ndarray,
    window: int = BASELINE_WINDOW_SAMPLES,
) -> np.ndarray:
    """
    Centered moving-average baseline with
    truncated boundary windows.
    """

    signal = np.asarray(
        signal,
        dtype=np.float64,
    )

    if signal.size == 0:

        return signal.copy()

    half = (
        window // 2
    )

    cumulative = np.concatenate(
        (
            np.array(
                [0.0],
                dtype=np.float64,
            ),
            np.cumsum(
                signal,
                dtype=np.float64,
            ),
        )
    )

    indices = np.arange(
        signal.size
    )

    left = np.maximum(
        0,
        indices - half,
    )

    right = np.minimum(
        signal.size,
        indices + half + 1,
    )

    return (
        cumulative[right]
        - cumulative[left]
    ) / (
        right - left
    )


# ============================================================
# PREPROCESSING
# ============================================================

def preprocess_signal(
    signal: np.ndarray,
    fs: int,
) -> np.ndarray:
    """
    Apply:
        baseline correction
        +
        fourth-order Butterworth low-pass filtering
        +
        zero-phase filtering
    """

    if signal.size < 50:

        raise ValueError(
            "ECG signal is too short for processing."
        )

    if fs <= 0:

        raise ValueError(
            "Sampling frequency must be positive."
        )

    baseline = moving_mean(
        signal
    )

    corrected = (
        signal - baseline
    )

    normalized_cutoff = (
        LOWPASS_CUTOFF_HZ
        / (fs / 2.0)
    )

    if not (
        0
        < normalized_cutoff
        < 1
    ):

        raise ValueError(
            "Invalid low-pass filter configuration."
        )

    b, a = butter(
        LOWPASS_ORDER,
        normalized_cutoff,
        btype="low",
    )

    try:

        filtered = filtfilt(
            b,
            a,
            corrected,
        )

    except ValueError as exc:

        raise ValueError(
            "ECG signal is too short for the configured filter."
        ) from exc

    return np.asarray(
        filtered,
        dtype=np.float64,
    )


# ============================================================
# R-PEAK DETECTION
# ============================================================

def detect_peaks(
    filtered: np.ndarray,
    fs: int,
):
    """
    Detect R-peak candidates using:
        - minimum distance
        - minimum prominence
        - width threshold
    """

    minimum_distance = max(
        1,
        round(
            MIN_PEAK_DISTANCE_SEC
            * fs
        ),
    )

    peaks, _ = find_peaks(
        filtered,
        distance=minimum_distance,
        prominence=MIN_PEAK_PROMINENCE,
    )

    if peaks.size == 0:

        return (
            np.array(
                [],
                dtype=np.int64,
            ),
            np.array(
                [],
                dtype=np.float64,
            ),
        )

    widths = peak_widths(
        filtered,
        peaks,
        rel_height=0.5,
    )[0]

    keep = (
        widths
        <= WIDTH_THRESHOLD_SAMPLES
    )

    return (
        peaks[keep].astype(
            np.int64
        ),
        widths[keep].astype(
            np.float64
        ),
    )


# ============================================================
# SIGNAL QUALITY
# ============================================================

def calculate_signal_quality(
    signal: np.ndarray,
) -> str:
    """
    Engineering-level input quality gate.

    This is NOT a clinical quality assessment.
    """

    if signal.size < 100:

        return "Review Recommended"

    if not np.all(
        np.isfinite(signal)
    ):

        return "Review Recommended"

    low = float(
        np.percentile(
            signal,
            5,
        )
    )

    high = float(
        np.percentile(
            signal,
            95,
        )
    )

    amplitude_range = (
        high - low
    )

    if amplitude_range <= 0:

        return "Review Recommended"

    return "Good"


# ============================================================
# COMPLETE UPLOADED ECG ANALYSIS
# ============================================================

def analyze_uploaded_signal(
    signal: np.ndarray,
    fs: int,
) -> dict:
    """
    Process an uploaded ECG.

    Reference annotations are NOT assumed to exist.
    Therefore TP/FP/FN and benchmark accuracy metrics
    remain None unless ground truth annotations are supplied.
    """

    signal = np.asarray(
        signal,
        dtype=np.float64,
    )

    if signal.ndim != 1:

        raise ValueError(
            "Uploaded ECG must be one-dimensional."
        )

    if signal.size < 100:

        raise ValueError(
            "Uploaded ECG must contain at least 100 samples."
        )

    filtered = preprocess_signal(
        signal,
        fs,
    )

    detected_peaks, widths = (
        detect_peaks(
            filtered,
            fs,
        )
    )

    quality = (
        calculate_signal_quality(
            signal
        )
    )

    return {
        "record": None,

        "reference_available":
            False,

        "sampling_rate":
            int(fs),

        "signal_samples":
            int(
                signal.size
            ),

        "duration_seconds":
            float(
                signal.size / fs
            ),

        "signal_quality":
            quality,

        "reference_beats":
            None,

        "detected_peaks":
            int(
                detected_peaks.size
            ),

        "tp":
            None,

        "fp":
            None,

        "fn":
            None,

        "sensitivity":
            None,

        "precision":
            None,

        "f1":
            None,

        "detected_samples":
            detected_peaks.tolist(),

        "peak_widths":
            widths.tolist(),

        "filtered_signal":
            filtered.tolist(),

        "time_seconds":
            (
                np.arange(
                    filtered.size
                )
                / fs
            ).tolist(),
    }