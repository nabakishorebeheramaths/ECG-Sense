"use strict";

/* ============================================================
   ECG-SENSE USER REPORT
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const record =
            getParam("record");

        const saved =
            loadCurrentAnalysis();

        if (saved?.engine) {

            renderUploadReport(
                saved
            );

            return;
        }

        if (record) {

            await loadRecordReport(
                record
            );

            return;
        }


        const summary =
            loadSession(
                ECG_APP.storage.currentSummary
            );

        if (summary) {

            renderSummary(
                summary
            );

        } else {

            showEmptyState();
        }
    }
);


/* ============================================================
   RECORD REPORT
   ============================================================ */

async function loadRecordReport(
    record
) {

    try {

        const response =
            await apiGet(
                `/records/${encodeURIComponent(
                    record
                )}/summary`
            );

        renderSummary(
            response.data
        );


        const canvas =
            $("userEcgCanvas") ||
            $("ecgCanvas");


        if (canvas) {

            const waveform =
                await apiGet(
                    `/records/${encodeURIComponent(
                        record
                    )}/waveform?start=0&duration=10`
                );

            drawWaveformCanvas(
                canvas,
                {
                    signal:
                        waveform.data.signal,

                    peaks:
                        waveform.data.detected_peaks
                }
            );
        }


        saveSession(
            ECG_APP.storage.currentSummary,
            response.data
        );


    } catch (error) {

        notify(
            error.message,
            "error"
        );
    }
}


/* ============================================================
   SUMMARY RENDER
   ============================================================ */

function renderSummary(
    summary
) {

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

    setText(
        "userAnalysisQuality",
        f1 === null ||
        f1 === undefined
            ? "Processing Complete"
            : (
                Number(f1) >= 99
                    ? "Excellent"
                    : Number(f1) >= 97
                        ? "Very Good"
                        : "Good"
            )
    );


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


    setText(
        "reportRecord",
        summary.record ||
        "Uploaded ECG"
    );


    setText(
        "reportDescription",
        summary.record
            ? `MIT-BIH Record ${summary.record} was processed using the validated ECG-Sense signal-processing pipeline.`
            : "Your ECG was processed using the ECG-Sense signal-processing pipeline."
    );
}


/* ============================================================
   UPLOAD REPORT
   ============================================================ */

function renderUploadReport(
    saved
) {

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
        `Analysis ID: ${saved.id}`
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
        $("userEcgCanvas") ||
        $("ecgCanvas");


    if (canvas) {

        drawWaveformCanvas(
            canvas,
            {
                signal:
                    analysis.filtered_signal ||
                    [],

                peaks:
                    analysis.detected_samples ||
                    []
            }
        );
    }
}


/* ============================================================
   EMPTY STATE
   ============================================================ */

function showEmptyState() {

    notify(
        "No analysis is available yet.",
        "warning"
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
}


/* ============================================================
   DETAILED REPORT BUTTON
   ============================================================ */

const detailedButton =
    document.getElementById(
        "viewDetailedReport"
    );

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


/* ============================================================
   NEW ANALYSIS
   ============================================================ */

const newAnalysis =
    document.getElementById(
        "newAnalysis"
    );

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