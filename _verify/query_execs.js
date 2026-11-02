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
    const loginResp = JSON.parse(body);
    const token = loginResp.access_token;
    console.log('Login OK, token:', token.substring(0, 20) + '...');
    
    // Get upcoming appointments
    const apptReq = http.request({
      hostname: 'backend-app-1', 
      port: 8000, 
      path: '/api/v1/appointments/upcoming', 
      method: 'GET', 
      headers: {'Authorization': 'Bearer ' + token}
    }, (res2) => {
      let body2 = '';
      res2.on('data', (chunk) => body2 += chunk);
      res2.on('end', () => {
        const appts = JSON.parse(body2);
        console.log('Appointments count:', appts.length);
        for (const a of appts) {
          console.log('  id=' + a.id + ' patient_id=' + a.patient_id + ' scheduled_at=' + a.scheduled_at + ' status=' + a.status + ' reason=' + a.reason);
        }
        process.exit(0);
      });
    });
    apptReq.on('error', (e) => console.log('Appt req error:', e.message));
    apptReq.end();
  });
});
loginReq.on('error', (e) => console.log('Login error:', e.message));
loginReq.write(loginData);
loginReq.end();