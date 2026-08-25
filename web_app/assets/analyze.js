"use strict";

/* ============================================================
   ECG-SENSE ANALYSIS PAGE
   STABLE + DEBUG + WORKING VERSION
   ============================================================ */

let currentRecord = "102";
let currentWaveform = null;
let waveformResizeTimer = null;


/* ============================================================
   START
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    console.log("==================================================");
    console.log("[ECG-Sense Analyze] DOM READY");
    console.log("[ECG-Sense Analyze] URL:", window.location.href);
    console.log("==================================================");

    initializeAnalysisPage();
});


/* ============================================================
   INITIALIZE
   ============================================================ */

async function initializeAnalysisPage() {

    try {

        const mode =
            typeof getParam === "function"
                ? getParam("mode")
                : null;

        const recordParam =
            typeof getParam === "function"
                ? getParam("record")
                : null;

        const analysisId =
            typeof getParam === "function"
                ? getParam("id")
                : null;

        currentRecord =
            recordParam || "102";


        console.log(
            "[ECG-Sense Analyze] Mode:",
            mode
        );

        console.log(
            "[ECG-Sense Analyze] Record:",
            currentRecord
        );

        console.log(
            "[ECG-Sense Analyze] Analysis ID:",
            analysisId
        );

        console.log(
            "[ECG-Sense Analyze] API:",
            typeof ECG_APP !== "undefined"
                ? ECG_APP.apiBase
                : "UNKNOWN"
        );


        /* ----------------------------------------------------
           BASIC PAGE STATE
           ---------------------------------------------------- */

        setText(
            "analysisRecord",
            `Record ${currentRecord}`
        );

        setText(
            "analysisId",
            "Ready"
        );

        setText(
            "analysisStatus",
            `MIT-BIH Record ${currentRecord} is ready for analysis.`
        );


        /* ----------------------------------------------------
           SAVED ANALYSIS
           ---------------------------------------------------- */

        if (analysisId) {

            await loadSavedAnalysis(
                analysisId
            );

            return;
        }


        /* ----------------------------------------------------
           ANALYZE BUTTON
           ---------------------------------------------------- */

        const runButton =
            document.getElementById("runAnalysis") ||
            document.getElementById("analyzeBtn");


        console.log(
            "[ECG-Sense Analyze] Analyze button:",
            runButton
        );


        if (!runButton) {

            showFatalMessage(
                "Analyze button not found. Check analyze.html for id=\"runAnalysis\"."
            );

            return;
        }


        /* ----------------------------------------------------
           PREVENT DUPLICATE LISTENERS
           ---------------------------------------------------- */

        if (
            runButton.dataset.ecgBound === "true"
        ) {

            console.log(
                "[ECG-Sense Analyze] Button already bound."
            );

            return;
        }


        runButton.dataset.ecgBound = "true";


        /* ----------------------------------------------------
           CLICK
           ---------------------------------------------------- */

        runButton.addEventListener(
            "click",
            handleAnalyzeClick
        );


        console.log(
            "[ECG-Sense Analyze] Analyze button successfully bound."
        );


        /* ----------------------------------------------------
           REPORT BUTTONS
           ---------------------------------------------------- */

        setupReportLinks(
            currentRecord
        );


    } catch (error) {

        console.error(
            "[ECG-Sense Analyze] INITIALIZATION ERROR:",
            error
        );

        showFatalMessage(
            error.message ||
            "Unable to initialize ECG analysis."
        );
    }
}


/* ============================================================
   ANALYZE CLICK
   ============================================================ */

