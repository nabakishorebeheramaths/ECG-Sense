"use strict";

/* ============================================================
   ECG-SENSE GLOBAL FRONTEND CORE
   ============================================================ */

const API_BASE = "https://ecg-sense.onrender.com/api";

const ECG_APP = {
    apiBase: API_BASE,
    version: "2.0.0",
    storage: {
        currentAnalysis: "ecgSenseCurrentAnalysis",
        currentSummary: "ecgSenseCurrentSummary",
        currentReport: "ecgSenseCurrentReport"
    }
};


/* ============================================================
   DOM HELPERS
   ============================================================ */

function $(id) {
    return document.getElementById(id);
}

function qs(selector, root = document) {
    return root.querySelector(selector);
}

function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
}


/* ============================================================
   NAVIGATION
   ============================================================ */

function navigate(path) {
    window.location.assign(path);
}

function goBack() {
    window.history.back();
}

function getParam(name) {
    return new URLSearchParams(
        window.location.search
    ).get(name);
}


/* ============================================================
   SESSION STORAGE
   ============================================================ */

function saveSession(key, value) {
    sessionStorage.setItem(
        key,
        JSON.stringify(value)
    );
}

function loadSession(key) {
    try {
        const raw =
            sessionStorage.getItem(key);

        return raw
            ? JSON.parse(raw)
            : null;
    } catch (error) {
        console.error(
            "Session read failed:",
            error
        );
        return null;
    }
}

function removeSession(key) {
    sessionStorage.removeItem(key);
}


/* ============================================================
   LOCAL HISTORY
   ============================================================ */

function readLocalHistory() {
    try {
        return JSON.parse(
            localStorage.getItem(
                "ecgSenseHistory"
            ) || "[]"
        );
    } catch {
        return [];
    }
}

function writeLocalHistory(items) {
    localStorage.setItem(
        "ecgSenseHistory",
        JSON.stringify(
            items.slice(0, 50)
        )
    );
}

function addLocalHistory(item) {
    const history =
        readLocalHistory();

    const filtered =
        history.filter(
            entry =>
                entry.analysis_id !==
                item.analysis_id
        );

    filtered.unshift({
        id: Date.now(),
        ...item
    });

    writeLocalHistory(
        filtered
    );
}


/* ============================================================
   NUMBER / TEXT FORMATTING
   ============================================================ */

function formatNumber(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "—";
    }

    return Number(value).toLocaleString();
}

function formatPercent(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "—";
    }

    return `${Number(value).toFixed(2)}%`;
}

function formatDate(value) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString(
        undefined,
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
}

function escapeHTML(value) {
    const element =
        document.createElement("div");

    element.textContent =
        String(value ?? "");

    return element.innerHTML;
}


/* ============================================================
   NOTIFICATION
   ============================================================ */

function notify(
    message,
    type = "info",
    duration = 3600
) {
    let element =
        $("globalStatus");

    if (!element) {
        element =
            document.createElement(
                "div"
            );

        element.id =
            "globalStatus";

        element.className =
            "global-status";

        document.body.appendChild(
            element
        );
    }

    element.textContent =
        String(message);

    element.dataset.type =
        type;

    element.classList.add("show");

    clearTimeout(
        element._timer
    );

    element._timer =
        setTimeout(
            () => {
                element.classList.remove(
                    "show"
                );
            },
            duration
        );
}


/* ============================================================
   API REQUEST
   ============================================================ */

async function apiRequest(
    endpoint,
    options = {}
) {
    const config = {
        method: "GET",
        ...options,
        headers: {
            Accept:
                "application/json",
            ...(options.headers || {})
        }
    };

    const response =
        await fetch(
            `${API_BASE}${endpoint}`,
            config
        );

    let payload = null;

    const contentType =
        response.headers.get(
            "content-type"
        );

    if (
        contentType &&
        contentType.includes(
            "application/json"
        )
    ) {
        payload =
            await response.json();
    } else {
        payload =
            await response.text();
    }

    if (!response.ok) {
        let message =
            `Request failed (${response.status})`;

        if (
            payload &&
            typeof payload === "object"
        ) {
            if (
                payload.detail &&
                typeof payload.detail ===
                    "object" &&
                payload.detail.message
            ) {
                message =
                    payload.detail.message;
            } else if (
                typeof payload.detail ===
                "string"
            ) {
                message =
                    payload.detail;
            } else if (
                payload.message
            ) {
                message =
                    payload.message;
            }
        }

        throw new Error(
            message
        );
    }

    return payload;
}

