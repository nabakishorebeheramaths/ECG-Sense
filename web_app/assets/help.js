"use strict";

/* ============================================================
   ECG-SENSE HELP
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupFAQ();

        setupHelpActions();
    }
);


/* ============================================================
   FAQ
   ============================================================ */

function setupFAQ() {

    qsa(
        "[data-faq]"
    ).forEach(
        item => {

            item.addEventListener(
                "click",
                () => {

                    item.classList.toggle(
                        "open"
                    );
                }
            );
        }
    );
}


/* ============================================================
   HELP ACTIONS
   ============================================================ */

function setupHelpActions() {

    const uploadButton =
        $("helpUpload");

    if (uploadButton) {

        uploadButton.addEventListener(
            "click",
            () => {
                navigate(
                    "upload.html"
                );
            }
        );
    }


    const validationButton =
        $("helpValidation");

    if (validationButton) {

        validationButton.addEventListener(
            "click",
            () => {
                navigate(
                    "validation.html"
                );
            }
        );
    }


    const reportButton =
        $("scrollReport");

    if (reportButton) {

        reportButton.addEventListener(
            "click",
            () => {

                const report =
                    $("reportExplanation");

                if (report) {

                    report.scrollIntoView(
                        {
                            behavior:
                                "smooth"
                        }
                    );

                } else {

                    navigate(
                        "advanced.html"
                    );
                }
            }
        );
    }
}