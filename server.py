import http.server
import socketserver

PORT = 9631
DIRECTORY = "/public"

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        #self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        #self.send_header("Pragma", "no-cache")
        #self.send_header("Expires", "0")
        super().end_headers()

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print("Serving at port", PORT)
    httpd.serve_forever()

def main():
    import sqlite3
  
    # Connect to a database (or create it if it doesn't exist)
    conn = sqlite3.connect('/database/database.db')
    
    # Create a cursor object to execute SQL commands
    cursor = conn.cursor()
    
    # Create a table
    cursor.execute('''select * from''')
    
    # Insert data into the table
    cursor.execute("INSERT INTO students (name, age, email) VALUES (?, ?, ?)", ('Alice', 20, 'alice@example.com'))
    cursor.execute("INSERT INTO students (name, age, email) VALUES (?, ?, ?)", ('Bob', 22, 'bob@example.com'))
    
    # Commit the changes
    conn.commit()
    
    # Retrieve data from the table
    cursor.execute("SELECT * FROM students")
    rows = cursor.fetchall()
    for row in rows:
        print(row)
    
    # Close the connection
    conn.close()
