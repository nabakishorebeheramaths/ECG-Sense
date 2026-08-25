"use strict";

/*
    ============================================================
    ECG-SENSE FRONTEND
    Human User Experience + Results & Validation
    Live FastAPI integration
    ============================================================
*/

const API_BASE = "https://ecg-sense.onrender.com/api";

const state = {
    record: "102",
    summary: null,
    waveform: null,
    benchmark: null,
    history: [],
    loading: false
};


/* ============================================================
   SAFE DOM HELPER
   ============================================================ */

const $ = (id) =>
    document.getElementById(id);


/* ============================================================
   USER FLOW ELEMENTS
   ============================================================ */

const heroGetStarted =
    $("heroGetStarted");

const topGetStarted =
    $("topGetStarted");

const sampleAnalysis =
    $("sampleAnalysis");

const uploadChoice =
    $("uploadChoice");

const sampleChoice =
    $("sampleChoice");

const historyChoice =
    $("historyChoice");

const analysisSection =
    $("analysis");

const processingSection =
    $("processing");

const resultSection =
    $("result");

const detailedSection =
    $("detailedReport");

const ecgFile =
    $("ecgFile");

const selectedFile =
    $("selectedFile");

const startAnalysis =
    $("startAnalysis");

const processingMessage =
    $("processingMessage");

const step1 =
    $("step1");

const step2 =
    $("step2");

const step3 =
    $("step3");

const userSignalQuality =
    $("userSignalQuality");

const userBeatCount =
    $("userBeatCount");

const userAnalysisQuality =
    $("userAnalysisQuality");

const viewDetailedReport =
    $("viewDetailedReport");

const newAnalysis =
    $("newAnalysis");

const detailReference =
    $("detailReference");

const detailDetected =
    $("detailDetected");

const detailTP =
    $("detailTP");

const detailFP =
    $("detailFP");

const detailFN =
    $("detailFN");

const detailF1 =
    $("detailF1");

const downloadReport =
    $("downloadReport");

const historyList =
    $("historyList");

const scrollReport =
    $("scrollReport");

const userCanvas =
    $("userEcgCanvas");

const userCtx =
    userCanvas
        ? userCanvas.getContext("2d")
        : null;


/* ============================================================
   OPTIONAL OLD/RESULT ELEMENTS
   If the old dashboard exists, it will also work.
   ============================================================ */

const oldRecordSelect =
    $("recordSelect");

const oldAnalyzeBtn =
    $("analyzeBtn");

const oldHeroAnalyzeBtn =
    $("heroAnalyzeBtn");

const oldAnalyzeNavBtn =
    $("analyzeNavBtn");

const oldViewResultsBtn =
    $("viewResultsBtn");

const oldDownloadBtn =
    $("downloadBtn");

const oldReference =
    $("referenceBeats");

const oldDetected =
    $("detectedPeaks");

const oldSensitivity =
    $("sensitivity");

const oldPrecision =
    $("precision");

const oldF1 =
    $("f1Score");

const oldTP =
    $("tp");

const oldFP =
    $("fp");

const oldFN =
    $("fn");

const oldWaveformSubtitle =
    $("waveformSubtitle");

const oldQualityBar =
    $("qualityBar");

const oldQualityText =
    $("qualityText");

const oldCanvas =
    $("ecgCanvas");

const oldCtx =
    oldCanvas
        ? oldCanvas.getContext("2d")
        : null;

const oldBarChart =
    $("barChart");


/* ============================================================
   BASIC HELPERS
   ============================================================ */

function formatNumber(value) {

    return Number(
        value || 0
    ).toLocaleString();
}


function formatPercent(value) {

    return `${Number(
        value || 0
    ).toFixed(2)}%`;
}


function clamp(
    value,
    min,
    max
) {

    return Math.max(
        min,
        Math.min(
            max,
            value
        )
    );
}


/* ============================================================
   STATUS TOAST
   ============================================================ */

function showStatus(
    message,
    type = "info"
) {

    let status =
        $("ecgSenseStatus");

    if (!status) {

        status =
            document.createElement(
                "div"
            );

        status.id =
            "ecgSenseStatus";

        status.style.cssText = `
            position: fixed;
            right: 18px;
            bottom: 18px;
            z-index: 999999;
            max-width: min(390px, calc(100vw - 36px));
            padding: 14px 18px;
            border-radius: 15px;
            background: #ffffff;
            box-shadow: 0 18px 50px rgba(15,23,42,.14);
            font-family: Inter, system-ui, sans-serif;
            font-size: 13px;
            line-height: 1.45;
            font-weight: 750;
        `;

        document.body.appendChild(
            status
        );
    }

    const palette = {

        info: {
            text: "#475569",
            border: "#dbe4f0"
        },

        success: {
            text: "#166534",
            border: "#bbf7d0"
        },

        warning: {
            text: "#92400e",
            border: "#fde68a"
        },

        error: {
            text: "#be123c",
            border: "#fecdd3"
        }
    };

    const style =
        palette[type] ||
        palette.info;

    status.textContent =
        message;

    status.style.color =
        style.text;

    status.style.border =
        `1px solid ${style.border}`;

    clearTimeout(
        status._timer
    );

    status._timer =
        setTimeout(
            () => {
                status.remove();
            },
            3800
        );
}


