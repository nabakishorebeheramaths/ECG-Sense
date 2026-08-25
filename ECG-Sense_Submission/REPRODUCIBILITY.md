# Reproducibility Guide

## Dataset

Use the MIT-BIH Arrhythmia Database records required for this project through the appropriate PhysioNet distribution.

Required evaluated records: 100, 101, 102, 103, 104.

Place the required records in the local MIT-BIH data directory used by the MATLAB WFDB tools.

## Processing configuration

- Sampling frequency: 360 Hz
- Baseline moving-average window: 180 samples
- Low-pass filter: fourth-order Butterworth
- Cutoff frequency: 40 Hz
- Minimum peak distance: 0.40 s
- Minimum peak prominence: 0.15
- Width threshold: 35 samples
- Matching tolerance: 0.10 s

## Reference beat classes

- N
- A
- V
- F
- /
- f

## Expected overall result

- TP: 10,555
- FP: 53
- FN: 63
- Sensitivity: 99.41%
- Precision: 99.50%
- F1 Score: 99.45%