async function handleAnalyzeClick(event) {

    event.preventDefault();

    event.stopPropagation();


    const button =
        event.currentTarget;


    console.log("==================================================");
    console.log("[ECG-Sense Analyze] ANALYZE BUTTON CLICKED");
    console.log("[ECG-Sense Analyze] Record:", currentRecord);
    console.log("==================================================");


    setLoading(
        button,
        true,
        "Analyzing..."
    );


    setText(
        "analysisStatus",
        `Running ECG-Sense analysis for Record ${currentRecord}...`
    );


    try {

        /* ====================================================
           STEP 1
           SUMMARY
           ==================================================== */

        console.log(
            "[ECG-Sense Analyze] STEP 1 → SUMMARY"
        );


        const summaryEndpoint =
            `/records/${encodeURIComponent(
                currentRecord
            )}/summary`;


        console.log(
            "[ECG-Sense Analyze] Summary endpoint:",
            summaryEndpoint
        );


        const summaryResponse =
            await apiGet(
                summaryEndpoint
            );


        console.log(
            "[ECG-Sense Analyze] SUMMARY RESPONSE:",
            summaryResponse
        );


        if (
            !summaryResponse ||
            !summaryResponse.data
        ) {

            throw new Error(
                "Summary API returned no data."
            );
        }


        const summary =
            summaryResponse.data;


        console.log(
            "[ECG-Sense Analyze] SUMMARY DATA:",
            summary
        );


        /* ====================================================
           STEP 2
           SHOW DATA IMMEDIATELY
           ==================================================== */

        renderRecordSummary(
            summary
        );


        setText(
            "analysisStatus",
            "ECG summary loaded. Loading waveform..."
        );


        /* ====================================================
           STEP 3
           WAVEFORM
           ==================================================== */

        console.log(
            "[ECG-Sense Analyze] STEP 2 → WAVEFORM"
        );


        await loadRecordWaveform(
            currentRecord
        );


        /* ====================================================
           STEP 4
           SAVE
           ==================================================== */

        if (
            typeof saveSession === "function" &&
            typeof ECG_APP !== "undefined"
        ) {

            saveSession(
                ECG_APP.storage.currentSummary,
                summary
            );

            console.log(
                "[ECG-Sense Analyze] Summary saved to sessionStorage."
            );
        }


        /* ====================================================
           STEP 5
           SUCCESS
           ==================================================== */

        setText(
            "analysisStatus",
            `Record ${currentRecord} analysis completed successfully.`
        );


        setText(
            "analysisId",
            "Analysis Complete"
        );


        if (
            typeof notify === "function"
        ) {

            notify(
                `Record ${currentRecord} analyzed successfully.`,
                "success",
                4000
            );
        }


        setLoading(
            button,
            false,
            "Analysis Complete"
        );


        setupReportLinks(
            currentRecord
        );


        console.log(
            "[ECG-Sense Analyze] ANALYSIS COMPLETED SUCCESSFULLY"
        );


    } catch (error) {

        console.error(
            "=================================================="
        );

        console.error(
            "[ECG-Sense Analyze] ANALYSIS FAILED"
        );

        console.error(
            "Message:",
            error?.message
        );

        console.error(
            "Stack:",
            error?.stack
        );

        console.error(
            "=================================================="
        );


        setText(
            "analysisStatus",
            `Analysis failed: ${
                error?.message ||
                "Unknown error"
            }`
        );


        setText(
            "analysisId",
            "Analysis Failed"
        );


        if (
            typeof notify === "function"
        ) {

            notify(
                error?.message ||
                "ECG analysis failed.",
                "error",
                8000
            );
        }


        setLoading(
            button,
            false,
            "Analyze ECG"
        );
    }
}


/* ============================================================
   SUMMARY RENDER
   ============================================================ */

function renderRecordSummary(summary) {

    console.log(
        "[ECG-Sense Analyze] Rendering summary:",
        summary
    );


    setText(
        "analysisRecord",
        summary.record ||
        `Record ${currentRecord}`
    );


    setText(
        "analysisId",
        "Analysis Complete"
    );


    setText(
        "referenceBeats",
        formatNumber(
            summary.reference_beats
        )
    );


    setText(
        "detectedPeaks",
        formatNumber(
            summary.detected_peaks
        )
    );


    setText(
        "signalQuality",
        summary.signal_quality ||
        "Good"
    );


    setText(
        "duration",
        summary.duration_seconds != null
            ? `${Number(
                summary.duration_seconds
            ).toFixed(2)} s`
            : "—"
    );


    setText(
        "analysisDescription",
        `MIT-BIH Record ${
            summary.record ||
            currentRecord
        } processed by the ECG-Sense deterministic ECG signal-processing pipeline.`
    );


    console.log(
        "[ECG-Sense Analyze] Metrics rendered successfully."
    );
}


