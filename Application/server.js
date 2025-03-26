const express = require('express');
const admin = require('firebase-admin');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Parser } = require('json2csv');
const axios = require('axios');
const nodemailer = require("nodemailer");
const JSZip = require("jszip");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

const serviceAccount = require(path.join(__dirname, 'fyp-iot-db-firebase-adminsdk-ayz7x-41b7d0c290.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fyp-iot-db-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.database();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const ESP32_IP = 'http://172.19.70.170:80';


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const chartWidth = 1000;
const chartHeight = 600;
const backgroundColor = "white";

async function fetchSensorData(date) {
  const ref = db.ref(`sensorData/${date}`).limitToLast(20);
  const snapshot = await ref.once("value");
  return snapshot.val() ? Object.values(snapshot.val()) : [];
}

async function generateChart(chartType, sensorData) {
  const labels = sensorData.map((entry) =>
    new Date(entry.timestamp).toLocaleTimeString()
  );

  const minMaxValues = {
    moisture: { min: 0, max: 100, stepSize: 10, color: "blue" },
    temperature: { min: 24, max: 38, stepSize: 2, color: "orange" },
    pH: { min: 0, max: 14, stepSize: 2, color: "green" },
    conductivity: { min: 500, max: 1500, stepSize: 250, color: "yellow" },
    nitrogen: { color: "green" },
    phosphorus: { color: "orange" },
    potassium: { color: "blue" },
  };

  const chartCallback = (ChartJS) => {
    ChartJS.defaults.font.family = "Arial";
  };

  const chartCanvas = new ChartJSNodeCanvas({
    width: chartWidth,
    height: chartHeight,
    chartCallback,
    backgroundColour: backgroundColor,
  });

  let chartConfig;

  if (chartType === "nutrients") {
    chartConfig = {
      type: "bar",
      data: {
        labels,
        datasets: ["potassium", "phosphorus", "nitrogen"].map((nutrient) => ({
          label: nutrient,
          data: sensorData.map((entry) => entry[nutrient] || 0),
          backgroundColor: minMaxValues[nutrient]?.color || "gray",
        })),
      },
      options: {
        responsive: true,
        scales: {
          x: { title: { display: true, text: "Time" } },
          y: { title: { display: true, text: "Nutrient Levels" }, min: 0, max: 800, ticks: { stepSize: 100 } },
        },
      },
    };
  } else {
    chartConfig = {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: chartType,
            data: sensorData.map((entry) => entry[chartType]),
            borderColor: minMaxValues[chartType]?.color || "gray",
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: { title: { display: true, text: "Time" } },
          y: {
            title: { display: true, text: `${chartType} Value` },
            min: minMaxValues[chartType]?.min || 0,
            max: minMaxValues[chartType]?.max || 100,
            ticks: { stepSize: minMaxValues[chartType]?.stepSize || 10 },
          },
        },
      },
    };
  }

  return await chartCanvas.renderToBuffer(chartConfig);
}

async function sendEmail(email, buffer, filename, date, isZip = false) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "brennantan618@gmail.com",
      pass: "vbrd hkjj qzqq wrwu",
    },
  });

  let mailOptions = {
    from: "Ceres' Hand",
    to: email,
    subject: isZip
      ? `All Sensor Data Charts - ${date}`
      : `Sensor Data Chart: ${filename.split("_")[0]} - ${date}`,
    text: isZip
      ? `Attached is a zip file containing all sensor charts for ${date}.`
      : `Attached is the ${filename.split("_")[0]} chart for ${date}.`,
    attachments: [
      {
        filename: filename,
        content: buffer,
      },
    ],
  };

  await transporter.sendMail(mailOptions);
}

app.post("/sendChart", async (req, res) => {
  try {
    const { email, date, chartType } = req.body;

    if (!email || !date || !chartType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const sensorData = await fetchSensorData(date);

    if (!sensorData.length) {
      return res.status(404).json({ message: "No data available for the selected date." });
    }

    const chartBuffer = await generateChart(chartType, sensorData);

    await sendEmail(email, chartBuffer, `${chartType}_${date}.png`, date, false);

    res.json({ message: "Chart emailed successfully!" });
  } catch (error) {
    console.error("Error sending chart:", error);
    res.status(500).json({ message: "Failed to send chart." });
  }
});


app.post("/sendAllCharts", async (req, res) => {
  const { email, date } = req.body;

  if (!email || !date) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const sensorData = await fetchSensorData(date);

    if (!sensorData.length) {
      return res.status(404).json({ message: `No sensor data found for ${date}` });
    }

    const chartTypes = ["moisture", "temperature", "pH", "conductivity", "nutrients"];
    const zip = new JSZip();

    await Promise.all(
      chartTypes.map(async (type) => {
        const chartBuffer = await generateChart(type, sensorData);
        zip.file(`${type}_${date}.png`, chartBuffer);
      })
    );

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    await sendEmail(email, zipBuffer, `SensorCharts_${date}.zip`, date, true);

    res.json({ message: `Charts zipped and sent successfully` });
  } catch (error) {
    console.error("Error sending charts:", error);
    res.status(500).json({ message: "Failed to send charts." });
  }
});

let clients = [];

const broadcastToClients = (message) => {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// Function to format timestamp as "HH:MM:SS AM/PM"
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  return `${formattedHours}:${minutes}:${seconds} ${ampm}`;
};

