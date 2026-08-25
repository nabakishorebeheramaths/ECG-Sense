function [rPeaks, peakInfo] = detectRPeaksECGSense(ecg, Fs)

baseline = movmean(ecg,180);
ecgCorrected = ecg - baseline;

[b,a] = butter(4,40/(Fs/2),'low');
ecgFiltered = filtfilt(b,a,ecgCorrected);

[candidatePeaks,candidateLocs,widths,prominences] = findpeaks(...
    ecgFiltered,...
    'MinPeakDistance',round(0.30*Fs),...
    'MinPeakProminence',0.15);

promThreshold = 0.80;
widthThreshold = 20;

isRPeak = (prominences >= promThreshold) & ...
          (widths <= widthThreshold);

rPeaks = candidateLocs(isRPeak);

peakInfo.peaks = candidatePeaks(isRPeak);
peakInfo.widths = widths(isRPeak);
peakInfo.prominences = prominences(isRPeak);
peakInfo.filteredSignal = ecgFiltered;
peakInfo.baseline = baseline;
end