async function apiGet(
    endpoint,
    options = {}
) {
    return apiRequest(
        endpoint,
        {
            ...options,
            method: "GET"
        }
    );
}

async function apiPostJSON(
    endpoint,
    body,
    options = {}
) {
    return apiRequest(
        endpoint,
        {
            ...options,
            method: "POST",
            headers: {
                "Content-Type":
                    "application/json",
                ...(options.headers || {})
            },
            body: JSON.stringify(body)
        }
    );
}

async function apiPostForm(
    endpoint,
    formData,
    options = {}
) {
    return apiRequest(
        endpoint,
        {
            ...options,
            method: "POST",
            body: formData
        }
    );
}

async function apiDelete(
    endpoint,
    options = {}
) {
    return apiRequest(
        endpoint,
        {
            ...options,
            method: "DELETE"
        }
    );
}


/* ============================================================
   ANALYSIS HELPERS
   ============================================================ */

function saveCurrentAnalysis(
    analysis
) {
    saveSession(
        ECG_APP.storage.currentAnalysis,
        analysis
    );
}

function loadCurrentAnalysis() {
    return loadSession(
        ECG_APP.storage.currentAnalysis
    );
}

function saveCurrentReport(
    report
) {
    saveSession(
        ECG_APP.storage.currentReport,
        report
    );
}

function loadCurrentReport() {
    return loadSession(
        ECG_APP.storage.currentReport
    );
}


/* ============================================================
   UI HELPERS
   ============================================================ */

function setText(
    elementOrId,
    value
) {
    const element =
        typeof elementOrId === "string"
            ? $(elementOrId)
            : elementOrId;

    if (element) {
        element.textContent =
            value ?? "—";
    }
}

function setHTML(
    elementOrId,
    value
) {
    const element =
        typeof elementOrId === "string"
            ? $(elementOrId)
            : elementOrId;

    if (element) {
        element.innerHTML =
            value ?? "";
    }
}

function setVisible(
    elementOrId,
    visible
) {
    const element =
        typeof elementOrId === "string"
            ? $(elementOrId)
            : elementOrId;

    if (!element) {
        return;
    }

    element.style.display =
        visible
            ? ""
            : "none";
}

function setLoading(
    button,
    loading,
    loadingText = "Processing..."
) {
    if (!button) {
        return;
    }

    if (loading) {
        if (
            !button.dataset.originalText
        ) {
            button.dataset.originalText =
                button.textContent;
        }

        button.disabled = true;

        button.textContent =
            loadingText;
    } else {
        button.disabled = false;

        button.textContent =
            button.dataset.originalText ||
            button.textContent;
    }
}


/* ============================================================
   ROUTING
   ============================================================ */

function setupRouteLinks() {
    qsa("[data-route]").forEach(
        element => {
            element.addEventListener(
                "click",
                event => {
                    event.preventDefault();

                    const route =
                        element.dataset.route;

                    if (route) {
                        navigate(route);
                    }
                }
            );
        }
    );
}


/* ============================================================
   API STATUS
   ============================================================ */

async function checkAPI() {
    try {
        const response =
            await apiGet(
                "/health"
            );

        return (
            response &&
            response.status === "ok"
        );
    } catch {
        return false;
    }
}


/* ============================================================
   DOWNLOAD
   ============================================================ */

function downloadTextFile(
    filename,
    content,
    mime = "text/plain"
) {
    const blob =
        new Blob(
            [content],
            { type: mime }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    const link =
        document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(
        link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
        url
    );
}

function downloadJSON(
    filename,
    data
) {
    downloadTextFile(
        filename,
        JSON.stringify(
            data,
            null,
            2
        ),
        "application/json"
    );
}


/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        setupRouteLinks();
    }
);
