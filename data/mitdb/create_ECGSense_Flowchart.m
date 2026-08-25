figure('Color','w','Position',[300 50 800 900]);

axis off;
xlim([0 10]);
ylim([0 18]);

% Box positions: [x y width height]

boxes = {
    [3 16 4 1], 'ECG Signal Input';
    [3 14 4 1], 'MIT-BIH Annotation Loading';
    [3 12 4 1], 'Baseline Correction';
    [3 10 4 1], '40 Hz Low-Pass Filtering';
    [3 8 4 1], 'Candidate Peak Detection';
    [3 6 4 1], 'Prominence + Width Selection';
    [3 4 4 1], 'Reference Beat Matching';
    [3 2 4 1], 'TP / FP / FN → Sensitivity / Precision / F1'
};

for k = 1:size(boxes,1)

    rectangle('Position',boxes{k,1}, ...
        'Curvature',0.08, ...
        'LineWidth',1.5);

    pos = boxes{k,1};

    text(pos(1)+pos(3)/2, ...
         pos(2)+pos(4)/2, ...
         boxes{k,2}, ...
         'HorizontalAlignment','center', ...
         'VerticalAlignment','middle', ...
         'FontSize',11, ...
         'FontWeight','bold');
end

% Arrows

for y = [15 13 11 9 7 5 3]

    annotation('arrow', ...
        [0.5 0.5], ...
        [y/18 (y-1)/18], ...
        'LineWidth',1.5);
end

title('ECG-Sense ECG R-Peak Detection Pipeline', ...
    'FontSize',16, ...
    'FontWeight','bold');

exportgraphics(gcf, ...
    'ECG_Sense_Algorithm_Flowchart.png', ...
    'Resolution',300);