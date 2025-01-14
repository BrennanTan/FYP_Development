#include "WiFi.h"
#include "HTTPClient.h"
#include <ArduinoJson.h>

#define RE 4
#define RXD2 17
#define TXD2 16

WiFiClient client;

// API endpoint and credentials
const char* API_ENDPOINT = "http://192.168.68.57:3000/sendData"; //Change out the IP
const char* WIFI_SSID = "Renegade The Great";
const char* WIFI_PASSWORD = "surinnic_7";
// Sensor commands
//Moisture
const byte moist[] = {0x01, 0x03, 0x00, 0x00, 0x00, 0x01, 0xe84, 0x0a};
//Temperature
const byte temp[] = {0x01, 0x03, 0x00, 0x01, 0x00, 0x01, 0xd5, 0xca};
//Conductivity
const byte cond[] = {0x01, 0x03, 0x00, 0x02, 0x00, 0x01, 0x25, 0xca};
//PH
const byte phph[] = {0x01, 0x03, 0x00, 0x03, 0x00, 0x01, 0x74, 0x0a};
//Nitrogen
const byte nitro[] = {0x01, 0x03, 0x00, 0x04, 0x00, 0x01, 0xec5, 0xcb};
//Phosphorus
const byte phos[] = {0x01, 0x03, 0x00, 0x05, 0x00, 0x01, 0xe94, 0x0b};
//Potassium
const byte pota[] = {0x01, 0x03, 0x00, 0x06, 0x00, 0x01, 0xe64, 0x0b};
byte values[11];

void setup() {
    Serial.begin(4800);
    Serial1.begin(4800, SERIAL_8N1, RXD2, TXD2);
    WiFi.mode(WIFI_STA);
    pinMode(RE, OUTPUT);
    digitalWrite(RE, LOW);

    // Connect to Wi-Fi
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("Connecting to WiFi");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nConnected to WiFi.");
}

float readSensor(const byte* command, size_t commandSize) {
    digitalWrite(RE, HIGH); // Enable transmission
    delay(10);
    for (size_t i = 0; i < commandSize; i++) {
        Serial1.write(command[i]);
    }
    Serial1.flush();
    digitalWrite(RE, LOW); // Enable reception
    delay(100);

    for (byte i = 0; i < 7; i++) {
        values[i] = Serial1.read();
    }

    int rawValue = int(values[3] << 8 | values[4]);
    // Check the command type and apply conditional scaling
    if (command == moist || command == temp || command == phph) {
        return rawValue / 10.0; // Apply division for specific commands
    } else {
        return rawValue; // No scaling for other commands
    }
}

void postToAPI(float moisture, float temperature, float conductivity, float pH, 
               float nitrogen, float phosphorus, float potassium) {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(client, API_ENDPOINT);
        http.addHeader("Content-Type", "application/json");

        // Create JSON object
        StaticJsonDocument<512> jsonDoc;
        jsonDoc["moisture"] = moisture;
        jsonDoc["temperature"] = temperature;
        jsonDoc["conductivity"] = conductivity;
        jsonDoc["pH"] = pH;
        jsonDoc["nitrogen"] = nitrogen;
        jsonDoc["phosphorus"] = phosphorus;
        jsonDoc["potassium"] = potassium;

        // Serialize JSON to a string
        String jsonData;
        serializeJson(jsonDoc, jsonData);

        Serial.println("Posting JSON: " + jsonData);

        // Send POST request
        int httpResponseCode = http.POST(jsonData);
        if (httpResponseCode > 0) {
            Serial.println("Response code: " + String(httpResponseCode));
            Serial.println("Response: " + http.getString());
        } else {
            Serial.println("Error on sending POST: " + String(http.errorToString(httpResponseCode)));
        }
        http.end();
    } else {
        Serial.println("WiFi not connected.");
    }
}

void loop() {
    Serial.println("");
    // Read sensor data
    float moisture = readSensor(moist, sizeof(moist));
    Serial.println("Moisture: " + String(moisture, 1) + " %");

    float temperature = readSensor(temp, sizeof(temp));
    Serial.println("Temperature: " + String(temperature, 1) + " °C");

    float conductivity = readSensor(cond, sizeof(cond));
    Serial.println("Conductivity: " + String(conductivity) + " uS/cm");

    float pH = readSensor(phph, sizeof(phph));
    Serial.println("pH: " + String(pH, 1));

    float nitrogen = readSensor(nitro, sizeof(nitro));
    Serial.println("Nitrogen: " + String(nitrogen) + " mg/L");

    float phosphorus = readSensor(phos, sizeof(phos));
    Serial.println("Phosphorus: " + String(phosphorus) + " mg/L");

    float potassium = readSensor(pota, sizeof(pota));
    Serial.println("Potassium: " + String(potassium) + " mg/L");

    Serial.println("------------------------------------");
    // Post data to API
    postToAPI(moisture, temperature, conductivity, pH, nitrogen, phosphorus, potassium);

    delay(5000);
}
