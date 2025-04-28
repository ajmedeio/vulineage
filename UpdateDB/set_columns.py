import sqlite3
from config import DATABASE_PATH



# Connect to the SQLite database
conn = sqlite3.connect(DATABASE_PATH)
cursor = conn.cursor()

# Create a column named direct_children in the lineage_details table 
# with the following command, or run the script below:
# ALTER TABLE lineage_details
# ADD COLUMN direct_children TEXT DEFAULT '[]';

#  Add the column
try:
    cursor.execute('''
    ALTER TABLE lineage_details
    ADD COLUMN direct_children TEXT DEFAULT '[]';
    ''')
    conn.commit()
    print("Column 'direct_children' added successfully.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("Column 'direct_children' already exists.")
    else:
        raise e
    
  
# Add a column named subtree in the lineage_details table with the following command, or run the script below:
# ALTER TABLE lineage_details
# ADD COLUMN subtree TEXT DEFAULT '[]';


# Add the column
try:
    cursor.execute('''
    ALTER TABLE lineage_details
    ADD COLUMN subtree TEXT DEFAULT '[]';
    ''')
    conn.commit()
    print("Column 'subtree' added successfully.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("Column 'subtree' already exists.")
    else:
        raise e

  
    

conn.close()
