"use strict";

/* ============================================================
   ECG-SENSE ANALYSIS PAGE
   ============================================================ */

let waveformResizeTimer = null;


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const mode =
            getParam("mode");

        const analysisId =
            getParam("id");

        const record =
            getParam("record") ||
            "102";


        const runButton =
            $("runAnalysis") ||
            $("analyzeBtn");


        if (
            mode === "sample" ||
            record
        ) {

            if (
                !analysisId &&
                (
                    mode === "sample"
                    ||
                    $("runAnalysis")
                )
            ) {

                setupSampleAnalysis(
                    record,
                    runButton
                );

                return;
            }
        }


        if (analysisId) {

            await loadSavedAnalysis(
                analysisId
            );

            return;
        }


        setupRecordAnalysis(
            record,
            runButton
        );
    }
);


/* ============================================================
   SAMPLE
   ============================================================ */

function setupSampleAnalysis(
    record,
    runButton
) {

    setText(
        "analysisStatus",
        `MIT-BIH Record ${record} is ready.`
    );


    if (!runButton) {
        return;
    }


    runButton.addEventListener(
        "click",
        async () => {

            setLoading(
                runButton,
                true,
                "Analyzing..."
            );

            setText(
                "analysisStatus",
                "Running ECG-Sense DSP engine..."
            );

            try {

                const response =
                    await apiGet(
                        `/records/${encodeURIComponent(
                            record
                        )}/summary`
                    );

                const summary =
                    response.data;

                saveSession(
                    ECG_APP.storage.currentSummary,
                    summary
                );


                setText(
                    "analysisStatus",
                    "Analysis completed."
                );


                notify(
                    `Record ${record} analyzed successfully.`,
                    "success"
                );


                setTimeout(
                    () => {

                        navigate(
                            `report.html?record=${encodeURIComponent(
                                record
                            )}`
                        );

                    },
                    400
                );


            } catch (error) {

                setText(
                    "analysisStatus",
                    error.message
                );

                notify(
                    error.message,
                    "error"
                );

                setLoading(
                    runButton,
                    false
                );
            }
        }
    );
}


/* ============================================================
   SAVED UPLOAD
   ============================================================ */

async function loadSavedAnalysis(
    analysisId
) {

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
   DIRECT SAMPLE RECORD
   ============================================================ */

function setupRecordAnalysis(
    record,
    runButton
) {

    if (!runButton) {
        return;
    }


    runButton.addEventListener(
        "click",
        async () => {

            setLoading(
                runButton,
                true,
                "Processing..."
            );


            try {

                const response =
                    await apiGet(
                        `/records/${encodeURIComponent(
                            record
                        )}/analysis`
                    );

                saveSession(
                    ECG_APP.storage.currentSummary,
                    response.data
                );


                navigate(
                    `report.html?record=${encodeURIComponent(
                        record
                    )}`
                );


            } catch (error) {

                notify(
                    error.message,
                    "error"
                );

                setLoading(
                    runButton,
                    false
                );
            }
        }
    );
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
        saved.id
    );

    setText(
        "analysisRecord",
        saved.record || "Uploaded ECG"
    );

    setText(
        "analysisStatus",
        `Detected ${formatNumber(
            analysis.detected_peaks
        )} heartbeat peaks.`
    );

    setText(
        "referenceBeats",
        formatNumber(
            analysis.reference_beats
        )
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
        `${Number(
            analysis.duration_seconds || 0
        ).toFixed(2)} s`
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


    if (
        !Array.isArray(
            analysis.filtered_signal
        )
    ) {
        return;
    }


    drawWaveformCanvas(
        canvas,
        {
            signal:
                analysis.filtered_signal,

            peaks:
                analysis.detected_samples ||
                []
        }
    );
}


/* ============================================================
   WAVEFORM FETCH
   ============================================================ */

async function loadRecordWaveform(
    record
) {

    const response =
        await apiGet(
            `/records/${encodeURIComponent(
                record
            )}/waveform?start=0&duration=10`
        );

    const waveform =
        response.data;

    const canvas =
        $("ecgCanvas") ||
        $("userEcgCanvas");

    if (!canvas) {
        return;
    }


    drawWaveformCanvas(
        canvas,
        {
            signal:
                waveform.signal,

            peaks:
                waveform.detected_peaks
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


    const rect =
        canvas.getBoundingClientRect();


    const dpr =
        window.devicePixelRatio ||
        1;


    const width =
        Math.max(
            320,
            rect.width
        );


    const height =
        Math.max(
            220,
            rect.height || 260
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
            "600 14px Inter, system-ui, sans-serif";

        ctx.fillText(
            "No waveform available.",
            20,
            30
        );

        return;
    }


    drawGrid(
        ctx,
        width,
        height
    );


    let min =
        Infinity;

    let max =
        -Infinity;


    signal.forEach(
        value => {

            if (value < min) {
                min = value;
            }

            if (value > max) {
                max = value;
            }
        }
    );


    const range =
        max - min || 1;


    const mapY =
        value => {

            const normalized =
                (
                    value - min
                ) / range;

            return (
                height * 0.82
                -
                normalized *
                height * 0.68
            );
        };


    /* ECG signal */

    ctx.beginPath();

    ctx.strokeStyle =
        "#3a86ff";

    ctx.lineWidth =
        window.innerWidth < 600
            ? 1.35
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


    signal.forEach(
        (value, index) => {

            const x =
                (
                    index / divisor
                ) * width;

            const y =
                mapY(value);


            if (
                index === 0
            ) {

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
    );


    ctx.stroke();


    /* Detected peaks */

    ctx.fillStyle =
        "#ff006e";

    ctx.strokeStyle =
        "rgba(255,0,110,.46)";

    ctx.lineWidth = 1;


    peaks.forEach(
        sample => {

            const index =
                Number(sample);

            if (
                !Number.isFinite(
                    index
                )
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
                    index / divisor
                ) * width;

            const y =
                mapY(
                    signal[index]
                );


            ctx.beginPath();

            ctx.arc(
                x,
                y,
                3.5,
                0,
                Math.PI * 2
            );

            ctx.fill();


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
    );


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

    ctx.lineWidth = 1;


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
                async () => {

                    const saved =
                        loadCurrentAnalysis();

                    if (saved) {

                        await renderSavedWaveform(
                            saved
                        );
                    }

                },
                180
            );
    }
);