"use strict";

/* ============================================================
   ECG-SENSE ADVANCED REPORT
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const saved =
            loadCurrentAnalysis();

        const record =
            getParam("record");


        if (
            saved &&
            (
                saved.engine ||
                saved.analysis
            )
        ) {

            renderAdvancedSaved(
                saved
            );

            return;
        }


        if (record) {

            try {

                const response =
                    await apiGet(
                        `/records/${encodeURIComponent(
                            record
                        )}/analysis`
                    );

                renderAdvanced(
                    response.data
                );

                return;

            } catch (error) {

                notify(
                    error.message,
                    "error"
                );
            }
        }


        const summary =
            loadSession(
                ECG_APP.storage.currentSummary
            );

        if (summary) {

            renderAdvanced(
                summary
            );

        } else {

            renderAdvancedEmpty();
        }
    }
);


/* ============================================================
   RENDER VALIDATED ANALYSIS
   ============================================================ */

function renderAdvanced(
    data
) {

    setText(
        "detailReference",
        formatNumber(
            data.reference_beats
        )
    );

    setText(
        "detailDetected",
        formatNumber(
            data.detected_peaks
        )
    );

    setText(
        "detailTP",
        formatNumber(
            data.tp
        )
    );

    setText(
        "detailFP",
        formatNumber(
            data.fp
        )
    );

    setText(
        "detailFN",
        formatNumber(
            data.fn
        )
    );

    setText(
        "detailSensitivity",
        formatPercent(
            data.sensitivity
        )
    );

    setText(
        "detailPrecision",
        formatPercent(
            data.precision
        )
    );

    setText(
        "detailF1",
        formatPercent(
            data.f1
        )
    );

    setText(
        "detailRecord",
        data.record || "—"
    );

    setText(
        "detailSamplingRate",
        data.sampling_rate
            ? `${data.sampling_rate} Hz`
            : "—"
    );

    setText(
        "detailDuration",
        data.duration_seconds !==
        undefined
            ? `${Number(
                data.duration_seconds
            ).toFixed(2)} s`
            : "—"
    );
}


/* ============================================================
   UPLOADED ANALYSIS
   ============================================================ */

function renderAdvancedSaved(
    saved
) {

    const data =
        saved.engine ||
        saved;


    setText(
        "detailRecord",
        saved.source_name ||
        "Uploaded ECG"
    );

    setText(
        "detailSamplingRate",
        data.sampling_rate
            ? `${data.sampling_rate} Hz`
            : "—"
    );

    setText(
        "detailDuration",
        data.duration_seconds !==
        undefined
            ? `${Number(
                data.duration_seconds
            ).toFixed(2)} s`
            : "—"
    );


    setText(
        "detailReference",
        "Not available"
    );

    setText(
        "detailDetected",
        formatNumber(
            data.detected_peaks
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
        "detailSensitivity",
        "Not available"
    );

    setText(
        "detailPrecision",
        "Not available"
    );

    setText(
        "detailF1",
        "Not available"
    );


    const canvas =
        $("advancedEcgCanvas");

    if (canvas) {

        drawWaveformCanvas(
            canvas,
            {
                signal:
                    data.filtered_signal ||
                    [],

                peaks:
                    data.detected_samples ||
                    []
            }
        );
    }
}


/* ============================================================
   EMPTY
   ============================================================ */

function renderAdvancedEmpty() {

    [
        "detailReference",
        "detailDetected",
        "detailTP",
        "detailFP",
        "detailFN",
        "detailSensitivity",
        "detailPrecision",
        "detailF1"
    ].forEach(
        id => setText(
            id,
            "—"
        )
    );
}


/* ============================================================
   CSV EXPORT
   ============================================================ */

const exportButton =
    document.getElementById(
        "downloadReport"
    );


if (exportButton) {

    exportButton.addEventListener(
        "click",
        () => {

            const saved =
                loadCurrentAnalysis();

            if (!saved) {

                notify(
                    "No analysis available for export.",
                    "warning"
                );

                return;
            }


            downloadJSON(
                "ECG-Sense_Analysis.json",
                saved
            );


            notify(
                "Analysis report downloaded.",
                "success"
            );
        }
    );
}