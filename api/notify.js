export default async function handler(req, res) {
  // We only allow GET or POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const response = await fetch('https://gibl.finpos.global/finpos/web-api/tms-platform/v1/public/txn/fonepay/notify', {
      method: 'POST',
      headers: {
        'Subscription-Key': 'bd3f59b9902a46b4a933691ec0f94a31',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        terminalId: "2222030020699026",
        merchantId: "2222030020699026",
        amount: 19
      })
    });

    const data = await response.text();
    
    // Return a success response so cron-job.org knows it worked
    return res.status(200).json({ 
      success: true, 
      message: "Fonepay notify request sent successfully",
      apiResponse: data 
    });

  } catch (error) {
    console.error("Error sending request:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
