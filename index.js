const express = require('express');
const nodemailer = require("nodemailer");
const path = require('path');
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

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Send index.html on root URL
app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/page/:page', (req, res) => {
  try {
    const page = decodeURIComponent(req.params.page);
    const data = JSON.parse(page);  // <-- fixed typo here
    const page_code = fs.readFileSync("./login_page.html", "utf-8");

    // Fixed typo in "brand_logo"
    const branded_page = page_code
      .replace("{{brand_name}}", data.brand_name)
      .replace("{{brand_logo}}", data.brand_logo);

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
createdAt: Date.now()
});

const verifyLink = `${req.protocol}://${req.get('host')}/verify?token=${token}`;

const mailOptions = {
from: "MG Auth",
to: req.body.email,
subject: "Magic link to Sign you Up",
html: `<p>Click the link below to verify your email:</p><a href="${verifyLink}">Verify Email</a><p>This link expires in 10 minutes.</p>`
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
return res.status(404).json({ error: 'Invalid token' });
}

// Check if token has expired
if (Date.now() > tokenData.expiresAt) {
tokenStore.delete(token); // Clean up expired token
return res.status(401).json({ error: 'Token has expired' });
}

// Token is valid - Set cookies accessible to third-party websites
res.cookie('auth_token', token, {
maxAge: 24 * 60 * 60 * 1000, // 24 hours
httpOnly: false, // Allow JavaScript access
secure: false, // Set to true in production with HTTPS
sameSite: 'None', // Allow third-party access
domain: undefined // Allow subdomain access
});

res.cookie('user_email', tokenData.email, {
maxAge: 24 * 60 * 60 * 1000, // 24 hours
httpOnly: false, // Allow JavaScript access
secure: false, // Set to true in production with HTTPS
sameSite: 'None', // Allow third-party access
domain: undefined // Allow subdomain access
});

res.cookie('verified', 'true', {
maxAge: 24 * 60 * 60 * 1000, // 24 hours
httpOnly: false, // Allow JavaScript access
secure: false, // Set to true in production with HTTPS
sameSite: 'None', // Allow third-party access
domain: undefined // Allow subdomain access
});

res.json({
message: 'Token verified successfully',
email: tokenData.email,
issuedAt: new Date(tokenData.createdAt).toISOString(),
expiresAt: new Date(tokenData.expiresAt).toISOString(),
cookiesSet: true
});

// Optionally remove token after verification (one-time use)
// tokenStore.delete(token);
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

