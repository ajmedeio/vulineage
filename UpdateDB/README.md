## Updating the database for lineage subtree and direct children

1. Change the database path on config.py

2. Run set_columns to create 2 columns on lineage_details table: direct_children and subtree with default value '[]' 

`python set_columns.py`

3. Run set_direct_children 

`python set_direct_children.py`

4. Run set_subtree 

`python set_subtree.py`

The order of the scripts is important as direct_children column should be updated before subtree

