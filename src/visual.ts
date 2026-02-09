import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import * as d3 from "d3";
import { loadSVG } from "./svgLoader";
import { D3Renderer } from "./d3Renderer";
import { ViewModel, DataPoint, VisualSettings } from "./types";

export class Visual implements IVisual {
    private target: HTMLElement;
    private renderer: D3Renderer;
    private currentSvgUrl: string = "";
    private host: powerbi.extensibility.visual.IVisualHost;
    private selectionManager: powerbi.extensibility.ISelectionManager;

    constructor(options: VisualConstructorOptions) {
        this.target = options.element;
        this.host = options.host;
        this.selectionManager = this.host.createSelectionManager();
        this.renderer = new D3Renderer(this.selectionManager, this.host);
    }

    public update(options: VisualUpdateOptions) {
        const viewModel = this.visualTransform(options, this.host);

        if (!viewModel) return;

        // Load SVG if URL changed
        if (this.currentSvgUrl !== viewModel.svgUrl) {
            this.currentSvgUrl = viewModel.svgUrl;
            if (this.currentSvgUrl) {
                loadSVG(this.currentSvgUrl, this.target).then(svg => {
                    if (svg) {
                        this.renderer.setSVG(svg);
                        this.renderer.update(viewModel.dataPoints);
                    }
                });
            } else {
                this.target.innerHTML = "<div>Please provide an SVG URL in the format settings.</div>";
            }
        } else {
            // Check if SVG is already loaded before updating data
            // In a real scenario, we might want to wait for the promise if it's pending
            // For this scaffold, we assume if URL matches, SVG is ready or loading
            const svg = d3.select(this.target).select("svg");
            if (!svg.empty()) {
                // Re-select the svg in case the renderer lost reference (unlikely but safe)
                this.renderer.setSVG(svg as d3.Selection<SVGElement, unknown, null, undefined>);
                this.renderer.update(viewModel.dataPoints);
            }
        }
    }

    private visualTransform(options: VisualUpdateOptions, host: powerbi.extensibility.visual.IVisualHost): ViewModel {
        let dataViews = options.dataViews;
        if (!dataViews || !dataViews[0] || !dataViews[0].categorical || !dataViews[0].categorical.categories || !dataViews[0].categorical.values) {
            return null;
        }

        const categorical = dataViews[0].categorical;
        const category = categorical.categories[0];
        const dataValue = categorical.values[0];

        let dataPoints: DataPoint[] = [];
        let maxValue: number = <number>dataValue.maxLocal;
        let minValue: number = <number>dataValue.minLocal;

        const colorPalette: powerbi.extensibility.IColorPalette = host.colorPalette;

        for (let i = 0, len = Math.max(category.values.length, dataValue.values.length); i < len; i++) {
            const categoryValue = <string>category.values[i];
            const value = <number>dataValue.values[i];

            // Simple color scale logic - extended in real app
            const color = colorPalette.getColor(categoryValue).value;

            // Create selection ID
            const selectionId = host.createSelectionIdBuilder()
                .withCategory(category, i)
                .createSelectionId();

            dataPoints.push({
                category: categoryValue,
                value: value,
                color: color,
                selectionId: selectionId
            });
        }

        const settings: VisualSettings = {
            svgUrl: ""
        };

        // Extract settings
        if (dataViews[0].metadata && dataViews[0].metadata.objects) {
            const objects = dataViews[0].metadata.objects;
            if (objects["settings"] && objects["settings"]["svgUrl"]) {
                settings.svgUrl = <string>objects["settings"]["svgUrl"];
            }
        }

        return {
            dataPoints: dataPoints,
            maxValue: maxValue,
            minValue: minValue,
            svgUrl: settings.svgUrl
        };
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

        return objectEnumeration;
    }
}
