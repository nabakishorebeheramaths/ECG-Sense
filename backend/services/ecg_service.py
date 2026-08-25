from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import numpy as np
import wfdb
from scipy.signal import (
    butter,
    filtfilt,
    find_peaks,
    peak_widths,
)


# ============================================================
# ECG-SENSE ANALYSIS ENGINE
# ============================================================
#
# Deterministic ECG signal-processing engine.
#
# Pipeline:
#   MIT-BIH ECG
#       ↓
#   Baseline correction
#       ↓
#   4th-order 40 Hz low-pass Butterworth filter
#       ↓
#   Candidate peak detection
#       ↓
#   Prominence + width filtering
#       ↓
#   Reference annotation extraction
#       ↓
#   One-to-one timing matching
#       ↓
#   TP / FP / FN
#       ↓
#   Sensitivity / Precision / F1
#
# This module is the numerical source of truth.
# Gemini is used only as an explanation/reporting layer.
# ============================================================


# ============================================================
# PROJECT CONFIGURATION
# ============================================================

PROJECT_ROOT = (
    Path(__file__).resolve().parents[2]
)

DATA_DIR = (
    PROJECT_ROOT
    / "data"
    / "mitdb"
)


# ============================================================
# DETECTOR PARAMETERS
# ============================================================

SAMPLING_FREQUENCY_EXPECTED = 360

BASELINE_WINDOW_SAMPLES = 180

LOWPASS_ORDER = 4

LOWPASS_CUTOFF_HZ = 40.0

MIN_PEAK_DISTANCE_SEC = 0.40

MIN_PEAK_PROMINENCE = 0.15

WIDTH_THRESHOLD_SAMPLES = 35

MATCHING_TOLERANCE_SEC = 0.10


# Backward-compatible aliases
WIDTH_THRESHOLD = WIDTH_THRESHOLD_SAMPLES
MATCH_TOLERANCE_SEC = MATCHING_TOLERANCE_SEC


# ============================================================
# MIT-BIH BEAT ANNOTATIONS
# ============================================================

VALID_BEAT_TYPES = frozenset(
    {
        "N",
        "A",
        "V",
        "F",
        "/",
        "f",
    }
)


# ============================================================
# MOVING MEAN
# ============================================================

def moving_mean_matlab(
    signal: np.ndarray,
    window: int,
) -> np.ndarray:
    """
    MATLAB-style centered moving mean with
    truncated windows at the signal boundaries.

    Equivalent conceptual operation:

        movmean(signal, window)

    Parameters
    ----------
    signal:
        One-dimensional ECG signal.

    window:
        Moving-window length in samples.

    Returns
    -------
    np.ndarray
        Moving baseline estimate.
    """

    signal = np.asarray(
        signal,
        dtype=np.float64,
    )

    if signal.ndim != 1:
        raise ValueError(
            "ECG signal must be one-dimensional."
        )

    if signal.size == 0:
        return signal.copy()

    if window <= 0:
        raise ValueError(
            "Moving-mean window must be positive."
        )

    half = window // 2

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

    sums = (
        cumulative[right]
        - cumulative[left]
    )

    counts = (
        right - left
    )

    return sums / counts


# ============================================================
# RECORD LOADING
# ============================================================

@lru_cache(maxsize=5)
def load_record(
    record: str,
):
    """
    Load one MIT-BIH Arrhythmia Database record.

    The five validated records currently supported
    by ECG-Sense are:

        100, 101, 102, 103, 104
    """

    record = str(
        record
    ).strip()

    record_path = (
        DATA_DIR
        / record
    )

    header_path = (
        record_path.with_suffix(
            ".hea"
        )
    )

    if not header_path.exists():

        raise FileNotFoundError(
            "MIT-BIH record "
            f"'{record}' was not found in "
            f"{DATA_DIR}"
        )

    try:

        signal_data = wfdb.rdrecord(
            str(record_path),
            channels=[0],
        )

        annotation = wfdb.rdann(
            str(record_path),
            "atr",
        )

    except Exception as exc:

        raise RuntimeError(
            f"Unable to load MIT-BIH record '{record}': "
            f"{exc}"
        ) from exc

    signal = np.asarray(
        signal_data.p_signal[:, 0],
        dtype=np.float64,
    )

    if signal.size == 0:

        raise ValueError(
            f"MIT-BIH record '{record}' contains no ECG samples."
        )

    fs = float(
        signal_data.fs
    )

    if fs <= 0:

        raise ValueError(
            f"Invalid sampling frequency for record '{record}'."
        )

    fs = int(
        round(fs)
    )

    return (
        signal,
        fs,
        annotation,
    )


