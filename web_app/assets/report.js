"use strict";

/* ============================================================
   ECG-SENSE REPORT PAGE
   COMPLETE WORKING + DEBUG + WAVEFORM VERSION
   ============================================================ */

console.log("==================================================");
console.log("[ECG-Sense Report] report.js FILE LOADED");
console.log("[ECG-Sense Report] URL:", window.location.href);
console.log("[ECG-Sense Report] Time:", new Date().toISOString());
console.log("==================================================");


/* ============================================================
   GLOBAL ERROR HANDLERS
   ============================================================ */

window.addEventListener("error", function (event) {

    console.error(
        "[ECG-Sense Report] GLOBAL JAVASCRIPT ERROR:",
        event.error || event.message
    );

    console.error(
        "[ECG-Sense Report] File:",
        event.filename
    );

    console.error(
        "[ECG-Sense Report] Line:",
        event.lineno,
        "Column:",
        event.colno
    );
});


window.addEventListener(
    "unhandledrejection",
    function (event) {

        console.error(
            "[ECG-Sense Report] UNHANDLED PROMISE ERROR:",
            event.reason
        );
    }
);


/* ============================================================
   SAFE DOM HELPERS
   ============================================================ */

function safeSetText(id, value) {

    const element = document.getElementById(id);

    if (!element) {

        console.warn(
            `[ECG-Sense Report] Element #${id} NOT FOUND`
        );

        return false;
    }

    element.textContent =
        value === null ||
        value === undefined
            ? "—"
            : String(value);

    return true;
}


function safeFormatNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "—";
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return String(value);
    }

    return number.toLocaleString(
        "en-IN",
        {
            maximumFractionDigits: 0
        }
    );
}


function safeFormatPercent(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "—";
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return String(value);
    }

    return `${number.toFixed(2)}%`;
}


/* ============================================================
   FIND REPORT CANVAS
   ============================================================ */

function getReportCanvas() {

    const canvas =
        document.getElementById("userEcgCanvas") ||
        document.getElementById("ecgCanvas") ||
        document.querySelector("canvas");

    console.log(
        "[ECG-Sense Report] Canvas found:",
        canvas
    );

    return canvas;
}


/* ============================================================
   ECG WAVEFORM DRAWER
   ============================================================ */

