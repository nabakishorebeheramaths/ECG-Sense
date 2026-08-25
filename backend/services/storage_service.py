from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


# ============================================================
# ECG-SENSE PERSISTENT STORAGE
# ============================================================

PROJECT_ROOT = (
    Path(__file__).resolve().parents[2]
)

STORAGE_DIR = (
    PROJECT_ROOT / "backend" / "storage"
)

STORAGE_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

DATABASE_PATH = (
    STORAGE_DIR / "ecg_sense.db"
)


# ============================================================
# DATABASE
# ============================================================

def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(
        DATABASE_PATH
    )

    connection.row_factory = (
        sqlite3.Row
    )

    return connection


def initialize_database() -> None:
    connection = get_connection()

    try:

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS analyses (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,

                source_type TEXT NOT NULL,
                source_name TEXT,

                record TEXT,

                sampling_rate INTEGER,
                signal_samples INTEGER,
                duration_seconds REAL,

                reference_available INTEGER
                    NOT NULL DEFAULT 0,

                reference_beats INTEGER,
                detected_peaks INTEGER,

                tp INTEGER,
                fp INTEGER,
                fn INTEGER,

                sensitivity REAL,
                precision REAL,
                f1 REAL,

                signal_quality TEXT,

                engine_json TEXT,
                ai_json TEXT
            )
            """
        )

        connection.commit()

    finally:
        connection.close()


# Initialize immediately when imported.
initialize_database()


# ============================================================
# SERIALIZATION
# ============================================================

def _json(value: Any) -> str | None:

    if value is None:
        return None

    return json.dumps(
        value,
        ensure_ascii=False,
    )


def _from_json(
    value: str | None,
):
    if not value:
        return None

    return json.loads(value)


# ============================================================
# CREATE ANALYSIS
# ============================================================

def create_analysis(
    *,
    analysis_id: str,
    source_type: str,
    source_name: str | None,
    analysis: dict[str, Any],
    ai_report: dict[str, Any] | None = None,
) -> dict[str, Any]:

    created_at = (
        datetime.now(
            timezone.utc
        ).isoformat()
    )

    connection = get_connection()

    try:

        connection.execute(
            """
            INSERT INTO analyses (
                id,
                created_at,
                source_type,
                source_name,
                record,
                sampling_rate,
                signal_samples,
                duration_seconds,
                reference_available,
                reference_beats,
                detected_peaks,
                tp,
                fp,
                fn,
                sensitivity,
                precision,
                f1,
                signal_quality,
                engine_json,
                ai_json
            )
            VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            """,
            (
                analysis_id,
                created_at,
                source_type,
                source_name,

                analysis.get(
                    "record"
                ),

                analysis.get(
                    "sampling_rate"
                ),

                analysis.get(
                    "signal_samples"
                ),

                analysis.get(
                    "duration_seconds"
                ),

                int(
                    bool(
                        analysis.get(
                            "reference_available",
                            False,
                        )
                    )
                ),

                analysis.get(
                    "reference_beats"
                ),

                analysis.get(
                    "detected_peaks"
                ),

                analysis.get(
                    "tp"
                ),

                analysis.get(
                    "fp"
                ),

                analysis.get(
                    "fn"
                ),

                analysis.get(
                    "sensitivity"
                ),

                analysis.get(
                    "precision"
                ),

                analysis.get(
                    "f1"
                ),

                analysis.get(
                    "signal_quality"
                ),

                _json(analysis),

                _json(ai_report),
            ),
        )

        connection.commit()

    finally:
        connection.close()

    return get_analysis(
        analysis_id
    )


# ============================================================
# UPDATE AI REPORT
# ============================================================

def save_ai_report(
    analysis_id: str,
    ai_report: dict[str, Any],
) -> dict[str, Any]:

    connection = get_connection()

    try:

        cursor = connection.execute(
            """
            UPDATE analyses
            SET ai_json = ?
            WHERE id = ?
            """,
            (
                _json(ai_report),
                analysis_id,
            ),
        )

        connection.commit()

        if cursor.rowcount == 0:

            raise KeyError(
                f"Analysis '{analysis_id}' not found."
            )

    finally:
        connection.close()

    return get_analysis(
        analysis_id
    )


# ============================================================
# GET ONE ANALYSIS
# ============================================================

def get_analysis(
    analysis_id: str,
) -> dict[str, Any] | None:

    connection = get_connection()

    try:

        row = connection.execute(
            """
            SELECT *
            FROM analyses
            WHERE id = ?
            """,
            (analysis_id,),
        ).fetchone()

    finally:
        connection.close()

    if row is None:
        return None

    return _row_to_dict(
        row
    )


# ============================================================
# HISTORY
# ============================================================

def list_analyses(
    limit: int = 20,
) -> list[dict[str, Any]]:

    limit = max(
        1,
        min(
            int(limit),
            100,
        ),
    )

    connection = get_connection()

    try:

        rows = connection.execute(
            """
            SELECT *
            FROM analyses
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    finally:
        connection.close()

    return [
        _row_to_dict(row)
        for row in rows
    ]


# ============================================================
# DELETE
# ============================================================

def delete_analysis(
    analysis_id: str,
) -> bool:

    connection = get_connection()

    try:

        cursor = connection.execute(
            """
            DELETE FROM analyses
            WHERE id = ?
            """,
            (analysis_id,),
        )

        connection.commit()

        return cursor.rowcount > 0

    finally:
        connection.close()


# ============================================================
# ROW CONVERSION
# ============================================================

def _row_to_dict(
    row: sqlite3.Row,
) -> dict[str, Any]:

    item = dict(row)

    item["reference_available"] = bool(
        item["reference_available"]
    )

    item["engine"] = _from_json(
        item.pop(
            "engine_json",
            None,
        )
    )

    item["ai"] = _from_json(
        item.pop(
            "ai_json",
            None,
        )
    )

    return item