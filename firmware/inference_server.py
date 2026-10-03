#!/usr/bin/env python3
"""
Mock inference server for NIOT Seafloor Survey Dashboard.
Serves: nodule coverage %, avg nodule size (cm), sulphide-anomaly flag.

Replace get_inference_data() with real ML model calls / log-file parsing.

Run:  python inference_server.py
URL:  http://localhost:5001/inference  (proxied via /api/inference in Vite)
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json, random, math, time

_t0 = time.time()

def get_inference_data():
    """
    Swap this body with actual inference.
    Return a dict with keys: nodulesPercent, avgNoduleSize, sulphideAnomaly.
    """
    t = time.time() - _t0
    nodules_pct = max(0.0, min(100.0,
        30 + 18 * math.sin(t / 60) + random.gauss(0, 0.8)
    ))
    avg_size_cm = max(0.5, min(25.0,
        8.0 + 2.5 * math.sin(t / 90) + random.gauss(0, 0.15)
    ))
    sulphide = random.random() < 0.03   # ~3% chance each sample

    return {
        "nodulesPercent":    round(nodules_pct, 2),
        "avgNoduleSize":     round(avg_size_cm, 2),
        "sulphideAnomaly":   sulphide,
        "inferenceTimestamp": round(t, 2),
    }


class _Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/inference":
            body = json.dumps(get_inference_data()).encode()
            self.send_response(200)
            self.send_header("Content-Type",  "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, fmt, *args):
        pass   # silence per-request console spam


if __name__ == "__main__":
    srv = HTTPServer(("localhost", 5001), _Handler)
    print("Inference mock server  →  http://localhost:5001/inference")
    print("Press Ctrl+C to stop.")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
