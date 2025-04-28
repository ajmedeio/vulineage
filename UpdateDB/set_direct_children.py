import sqlite3
from config import DATABASE_PATH

conn = sqlite3.connect(DATABASE_PATH)
cursor = conn.cursor()

# SQL query to get number of lineages
query_count = '''
SELECT 
 count(lineage_id)
FROM 
  lineage_details ld
'''

cursor.execute(query_count)
lineages_count=cursor.fetchone()

print(f"Number of lineages: {lineages_count[0]}")

# SQL query to get lineages
query = '''
SELECT 
  lineage_id,
  childs,
  parents
FROM 
  lineage_details ld
'''


cursor.execute(query)
lineages=cursor.fetchall()

for lineage in lineages:
    lineage_id = lineage[0]
    childs = lineage[1]
    parents=lineage[2]
    parents_list= eval(parents)
    
    childs_list = eval(childs)
    direct_children=[]
    for child_lineage_id in childs_list:
        # SQL query to get number of parents of each child
        query_child = '''
        SELECT parents, first_instance_commit_date
        FROM lineage_details ld
        WHERE ld.lineage_id= ?
        '''
        cursor.execute(query_child, (child_lineage_id,))
        parents_of_child,start_date = cursor.fetchone()
        parents_of_child = eval(parents_of_child)
        
        assert lineage_id in parents_of_child, f"Lineage ID {lineage_id} not found in parents of child lineage {child_lineage_id}" 

       
        is_direct = True
        for other_parent in parents_of_child:
            if other_parent  in childs_list and other_parent != lineage_id:
                is_direct = False
                break
        if is_direct:
            direct_children.append((child_lineage_id, start_date))
            
  
    # Sort the direct children by their first instance commit date
    direct_children.sort(key=lambda x: x[1])
    # Extract only the lineage IDs from the sorted list
    direct_children = [child[0] for child in direct_children]     
             
    children_set=set(direct_children)        
    assert len(direct_children) == len(children_set), f"Duplicate child lineage IDs found for lineage ID {lineage_id}"
          
# Add the direct children to lineage_details table 
    query_update = '''
    UPDATE lineage_details
    SET direct_children = ?
    WHERE lineage_id = ?
    '''
    
    # Convert the list to a string representation
    childs_str = str(direct_children)
    
    # Execute the update query
    cursor.execute(query_update, (childs_str, lineage_id))
    
    # Commit the changes
    conn.commit()
    
# Close the database connection
conn.close()

print("direct_children computed and updated successfully.")