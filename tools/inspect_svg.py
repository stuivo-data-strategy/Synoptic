import urllib.parse
import os

file_path = r"C:\Users\s2mo\Documents\MyApps\SynopticPanel\sample_data\output.txt"

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    exit(1)

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Check start
print(f"Start of file (first 50 chars): {content[:50]}")

# Decode
prefix = "data:image/svg+xml;utf8,"
if content.startswith(prefix):
    encoded_payload = content[len(prefix):]
    try:
        decoded = urllib.parse.unquote(encoded_payload)
        print(f"Decoded length: {len(decoded)}")
        print(f"Decoded tail (last 200 chars): {decoded[-200:]}")
        
        # Check for </defs>
        defs_end_idx = decoded.find("</defs>")
        if defs_end_idx != -1:
            print(f"Found </defs> at index {defs_end_idx}")
            body_content = decoded[defs_end_idx:]
            
            # Find all IDs in the body
            import re
            # Regex to find id="value"
            ids = re.findall(r'id=["\']([^"\']+)["\']', body_content)
            
            print(f"Number of IDs found in body (after </defs>): {len(ids)}")
            if len(ids) > 0:
                print(f"First 20 IDs: {ids[:20]}")
                # Check if they look like meaningful data keys or generated garbage
            else:
                print("WARNING: No IDs found in the main body. Data binding may not be possible.")
        else:
            print("</defs> NOT found in decoded content")
        
    except Exception as e:
        print(f"Error decoding: {e}")
else:
    print("Does not start with expected prefix")
