"use strict";

/* ============================================================
   ECG-SENSE REPORT PAGE
   COMPLETE DEBUG + WORKING VERSION
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
   DOM READY
   ============================================================ */

async function initializeReport() {

    console.log(
        "[ECG-Sense Report] initializeReport() STARTED"
    );


    try {

        /* ----------------------------------------------------
           CHECK REQUIRED GLOBAL FUNCTIONS
           ---------------------------------------------------- */

        console.log(
            "[ECG-Sense Report] Checking dependencies..."
        );

        console.log(
            "[ECG-Sense Report] ECG_APP:",
            typeof ECG_APP !== "undefined"
                ? ECG_APP
                : "MISSING"
        );

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
            "[ECG-Sense Report] formatNumber:",
            typeof formatNumber
        );

        console.log(
            "[ECG-Sense Report] formatPercent:",
            typeof formatPercent
        );

        console.log(
            "[ECG-Sense Report] drawWaveformCanvas:",
            typeof drawWaveformCanvas
        );


        /* ----------------------------------------------------
           REQUIRED DEPENDENCY CHECK
           ---------------------------------------------------- */

        const requiredFunctions = [
            "apiGet",
            "getParam",
            "setText",
            "formatNumber",
            "formatPercent"
        ];


        for (
            const functionName
            of requiredFunctions
        ) {

            if (
                typeof window[functionName] ===
                "undefined"
            ) {

                console.error(
                    `[ECG-Sense Report] MISSING FUNCTION: ${functionName}`
                );
            }
        }


        /* ----------------------------------------------------
           READ RECORD PARAMETER
           ---------------------------------------------------- */

        const record =
            typeof getParam === "function"
                ? getParam("record")
                : null;


        console.log(
            "[ECG-Sense Report] Record parameter:",
            record
        );


        /* ----------------------------------------------------
           READ SAVED ANALYSIS
           ---------------------------------------------------- */

        let saved = null;


        if (
            typeof loadCurrentAnalysis ===
            "function"
        ) {

            saved =
                loadCurrentAnalysis();

        } else {

            console.warn(
                "[ECG-Sense Report] loadCurrentAnalysis() unavailable."
            );
        }


        console.log(
            "[ECG-Sense Report] Saved analysis:",
            saved
        );


        /* ----------------------------------------------------
           UPLOADED ANALYSIS
           ---------------------------------------------------- */

        if (
            saved &&
            saved.engine
        ) {

            console.log(
                "[ECG-Sense Report] Upload analysis detected."
            );

            renderUploadReport(
                saved
            );

            console.log(
                "[ECG-Sense Report] Upload report rendered."
            );

            return;
        }


        /* ----------------------------------------------------
           RECORD REPORT
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
           SAVED SUMMARY
           ---------------------------------------------------- */

        let summary = null;


        if (
            typeof loadSession ===
            "function" &&
            typeof ECG_APP !==
            "undefined"
        ) {

            summary =
                loadSession(
                    ECG_APP.storage.currentSummary
                );
        }


        console.log(
            "[ECG-Sense Report] Saved summary:",
            summary
        );


        if (summary) {

            console.log(
                "[ECG-Sense Report] Rendering saved summary."
            );

            renderSummary(
                summary
            );

        } else {

            console.warn(
                "[ECG-Sense Report] No analysis data found."
            );

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
            "Error:",
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


        if (
            typeof notify ===
            "function"
        ) {

            notify(
                "Report initialization failed. Check browser console.",
                "error",
                8000
            );
        }
    }
}


/* ============================================================
   LOAD RECORD REPORT
   ============================================================ */

