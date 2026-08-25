from __future__ import annotations

from datetime import datetime, timezone

from fastapi import (
    FastAPI,
    File,
    HTTPException,
    Query,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware

from services.ai_service import (
    GeminiServiceError,
    explain_analysis,
    ai_service_info,
)

from services.ecg_service import (
    analyze_record,
    engine_info,
    get_waveform_window,
)

from services.storage_service import (
    create_analysis,
    delete_analysis,
    get_analysis,
    list_analyses,
    save_ai_report,
)

from services.uploaded_ecg_service import (
    analyze_uploaded_signal,
    create_analysis_id,
    parse_signal,
)


# ============================================================
# ECG-SENSE API
# ============================================================

APP_VERSION = "2.0.0"

SUPPORTED_RECORDS = (
    "100",
    "101",
    "102",
    "103",
    "104",
)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="ECG-Sense API",
    summary=(
        "ECG signal analysis, R-peak detection, "
        "AI-assisted explanation and reporting API."
    ),
    description=(
        "ECG-Sense provides deterministic ECG signal "
        "processing, MIT-BIH benchmark validation, "
        "uploaded ECG analysis, persistent reports, "
        "history and Gemini-assisted explanations."
    ),
    version=APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ============================================================
# CORS
# ============================================================

# IMPORTANT:
# The frontend is hosted at:
# https://ecg-sense-1.onrender.com
#
# The backend is hosted at:
# https://ecg-sense.onrender.com
#
# The frontend origin MUST be explicitly allowed here.

ALLOWED_ORIGINS = [
    # Production frontend
    "https://ecg-sense-1.onrender.com",

    # Local development
    "http://localhost:5500",
    "http://127.0.0.1:5500",

    # Common Vite development ports
    "http://localhost:5173",
    "http://127.0.0.1:5173",

    # Local FastAPI/static development
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# STARTUP DEBUG
# ============================================================

@app.on_event("startup")
async def startup_event():
    print("=" * 70)
    print("ECG-Sense API STARTED")
    print(f"Version: {APP_VERSION}")
    print("CORS allowed origins:")
    for origin in ALLOWED_ORIGINS:
        print(f"  - {origin}")
    print("=" * 70)


# ============================================================
# HELPERS
# ============================================================

def validate_record(
    record: str,
) -> str:

    normalized = str(record).strip()

    if normalized not in SUPPORTED_RECORDS:

        raise HTTPException(
            status_code=400,
            detail={
                "error": "UnsupportedRecord",
                "message": (
                    f"Record '{normalized}' "
                    "is not supported."
                ),
                "supported_records": list(
                    SUPPORTED_RECORDS
                ),
            },
        )

    return normalized


def metrics_from_result(
    result: dict,
) -> dict:

    sensitivity = result.get("sensitivity")
    precision = result.get("precision")
    f1 = result.get("f1")

    return {
        "record": result.get("record"),

        "reference_available": bool(
            result.get(
                "reference_available",
                False,
            )
        ),

        "sampling_rate": (
            int(result["sampling_rate"])
            if result.get("sampling_rate") is not None
            else None
        ),

        "signal_samples": (
            int(result["signal_samples"])
            if result.get("signal_samples") is not None
            else None
        ),

        "duration_seconds": (
            float(result["duration_seconds"])
            if result.get("duration_seconds") is not None
            else None
        ),

        "reference_beats": (
            int(result["reference_beats"])
            if result.get("reference_beats") is not None
            else None
        ),

        "detected_peaks": (
            int(result["detected_peaks"])
            if result.get("detected_peaks") is not None
            else None
        ),

        "tp": (
            int(result["tp"])
            if result.get("tp") is not None
            else None
        ),

        "fp": (
            int(result["fp"])
            if result.get("fp") is not None
            else None
        ),

        "fn": (
            int(result["fn"])
            if result.get("fn") is not None
            else None
        ),

        "sensitivity": (
            float(sensitivity * 100)
            if sensitivity is not None
            else None
        ),

        "precision": (
            float(precision * 100)
            if precision is not None
            else None
        ),

        "f1": (
            float(f1 * 100)
            if f1 is not None
            else None
        ),

        "signal_quality": result.get(
            "signal_quality"
        ),
    }


def ai_safe_report(
    result: dict,
):

    try:

        return explain_analysis(
            result
        )

    except GeminiServiceError as exc:

        raise HTTPException(
            status_code=503,
            detail={
                "error": "AIUnavailable",
                "message": str(exc),
            },
        ) from exc


def saved_analysis_or_404(
    analysis_id: str,
):

    result = get_analysis(
        analysis_id
    )

    if result is None:

        raise HTTPException(
            status_code=404,
            detail={
                "error": "AnalysisNotFound",
                "message": (
                    f"Analysis '{analysis_id}' "
                    "does not exist."
                ),
            },
        )

    return result


# ============================================================
# ROOT
# ============================================================

@app.get(
    "/",
    tags=["System"],
)
def root():

    return {
        "service": "ECG-Sense API",
        "version": APP_VERSION,
        "status": "online",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/api/health",
        "frontend": "https://ecg-sense-1.onrender.com",
    }


# ============================================================
# HEALTH
# ============================================================

@app.get(
    "/api/health",
    tags=["System"],
)
def health():

    return {
        "status": "ok",
        "service": "ECG-Sense API",
        "version": APP_VERSION,
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),
    }


# ============================================================
# INFORMATION
# ============================================================

@app.get(
    "/api/info",
    tags=["System"],
)
def api_info():

    return {
        "service": "ECG-Sense API",
        "version": APP_VERSION,
        "platform": "ECG-Sense",
        "dataset": "MIT-BIH Arrhythmia Database",
        "supported_records": list(
            SUPPORTED_RECORDS
        ),
        "upload_formats": [
            "CSV",
            "TXT",
        ],
        "max_upload_mb": (
            MAX_UPLOAD_BYTES
            / (1024 * 1024)
        ),
        "detector": engine_info(),
        "ai": ai_service_info(),
    }


# ============================================================
# RECORD SUMMARY
# ============================================================

@app.get(
    "/api/records/{record}/summary",
    tags=["ECG Analysis"],
)
def record_summary(
    record: str,
):

    record = validate_record(record)

    try:

        result = analyze_record(
            record
        )

        return {
            "status": "success",
            "data": metrics_from_result(
                result
            ),
        }

    except FileNotFoundError as exc:

        raise HTTPException(
            status_code=404,
            detail={
                "error": "RecordNotFound",
                "message": str(exc),
            },
        ) from exc

    except Exception as exc:

        print(
            f"[ECG-Sense] SUMMARY ERROR "
            f"record={record}: {exc}"
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error": "AnalysisFailed",
                "message": str(exc),
            },
        ) from exc


