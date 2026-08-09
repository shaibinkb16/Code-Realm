import urllib.request
import os
import json

AVATAR_DIR = r"e:\Dream\public\avatars"
os.makedirs(AVATAR_DIR, exist_ok=True)

# Clean, simple initial-based avatars
avatars = {
    "cipherlord": "Cipher Lord",
    "syntaxqueen": "Syntax Queen",
    "byteninja": "Byte Ninja",
    "aethercoder": "Aether Coder",
    "pythoneerx": "Pythoneer X"
}

import urllib.parse

for filename, name in avatars.items():
    safe_name = urllib.parse.quote(name)
    url = f"https://api.dicebear.com/7.x/initials/svg?seed={safe_name}&backgroundColor=1a1b26&textColor=a9b1d6&fontSize=40&fontWeight=700"
    filepath = os.path.join(AVATAR_DIR, f"{filename}.svg")
    try:
        # We need a user agent
        req = urllib.request.Request(
            url, 
            data=None, 
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        )
        with urllib.request.urlopen(req) as response:
            with open(filepath, 'wb') as f:
                f.write(response.read())
        print(f"Downloaded {filename}.svg")
    except Exception as e:
        print(f"Failed to download {filename}: {e}")

print("Done.")
