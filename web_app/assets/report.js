
"use strict";

/* ============================================================
   ECG-SENSE USER REPORT
   Reliable report loader for:
   1. MIT-BIH record reports
   2. Uploaded ECG analysis
   3. Saved session summary
   ============================================================ */

document.addEventListener("DOMContentLoaded", initReport);


/* ============================================================
   INITIALIZATION
   ============================================================ */

async function initReport() {

    console.log("[ECG-Sense] Report page initialized.");

    const record = getParam("record");

    console.log("[ECG-Sense] Record parameter:", record);

    /*
     * IMPORTANT:
     * If ?record=102 exists, ALWAYS load the backend record first.
     * Do not allow an old currentAnalysis session to override it.
     */
    if (record) {

        await loadRecordReport(record);

        setupReportButtons();

        return;
    }


    /*
     * No record parameter.
     * Try uploaded ECG analysis.
     */
    const saved = loadCurrentAnalysis();

    console.log(
        "[ECG-Sense] Saved analysis:",
        saved
    );

    if (saved) {

        renderUploadReport(saved);

        setupReportButtons();

        return;
    }


    /*
     * Try saved summary.
     */
    const summary = loadSession(
        ECG_APP.storage.currentSummary
    );

    console.log(
        "[ECG-Sense] Saved summary:",
        summary
    );

    if (summary) {

        renderSummary(summary);

    } else {

        showEmptyState();
    }

    setupReportButtons();
}


/* ============================================================
   RECORD REPORT
   ============================================================ */

async function loadRecordReport(record) {

    try {

        console.log(
            "[ECG-Sense] Loading summary for record:",
            record
        );


        /*
         * ----------------------------------------------------
         * 1. LOAD SUMMARY
         * ----------------------------------------------------
         */

        const summaryResponse = await apiGet(
            `/records/${encodeURIComponent(record)}/summary`
        );

        console.log(
            "[ECG-Sense] Summary response:",
            summaryResponse
        );


        const summary =
            summaryResponse?.data ||
            summaryResponse;


        if (!summary) {

            throw new Error(
                "No summary data was returned for this ECG record."
            );
        }


        renderSummary(summary);


        /*
         * Save summary so the report survives navigation.
         */
        saveSession(
            ECG_APP.storage.currentSummary,
            summary
        );


        /*
         * ----------------------------------------------------
         * 2. LOAD WAVEFORM
         * ----------------------------------------------------
         */

        const canvas =
            $("userEcgCanvas") ||
            $("ecgCanvas");


        if (!canvas) {

            console.warn(
                "[ECG-Sense] ECG canvas not found."
            );

            return;
        }


        console.log(
            "[ECG-Sense] Loading waveform..."
        );


        const waveformResponse = await apiGet(
            `/records/${encodeURIComponent(record)}/waveform?start=0&duration=10`
        );


        console.log(
            "[ECG-Sense] Waveform response:",
            waveformResponse
        );


        const waveform =
            waveformResponse?.data ||
            waveformResponse;


        const signal =
            Array.isArray(waveform?.signal)
                ? waveform.signal
                : [];


        const peaks =
            Array.isArray(waveform?.detected_peaks)
                ? waveform.detected_peaks
                : [];


        console.log(
            "[ECG-Sense] Waveform samples:",
            signal.length
        );

        console.log(
            "[ECG-Sense] Detected peaks:",
            peaks.length
        );


        if (!signal.length) {

            console.warn(
                "[ECG-Sense] No waveform samples received."
            );

            return;
        }


        /*
         * Draw waveform.
         */
        drawReportWaveform(
            canvas,
            signal,
            peaks
        );


    } catch (error) {

        console.error(
            "[ECG-Sense] Report loading failed:",
            error
        );


        notify(
            error.message ||
            "Unable to load ECG report.",
            "error"
        );
    }
}


/* ============================================================
   SUMMARY RENDER
   ============================================================ */

