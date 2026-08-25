from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import streamlit as st
import wfdb
from scipy.signal import butter, filtfilt, find_peaks, peak_widths


# ============================================================
# ECG-SENSE
# Advanced ECG R-Peak Detection & Analysis Platform
# ============================================================

st.set_page_config(
    page_title="ECG-Sense",
    page_icon="❤️",
    layout="wide",
    initial_sidebar_state="expanded",
)


# ============================================================
# PATHS
# ============================================================

APP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = APP_DIR.parent

DATA_DIR = PROJECT_ROOT / "data" / "mitdb"
RESULTS_DIR = PROJECT_ROOT / "results"

RESULTS_FILE = RESULTS_DIR / "ECG_Sense_Final_Results.csv"

RECORDS = ["100", "101", "102", "103", "104"]


# ============================================================
# FINAL VERIFIED PARAMETERS
# ============================================================

MIN_PEAK_DISTANCE = 0.40
MIN_PEAK_PROMINENCE = 0.15
WIDTH_THRESHOLD = 35
MATCHING_TOLERANCE = 0.10


# ============================================================
# CUSTOM THEME
# ============================================================

st.markdown(
    """
    <style>

    /* ---------- PAGE ---------- */

    .stApp {
        background:
            radial-gradient(
                circle at 8% 0%,
                rgba(255, 0, 110, 0.10),
                transparent 26%
            ),
            radial-gradient(
                circle at 92% 0%,
                rgba(58, 134, 255, 0.12),
                transparent 28%
            ),
            radial-gradient(
                circle at 50% 100%,
                rgba(6, 214, 160, 0.10),
                transparent 30%
            ),
            #f7f9fc;
    }

    .block-container {
        max-width: 1450px;
        padding-top: 1.2rem;
        padding-bottom: 2.5rem;
    }

    /* ---------- HERO ---------- */

    .hero-box {
        position: relative;
        overflow: hidden;

        padding: 2rem 2.2rem;
        margin-bottom: 1.5rem;

        border-radius: 28px;

        background:
            linear-gradient(
                120deg,
                #fff1f7 0%,
                #f5efff 30%,
                #eef5ff 58%,
                #edfff8 82%,
                #fff9ea 100%
            );

        border: 1px solid rgba(79, 70, 229, 0.12);

        box-shadow:
            0 18px 55px rgba(79, 70, 229, 0.10);
    }

    .hero-rainbow {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 7px;

        background:
            linear-gradient(
                90deg,
                #ff006e,
                #fb5607,
                #ffbe0b,
                #06d6a0,
                #3a86ff,
                #8338ec,
                #ff006e
            );
    }

    .hero-title {
        margin-top: 0.25rem;

        font-size: clamp(2.4rem, 6vw, 4.4rem);
        line-height: 1;

        font-weight: 900;

        background:
            linear-gradient(
                90deg,
                #ff006e,
                #8338ec,
                #3a86ff,
                #00a878
            );

        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .hero-description {
        margin-top: 0.7rem;

        color: #475569;

        font-size: 1.05rem;
        font-weight: 600;
    }

    .hero-tag {
        display: inline-block;

        margin-top: 0.9rem;

        padding: 0.45rem 0.8rem;

        border-radius: 999px;

        background: rgba(255, 255, 255, 0.92);

        border: 1px solid rgba(79, 70, 229, 0.12);

        color: #4f46e5;

        font-size: 0.8rem;
        font-weight: 800;
    }

    /* ---------- SIDEBAR ---------- */

    section[data-testid="stSidebar"] {
        background:
            linear-gradient(
                180deg,
                #fff0f7,
                #f4f0ff 40%,
                #eff6ff 70%,
                #effff9
            );

        border-right: 1px solid rgba(79, 70, 229, 0.10);
    }

    /* ---------- HEADINGS ---------- */

    h1, h2, h3 {
        color: #172033 !important;
    }

    /* ---------- METRIC CARDS ---------- */

    div[data-testid="stMetric"] {
        background: rgba(255, 255, 255, 0.94);

        border-radius: 20px;

        padding: 0.9rem 1rem;

        border: 1px solid rgba(15, 23, 42, 0.06);

        box-shadow:
            0 10px 30px rgba(15, 23, 42, 0.055);
    }

    div[data-testid="stMetricLabel"] {
        color: #64748b !important;
        font-weight: 750 !important;
    }

    div[data-testid="stMetricValue"] {
        font-weight: 900 !important;
    }

    /* ---------- BUTTONS ---------- */

    div.stButton > button {
        border: none;

        border-radius: 13px;

        min-height: 2.8rem;

        font-weight: 850;

        color: white;

        background:
            linear-gradient(
                90deg,
                #ff006e,
                #8338ec,
                #3a86ff
            );

        box-shadow:
            0 8px 22px rgba(131, 56, 236, 0.20);
    }

    div.stButton > button:hover {
        filter: brightness(1.05);
        transform: translateY(-1px);
    }

    /* ---------- INFO PANELS ---------- */

    div[data-testid="stAlert"] {
        border-radius: 16px;
    }

    /* ---------- TABLE ---------- */

    div[data-testid="stDataFrame"] {
        border-radius: 16px;
        overflow: hidden;
    }

    /* ---------- MOBILE ---------- */

    @media (max-width: 768px) {

        .block-container {
            padding-left: 0.8rem;
            padding-right: 0.8rem;
        }

        .hero-box {
            padding: 1.6rem 1.2rem;
            border-radius: 22px;
        }

        .hero-title {
            font-size: 2.7rem;
        }

        .hero-description {
            font-size: 0.93rem;
        }

        div[data-testid="stMetric"] {
            margin-bottom: 0.5rem;
        }

        .stSlider {
            padding-top: 0.2rem;
        }
    }

    </style>
    """,
    unsafe_allow_html=True,
)