# ============================================================
# PREPROCESSING
# ============================================================

def preprocess_ecg(
    signal: np.ndarray,
    fs: int,
) -> np.ndarray:
    """
    ECG preprocessing:

        1. Baseline correction
        2. 4th-order Butterworth low-pass filtering
        3. Zero-phase filtering using filtfilt
    """

    signal = np.asarray(
        signal,
        dtype=np.float64,
    )

    if signal.size < 20:

        raise ValueError(
            "ECG signal is too short for preprocessing."
        )

    if fs <= 0:

        raise ValueError(
            "Sampling frequency must be positive."
        )

    baseline = moving_mean_matlab(
        signal,
        BASELINE_WINDOW_SAMPLES,
    )

    corrected = (
        signal - baseline
    )

    normalized_cutoff = (
        LOWPASS_CUTOFF_HZ
        / (fs / 2.0)
    )

    if not 0 < normalized_cutoff < 1:

        raise ValueError(
            "Low-pass cutoff is invalid for "
            f"sampling rate {fs} Hz."
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
            "ECG signal is too short for zero-phase filtering."
        ) from exc

    return np.asarray(
        filtered,
        dtype=np.float64,
    )


# ============================================================
# R-PEAK DETECTION
# ============================================================

def detect_r_peaks(
    filtered: np.ndarray,
    fs: int,
):
    """
    Detect R-peak candidates using:

        - Minimum peak distance
        - Minimum prominence
        - Width threshold
    """

    filtered = np.asarray(
        filtered,
        dtype=np.float64,
    )

    if filtered.ndim != 1:

        raise ValueError(
            "Filtered ECG must be one-dimensional."
        )

    if filtered.size == 0:

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
# REFERENCE BEATS
# ============================================================

def get_reference_beats(
    annotation,
) -> np.ndarray:
    """
    Extract valid beat annotations used by the
    ECG-Sense benchmark.
    """

    symbols = np.asarray(
        annotation.symbol
    )

    samples = np.asarray(
        annotation.sample,
        dtype=np.int64,
    )

    if symbols.size != samples.size:

        raise ValueError(
            "Annotation symbols and samples have different lengths."
        )

    mask = np.array(
        [
            symbol in VALID_BEAT_TYPES
            for symbol in symbols
        ],
        dtype=bool,
    )

    return samples[mask]


# ============================================================
# ONE-TO-ONE MATCHING
# ============================================================

