"use strict";

/* ============================================================
   ECG-SENSE USER REPORT
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    console.log("ECG-Sense Report: page loaded.");

    const record = getParam("record");
    const saved = loadCurrentAnalysis();

    console.log("ECG-Sense Report: record =", record);
    console.log("ECG-Sense Report: saved analysis =", saved);

    try {

        /*
         * 1. Saved uploaded ECG
         */
        if (saved && saved.engine) {

            console.log(
                "ECG-Sense Report: rendering saved upload."
            );

            renderUploadReport(saved);

            return;
        }


        /*
         * 2. MIT-BIH record
         */
        if (record) {

            console.log(
                `ECG-Sense Report: loading record ${record}.`
            );

            await loadRecordReport(record);

            return;
        }


        /*
         * 3. Previously saved summary
         */
        const summary = loadSession(
            ECG_APP.storage.currentSummary
        );

        console.log(
            "ECG-Sense Report: stored summary =",
            summary
        );

        if (summary) {

            renderSummary(summary);

        } else {

            showEmptyState();
        }

    } catch (error) {

        console.error(
            "ECG-Sense Report initialization failed:",
            error
        );

        notify(
            error.message || "Unable to load ECG report.",
            "error"
        );
    }
});


/* ============================================================
   RECORD REPORT
   ============================================================ */

async function loadRecordReport(record) {

    try {

        /*
         * SUMMARY
         */

        console.log(
            `Loading summary for record ${record}...`
        );

        const response = await apiGet(
            `/records/${encodeURIComponent(record)}/summary`
        );

        console.log(
            "Summary API response:",
            response
        );

        if (
            !response ||
            !response.data
        ) {
            throw new Error(
                "Invalid summary response from ECG-Sense API."
            );
        }


        const summary = response.data;

        /*
         * Render metrics immediately
         */
        renderSummary(summary);


        /*
         * Save summary for future page navigation
         */
        saveSession(
            ECG_APP.storage.currentSummary,
            summary
        );


        /*
         * WAVEFORM
         */

        const canvas =
            $("userEcgCanvas") ||
            $("ecgCanvas");

        if (!canvas) {

            console.warn(
                "ECG waveform canvas not found."
            );

            return;
        }


        console.log(
            `Loading waveform for record ${record}...`
        );

        const waveformResponse = await apiGet(
            `/records/${encodeURIComponent(record)}/waveform?start=0&duration=10`
        );

        console.log(
            "Waveform API response:",
            waveformResponse
        );


        if (
            !waveformResponse ||
            !waveformResponse.data
        ) {
            throw new Error(
                "Invalid waveform response from ECG-Sense API."
            );
        }


        const waveform =
            waveformResponse.data;


        const signal =
            Array.isArray(waveform.signal)
                ? waveform.signal
                : [];


        const peaks =
            Array.isArray(waveform.detected_peaks)
                ? waveform.detected_peaks
                : [];


        console.log(
            "Waveform samples:",
            signal.length
        );

        console.log(
            "Detected waveform peaks:",
            peaks.length
        );


        if (!signal.length) {

            drawEmptyWaveform(
                canvas,
                "No ECG waveform data available."
            );

            return;
        }


        drawWaveformCanvas(
            canvas,
            {
                signal,
                peaks
            }
        );


        console.log(
            "ECG waveform rendered successfully."
        );

    } catch (error) {

        console.error(
            "Record report loading failed:",
            error
        );

        notify(
            error.message ||
            "Unable to load ECG report.",
            "error"
        );

        const canvas =
            $("userEcgCanvas") ||
            $("ecgCanvas");

        if (canvas) {

            drawEmptyWaveform(
                canvas,
                "Unable to load ECG waveform."
            );
        }
    }
}


/* ============================================================
   SUMMARY RENDER
   ============================================================ */

