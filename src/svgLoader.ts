import * as d3 from "d3";

export async function loadSVG(url: string, target: HTMLElement): Promise<d3.Selection<SVGElement, unknown, null, undefined>> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load SVG: ${response.statusText}`);
        }
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "image/svg+xml");
        const svg = doc.documentElement;

        if (svg.tagName.toLowerCase() !== "svg") {
            throw new Error("Invalid SVG content");
        }

        target.innerHTML = "";
        target.appendChild(svg);

        const d3Svg = d3.select(svg) as d3.Selection<SVGElement, unknown, null, undefined>;

        // Ensure SVG scales to fit container
        d3Svg.attr("width", "100%")
            .attr("height", "100%");

        return d3Svg;
    } catch (error) {
        console.error("Error loading SVG:", error);
        target.innerHTML = `<div class="error">Error loading SVG: ${error.message}</div>`;
        return null;
    }
}