function renderSummary(summary) {

    console.log(
        "[ECG-Sense] Rendering summary:",
        summary
    );


    /*
     * Main metrics
     */

    setText(
        "userBeatCount",
        formatNumber(
            summary.detected_peaks
        )
    );


    setText(
        "userSignalQuality",
        summary.signal_quality ||
        "Good"
    );


    /*
     * F1 score determines analysis quality.
     */

    const f1 =
        summary.f1;


    let analysisQuality =
        "Processing Complete";


    if (
        f1 !== null &&
        f1 !== undefined &&
        f1 !== ""
    ) {

        const numericF1 =
            Number(f1);


        if (numericF1 >= 99) {

            analysisQuality =
                "Excellent";

        } else if (numericF1 >= 97) {

            analysisQuality =
                "Very Good";

        } else {

            analysisQuality =
                "Good";
        }
    }


    setText(
        "userAnalysisQuality",
        analysisQuality
    );


    /*
     * Technical snapshot
     */

    setText(
        "detailReference",
        formatNumber(
            summary.reference_beats
        )
    );


    setText(
        "detailDetected",
        formatNumber(
            summary.detected_peaks
        )
    );


    setText(
        "detailTP",
        formatNumber(
            summary.tp
        )
    );


    setText(
        "detailFP",
        formatNumber(
            summary.fp
        )
    );


    setText(
        "detailFN",
        formatNumber(
            summary.fn
        )
    );


    setText(
        "detailF1",
        formatPercent(
            summary.f1
        )
    );


    /*
     * Record name
     */

    setText(
        "reportRecord",
        summary.record
            ? `MIT-BIH Record ${summary.record}`
            : "Uploaded ECG"
    );


    /*
     * Description
     */

    if (summary.record) {

        setText(
            "reportDescription",
            `MIT-BIH Record ${summary.record} was processed using the ECG-Sense signal-processing pipeline.`
        );

    } else {

        setText(
            "reportDescription",
            "Your ECG was processed using the ECG-Sense signal-processing pipeline."
        );
    }
}


/* ============================================================
   UPLOADED ECG REPORT
   ============================================================ */

function renderUploadReport(saved) {

    console.log(
        "[ECG-Sense] Rendering uploaded ECG analysis:",
        saved
    );


    const analysis =
        saved?.engine ||
        saved;


    if (!analysis) {

        showEmptyState();

        return;
    }


    /*
     * Main metrics
     */

    setText(
        "userBeatCount",
        formatNumber(
            analysis.detected_peaks
        )
    );


    setText(
        "userSignalQuality",
        analysis.signal_quality ||
        "Good"
    );


    setText(
        "userAnalysisQuality",
        analysis.signal_quality ||
        "Processing Complete"
    );


    /*
     * Report title
     */

    setText(
        "reportRecord",
        saved.source_name ||
        saved.filename ||
        "Uploaded ECG"
    );


    /*
     * Description
     */

    if (saved.id) {

        setText(
            "reportDescription",
            `Analysis ID: ${saved.id}`
        );

    } else {

        setText(
            "reportDescription",
            "Your uploaded ECG was processed successfully."
        );
    }


    /*
     * Reference comparison is not available
     * for arbitrary uploaded ECGs.
     */

    setText(
        "detailReference",
        "Not available"
    );


    setText(
        "detailDetected",
        formatNumber(
            analysis.detected_peaks
        )
    );


    setText(
        "detailTP",
        "Not available"
    );


    setText(
        "detailFP",
        "Not available"
    );


    setText(
        "detailFN",
        "Not available"
    );


    setText(
        "detailF1",
        "Not available"
    );


    /*
     * Draw uploaded ECG waveform if available.
     */

    const canvas =
        $("userEcgCanvas") ||
        $("ecgCanvas");


    if (!canvas) {

        return;
    }


    const signal =
        Array.isArray(
            analysis.filtered_signal
        )
            ? analysis.filtered_signal
            : [];


    const peaks =
        Array.isArray(
            analysis.detected_samples
        )
            ? analysis.detected_samples
            : [];


    if (signal.length) {

        drawReportWaveform(
            canvas,
            signal,
            peaks
        );
    }
}


/* ============================================================
   WAVEFORM DRAWER
   ============================================================ */

function drawReportWaveform(
    canvas,
    signal,
    peaks
) {

    /*
     * Prefer the project's existing waveform renderer.
     */
    if (
        typeof drawWaveformCanvas ===
        "function"
    ) {

        try {

            drawWaveformCanvas(
                canvas,
                {
                    signal: signal,
                    peaks: peaks
                }
            );

            console.log(
                "[ECG-Sense] Waveform rendered successfully."
            );

            return;

        } catch (error) {

            console.warn(
                "[ECG-Sense] Existing waveform renderer failed. Using fallback.",
                error
            );
        }
    }


    /*
     * Fallback renderer.
     * This guarantees that the ECG is visible even if
     * analyze.js does not expose drawWaveformCanvas().
     */

    drawFallbackECG(
        canvas,
        signal,
        peaks
    );
}


/* ============================================================
   FALLBACK ECG CANVAS
   ============================================================ */

