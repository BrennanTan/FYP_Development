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

// Function to update table with fetched data
function updateTable(result, selectedDate) {
    const { data, pagination } = result;
    const tableBody = document.getElementById('dataByDateTable');
    const paginationContainer = document.getElementById('pagination');
    
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

    // Display data
    data.forEach(sensorDataByDate => {
        const row = document.createElement('tr');
        const timestamp = new Date(sensorDataByDate.timestamp);
        const formattedTime = timestamp.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
       
        row.innerHTML = `
            <td>${formattedTime}</td>
            <td>${sensorDataByDate.pH.toFixed(2)}</td>
            <td>${sensorDataByDate.moisture.toFixed(2)}%</td>
            <td>${sensorDataByDate.temperature.toFixed(2)}°C</td>
            <td>${sensorDataByDate.conductivity.toFixed(2)} µS/cm</td>
            <td>${sensorDataByDate.nitrogen.toFixed(2)} mg/kg</td>
            <td>${sensorDataByDate.phosphorus.toFixed(2)} mg/kg</td>
            <td>${sensorDataByDate.potassium.toFixed(2)} mg/kg</td>
        `;
       
        tableBody.appendChild(row);
    });

    // Create pagination if we have pagination info
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
                const newResult = await fetchDataForDate(selectedDate, pagination.currentPage - 1);
                updateTable(newResult, selectedDate);
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
                const newResult = await fetchDataForDate(selectedDate, i);
                updateTable(newResult, selectedDate);
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
                const newResult = await fetchDataForDate(selectedDate, pagination.currentPage + 1);
                updateTable(newResult, selectedDate);
            }
        };
        paginationUl.appendChild(nextLi);

        paginationContainer.appendChild(paginationUl);
    }
}