/* ============================================================
   WAVEFORM
   ============================================================ */

async function loadRecordWaveform(record) {

    const endpoint =
        `/records/${encodeURIComponent(
            record
        )}/waveform?start=0&duration=10`;


    console.log(
        "[ECG-Sense Analyze] Waveform endpoint:",
        endpoint
    );


    const response =
        await apiGet(
            endpoint
        );


    console.log(
        "[ECG-Sense Analyze] WAVEFORM RESPONSE:",
        response
    );


    if (
        !response ||
        !response.data
    ) {

        throw new Error(
            "Waveform API returned no data."
        );
    }


    const waveform =
        response.data;


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


    console.log(
        "[ECG-Sense Analyze] Signal length:",
        signal.length
    );


    console.log(
        "[ECG-Sense Analyze] Peaks:",
        peaks
    );


    if (!signal.length) {

        throw new Error(
            "Waveform API returned an empty signal."
        );
    }


    currentWaveform = {
        signal: signal,
        detected_peaks: peaks
    };


    const canvas =
        document.getElementById("ecgCanvas") ||
        document.getElementById("userEcgCanvas");


    if (!canvas) {

        throw new Error(
            "ECG canvas not found."
        );
    }


    drawWaveformCanvas(
        canvas,
        {
            signal,
            peaks
        }
    );


    console.log(
        "[ECG-Sense Analyze] ECG GRAPH DRAWN SUCCESSFULLY"
    );
}


/* ============================================================
   DRAW WAVEFORM
   ============================================================ */