function drawFallbackECG(
    canvas,
    signal,
    peaks
) {

    const rect =
        canvas.getBoundingClientRect();


    const width =
        Math.max(
            Math.floor(rect.width),
            600
        );


    const height =
        300;


    const dpr =
        window.devicePixelRatio ||
        1;


    canvas.width =
        width * dpr;


    canvas.height =
        height * dpr;


    canvas.style.width =
        `${width}px`;


    canvas.style.height =
        `${height}px`;


    const ctx =
        canvas.getContext("2d");


    if (!ctx) {

        return;
    }


    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );


    /*
     * Background
     */

    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    /*
     * ECG grid
     */

    ctx.strokeStyle =
        "rgba(148,163,184,0.15)";

    ctx.lineWidth = 1;


    const grid = 20;


    for (
        let x = 0;
        x <= width;
        x += grid
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
        y += grid
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


    if (
        !Array.isArray(signal) ||
        signal.length < 2
    ) {

        ctx.fillStyle =
            "#64748b";

        ctx.font =
            "14px Arial";

        ctx.fillText(
            "No ECG waveform available",
            20,
            30
        );

        return;
    }


    /*
     * Calculate min/max.
     */

    let min =
        Infinity;

    let max =
        -Infinity;


    for (
        const value of signal
    ) {

        const number =
            Number(value);


        if (
            Number.isFinite(number)
        ) {

            min =
                Math.min(
                    min,
                    number
                );

            max =
                Math.max(
                    max,
                    number
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
        max - min || 1;


    const padding =
        25;


    const plotHeight =
        height -
        padding * 2;


    /*
     * ECG waveform
     */

    ctx.beginPath();


    for (
        let i = 0;
        i < signal.length;
        i++
    ) {

        const value =
            Number(signal[i]);


        if (
            !Number.isFinite(value)
        ) {

            continue;
        }


        const x =
            (i /
                (signal.length - 1)) *
            width;


        const normalized =
            (value - min) /
            range;


        const y =
            height -
            padding -
            normalized *
                plotHeight;


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


    ctx.strokeStyle =
        "#0f766e";

    ctx.lineWidth = 1.8;

    ctx.lineJoin = "round";

    ctx.lineCap = "round";

    ctx.stroke();


    /*
     * Detected peaks.
     */

    if (
        Array.isArray(peaks) &&
        peaks.length
    ) {

        ctx.fillStyle =
            "#dc2626";


        for (
            const peak of peaks
        ) {

            const index =
                Number(peak);


            if (
                !Number.isFinite(index) ||
                index < 0 ||
                index >= signal.length
            ) {

                continue;
            }


            const value =
                Number(
                    signal[index]
                );


            if (
                !Number.isFinite(value)
            ) {

                continue;
            }


            const x =
                (index /
                    (signal.length - 1)) *
                width;


            const normalized =
                (value - min) /
                range;


            const y =
                height -
                padding -
                normalized *
                    plotHeight;


            ctx.beginPath();

            ctx.arc(
                x,
                y,
                3,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }
    }
}


/* ============================================================
   EMPTY STATE
   ============================================================ */

function showEmptyState() {

    console.warn(
        "[ECG-Sense] No analysis available."
    );


    setText(
        "userBeatCount",
        "—"
    );


    setText(
        "userSignalQuality",
        "Awaiting ECG"
    );


    setText(
        "userAnalysisQuality",
        "—"
    );


    setText(
        "detailReference",
        "—"
    );


    setText(
        "detailDetected",
        "—"
    );


    setText(
        "detailTP",
        "—"
    );


    setText(
        "detailFP",
        "—"
    );


    setText(
        "detailFN",
        "—"
    );


    setText(
        "detailF1",
        "—"
    );


    setText(
        "reportRecord",
        "ECG Analysis"
    );


    setText(
        "reportDescription",
        "No ECG analysis is available yet."
    );


    notify(
        "No analysis is available yet.",
        "warning"
    );
}


/* ============================================================
   BUTTONS
   ============================================================ */

function setupReportButtons() {

    const detailedButton =
        $("viewDetailedReport");


    if (detailedButton) {

        detailedButton.addEventListener(
            "click",
            () => {

                navigate(
                    "advanced.html"
                );
            }
        );
    }


    const newAnalysis =
        $("newAnalysis");


    if (newAnalysis) {

        newAnalysis.addEventListener(
            "click",
            () => {

                /*
                 * Clear old analysis so the next upload
                 * starts cleanly.
                 */

                removeSession(
                    ECG_APP.storage.currentAnalysis
                );

                removeSession(
                    ECG_APP.storage.currentSummary
                );

                navigate(
                    "upload.html"
                );
            }
        );
    }
}


/* ============================================================
   WINDOW RESIZE
   ============================================================ */

window.addEventListener(
    "resize",
    () => {

        const canvas =
            $("userEcgCanvas");


        if (!canvas) {
            return;
        }


        /*
         * Re-render from saved summary only when
         * a waveform has been stored separately.
         *
         * Avoid unnecessary API calls here.
         */
    }
);
