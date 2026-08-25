clc;
clear;
close all;

projectRoot = 'C:/Users/Nabakishore/Documents/MATLAB/ECG-Sense';
dataFolder = fullfile(projectRoot,'data','mitdb');
cd(dataFolder);

[sig, Fs, tm] = rdsamp('100',1);

disp(['Sampling Frequency: ',num2str(Fs),' Hz']);
disp(['Number of Samples: ',num2str(length(sig))]);
disp(['Duration: ',num2str(length(sig)/Fs),' seconds']);
