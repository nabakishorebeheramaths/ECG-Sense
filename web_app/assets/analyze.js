"use strict";

/* ============================================================
   ECG-SENSE ANALYSIS PAGE
   COMPLETE WORKING VERSION
   ============================================================ */

let waveformResizeTimer = null;
let currentRecord = null;
let currentWaveform = null;


/* ============================================================
   DEBUG
   ============================================================ */

console.log("==================================================");
console.log("[ECG-Sense Analyze] analyze.js LOADED");
console.log("[ECG-Sense Analyze] URL:", window.location.href);
console.log("[ECG-Sense Analyze] Time:", new Date().toISOString());
console.log("==================================================");


/* ============================================================
   DOM READY
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "[ECG-Sense Analyze] DOM READY"
        );

        const mode =
            getParam("mode");

        const analysisId =
            getParam("id");

        const record =
            getParam("record") ||
            "102";

        currentRecord = record;

        console.log(
            "[ECG-Sense Analyze] Mode:",
            mode
        );

        console.log(
            "[ECG-Sense Analyze] Analysis ID:",
            analysisId
        );

        console.log(
            "[ECG-Sense Analyze] Record:",
            record
        );


        const runButton =
            $("runAnalysis") ||
            $("analyzeBtn");


        console.log(
            "[ECG-Sense Analyze] Run button:",
            runButton
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
           SAMPLE / RECORD
           ---------------------------------------------------- */

        setupSampleAnalysis(
            record,
            runButton
        );
    }
);


/* ============================================================
   SAMPLE / RECORD ANALYSIS
   ============================================================ */

function setupSampleAnalysis(
    record,
    runButton
) {

    console.log(
        "[ECG-Sense Analyze] setupSampleAnalysis()",
        record
    );


    setText(
        "analysisStatus",
        `MIT-BIH Record ${record} is ready.`
    );


    if (!runButton) {

        console.warn(
            "[ECG-Sense Analyze] Analyze button not found."
        );

        return;
    }


    runButton.addEventListener(
        "click",
        async () => {

            console.log(
                "[ECG-Sense Analyze] ANALYZE BUTTON CLICKED"
            );


            setLoading(
                runButton,
                true,
                "Analyzing..."
            );


            setText(
                "analysisStatus",
                `Running ECG-Sense analysis for Record ${record}...`
            );


            try {

                /* =================================================
                   STEP 1 — SUMMARY
                   ================================================= */

                console.log(
                    "[ECG-Sense Analyze] STEP 1: Loading summary..."
                );


                const response =
                    await apiGet(
                        `/records/${encodeURIComponent(
                            record
                        )}/summary`
                    );


                console.log(
                    "[ECG-Sense Analyze] SUMMARY RESPONSE:",
                    response
                );


                if (
                    !response ||
                    !response.data
                ) {

                    throw new Error(
                        "Backend returned empty ECG summary."
                    );
                }


                const summary =
                    response.data;


                console.log(
                    "[ECG-Sense Analyze] SUMMARY DATA:",
                    summary
                );


                /* =================================================
                   STEP 2 — RENDER METRICS IMMEDIATELY
                   ================================================= */

                renderRecordSummary(
                    summary
                );


                /* =================================================
                   STEP 3 — WAVEFORM
                   ================================================= */

                setText(
                    "analysisStatus",
                    "Loading ECG waveform..."
                );


                console.log(
                    "[ECG-Sense Analyze] STEP 2: Loading waveform..."
                );


                await loadRecordWaveform(
                    record
                );


                console.log(
                    "[ECG-Sense Analyze] WAVEFORM LOADED SUCCESSFULLY"
                );


                /* =================================================
                   STEP 4 — SAVE SUMMARY
                   ================================================= */

                saveSession(
                    ECG_APP.storage.currentSummary,
                    summary
                );


                console.log(
                    "[ECG-Sense Analyze] Summary saved."
                );


                setText(
                    "analysisStatus",
                    `Record ${record} analysis completed successfully.`
                );


                notify(
                    `Record ${record} analyzed successfully.`,
                    "success"
                );


                /* =================================================
                   STEP 5 — DO NOT IMMEDIATELY NAVIGATE
                   ================================================= */

                /*
                   IMPORTANT:

                   Previously we immediately navigated to report.html.

                   That made the Analyze page appear to do nothing.

                   Now we keep the graph visible for the user.
                */


                setLoading(
                    runButton,
                    false,
                    "Analysis Complete"
                );


                /*
                   Optional report navigation.
                   User can use "View Report".
                */

                setupViewReportButton(
                    record
                );


            } catch (error) {

                console.error(
                    "[ECG-Sense Analyze] ANALYSIS FAILED:",
                    error
                );

                console.error(
                    "[ECG-Sense Analyze] MESSAGE:",
                    error?.message
                );

                console.error(
                    "[ECG-Sense Analyze] STACK:",
                    error?.stack
                );


                setText(
                    "analysisStatus",
                    error?.message ||
                    "ECG analysis failed."
                );


                notify(
                    error?.message ||
                    "ECG analysis failed.",
                    "error"
                );


                setLoading(
                    runButton,
                    false,
                    "Analyze ECG"
                );
            }
        }
    );
}


