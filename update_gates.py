import json
import os

gates = [
    "logic-nand-gate",
    "logic-nor-gate",
    "logic-or-gate",
    "logic-xnor-gate",
    "logic-xor-gate",
]

for gate in gates:
    manifest_path = f"src/components/{gate}/manifest.json"
    with open(manifest_path, "r") as f:
        data = json.load(f)
    
    data["w"] = 75
    data["h"] = 60
    
    for pin in data["pins"]:
        if pin["id"] == "IN1":
            pin["x"] = 0
            pin["y"] = 15
        elif pin["id"] == "IN2":
            pin["x"] = 0
            pin["y"] = 45
        elif pin["id"] == "OUT":
            pin["x"] = 75
            pin["y"] = 30
            
    with open(manifest_path, "w") as f:
        json.dump(data, f, indent=4)

# For NOT gate
not_manifest = "src/components/logic-not-gate/manifest.json"
with open(not_manifest, "r") as f:
    data = json.load(f)
data["w"] = 60
data["h"] = 30
for pin in data["pins"]:
    if pin["id"] == "IN":
        pin["x"] = 0
        pin["y"] = 15
    elif pin["id"] == "OUT":
        pin["x"] = 60
        pin["y"] = 15
with open(not_manifest, "w") as f:
    json.dump(data, f, indent=4)

print("Updated manifests successfully!")
