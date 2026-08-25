# ECG-Sense — Start Here

## What is this?

ECG-Sense is a MATLAB-based ECG R-peak detection and evaluation pipeline developed using classical digital signal-processing methods.

## Final measured performance

- Sensitivity: 99.41%
- Precision: 99.50%
- F1 Score: 99.45%
- Total TP: 10,555
- Total FP: 53
- Total FN: 63

## Evaluated records

MIT-BIH records 100, 101, 102, 103, and 104.

## Where to start

1. Read README.md for the complete project overview.
2. Read docs/ECG_Sense_Methodology.md for the technical methodology.
3. Open figures/ECG_Sense_Final_Performance.png for the final performance summary.
4. Open figures/ECG_Sense_Record102_10s.png for an example ECG detection visualization.
5. Inspect src/evaluateECGRecord.m for the core evaluation pipeline.
6. Inspect results/ for MAT, CSV, and Excel result files.

## Final detector parameters

- Minimum peak distance: 0.40 s
- Minimum peak prominence: 0.15
- Width threshold: 35 samples
- Matching tolerance: 0.10 s

## Dataset

The original MIT-BIH Arrhythmia Database is intentionally not duplicated in this submission package.

See docs/DATASET_NOTICE.md for reproducibility information.

## Responsible use

This is a research and educational signal-processing project. The reported results are not clinical validation.
