const express = require('express');
const nodemailer = require("nodemailer");
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = 5000;

// In-memory token storage (use database in production)
const tokenStore = new Map();

const transporter = nodemailer.createTransport({
service: "gmail",
auth: {
user: process.env.EMAIL,
pass: process.env.PASSWORD,
}
})

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Token generate 
const jwt = require("jsonwebtoken");

function JWT(user_email) {
  return jwt.sign(
    {
      email: user_email,
      iss: "mg-auth"
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/generate', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'generate.html'));
})

app.get('/token_verify', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verify_page.html'));
})

// GET /verify?token=...
app.get('/verify_token', (req, res) => {
  const token = req.query.token;

  if (!token) return res.status(400).json({ valid: false, error: "Token missing" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      valid: true,
      email: decoded.email,
      exp: decoded.exp
    });
  } catch (err) {
    res.status(401).json({ valid: false, error: err.message});
  }
});

// Send index.html on root URL
app.get('/page/:page', (req, res) => {
  try {
    const page = decodeURIComponent(req.params.page);
    const data = JSON.parse(page); 
    const page_code = fs.readFileSync("public/login_page.html", "utf-8");

    let branded_page;

    if (data.brand_logo && data.brand_name && data.url) {
      branded_page = page_code
        .replace("{{brand_name}}", data.brand_name)
        .replace("{{brand_logo}}", data.brand_logo)
        .replace("{{url}}", data.url);
    } else {
      branded_page = page_code;
    }

    res.send(branded_page);
  } catch (err) {
    res.status(400).send("Invalid request: " + err.message);
  }
});

app.post('/mail', (req,res)=>{
// Generate unique token
const token = crypto.randomBytes(32).toString('hex');
const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes from now

// Store token with email and expiration
tokenStore.set(token, {
email: req.body.email,
expiresAt: expiresAt,
createdAt: Date.now(),
  url: req.body.url
});

const verifyLink = `${req.protocol}://${req.get('host')}/verify?token=${token}`;
const email_body_code = fs.readFileSync("email.html","utf-8");
  const email_body = email_body_code.replace("{{link}}", verifyLink).replace("{{link}}", verifyLink).replace("{{link}}", verifyLink);
  
const mailOptions = {
from: "MG Auth",
to: req.body.email,
subject: "Magic link to Sign you Up",
html: email_body
}

transporter.sendMail(mailOptions, (error, info) => {
if (error) {
res.send(error);
} else {
res.json({ 
message: "Email sent successfully", 
token: token,
expiresIn: "10 minutes"
});
}
})
})

// Token verification endpoint
app.get('/verify', (req, res) => {
const { token } = req.query;

if (!token) {
return res.status(400).json({ error: 'Token is required' });
}

const tokenData = tokenStore.get(token);

if (!tokenData) {
return res.sendFile(path.join(__dirname, 'public', 'invalid.html'));
}

// Check if token has expired
if (Date.now() > tokenData.expiresAt) {
tokenStore.delete(token); // Clean up expired token
  return res.sendFile(path.join(__dirname, 'public', 'invalid.html'));
}

// Token is valid
  const jwtToken = JWT(tokenData.email);
  console.log(jwtToken);
  tokenData.url = tokenData.url + "?token=" + jwtToken;
res.redirect(tokenData.url);
  
// remove token after verification (one-time use)
 tokenStore.delete(token);
});

// Endpoint to check token validity without consuming it
app.post('/verify', (req, res) => {
const { token } = req.body;

if (!token) {
return res.status(400).json({ error: 'Token is required' });
}

const tokenData = tokenStore.get(token);

if (!tokenData) {
return res.status(404).json({ error: 'Invalid token' });
}

if (Date.now() > tokenData.expiresAt) {
tokenStore.delete(token);
return res.status(401).json({ error: 'Token has expired' });
}

res.json({
valid: true,
email: tokenData.email,
expiresAt: new Date(tokenData.expiresAt).toISOString()
});
});

// Clean up expired tokens periodically
setInterval(() => {
const now = Date.now();
for (const [token, data] of tokenStore.entries()) {
if (now > data.expiresAt) {
tokenStore.delete(token);
}
}
}, 5 * 60 * 1000); // Clean up every 5 minutes

// Start the server
app.listen(PORT, '0.0.0.0', () => {
console.log(`Server is running at http://0.0.0.0:${PORT}`);
});

