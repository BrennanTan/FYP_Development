function formatTimestamp(timestamp) {
    const date = new Date(timestamp);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? String(hours).padStart(2, '0') : '12';

    const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}:${seconds} ${ampm}`;

    return formattedDate;
}

async function fetchLastLoggedData() {
  try{
    const response = await fetch('http://localhost:3000/getLastLoggedData');
    const data = await response.json();

    let convertedTime = formatTimestamp(data.timestamp);

    document.getElementById('LLD_time').textContent= convertedTime;
    document.getElementById('LLD_ph').textContent= data.pH.toFixed(2);
    document.getElementById('LLD_moisture').textContent= data.moisture.toFixed(2) + "%";
    document.getElementById('LLD_temperature').textContent= data.temperature.toFixed(2) + "°C";
    document.getElementById('LLD_conductivity').textContent= data.conductivity.toFixed(2) + " uS/cm";
    document.getElementById('LLD_nitrogen').textContent= data.nitrogen.toFixed(2) + " mg/L";
    document.getElementById('LLD_phosphorus').textContent= data.phosphorus.toFixed(2) + " mg/L";
    document.getElementById('LLD_potassium').textContent= data.potassium.toFixed(2) + " mg/L";

  }catch(error){
    console.error('Error fetch last logged data: ', error)
  }
}

function initializeWebSocket() {
    const socket = new WebSocket('ws://localhost:3000');
  
    socket.addEventListener('message', (event) => {
      try {
        const sensorData = JSON.parse(event.data);
        updateSensorDisplay(sensorData);
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
  
    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
    });
  
    return socket;
}
  
function updateSensorDisplay(sensorData) {
    let convertedTime = formatTimestamp(sensorData.timestamp);

    document.getElementById('LLD_time').textContent= convertedTime;
    document.getElementById('LLD_ph').textContent= sensorData.pH.toFixed(2);
    document.getElementById('LLD_moisture').textContent= sensorData.moisture.toFixed(2) + "%";
    document.getElementById('LLD_temperature').textContent= sensorData.temperature.toFixed(2) + "°C";
    document.getElementById('LLD_conductivity').textContent= sensorData.conductivity.toFixed(2) + " uS/cm";
    document.getElementById('LLD_nitrogen').textContent= sensorData.nitrogen.toFixed(2) + " mg/L";
    document.getElementById('LLD_phosphorus').textContent= sensorData.phosphorus.toFixed(2) + " mg/L";
    document.getElementById('LLD_potassium').textContent= sensorData.potassium.toFixed(2) + " mg/L";

}

async function fetchDataForDate(selectedDate, page = 1) {
  const dateString = selectedDate.toISOString().split('T')[0];
  const limit = 20;
  
  try {
    const response = await fetch(`/getSensorData/${dateString}?page=${page}&limit=${limit}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('No data available for selected date');
        return { data: [], pagination: null };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching data:', error);
    return { data: [], pagination: null };
  }
}

function updateTable(result, selectedDate, parameters) {
  const { data, pagination } = result;
  const tableBody = document.getElementById('dataByDateTable');
  const paginationContainer = document.getElementById('pagination');
  
  // Helper function to determine cell styling based on min/max comparison
  const getStyleForValue = (value, parameterName) => {
      // Return empty style if no parameters exist or if the specific parameter is missing
      if (!parameters || !parameters.minimum || !parameters.maximum) return '';
      
      const min = parameters.minimum?.[parameterName];
      const max = parameters.maximum?.[parameterName];
      
      // If either min or max is missing for this parameter, return empty style
      if (min === undefined || min === null || max === undefined || max === null) return '';
      
      if (value < min) {
          return 'color: red;';
      } else if (value > max) {
          return 'color: red;';
      }
      return '';
  };

  tableBody.innerHTML = '';
  paginationContainer.innerHTML = '';
  
  if (!data || data.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 8;
      cell.textContent = 'No data found for selected date';
      cell.className = 'text-center p-4';
      row.appendChild(cell);
      tableBody.appendChild(row);
      return;
  }

  // Display data with styling
  data.forEach(sensorDataByDate => {
      const row = document.createElement('tr');
      const timestamp = new Date(sensorDataByDate.timestamp);
      const formattedTime = timestamp.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
      });

      // Create cells with conditional styling
      const cells = [
          { value: formattedTime },
          { value: sensorDataByDate.pH?.toFixed(2) ?? 'N/A', param: 'ph' },
          { value: sensorDataByDate.moisture?.toFixed(2) ?? 'N/A', param: 'moisture', unit: '%' },
          { value: sensorDataByDate.temperature?.toFixed(2) ?? 'N/A', param: 'temperature', unit: '°C' },
          { value: sensorDataByDate.conductivity?.toFixed(2) ?? 'N/A', param: 'conductivity', unit: ' µS/cm' },
          { value: sensorDataByDate.nitrogen?.toFixed(2) ?? 'N/A', param: 'nitrogen', unit: ' mg/kg' },
          { value: sensorDataByDate.phosphorus?.toFixed(2) ?? 'N/A', param: 'phosphorus', unit: ' mg/kg' },
          { value: sensorDataByDate.potassium?.toFixed(2) ?? 'N/A', param: 'potassium', unit: ' mg/kg' }
      ];

      row.innerHTML = cells.map((cell, index) => {
          if (index === 0) return `<td>${cell.value}</td>`; // Time column, no styling
          
          // Only apply styling if the value is numeric
          const numericValue = parseFloat(cell.value);
          const style = !isNaN(numericValue) ? getStyleForValue(numericValue, cell.param) : '';
          const unit = !isNaN(numericValue) ? (cell.unit || '') : '';
          
          return `<td style="${style}">${cell.value}${unit}</td>`;
      }).join('');
      
      tableBody.appendChild(row);
  });

  // Pagination code
  if (pagination && pagination.totalPages > 1) {
      const paginationUl = document.createElement('ul');
      paginationUl.className = 'pagination justify-content-center';
      
      // Previous button
      const prevLi = document.createElement('li');
      prevLi.className = `page-item ${pagination.currentPage === 1 ? 'disabled' : ''}`;
      prevLi.innerHTML = `<a class="page-link" href="#" ${pagination.currentPage === 1 ? 'tabindex="-1" aria-disabled="true"' : ''}>Previous</a>`;
      prevLi.onclick = async (e) => {
          e.preventDefault();
          if (pagination.currentPage > 1) {
              try {
                  const newResult = await fetchDataForDate(selectedDate, pagination.currentPage - 1);
                  const parameters = await fetchParameters().catch(() => null); // Handle failed parameter fetch
                  updateTable(newResult, selectedDate, parameters);
              } catch (error) {
                  console.error('Error updating table:', error);
              }
          }
      };
      paginationUl.appendChild(prevLi);

      // Page numbers
      for (let i = 1; i <= pagination.totalPages; i++) {
          const li = document.createElement('li');
          li.className = `page-item ${pagination.currentPage === i ? 'active' : ''}`;
          li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
          li.onclick = async (e) => {
              e.preventDefault();
              try {
                  const newResult = await fetchDataForDate(selectedDate, i);
                  const parameters = await fetchParameters().catch(() => null); // Handle failed parameter fetch
                  updateTable(newResult, selectedDate, parameters);
              } catch (error) {
                  console.error('Error updating table:', error);
              }
          };
          paginationUl.appendChild(li);
      }

      // Next button
      const nextLi = document.createElement('li');
      nextLi.className = `page-item ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}`;
      nextLi.innerHTML = `<a class="page-link" href="#" ${pagination.currentPage === pagination.totalPages ? 'tabindex="-1" aria-disabled="true"' : ''}>Next</a>`;
      nextLi.onclick = async (e) => {
          e.preventDefault();
          if (pagination.currentPage < pagination.totalPages) {
              try {
                  const newResult = await fetchDataForDate(selectedDate, pagination.currentPage + 1);
                  const parameters = await fetchParameters().catch(() => null); // Handle failed parameter fetch
                  updateTable(newResult, selectedDate, parameters);
              } catch (error) {
                  console.error('Error updating table:', error);
              }
          }
      };
      paginationUl.appendChild(nextLi);
      paginationContainer.appendChild(paginationUl);
  }
}

