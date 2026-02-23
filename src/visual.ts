import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import * as d3 from "d3";
import { loadSVG } from "./svgLoader";
import { D3Renderer } from "./d3Renderer";
import { ViewModel, DataPoint, MetricColorSettings } from "./types";

export class Visual implements IVisual {
    private target: HTMLElement;
    private renderer: D3Renderer;
    private currentSvgUrl: string = "";
    private host: powerbi.extensibility.visual.IVisualHost;
    private selectionManager: powerbi.extensibility.ISelectionManager;
    private metricColors: MetricColorSettings = { thresholds: [], colors: [] };
    private dataLabelsSettings: { show: boolean, fontSize: number } = { show: false, fontSize: 12 };

    constructor(options: VisualConstructorOptions) {
        this.target = options.element;
        this.host = options.host;
        this.selectionManager = this.host.createSelectionManager();
        this.renderer = new D3Renderer(this.selectionManager, this.host);
    }

    public update(options: VisualUpdateOptions) {
        try {
            const viewModel = this.visualTransform(options, this.host);

            if (!viewModel) return;

            // Load SVG if URL changed
            if (this.currentSvgUrl !== viewModel.svgUrl) {
                this.currentSvgUrl = viewModel.svgUrl;
                if (this.currentSvgUrl) {
                    loadSVG(this.currentSvgUrl, this.target).then(svg => {
                        if (svg) {
                            this.renderer.setSVG(svg);
                            try {
                                this.renderer.update(viewModel.dataPoints, viewModel.dataLabels);
                            } catch (e) {
                                console.error(e);
                                this.displayError(`Renderer Error: ${e.message}`);
                            }
                        }
                    }).catch(e => {
                        console.error(e);
                        this.displayError(`LoadSVG Error: ${e.message}`);
                    });
                } else {
                    this.displayMessage("Please provide an SVG URL in the format settings.");
                }
            } else {
                // Check if SVG is already loaded before updating data
                const svg = d3.select(this.target).select("svg");
                if (!svg.empty()) {
                    this.renderer.setSVG(svg as d3.Selection<SVGElement, unknown, null, undefined>);
                    try {
                        this.renderer.update(viewModel.dataPoints, viewModel.dataLabels);
                    } catch (e) {
                        console.error(e);
                        this.displayError(`Renderer Update Error: ${e.message}`);
                    }
                } else {
                    if (this.currentSvgUrl) {
                        loadSVG(this.currentSvgUrl, this.target).then(svg => {
                            if (svg) {
                                this.renderer.setSVG(svg);
                                this.renderer.update(viewModel.dataPoints, viewModel.dataLabels);
                            }
                        });
                    }
                }
            }
        } catch (e) {
            console.error(e);
            this.displayError(`Visual Update Error: ${e.message}`);
        }
    }

    private displayError(message: string) {
        const div = document.createElement("div");
        div.style.position = "absolute";
        div.style.top = "50px";
        div.style.left = "0";
        div.style.background = "red";
        div.style.color = "white";
        div.style.zIndex = "10001";
        div.textContent = message;
        this.target.appendChild(div);
    }

    private displayMessage(message: string) {
        // Clear existing
        while (this.target.firstChild) {
            this.target.removeChild(this.target.firstChild);
        }
        const div = document.createElement("div");
        div.textContent = message;
        this.target.appendChild(div);
    }

    private visualTransform(options: VisualUpdateOptions, host: powerbi.extensibility.visual.IVisualHost): ViewModel {
        let dataViews = options.dataViews;
        let viewModel: ViewModel = {
            dataPoints: [],
            maxValue: 0,
            minValue: 0,
            svgUrl: "",
            metricColors: { thresholds: [], colors: [] },
            dataLabels: { show: false, fontSize: 12 }
        };

        if (!dataViews || !dataViews[0]) {
            return viewModel;
        }

        const objects = dataViews[0].metadata.objects;

        // Extract settings
        if (objects) {
            if (objects["settings"] && objects["settings"]["svgUrl"]) {
                viewModel.svgUrl = <string>objects["settings"]["svgUrl"];
            }

            if (objects["metricColors"]) {
                const mc = objects["metricColors"];
                // Parse thresholds and colors
                viewModel.metricColors.thresholds = [
                    <number>mc["threshold1"],
                    <number>mc["threshold2"],
                    <number>mc["threshold3"],
                    <number>mc["threshold4"],
                    <number>mc["threshold5"]
                ];
                viewModel.metricColors.colors = [
                    this.getColor(mc["color1"]),
                    this.getColor(mc["color2"]),
                    this.getColor(mc["color3"]),
                    this.getColor(mc["color4"]),
                    this.getColor(mc["color5"]),
                    this.getColor(mc["color6"])
                ];
            }

            if (objects["dataLabels"]) {
                const dl = objects["dataLabels"];
                viewModel.dataLabels.show = <boolean>dl["show"];
                viewModel.dataLabels.fontSize = <number>dl["fontSize"];
            }
        }

        // Update stored settings for persistence
        this.metricColors = viewModel.metricColors;
        this.dataLabelsSettings = viewModel.dataLabels;

        if (!dataViews[0].categorical || !dataViews[0].categorical.categories || !dataViews[0].categorical.values) {
            return viewModel;
        }

        const categorical = dataViews[0].categorical;
        const category = categorical.categories[0];
        const dataValue = categorical.values.find(v => v.source.roles["measure"]);

        // Tooltips
        const tooltipValues = categorical.values.filter(v => v.source.roles["tooltips"]);

        if (!dataValue) return viewModel;

        let dataPoints: DataPoint[] = [];
        let maxValue: number = <number>dataValue.maxLocal;
        let minValue: number = <number>dataValue.minLocal;

        const colorPalette: powerbi.extensibility.IColorPalette = host.colorPalette;
        const highlights = dataValue.highlights;

        for (let i = 0, len = Math.max(category.values.length, dataValue.values.length); i < len; i++) {
            const categoryValue = <string>category.values[i];
            const value = <number>dataValue.values[i];

            // Determine color and opacity
            let color = "gray"; // Default
            let opacity = 1.0;

            if (viewModel.metricColors.colors.some(c => c != null)) {
                const result = this.determineColorAndOpacity(value, viewModel.metricColors);
                color = result.color;
                opacity = result.opacity;
            } else {
                color = colorPalette.getColor(categoryValue).value;
            }

            // Extract tooltip data
            const tooltipData = [];

            tooltipData.push({ displayName: category.source.displayName, value: categoryValue });
            tooltipData.push({ displayName: dataValue.source.displayName, value: value != null ? value.toString() : "" });

            tooltipValues.forEach(tv => {
                const val = tv.values[i];
                tooltipData.push({
                    displayName: tv.source.displayName,
                    value: val != null ? val.toString() : ""
                });
            });

            // Create selection ID
            const selectionId = host.createSelectionIdBuilder()
                .withCategory(category, i)
                .createSelectionId();

            dataPoints.push({
                category: categoryValue,
                value: value,
                color: color,
                opacity: opacity, // Add opacity to data point
                selectionId: selectionId,
                highlighted: highlights ? highlights[i] !== null : false,
                tooltipData: tooltipData
            });
        }

        viewModel.dataPoints = dataPoints;
        viewModel.maxValue = maxValue;
        viewModel.minValue = minValue;

        return viewModel;
    }

