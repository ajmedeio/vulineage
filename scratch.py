import json

if __name__ == "__main__":
    # Read the JSON file
    with open("out2.json", "r") as file:
        data = json.load(file)

    # Print the data to the console
    print(json.dumps(data, indent=4))

    # group the data by lineage_id
    grouped_data = {}
    for item in data:
        lineage_id = item.get("lineage_id")
        if lineage_id not in grouped_data:
            grouped_data[lineage_id] = []
        grouped_data[lineage_id].append(item)

    # Write the data to a new JSON file
    with open("output.json", "w") as file:
        json.dump(grouped_data, file, indent=4)
    # Print a message indicating that the data has been written
    print("Data has been written to output.json")
    # Print the number of items in the data