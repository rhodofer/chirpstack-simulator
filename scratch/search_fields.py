with open(r"C:\Projects\falt-workspace\chirpstack-simulator\internal\api\frontend\app.js", "r", encoding="utf-8") as f:
    content = f.read()

idx = content.find('var formFields')
if idx != -1:
    safe_output = content[idx:idx+800].encode('ascii', errors='replace').decode('ascii')
    print(safe_output)
else:
    print("formFields not found")
