clc;
clear;
close all;

projectRoot = 'C:/Users/Nabakishore/Documents/MATLAB/ECG-Sense';
dataFolder = fullfile(projectRoot,'data','mitdb');
resultsFolder = fullfile(projectRoot,'results');
cd(dataFolder);

[sig, Fs, tm] = rdsamp('100',1);

duration = 10;
samples = 1:min(round(duration * Fs),length(sig));

figure('Color','w');
plot(tm(samples),sig(samples),'LineWidth',1);
xlabel('Time (seconds)');
ylabel('ECG Amplitude');
title('ECG-Sense - Raw ECG Signal');
grid on;

outputFile = fullfile(resultsFolder,'raw_ecg_10sec.png');
exportgraphics(gcf,outputFile,'Resolution',300);