# ============================================================
# LOAD VERIFIED RESULTS
# ============================================================

@st.cache_data
def load_results() -> pd.DataFrame:

    if RESULTS_FILE.exists():

        df = pd.read_csv(RESULTS_FILE)

        return df

    return pd.DataFrame(
        {
            "records": RECORDS,
            "referenceBeats": [2273, 1863, 2187, 2084, 2211],
            "detectedPeaks": [2272, 1866, 2157, 2085, 2228],
            "TP": [2272, 1862, 2157, 2084, 2180],
            "FP": [0, 4, 0, 1, 48],
            "FN": [1, 1, 30, 0, 31],
            "Sensitivity": [99.956, 99.946, 98.628, 100.0, 98.598],
            "Precision": [100.0, 99.786, 100.0, 99.952, 97.846],
            "F1_Score": [99.978, 99.866, 99.309, 99.976, 98.22],
        }
    )


results = load_results()


# ============================================================
# ACTUAL MIT-BIH LOADING
# ============================================================

@st.cache_data
def load_mitbih_record(record: str):

    record_path = DATA_DIR / record

    header = record_path.with_suffix(".hea")

    if not header.exists():

        raise FileNotFoundError(
            f"Record {record} not found in:\n{DATA_DIR}"
        )

    signal_data = wfdb.rdrecord(
        str(record_path),
        channels=[0],
    )

    annotation = wfdb.rdann(
        str(record_path),
        "atr",
    )

    signal = signal_data.p_signal[:, 0].astype(float)

    fs = int(signal_data.fs)

    return signal, fs, annotation


# ============================================================
# PREPROCESSING
# ============================================================

def preprocess_ecg(signal: np.ndarray, fs: int):

    baseline = (
        pd.Series(signal)
        .rolling(
            window=180,
            center=True,
            min_periods=1,
        )
        .mean()
        .to_numpy()
    )

    corrected = signal - baseline

    b, a = butter(
        4,
        40 / (fs / 2),
        btype="low",
    )

    filtered = filtfilt(
        b,
        a,
        corrected,
    )

    return filtered


