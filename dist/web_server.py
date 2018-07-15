from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import gzip
from socketserver import ThreadingMixIn
from urllib.parse import urlparse, parse_qs

class WebServer(BaseHTTPRequestHandler):
    def do_GET(self):
        rootdir = 'C:\wamp64\www\mws-restaurant\dist' #file location

        parts = urlparse(self.path)

        if parts.path == '/':
            f = open(rootdir + parts.path + 'index.html')
        else:
            f = open(rootdir + parts.path) #open requested file

        print(rootdir + parts.path)
        #send code 200 response
        self.send_response(200)

        #send header first
        if (parts.path.endswith('.html') or parts.path == '/'):
            self.send_header('Content-type','text/html; charset=utf-8')
            self.send_header('Content-Encoding','gzip')
            self.send_header('Transfer-Encoding','gzip')
        if parts.path.endswith('.txt'):
            self.send_header('Content-type','text/plain')
            self.send_header('Cache-Control','public, max-age=31536000')
            self.send_header('Content-Encoding','gzip')
            self.send_header('Transfer-Encoding','gzip')
        if parts.path.endswith('.webmanifest'):
            self.send_header('Content-type','text/plain')
            self.send_header('Cache-Control','public, max-age=31536000')
            self.send_header('Content-Encoding','gzip')
            self.send_header('Transfer-Encoding','gzip')
        if parts.path.endswith('.css'):
            self.send_header('Content-type','text/css')
            self.send_header('Cache-Control','public, max-age=31536000')
            self.send_header('Content-Encoding','gzip')
            self.send_header('Transfer-Encoding','gzip')
        if parts.path.endswith('.js'):
            self.send_header('Content-type','application/javascript')
            self.send_header('Content-Encoding','gzip')
            self.send_header('Transfer-Encoding','gzip')
            self.send_header('Cache-Control','public, max-age=31536000')
        if parts.path.endswith('.jpg'):
            self.send_header('Content-type','image/jpeg')
            self.send_header('Cache-Control','public, max-age=31536000')
        if parts.path.endswith('.png'):
            self.send_header('Content-type','image/png')
            self.send_header('Cache-Control','public, max-age=31536000')
        if parts.path.endswith('.gif'):
            self.send_header('Content-type','image/gif')
            self.send_header('Cache-Control','public, max-age=31536000')
        if parts.path.endswith('.webp'):
            self.send_header('Content-type','image/webp')
            self.send_header('Cache-Control','public, max-age=31536000')
        if parts.path.endswith('.ico'):
            self.send_header('Content-type','image/ico')
            self.send_header('Cache-Control','public, max-age=31536000')
        if (parts.path.endswith('.woff') or parts.path.endswith('.ttf') or parts.path.endswith('.svg') or parts.path.endswith('.eot')):
            self.send_header('Cache-Control','public, max-age=31536000')
            self.send_header('Content-Encoding','gzip')
            self.send_header('Transfer-Encoding','gzip')
        self.end_headers()

        #send file content to client
        if (parts.path.endswith('.jpg') or parts.path.endswith('.png') or parts.path.endswith('.gif') or parts.path.endswith('.webp') or parts.path.endswith('.ico')):
            img = open(rootdir + parts.path,'rb')
            self.wfile.write(img.read())
        else:
            s_out = gzip.compress(f.read().encode())
            self.wfile.write(s_out)
        f.close()
        return
      
class ThreadHTTPServer(ThreadingMixIn, HTTPServer):
    "This is an HTTPServer that supports thread-based concurrency."

if __name__ == '__main__':
    address = ('', 8000)
    httpd = ThreadHTTPServer(address, WebServer)
    httpd.serve_forever()

