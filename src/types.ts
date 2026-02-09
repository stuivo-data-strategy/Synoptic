import powerbi from "powerbi-visuals-api";

export interface DataPoint {
    category: string;
    value: number;
    color: string;
    selectionId: powerbi.visuals.ISelectionId;
}

export interface ViewModel {
    dataPoints: DataPoint[];
    maxValue: number;
    minValue: number;
    svgUrl: string;
}

export interface VisualSettings {
    svgUrl: string;
}