function drawReportWaveform(
    canvas,
    signal,
    peaks
) {

    console.log(
        "=================================================="
    );

    console.log(
        "[ECG-Sense Report] drawReportWaveform() START"
    );

    console.log(
        "[ECG-Sense Report] Canvas:",
        canvas
    );

    console.log(
        "[ECG-Sense Report] Signal:",
        signal
    );

    console.log(
        "[ECG-Sense Report] Signal length:",
        Array.isArray(signal)
            ? signal.length
            : "NOT ARRAY"
    );

    console.log(
        "[ECG-Sense Report] Peaks:",
        peaks
    );

    console.log(
        "[ECG-Sense Report] Peak count:",
        Array.isArray(peaks)
            ? peaks.length
            : "NOT ARRAY"
    );


    /* --------------------------------------------------------
       VALIDATION
       -------------------------------------------------------- */

    if (!canvas) {

        console.error(
            "[ECG-Sense Report] Cannot draw waveform: canvas missing."
        );

        return false;
    }


    if (
        !Array.isArray(signal) ||
        signal.length < 2
    ) {

        console.error(
            "[ECG-Sense Report] Cannot draw waveform: signal invalid."
        );

        return false;
    }


    /* --------------------------------------------------------
       CANVAS CONTEXT
       -------------------------------------------------------- */

    const ctx =
        canvas.getContext("2d");

    if (!ctx) {

        console.error(
            "[ECG-Sense Report] Canvas 2D context unavailable."
        );

        return false;
    }


    /* --------------------------------------------------------
       CANVAS SIZE
       -------------------------------------------------------- */

    const rect =
        canvas.getBoundingClientRect();

    let width =
        Math.floor(rect.width);

    if (
        !Number.isFinite(width) ||
        width < 300
    ) {
        width = 900;
    }

    const height = 320;

    const dpr =
        window.devicePixelRatio || 1;


    canvas.width =
        Math.floor(width * dpr);

    canvas.height =
        Math.floor(height * dpr);

    canvas.style.width =
        "100%";

    canvas.style.height =
        `${height}px`;


    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );


    /* --------------------------------------------------------
       CLEAR
       -------------------------------------------------------- */

    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    /* --------------------------------------------------------
       BACKGROUND
       -------------------------------------------------------- */

    ctx.fillStyle =
        "#020617";

    ctx.fillRect(
        0,
        0,
        width,
        height
    );


    /* --------------------------------------------------------
       FIND MIN/MAX
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
            Number(signal[i]);

        if (
            !Number.isFinite(value)
        ) {
            continue;
        }

        if (value < min) {
            min = value;
        }

        if (value > max) {
            max = value;
        }
    }


    if (
        !Number.isFinite(min) ||
        !Number.isFinite(max)
    ) {

        console.error(
            "[ECG-Sense Report] Signal contains no valid numeric values."
        );

        return false;
    }


    if (max === min) {

        max =
            min + 1;
    }


    console.log(
        "[ECG-Sense Report] Signal minimum:",
        min
    );

    console.log(
        "[ECG-Sense Report] Signal maximum:",
        max
    );


    /* --------------------------------------------------------
       GRID
       -------------------------------------------------------- */

    ctx.strokeStyle =
        "rgba(148,163,184,0.14)";

    ctx.lineWidth = 1;


    const gridX = 40;
    const gridY = 32;


    for (
        let x = 0;
        x <= width;
        x += gridX
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
        y += gridY
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


    /* --------------------------------------------------------
       ECG SIGNAL
       -------------------------------------------------------- */

    ctx.strokeStyle =
        "#22c55e";

    ctx.lineWidth =
        1.6;

    ctx.lineJoin =
        "round";

    ctx.lineCap =
        "round";


    ctx.beginPath();


    let started =
        false;


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
            (i / (signal.length - 1))
            * width;


        const normalized =
            (value - min)
            / (max - min);


        const y =
            height -
            20 -
            normalized *
            (height - 40);


        if (!started) {

            ctx.moveTo(
                x,
                y
            );

            started = true;

        } else {

            ctx.lineTo(
                x,
                y
            );
        }
    }


    ctx.stroke();


    /* --------------------------------------------------------
       DETECTED PEAKS
       -------------------------------------------------------- */

    if (
        Array.isArray(peaks) &&
        peaks.length > 0
    ) {

        console.log(
            "[ECG-Sense Report] Drawing",
            peaks.length,
            "detected peaks."
        );


        ctx.fillStyle =
            "#ef4444";


        for (
            const peak of peaks
        ) {

            /*
             * Backend may return:
             * 12
             *
             * or:
             * {index: 12}
             *
             * or:
             * {sample: 12}
             */

            let index;


            if (
                typeof peak === "object" &&
                peak !== null
            ) {

                index =
                    Number(
                        peak.index ??
                        peak.sample ??
                        peak.position ??
                        peak.peak
                    );

            } else {

                index =
                    Number(peak);
            }


            if (
                !Number.isFinite(index)
            ) {
                continue;
            }


            index =
                Math.round(index);


            if (
                index < 0 ||
                index >= signal.length
            ) {
                continue;
            }


            const value =
                Number(signal[index]);


            if (
                !Number.isFinite(value)
            ) {
                continue;
            }


            const x =
                (index / (signal.length - 1))
                * width;


            const normalized =
                (value - min)
                / (max - min);


            const y =
                height -
                20 -
                normalized *
                (height - 40);


            ctx.beginPath();

            ctx.arc(
                x,
                y,
                4,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }
    }


    /* --------------------------------------------------------
       LEGEND
       -------------------------------------------------------- */

    ctx.font =
        "12px Arial";

    ctx.fillStyle =
        "#22c55e";

    ctx.fillText(
        "ECG Signal",
        16,
        22
    );


    ctx.fillStyle =
        "#ef4444";

    ctx.fillText(
        "Detected Peaks",
        100,
        22
    );


    console.log(
        "[ECG-Sense Report] drawReportWaveform() COMPLETE"
    );

    console.log(
        "=================================================="
    );


    return true;
}


/* ============================================================
   LOAD RECORD REPORT
   ============================================================ */

