import * as d3 from "d3";
import { DataPoint } from "./types";
import powerbi from "powerbi-visuals-api";
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import { TooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";

export class D3Renderer {
    private svg: d3.Selection<SVGElement, unknown, null, undefined>;
    private selectionManager: ISelectionManager;
    private host: IVisualHost;
    private tooltipServiceWrapper: any; // Using any for simplicity in scaffold, ideally typed

    constructor(selectionManager: ISelectionManager, host: IVisualHost) {
        this.selectionManager = selectionManager;
        this.host = host;
        // Tooltip wrapper would be initialized here if using utils
    }

    public setSVG(svg: d3.Selection<SVGElement, unknown, null, undefined>) {
        this.svg = svg;
    }

    public update(dataPoints: DataPoint[]) {
        if (!this.svg) return;

        // Clear previous formatting
        this.svg.selectAll("*")
            .style("fill", null)
            .style("stroke", null)
            .style("stroke-width", null)
            .style("opacity", null);

        // Map data points to SVG elements by ID
        dataPoints.forEach(dp => {
            // Find element by ID (assuming Category matches SVG ID)
            const element = this.svg.select(`#${dp.category}`);

            if (!element.empty()) {
                element
                    .style("fill", dp.color)
                    .style("cursor", "pointer")
                    .datum(dp) // Bind data
                    .on("click", (event, d: DataPoint) => {
                        this.selectionManager.select(d.selectionId).then((ids: powerbi.visuals.ISelectionId[]) => {
                            this.syncSelectionState(ids);
                        });
                        event.stopPropagation();
                    });

                // Add basic tooltip title (native browser tooltip)
                element.append("title").text(`${dp.category}: ${dp.value}`);
            }
        });

        // Click on background to clear selection
        this.svg.on("click", () => {
            this.selectionManager.clear().then(() => {
                this.syncSelectionState([]);
            });
        });
    }

    private syncSelectionState(ids: powerbi.visuals.ISelectionId[]) {
        if (!this.svg) return;

        if (ids.length === 0) {
            this.svg.selectAll("*").style("opacity", 1);
            return;
        }

        // Dim unselected elements
        this.svg.selectAll("*").each(function () {
            const element = d3.select(this);
            const d = element.datum() as DataPoint;
            if (d && d.selectionId) {
                const isSelected = ids.some(id => id.equals(d.selectionId));
                element.style("opacity", isSelected ? 1 : 0.4);
            }
        });
    }
}
