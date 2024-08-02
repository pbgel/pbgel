const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let db;
const client = new MongoClient(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

client.connect()
  .then(() => {
    db = client.db();
    console.log('Connected to MongoDB');
  })
  .catch(err => console.error('Error connecting to MongoDB:', err));

app.post('/getAccessToken', async (req, res) => {
  const { clientId, clientSecret, code } = req.body;
  console.log('Request body:', req.body);

  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
      const { athlete, access_token, refresh_token, expires_at } = data;
      await db.collection('users').updateOne(
        { athleteId: athlete.id },
        {
          $set: {
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresAt: expires_at,
            athlete: athlete,
          },
        },
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

app.post('/getAthleteData', async (req, res) => {
  const { athleteId } = req.body;
  console.log('Received athlete ID:', athleteId);

  try {
    const user = await db.collection('users').findOne({ athleteId: athleteId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { accessToken, refreshToken, expiresAt } = user;
    let currentAccessToken = accessToken;

    if (Date.now() >= expiresAt * 1000) {
      const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        currentAccessToken = data.access_token;
        await db.collection('users').updateOne(
          { athleteId: athleteId },
          {
            $set: {
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              expiresAt: data.expires_at,
            },
          }
        );
      } else {
        return res.status(response.status).json(data);
      }
    }

    const athleteResponse = await fetch('https://www.strava.com/api/v3/athlete', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${currentAccessToken}`,
      },
    });

    const athleteData = await athleteResponse.json();
    console.log('Athlete data:', athleteData);

    if (athleteResponse.ok) {
      res.json(athleteData);
    } else {
      res.status(athleteResponse.status).json(athleteData);
    }
  } catch (error) {
    console.error('Error fetching athlete data:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