# ============================================================
# R-PEAK DETECTION
# ============================================================

def detect_r_peaks(
    filtered: np.ndarray,
    fs: int,
):

    peaks, properties = find_peaks(
        filtered,
        distance=round(
            MIN_PEAK_DISTANCE * fs
        ),
        prominence=MIN_PEAK_PROMINENCE,
    )

    if peaks.size == 0:

        return np.array([])

    widths = peak_widths(
        filtered,
        peaks,
        rel_height=0.5,
    )[0]

    keep = widths <= WIDTH_THRESHOLD

    return peaks[keep]


# ============================================================
# REFERENCE BEATS
# ============================================================

def get_reference_beats(annotation):

    valid_types = np.array(
        ["N", "A", "V", "F", "/", "f"]
    )

    symbols = np.array(
        annotation.symbol
    )

    mask = np.isin(
        symbols,
        valid_types,
    )

    return np.array(
        annotation.sample
    )[mask]


# ============================================================
# PLOT ECG
# ============================================================

def build_ecg_plot(
    filtered,
    fs,
    peaks,
    record,
    seconds,
):

    number_of_samples = min(
        len(filtered),
        int(seconds * fs),
    )

    segment = filtered[
        :number_of_samples
    ]

    time = (
        np.arange(
            number_of_samples
        ) / fs
    )

    visible_peaks = peaks[
        peaks < number_of_samples
    ]

    fig, ax = plt.subplots(
        figsize=(13, 5),
    )

    fig.patch.set_facecolor("#ffffff")

    ax.set_facecolor("#ffffff")

    ax.plot(
        time,
        segment,
        linewidth=1.15,
        color="#3a86ff",
        label="Filtered ECG",
    )

    if len(visible_peaks) > 0:

        ax.scatter(
            visible_peaks / fs,
            filtered[visible_peaks],
            s=48,
            color="#ff006e",
            edgecolor="#ffffff",
            linewidth=0.8,
            marker="^",
            label="Detected R-Peaks",
            zorder=5,
        )

    ax.set_title(
        f"ECG-Sense • MIT-BIH Record {record}",
        fontsize=15,
        fontweight="bold",
        color="#172033",
    )

    ax.set_xlabel(
        "Time (seconds)"
    )

    ax.set_ylabel(
        "Amplitude"
    )

    ax.grid(
        True,
        alpha=0.18,
    )

    ax.legend()

    fig.tight_layout()

    return fig


# ============================================================
# VERTICAL BAR CHART
# ============================================================

def build_vertical_chart(df):

    x = np.arange(
        len(df)
    )

    width = 0.24

    fig, ax = plt.subplots(
        figsize=(11, 5),
    )

    fig.patch.set_facecolor(
        "#ffffff"
    )

    ax.set_facecolor(
        "#ffffff"
    )

    ax.bar(
        x - width,
        df["Sensitivity"],
        width,
        color="#ff006e",
        label="Sensitivity",
    )

    ax.bar(
        x,
        df["Precision"],
        width,
        color="#8338ec",
        label="Precision",
    )

    ax.bar(
        x + width,
        df["F1_Score"],
        width,
        color="#06a77d",
        label="F1 Score",
    )

    ax.set_xticks(x)

    ax.set_xticklabels(
        df["records"].astype(str)
    )

    ax.set_ylim(
        95,
        101,
    )

    ax.set_ylabel(
        "Performance (%)"
    )

    ax.set_xlabel(
        "MIT-BIH Record"
    )

    ax.set_title(
        "ECG-Sense Performance Across MIT-BIH Records",
        fontweight="bold",
        color="#172033",
    )

    ax.grid(
        axis="y",
        alpha=0.18,
    )

    ax.legend()

    fig.tight_layout()

    return fig


# ============================================================
# HERO
# ============================================================