async function loadRecordReport(
    record
) {

    console.log(
        "[ECG-Sense Report] loadRecordReport():",
        record
    );


    if (
        typeof apiGet !==
        "function"
    ) {

        throw new Error(
            "apiGet() is not available."
        );
    }


    try {

        /* ----------------------------------------------------
           SUMMARY
           ---------------------------------------------------- */

        const summaryEndpoint =
            `/records/${encodeURIComponent(
                record
            )}/summary`;


        console.log(
            "[ECG-Sense Report] SUMMARY API:",
            summaryEndpoint
        );


        const response =
            await apiGet(
                summaryEndpoint
            );


        console.log(
            "[ECG-Sense Report] SUMMARY RESPONSE:",
            response
        );


        if (
            !response ||
            !response.data
        ) {

            throw new Error(
                "Backend returned empty summary response."
            );
        }


        const summary =
            response.data;


        console.log(
            "[ECG-Sense Report] Summary data:",
            summary
        );


        renderSummary(
            summary
        );


        /* ----------------------------------------------------
           WAVEFORM
           ---------------------------------------------------- */

        const canvas =
            getReportCanvas();


        if (!canvas) {

            throw new Error(
                "ECG canvas not found on report page."
            );
        }


        const waveformEndpoint =
            `/records/${encodeURIComponent(
                record
            )}/waveform?start=0&duration=10`;


        console.log(
            "[ECG-Sense Report] WAVEFORM API:",
            waveformEndpoint
        );


        const waveform =
            await apiGet(
                waveformEndpoint
            );


        console.log(
            "[ECG-Sense Report] WAVEFORM RESPONSE:",
            waveform
        );


        if (
            !waveform ||
            !waveform.data
        ) {

            throw new Error(
                "Backend returned empty waveform response."
            );
        }


        const signal =
            Array.isArray(
                waveform.data.signal
            )
                ? waveform.data.signal
                : [];


        const peaks =
            Array.isArray(
                waveform.data.detected_peaks
            )
                ? waveform.data.detected_peaks
                : [];


        console.log(
            "[ECG-Sense Report] Signal length:",
            signal.length
        );


        console.log(
            "[ECG-Sense Report] Detected peaks:",
            peaks
        );


        if (
            signal.length === 0
        ) {

            throw new Error(
                "Backend waveform contains no signal samples."
            );
        }


        /* ----------------------------------------------------
           DRAW GRAPH
           ---------------------------------------------------- */

        const drawn =
            drawReportWaveform(
                canvas,
                signal,
                peaks
            );


        if (!drawn) {

            throw new Error(
                "Waveform drawing failed."
            );
        }


        console.log(
            "[ECG-Sense Report] Waveform rendered successfully."
        );


        /* ----------------------------------------------------
           SAVE SESSION
           ---------------------------------------------------- */

        if (
            typeof saveSession ===
                "function" &&
            typeof ECG_APP !==
                "undefined" &&
            ECG_APP &&
            ECG_APP.storage
        ) {

            try {

                saveSession(
                    ECG_APP.storage.currentSummary,
                    summary
                );

                console.log(
                    "[ECG-Sense Report] Summary saved to sessionStorage."
                );

            } catch (storageError) {

                console.warn(
                    "[ECG-Sense Report] Session save failed:",
                    storageError
                );
            }
        }


        console.log(
            "[ECG-Sense Report] RECORD REPORT COMPLETE"
        );


        return {
            summary,
            waveform
        };


    } catch (error) {

        console.error(
            "=================================================="
        );

        console.error(
            "[ECG-Sense Report] RECORD REPORT FAILED"
        );

        console.error(
            "[ECG-Sense Report] Error:",
            error
        );

        console.error(
            "[ECG-Sense Report] Message:",
            error?.message
        );

        console.error(
            "[ECG-Sense Report] Stack:",
            error?.stack
        );

        console.error(
            "=================================================="
        );


        if (
            typeof notify ===
            "function"
        ) {

            notify(
                error?.message ||
                "Unable to load ECG report.",
                "error",
                8000
            );
        }


        throw error;
    }
}


/* ============================================================
   SUMMARY RENDER
   ============================================================ */

