import os
for root, dirs, files in os.walk(r"C:\Projects\falt-workspace\chirpstack-simulator\internal"):
    for file in files:
        if file.endswith(".go"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            if "tenant_id" in content.lower() and "struct" in content.lower():
                print(f"File: {path}")
                # print the struct definition
                for idx, line in enumerate(content.splitlines()):
                    if "struct" in line:
                        print(f"  Line {idx+1}: {line.strip()[:100]}")
