// server.mjs

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('Error connecting to MongoDB:', err));

const athleteSchema = new mongoose.Schema({
  athleteId: Number,
  refreshToken: String,
  accessToken: String,
  tokenExpiry: Number
});

const Athlete = mongoose.model('Athlete', athleteSchema);

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
        grant_type: 'authorization_code'
      })
    });

    const data = await response.json();

    if (response.ok) {
      const { athlete, access_token, refresh_token, expires_at } = data;
      await Athlete.updateOne(
        { athleteId: athlete.id },
        { athleteId: athlete.id, refreshToken: refresh_token, accessToken: access_token, tokenExpiry: expires_at },
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

  try {
    const athlete = await Athlete.findOne({ athleteId });

    if (!athlete) {
      return res.status(404).json({ message: 'Athlete not found' });
    }

    const currentTime = Math.floor(Date.now() / 1000);

    if (athlete.tokenExpiry < currentTime) {
      const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: athlete.refreshToken
        })
      });

      const tokenData = await tokenResponse.json();

      if (tokenResponse.ok) {
        athlete.accessToken = tokenData.access_token;
        athlete.refreshToken = tokenData.refresh_token;
        athlete.tokenExpiry = tokenData.expires_at;
        await athlete.save();
      } else {
        return res.status(tokenResponse.status).json(tokenData);
      }
    }

    const response = await fetch('https://www.strava.com/api/v3/athlete', {
      method: 'GET',
      headers: { Authorization: `Bearer ${athlete.accessToken}` }
    });

    const data = await response.json();

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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
