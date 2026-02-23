import * as d3 from "d3";
import { DataPoint } from "./types";
import powerbi from "powerbi-visuals-api";
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
// import { TooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";

export class D3Renderer {
    private svg: d3.Selection<SVGElement, unknown, null, undefined>;
    private rootGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
    private selectionManager: ISelectionManager;
    private host: IVisualHost;
    // private tooltipServiceWrapper: any; 

    constructor(selectionManager: ISelectionManager, host: IVisualHost) {
        this.selectionManager = selectionManager;
        this.host = host;
    }

    public setSVG(svg: d3.Selection<SVGElement, unknown, null, undefined>) {
        this.svg = svg;

        // Ensure we have a root group for zooming
        let g = this.svg.select<SVGGElement>("g.root-group");
        if (g.empty()) {
            // Move existing children into a new group
            const children = this.svg.selectAll(function () {
                return this.childNodes;
            }).nodes();

            g = this.svg.append("g").classed("root-group", true);
            children.forEach(child => g.node().appendChild(child as Node));
        }
        this.rootGroup = g;

        // Initialize Zoom
        const zoom = d3.zoom()
            .scaleExtent([0.1, 10]) // Zoom limits
            .on("zoom", (event) => {
                this.rootGroup.attr("transform", event.transform);
            });

        this.svg.call(zoom as any); // Cast to any to avoid strict d3 typing issues in scaffold
    }

    public update(dataPoints: DataPoint[], dataLabelSettings: { show: boolean, fontSize: number }): { totalElements: number, matchedCount: number, matchedIds: string[], allIds: string[] } {
        if (!this.svg) return { totalElements: 0, matchedCount: 0, matchedIds: [], allIds: [] };

        // Clear previous formatting
        this.rootGroup.selectAll("*")
            .filter(function () {
                // We only want to clear styles we applied. 
                // CRITICAL FIX: Ensure element has style property before trying to set it
                return this && typeof this['style'] !== 'undefined';
            })
            .style("fill", "#CCCCCC") // Default all to light grey
            .style("stroke", null)
            .style("stroke-width", null)
            .style("opacity", null)
            .style("fill-opacity", 1); // Default opacity

        console.log("D3Renderer: Updating with " + dataPoints.length + " data points.");

        // Get all IDs in SVG for debug
        const allIds = [];
        this.rootGroup.selectAll("[id]").each(function () {
            allIds.push(this.id);
        });

        const matchedIds = [];
        let matchedCount = 0;

        // Map data points to SVG elements by ID
        const hasHighlights = dataPoints.some(dp => dp.highlighted);

        // Map data points to SVG elements by ID
        dataPoints.forEach(dp => {
            // Find element by ID (using attribute selector to handle numbers/spaces)
            const element = this.rootGroup.select(`[id="${dp.category}"]`);

            if (!element.empty()) {
                const node = element.node() as any;
                // Only style if it looks like a shape (has style)
                // if (!node || !node.style) return;

                matchedCount++;
                matchedIds.push(dp.category);

                // Determine opacity based on highlight state AND data-driven opacity
                let opacity = 1.0;
                if (hasHighlights && !dp.highlighted) {
                    opacity = 0.5;
                }

                // Use data-driven opacity for fill-opacity if provided, otherwise default to 1
                // Multiply by highlight dimming if applicable
                const fillOpacity = (dp.opacity !== undefined ? dp.opacity : 1.0) * (hasHighlights && !dp.highlighted ? 0.5 : 1.0);

                element
                    .style("fill", dp.color)
                    .style("fill-opacity", fillOpacity)
                    .style("opacity", 1) // Keep element opacity 1 to allow stroke to be visible even if fill is transparent
                    .style("cursor", "pointer")
                    .style("pointer-events", "all")
                    .datum(dp) // Bind data
                    .on("click", (event, d: DataPoint) => {
                        // Stop propagation to prevent hitting the svg background click
                        event.stopPropagation();

                        console.log("Clicked element: " + d.category);
                        this.selectionManager.select(d.selectionId).then((ids: powerbi.visuals.ISelectionId[]) => {
                            this.syncSelectionState(ids);
                        });
                    });

                // Enhanced Tooltip (using title for simplicity, or native SVG title element)
                element.select("title").remove(); // Remove existing
                const title = element.append("title");

                // Format tooltip text
                if (dp.tooltipData && dp.tooltipData.length > 0) {
                    const tooltipText = dp.tooltipData.map(td => `${td.displayName}: ${td.value}`).join("\n");
                    title.text(tooltipText);
                } else {
                    title.text(`${dp.category}: ${dp.value}`);
                }
            }
        });

        // Click on background to clear selection
        this.svg.on("click", () => {
            // If we clicked the SVG background (not a shape), clear selection
            this.selectionManager.clear().then(() => {
                this.syncSelectionState([]);
            });
        });

        // Data Labels
        this.rootGroup.selectAll(".data-label").remove();

        if (dataLabelSettings.show) {
            dataPoints.forEach(dp => {
                // Find the element by ID
                const element = this.rootGroup.select(`[id="${dp.category}"]`);
                if (!element.empty()) {
                    try {
                        // Cast to SVGGraphicsElement to get BBox
                        const node = element.node() as SVGGraphicsElement;
                        const bbox = node.getBBox();

                        // Calculate center
                        const x = bbox.x + bbox.width / 2;
                        const y = bbox.y + bbox.height / 2;

                        // Append text
                        this.rootGroup.append("text")
                            .classed("data-label", true)
                            .attr("x", x)
                            .attr("y", y)
                            .attr("dy", "0.35em") // Vertical center align
                            .attr("text-anchor", "middle") // Horizontal center align
                            .style("font-size", `${dataLabelSettings.fontSize}px`)
                            .style("font-family", "sans-serif")
                            .style("fill", this.getContrastColor(dp.color))
                            .style("pointer-events", "none") // Pass through clicks
                            .text(`${dp.category} [${dp.value}]`);
                    } catch (e) {
                        // Ignore elements without bbox
                    }
                }
            });
        }

        return {
            totalElements: allIds.length,
            matchedCount: matchedCount,
            matchedIds: matchedIds,
            allIds: allIds
        };
    }

