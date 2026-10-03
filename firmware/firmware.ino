#include <Wire.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_ADXL345_U.h>
#include <Adafruit_VL53L0X.h>

// ---------- WiFi Credentials (update before flashing) ----------
const char* WIFI_SSID     = "Vatsalya";
const char* WIFI_PASSWORD = "1234567890";

// ---------- Pin Definitions ----------
const int MOSFET_PIN = 25;
const int HALL_PIN   = 34;
const int LASER_PIN  = 26;

// ---------- PWM config for electromagnet (ESP32 core 3.x LEDC API) ----------
const int PWM_FREQ       = 5000;
const int PWM_RESOLUTION = 8;
int electromagnetDuty    = 80;

// ---------- Sensor Objects ----------
Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);
Adafruit_VL53L0X tof = Adafruit_VL53L0X();

// ---------- Hall Sensor Baseline ----------
int hallBaseline = 0;
const int SAMPLE_COUNT = 50;
const int THRESHOLD = 30;

// ---------- HTTP Server ----------
WebServer server(80);

// ---------- Cached readings — updated every loop(), served via HTTP ----------
volatile int   g_hall          = 0;
volatile int   g_deviation     = 0;
volatile bool  g_metalDetected = false;
volatile float g_ax            = 0.0f;
volatile float g_ay            = 0.0f;
volatile float g_az            = 0.0f;
volatile int   g_distanceMM    = -1;
volatile unsigned long g_ts    = 0;

// ---------- HTTP: GET /sensors ----------
void handleSensors() {
  String json = "{";
  json += "\"hall\":"          + String(g_hall)                          + ",";
  json += "\"deviation\":"     + String(g_deviation)                     + ",";
  json += "\"metalDetected\":" + String(g_metalDetected ? "true":"false") + ",";
  json += "\"ax\":"            + String(g_ax, 4)                         + ",";
  json += "\"ay\":"            + String(g_ay, 4)                         + ",";
  json += "\"az\":"            + String(g_az, 4)                         + ",";
  json += "\"distanceMM\":"    + String(g_distanceMM)                    + ",";
  json += "\"timestamp\":"     + String(g_ts);
  json += "}";

  server.sendHeader("Access-Control-Allow-Origin",  "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Cache-Control",                "no-cache");
  server.send(200, "application/json", json);
}

void handleOptions() {
  server.sendHeader("Access-Control-Allow-Origin",  "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(204);
}

void handleRoot() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/plain",
    "NIOT Seafloor Sensor Node\nGET /sensors  -> JSON sensor data\n");
}

// ---------- Calibration ----------
int calibrateHallBaseline() {
  long sum = 0;
  for (int i = 0; i < SAMPLE_COUNT; i++) {
    sum += analogRead(HALL_PIN);
    delay(10);
  }
  return sum / SAMPLE_COUNT;
}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22); // SDA=21, SCL=22

  analogReadResolution(12);
  analogSetPinAttenuation(HALL_PIN, ADC_11db);

  pinMode(HALL_PIN, INPUT);
  pinMode(LASER_PIN, OUTPUT);
  digitalWrite(LASER_PIN, HIGH);

  ledcAttach(MOSFET_PIN, PWM_FREQ, PWM_RESOLUTION);
  ledcWrite(MOSFET_PIN, 0);

  // ---- Init ADXL345 ----
  if (!accel.begin()) {
    Serial.println("ADXL345 not detected. Check wiring!");
    while (1) delay(10);
  }
  accel.setRange(ADXL345_RANGE_4_G);
  Serial.println("ADXL345 initialized.");

  // ---- Init VL53L0X ----
  if (!tof.begin()) {
    Serial.println("VL53L0X not detected. Check wiring!");
    while (1) delay(10);
  }
  Serial.println("VL53L0X initialized.");

  // ---- Hall diagnostic ----
  delay(200);
  int hallOff = analogRead(HALL_PIN);
  Serial.print("Hall reading, electromagnet OFF: ");
  Serial.println(hallOff);
  if (hallOff >= 4090) {
    Serial.println("WARNING: Hall pinned at max even with electromagnet OFF.");
    Serial.println("-> Check sensor type / supply voltage into ESP32 ADC.");
  }

  ledcWrite(MOSFET_PIN, electromagnetDuty);
  delay(1000);
  int hallOn = analogRead(HALL_PIN);
  Serial.print("Hall reading, electromagnet ON (duty=");
  Serial.print(electromagnetDuty);
  Serial.print("): ");
  Serial.println(hallOn);
  if (hallOn >= 4090) {
    Serial.println("STILL SATURATED — lower electromagnetDuty or increase physical distance.");
  }

  hallBaseline = calibrateHallBaseline();
  Serial.print("Hall baseline (with electromagnet on): ");
  Serial.println(hallBaseline);

  // ---- WiFi ----
  Serial.print("Connecting to WiFi: ");
  Serial.print(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 15000) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected.");
    Serial.print("Dashboard: update vite.config.js ESP32_IP to: ");
    Serial.println(WiFi.localIP());
    Serial.print("Test endpoint: http://");
    Serial.print(WiFi.localIP());
    Serial.println("/sensors");
  } else {
    Serial.println("\nWiFi failed — running serial-only mode.");
  }

  // ---- HTTP routes ----
  server.on("/",        HTTP_GET,     handleRoot);
  server.on("/sensors", HTTP_GET,     handleSensors);
  server.on("/sensors", HTTP_OPTIONS, handleOptions);
  server.onNotFound([]() { server.send(404, "text/plain", "Not found"); });
  server.begin();
  Serial.println("HTTP server started.");
}

void loop() {
  server.handleClient();

  // ---------- Hall ----------
  int hallReading  = analogRead(HALL_PIN);
  int deviation    = abs(hallReading - hallBaseline);
  bool metalDetected = deviation > THRESHOLD;

  // ---------- ADXL345 ----------
  sensors_event_t event;
  accel.getEvent(&event);

  // ---------- VL53L0X ----------
  VL53L0X_RangingMeasurementData_t measure;
  tof.rangingTest(&measure, false);
  int distanceMM = (measure.RangeStatus != 4) ? (int)measure.RangeMilliMeter : -1;

  // ---------- Update globals (read by HTTP handler) ----------
  g_hall          = hallReading;
  g_deviation     = deviation;
  g_metalDetected = metalDetected;
  g_ax            = event.acceleration.x;
  g_ay            = event.acceleration.y;
  g_az            = event.acceleration.z;
  g_distanceMM    = distanceMM;
  g_ts            = millis();

  // ---------- Serial ----------
  Serial.print("Hall: ");    Serial.print(hallReading);
  Serial.print(" | Dev: ");  Serial.print(deviation);
  Serial.print(" | Metal: ");Serial.print(metalDetected ? "YES" : "no");
  Serial.print(" || Accel X:"); Serial.print(event.acceleration.x);
  Serial.print(" Y:"); Serial.print(event.acceleration.y);
  Serial.print(" Z:"); Serial.print(event.acceleration.z);
  Serial.print(" || Distance(mm): ");
  if (distanceMM >= 0) Serial.print(distanceMM);
  else                 Serial.print("out of range");
  Serial.println();

  delay(150);
}