def match_beats(
    detected: np.ndarray,
    reference: np.ndarray,
    fs: int,
):
    """
    One-to-one temporal matching.

    Each detected peak can match at most one reference beat.
    Each reference beat can match at most one detected peak.
    """

    detected = np.asarray(
        detected,
        dtype=np.int64,
    )

    reference = np.asarray(
        reference,
        dtype=np.int64,
    )

    tolerance = max(
        1,
        round(
            MATCHING_TOLERANCE_SEC
            * fs
        ),
    )

    matched_detected = np.zeros(
        detected.size,
        dtype=bool,
    )

    matched_reference = np.zeros(
        reference.size,
        dtype=bool,
    )

    if (
        detected.size == 0
        or reference.size == 0
    ):

        tp = 0

        fp = int(
            detected.size
        )

        fn = int(
            reference.size
        )

        return (
            tp,
            fp,
            fn,
            matched_detected,
            matched_reference,
        )

    for detected_index, detected_sample in enumerate(
        detected
    ):

        distances = np.abs(
            reference
            - detected_sample
        )

        candidate_order = np.argsort(
            distances
        )

        for reference_index in candidate_order:

            if matched_reference[
                reference_index
            ]:
                continue

            distance = int(
                distances[
                    reference_index
                ]
            )

            if distance <= tolerance:

                matched_detected[
                    detected_index
                ] = True

                matched_reference[
                    reference_index
                ] = True

                break

            # Candidate order is sorted.
            # Later candidates cannot be closer.
            break

    tp = int(
        np.count_nonzero(
            matched_detected
        )
    )

    fp = int(
        detected.size
        - tp
    )

    fn = int(
        reference.size
        - np.count_nonzero(
            matched_reference
        )
    )

    return (
        tp,
        fp,
        fn,
        matched_detected,
        matched_reference,
    )


# ============================================================
# METRICS
# ============================================================

def calculate_metrics(
    tp: int,
    fp: int,
    fn: int,
):
    """
    Calculate sensitivity, precision and F1.
    """

    sensitivity = (
        tp
        / (tp + fn)
        if tp + fn > 0
        else 0.0
    )

    precision = (
        tp
        / (tp + fp)
        if tp + fp > 0
        else 0.0
    )

    f1 = (
        2.0
        * sensitivity
        * precision
        / (
            sensitivity
            + precision
        )
        if sensitivity + precision > 0
        else 0.0
    )

    return (
        float(sensitivity),
        float(precision),
        float(f1),
    )


# ============================================================
# PREPARED RECORD CACHE
# ============================================================

@lru_cache(maxsize=5)
def prepare_record(
    record: str,
):
    """
    Load and preprocess one MIT-BIH record.

    Cached to keep the web application responsive.
    """

    signal, fs, annotation = (
        load_record(
            record
        )
    )

    filtered = preprocess_ecg(
        signal,
        fs,
    )

    detected, widths = detect_r_peaks(
        filtered,
        fs,
    )

    reference = get_reference_beats(
        annotation
    )

    return {
        "signal": signal,
        "filtered": filtered,
        "fs": fs,
        "detected": detected,
        "widths": widths,
        "reference": reference,
    }


# ============================================================
# COMPLETE ANALYSIS
# ============================================================

def analyze_record(
    record: str,
):
    """
    Complete ECG-Sense analysis for an annotated MIT-BIH
    record.

    IMPORTANT:
        reference_available=True

    This field is explicitly included because downstream
    Gemini reporting needs to distinguish:

        benchmark analysis
            vs
        uploaded ECG without reference annotations.
    """

    data = prepare_record(
        record
    )

    (
        tp,
        fp,
        fn,
        matched_detected,
        matched_reference,
    ) = match_beats(
        data["detected"],
        data["reference"],
        data["fs"],
    )

    (
        sensitivity,
        precision,
        f1,
    ) = calculate_metrics(
        tp,
        fp,
        fn,
    )

    signal = data[
        "signal"
    ]

    filtered = data[
        "filtered"
    ]

    fs = data[
        "fs"
    ]

    reference = data[
        "reference"
    ]

    detected = data[
        "detected"
    ]

    widths = data[
        "widths"
    ]

    return {
        # ----------------------------------------------------
        # Identity
        # ----------------------------------------------------

        "record":
            record,

        # ----------------------------------------------------
        # Signal metadata
        # ----------------------------------------------------

        "sampling_rate":
            int(fs),

        "signal_samples":
            int(signal.size),

        "duration_seconds":
            float(
                signal.size / fs
            ),

        # ----------------------------------------------------
        # CRITICAL FLAG
        # ----------------------------------------------------

        "reference_available":
            True,

        # ----------------------------------------------------
        # Beat counts
        # ----------------------------------------------------

        "reference_beats":
            int(reference.size),

        "detected_peaks":
            int(detected.size),

        # ----------------------------------------------------
        # Confusion matrix
        # ----------------------------------------------------

        "tp":
            int(tp),

        "fp":
            int(fp),

        "fn":
            int(fn),

        # ----------------------------------------------------
        # Performance
        # ----------------------------------------------------

        "sensitivity":
            sensitivity,

        "precision":
            precision,

        "f1":
            f1,

        # ----------------------------------------------------
        # Peak information
        # ----------------------------------------------------

        "detected_samples":
            detected.tolist(),

        "reference_samples":
            reference.tolist(),

        "peak_widths":
            widths.tolist(),

        # ----------------------------------------------------
        # Matching
        # ----------------------------------------------------

        "matched_detected":
            matched_detected.tolist(),

        "matched_reference":
            matched_reference.tolist(),

        # ----------------------------------------------------
        # Full signal
        # ----------------------------------------------------

        "time_seconds":
            (
                np.arange(
                    filtered.size
                )
                / fs
            ).tolist(),

        "filtered_signal":
            filtered.tolist(),
    }


