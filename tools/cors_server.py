from http.server import HTTPServer, SimpleHTTPRequestHandler
import sys

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        return super(CORSRequestHandler, self).end_headers()

if __name__ == '__main__':
    port = 8000
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
        
    server_address = ('', port)
    httpd = HTTPServer(server_address, CORSRequestHandler)
    print(f"Serving HTTP on 0.0.0.0 port {port} (http://localhost:{port}/) with CORS enabled...")
    httpd.serve_forever()