function renderSummary(summary) {

    if (!summary) {
        return;
    }


    console.log(
        "Rendering summary:",
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
     * Analysis quality
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
     * Record information
     */

    setText(
        "reportRecord",
        summary.record ||
        "Uploaded ECG"
    );


    if (summary.record) {

        setText(
            "reportDescription",
            `MIT-BIH Record ${summary.record} was processed using the validated ECG-Sense signal-processing pipeline.`
        );

    } else {

        setText(
            "reportDescription",
            "Your ECG was processed using the ECG-Sense signal-processing pipeline."
        );
    }
}


/* ============================================================
   UPLOAD REPORT
   ============================================================ */

function renderUploadReport(saved) {

    const analysis =
        saved.engine ||
        saved;


    console.log(
        "Rendering uploaded ECG:",
        analysis
    );


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
     * Report information
     */

    setText(
        "reportRecord",
        saved.source_name ||
        saved.filename ||
        "Uploaded ECG"
    );


    setText(
        "reportDescription",
        saved.id
            ? `Analysis ID: ${saved.id}`
            : "Your uploaded ECG was processed using the ECG-Sense signal-processing pipeline."
    );


    /*
     * Technical metrics
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
     * Waveform
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


    if (!signal.length) {

        drawEmptyWaveform(
            canvas,
            "No uploaded waveform data available."
        );

        return;
    }


    drawWaveformCanvas(
        canvas,
        {
            signal,
            peaks
        }
    );
}


/* ============================================================
   WAVEFORM DRAW
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
        return;
    }


    const signal =
        Array.isArray(waveform?.signal)
            ? waveform.signal
            : [];


    const peaks =
        Array.isArray(waveform?.peaks)
            ? waveform.peaks
            : [];


    if (!signal.length) {

        drawEmptyWaveform(
            canvas,
            "No waveform available."
        );

        return;
    }


    /*
     * Canvas dimensions
     */

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


    /*
     * Background
     */

    ctx.fillStyle =
        "#ffffff";

    ctx.fillRect(
        0,
        0,
        width,
        height
    );


    /*
     * Grid
     */

    drawGrid(
        ctx,
        width,
        height
    );


    /*
     * Find signal range
     */

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

        drawEmptyWaveform(
            canvas,
            "Invalid ECG waveform data."
        );

        return;
    }


    const range =
        max - min || 1;


    /*
     * Y mapping
     */

    const mapY =
        value => {

            const numeric =
                Number(value);


            const normalized =
                (
                    numeric - min
                ) / range;


            return (
                height * 0.82
                -
                normalized *
                height * 0.68
            );
        };


    /*
     * ECG signal
     */

    ctx.beginPath();


    ctx.strokeStyle =
        "#3a86ff";


    ctx.lineWidth =
        window.innerWidth < 600
            ? 1.3
            : 1.8;


    ctx.lineJoin =
        "round";


    ctx.lineCap =
        "round";


    const divisor =
        Math.max(
            1,
            signal.length - 1
        );


    let started =
        false;


    for (
        let index = 0;
        index < signal.length;
        index++
    ) {

        const value =
            Number(signal[index]);


        if (
            !Number.isFinite(value)
        ) {
            continue;
        }


        const x =
            (
                index / divisor
            ) * width;


        const y =
            mapY(value);


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


    /*
     * Detected peaks
     */

    ctx.fillStyle =
        "#ff006e";


    ctx.strokeStyle =
        "rgba(255,0,110,.45)";


    ctx.lineWidth =
        1;


    for (
        let i = 0;
        i < peaks.length;
        i++
    ) {

        const index =
            Number(peaks[i]);


        if (
            !Number.isFinite(index)
        ) {
            continue;
        }


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
            (
                index / divisor
            ) * width;


        const y =
            mapY(value);


        /*
         * Peak marker
         */

        ctx.beginPath();


        ctx.arc(
            x,
            y,
            3.5,
            0,
            Math.PI * 2
        );


        ctx.fill();


        /*
         * Peak vertical marker
         */

        ctx.beginPath();


        ctx.moveTo(
            x,
            y - 18
        );


        ctx.lineTo(
            x,
            y - 7
        );


        ctx.stroke();
    }


    /*
     * Caption
     */

    ctx.fillStyle =
        "#64748b";


    ctx.font =
        "600 11px Inter, system-ui, sans-serif";


    ctx.fillText(
        "Filtered ECG · detected heartbeat peaks",
        14,
        height - 12
    );
}


/* ============================================================
   EMPTY WAVEFORM
   ============================================================ */

function drawEmptyWaveform(
    canvas,
    message
) {

    if (!canvas) {
        return;
    }


    const ctx =
        canvas.getContext("2d");


    if (!ctx) {
        return;
    }


    const rect =
        canvas.getBoundingClientRect();


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
            300
        );


    const dpr =
        window.devicePixelRatio ||
        1;


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


    drawGrid(
        ctx,
        width,
        height
    );


    ctx.fillStyle =
        "#64748b";


    ctx.font =
        "600 14px Inter, system-ui, sans-serif";


    ctx.fillText(
        message ||
        "No waveform available.",
        20,
        35
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
        "rgba(148,163,184,.14)";


    ctx.lineWidth =
        1;


    const vertical =
        Math.max(
            24,
            width / 36
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

                navigate(
                    "upload.html"
                );
            }
        );
    }
}


/* ============================================================
   RESIZE
   ============================================================ */

let reportResizeTimer = null;


window.addEventListener(
    "resize",
    () => {

        clearTimeout(
            reportResizeTimer
        );


        reportResizeTimer =
            setTimeout(
                () => {

                    const canvas =
                        $("userEcgCanvas") ||
                        $("ecgCanvas");


                    if (!canvas) {
                        return;
                    }


                    const saved =
                        loadCurrentAnalysis();


                    if (
                        saved &&
                        saved.engine
                    ) {

                        renderUploadReport(
                            saved
                        );

                        return;
                    }


                    const summary =
                        loadSession(
                            ECG_APP.storage.currentSummary
                        );


                    if (summary) {

                        const record =
                            summary.record;


                        if (record) {

                            loadRecordWaveformForResize(
                                record,
                                canvas
                            );
                        }
                    }

                },
                200
            );
    }
);


/* ============================================================
   RESIZE WAVEFORM
   ============================================================ */

async function loadRecordWaveformForResize(
    record,
    canvas
) {

    try {

        const response =
            await apiGet(
                `/records/${encodeURIComponent(record)}/waveform?start=0&duration=10`
            );


        const waveform =
            response?.data;


        if (
            waveform &&
            Array.isArray(waveform.signal)
        ) {

            drawWaveformCanvas(
                canvas,
                {
                    signal:
                        waveform.signal,

                    peaks:
                        waveform.detected_peaks || []
                }
            );
        }

    } catch (error) {

        console.warn(
            "Waveform resize refresh failed:",
            error
        );
    }
}


/* ============================================================
   BUTTON INITIALIZATION
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupReportButtons();

    }
);