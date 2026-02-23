import * as d3 from "d3";

export async function loadSVG(input: string, target: HTMLElement): Promise<d3.Selection<SVGElement, unknown, null, undefined>> {
    try {
        let svgContent: string;
        const trimmedInput = input.trim();

        // Check if input is raw SVG or Data URI
        if (trimmedInput.startsWith("<") || trimmedInput.startsWith("data:image/svg+xml")) {
            if (trimmedInput.startsWith("data:image/svg+xml")) {
                // Handle Data URI
                const base64Index = trimmedInput.indexOf("base64,");
                if (base64Index !== -1) {
                    svgContent = atob(trimmedInput.substring(base64Index + 7));
                } else {
                    // Url encoded
                    svgContent = decodeURIComponent(trimmedInput.replace("data:image/svg+xml;utf8,", "").replace("data:image/svg+xml,", ""));
                }
            } else {
                // Raw SVG
                svgContent = trimmedInput;
            }
        } else {
            // Assume URL
            const response = await fetch(trimmedInput);
            if (!response.ok) {
                throw new Error(`Failed to load SVG: ${response.statusText}`);
            }
            svgContent = await response.text();
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, "image/svg+xml");
        const svg = doc.documentElement;

        if (svg.tagName.toLowerCase() !== "svg") {
            // Check for parser errors
            const parserError = doc.querySelector("parsererror");
            if (parserError) {
                throw new Error("XML Parsing Error: " + parserError.textContent);
            }
            throw new Error("Invalid SVG content");
        }

        // Clear existing
        while (target.firstChild) {
            target.removeChild(target.firstChild);
        }
        target.appendChild(svg);

        const d3Svg = d3.select(svg) as d3.Selection<SVGElement, unknown, null, undefined>;

        // Ensure SVG scales to fit container
        d3Svg.attr("width", "100%")
            .attr("height", "100%");

        return d3Svg;
    } catch (error) {
        console.error("Error loading SVG:", error);
        // Clear existing
        while (target.firstChild) {
            target.removeChild(target.firstChild);
        }
        const div = document.createElement("div");
        div.className = "error";
        div.textContent = `Error loading SVG: ${error.message}`;
        target.appendChild(div);
        return null;
    }
}