st.markdown(
    """
    <div class="hero-box">

        <div class="hero-rainbow"></div>

        <div class="hero-title">
            ECG-Sense
        </div>

        <div class="hero-description">
            Advanced ECG R-Peak Detection & Analysis Platform
        </div>

        <div class="hero-description">
            Digital signal processing • beat detection • quantitative evaluation
        </div>

        <div class="hero-tag">
            🫀 MIT-BIH • MATLAB-validated • Research Prototype
        </div>

    </div>
    """,
    unsafe_allow_html=True,
)


# ============================================================
# SIDEBAR
# ============================================================

with st.sidebar:

    st.markdown("## 🫀 ECG-Sense")

    st.caption(
        "Analysis workspace"
    )

    record = st.selectbox(
        "Select MIT-BIH Record",
        RECORDS,
        index=2,
    )

    seconds = st.slider(
        "ECG display window",
        min_value=5,
        max_value=30,
        value=10,
        step=5,
    )

    st.divider()

    st.markdown(
        "### Final configuration"
    )

    st.write(
        f"Peak distance: **{MIN_PEAK_DISTANCE:.2f} s**"
    )

    st.write(
        f"Prominence: **{MIN_PEAK_PROMINENCE:.2f}**"
    )

    st.write(
        f"Width threshold: **{WIDTH_THRESHOLD} samples**"
    )

    st.write(
        f"Tolerance: **{MATCHING_TOLERANCE:.2f} s**"
    )

    st.divider()

    st.markdown(
        "### Dataset"
    )

    st.write(
        "MIT-BIH Arrhythmia Database"
    )

    st.caption(
        "Evaluated records: 100–104"
    )


# ============================================================
# SELECTED RESULT
# ============================================================

selected_row = results[
    results["records"].astype(str)
    == str(record)
].iloc[0]


# ============================================================
# PAGE HEADER
# ============================================================

left, right = st.columns(
    [4, 1]
)

with left:

    st.header(
        f"Record {record} Analysis"
    )

with right:

    analyze = st.button(
        "⚡ Analyze ECG",
        type="primary",
        width="stretch",
    )


# ============================================================
# ANALYSIS
# ============================================================

if analyze:

    try:

        with st.spinner(
            f"Processing MIT-BIH Record {record}..."
        ):

            raw_signal, fs, annotation = (
                load_mitbih_record(
                    record
                )
            )

            filtered = preprocess_ecg(
                raw_signal,
                fs,
            )

            detected = detect_r_peaks(
                filtered,
                fs,
            )

            reference = get_reference_beats(
                annotation
            )

            st.session_state[
                "filtered"
            ] = filtered

            st.session_state[
                "fs"
            ] = fs

            st.session_state[
                "detected"
            ] = detected

            st.session_state[
                "reference"
            ] = reference

            st.session_state[
                "active_record"
            ] = record

        st.success(
            f"Record {record} loaded successfully • "
            f"{len(raw_signal):,} samples • {fs} Hz"
        )

    except Exception as error:

        st.error(
            "The selected MIT-BIH record could not be loaded."
        )

        st.code(
            str(error)
        )


# ============================================================
# PERFORMANCE CARDS
# ============================================================

st.subheader(
    "Verified Performance"
)

metric_columns = st.columns(
    5
)

metric_columns[0].metric(
    "Reference Beats",
    f'{int(selected_row["referenceBeats"]):,}',
)

metric_columns[1].metric(
    "Detected Peaks",
    f'{int(selected_row["detectedPeaks"]):,}',
)

metric_columns[2].metric(
    "Sensitivity",
    f'{selected_row["Sensitivity"]:.2f}%',
)

metric_columns[3].metric(
    "Precision",
    f'{selected_row["Precision"]:.2f}%',
)

metric_columns[4].metric(
    "F1 Score",
    f'{selected_row["F1_Score"]:.2f}%',
)


# ============================================================
# REAL ECG VIEW
# ============================================================

st.subheader(
    "ECG Waveform & Detected R-Peaks"
)

