// models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  address: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  ethereumAddress: { type: String, required: true },
  role: { type: String, default: 'User' },
  isApproved: { type: Boolean, default: false },
  fernetKey: { type: String, required: true }
});

module.exports = mongoose.model('User', userSchema);
