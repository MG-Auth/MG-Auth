const express = require('express');
const nodemailer = require("nodemailer");
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 5000;

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

app.get('/mail/:email', (req,res)=>{
const mailOptions = {
from: "MG Auth",
to: req.params.email,
subject: "Magic link to Sign you Up",
html: "your link is https://magarevedant.vercel.app/"
}
transporter.sendMail(mailOptions, (error, info) => {
if (error) {
res.send(error);
} else {
res.send("Email sent: " + info.response)
}
})
})

// Start the server
app.listen(PORT, '0.0.0.0', () => {
console.log(`Server is running at http://0.0.0.0:${PORT}`);
});

