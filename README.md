## 🚀 Project Overview
This project integrates an ESP32 microcontroller equiped with various components, Node.js Express API, and a front end UI with HTML, CSS, Javascript. In combination, this application will receive live data from ESP32 to display and visualize as charts, and can remotely control water pump via automatic threshold detection(must be set first) or by setting a duration.

## ⚙️ Features

- **Real-time Sensor Monitoring**: View live data from connected sensors.
- **View data by date and download CSV**: View data based on date, data can be downloaded as CSV.
- **Water pump control**: Set duration of water pump and water
- **View data as charts and download/email**: View data visualized as charts, charts can be downloaded as image or emailed to an email address
- **Set parameters**: Set minimum/maximum thresholds for highlighted values and enables auto watering

## 📁 Repository Structure
```
FYP_Development/
├── Application/
│   ├── public/
│   │   ├── javascript/
│   │   │   └── app.js
│   │   ├── data_by_date.html
│   │   ├── data_charts.html
│   │   ├── favicon.png
│   │   ├── index.html
│   │   ├── navbar.html
│   │   └── set_parameters.html
│   ├── test/
│   │   └── api.test.js
│   ├── package-lock.json
│   ├── package.json
│   └── server.js
├── ESP32_Code/
│   └── ESP32_dev_V2/
│       └── ESP32_dev_V2.ino
├── .gitattributes
├── .gitignore
└── README.md
```

- **Application/**: Contains Node.js Express API and HTML+Javascript frontend UI.
  - **public/**: Holds frontend files.
    - **javascript/app.js**: app.js for handles frontend JavaScript.
    - **data_by_date.html**: Interface for viewing data by date.
    - **data_charts.html**: Interface for visualizing data with charts.
    - **index.html**: Main entry point for the frontend.
    - **navbar.html**: Reusable navigation bar.
    - **set_parameters.html**: Page for setting parameters.
  - **test/**
    - **api.test.js**: Unit tests for the API
  - **server.js**: Node.js Express API.
- **ESP32_Code/ESP32_dev_V2/**: ESP32's firmware code.

## 🛠️ Installation

### Prerequisites

- [Node.js] (version 20.15.1)
- [Arduino IDE]
- [ESP32 Dev module] used in Arduino IDE
- [7-in-1 sensor] used (https://www.jxct-iot.com/product/showproduct.php?id=197)
- [RS485 to TTL converter]
- [5V relay module]
- [Water pump and hose]

### Node.js Application Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/BrennanTan/FYP_Development.git
   cd FYP_Development/Application
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure firebase database credentials**
   

4. **Adjust const ESP32_IP to ESP32's IP address**

      ```server.js
    const ESP32_IP = 'http://IP_ADDRESS_HERE:80';
   ```

6. **Start the application**:

   ```bash
   npm start
   ```

   The application should now be running at `http://localhost:3000`.


### Start API Unit Tests   

1. **Start the tests**:

   ```bash
   npm test
   ```

### ESP32 Firmware Setup

1. **Navigate to the ESP32 code directory**:

   ```bash
   cd FYP_Development/ESP32_Code/ESP32_dev_V2
   ```

2. **Open the project with Arduino IDE**

3. **Configure Wi-Fi credentials**:

   Update the file with your Wi-Fi SSID and password:

   ```ESP32_dev_V2.ino
   const char* ssid = "your_SSID";
   const char* password = "your_PASSWORD";
   ```
   
4. **Adjust IP addresses**:

   Adjust the IP address of the API endpoint

   ```ESP32_dev_V2.ino
    const char* API_ENDPOINT_SENDDATA = "http://IP_ADDRESS_HERE:3000/sendData"; //Change out the IP
    const char* API_ENDPOINT_GETPARAMETERS = "http://IP_ADDRESS_HERE:3000/getParameters"; //Change out the IP
   ```
   
5. **Upload the code to the ESP32**:

   Connect your ESP32 and upload.
