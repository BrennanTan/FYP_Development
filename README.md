## 🚀 Project Overview
This project integrates an ESP32 microcontroller with a Node.js application to monitor and manage sensor data. The ESP32 collects data from various sensors and communicates with the Node.js backend for processing and visualization.

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
  - **server.js**: Node.js Express API.
- **ESP32_Code/ESP32_dev_V2/**: ESP32's firmware code.

## 🛠️ Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (version 20.15.1)
- [ESP32 Dev module] used in Arduino IDE

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

3. **Configure firebase database credentials**:


4. **Start the application**:

   ```bash
   npm start
   ```

   The application should now be running at `http://localhost:3000`.

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

4. **Upload the code to the ESP32**:

   Connect your ESP32 and upload.

## ⚙️ Features

- **Real-time Sensor Monitoring**: View live data from connected sensors.
- **View data by date and download CSV**: View data based on date, data can be downloaded as CSV.
- **Water pump control**: Set duration of water pump and water
- **View data as charts and download/email**: View data visualized as charts, charts can be downloaded as image or emailed to an email address
- **Set parameters**: Set minimum/maximum thresholds for highlighted values and enables auto watering
  
