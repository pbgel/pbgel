import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

app.use(cors());
app.use(express.json());

app.post('/getAccessToken', async (req, res) => {
  const { code } = req.body;

  console.log('Request body:', req.body);

  try {
    const response = await fetch('https://www.strava.com/api/v3/oauth/token', {
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
      res.json(data);
    } else {
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('Error fetching access token:', error);
    res.status(500).json({ message: 'Internal Server Error', error });
  }
});

app.post('/getAthleteData', async (req, res) => {
  const { accessToken } = req.body;

  try {
    const response = await fetch('https://www.strava.com/api/v3/athlete', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    if (response.ok) {
      res.json(data);
    } else {
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('Error fetching athlete data:', error);
    res.status(500).json({ message: 'Internal Server Error', error });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
