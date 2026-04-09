const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  subject: { type: String, required: true },
  employeeId: { type: String, required: true, unique: true },
  department: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  pushSubscription: { type: Object, default: null },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
  },
  createdAt: { type: Date, default: Date.now },
});

teacherSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

teacherSchema.methods.matchPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Teacher', teacherSchema);
