function results = evaluateMultipleECGRecords(recordList)

results = struct('record',{},'referenceBeats',{},'detectedPeaks',{},'TP',{},'FP',{},'FN',{},'sensitivity',{},'precision',{},'F1',{});

for r = 1:length(recordList)
    recordName = recordList{r};
    disp(['Evaluating Record ' recordName '...']);

    result = evaluateECGRecord(recordName);

    results(r).record = result.record;
    results(r).referenceBeats = result.referenceBeats;
    results(r).detectedPeaks = result.detectedPeaks;
    results(r).TP = result.TP;
    results(r).FP = result.FP;
    results(r).FN = result.FN;
    results(r).sensitivity = result.sensitivity;
    results(r).precision = result.precision;
    results(r).F1 = result.F1;
end

disp('All records evaluated successfully.');
end
