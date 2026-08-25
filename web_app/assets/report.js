"use strict";

/* ============================================================
   ECG-SENSE REPORT PAGE
   Robust frontend report renderer
   ============================================================ */

(function () {

    /* ========================================================
       HELPERS
       ======================================================== */

    function log(...args) {
        console.log("[ECG-Sense Report]", ...args);
    }

    function errorLog(...args) {
        console.error("[ECG-Sense Report]", ...args);
    }

    function safeNumber(value) {
        if (
            value === null ||
            value === undefined ||
            value === "" ||
            Number.isNaN(Number(value))
        ) {
            return null;
        }

        return Number(value);
    }

    function displayNumber(value) {

        const number =
            safeNumber(value);

        if (number === null) {
            return "—";
        }

        return number.toLocaleString();
    }

    function displayPercent(value) {

        const number =
            safeNumber(value);

        if (number === null) {
            return "—";
        }

        return `${number.toFixed(2)}%`;
    }

    function put(id, value) {

        const element =
            document.getElementById(id);

        if (!element) {
            errorLog(
                `Element not found: #${id}`
            );
            return;
        }

        element.textContent =
            value === null ||
            value === undefined ||
            value === ""
                ? "—"
                : String(value);
    }


    /* ========================================================
       SUMMARY RENDERER
       ======================================================== */

    function renderReport(data) {

        if (!data) {
            throw new Error(
                "No ECG report data received."
            );
        }

        log(
            "Rendering report data:",
            data
        );

        /* ----------------------------------------------------
           MAIN METRICS
           ---------------------------------------------------- */

        put(
            "userBeatCount",
            displayNumber(
                data.detected_peaks
            )
        );

        put(
            "userSignalQuality",
            data.signal_quality ||
            "Good"
        );


        /* ----------------------------------------------------
           ANALYSIS QUALITY
           ---------------------------------------------------- */

        const f1 =
            safeNumber(data.f1);

        let analysisQuality =
            "Processing Complete";

        if (f1 !== null) {

            if (f1 >= 99) {
                analysisQuality =
                    "Excellent";
            }
            else if (f1 >= 97) {
                analysisQuality =
                    "Very Good";
            }
            else {
                analysisQuality =
                    "Good";
            }
        }

        put(
            "userAnalysisQuality",
            analysisQuality
        );


        /* ----------------------------------------------------
           TECHNICAL SNAPSHOT
           ---------------------------------------------------- */

        put(
            "detailReference",
            displayNumber(
                data.reference_beats
            )
        );

        put(
            "detailDetected",
            displayNumber(
                data.detected_peaks
            )
        );

        put(
            "detailTP",
            displayNumber(
                data.tp
            )
        );

        put(
            "detailFP",
            displayNumber(
                data.fp
            )
        );

        put(
            "detailFN",
            displayNumber(
                data.fn
            )
        );

        put(
            "detailF1",
            displayPercent(
                data.f1
            )
        );


        /* ----------------------------------------------------
           RECORD INFORMATION
           ---------------------------------------------------- */

        const record =
            data.record ||
            "Uploaded ECG";

        put(
            "reportRecord",
            record
        );

        if (data.record) {

            put(
                "reportDescription",
                `MIT-BIH Record ${data.record} was processed using the ECG-Sense signal-processing pipeline.`
            );

        } else {

            put(
                "reportDescription",
                "Your ECG was processed using the ECG-Sense signal-processing pipeline."
            );
        }


        log(
            "Report metrics rendered successfully."
        );
    }


    /* ========================================================
       LOAD RECORD SUMMARY
       ======================================================== */

    async function loadRecord(record) {

        if (!record) {
            throw new Error(
                "No ECG record specified."
            );
        }

        log(
            "Loading record:",
            record
        );

        const endpoint =
            `/records/${encodeURIComponent(record)}/summary`;

        log(
            "Calling:",
            endpoint
        );

        const response =
            await apiGet(endpoint);

        log(
            "Raw API response:",
            response
        );

        /*
         * Backend normally returns:
         *
         * {
         *   status: "success",
         *   data: {...}
         * }
         *
         * But this also supports a direct data response.
         */

        const data =
            response &&
            response.data
                ? response.data
                : response;

        if (!data) {
            throw new Error(
                "API returned empty report data."
            );
        }

        renderReport(data);

        return data;
    }


    /* ========================================================
       LOAD WAVEFORM
       ======================================================== */

    async function loadWaveform(record) {

        const canvas =
            document.getElementById(
                "userEcgCanvas"
            );

        if (!canvas) {

            errorLog(
                "ECG canvas not found."
            );

            return;
        }

        try {

            log(
                "Loading waveform..."
            );

            const response =
                await apiGet(
                    `/records/${encodeURIComponent(record)}/waveform?start=0&duration=10`
                );

            log(
                "Waveform response:",
                response
            );

            const data =
                response &&
                response.data
                    ? response.data
                    : response;

            if (!data) {
                throw new Error(
                    "Waveform API returned no data."
                );
            }

            const signal =
                Array.isArray(data.signal)
                    ? data.signal
                    : [];

            const peaks =
                Array.isArray(
                    data.detected_peaks
                )
                    ? data.detected_peaks
                    : [];

            log(
                "Waveform samples:",
                signal.length
            );

            log(
                "Detected waveform peaks:",
                peaks.length
            );


            if (
                typeof drawWaveformCanvas !==
                "function"
            ) {

                throw new Error(
                    "drawWaveformCanvas() is not available."
                );
            }


            drawWaveformCanvas(
                canvas,
                {
                    signal: signal,
                    peaks: peaks
                }
            );

            log(
                "Waveform rendered successfully."
            );

        }
        catch (error) {

            /*
             * Waveform failure must NOT prevent
             * the numerical report from displaying.
             */

            errorLog(
                "Waveform loading failed:",
                error
            );

            drawWaveformFallback(
                canvas
            );
        }
    }


    /* ========================================================
       WAVEFORM FALLBACK
       ======================================================== */

    function drawWaveformFallback(canvas) {

        if (!canvas) {
            return;
        }

        const ctx =
            canvas.getContext("2d");

        if (!ctx) {
            return;
        }

        const width =
            canvas.clientWidth ||
            800;

        const height =
            canvas.clientHeight ||
            300;

        const ratio =
            window.devicePixelRatio ||
            1;

        canvas.width =
            width * ratio;

        canvas.height =
            height * ratio;

        ctx.setTransform(
            ratio,
            0,
            0,
            ratio,
            0,
            0
        );

        ctx.clearRect(
            0,
            0,
            width,
            height
        );

        ctx.strokeStyle =
            "#cbd5e1";

        ctx.lineWidth =
            1;

        ctx.beginPath();

        ctx.moveTo(
            0,
            height / 2
        );

        ctx.lineTo(
            width,
            height / 2
        );

        ctx.stroke();

        ctx.fillStyle =
            "#64748b";

        ctx.font =
            "14px Arial";

        ctx.textAlign =
            "center";

        ctx.fillText(
            "ECG waveform unavailable",
            width / 2,
            height / 2 - 12
        );

        ctx.fillText(
            "Analysis metrics are still available below.",
            width / 2,
            height / 2 + 15
        );
    }


    /* ========================================================
       BUTTONS
       ======================================================== */

    function setupButtons() {

        const detailedButton =
            document.getElementById(
                "viewDetailedReport"
            );

        if (detailedButton) {

            detailedButton.addEventListener(
                "click",
                function () {

                    window.location.href =
                        "advanced.html";
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

                    window.location.href =
                        "upload.html";
                }
            );
        }
    }


    /* ========================================================
       EMPTY REPORT
       ======================================================== */

    function showEmpty() {

        put(
            "userBeatCount",
            "—"
        );

        put(
            "userSignalQuality",
            "Awaiting ECG"
        );

        put(
            "userAnalysisQuality",
            "—"
        );

        put(
            "detailReference",
            "—"
        );

        put(
            "detailDetected",
            "—"
        );

        put(
            "detailTP",
            "—"
        );

        put(
            "detailFP",
            "—"
        );

        put(
            "detailFN",
            "—"
        );

        put(
            "detailF1",
            "—"
        );

        put(
            "reportRecord",
            "No ECG Analysis"
        );

        put(
            "reportDescription",
            "No ECG analysis is currently loaded. Please analyze an ECG first."
        );
    }


    /* ========================================================
       MAIN INITIALIZATION
       ======================================================== */

    async function initReport() {

        log(
            "Report page initialization started."
        );

        setupButtons();


        const params =
            new URLSearchParams(
                window.location.search
            );

        const record =
            params.get("record");


        log(
            "URL:",
            window.location.href
        );

        log(
            "Record parameter:",
            record
        );


        /*
         * Priority 1:
         * URL record
         *
         * Example:
         * report.html?record=102
         */

        if (record) {

            try {

                const data =
                    await loadRecord(
                        record
                    );

                /*
                 * Save for refresh/navigation.
                 */

                if (
                    typeof saveSession ===
                    "function" &&
                    typeof ECG_APP !==
                    "undefined"
                ) {

                    saveSession(
                        ECG_APP.storage.currentSummary,
                        data
                    );
                }


                /*
                 * Load waveform separately.
                 */

                await loadWaveform(
                    record
                );

                return;

            }
            catch (error) {

                errorLog(
                    "Record report failed:",
                    error
                );

                put(
                    "reportDescription",
                    `Unable to load ECG record ${record}: ${error.message}`
                );

                return;
            }
        }


        /*
         * Priority 2:
         * Previously saved summary
         */

        try {

            if (
                typeof loadSession ===
                "function" &&
                typeof ECG_APP !==
                "undefined"
            ) {

                const saved =
                    loadSession(
                        ECG_APP.storage.currentSummary
                    );

                if (saved) {

                    log(
                        "Using saved summary."
                    );

                    renderReport(
                        saved
                    );

                    return;
                }
            }

        }
        catch (error) {

            errorLog(
                "Saved summary failed:",
                error
            );
        }


        /*
         * Nothing available.
         */

        showEmpty();

        log(
            "No report data available."
        );
    }


    /* ========================================================
       START
       ======================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initReport
        );

    } else {

        initReport();
    }

})();