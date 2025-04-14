const request = require('supertest');
const app = require('../server.js');

jest.mock('firebase-admin', () => {
  const mSnapshot = {
    val: () => mockFirebaseData,
    numChildren: () => Object.keys(mockFirebaseData).length,
    };

  const mDatabase = {
    ref: jest.fn(() => mDatabase),
    once: jest.fn(() => Promise.resolve(mSnapshot)),
    push: jest.fn(() => ({
      set: jest.fn(() => Promise.resolve())
    })),
    set: jest.fn(() => Promise.resolve()),
    orderByChild: jest.fn(() => mDatabase),
    limitToLast: jest.fn(() => mDatabase),
    orderByKey: jest.fn(() => mDatabase),
    limitToFirst: jest.fn(() => mDatabase),
  };
  
  return {
    credential: { cert: jest.fn() },
    initializeApp: jest.fn(),
    database: () => mDatabase,
  };
});

const mockFirebaseData = {
  "entry1": { pH: 6.5, moisture: 50, temperature: 30, conductivity: 800, nitrogen: 100, phosphorus: 50, potassium: 200, timestamp: Date.now() },
  "entry2": { pH: 6.8, moisture: 52, temperature: 31, conductivity: 850, nitrogen: 110, phosphorus: 55, potassium: 210, timestamp: Date.now() }
};

describe('API routes', () => {
  const testDate = '2025-04-14';

  it('GET /getLastLoggedData - success', async () => {
    const res = await request(app).get('/getLastLoggedData');
    expect(res.statusCode).toBe(200);
  });
  
  it('GET /getLastLoggedData - database error', async () => {
    const admin = require('firebase-admin');
    admin.database().ref().once.mockRejectedValueOnce(new Error('Database error'));

    const res = await request(app).get('/getLastLoggedData');
    
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  it('GET /getSensorData/:date - success', async () => {
    const res = await request(app).get(`/getSensorData/${testDate}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /getSensorData/:date - no data found', async () => {
    const admin = require('firebase-admin');
    admin.database().once.mockResolvedValueOnce({
      val: () => null,
      numChildren: () => 0
    });
  
    const res = await request(app).get(`/getSensorData/2024-01-01`);
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message');
  });

  it('POST /sendData - success', async () => {
    const data = { pH: 7, moisture: 40, temperature: 28, conductivity: 900, nitrogen: 50, phosphorus: 30, potassium: 20 };
    const res = await request(app).post('/sendData').send(data);
    expect(res.statusCode).toBe(200);
  });

  it('POST /sendData - error', async () => {
    const mDatabase = require('firebase-admin').database();
    mDatabase.ref().push.mockImplementationOnce(() => { throw new Error('Mock error'); });
    const res = await request(app).post('/sendData').send({});
    expect(res.statusCode).toBe(500);
  });

  it('GET /getParameters - success', async () => {
    const res = await request(app).get('/getParameters');
    expect(res.statusCode).toBe(200);
  });

  it('POST /setParameters - success', async () => {
    parameterMinimum = {
        pH: 6.5, moisture: 50, temperature: 30, conductivity: 800, nitrogen: 100, phosphorus: 50, potassium: 200
    };
    parameterMaximum = {
        pH: 6.5, moisture: 50, temperature: 30, conductivity: 800, nitrogen: 100, phosphorus: 50, potassium: 200
    };

    const res = await request(app).post('/setParameters').send({ parameterMinimum, parameterMaximum });
    expect(res.statusCode).toBe(200);
  });
});
