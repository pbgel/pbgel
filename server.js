import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const UserSchema = new mongoose.Schema({
  stravaId: { type: String, required: true, unique: true },
  accessToken: String,
  refreshToken: String,
  expiresAt: Number,
  firstname: String,
  lastname: String,
  city: String,
  state: String,
  country: String,
  profile: String,
});

const User = mongoose.model('User', UserSchema);

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.post('/getAccessToken', async (req, res) => {
  const { code } = req.body;
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  console.log('Received code:', code);

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
      const user = await User.findOneAndUpdate(
        { stravaId: data.athlete.id },
        {
          stravaId: data.athlete.id,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_at,
          firstname: data.athlete.firstname,
          lastname: data.athlete.lastname,
          city: data.athlete.city,
          state: data.athlete.state,
          country: data.athlete.country,
          profile: data.athlete.profile,
        },
        { upsert: true, new: true }
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
  const { accessToken } = req.body;
  console.log('Received access token:', accessToken);

  try {
    const response = await fetch('https://www.strava.com/api/v3/athlete', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
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