# ============================================================
# FULL RECORD ANALYSIS
# ============================================================

@app.get(
    "/api/records/{record}/analysis",
    tags=["ECG Analysis"],
)
def record_analysis(
    record: str,
):

    record = validate_record(record)

    try:

        result = analyze_record(
            record
        )

        data = metrics_from_result(
            result
        )

        data.update(
            {
                "reference_samples": result[
                    "reference_samples"
                ],

                "detected_samples": result[
                    "detected_samples"
                ],

                "matched_detected": result[
                    "matched_detected"
                ],

                "matched_reference": result[
                    "matched_reference"
                ],

                "peak_widths": result.get(
                    "peak_widths",
                    [],
                ),
            }
        )

        return {
            "status": "success",
            "data": data,
        }

    except FileNotFoundError as exc:

        raise HTTPException(
            status_code=404,
            detail={
                "error": "RecordNotFound",
                "message": str(exc),
            },
        ) from exc

    except Exception as exc:

        print(
            f"[ECG-Sense] FULL ANALYSIS ERROR "
            f"record={record}: {exc}"
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error": "AnalysisFailed",
                "message": str(exc),
            },
        ) from exc


# ============================================================
# WAVEFORM
# ============================================================

@app.get(
    "/api/records/{record}/waveform",
    tags=["ECG Analysis"],
)
def record_waveform(
    record: str,

    start: float = Query(
        default=0.0,
        ge=0.0,
    ),

    duration: float = Query(
        default=10.0,
        gt=0.0,
        le=60.0,
    ),
):

    record = validate_record(record)

    try:

        waveform = get_waveform_window(
            record=record,
            start=start,
            duration=duration,
        )

        return {
            "status": "success",
            "data": waveform,
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail={
                "error": "InvalidWaveformRequest",
                "message": str(exc),
            },
        ) from exc

    except FileNotFoundError as exc:

        raise HTTPException(
            status_code=404,
            detail={
                "error": "RecordNotFound",
                "message": str(exc),
            },
        ) from exc

    except Exception as exc:

        print(
            f"[ECG-Sense] WAVEFORM ERROR "
            f"record={record}: {exc}"
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error": "WaveformFailed",
                "message": str(exc),
            },
        ) from exc


