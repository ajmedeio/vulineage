import sqlite3
from config import DATABASE_PATH

# Connect to the SQLite database
conn = sqlite3.connect(DATABASE_PATH)
cursor = conn.cursor()


# SQL query to get number of lineages
query_count = '''
SELECT 
  COUNT(lineage_id)
FROM 
  lineage_details ld
'''

cursor.execute(query_count)
lineages_count = cursor.fetchone()

print(f"Number of lineages: {lineages_count[0]}")

# SQL query to get all lineages
query = '''
SELECT 
  lineage_id,
  childs,
  parents
FROM 
  lineage_details ld
'''

cursor.execute(query)
lineages = cursor.fetchall()

for lineage in lineages:
    lineage_id = lineage[0]
    childs = lineage[1]
    parents = lineage[2]
    parents_list = eval(parents)
    childs_list = eval(childs)

    direct_children = []

    for child_lineage_id in childs_list:
        query_child = '''
        SELECT parents
        FROM lineage_details ld
        WHERE ld.lineage_id = ?
        '''
        cursor.execute(query_child, (child_lineage_id,))
        parents_of_child = cursor.fetchone()
        
        if parents_of_child is None:
            continue  # Skip if child lineage is not found
        
        parents_of_child = eval(parents_of_child[0])

        assert lineage_id in parents_of_child, f"Lineage ID {lineage_id} not found in parents of child lineage {child_lineage_id}"

        is_direct = True
        for other_parent in parents_of_child:
            if other_parent in childs_list and other_parent != lineage_id:
                is_direct = False
                break

        if is_direct:
            direct_children.append(child_lineage_id)

    children_set = set(direct_children)
    assert len(direct_children) == len(children_set), f"Duplicate child lineage IDs found for lineage ID {lineage_id}"

    # Convert the list to a string representation for storing in the database
    childs_str = str(direct_children)

    # Update the direct_children field in the database
    query_update = '''
    UPDATE lineage_details
    SET direct_children = ?
    WHERE lineage_id = ?
    '''
    cursor.execute(query_update, (childs_str, lineage_id))

# Commit all changes at once after all updates
conn.commit()

print("All direct_children fields updated successfully.")

# Close the database connection
conn.close()