    // Helper for contrast
    private getContrastColor(hexColor: string): string {
        // Simple logic: if dark, return white. If light, return black.
        // Remove hash
        const color = d3.color(hexColor);
        if (!color) return "black";

        // Use luminance
        // 0.2126 * R + 0.7152 * G + 0.0722 * B
        const rgb = color.rgb();
        const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;

        return luminance > 0.5 ? "black" : "white";
    }

    private syncSelectionState(ids: powerbi.visuals.ISelectionId[]) {
        if (!this.rootGroup) return;

        // User Logic:
        // 1. If NO selection: 
        //    - Shapes with data -> Metric Color
        //    - Shapes without data -> #CCCCCC
        // 2. If Selection:
        //    - Selected shape -> Metric Color
        //    - All other shapes (bound or not) -> #CCCCCC

        const isSelectionActive = ids.length > 0;

        this.rootGroup.selectAll("*").each(function () {
            // Safe check
            if (!this || !this['style']) return;

            const element = d3.select(this);
            const d = element.datum() as DataPoint;

            // Check if this specific element is selected
            let isSelected = false;
            if (isSelectionActive && d && d.selectionId) {
                isSelected = ids.some(id => id.equals(d.selectionId));
            }

            // Determine Target State
            if (!isSelectionActive) {
                // CASE 1: No Selection
                if (d) {
                    // Has Data -> Show Color
                    element.style("fill", d.color);
                    element.style("fill-opacity", d.opacity !== undefined ? d.opacity : 1.0);
                    element.style("stroke", null);
                    element.style("stroke-width", null);
                    element.style("opacity", 1);
                } else {
                    // No Data -> #CCCCCC
                    element.style("fill", "#CCCCCC");
                    element.style("fill-opacity", 1);
                    element.style("stroke", null);
                    element.style("stroke-width", null);
                    element.style("opacity", 1);
                }
            } else {
                // CASE 2: Selection Active
                if (isSelected) {
                    // Selected -> Show Color & Highlight
                    element.style("fill", d.color);
                    element.style("fill-opacity", d.opacity !== undefined ? d.opacity : 1.0);
                    element.style("stroke", "black");
                    element.style("stroke-width", "2px");
                    element.style("opacity", 1);
                } else {
                    // Not Selected -> Turn GREY (Hide color)
                    element.style("fill", "#CCCCCC");
                    element.style("fill-opacity", 1);
                    element.style("stroke", null);
                    element.style("stroke-width", null);
                    // Optional: maybe dim it slightly? User said "light grey". 
                    // #CCCCCC is already light grey. Let's keep opacity 1 for clean look.
                    element.style("opacity", 1);
                }
            }
        });
    }
}