/* ============================================================
   RENDER RECORD SUMMARY
   ============================================================ */

function renderRecordSummary(
    summary
) {

    console.log(
        "[ECG-Sense Analyze] renderRecordSummary():",
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
        } processed by the ECG-Sense deterministic signal-processing pipeline.`
    );


    console.log(
        "[ECG-Sense Analyze] Metrics rendered."
    );
}


/* ============================================================
   WAVEFORM FETCH + DRAW
   ============================================================ */

async function loadRecordWaveform(
    record
) {

    console.log(
        "[ECG-Sense Analyze] loadRecordWaveform():",
        record
    );


    const endpoint =
        `/records/${encodeURIComponent(
            record
        )}/waveform?start=0&duration=10`;


    console.log(
        "[ECG-Sense Analyze] WAVEFORM API:",
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
            "Backend returned empty waveform data."
        );
    }


    const waveform =
        response.data;


    console.log(
        "[ECG-Sense Analyze] Signal length:",
        Array.isArray(
            waveform.signal
        )
            ? waveform.signal.length
            : "NOT ARRAY"
    );


    console.log(
        "[ECG-Sense Analyze] Detected peaks:",
        waveform.detected_peaks
    );


    currentWaveform =
        waveform;


    const canvas =
        $("ecgCanvas") ||
        $("userEcgCanvas");


    if (!canvas) {

        throw new Error(
            "ECG canvas not found on analysis page."
        );
    }


    drawWaveformCanvas(
        canvas,
        {
            signal:
                waveform.signal ||
                [],

            peaks:
                waveform.detected_peaks ||
                []
        }
    );


    console.log(
        "[ECG-Sense Analyze] ECG GRAPH DRAWN."
    );
}


/* ============================================================
   CANVAS DRAW
   ============================================================ */

function drawWaveformCanvas(
    canvas,
    waveform
) {

    console.log(
        "[ECG-Sense Analyze] drawWaveformCanvas()"
    );


    if (!canvas) {
        return;
    }


    const ctx =
        canvas.getContext("2d");


    if (!ctx) {

        console.error(
            "[ECG-Sense Analyze] Canvas 2D context unavailable."
        );

        return;
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


    /* ========================================================
       BACKGROUND
       ======================================================== */

    ctx.fillStyle =
        "#ffffff";

    ctx.fillRect(
        0,
        0,
        width,
        height
    );


    /* ========================================================
       GRID
       ======================================================== */

    drawGrid(
        ctx,
        width,
        height
    );


    /* ========================================================
       MIN / MAX
       ======================================================== */

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
            Number.isFinite(
                value
            )
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
    }


    if (
        !Number.isFinite(min) ||
        !Number.isFinite(max)
    ) {

        return;
    }


    const range =
        max - min ||
        1;


    const topPadding =
        25;

    const bottomPadding =
        35;


    const plotHeight =
        height -
        topPadding -
        bottomPadding;


    const mapY =
        value => {

            const normalized =
                (
                    Number(value) -
                    min
                ) / range;


            return (
                topPadding +
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


    /* ========================================================
       ECG SIGNAL
       ======================================================== */

    ctx.beginPath();


    ctx.strokeStyle =
        "#2563eb";


    ctx.lineWidth =
        1.8;


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


    /* ========================================================
       PEAK MARKERS
       ======================================================== */

    for (
        let i = 0;
        i < peaks.length;
        i++
    ) {

        const sample =
            Number(
                peaks[i]
            );


        if (
            !Number.isFinite(
                sample
            )
        ) {
            continue;
        }


        if (
            sample < 0 ||
            sample >= signal.length
        ) {
            continue;
        }


        const x =
            (
                sample /
                divisor
            ) *
            width;


        const y =
            mapY(
                signal[
                    sample
                ]
            );


        ctx.fillStyle =
            "#dc2626";


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


    /* ========================================================
       LABEL
       ======================================================== */

    ctx.fillStyle =
        "#64748b";


    ctx.font =
        "600 12px system-ui";


    ctx.fillText(
        "ECG waveform · detected R-peaks",
        14,
        height - 12
    );


    console.log(
        "[ECG-Sense Analyze] Canvas drawing complete."
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


    const verticalSpacing =
        Math.max(
            25,
            width / 40
        );


    const horizontalSpacing =
        28;


    for (
        let x = 0;
        x <= width;
        x += verticalSpacing
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
        y += horizontalSpacing
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
   SAVED UPLOAD
   ============================================================ */

async function loadSavedAnalysis(
    analysisId
) {

    console.log(
        "[ECG-Sense Analyze] Loading saved analysis:",
        analysisId
    );


    setText(
        "analysisStatus",
        "Loading saved analysis..."
    );


    try {

        const response =
            await apiGet(
                `/analyses/${encodeURIComponent(
                    analysisId
                )}`
            );


        const saved =
            response.data;


        console.log(
            "[ECG-Sense Analyze] SAVED ANALYSIS:",
            saved
        );


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
            "Saved analysis loaded."
        );


    } catch (error) {

        console.error(
            "[ECG-Sense Analyze] Saved analysis failed:",
            error
        );


        setText(
            "analysisStatus",
            error.message
        );


        notify(
            error.message,
            "error"
        );
    }
}


/* ============================================================
   SAVED ANALYSIS RENDER
   ============================================================ */

function renderSavedAnalysis(
    saved
) {

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
        "analysisStatus",
        `Detected ${
            formatNumber(
                analysis.detected_peaks
            )
        } heartbeat peaks.`
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
        formatNumber(
            analysis.detected_peaks
        )
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
}


/* ============================================================
   SAVED WAVEFORM
   ============================================================ */

async function renderSavedWaveform(
    saved
) {

    const canvas =
        $("ecgCanvas") ||
        $("userEcgCanvas");


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
   VIEW REPORT BUTTON
   ============================================================ */

function setupViewReportButton(
    record
) {

    const links =
        document.querySelectorAll(
            'a[href="report.html"], a[href$="/report.html"]'
        );


    links.forEach(
        link => {

            link.href =
                `report.html?record=${encodeURIComponent(
                    record
                )}`;


            link.onclick =
                () => {

                    console.log(
                        "[ECG-Sense Analyze] Opening report page:",
                        link.href
                    );
                };
        }
    );
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
                        currentWaveform
                    ) {

                        const canvas =
                            $("ecgCanvas") ||
                            $("userEcgCanvas");


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
                    }

                },
                180
            );
    }
);


console.log(
    "[ECG-Sense Analyze] analyze.js initialization complete."
);