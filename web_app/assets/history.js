"use strict";

/* ============================================================
   ECG-SENSE HISTORY
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadHistory();
    }
);


/* ============================================================
   LOAD HISTORY
   ============================================================ */

async function loadHistory() {

    const container =
        $("historyList");

    if (!container) {
        return;
    }


    container.innerHTML =
        `
        <div class="skeleton"
             style="height:82px;">
        </div>

        <div class="skeleton"
             style="height:82px;">
        </div>
        `;


    try {

        const response =
            await apiGet(
                "/history?limit=50"
            );

        const history =
            response.data || [];


        renderHistory(
            history
        );


    } catch (error) {

        container.innerHTML =
            `
            <div class="history-empty">
                Unable to load analysis history.
            </div>
            `;

        notify(
            error.message,
            "error"
        );
    }
}


/* ============================================================
   RENDER
   ============================================================ */

function renderHistory(
    history
) {

    const container =
        $("historyList");

    if (!container) {
        return;
    }


    if (!history.length) {

        container.innerHTML =
            `
            <div class="history-empty">
                No analyses yet.
                Upload an ECG to create your first report.
            </div>
            `;

        return;
    }


    container.innerHTML = "";


    history.forEach(
        item => {

            const article =
                document.createElement(
                    "article"
                );

            article.className =
                "history-item";


            const referenceText =
                item.reference_available
                    ? "Validated benchmark"
                    : "Uploaded ECG";


            article.innerHTML =
                `
                <div>
                    <div class="history-item-title">
                        ${escapeHTML(
                            item.source_name ||
                            item.record ||
                            "ECG Analysis"
                        )}
                    </div>

                    <div class="history-item-meta">
                        ${escapeHTML(
                            referenceText
                        )}
                        ·
                        ${escapeHTML(
                            formatDate(
                                item.created_at
                            )
                        )}
                        ·
                        ${formatNumber(
                            item.detected_peaks
                        )}
                        peaks
                    </div>

                    <div class="history-item-meta">
                        ID:
                        ${escapeHTML(
                            item.id
                        )}
                    </div>
                </div>

                <div
                    style="
                        display:flex;
                        gap:8px;
                        flex-wrap:wrap;
                    "
                >

                    <button
                        class="secondary-button"
                        data-open-analysis="${escapeHTML(
                            item.id
                        )}"
                    >
                        Open
                    </button>

                    <button
                        class="secondary-button"
                        data-delete-analysis="${escapeHTML(
                            item.id
                        )}"
                    >
                        Delete
                    </button>

                </div>
                `;


            container.appendChild(
                article
            );
        }
    );


    bindHistoryButtons();
}


/* ============================================================
   BUTTONS
   ============================================================ */

function bindHistoryButtons() {

    qsa(
        "[data-open-analysis]"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const id =
                        button.dataset
                            .openAnalysis;

                    navigate(
                        `analyze.html?id=${encodeURIComponent(
                            id
                        )}`
                    );
                }
            );
        }
    );


    qsa(
        "[data-delete-analysis]"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                async () => {

                    const id =
                        button.dataset
                            .deleteAnalysis;


                    const confirmed =
                        window.confirm(
                            "Delete this ECG analysis?"
                        );


                    if (!confirmed) {
                        return;
                    }


                    button.disabled =
                        true;


                    try {

                        await apiDelete(
                            `/analyses/${encodeURIComponent(
                                id
                            )}`
                        );


                        notify(
                            "Analysis deleted.",
                            "success"
                        );


                        await loadHistory();


                    } catch (error) {

                        notify(
                            error.message,
                            "error"
                        );

                        button.disabled =
                            false;
                    }
                }
            );
        }
    );
}