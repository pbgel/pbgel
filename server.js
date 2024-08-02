import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

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
    console.log('Response from Strava:', data); // Log the response from Strava

    if (response.ok) {
      res.json(data);
    } else {
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('Error fetching access token:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/getAthleteData', async (req, res) => {
  const { accessToken } = req.body;

  try {
    const response = await fetch('https://www.strava.com/api/v3/athlete', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const data = await response.json();
    console.log('Response from Strava:', data); // Log the response from Strava

    if (response.ok) {
      res.json(data);
    } else {
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('Error fetching athlete data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
