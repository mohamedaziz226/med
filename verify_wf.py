const http = require('http');

const loginData = JSON.stringify({email: 'admin@med.com', password: 'admin123'});

const loginReq = http.request({
  hostname: 'backend-app-1', 
  port: 8000, 
  path: '/api/v1/auth/login', 
  method: 'POST', 
  headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData)}
}, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    const token = JSON.parse(body).access_token;
    console.log('Token:', token.substring(0, 30) + '...');
    
    // Test the notifications endpoint
    const notifData = JSON.stringify({
      patient_id: 7,
      title: 'Test Notification',
      message: 'This is a test message',
      type: 'debt_reminder',
      related_entity_id: 22,
      related_entity_type: 'appointment',
      reminder_type: 'j15',
      dedup_key: 'appointment:7:22:j15'
    });
    
    const notifReq = http.request({
      hostname: 'backend-app-1', 
      port: 8000, 
      path: '/api/v1/notifications', 
      method: 'POST', 
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(notifData)
      }
    }, (res2) => {
      let body2 = '';
      res2.on('data', (chunk) => body2 += chunk);
      res2.on('end', () => {
        console.log('Notifications POST status:', res2.statusCode);
        console.log('Response:', body2.substring(0, 500));
        
        // Check if notifications were created
        const notifGetReq = http.request({
          hostname: 'backend-app-1', 
          port: 8000, 
          path: '/api/v1/notifications', 
          method: 'GET', 
          headers: {'Authorization': 'Bearer ' + token}
        }, (res3) => {
          let body3 = '';
          res3.on('data', (chunk) => body3 += chunk);
          res3.on('end', () => {
            console.log('Notifications GET status:', res3.statusCode);
            console.log('Notifications:', body3.substring(0, 1000));
            process.exit(0);
          });
        });
        notifGetReq.on('error', (e) => console.log('Notif get error:', e.message));
        notifGetReq.end();
      });
    });
    notifReq.on('error', (e) => console.log('Notif POST error:', e.message));
    notifReq.write(notifData);
    notifReq.end();
  });
});
loginReq.on('error', (e) => console.log('Login error:', e.message));
loginReq.write(loginData);
loginReq.end();