    private getColor(fill: any): string {
        if (fill && fill.solid && fill.solid.color) {
            return fill.solid.color;
        }
        return null;
    }

    private determineColorAndOpacity(value: number, settings: MetricColorSettings): { color: string, opacity: number } {
        // Strict "Upper Bound" logic.
        // 1. Collect all valid threshold-color pairs (excluding fallback for now).
        // 2. Sort by threshold.
        // 3. Find first bucket where value <= threshold.

        const buckets: { t: number, c: string }[] = [];

        for (let i = 0; i < 5; i++) {
            const t = settings.thresholds[i];
            const c = settings.colors[i];

            if (t != null) {
                buckets.push({ t: t, c: c || "#CCCCCC" });
            }
        }

        // Sort buckets by threshold ascending
        buckets.sort((a, b) => a.t - b.t);

        // Find match
        for (const bucket of buckets) {
            if (value <= bucket.t) {
                return { color: bucket.c, opacity: 1.0 };
            }
        }

        // If here, value is > all thresholds. Use Fallback (Index 5).
        return { color: settings.colors[5] || "#CCCCCC", opacity: 1.0 };
    }

    public enumerateObjectInstances(options: powerbi.EnumerateVisualObjectInstancesOptions): powerbi.VisualObjectInstance[] | powerbi.VisualObjectInstanceEnumerationObject {
        const objectName = options.objectName;
        const objectEnumeration: powerbi.VisualObjectInstance[] = [];

        if (objectName === 'settings') {
            objectEnumeration.push({
                objectName: objectName,
                properties: {
                    svgUrl: this.currentSvgUrl
                },
                selector: null
            });
        }
        else if (objectName === 'metricColors') {
            const defaults = {
                thresholds: [null, null, null, null, null],
                colors: ["#CCCCCC", "#CCCCCC", "#CCCCCC", "#CCCCCC", "#CCCCCC", "#CCCCCC"]
            };

            const thresholds = this.metricColors.thresholds || defaults.thresholds;
            const colors = this.metricColors.colors || defaults.colors;

            // User request: Reorder to show Colour then Threshold
            objectEnumeration.push({
                objectName: objectName,
                properties: {
                    color1: { solid: { color: colors[0] || defaults.colors[0] } },
                    threshold1: thresholds[0] !== undefined ? thresholds[0] : null,

                    color2: { solid: { color: colors[1] || defaults.colors[1] } },
                    threshold2: thresholds[1] !== undefined ? thresholds[1] : null,

                    color3: { solid: { color: colors[2] || defaults.colors[2] } },
                    threshold3: thresholds[2] !== undefined ? thresholds[2] : null,

                    color4: { solid: { color: colors[3] || defaults.colors[3] } },
                    threshold4: thresholds[3] !== undefined ? thresholds[3] : null,

                    color5: { solid: { color: colors[4] || defaults.colors[4] } },
                    threshold5: thresholds[4] !== undefined ? thresholds[4] : null,

                    color6: { solid: { color: colors[5] || defaults.colors[5] } }
                },
                selector: null
            });
        }
        else if (objectName === 'dataLabels') {
            objectEnumeration.push({
                objectName: objectName,
                properties: {
                    show: this.dataLabelsSettings ? this.dataLabelsSettings.show : false, // Access stored settings
                    fontSize: this.dataLabelsSettings ? this.dataLabelsSettings.fontSize : 12
                },
                selector: null
            });
        }

        return objectEnumeration;
    }
}