if (
    "filtered" in st.session_state
    and st.session_state.get(
        "active_record"
    ) == record
):

    filtered = st.session_state[
        "filtered"
    ]

    fs = st.session_state[
        "fs"
    ]

    detected = st.session_state[
        "detected"
    ]

    figure = build_ecg_plot(
        filtered,
        fs,
        detected,
        record,
        seconds,
    )

    st.pyplot(
        figure,
        width="stretch",
    )

    plt.close(
        figure
    )

else:

    st.info(
        "Select a MIT-BIH record and press "
        "'Analyze ECG' to load the real waveform."
    )


# ============================================================
# DETECTION SUMMARY
# ============================================================

st.subheader(
    "Detection Summary"
)

summary_columns = st.columns(
    3
)

summary_columns[0].metric(
    "True Positives",
    f'{int(selected_row["TP"]):,}',
)

summary_columns[1].metric(
    "False Positives",
    f'{int(selected_row["FP"]):,}',
)

summary_columns[2].metric(
    "False Negatives",
    f'{int(selected_row["FN"]):,}',
)


# ============================================================
# OVERALL PERFORMANCE
# ============================================================

st.subheader(
    "Overall ECG-Sense Performance"
)

overall_columns = st.columns(
    3
)

overall_columns[0].metric(
    "Sensitivity",
    "99.41%",
)

overall_columns[1].metric(
    "Precision",
    "99.50%",
)

overall_columns[2].metric(
    "F1 Score",
    "99.45%",
)


# ============================================================
# VERTICAL CHART
# ============================================================

st.subheader(
    "Record-wise Benchmark"
)

performance_figure = build_vertical_chart(
    results
)

st.pyplot(
    performance_figure,
    width="stretch",
)

plt.close(
    performance_figure
)


# ============================================================
# RESULTS TABLE
# ============================================================

with st.expander(
    "📊 Complete benchmark table",
):

    table = results.copy()

    table["Sensitivity"] = table[
        "Sensitivity"
    ].map(
        lambda value: f"{value:.2f}%"
    )

    table["Precision"] = table[
        "Precision"
    ].map(
        lambda value: f"{value:.2f}%"
    )

    table["F1_Score"] = table[
        "F1_Score"
    ].map(
        lambda value: f"{value:.2f}%"
    )

    st.dataframe(
        table,
        width="stretch",
        hide_index=True,
    )


# ============================================================
# FINAL PARAMETERS
# ============================================================

st.subheader(
    "Final Detector Configuration"
)

parameters = pd.DataFrame(
    {
        "Parameter": [
            "Sampling frequency",
            "Minimum peak distance",
            "Minimum peak prominence",
            "Width threshold",
            "Matching tolerance",
        ],
        "Value": [
            "360 Hz",
            "0.40 s",
            "0.15",
            "35 samples",
            "0.10 s",
        ],
    }
)

st.dataframe(
    parameters,
    width="stretch",
    hide_index=True,
)


# ============================================================
# EXPORT
# ============================================================

st.subheader(
    "Export"
)

csv_bytes = results.to_csv(
    index=False
).encode(
    "utf-8"
)

st.download_button(
    "⬇️ Download Final Results CSV",
    data=csv_bytes,
    file_name="ECG_Sense_Final_Results.csv",
    mime="text/csv",
    width="stretch",
)


# ============================================================
# VALIDATED STATUS
# ============================================================

st.success(
    "ECG-Sense validated benchmark: "
    "99.41% Sensitivity • 99.50% Precision • "
    "99.45% F1 across MIT-BIH records 100–104."
)


# ============================================================
# FOOTER
# ============================================================

st.markdown(
    """
    <div style="
        text-align:center;
        padding:1rem;
        color:#64748b;
        font-size:0.82rem;
    ">
        ECG-Sense • Advanced ECG signal-processing research prototype<br>
        Research & educational use only • Not a medical diagnostic device
    </div>
    """,
    unsafe_allow_html=True,
)