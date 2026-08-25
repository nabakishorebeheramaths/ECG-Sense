# ECG-Sense

## High-Performance ECG R-Peak Detection & Validation Pipeline

ECG-Sense is a research-oriented ECG signal processing platform designed to detect R-peaks, evaluate detection accuracy, and visualize ECG analysis results using MATLAB and digital signal processing techniques.

The project combines signal preprocessing, robust peak detection, reference-beat matching, quantitative evaluation, visualization, and a web-based analysis interface into a reproducible workflow.

---

## Project Status

![Status](https://img.shields.io/badge/Status-Completed-success)
![MATLAB](https://img.shields.io/badge/MATLAB-R2024%2B-blue)
![Dataset](https://img.shields.io/badge/Dataset-MIT--BIH-green)
![Signal%20Processing](https://img.shields.io/badge/Signal%20Processing-DSP-purple)
![F1](https://img.shields.io/badge/Best%20F1-99.98%25-brightgreen)

---

## Overview

Electrocardiogram (ECG) signals contain important information about cardiac electrical activity. Accurate R-peak detection is one of the fundamental steps in ECG analysis because R-peaks provide reliable heartbeat timing information.

ECG-Sense implements a complete processing pipeline that transforms raw ECG signals into validated heartbeat detections.

### Core capabilities

- ECG signal preprocessing
- Baseline-wander correction
- Digital low-pass filtering
- Candidate R-peak detection
- Morphological peak selection
- Reference annotation matching
- TP / FP / FN calculation
- Sensitivity evaluation
- Precision evaluation
- F1-score evaluation
- ECG visualization
- Result export
- Web-based analysis interface
- Reproducible research workflow

---

# Processing Pipeline

```text
                    RAW ECG SIGNAL
                           |
                           v
                +----------------------+
                | Baseline Correction  |
                +----------------------+
                           |
                           v
                +----------------------+
                | 40 Hz Low-Pass Filter|
                +----------------------+
                           |
                           v
                +----------------------+
                | Candidate Detection  |
                +----------------------+
                           |
                           v
                +----------------------+
                | Morphological Filter |
                +----------------------+
                           |
                           v
                    R-PEAK DETECTION
                           |
                           v
                +----------------------+
                | Reference Matching   |
                +----------------------+
                           |
                           v
                    TP / FP / FN
                           |
                           v
              +--------------------------+
              | Sensitivity / Precision  |
              |          / F1            |
              +--------------------------+
                           |
                           v
                     FINAL REPORT