import http.server
import socketserver

PORT = 9631
DIRECTORY = "/public"
MAX_BODY_SIZE = 256 * 1024  # 256 KB

def db_read(query):
    import sqlite3
    
    cursor = db_connection.cursor()
    cursor.execute(query)
    rows = cursor.fetchall()

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def _set_response(self, status_code=200, content_type='application/json'):
        self.send_response(status_code)
        self.send_header('Content-type', content_type)
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        if content_length > MAX_BODY_SIZE:
            self._set_response(413, 'application/json')  # Payload Too Large
            self.wfile.write(json.dumps({"error": "Request body too large"}).encode('utf-8'))
            return
        
        post_data = self.rfile.read(content_length)
        try:
            body = json.loads(post_data.decode('utf-8'))
            query = body["query"]
            rows = db_read(query)
            response_data = rows
            self._set_response()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))

        except json.JSONDecodeError:
            self._set_response(400, 'application/json')
            self.wfile.write(json.dumps({"error": "Invalid JSON"}).encode('utf-8'))
        except Exception as e:
            self._set_response(500, 'application/json')
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
    
    def do_GET(self):
        self._set_response(405, 'application/json') # Method Not Allowed
        self.wfile.write(json.dumps({"error": "Method GET not allowed"}).encode('utf-8'))

    def do_PUT(self):
        self._set_response(405, 'application/json')
        self.wfile.write(json.dumps({"error": "Method PUT not allowed"}).encode('utf-8'))

    def do_DELETE(self):
        self._set_response(405, 'application/json')
        self.wfile.write(json.dumps({"error": "Method DELETE not allowed"}).encode('utf-8'))

    def do_HEAD(self):
        self._set_response(405, 'application/json')
        self.wfile.write(json.dumps({"error": "Method HEAD not allowed"}).encode('utf-8'))

    def do_OPTIONS(self):
        self._set_response(405, 'application/json')
        self.wfile.write(json.dumps({"error": "Method OPTIONS not allowed"}).encode('utf-8'))

    def do_CONNECT(self):
        self._set_response(405, 'application/json')
        self.wfile.write(json.dumps({"error": "Method CONNECT not allowed"}).encode('utf-8'))

    def do_TRACE(self):
        self._set_response(405, 'application/json')
        self.wfile.write(json.dumps({"error": "Method TRACE not allowed"}).encode('utf-8'))

    def do_PATCH(self):
        self._set_response(405, 'application/json')
        self.wfile.write(json.dumps({"error": "Method PATCH not allowed"}).encode('utf-8'))

    def end_headers(self):
        #self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        #self.send_header("Pragma", "no-cache")
        #self.send_header("Expires", "0")
        super().end_headers()

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print("Serving at port", PORT)
    db_connection = sqlite3.connect('/database/database.db')
    httpd.serve_forever()
