"use strict";

/* ============================================================
   ECG-SENSE VALIDATION / BENCHMARK
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadBenchmark();
    }
);


/* ============================================================
   LOAD BENCHMARK
   ============================================================ */

async function loadBenchmark() {

    try {

        const response =
            await apiGet(
                "/benchmark"
            );

        const data =
            response.data;


        renderOverall(
            data.overall
        );

        renderRecords(
            data.records
        );


    } catch (error) {

        notify(
            error.message,
            "error"
        );
    }
}


/* ============================================================
   OVERALL
   ============================================================ */

function renderOverall(
    overall
) {

    setText(
        "overallTP",
        formatNumber(
            overall.tp
        )
    );

    setText(
        "overallFP",
        formatNumber(
            overall.fp
        )
    );

    setText(
        "overallFN",
        formatNumber(
            overall.fn
        )
    );

    setText(
        "overallSensitivity",
        formatPercent(
            overall.sensitivity
        )
    );

    setText(
        "overallPrecision",
        formatPercent(
            overall.precision
        )
    );

    setText(
        "overallF1",
        formatPercent(
            overall.f1
        )
    );
}


/* ============================================================
   TABLE
   ============================================================ */

function renderRecords(
    records
) {

    const body =
        $("benchmarkBody");

    if (!body) {
        return;
    }


    body.innerHTML = "";


    records.forEach(
        item => {

            const row =
                document.createElement(
                    "tr"
                );


            if (
                item.status !==
                "success"
            ) {

                row.innerHTML =
                    `
                    <td>
                        ${escapeHTML(
                            item.record
                        )}
                    </td>

                    <td colspan="8">
                        Analysis failed
                    </td>
                    `;

                body.appendChild(
                    row
                );

                return;
            }


            row.innerHTML =
                `
                <td>
                    <strong>
                        Record ${escapeHTML(
                            item.record
                        )}
                    </strong>
                </td>

                <td>
                    ${formatNumber(
                        item.reference_beats
                    )}
                </td>

                <td>
                    ${formatNumber(
                        item.detected_peaks
                    )}
                </td>

                <td>
                    ${formatNumber(
                        item.tp
                    )}
                </td>

                <td>
                    ${formatNumber(
                        item.fp
                    )}
                </td>

                <td>
                    ${formatNumber(
                        item.fn
                    )}
                </td>

                <td>
                    ${formatPercent(
                        item.sensitivity
                    )}
                </td>

                <td>
                    ${formatPercent(
                        item.precision
                    )}
                </td>

                <td>
                    ${formatPercent(
                        item.f1
                    )}
                </td>
                `;


            body.appendChild(
                row
            );
        }
    );
}


/* ============================================================
   RECORD SELECT
   ============================================================ */

const validationSelect =
    document.getElementById(
        "validationRecord"
    );


if (validationSelect) {

    validationSelect.addEventListener(
        "change",
        () => {

            const record =
                validationSelect.value;

            if (!record) {
                return;
            }

            navigate(
                `analyze.html?record=${encodeURIComponent(
                    record
                )}`
            );
        }
    );
}