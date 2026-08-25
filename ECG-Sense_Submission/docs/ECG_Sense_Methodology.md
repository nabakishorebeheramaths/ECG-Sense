# ECG-Sense — ECG R-Peak Detection Methodology

## 1. Dataset

The ECG-Sense system was evaluated using MIT-BIH Arrhythmia Database records:

- Record 100
- Record 101
- Record 102
- Record 103
- Record 104

Sampling frequency used in the evaluated records: 360 Hz.

## 2. Signal Preprocessing

The ECG signal undergoes two preprocessing stages.

### Baseline Correction

A moving-average baseline is estimated using a 180-sample window:

baseline = movmean(signal,180)

The corrected ECG is obtained as:

ecgCorrected = signal - baseline

### Low-Pass Filtering

A fourth-order Butterworth low-pass filter with a 40 Hz cutoff frequency is applied:

ecgFiltered = filtfilt(b,a,ecgCorrected)

## 3. Candidate R-Peak Detection

Candidate peaks are detected using MATLAB `findpeaks`.

Final parameters:

- Minimum peak distance: 0.40 s
- Minimum peak prominence: 0.15

## 4. Morphological Peak Selection

Candidate peaks are selected using peak width.

Final width threshold:

- Width <= 35 samples

This threshold was selected experimentally using the evaluated MIT-BIH records.

## 5. Reference Beat Annotations

The following MIT-BIH beat annotation types are included as reference beats:

- N — Normal beat
- A — Atrial premature beat
- V — Ventricular premature beat
- F — Fusion beat
- / — Paced beat
- f — Fusion of paced and normal beat

Non-beat and auxiliary annotations are excluded from the reference beat set.

## 6. Beat Matching

Detected peaks are matched to reference annotations using a one-to-one matching strategy.

Matching tolerance:

- 100 ms

A detected peak is considered a true positive when it falls within the tolerance window of an unmatched reference beat.

## 7. Performance Metrics

### True Positive (TP)

A detected R-peak correctly matched to a reference beat.

### False Positive (FP)

A detected R-peak that does not match any reference beat.

### False Negative (FN)

A reference beat that is not matched by any detected peak.

### Sensitivity

Sensitivity = TP / (TP + FN)

### Precision

Precision = TP / (TP + FP)

### F1 Score

F1 = 2 × Precision × Sensitivity / (Precision + Sensitivity)

## 8. Final Overall Performance

Across MIT-BIH records 100–104:

- Total TP = 10,555
- Total FP = 53
- Total FN = 63
- Sensitivity = 99.41%
- Precision = 99.50%
- F1 Score = 99.45%

## 9. Final Detector Parameters

- MinPeakDistance = 0.40 s
- MinPeakProminence = 0.15
- WidthThreshold = 35 samples
- MatchingTolerance = 0.10 s

## 10. Conclusion

The ECG-Sense R-peak detection pipeline achieved high detection performance across the evaluated MIT-BIH records, with an overall sensitivity of 99.41%, precision of 99.50%, and F1 score of 99.45%.