function drawWaveformCanvas(
    canvas,
    waveform
) {

    if (!canvas) {
        return;
    }


    const ctx =
        canvas.getContext("2d");


    if (!ctx) {
        throw new Error(
            "Canvas 2D context unavailable."
        );
    }


    const rect =
        canvas.getBoundingClientRect();


    const dpr =
        window.devicePixelRatio ||
        1;


    const width =
        Math.max(
            320,
            rect.width ||
            canvas.clientWidth ||
            800
        );


    const height =
        Math.max(
            220,
            rect.height ||
            canvas.clientHeight ||
            300
        );


    canvas.width =
        Math.floor(
            width * dpr
        );


    canvas.height =
        Math.floor(
            height * dpr
        );


    canvas.style.display =
        "block";


    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    const signal =
        Array.isArray(
            waveform.signal
        )
            ? waveform.signal
            : [];


    const peaks =
        Array.isArray(
            waveform.peaks
        )
            ? waveform.peaks
            : [];


    if (!signal.length) {

        ctx.fillStyle =
            "#64748b";

        ctx.font =
            "600 14px system-ui";

        ctx.fillText(
            "No ECG waveform available.",
            20,
            30
        );

        return;
    }


    /* --------------------------------------------------------
       BACKGROUND
       -------------------------------------------------------- */

    ctx.fillStyle =
        "#ffffff";

    ctx.fillRect(
        0,
        0,
        width,
        height
    );


    /* --------------------------------------------------------
       GRID
       -------------------------------------------------------- */

    drawGrid(
        ctx,
        width,
        height
    );


    /* --------------------------------------------------------
       MIN / MAX
       -------------------------------------------------------- */

    let min =
        Infinity;

    let max =
        -Infinity;


    for (
        let i = 0;
        i < signal.length;
        i++
    ) {

        const value =
            Number(
                signal[i]
            );


        if (
            Number.isFinite(value)
        ) {

            if (value < min) {
                min = value;
            }

            if (value > max) {
                max = value;
            }
        }
    }


    if (
        !Number.isFinite(min) ||
        !Number.isFinite(max)
    ) {

        throw new Error(
            "ECG signal contains invalid values."
        );
    }


    const range =
        max - min ||
        1;


    const top =
        24;

    const bottom =
        38;


    const plotHeight =
        Math.max(
            100,
            height - top - bottom
        );


    const mapY =
        value => {

            const normalized =
                (
                    Number(value) -
                    min
                ) / range;


            return (
                top +
                (
                    1 -
                    normalized
                ) *
                plotHeight
            );
        };


    const divisor =
        Math.max(
            1,
            signal.length - 1
        );


    /* --------------------------------------------------------
       ECG LINE
       -------------------------------------------------------- */

    ctx.beginPath();


    ctx.strokeStyle =
        "#2563eb";


    ctx.lineWidth =
        window.innerWidth < 600
            ? 1.35
            : 1.8;


    ctx.lineJoin =
        "round";


    ctx.lineCap =
        "round";


    for (
        let i = 0;
        i < signal.length;
        i++
    ) {

        const x =
            (
                i /
                divisor
            ) *
            width;


        const y =
            mapY(
                signal[i]
            );


        if (i === 0) {

            ctx.moveTo(
                x,
                y
            );

        } else {

            ctx.lineTo(
                x,
                y
            );
        }
    }


    ctx.stroke();


    /* --------------------------------------------------------
       PEAKS
       -------------------------------------------------------- */

    ctx.fillStyle =
        "#dc2626";


    peaks.forEach(
        peak => {

            const index =
                Number(peak);


            if (
                !Number.isFinite(index)
            ) {
                return;
            }


            if (
                index < 0 ||
                index >= signal.length
            ) {
                return;
            }


            const x =
                (
                    index /
                    divisor
                ) *
                width;


            const y =
                mapY(
                    signal[index]
                );


            ctx.beginPath();


            ctx.arc(
                x,
                y,
                4,
                0,
                Math.PI * 2
            );


            ctx.fill();


            ctx.strokeStyle =
                "rgba(220,38,38,.35)";


            ctx.lineWidth =
                1;


            ctx.beginPath();


            ctx.moveTo(
                x,
                y - 22
            );


            ctx.lineTo(
                x,
                y - 7
            );


            ctx.stroke();
        }
    );


    /* --------------------------------------------------------
       LABEL
       -------------------------------------------------------- */

    ctx.fillStyle =
        "#64748b";


    ctx.font =
        "600 12px system-ui";


    ctx.fillText(
        "ECG waveform · detected R-peaks",
        14,
        height - 12
    );
}


/* ============================================================
   GRID
   ============================================================ */

function drawGrid(
    ctx,
    width,
    height
) {

    ctx.save();


    ctx.strokeStyle =
        "rgba(148,163,184,.16)";


    ctx.lineWidth =
        1;


    const vertical =
        Math.max(
            25,
            width / 40
        );


    const horizontal =
        28;


    for (
        let x = 0;
        x <= width;
        x += vertical
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x,
            0
        );

        ctx.lineTo(
            x,
            height
        );

        ctx.stroke();
    }


    for (
        let y = 0;
        y <= height;
        y += horizontal
    ) {

        ctx.beginPath();

        ctx.moveTo(
            0,
            y
        );

        ctx.lineTo(
            width,
            y
        );

        ctx.stroke();
    }


    ctx.restore();
}


/* ============================================================
   REPORT LINKS
   ============================================================ */

function setupReportLinks(record) {

    document
        .querySelectorAll(
            'a[href*="report.html"]'
        )
        .forEach(
            link => {

                link.href =
                    `report.html?record=${encodeURIComponent(
                        record
                    )}`;
            }
        );
}


/* ============================================================
   SAVED ANALYSIS
   ============================================================ */

