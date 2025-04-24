import json
import csv

# Load JSON data
with open('input.json') as f:
    data = json.load(f)

# Open CSV file for writing
with open('output.csv', 'w', newline='') as f:
    writer = csv.writer(f)

    # Write header
    headers = data[0].keys()  # Extract column names
    writer.writerow(headers)

    # Write rows
    for row in data:
        writer.writerow(row.values())

print("CSV file saved successfully!")