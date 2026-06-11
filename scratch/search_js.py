with open("internal/api/frontend/app.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "btn-save-general-settings" in line or "btnSaveGeneralSettings" in line:
        print(f"Line {i+1}: {line.strip()}")