async function loadRecordReport(
    record
) {

    console.log(
        "[ECG-Sense Report] loadRecordReport()",
        record
    );


    try {

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


        console.log(
            "[ECG-Sense Report] Summary data:",
            response.data
        );


        renderSummary(
            response.data
        );


        console.log(
            "[ECG-Sense Report] Summary rendered successfully."
        );


        /* ----------------------------------------------------
           WAVEFORM
           ---------------------------------------------------- */

        const canvas =
            document.getElementById(
                "userEcgCanvas"
            ) ||
            document.getElementById(
                "ecgCanvas"
            );


        console.log(
            "[ECG-Sense Report] Canvas:",
            canvas
        );


        if (!canvas) {

            console.error(
                "[ECG-Sense Report] ECG canvas NOT FOUND."
            );

        } else {

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


            console.log(
                "[ECG-Sense Report] Signal length:",
                Array.isArray(
                    waveform.data.signal
                )
                    ? waveform.data.signal.length
                    : "NOT ARRAY"
            );


            console.log(
                "[ECG-Sense Report] Detected peaks:",
                waveform.data.detected_peaks
            );


            if (
                typeof drawWaveformCanvas ===
                "function"
            ) {

                drawWaveformCanvas(
                    canvas,
                    {
                        signal:
                            waveform.data.signal ||
                            [],

                        peaks:
                            waveform.data.detected_peaks ||
                            []
                    }
                );


                console.log(
                    "[ECG-Sense Report] Waveform rendered successfully."
                );

            } else {

                console.error(
                    "[ECG-Sense Report] drawWaveformCanvas() NOT FOUND."
                );
            }
        }


        /* ----------------------------------------------------
           SAVE SUMMARY
           ---------------------------------------------------- */

        if (
            typeof saveSession ===
            "function" &&
            typeof ECG_APP !==
            "undefined"
        ) {

            saveSession(
                ECG_APP.storage.currentSummary,
                response.data
            );


            console.log(
                "[ECG-Sense Report] Summary saved to sessionStorage."
            );
        }


    } catch (error) {

        console.error(
            "[ECG-Sense Report] RECORD REPORT FAILED:",
            error
        );

        console.error(
            "[ECG-Sense Report] Error message:",
            error?.message
        );

        console.error(
            "[ECG-Sense Report] Error stack:",
            error?.stack
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
    }
}


/* ============================================================
   SUMMARY RENDER
   ============================================================ */

function renderSummary(
    summary
) {

    console.log(
        "[ECG-Sense Report] renderSummary() DATA:",
        summary
    );


    if (!summary) {

        throw new Error(
            "renderSummary received empty data."
        );
    }


    /* --------------------------------------------------------
       TOP METRICS
       -------------------------------------------------------- */

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


    const f1 =
        summary.f1;


    let analysisQuality;


    if (
        f1 === null ||
        f1 === undefined
    ) {

        analysisQuality =
            "Processing Complete";

    } else {

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


    /* --------------------------------------------------------
       TECHNICAL SNAPSHOT
       -------------------------------------------------------- */

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


    /* --------------------------------------------------------
       RECORD NAME
       -------------------------------------------------------- */

    setText(
        "reportRecord",
        summary.record ||
        "Uploaded ECG"
    );


    /* --------------------------------------------------------
       DESCRIPTION
       -------------------------------------------------------- */

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


    console.log(
        "[ECG-Sense Report] DOM VALUES UPDATED:"
    );

    console.log(
        "Heartbeat Peaks:",
        summary.detected_peaks
    );

    console.log(
        "Reference Beats:",
        summary.reference_beats
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
        "[ECG-Sense Report] renderUploadReport()",
        saved
    );


    const analysis =
        saved.engine ||
        saved;


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
        "Good"
    );


    setText(
        "reportRecord",
        saved.source_name ||
        "Uploaded ECG"
    );


    setText(
        "reportDescription",
        saved.id
            ? `Analysis ID: ${saved.id}`
            : "Uploaded ECG analysis completed."
    );


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


    const canvas =
        document.getElementById(
            "userEcgCanvas"
        );


    if (
        canvas &&
        typeof drawWaveformCanvas ===
        "function"
    ) {

        drawWaveformCanvas(
            canvas,
            {
                signal:
                    analysis.filtered_signal ||
                    analysis.signal ||
                    [],

                peaks:
                    analysis.detected_samples ||
                    analysis.detected_peaks ||
                    []
            }
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
        "[ECG-Sense Report] showEmptyState()"
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


    if (
        typeof notify ===
        "function"
    ) {

        notify(
            "No ECG analysis is available.",
            "warning"
        );
    }
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


    console.log(
        "[ECG-Sense Report] Detailed button:",
        detailedButton
    );


    if (detailedButton) {

        detailedButton.addEventListener(
            "click",
            function () {

                console.log(
                    "[ECG-Sense Report] Opening advanced report."
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


    console.log(
        "[ECG-Sense Report] New analysis button:",
        newAnalysis
    );


    if (newAnalysis) {

        newAnalysis.addEventListener(
            "click",
            function () {

                console.log(
                    "[ECG-Sense Report] Opening upload page."
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
   DOM READY SAFE START
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