const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// Use CORS middleware
app.use(cors({
  origin: 'https://www.pbgel.ca', // Allow only your Wix site to access the server
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Use body-parser middleware
app.use(bodyParser.json());

app.post('/getAccessToken', (req, res) => {
  const { clientId, clientSecret, code } = req.body;

  const url = 'https://www.strava.com/api/v3/oauth/token';
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    grant_type: 'authorization_code'
  });

  fetch(url, {
    method: 'POST',
    headers: headers,
    body: body.toString()
  })
  .then(response => response.json())
  .then(data => res.json(data))
  .catch(error => res.status(500).json({ error: error.message }));
});

app.post('/getAthleteData', (req, res) => {
  const { accessToken } = req.body;

  const url = 'https://www.strava.com/api/v3/athlete';
  const headers = {
    'Authorization': `Bearer ${accessToken}`
  };

  fetch(url, {
    method: 'GET',
    headers: headers
  })
  .then(response => response.json())
  .then(data => res.json(data))
  .catch(error => res.status(500).json({ error: error.message }));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
