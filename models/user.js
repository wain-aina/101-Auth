const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: String,
    identifier: String,
    password: String,
    isVerified: {default: false, type: Boolean},
    resetPasswordToken: String,
    resetPasswordExpires: Date
});

const User = new mongoose.model("User", userSchema);
module.exports = User;