const express = require('express');
const nodemailer = require("nodemailer");
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
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

// Send brand configuration page on root URL
app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'brand-config.html'));
});

// Handle branded login pages
app.get('/login', (req, res) => {
const { brand } = req.query;
let brandData = null;

if (brand) {
    try {
        // Decode the brand data from URL
        const decodedData = Buffer.from(brand, 'base64').toString('utf-8');
        brandData = JSON.parse(decodedData);
    } catch (error) {
        console.error('Error decoding brand data:', error);
    }
}

// Read the base HTML file
const fs = require('fs');
let htmlContent = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf-8');

if (brandData) {
    // Replace placeholders with brand data
    htmlContent = htmlContent.replace(
        '<h1>MG Auth</h1>',
        `<h1>${brandData.company || 'MG Auth'}</h1>`
    );
    
    // Add logo if provided
    if (brandData.logo) {
        htmlContent = htmlContent.replace(
            '<h1>',
            `<img src="${brandData.logo}" alt="${brandData.company} Logo" style="height: 40px; margin-right: 10px; vertical-align: middle;"><h1 style="display: inline; vertical-align: middle;">`
        );
    }
    
    // Add brand data to the page for script.js to use
    htmlContent = htmlContent.replace(
        '<script src="script.js"></script>',
        `<script>window.brandData = ${JSON.stringify(brandData)};</script><script src="script.js"></script>`
    );
}

res.send(htmlContent);
});

app.post('/mail', (req,res)=>{
// Generate unique token
const token = crypto.randomBytes(32).toString('hex');
const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes from now

// Get redirect URL from brand data or default
const redirectUrl = req.body.redirect_url || (req.body.brandData ? req.body.brandData.redirect : null);

// Store token with email and expiration
tokenStore.set(token, {
email: req.body.email,
expiresAt: expiresAt,
createdAt: Date.now(),
redirect_url: redirectUrl
});

const verifyLink = `${req.protocol}://${req.get('host')}/verify?token=${token}`;

// Use company name from brand data if available
const companyName = req.body.brandData ? req.body.brandData.company : "MG Auth";

const mailOptions = {
from: companyName,
to: req.body.email,
subject: `Magic link to Sign you Up - ${companyName}`,
html: `<p>Click the link below to verify your email for ${companyName}:</p><a href="${verifyLink}">Verify Email</a><p>This link expires in 10 minutes.</p>`
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

// Token is valid - redirect to the specified URL

res.redirect(tokenData.redirect_url);

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
// verified - redirect to the specified URL

  res.redirect(tokenData.redirect_url);

  // remove token after verification (one-time use)
  tokenStore.delete(token);
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

