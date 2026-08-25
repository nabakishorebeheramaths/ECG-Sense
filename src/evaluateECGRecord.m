function result = evaluateECGRecord(recordName)

projectRoot = 'C:/Users/Nabakishore/Documents/MATLAB/ECG-Sense';
dataFolder = fullfile(projectRoot,'data','mitdb');

cd(dataFolder);

% Load ECG signal and annotations
[sig, Fs, ~] = rdsamp(recordName,1);
[annSamples, annTypes] = rdann(recordName,'atr');

% Baseline correction
baseline = movmean(sig,180);
ecgCorrected = sig - baseline;

% Low-pass filtering
[b,a] = butter(4,40/(Fs/2),'low');
ecgFiltered = filtfilt(b,a,ecgCorrected);

% Candidate peak detection
[~,candidateLocs,widths,prominences] = findpeaks( ...
    ecgFiltered, ...
    'MinPeakDistance',round(0.40*Fs), ...
    'MinPeakProminence',0.15);

% Peak selection
promThreshold = 0.15;
widthThreshold = 35;

isRPeak = (prominences >= promThreshold) & ...
          (widths <= widthThreshold);

rPeaks = candidateLocs(isRPeak);

% Reference beat types
beatTypes = ['N','A','V','F','/','f'];

validRef = ismember(annTypes,beatTypes);
refBeats = annSamples(validRef);

% Beat matching tolerance
tolerance = round(0.10*Fs);

matchedRef = false(size(refBeats));
matchedDet = false(size(rPeaks));

for i = 1:length(rPeaks)

    distances = abs(refBeats - rPeaks(i));
    [minDist,idx] = min(distances);

    if minDist <= tolerance && ~matchedRef(idx)

        matchedDet(i) = true;
        matchedRef(idx) = true;

    end

end

% Performance metrics
TP = sum(matchedDet);
FP = sum(~matchedDet);
FN = sum(~matchedRef);

sensitivity = TP/(TP+FN);
precision = TP/(TP+FP);

if sensitivity + precision > 0
    F1 = 2*sensitivity*precision/(sensitivity+precision);
else
    F1 = 0;
end

% Store results
result.record = recordName;
result.Fs = Fs;

result.referenceBeats = length(refBeats);
result.detectedPeaks = length(rPeaks);

result.TP = TP;
result.FP = FP;
result.FN = FN;

result.sensitivity = sensitivity;
result.precision = precision;
result.F1 = F1;

result.rPeaks = rPeaks;

end