# ============================================================
# AI RECORD REPORT
# ============================================================

@app.get(
    "/api/records/{record}/ai-report",
    tags=["AI"],
)
def record_ai_report(
    record: str,
):

    record = validate_record(record)

    try:

        result = analyze_record(
            record
        )

        ai = ai_safe_report(
            result
        )

        return {
            "status": "success",
            "data": {
                "metrics": metrics_from_result(
                    result
                ),
                "ai": ai,
            },
        }

    except HTTPException:
        raise

    except FileNotFoundError as exc:

        raise HTTPException(
            status_code=404,
            detail={
                "error": "RecordNotFound",
                "message": str(exc),
            },
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail={
                "error": "AIReportFailed",
                "message": str(exc),
            },
        ) from exc


# ============================================================
# UPLOAD
# ============================================================

@app.post(
    "/api/upload",
    tags=["Upload"],
)
async def upload_ecg(
    file: UploadFile = File(...),
):

    filename = (
        file.filename
        or "uploaded_ecg"
    )

    try:

        content = await file.read()

    except Exception as exc:

        raise HTTPException(
            status_code=400,
            detail={
                "error": "UploadReadFailed",
                "message": str(exc),
            },
        ) from exc

    if not content:

        raise HTTPException(
            status_code=400,
            detail={
                "error": "EmptyUpload",
                "message": (
                    "Uploaded ECG file is empty."
                ),
            },
        )

    if len(content) > MAX_UPLOAD_BYTES:

        raise HTTPException(
            status_code=413,
            detail={
                "error": "FileTooLarge",
                "message": (
                    "Maximum ECG upload size "
                    "is 10 MB."
                ),
            },
        )

    try:

        signal, fs = parse_signal(
            content,
            filename,
        )

        engine_result = (
            analyze_uploaded_signal(
                signal,
                fs,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail={
                "error": "InvalidECGFile",
                "message": str(exc),
            },
        ) from exc

    except Exception as exc:

        print(
            f"[ECG-Sense] UPLOAD ANALYSIS ERROR: "
            f"{exc}"
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error": "UploadAnalysisFailed",
                "message": str(exc),
            },
        ) from exc

    analysis_id = create_analysis_id()

    try:

        saved = create_analysis(
            analysis_id=analysis_id,
            source_type="upload",
            source_name=filename,
            analysis=engine_result,
            ai_report=None,
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail={
                "error": "StorageFailed",
                "message": str(exc),
            },
        ) from exc

    return {
        "status": "success",
        "data": {
            "analysis_id": analysis_id,
            "filename": filename,
            "analysis": metrics_from_result(
                engine_result
            ),
            "created_at": saved[
                "created_at"
            ],
        },
    }


# ============================================================
# SAVED ANALYSIS AI REPORT
# ============================================================

