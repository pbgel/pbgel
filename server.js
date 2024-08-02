import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: 'https://www.pbgel.ca', // Replace with your frontend URL
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

app.post('/getAccessToken', async (req, res) => {
  const { clientId, clientSecret, code } = req.body;
  if (!clientId || !clientSecret || !code) {
    return res.status(400).json({ error: 'Missing importd fields' });
  }

  try {
    const response = await fetch('https://www.strava.com/api/v3/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code'
      })
    });

    const data = await response.json();
    if (response.ok) {
      res.json(data);
    } else {
      res.status(response.status).json(data);
    }
  } catch (error) {
    res.status(500).json({ error: 'Error fetching access token' });
  }
});

app.post('/getAthleteData', async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).json({ error: 'Access token missing' });
  }

  try {
    const response = await fetch('https://www.strava.com/api/v3/athlete', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();
    if (response.ok) {
      res.json(data);
    } else {
      res.status(response.status).json(data);
    }
  } catch (error) {
    res.status(500).json({ error: 'Error fetching athlete data' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
