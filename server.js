const http = require('http'),
  fs = require('fs'),
  url = require('url');

http.createServer((request, response) => {
  let addr = request.url,
    q = new URL(addr, 'http://' + request.headers.host),
    filePath = '';

  // Log request URL and timestamp to log.txt
  fs.appendFile('log.txt', 'URL: ' + addr + '\nTimestamp: ' + new Date() + '\n\n', 
  (err) => {
    if (err) {
      console.log('Error writing to log.txt:',err);
    } else {
      console.log('Added to log.');
    }
  });

  // Determine the file path based on the request URL
  if (q.pathname.includes('documentation')) {
    filePath = (__dirname + '/documentation.html');
  } else {
    filePath = 'index.html';
  }

  // Read and return the requested file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      throw err;
    }

    console.log('Serving file:', filePath);  // Log the file being served
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.write(data);
    response.end();
  });

}).listen(8080);

console.log('My test server is running on Port 8080.');
