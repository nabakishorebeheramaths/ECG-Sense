"use strict";

/* ============================================================
   ECG-SENSE UPLOAD PAGE
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const fileInput =
            $("ecgFile");

        const fileStatus =
            $("fileStatus") ||
            $("selectedFile");

        const uploadButton =
            $("uploadButton") ||
            $("uploadContinue");

        const liveStatus =
            $("liveStatus");

        const statusTitle =
            $("statusTitle");

        const statusMessage =
            $("statusMessage");


        if (!fileInput) {
            return;
        }


        function showStatus(
            title,
            message
        ) {

            if (liveStatus) {
                liveStatus.style.display =
                    "block";
            }

            setText(
                statusTitle,
                title
            );

            setText(
                statusMessage,
                message
            );
        }


        function setFileStatus(
            text
        ) {
            if (fileStatus) {
                fileStatus.textContent =
                    text;
            }
        }


        fileInput.addEventListener(
            "change",
            () => {

                const file =
                    fileInput.files?.[0];

                if (!file) {

                    setFileStatus(
                        "No file selected."
                    );

                    if (uploadButton) {
                        uploadButton.disabled =
                            true;
                    }

                    return;
                }


                const allowed = [
                    ".csv",
                    ".txt"
                ];

                const extension =
                    "." +
                    file.name
                        .split(".")
                        .pop()
                        .toLowerCase();

                if (
                    !allowed.includes(
                        extension
                    )
                ) {

                    setFileStatus(
                        "Unsupported file type."
                    );

                    fileInput.value = "";

                    if (uploadButton) {
                        uploadButton.disabled =
                            true;
                    }

                    notify(
                        "Please choose a CSV or TXT ECG file.",
                        "error"
                    );

                    return;
                }


                if (
                    file.size >
                    10 * 1024 * 1024
                ) {

                    setFileStatus(
                        "File is larger than 10 MB."
                    );

                    fileInput.value = "";

                    if (uploadButton) {
                        uploadButton.disabled =
                            true;
                    }

                    notify(
                        "Maximum upload size is 10 MB.",
                        "error"
                    );

                    return;
                }


                setFileStatus(
                    `${file.name} · ${(
                        file.size / 1024
                    ).toFixed(1)} KB`
                );

                if (uploadButton) {
                    uploadButton.disabled =
                        false;
                }
            }
        );


        if (uploadButton) {

            uploadButton.addEventListener(
                "click",
                async () => {

                    const file =
                        fileInput.files?.[0];

                    if (!file) {
                        notify(
                            "Choose an ECG file first.",
                            "warning"
                        );
                        return;
                    }


                    setLoading(
                        uploadButton,
                        true,
                        "Analyzing..."
                    );


                    showStatus(
                        "Uploading ECG",
                        "Validating your ECG file..."
                    );


                    try {

                        const formData =
                            new FormData();

                        formData.append(
                            "file",
                            file
                        );


                        showStatus(
                            "Processing ECG",
                            "Detecting heartbeat peaks..."
                        );


                        const response =
                            await apiPostForm(
                                "/upload",
                                formData
                            );


                        const data =
                            response.data;


                        saveCurrentAnalysis(
                            data
                        );


                        showStatus(
                            "Analysis ready",
                            `Analysis ID: ${data.analysis_id}`
                        );


                        addLocalHistory({
                            analysis_id:
                                data.analysis_id,

                            filename:
                                data.filename,

                            created_at:
                                data.created_at,

                            source_type:
                                "upload",

                            detected_peaks:
                                data.analysis?.detected_peaks,

                            signal_quality:
                                data.analysis?.signal_quality
                        });


                        notify(
                            "ECG uploaded and analyzed successfully.",
                            "success"
                        );


                        setTimeout(
                            () => {
                                navigate(
                                    `analyze.html?id=${encodeURIComponent(
                                        data.analysis_id
                                    )}`
                                );
                            },
                            500
                        );


                    } catch (error) {

                        showStatus(
                            "Analysis failed",
                            error.message
                        );

                        notify(
                            error.message,
                            "error",
                            5000
                        );


                        setLoading(
                            uploadButton,
                            false
                        );
                    }
                }
            );
        }


        /* ----------------------------------------------------
           Keyboard accessibility
           ---------------------------------------------------- */

        fileInput.addEventListener(
            "keydown",
            event => {
                if (
                    event.key === "Enter"
                ) {
                    fileInput.click();
                }
            }
        );
    }
);