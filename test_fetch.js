const http = require('http');

http.get('http://localhost:9002/dashboard', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log("STATUS:", res.statusCode);
    console.log("BODY LENGTH:", data.length);
    console.log(data); // print whole body
  });
}).on('error', (err) => {
  console.error("Error:", err);
});