/* ============================================================
   SECTION NAVIGATION
   ============================================================ */

function scrollToSection(
    id
) {

    const element =
        $(id);

    if (!element) {
        return;
    }

    element.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


function showUserSection(
    section
) {

    [
        analysisSection,
        processingSection,
        resultSection,
        detailedSection
    ].forEach(
        (element) => {

            if (element) {
                element.classList.add(
                    "hidden"
                );
            }
        }
    );

    if (section) {

        section.classList.remove(
            "hidden"
        );

        section.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}


/* ============================================================
   API
   ============================================================ */

async function apiGet(
    url,
    signal
) {

    const response =
        await fetch(
            url,
            {
                method: "GET",

                headers: {
                    Accept:
                        "application/json"
                },

                signal
            }
        );

    if (!response.ok) {

        let message =
            `API request failed (${response.status})`;

        try {

            const payload =
                await response.json();

            if (
                payload?.detail
            ) {

                if (
                    typeof payload.detail ===
                    "string"
                ) {

                    message =
                        payload.detail;

                } else if (
                    payload.detail.message
                ) {

                    message =
                        payload.detail.message;
                }
            }

        } catch (_) {
            // Use fallback.
        }

        throw new Error(
            message
        );
    }

    return response.json();
}


async function fetchSummary(
    record,
    signal
) {

    return apiGet(
        `${API_BASE}/records/${encodeURIComponent(
            record
        )}/summary`,
        signal
    );
}


async function fetchWaveform(
    record,
    signal
) {

    return apiGet(
        `${API_BASE}/records/${encodeURIComponent(
            record
        )}/waveform?start=0&duration=10`,
        signal
    );
}


async function fetchBenchmark(
    signal
) {

    return apiGet(
        `${API_BASE}/benchmark`,
        signal
    );
}


/* ============================================================
   CANVAS HELPERS
   ============================================================ */

function resizeCanvas(
    canvas,
    context
) {

    if (
        !canvas ||
        !context
    ) {

        return null;
    }

    const rect =
        canvas.getBoundingClientRect();

    const dpr =
        window.devicePixelRatio ||
        1;

    const width =
        Math.max(
            1,
            rect.width
        );

    const height =
        Math.max(
            1,
            rect.height
        );

    canvas.width =
        Math.round(
            width * dpr
        );

    canvas.height =
        Math.round(
            height * dpr
        );

    context.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );

    return {
        width,
        height
    };
}


function signalScale(
    signal,
    height
) {

    let min =
        Infinity;

    let max =
        -Infinity;

    for (
        const value of signal
    ) {

        min =
            Math.min(
                min,
                value
            );

        max =
            Math.max(
                max,
                value
            );
    }

    const range =
        max - min || 1;

    return {

        toY(value) {

            const normalized =
                (
                    value - min
                ) / range;

            return (
                height * 0.86
                -
                normalized *
                height *
                0.72
            );
        }
    };
}


/* ============================================================
   DRAW ECG
   ============================================================ */

function drawECGOnCanvas(
    canvas,
    context,
    waveform
) {

    if (
        !canvas ||
        !context ||
        !waveform
    ) {

        return;
    }

    const dimensions =
        resizeCanvas(
            canvas,
            context
        );

    if (!dimensions) {
        return;
    }

    const {
        width,
        height
    } = dimensions;

    const signal =
        Array.isArray(
            waveform.signal
        )
            ? waveform.signal
            : [];

    const peaks =
        Array.isArray(
            waveform.detected_peaks
        )
            ? waveform.detected_peaks
            : [];

    context.clearRect(
        0,
        0,
        width,
        height
    );

    if (!signal.length) {

        context.fillStyle =
            "#64748b";

        context.font =
            "600 14px Inter, system-ui, sans-serif";

        context.fillText(
            "No waveform data available.",
            20,
            30
        );

        return;
    }


    /* ---------------- GRID ---------------- */

    context.save();

    context.strokeStyle =
        "rgba(148,163,184,.15)";

    context.lineWidth = 1;

    const verticalGap =
        Math.max(
            25,
            width / 35
        );

    for (
        let x = 0;
        x <= width;
        x += verticalGap
    ) {

        context.beginPath();

        context.moveTo(
            x,
            0
        );

        context.lineTo(
            x,
            height
        );

        context.stroke();
    }

    for (
        let y = 0;
        y <= height;
        y += 28
    ) {

        context.beginPath();

        context.moveTo(
            0,
            y
        );

        context.lineTo(
            width,
            y
        );

        context.stroke();
    }

    context.restore();


    const scaled =
        signalScale(
            signal,
            height
        );

    const divisor =
        Math.max(
            1,
            signal.length - 1
        );


    /* ---------------- ECG ---------------- */

    context.save();

    context.beginPath();

    context.strokeStyle =
        "#3a86ff";

    context.lineWidth =
        window.innerWidth < 600
            ? 1.45
            : 1.9;

    context.lineJoin =
        "round";

    context.lineCap =
        "round";

    for (
        let i = 0;
        i < signal.length;
        i++
    ) {

        const x =
            (
                i / divisor
            ) * width;

        const y =
            scaled.toY(
                signal[i]
            );

        if (i === 0) {

            context.moveTo(
                x,
                y
            );

        } else {

            context.lineTo(
                x,
                y
            );
        }
    }

    context.stroke();

    context.restore();


    /* ---------------- R-PEAKS ---------------- */

    context.save();

    context.fillStyle =
        "#ff006e";

    context.strokeStyle =
        "rgba(255,0,110,.55)";

    context.lineWidth = 1.15;

    for (
        const peak of peaks
    ) {

        if (
            peak < 0 ||
            peak >= signal.length
        ) {

            continue;
        }

        const x =
            (
                peak / divisor
            ) * width;

        const y =
            scaled.toY(
                signal[peak]
            );

        context.beginPath();

        context.arc(
            x,
            y,
            window.innerWidth < 600
                ? 2.8
                : 3.8,
            0,
            Math.PI * 2
        );

        context.fill();

        context.beginPath();

        context.moveTo(
            x,
            y - 18
        );

        context.lineTo(
            x,
            y - 7
        );

        context.stroke();
    }

    context.restore();


    context.fillStyle =
        "#64748b";

    context.font =
        "600 11px Inter, system-ui, sans-serif";

    context.fillText(
        "Filtered ECG · 10-second window",
        15,
        height - 12
    );
}


/* ============================================================
   USER RESULT
   ============================================================ */

function renderUserResult() {

    const summary =
        state.summary;

    if (!summary) {
        return;
    }

    if (userSignalQuality) {

        userSignalQuality.textContent =
            "Good";
    }

    if (userBeatCount) {

        userBeatCount.textContent =
            formatNumber(
                summary.detected_peaks
            );
    }

    if (userAnalysisQuality) {

        userAnalysisQuality.textContent =
            Number(summary.f1) >= 99
                ? "Excellent"
                : Number(summary.f1) >= 97
                    ? "Very Good"
                    : "Good";
    }


    if (detailReference) {

        detailReference.textContent =
            formatNumber(
                summary.reference_beats
            );
    }

    if (detailDetected) {

        detailDetected.textContent =
            formatNumber(
                summary.detected_peaks
            );
    }

    if (detailTP) {

        detailTP.textContent =
            formatNumber(
                summary.tp
            );
    }

    if (detailFP) {

        detailFP.textContent =
            formatNumber(
                summary.fp
            );
    }

    if (detailFN) {

        detailFN.textContent =
            formatNumber(
                summary.fn
            );
    }

    if (detailF1) {

        detailF1.textContent =
            formatPercent(
                summary.f1
            );
    }

    drawECGOnCanvas(
        userCanvas,
        userCtx,
        state.waveform
    );
}


/* ============================================================
   OLD RESULTS / VALIDATION VIEW
   Created dynamically if not present in index.html.
   ============================================================ */

function ensureResultsSection() {

    let section =
        $("resultsValidation");

    if (section) {
        return section;
    }

    section =
        document.createElement(
            "section"
        );

    section.id =
        "resultsValidation";

    section.className =
        "results-validation-section";

    section.innerHTML = `
        <div class="results-container">

            <div class="results-heading">
                <span>RESULTS & VALIDATION</span>

                <h2>
                    ECG-Sense benchmark performance
                </h2>

                <p>
                    Technical validation results for MIT-BIH
                    records 100–104. These measurements are
                    shown separately from the normal-user workflow.
                </p>
            </div>

            <div class="overall-result-grid">

                <div class="results-card">
                    <span>Overall Sensitivity</span>
                    <strong id="resultsSensitivity">
                        —
                    </strong>
                </div>

                <div class="results-card">
                    <span>Overall Precision</span>
                    <strong id="resultsPrecision">
                        —
                    </strong>
                </div>

                <div class="results-card">
                    <span>Overall F1 Score</span>
                    <strong id="resultsF1">
                        —
                    </strong>
                </div>

                <div class="results-card">
                    <span>Total TP</span>
                    <strong id="resultsTP">
                        —
                    </strong>
                </div>

                <div class="results-card">
                    <span>Total FP</span>
                    <strong id="resultsFP">
                        —
                    </strong>
                </div>

                <div class="results-card">
                    <span>Total FN</span>
                    <strong id="resultsFN">
                        —
                    </strong>
                </div>

            </div>


            <div class="results-panel">

                <div class="results-panel-title">
                    <div>
                        <span>BENCHMARK</span>

                        <h3>
                            Record-wise performance
                        </h3>
                    </div>
                </div>

                <div
                    id="resultsBarChart"
                    class="results-bar-chart"
                ></div>

                <div class="chart-legend">
                    <span>
                        <i class="legend-sens"></i>
                        Sensitivity
                    </span>

                    <span>
                        <i class="legend-prec"></i>
                        Precision
                    </span>

                    <span>
                        <i class="legend-f1"></i>
                        F1 Score
                    </span>
                </div>

            </div>


            <div class="results-panel">

                <div class="results-panel-title">
                    <div>
                        <span>TABLE</span>

                        <h3>
                            MIT-BIH evaluation
                        </h3>
                    </div>
                </div>

                <div class="results-table-wrap">

                    <table class="results-table">

                        <thead>

                            <tr>
                                <th>Record</th>
                                <th>Reference</th>
                                <th>Detected</th>
                                <th>TP</th>
                                <th>FP</th>
                                <th>FN</th>
                                <th>Sensitivity</th>
                                <th>Precision</th>
                                <th>F1</th>
                            </tr>

                        </thead>

                        <tbody
                            id="resultsTableBody"
                        ></tbody>

                    </table>

                </div>

            </div>

        </div>
    `;

    document
        .querySelector("main")
        .appendChild(section);

    injectResultsStyles();

    return section;
}


/* ============================================================
   RESULTS CSS
   ============================================================ */

function injectResultsStyles() {

    if (
        $("ecgResultsStyles")
    ) {
        return;
    }

    const style =
        document.createElement(
            "style"
        );

    style.id =
        "ecgResultsStyles";

    style.textContent = `

        .results-validation-section {
            width: min(
                1180px,
                calc(100% - 28px)
            );

            margin: 90px auto 0;
            padding-bottom: 30px;
        }

        .results-container {
            width: 100%;
        }

        .results-heading span,
        .results-panel-title span {
            color: #8338ec;
            font-size: .68rem;
            font-weight: 900;
            letter-spacing: .14em;
        }

        .results-heading h2 {
            margin-top: 8px;

            color: #172033;

            font-size:
                clamp(
                    2rem,
                    4vw,
                    3rem
                );

            letter-spacing: -.04em;
            line-height: 1.05;
        }

        .results-heading p {
            margin-top: 10px;

            max-width: 760px;

            color: #64748b;

            font-size: .88rem;
            line-height: 1.65;
        }

        .overall-result-grid {
            display: grid;

            grid-template-columns:
                repeat(
                    3,
                    minmax(0, 1fr)
                );

            gap: 13px;

            margin-top: 25px;
        }

        .results-card {
            padding: 20px;

            border-radius: 20px;

            background: #ffffff;

            border:
                1px solid
                rgba(15,23,42,.07);

            box-shadow:
                0 14px 40px
                rgba(15,23,42,.06);
        }

        .results-card span {
            color: #64748b;

            font-size: .74rem;
            font-weight: 750;
        }

        .results-card strong {
            display: block;

            margin-top: 5px;

            color: #8338ec;

            font-size: 1.7rem;
            font-weight: 900;
        }

        .results-panel {
            margin-top: 16px;

            padding: 23px;

            border-radius: 23px;

            background: #ffffff;

            border:
                1px solid
                rgba(15,23,42,.07);

            box-shadow:
                0 14px 40px
                rgba(15,23,42,.06);
        }

        .results-panel-title h3 {
            margin-top: 6px;

            color: #172033;

            font-size: 1.35rem;
        }

        .results-bar-chart {
            height: 350px;

            margin-top: 20px;

            padding:
                25px
                20px
                22px;

            display: flex;

            align-items: flex-end;

            justify-content:
                space-between;

            gap: 14px;

            border-radius: 18px;

            background:
                repeating-linear-gradient(
                    to top,
                    transparent 0,
                    transparent 57px,
                    #edf1f6 58px
                );
        }

        .result-record-group {
            flex: 1;

            height: 100%;

            position: relative;

            display: flex;

            align-items: flex-end;

            justify-content: center;

            gap: 5px;
        }

        .result-bar {
            width: 20px;

            min-height: 9px;

            border-radius:
                7px
                7px
                2px
                2px;
        }

        .result-bar.sensitivity {
            background:
                linear-gradient(
                    180deg,
                    #ff5a9b,
                    #ff006e
                );
        }

        .result-bar.precision {
            background:
                linear-gradient(
                    180deg,
                    #a66cff,
                    #8338ec
                );
        }

        .result-bar.f1 {
            background:
                linear-gradient(
                    180deg,
                    #39e5b1,
                    #06a77d
                );
        }

        .result-record-label {
            position: absolute;

            bottom: -23px;

            color: #64748b;

            font-size: .72rem;
            font-weight: 850;
        }

        .chart-legend {
            margin-top: 25px;

            display: flex;

            gap: 18px;

            flex-wrap: wrap;

            color: #64748b;

            font-size: .72rem;
            font-weight: 750;
        }

        .chart-legend span {
            display: flex;

            align-items: center;

            gap: 7px;
        }

        .chart-legend i {
            width: 10px;
            height: 10px;

            display: inline-block;

            border-radius: 50%;
        }

        .legend-sens {
            background: #ff006e;
        }

        .legend-prec {
            background: #8338ec;
        }

        .legend-f1 {
            background: #06a77d;
        }

        .results-table-wrap {
            margin-top: 18px;

            overflow-x: auto;

            border-radius: 15px;

            border:
                1px solid
                #edf0f5;
        }

        .results-table {
            width: 100%;

            border-collapse:
                collapse;

            min-width: 850px;

            font-size: .76rem;
        }

        .results-table th {
            padding: 13px;

            background: #f8fafc;

            color: #64748b;

            font-size: .68rem;

            text-transform:
                uppercase;

            letter-spacing: .05em;

            white-space: nowrap;

            text-align: left;
        }

        .results-table td {
            padding: 13px;

            color: #334155;

            border-top:
                1px solid
                #edf0f5;

            white-space: nowrap;
        }

        .results-table td:last-child {
            color: #8338ec;

            font-weight: 850;
        }

        @media (max-width: 760px) {

            .results-validation-section {
                width:
                    calc(100% - 14px);

                margin-top: 58px;
            }

            .overall-result-grid {
                grid-template-columns:
                    repeat(
                        2,
                        minmax(0, 1fr)
                    );
            }

            .results-panel {
                padding: 16px;
            }

            .results-bar-chart {
                height: 280px;

                gap: 7px;

                padding-left: 7px;
                padding-right: 7px;
            }

            .result-bar {
                width: 12px;
            }
        }

        @media (max-width: 470px) {

            .overall-result-grid {
                grid-template-columns:
                    1fr;
            }
        }
    `;

    document.head.appendChild(
        style
    );
}


/* ============================================================
   RENDER RESULTS DASHBOARD
   ============================================================ */

function renderResultsDashboard(
    benchmark
) {

    const section =
        ensureResultsSection();

    if (!section) {
        return;
    }

    const overall =
        benchmark?.overall;

    const records =
        Array.isArray(
            benchmark?.records
        )
            ? benchmark.records
            : [];

    if (!overall) {
        return;
    }


    /* ---------------- Overall Cards ---------------- */

    const sensitivity =
        $("resultsSensitivity");

    const precision =
        $("resultsPrecision");

    const f1 =
        $("resultsF1");

    const tp =
        $("resultsTP");

    const fp =
        $("resultsFP");

    const fn =
        $("resultsFN");

    if (sensitivity) {

        sensitivity.textContent =
            formatPercent(
                overall.sensitivity
            );
    }

    if (precision) {

        precision.textContent =
            formatPercent(
                overall.precision
            );
    }

    if (f1) {

        f1.textContent =
            formatPercent(
                overall.f1
            );
    }

    if (tp) {

        tp.textContent =
            formatNumber(
                overall.tp
            );
    }

    if (fp) {

        fp.textContent =
            formatNumber(
                overall.fp
            );
    }

    if (fn) {

        fn.textContent =
            formatNumber(
                overall.fn
            );
    }


    /* ---------------- Chart ---------------- */

    const chart =
        $("resultsBarChart");

    if (chart) {

        chart.innerHTML = "";

        records.forEach(
            (item) => {

                if (
                    item.status !==
                    "success"
                ) {
                    return;
                }

                const group =
                    document.createElement(
                        "div"
                    );

                group.className =
                    "result-record-group";

                const metrics = [

                    {
                        className:
                            "sensitivity",
                        value:
                            Number(
                                item.sensitivity
                            )
                    },

                    {
                        className:
                            "precision",
                        value:
                            Number(
                                item.precision
                            )
                    },

                    {
                        className:
                            "f1",
                        value:
                            Number(
                                item.f1
                            )
                    }
                ];

                metrics.forEach(
                    (metric) => {

                        const bar =
                            document.createElement(
                                "div"
                            );

                        bar.className =
                            `result-bar ${metric.className}`;

                        const normalized =
                            (
                                metric.value -
                                95
                            ) / 5;

                        bar.style.height =
                            `${clamp(
                                normalized *
                                100,
                                8,
                                100
                            )}%`;

                        bar.title =
                            `${metric.value.toFixed(
                                2
                            )}%`;

                        group.appendChild(
                            bar
                        );
                    }
                );

                const label =
                    document.createElement(
                        "div"
                    );

                label.className =
                    "result-record-label";

                label.textContent =
                    item.record;

                group.appendChild(
                    label
                );

                chart.appendChild(
                    group
                );
            }
        );
    }


    /* ---------------- Table ---------------- */

    const tbody =
        $("resultsTableBody");

    if (tbody) {

        tbody.innerHTML = "";

        records.forEach(
            (item) => {

                if (
                    item.status !==
                    "success"
                ) {
                    return;
                }

                const row =
                    document.createElement(
                        "tr"
                    );

                row.innerHTML = `
                    <td>${item.record}</td>
                    <td>${formatNumber(
                        item.reference_beats
                    )}</td>
                    <td>${formatNumber(
                        item.detected_peaks
                    )}</td>
                    <td>${formatNumber(
                        item.tp
                    )}</td>
                    <td>${formatNumber(
                        item.fp
                    )}</td>
                    <td>${formatNumber(
                        item.fn
                    )}</td>
                    <td>${formatPercent(
                        item.sensitivity
                    )}</td>
                    <td>${formatPercent(
                        item.precision
                    )}</td>
                    <td>${formatPercent(
                        item.f1
                    )}</td>
                `;

                tbody.appendChild(
                    row
                );
            }
        );
    }
}


/* ============================================================
   USER ANALYSIS
   ============================================================ */

let activeController =
    null;


async function runSampleAnalysis() {

    if (state.loading) {
        return;
    }

    state.loading = true;

    showUserSection(
        processingSection
    );

    if (step1) {
        step1.classList.add(
            "active"
        );
    }

    if (step2) {
        step2.classList.remove(
            "active"
        );
    }

    if (step3) {
        step3.classList.remove(
            "active"
        );
    }

    if (processingMessage) {

        processingMessage.textContent =
            "Checking the ECG signal quality...";
    }

    await new Promise(
        (resolve) =>
            setTimeout(
                resolve,
                450
            )
    );

    if (step2) {

        step2.classList.add(
            "active"
        );
    }

    if (processingMessage) {

        processingMessage.textContent =
            "Detecting heartbeats in the ECG signal...";
    }

    await new Promise(
        (resolve) =>
            setTimeout(
                resolve,
                650
            )
    );

    if (activeController) {

        activeController.abort();
    }

    activeController =
        new AbortController();

    try {

        const [
            summaryResponse,
            waveformResponse
        ] = await Promise.all([

            fetchSummary(
                "102",
                activeController.signal
            ),

            fetchWaveform(
                "102",
                activeController.signal
            )
        ]);

        if (step3) {

            step3.classList.add(
                "active"
            );
        }

        if (processingMessage) {

            processingMessage.textContent =
                "Preparing your ECG summary...";
        }

        await new Promise(
            (resolve) =>
                setTimeout(
                    resolve,
                    400
                )
        );

        state.record =
            "102";

        state.summary =
            summaryResponse.data;

        state.waveform =
            waveformResponse.data;

        renderUserResult();

        saveHistory();

        showUserSection(
            resultSection
        );

        showStatus(
            "ECG analysis completed.",
            "success"
        );

    } catch (error) {

        if (
            error?.name ===
            "AbortError"
        ) {

            return;
        }

        console.error(
            error
        );

        showStatus(
            error.message ||
                "Analysis failed.",
            "error"
        );

        if (processingMessage) {

            processingMessage.textContent =
                `Analysis failed: ${error.message}`;
        }

    } finally {

        state.loading =
            false;

        activeController =
            null;
    }
}


/* ============================================================
   HISTORY
   ============================================================ */

function loadHistory() {

    try {

        return JSON.parse(
            localStorage.getItem(
                "ecgSenseHistory"
            ) || "[]"
        );

    } catch (_) {

        return [];
    }
}


function saveHistory() {

    if (!state.summary) {
        return;
    }

    const history =
        loadHistory();

    history.unshift({
        id:
            Date.now(),

        record:
            state.summary.record,

        beats:
            state.summary.detected_peaks,

        f1:
            state.summary.f1,

        date:
            new Date()
                .toLocaleString()
    });

    localStorage.setItem(
        "ecgSenseHistory",
        JSON.stringify(
            history.slice(
                0,
                10
            )
        )
    );

    renderHistory();
}


function renderHistory() {

    if (!historyList) {
        return;
    }

    const history =
        loadHistory();

    if (!history.length) {

        historyList.innerHTML =
            `
            <div class="empty-history">
                No analyses yet.
            </div>
            `;

        return;
    }

    historyList.innerHTML =
        history
            .map(
                (item) => `
                    <div class="history-item">

                        <div class="history-main">

                            <div class="history-dot"></div>

                            <div>

                                <strong>
                                    ECG Analysis · Record ${item.record}
                                </strong>

                                <span>
                                    ${item.date}
                                    · ${formatNumber(
                                        item.beats
                                    )}
                                    beats detected
                                </span>

                            </div>

                        </div>

                        <div class="history-score">
                            F1 ${Number(
                                item.f1
                            ).toFixed(2)}%
                        </div>

                    </div>
                `
            )
            .join("");
}


/* ============================================================
   EXPORT
   ============================================================ */

function downloadCurrentReport() {

    if (!state.summary) {

        showStatus(
            "Run an analysis before downloading.",
            "warning"
        );

        return;
    }

    const report = {

        application:
            "ECG-Sense",

        generated_at:
            new Date()
                .toISOString(),

        record:
            state.summary.record,

        summary:
            state.summary,

        usage_note:
            "Signal-processing analysis only; not a medical diagnosis."
    };

    const blob =
        new Blob(
            [
                JSON.stringify(
                    report,
                    null,
                    2
                )
            ],
            {
                type:
                    "application/json"
            }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    const link =
        document.createElement(
            "a"
        );

    link.href =
        url;

    link.download =
        `ECG-Sense_Record_${state.summary.record}_Report.json`;

    document.body.appendChild(
        link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
        url
    );

    showStatus(
        "ECG analysis report downloaded.",
        "success"
    );
}


/* ============================================================
   OPTIONAL OLD DASHBOARD SUPPORT
   ============================================================ */

function renderOldDashboard(
    summary,
    waveform
) {

    if (oldReference) {

        oldReference.textContent =
            formatNumber(
                summary.reference_beats
            );
    }

    if (oldDetected) {

        oldDetected.textContent =
            formatNumber(
                summary.detected_peaks
            );
    }

    if (oldSensitivity) {

        oldSensitivity.textContent =
            formatPercent(
                summary.sensitivity
            );
    }

    if (oldPrecision) {

        oldPrecision.textContent =
            formatPercent(
                summary.precision
            );
    }

    if (oldF1) {

        oldF1.textContent =
            formatPercent(
                summary.f1
            );
    }

    if (oldTP) {

        oldTP.textContent =
            formatNumber(
                summary.tp
            );
    }

    if (oldFP) {

        oldFP.textContent =
            formatNumber(
                summary.fp
            );
    }

    if (oldFN) {

        oldFN.textContent =
            formatNumber(
                summary.fn
            );
    }

    if (oldWaveformSubtitle) {

        oldWaveformSubtitle.textContent =
            `Record ${summary.record} · First 10 seconds`;
    }

    if (oldQualityBar) {

        oldQualityBar.style.width =
            `${clamp(
                summary.f1,
                0,
                100
            )}%`;
    }

    if (oldQualityText) {

        oldQualityText.textContent =
            Number(summary.f1) >= 99
                ? "Excellent"
                : "Very Good";
    }

    if (
        oldCanvas &&
        oldCtx
    ) {

        drawECGOnCanvas(
            oldCanvas,
            oldCtx,
            waveform
        );
    }
}


/* ============================================================
   RESULTS NAVIGATION
   ============================================================ */

function goToResults() {

    ensureResultsSection();

    const section =
        $("resultsValidation");

    if (!section) {
        return;
    }

    section.scrollIntoView({
        behavior:
            "smooth",
        block:
            "start"
    });
}


/* ============================================================
   EVENT BINDING
   ============================================================ */

/* Home */

if (heroGetStarted) {

    heroGetStarted.addEventListener(
        "click",
        () => {
            goToStart();
        }
    );
}


if (topGetStarted) {

    topGetStarted.addEventListener(
        "click",
        () => {
            goToStart();
        }
    );
}


/* Choices */

if (uploadChoice) {

    uploadChoice.addEventListener(
        "click",
        () => {

            showUserSection(
                analysisSection
            );
        }
    );
}


if (sampleChoice) {

    sampleChoice.addEventListener(
        "click",
        runSampleAnalysis
    );
}


if (sampleAnalysis) {

    sampleAnalysis.addEventListener(
        "click",
        runSampleAnalysis
    );
}


if (historyChoice) {

    historyChoice.addEventListener(
        "click",
        () => {

            scrollToSection(
                "history"
            );
        }
    );
}


/* Upload */

if (ecgFile) {

    ecgFile.addEventListener(
        "change",
        () => {

            const file =
                ecgFile.files?.[0];

            if (!file) {

                if (selectedFile) {

                    selectedFile.textContent =
                        "No file selected";
                }

                if (startAnalysis) {

                    startAnalysis.disabled =
                        true;
                }

                return;
            }

            if (selectedFile) {

                selectedFile.textContent =
                    `${file.name} · ${(
                        file.size / 1024
                    ).toFixed(1)} KB`;
            }

            if (startAnalysis) {

                startAnalysis.disabled =
                    false;
            }

            showStatus(
                "File selected. Upload processing will use the validated ECG ingestion pipeline.",
                "info"
            );
        }
    );
}


if (startAnalysis) {

    startAnalysis.addEventListener(
        "click",
        runSampleAnalysis
    );
}


/* User result */

if (viewDetailedReport) {

    viewDetailedReport.addEventListener(
        "click",
        () => {

            showUserSection(
                detailedSection
            );
        }
    );
}


if (newAnalysis) {

    newAnalysis.addEventListener(
        "click",
        () => {

            goToStart();
        }
    );
}


if (downloadReport) {

    downloadReport.addEventListener(
        "click",
        downloadCurrentReport
    );
}


if (scrollReport) {

    scrollReport.addEventListener(
        "click",
        () => {

            scrollToSection(
                "detailedReport"
            );
        }
    );
}


/* Old dashboard, only if its elements exist */

if (oldRecordSelect) {

    oldRecordSelect.addEventListener(
        "change",
        () => {

            const record =
                oldRecordSelect.value;

            loadRecordIntoOldDashboard(
                record
            );
        }
    );
}


if (oldAnalyzeBtn) {

    oldAnalyzeBtn.addEventListener(
        "click",
        () => {

            const record =
                oldRecordSelect
                    ? oldRecordSelect.value
                    : "102";

            loadRecordIntoOldDashboard(
                record
            );
        }
    );
}


if (oldHeroAnalyzeBtn) {

    oldHeroAnalyzeBtn.addEventListener(
        "click",
        () => {

            loadRecordIntoOldDashboard(
                "102"
            );
        }
    );
}


if (oldAnalyzeNavBtn) {

    oldAnalyzeNavBtn.addEventListener(
        "click",
        goToResults
    );
}


if (oldViewResultsBtn) {

    oldViewResultsBtn.addEventListener(
        "click",
        goToResults
    );
}


if (oldDownloadBtn) {

    oldDownloadBtn.addEventListener(
        "click",
        downloadCurrentReport
    );
}


/* ============================================================
   OLD DASHBOARD LOADER
   ============================================================ */

async function loadRecordIntoOldDashboard(
    record
) {

    try {

        showStatus(
            `Analyzing Record ${record}...`,
            "info"
        );

        const [
            summaryResponse,
            waveformResponse
        ] = await Promise.all([

            fetchSummary(
                record
            ),

            fetchWaveform(
                record
            )
        ]);

        renderOldDashboard(
            summaryResponse.data,
            waveformResponse.data
        );

        showStatus(
            `Record ${record} ready.`,
            "success"
        );

    } catch (error) {

        console.error(
            error
        );

        showStatus(
            error.message,
            "error"
        );
    }
}


/* ============================================================
   START
   ============================================================ */

function goToStart() {

    if (analysisSection) {

        showUserSection(
            analysisSection
        );

    } else {

        scrollToSection(
            "start"
        );
    }
}


async function initialize() {

    renderHistory();

    ensureResultsSection();

    try {

        showStatus(
            "Loading validated ECG-Sense results...",
            "info"
        );

        const benchmarkResponse =
            await fetchBenchmark();

        state.benchmark =
            benchmarkResponse.data;

        renderResultsDashboard(
            state.benchmark
        );

        showStatus(
            "ECG-Sense is ready.",
            "success"
        );

    } catch (error) {

        console.error(
            "Benchmark loading failed:",
            error
        );

        showStatus(
            "Backend is unavailable. Start the ECG-Sense API.",
            "error"
        );
    }
}


window.addEventListener(
    "resize",
    () => {

        if (state.waveform) {

            if (
                userCanvas &&
                userCtx
            ) {

                drawECGOnCanvas(
                    userCanvas,
                    userCtx,
                    state.waveform
                );
            }

            if (
                oldCanvas &&
                oldCtx
            ) {

                drawECGOnCanvas(
                    oldCanvas,
                    oldCtx,
                    state.waveform
                );
            }
        }
    }
);


initialize();