export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // The secret channel for your alerts
  const ALERT_CHANNEL = 'fonepay_alerts_pradeep_4599'; 

  async function sendAlert(title, message) {
    await fetch(`https://ntfy.sh/${ALERT_CHANNEL}`, {
        method: 'POST',
        body: message,
        headers: { 'Title': title, 'Tags': 'warning,rotating_light' }
    });
  }

  try {
    const response = await fetch('https://staging.finpos.global/web-api/tms-platform/v1/public/txn/fonepay/notify', {
      method: 'POST',
      headers: {
        'Subscription-Key': 'bd3f59b9902a46b4a933691ec0f94a31',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        terminalId: "22221000",
        merchantId: "2222100013436122",
        amount: 100
      })
    });

    const data = await response.text();
    let isHealthy = false;
    
    try {
        const parsedData = JSON.parse(data);
        // If Fonepay returns responseCode "0", we assume the device is online and healthy
        if (parsedData.responseCode === "0") {
            isHealthy = true;
        }
    } catch(e) {
        // Failed to parse JSON, something is wrong
    }

    // IF THE DEVICE IS OFFLINE OR RETURNS AN ERROR:
    if (!isHealthy) {
        await sendAlert(
          'Device Offline / Error Alert', 
          `⚠️ Fonepay Device 22221000 did not return a success code. It might be OFFLINE or off WiFi!\n\nAPI Response: ${data}`
        );
        
        // Return a 500 status so cron-job.org marks this run as FAILED (Red)
        return res.status(500).json({ 
          success: false, 
          error: "Device returned a non-zero response code",
          apiResponse: data 
        });
    }
    
    // IF SUCCESSFUL: return 200 OK so cron-job.org marks it as SUCCESS (Green)
    return res.status(200).json({ 
      success: true, 
      deviceStatus: "ONLINE",
      apiResponse: data 
    });

  } catch (error) {
    // If the Fonepay server itself crashes or is unreachable
    await sendAlert(
      'Fonepay API Down', 
      `🚨 CRITICAL: Cannot reach the Fonepay API at all. Error: ${error.message}`
    );

    // Return a 500 status so cron-job.org marks this run as FAILED (Red)
    return res.status(500).json({ success: false, error: error.message });
  }
}