# ============================================================
# WAVEFORM WINDOW
# ============================================================

def get_waveform_window(
    record: str,
    start: float = 0.0,
    duration: float = 10.0,
):
    """
    Return a frontend-friendly waveform window.
    """

    if start < 0:

        raise ValueError(
            "Start time cannot be negative."
        )

    if duration <= 0:

        raise ValueError(
            "Duration must be greater than zero."
        )

    if duration > 60:

        raise ValueError(
            "Maximum waveform duration is 60 seconds."
        )

    data = prepare_record(
        record
    )

    fs = data[
        "fs"
    ]

    filtered = data[
        "filtered"
    ]

    detected = data[
        "detected"
    ]

    total_duration = (
        filtered.size / fs
    )

    start_sample = int(
        round(
            start * fs
        )
    )

    if start_sample >= filtered.size:

        raise ValueError(
            "Start time exceeds signal duration."
        )

    end_sample = min(
        filtered.size,
        start_sample
        + int(
            round(
                duration * fs
            )
        ),
    )

    signal_window = filtered[
        start_sample:end_sample
    ]

    time_window = (
        np.arange(
            start_sample,
            end_sample,
        )
        / fs
    )

    visible_peaks = detected[
        (detected >= start_sample)
        & (detected < end_sample)
    ]

    relative_peaks = (
        visible_peaks
        - start_sample
    )

    return {
        "record":
            record,

        "sampling_rate":
            int(fs),

        "start_seconds":
            float(start),

        "duration_seconds":
            float(
                signal_window.size / fs
            ),

        "total_duration_seconds":
            float(
                total_duration
            ),

        "time":
            time_window.tolist(),

        "signal":
            signal_window.tolist(),

        "detected_peaks":
            relative_peaks.tolist(),
    }


# ============================================================
# ENGINE INFORMATION
# ============================================================

def engine_info():
    """
    Return detector configuration for API/UI documentation.
    """

    return {
        "sampling_frequency_hz":
            SAMPLING_FREQUENCY_EXPECTED,

        "baseline_window_samples":
            BASELINE_WINDOW_SAMPLES,

        "lowpass_order":
            LOWPASS_ORDER,

        "lowpass_cutoff_hz":
            LOWPASS_CUTOFF_HZ,

        "min_peak_distance_seconds":
            MIN_PEAK_DISTANCE_SEC,

        "min_peak_prominence":
            MIN_PEAK_PROMINENCE,

        "width_threshold_samples":
            WIDTH_THRESHOLD_SAMPLES,

        "matching_tolerance_seconds":
            MATCHING_TOLERANCE_SEC,

        "reference_beat_types":
            sorted(
                VALID_BEAT_TYPES
            ),
    }


# ============================================================
# CACHE CONTROL
# ============================================================

def clear_analysis_cache():
    """
    Clear cached records.

    Useful after dataset or configuration changes.
    """

    load_record.cache_clear()
    prepare_record.cache_clear()