function renderSummary(
    summary
) {

    console.log(
        "[ECG-Sense Report] renderSummary():",
        summary
    );


    if (!summary) {

        throw new Error(
            "renderSummary received empty data."
        );
    }


    /* --------------------------------------------------------
       RECORD
       -------------------------------------------------------- */

    safeSetText(
        "reportRecord",
        summary.record ||
        "Uploaded ECG"
    );


    safeSetText(
        "analysisRecord",
        summary.record
            ? `Record ${summary.record}`
            : "Uploaded ECG"
    );


    /* --------------------------------------------------------
       DESCRIPTION
       -------------------------------------------------------- */

    const description =
        summary.record

            ? `MIT-BIH Record ${summary.record} was processed using the validated ECG-Sense signal-processing pipeline.`

            : "Your ECG was processed using the ECG-Sense signal-processing pipeline.";


    safeSetText(
        "reportDescription",
        description
    );


    safeSetText(
        "analysisDescription",
        description
    );


    /* --------------------------------------------------------
       DETECTED BEATS
       -------------------------------------------------------- */

    safeSetText(
        "userBeatCount",
        safeFormatNumber(
            summary.detected_peaks
        )
    );


    safeSetText(
        "detectedPeaks",
        safeFormatNumber(
            summary.detected_peaks
        )
    );


    /* --------------------------------------------------------
       REFERENCE BEATS
       -------------------------------------------------------- */

    safeSetText(
        "detailReference",
        safeFormatNumber(
            summary.reference_beats
        )
    );


    safeSetText(
        "referenceBeats",
        safeFormatNumber(
            summary.reference_beats
        )
    );


    /* --------------------------------------------------------
       SIGNAL QUALITY
       -------------------------------------------------------- */

    const quality =
        summary.signal_quality ||
        "Good";


    safeSetText(
        "userSignalQuality",
        quality
    );


    safeSetText(
        "signalQuality",
        quality
    );


    /* --------------------------------------------------------
       DURATION
       -------------------------------------------------------- */

    const duration =
        summary.duration_seconds;


    const durationText =
        duration !== null &&
        duration !== undefined

            ? `${Number(duration).toFixed(2)} s`

            : "—";


    safeSetText(
        "duration",
        durationText
    );


    /* --------------------------------------------------------
       F1 / ANALYSIS QUALITY
       -------------------------------------------------------- */

    const f1 =
        summary.f1;


    let analysisQuality =
        "Processing Complete";


    if (
        f1 !== null &&
        f1 !== undefined
    ) {

        const numericF1 =
            Number(f1);


        if (
            numericF1 >= 99
        ) {

            analysisQuality =
                "Excellent";

        } else if (
            numericF1 >= 97
        ) {

            analysisQuality =
                "Very Good";

        } else {

            analysisQuality =
                "Good";
        }
    }


    safeSetText(
        "userAnalysisQuality",
        analysisQuality
    );


    /* --------------------------------------------------------
       TECHNICAL SNAPSHOT
       -------------------------------------------------------- */

    safeSetText(
        "detailDetected",
        safeFormatNumber(
            summary.detected_peaks
        )
    );


    safeSetText(
        "detailTP",
        safeFormatNumber(
            summary.tp
        )
    );


    safeSetText(
        "detailFP",
        safeFormatNumber(
            summary.fp
        )
    );


    safeSetText(
        "detailFN",
        safeFormatNumber(
            summary.fn
        )
    );


    safeSetText(
        "detailF1",
        safeFormatPercent(
            summary.f1
        )
    );


    /* --------------------------------------------------------
       ANALYSIS BADGE
       -------------------------------------------------------- */

    safeSetText(
        "analysisId",
        `Record ${summary.record || "ECG"}`
    );


    /* --------------------------------------------------------
       DEBUG
       -------------------------------------------------------- */

    console.log(
        "[ECG-Sense Report] DOM VALUES UPDATED"
    );

    console.log(
        "Record:",
        summary.record
    );

    console.log(
        "Reference Beats:",
        summary.reference_beats
    );

    console.log(
        "Detected Peaks:",
        summary.detected_peaks
    );

    console.log(
        "TP:",
        summary.tp
    );

    console.log(
        "FP:",
        summary.fp
    );

    console.log(
        "FN:",
        summary.fn
    );

    console.log(
        "F1:",
        summary.f1
    );

    console.log(
        "Duration:",
        summary.duration_seconds
    );

    console.log(
        "Analysis Quality:",
        analysisQuality
    );
}


