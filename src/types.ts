import powerbi from "powerbi-visuals-api";

export interface DataPoint {
    category: string;
    value: number;
    color: string;
    selectionId: powerbi.visuals.ISelectionId;
    highlighted: boolean;
    opacity: number;       // Calculated opacity based on value
    stroke?: string;       // Border color
    strokeWidth?: string;  // Border width
    fillOpacity?: number;  // Fill opacity
    tooltipData: { displayName: string; value: string }[];
}

export interface ViewModel {
    dataPoints: DataPoint[];
    maxValue: number;
    minValue: number;
    svgUrl: string;
    dataLabels: DataLabelSettings;
    metricColors: MetricColorSettings;
}

export interface MetricColorSettings {
    thresholds: number[];
    colors: string[];
}

export interface DataLabelSettings {
    show: boolean;
    fontSize: number;
}

