const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service:'gmail',
    host: 'smtp.gmail.com',
    secure: true,
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_APP_PASS
    },
});

module.exports = transporter;