app.get('/getLastLoggedData', async (req, res) => {
    try {
      const snapshot = await db.ref('lastLoggedData').once('value');
      const data = snapshot.val();
      res.status(200).json(data || {});
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch data' });
    }
});

app.get('/getSensorData/:date', async (req, res) => {
  try {
    const dateString = req.params.date;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const dateRef = db.ref(`sensorData/${dateString}`);

    // First, get total count using orderByChild and once
    const totalCountSnapshot = await dateRef.orderByChild('timestamp').once('value');
    const totalItems = totalCountSnapshot.numChildren();
   
    if (totalItems === 0) {
      return res.status(404).json({ message: 'No data found for this date' });
    }

    // Calculate pagination
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;

    // Get all data and then paginate
    const snapshot = await dateRef
      .orderByChild('timestamp')
      .once('value');
    
    const allData = snapshot.val();
    
    // Convert to array and add IDs
    const formattedData = Object.entries(allData).map(([key, value]) => ({
      id: key,
      ...value
    }));

    // Sort in descending order
    formattedData.sort((a, b) => b.timestamp - a.timestamp);

    // Get the paginated slice
    const paginatedData = formattedData.slice(startIndex, startIndex + limit);
   
    res.status(200).json({
      data: paginatedData,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalItems,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('Error fetching sensor data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.get('/getParameters', async (req, res) => {
  try {
    const minimumSnapshot = await db.ref('dataParameters/minimum').once('value');
    const minimumData = minimumSnapshot.val();

    const maximumSnapshot = await db.ref('dataParameters/maximum').once('value');
    const maximumData = maximumSnapshot.val();

    res.status(200).json({
      minimum: minimumData || null,
      maximum: maximumData || null,
    });

  } catch (error) {
    console.error('Error fetching parameters:', error);
    res.status(500).json({ error: 'Failed to fetch parameters' });
  }
});

app.post('/sendData', async (req, res) => {
  try {
      const { pH, moisture, temperature, conductivity, nitrogen, phosphorus, potassium } = req.body;
      const timestamp = Date.now();
      const sensorData = {
        pH,
        moisture,
        temperature,
        conductivity,
        nitrogen,
        phosphorus,
        potassium,
        timestamp
      };

      console.log("Send data: " + sensorData);

      const currentDate = new Date();
      const dateString = currentDate.toISOString().split('T')[0];
      const dailyRef = db.ref(`sensorData/${dateString}`);
      await dailyRef.push(sensorData);

      // Most recent data for /getLastLoggedData to load up on front-end boot
      await db.ref('lastLoggedData').set(sensorData);

      broadcastToClients(JSON.stringify(sensorData));

      res.status(200).json({ success: true });
  } catch (error) {
      console.error('Error storing sensor data:', error);
      res.status(500).json({ error: 'Failed to save data' });
  }
});

app.post('/downloadCsv', async (req, res) => {
  try {
    const date = req.body.date; // Format: YYYY-MM-DD
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    const dateRef = db.ref(`sensorData/${date}`);

    const snapshot = await dateRef.once('value');
    const data = snapshot.val();

    if (!data) {
      return res.status(404).json({ error: 'No data found for the specified date' });
    }

    const flattenedData = [];
    Object.keys(data).forEach(key => {
      // Clone the object and replace timestamp with formatted time
      const item = { ...data[key], time: formatTimestamp(data[key].timestamp) };
      delete item.timestamp; // Remove the timestamp field
      flattenedData.push(item);
    });
  
    // console.log(flattenedData[0]);

    const json2csvParser = new Parser({
      fields: [
        {
          label: 'Time',
          value: 'time'
        },
        {
          label: 'pH',
          value: 'pH'
        },
        {
          label: 'Moisture (%)',
          value: 'moisture'
        },
        {
          label: 'Temperature (Celcius)',  
          value: 'temperature'        
        },
        {
          label: 'Conductivity (uS/cm)',
          value: 'conductivity'
        },
        {
          label: 'Nitrogen (mg/L)',
          value: 'nitrogen'
        },
        {
          label: 'Phosphorus (mg/L)',
          value: 'phosphorus'
        },
        {
          label: 'Potassium (mg/L)',
          value: 'potassium'
        }
      ]
    });

    const csv = json2csvParser.parse(flattenedData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sensor_data_${date}.csv`);

    res.send(csv);

  } catch (error) {
    console.error('Error generating CSV:', error);
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
});

app.post('/setParameters', async (req, res) => {
  try {
    const { parameterMinimum, parameterMaximum } = req.body;

      const minimumRef = db.ref('dataParameters/minimum');
      const maximumRef = db.ref('dataParameters/maximum');

      await minimumRef.set(parameterMinimum);
      await maximumRef.set(parameterMaximum);

      res.status(200).json({ success: true });
  } catch (error) {
      console.error('Error setting parameters:', error);
      res.status(500).json({ error: 'Failed to set parameters' });
  }
});

app.get('/waterPumpOn', async (req, res) => {
  const { duration } = req.query;
  try {
    const response = await axios.get(`${ESP32_IP}/waterPumpOn`, {
      params: { duration: duration || 3 },
    });
    res.send(response.data);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error controlling the pump');
  }
});

// WebSocket Server Logic
wss.on('connection', (ws) => {
  clients.push(ws);
  console.log('New WebSocket client connected.');

  ws.on('close', () => {
    clients = clients.filter((client) => client !== ws);
    console.log('WebSocket client disconnected.');
  });
});

server.listen(3000, () => console.log('API running on http://localhost:3000'));