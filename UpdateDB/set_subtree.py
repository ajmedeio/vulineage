
import sqlite3
from config import DATABASE_PATH

conn = sqlite3.connect(DATABASE_PATH)
cursor = conn.cursor()


# Step 1: Load direct_children for all lineage_ids into memory
cursor.execute('''
SELECT 
  lineage_id,
  direct_children,
  childs
FROM 
  lineage_details
''')
lineages = cursor.fetchall()

# Build direct_children lookup
direct_children_map = {}
for lineage_id, direct_children,_ in lineages:
    direct_children_map[lineage_id] = eval(direct_children)
  

# Function to recursively get full subtree using only direct children
def get_subtree_from_direct(lineage_id):
    subtree = []
    for child_id in direct_children_map.get(lineage_id):
        subtree.append(child_id)
        subtree.append(get_subtree_from_direct(child_id))  # Recursive walk
    return subtree
  
def flatten_children(subtree):
    flat_list = []
    for item in subtree:
        if isinstance(item, list):
            flat_list.extend(flatten_children(item))
        else:
            flat_list.append(item)
    return flat_list

    

# Prepare batch updates
updates = []
errors=0
for lineage_id, _ ,childs in lineages:
    children_list= eval(childs)
    
    subtree = get_subtree_from_direct(lineage_id)
    # print(f"Subtree for lineage ID {lineage_id}: {subtree}")
    
    flatten_children_list= flatten_children(subtree)
    
    assert set(flatten_children_list) == set(children_list), \
    f"Flattened subtree does not match original subtree for lineage ID {lineage_id} \n, \
    expected {sorted(children_list)} \n, got {sorted(set(flatten_children_list))} \n"
    
    updates.append((str(subtree), lineage_id))

#Step 2: Update the subtree column
query_update = '''
UPDATE lineage_details
SET subtree = ?
WHERE lineage_id = ?
'''

cursor.executemany(query_update, updates)
conn.commit()

print("subtree computed and updated successfully.")

conn.close()