/* ============================================================
   UPLOAD REPORT
   ============================================================ */

function renderUploadReport(
    saved
) {

    console.log(
        "[ECG-Sense Report] renderUploadReport():",
        saved
    );


    const analysis =
        saved.engine ||
        saved;


    safeSetText(
        "userBeatCount",
        safeFormatNumber(
            analysis.detected_peaks
        )
    );


    safeSetText(
        "detectedPeaks",
        safeFormatNumber(
            analysis.detected_peaks
        )
    );


    safeSetText(
        "userSignalQuality",
        analysis.signal_quality ||
        "Good"
    );


    safeSetText(
        "signalQuality",
        analysis.signal_quality ||
        "Good"
    );


    safeSetText(
        "userAnalysisQuality",
        analysis.signal_quality ||
        "Good"
    );


    safeSetText(
        "reportRecord",
        saved.source_name ||
        "Uploaded ECG"
    );


    safeSetText(
        "analysisRecord",
        saved.source_name ||
        "Uploaded ECG"
    );


    safeSetText(
        "reportDescription",
        saved.id
            ? `Analysis ID: ${saved.id}`
            : "Uploaded ECG analysis completed."
    );


    safeSetText(
        "detailReference",
        "Not available"
    );


    safeSetText(
        "referenceBeats",
        "Not available"
    );


    safeSetText(
        "detailDetected",
        safeFormatNumber(
            analysis.detected_peaks
        )
    );


    safeSetText(
        "detailTP",
        "Not available"
    );


    safeSetText(
        "detailFP",
        "Not available"
    );


    safeSetText(
        "detailFN",
        "Not available"
    );


    safeSetText(
        "detailF1",
        "Not available"
    );


    const canvas =
        getReportCanvas();


    const signal =
        analysis.filtered_signal ||
        analysis.signal ||
        [];


    const peaks =
        analysis.detected_samples ||
        analysis.detected_peaks ||
        [];


    if (
        canvas &&
        Array.isArray(signal) &&
        signal.length > 1
    ) {

        drawReportWaveform(
            canvas,
            signal,
            peaks
        );

        console.log(
            "[ECG-Sense Report] Uploaded waveform rendered."
        );
    }
}


/* ============================================================
   EMPTY STATE
   ============================================================ */

function showEmptyState() {

    console.warn(
        "[ECG-Sense Report] No ECG analysis data available."
    );


    safeSetText(
        "userBeatCount",
        "—"
    );


    safeSetText(
        "detectedPeaks",
        "—"
    );


    safeSetText(
        "userSignalQuality",
        "Awaiting ECG"
    );


    safeSetText(
        "signalQuality",
        "Awaiting ECG"
    );


    safeSetText(
        "userAnalysisQuality",
        "—"
    );


    safeSetText(
        "referenceBeats",
        "—"
    );


    safeSetText(
        "detailReference",
        "—"
    );


    safeSetText(
        "detailDetected",
        "—"
    );


    safeSetText(
        "detailTP",
        "—"
    );


    safeSetText(
        "detailFP",
        "—"
    );


    safeSetText(
        "detailFN",
        "—"
    );


    safeSetText(
        "detailF1",
        "—"
    );
}


/* ============================================================
   BUTTONS
   ============================================================ */

function setupReportButtons() {

    console.log(
        "[ECG-Sense Report] Setting up buttons..."
    );


    const detailedButton =
        document.getElementById(
            "viewDetailedReport"
        );


    if (detailedButton) {

        detailedButton.addEventListener(
            "click",
            function () {

                console.log(
                    "[ECG-Sense Report] Detailed report button clicked."
                );


                if (
                    typeof navigate ===
                    "function"
                ) {

                    navigate(
                        "advanced.html"
                    );

                } else {

                    window.location.assign(
                        "advanced.html"
                    );
                }
            }
        );
    }


    const newAnalysis =
        document.getElementById(
            "newAnalysis"
        );


    if (newAnalysis) {

        newAnalysis.addEventListener(
            "click",
            function () {

                console.log(
                    "[ECG-Sense Report] New analysis button clicked."
                );


                if (
                    typeof navigate ===
                    "function"
                ) {

                    navigate(
                        "upload.html"
                    );

                } else {

                    window.location.assign(
                        "upload.html"
                    );
                }
            }
        );
    }
}


