const http = require('http');

const NUM_REQUESTS = 1100;
const URL = 'http://localhost:60005/api/public';

function sendRequest(i) {
  http.get(URL, (res) => {
    let data = '';

    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`Response ${i}:`, data);
    });
  }).on('error', (err) => {
    console.error(`Error ${i}:`, err.message);
  });
}

for (let i = 1; i <= NUM_REQUESTS; i++) {
  sendRequest(i);
}
