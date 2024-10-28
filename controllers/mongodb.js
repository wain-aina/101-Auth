require("dotenv").config();
const mongoose = require('mongoose');

const localConnection = "mongodb://" + process.env.LOCATION + ":27017/" + process.env.DB_NAME;

mongoose.set('strictQuery', true);

(async () => {
    try {
        await mongoose.connect(localConnection);
        console.log('Connected to local MongoDB instance');
    } catch (error) {
        console.error('Error connecting to local instance');
    }
})();

module.exports = mongoose;