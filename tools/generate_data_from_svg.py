import urllib.parse
import xml.etree.ElementTree as ET
import csv
import random
import os

# Paths
input_file = r"C:\Users\s2mo\Documents\MyApps\SynopticPanel\sample_data\drawing.txt"
output_file = r"C:\Users\s2mo\Documents\MyApps\SynopticPanel\sample_data\generated_sample_data.csv"

def generate_data():
    if not os.path.exists(input_file):
        print(f"Error: Input file found at {input_file}")
        return

    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            
        # Extract SVG content
        if content.startswith("data:image/svg+xml;utf8,"):
            encoded_svg = content.split(",", 1)[1]
            svg_content = urllib.parse.unquote(encoded_svg)
        else:
            # Assume it might be raw SVG or handle other prefixes if needed
            # For now, let's try to unquote the whole thing if it doesn't start with the prefix,
            # or just assume it is the content.
            # But the prompt said it's currently encoded.
            svg_content = urllib.parse.unquote(content)

        # Parse XML
        root = ET.fromstring(svg_content)
        
        # Namespace handling might be needed, but usually exact match on 'id' works without it for simple parsing
        # However, ElementTree tags often include {namespace}tag.
        
        ids = []
        
        # Iterate over all elements
        for elem in root.iter():
            if 'id' in elem.attrib:
                id_val = elem.attrib['id']
                
                # Get tag name without namespace
                tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
                
                # Filter out non-visual tags and definitions
                if tag in ['defs', 'linearGradient', 'radialGradient', 'stop', 'filter', 'mask', 'pattern', 'marker', 'clipPath', 'symbol', 'style', 'sodipodi:namedview', 'metadata']:
                    continue
                
                # Filter out specific IDs that are likely metadata
                if any(x in id_val for x in ['sodipodi', 'inkscape', 'namedview', 'SVGRoot']):
                    continue
                    
                ids.append(id_val)
        
        # Generator CSV
        print(f"Found {len(ids)} IDs: {ids}")
        
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['Category', 'Measure'])
            for id_val in ids:
                writer.writerow([id_val, random.randint(10, 100)])
                
        print(f"Successfully generated data at {output_file}")

    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    generate_data()
