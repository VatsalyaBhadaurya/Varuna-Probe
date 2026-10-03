# Varuna-Probe

VARUNA — an autonomous seafloor mineral-survey probe and its mission dashboard,
built for SIH-2026 (Ministry of Earth Sciences / NIOT).

## Repository layout

```
firmware/
├── firmware.ino           # ESP32 probe firmware (Hall, ADXL345 accel, VL53L0X ToF)
├── inference_server.py    # On-shore inference server (nodule / deposit estimates)
├── Powerful Jaiks.stl     # Probe mechanical model
└── dashboard/             # Web mission dashboard (Vite + React + three.js)  ← deployed site
```

## Dashboard

A real-time mission dashboard showing the probe's 3-D attitude and altitude over an
animated seabed (polymetallic nodules, hydrothermal sulphides, cobalt-rich crusts and
rare-earth-element-bearing sediments), live sensor charts, and a deployment world-map inset.

```bash
cd firmware/dashboard
npm install
npm run dev      # local development
npm run build    # production build -> dist/
```