async function fetchParameters() {
  try{
    const response = await fetch('http://localhost:3000/getParameters');
    const data = await response.json();
    return data;

  }catch(error){
    console.error('Error fetch parameters: ', error)
  }
}

function fillTargetParameters(minimum, maximum){
  document.getElementById('parameterRange_ph').textContent = `${minimum.ph} - ${maximum.ph}`;
  document.getElementById('parameterRange_moisture').textContent = `${minimum.moisture}% - ${maximum.moisture}%`;
  document.getElementById('parameterRange_temperature').textContent = `${minimum.temperature}°C - ${maximum.temperature}°C`;
  document.getElementById('parameterRange_conductivity').textContent = `${minimum.conductivity}uS/cm - ${maximum.conductivity}uS/cm`;
  document.getElementById('parameterRange_nitrogen').textContent = `${minimum.nitrogen}mg/L - ${maximum.nitrogen}mg/L`;
  document.getElementById('parameterRange_phosphorus').textContent = `${minimum.phosphorus}mg/L - ${maximum.phosphorus}mg/L`;
  document.getElementById('parameterRange_potassium').textContent = `${minimum.potassium}mg/L - ${maximum.potassium}mg/L`;
}

function updateParametersFields(minimum, maximum) {

  document.getElementById('phMinimum').value = minimum.ph;
  document.getElementById('moistureMinimum').value = minimum.moisture;
  document.getElementById('temperatureMinimum').value = minimum.temperature;
  document.getElementById('conductivityMinimum').value = minimum.conductivity;
  document.getElementById('nitrogenMinimum').value = minimum.nitrogen;
  document.getElementById('phosphorusMinimum').value = minimum.phosphorus;
  document.getElementById('potassiumMinimum').value = minimum.potassium;

  document.getElementById('phMaximum').value = maximum.ph
  document.getElementById('moistureMaximum').value = maximum.moisture
  document.getElementById('temperatureMaximum').value = maximum.temperature
  document.getElementById('conductivityMaximum').value = maximum.conductivity
  document.getElementById('nitrogenMaximum').value = maximum.nitrogen
  document.getElementById('phosphorusMaximum').value = maximum.phosphorus
  document.getElementById('potassiumMaximum').value = maximum.potassium
};

function checkAgainstParameter_LLD(minimum, maximum){

  const target = {
    LLD_ph: { min: minimum.ph, max: maximum.ph },
    LLD_moisture: { min: minimum.moisture, max: maximum.moisture },
    LLD_temperature: { min: minimum.temperature, max: maximum.temperature },
    LLD_conductivity: { min: minimum.conductivity, max: maximum.conductivity },
    LLD_nitrogen: { min: minimum.nitrogen, max: maximum.nitrogen },
    LLD_phosphorus: { min: minimum.phosphorus, max: maximum.phosphorus },
    LLD_potassium: { min: minimum.potassium, max: maximum.potassium },
  };

  for (const [id, { min, max }] of Object.entries(target)) {
    const span = document.getElementById(id);
    const value = parseFloat(span.textContent);

    if (value < min) {
      span.style.color = 'red';
    } else if (value > max) {
      span.style.color = 'red';
    }
  }
}