@app.post(
    "/api/analyses/{analysis_id}/ai-report",
    tags=["AI"],
)
def generate_saved_ai_report(
    analysis_id: str,
):

    saved = saved_analysis_or_404(
        analysis_id
    )

    engine_result = saved.get(
        "engine"
    )

    if not engine_result:

        raise HTTPException(
            status_code=500,
            detail={
                "error": "AnalysisDataMissing",
                "message": (
                    "Stored deterministic analysis "
                    "data is unavailable."
                ),
            },
        )

    ai = ai_safe_report(
        engine_result
    )

    try:

        updated = save_ai_report(
            analysis_id,
            ai,
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail={
                "error": "AIStorageFailed",
                "message": str(exc),
            },
        ) from exc

    return {
        "status": "success",
        "data": updated,
    }


# ============================================================
# GET SAVED ANALYSIS
# ============================================================

@app.get(
    "/api/analyses/{analysis_id}",
    tags=["Analysis"],
)
def get_saved_analysis(
    analysis_id: str,
):

    result = saved_analysis_or_404(
        analysis_id
    )

    return {
        "status": "success",
        "data": result,
    }


# ============================================================
# HISTORY
# ============================================================

@app.get(
    "/api/history",
    tags=["Analysis"],
)
def analysis_history(
    limit: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
):

    try:

        history = list_analyses(
            limit
        )

        return {
            "status": "success",
            "data": history,
        }

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail={
                "error": "HistoryFailed",
                "message": str(exc),
            },
        ) from exc


# ============================================================
# DELETE ANALYSIS
# ============================================================

@app.delete(
    "/api/analyses/{analysis_id}",
    tags=["Analysis"],
)
def remove_analysis(
    analysis_id: str,
):

    try:

        deleted = delete_analysis(
            analysis_id
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail={
                "error": "DeleteFailed",
                "message": str(exc),
            },
        ) from exc

    if not deleted:

        raise HTTPException(
            status_code=404,
            detail={
                "error": "AnalysisNotFound",
                "message": (
                    f"Analysis '{analysis_id}' "
                    "does not exist."
                ),
            },
        )

    return {
        "status": "success",
        "message": (
            f"Analysis '{analysis_id}' "
            "deleted successfully."
        ),
    }


# ============================================================
# BENCHMARK
# ============================================================

@app.get(
    "/api/benchmark",
    tags=["Benchmark"],
)
def benchmark():

    records = []

    total_tp = 0
    total_fp = 0
    total_fn = 0

    for record in SUPPORTED_RECORDS:

        try:

            result = analyze_record(
                record
            )

            total_tp += int(
                result["tp"]
            )

            total_fp += int(
                result["fp"]
            )

            total_fn += int(
                result["fn"]
            )

            item = metrics_from_result(
                result
            )

            item["status"] = "success"

            records.append(item)

        except Exception as exc:

            records.append(
                {
                    "record": record,
                    "status": "error",
                    "message": str(exc),
                }
            )

    overall_sensitivity = (
        total_tp
        / (total_tp + total_fn)
        if total_tp + total_fn > 0
        else 0.0
    )

    overall_precision = (
        total_tp
        / (total_tp + total_fp)
        if total_tp + total_fp > 0
        else 0.0
    )

    overall_f1 = (
        2.0
        * overall_sensitivity
        * overall_precision
        / (
            overall_sensitivity
            + overall_precision
        )
        if (
            overall_sensitivity
            + overall_precision
        ) > 0
        else 0.0
    )

    successful_records = sum(
        1
        for item in records
        if item["status"] == "success"
    )

    return {
        "status": "success",
        "data": {
            "records": records,

            "successful_records":
                successful_records,

            "total_records":
                len(SUPPORTED_RECORDS),

            "overall": {
                "tp": total_tp,
                "fp": total_fp,
                "fn": total_fn,

                "sensitivity":
                    overall_sensitivity * 100,

                "precision":
                    overall_precision * 100,

                "f1":
                    overall_f1 * 100,
            },
        },
    }