async function loadSavedAnalysis(
    analysisId
) {

    try {

        setText(
            "analysisStatus",
            "Loading saved analysis..."
        );


        const response =
            await apiGet(
                `/analyses/${encodeURIComponent(
                    analysisId
                )}`
            );


        if (
            !response ||
            !response.data
        ) {

            throw new Error(
                "Saved analysis not found."
            );
        }


        const saved =
            response.data;


        saveCurrentAnalysis(
            saved
        );


        renderSavedAnalysis(
            saved
        );


        await renderSavedWaveform(
            saved
        );


        setText(
            "analysisStatus",
            "Saved analysis loaded successfully."
        );


    } catch (error) {

        console.error(
            "[ECG-Sense Analyze] Saved analysis error:",
            error
        );


        setText(
            "analysisStatus",
            `Error: ${error.message}`
        );


        notify(
            error.message,
            "error",
            8000
        );
    }
}


/* ============================================================
   SAVED RENDER
   ============================================================ */

function renderSavedAnalysis(saved) {

    const analysis =
        saved.engine ||
        saved;


    setText(
        "analysisId",
        saved.id ||
        "Saved Analysis"
    );


    setText(
        "analysisRecord",
        saved.record ||
        saved.source_name ||
        "Uploaded ECG"
    );


    setText(
        "referenceBeats",
        analysis.reference_beats != null
            ? formatNumber(
                analysis.reference_beats
            )
            : "N/A"
    );


    setText(
        "detectedPeaks",
        analysis.detected_peaks != null
            ? formatNumber(
                analysis.detected_peaks
            )
            : "N/A"
    );


    setText(
        "signalQuality",
        analysis.signal_quality ||
        "Good"
    );


    setText(
        "duration",
        analysis.duration_seconds != null
            ? `${Number(
                analysis.duration_seconds
            ).toFixed(2)} s`
            : "N/A"
    );


    setText(
        "analysisStatus",
        "Saved analysis loaded."
    );
}


/* ============================================================
   SAVED WAVEFORM
   ============================================================ */

async function renderSavedWaveform(saved) {

    const canvas =
        document.getElementById("ecgCanvas") ||
        document.getElementById("userEcgCanvas");


    if (!canvas) {
        return;
    }


    const analysis =
        saved.engine ||
        saved;


    const signal =
        analysis.filtered_signal ||
        analysis.signal ||
        [];


    const peaks =
        analysis.detected_samples ||
        analysis.detected_peaks ||
        [];


    if (
        Array.isArray(signal) &&
        signal.length
    ) {

        currentWaveform = {
            signal,
            detected_peaks: peaks
        };


        drawWaveformCanvas(
            canvas,
            {
                signal,
                peaks
            }
        );
    }
}


/* ============================================================
   ERROR MESSAGE
   ============================================================ */

function showFatalMessage(message) {

    setText(
        "analysisStatus",
        message
    );


    const canvas =
        document.getElementById("ecgCanvas");


    if (canvas) {

        const ctx =
            canvas.getContext("2d");


        if (ctx) {

            ctx.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );


            ctx.fillStyle =
                "#dc2626";


            ctx.font =
                "600 15px system-ui";


            ctx.fillText(
                message,
                20,
                35
            );
        }
    }


    if (
        typeof notify === "function"
    ) {

        notify(
            message,
            "error",
            8000
        );
    }
}


/* ============================================================
   RESIZE
   ============================================================ */

window.addEventListener(
    "resize",
    () => {

        clearTimeout(
            waveformResizeTimer
        );


        waveformResizeTimer =
            setTimeout(
                () => {

                    if (
                        !currentWaveform
                    ) {
                        return;
                    }


                    const canvas =
                        document.getElementById(
                            "ecgCanvas"
                        ) ||
                        document.getElementById(
                            "userEcgCanvas"
                        );


                    if (canvas) {

                        drawWaveformCanvas(
                            canvas,
                            {
                                signal:
                                    currentWaveform.signal,

                                peaks:
                                    currentWaveform.detected_peaks
                            }
                        );
                    }

                },
                180
            );
    }
);


console.log(
    "[ECG-Sense Analyze] analyze.js READY."
);