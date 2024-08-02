import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let athletesCollection;

client.connect()
  .then(() => {
    const db = client.db('strava');
    athletesCollection = db.collection('athletes');
    console.log('Connected to MongoDB');
  })
  .catch(error => console.error('Error connecting to MongoDB:', error));

app.post('/getAccessToken', async (req, res) => {
  const { clientId, clientSecret, code } = req.body;

  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
      }),
    });

    const data = await response.json();
    console.log('Response from Strava:', data);

    if (response.ok) {
      await athletesCollection.updateOne(
        { id: data.athlete.id },
        { $set: data },
        { upsert: true }
      );
      res.json(data);
    } else {
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('Error fetching access token:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/refreshAccessToken', async (req, res) => {
  const { clientId, clientSecret, refreshToken } = req.body;

  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();
    console.log('Response from Strava:', data);

    if (response.ok) {
      await athletesCollection.updateOne(
        { id: data.athlete.id },
        { $set: data },
        { upsert: true }
      );
      res.json(data);
    } else {
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('Error refreshing access token:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/getAthleteData', async (req, res) => {
  const { accessToken } = req.body;

  try {
    const response = await fetch('https://www.strava.com/api/v3/athlete', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();
    console.log('Athlete data:', data);

    if (response.ok) {
      res.json(data);
    } else {
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('Error fetching athlete data:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
