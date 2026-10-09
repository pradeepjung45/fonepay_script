export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ALERT_CHANNEL = 'fonepay_alerts_pradeep_4599'; 

  async function sendAlert(title, message) {
    await fetch(`https://ntfy.sh/${ALERT_CHANNEL}`, {
        method: 'POST',
        body: message,
        headers: { 'Title': title, 'Tags': 'warning,rotating_light' }
    });
  }

  /*
  // Device 1 (GIBL)
  const device1 = {
    url: 'https://gibl.finpos.global/finpos/web-api/tms-platform/v1/public/txn/fonepay/notify',
    body: { terminalId: "2222030020699026", merchantId: "2222030020699026", amount: 10 }
  };
  */

  // Device 2 (Staging)
  const device2 = {
    url: 'https://staging.finpos.global/web-api/tms-platform/v1/public/txn/fonepay/notify',
    body: { terminalId: "2222030020699026", merchantId: "2222030020699026", amount: 10 }
  };

  const headers = {
    'Subscription-Key': 'bd3f59b9902a46b4a933691ec0f94a31',
    'Content-Type': 'application/json'
  };

  // Function to ping a specific device
  async function pingDevice(device) {
    try {
      const response = await fetch(device.url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(device.body)
      });
      const data = await response.text();
      
      let isHealthy = false;
      try {
          const parsedData = JSON.parse(data);
          if (parsedData.responseCode === "0") isHealthy = true;
      } catch(e) {}
      
      return { 
        terminalId: device.body.terminalId, 
        success: isHealthy, 
        response: data, 
        error: null 
      };
    } catch (error) {
      return { 
        terminalId: device.body.terminalId, 
        success: false, 
        response: null, 
        error: error.message 
      };
    }
  }

  try {
    // Run both requests at the exact same time (Parallel)
    const results = await Promise.all([
      // pingDevice(device1),

      pingDevice(device2)
    ]);
    
    let allHealthy = true;
    let failedDevices = [];
    
    // Check if any of them failed
    for (const r of results) {
       if (!r.success) {
           allHealthy = false;
           failedDevices.push(r);
       }
    }

    // If one or both fail, send alert and return 500
    if (!allHealthy) {
        let errorMsg = failedDevices.map(d => `Device ${d.terminalId} failed: ${d.error || d.response}`).join('\n\n');
        await sendAlert(
          'Device Error Alert', 
          `⚠️ One or more Fonepay devices failed!\n\n${errorMsg}`
        );
        
        return res.status(500).json({ 
          success: false, 
          error: "One or more devices returned a non-zero response code",
          results: results 
        });
    }
    
    // If both succeed, return 200 OK
    return res.status(200).json({ 
      success: true, 
      deviceStatus: "ALL_ONLINE",
      results: results 
    });

  } catch (error) {
    await sendAlert('Fonepay API Down', `🚨 CRITICAL Error running script: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
}
