'use strict';
const mongoose = require('mongoose');
const Order = require('../models/Order');

async function connectDB(uri) {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    // unique is a database index, not a Mongoose validator. Wait for it as well.
    await Order.init();
    return mongoose.connection;
}

module.exports = connectDB;