/* ============================================================
   INITIALIZE REPORT
   ============================================================ */

async function initializeReport() {

    console.log(
        "[ECG-Sense Report] initializeReport() STARTED"
    );


    try {

        console.log(
            "[ECG-Sense Report] apiGet:",
            typeof apiGet
        );


        console.log(
            "[ECG-Sense Report] getParam:",
            typeof getParam
        );


        console.log(
            "[ECG-Sense Report] setText:",
            typeof setText
        );


        console.log(
            "[ECG-Sense Report] ECG_APP:",
            typeof ECG_APP !== "undefined"
                ? ECG_APP
                : "MISSING"
        );


        const record =
            typeof getParam ===
            "function"

                ? getParam("record")

                : new URLSearchParams(
                    window.location.search
                ).get("record");


        console.log(
            "[ECG-Sense Report] Record parameter:",
            record
        );


        /* ----------------------------------------------------
           SAVED UPLOAD
           ---------------------------------------------------- */

        let saved = null;


        if (
            typeof loadCurrentAnalysis ===
            "function"
        ) {

            try {

                saved =
                    loadCurrentAnalysis();

            } catch (error) {

                console.warn(
                    "[ECG-Sense Report] loadCurrentAnalysis failed:",
                    error
                );
            }
        }


        console.log(
            "[ECG-Sense Report] Saved analysis:",
            saved
        );


        if (
            saved &&
            saved.engine
        ) {

            console.log(
                "[ECG-Sense Report] Uploaded analysis detected."
            );


            renderUploadReport(
                saved
            );


            return;
        }


        /* ----------------------------------------------------
           MIT-BIH RECORD
           ---------------------------------------------------- */

        if (record) {

            console.log(
                `[ECG-Sense Report] Loading MIT-BIH record: ${record}`
            );


            await loadRecordReport(
                record
            );


            console.log(
                "[ECG-Sense Report] Record report finished."
            );


            return;
        }


        /* ----------------------------------------------------
           SESSION SUMMARY
           ---------------------------------------------------- */

        let summary = null;


        if (
            typeof loadSession ===
                "function" &&
            typeof ECG_APP !==
                "undefined" &&
            ECG_APP &&
            ECG_APP.storage
        ) {

            try {

                summary =
                    loadSession(
                        ECG_APP.storage.currentSummary
                    );

            } catch (error) {

                console.warn(
                    "[ECG-Sense Report] Session summary load failed:",
                    error
                );
            }
        }


        if (summary) {

            renderSummary(
                summary
            );

        } else {

            showEmptyState();
        }


    } catch (error) {

        console.error(
            "=================================================="
        );

        console.error(
            "[ECG-Sense Report] INITIALIZATION FAILED"
        );

        console.error(
            error
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
    }
}


/* ============================================================
   START APPLICATION
   ============================================================ */

function startReportApplication() {

    console.log(
        "[ECG-Sense Report] Starting application..."
    );


    setupReportButtons();


    initializeReport()
        .then(
            function () {

                console.log(
                    "[ECG-Sense Report] APPLICATION FINISHED SUCCESSFULLY"
                );
            }
        )
        .catch(
            function (error) {

                console.error(
                    "[ECG-Sense Report] APPLICATION FINAL ERROR:",
                    error
                );
            }
        );
}


/* ============================================================
   EXPOSE DEBUG FUNCTIONS
   ============================================================ */

window.drawReportWaveform =
    drawReportWaveform;

window.loadRecordReport =
    loadRecordReport;

window.renderSummary =
    renderSummary;

window.initializeReport =
    initializeReport;


/* ============================================================
   DOM READY
   ============================================================ */

if (
    document.readyState ===
    "loading"
) {

    console.log(
        "[ECG-Sense Report] Waiting for DOMContentLoaded..."
    );


    document.addEventListener(
        "DOMContentLoaded",
        startReportApplication,
        {
            once: true
        }
    );

} else {

    console.log(
        "[ECG-Sense Report] DOM already ready."
    );


    startReportApplication();
}