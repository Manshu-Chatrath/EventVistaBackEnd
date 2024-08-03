export const otpEmailContent = (otp: string) => `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OTP Email</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }

    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #fff;
      padding: 20px;
      border-radius: 5px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }

    h1 {
      color: #333;
    }

    p {
      color: #555;
    }

    .otp {
      font-size: 24px;
      font-weight: bold;
      color: #007bff;
      letter-spacing: 2px;
    }
  </style>
</head>

<body>
  <div class="container">
    <h1>OTP Verification</h1>
    <p>Dear User,</p>
    <p>Your One-Time Password (OTP) and is valid for 2 minutes 45 seconds for verification is:</p>
    <p class="otp">${otp}</p>
    <p>Please use this OTP to complete the verification process.</p>
    <p>Thank you for using our service!</p>
  </div>
</body>

</html>`;
