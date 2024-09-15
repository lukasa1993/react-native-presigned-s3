const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// Create an HTTP server
const server = http.createServer((req, res) => {
  const timestamp = new Date().toISOString().replace(/:/g, '-')
  const uniqueId = crypto.randomUUID()

  // Create a unique file name using the timestamp and UUID
  const fileName = `request-${timestamp}-${uniqueId}.log`
  const filePath = path.join(__dirname, 'logs', fileName)

  const logEntry = []

  // Capture request details
  const logData = `Received ${req.method} request\nHeaders: ${JSON.stringify(req.headers, null, 2)}\n`
  logEntry.push(logData)

  let body = ''

  // Listen for data event to capture the body of the request (if any)
  req.on('data', (chunk) => {
    body += chunk
  })

  // End event signifies the end of the data stream
  req.on('end', () => {
    // Log the body of the request
    if (body) {
      const bodyLog = `Body: ${body}\n`
      logEntry.push(bodyLog)
    } else {
      const noBodyLog = 'No body received\n'
      logEntry.push(noBodyLog)
    }

    // Ensure the 'logs' directory exists
    fs.mkdir(path.join(__dirname, 'logs'), { recursive: true }, (err) => {
      if (err) {
        console.error('Failed to create logs directory:', err)
      } else {
        // Write each request's details to a separate file
        fs.writeFile(filePath, logEntry.join(''), (err) => {
          if (err) {
            console.error('Failed to write to log file:', err)
          } else {
            console.log(`Request logged to file: ${fileName}`)
          }
        })
      }
    })

    // Send a simple response back to the client
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/plain')
    res.end('Request received and logged to a file')
  })
})

// Define the port to listen on
const PORT = 3000

// Start the server
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
