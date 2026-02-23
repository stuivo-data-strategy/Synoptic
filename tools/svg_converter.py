import urllib.parse
import sys
import os

try:
    import pyperclip
except ImportError:
    pyperclip = None

import re

def convert_svg_to_data_uri(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            svg_content = f.read()
        
        # CLEANUP: Remove XML declaration (<?xml ... ?>) and comments (<!-- ... -->)
        # This is important for Inkscape SVGs to work cleanly in Power BI
        svg_content = re.sub(r'<\?xml.*?\?>', '', svg_content)
        svg_content = re.sub(r'<!--[\s\S]*?-->', '', svg_content)
        svg_content = svg_content.strip()

        # Power BI specific encoding requirements
        # We use quote() but need to make sure certain characters are handled specifically for Power BI compatibility if needed
        # Generally, minimal url encoding + specific replacements for readability/compatibility is good.
        # However, standard quote with safe chars is usually robust.
        
        encoded_content = urllib.parse.quote(svg_content)
        
        # Power BI Data URI format
        data_uri = f"data:image/svg+xml;utf8,{encoded_content}"
        
        return data_uri
    except Exception as e:
        print(f"Error reading file: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python svg_converter.py <path_to_svg_file>")
        print("Example: python svg_converter.py map.svg")
        sys.exit(1)

    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        sys.exit(1)

    uri = convert_svg_to_data_uri(file_path)
    
    if uri:
        print("\n--- Power BI Data URI ---")
        print(uri)
        print("\n-------------------------")
        
        if pyperclip:
            try:
                pyperclip.copy(uri)
                print("\n[SUCCESS] Data URI copied to clipboard!")
            except Exception as e:
                 print(f"\n[WARNING] Could not copy to clipboard automatically: {e}")
        else:
            print("\n[INFO] Install 'pyperclip' to enable auto-copying: pip install pyperclip")
            print("       Otherwise, copy the string above manually.")
