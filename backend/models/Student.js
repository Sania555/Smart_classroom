const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  photo: { type: String, default: '' },
  faceDescriptor: { type: [Number], default: [] },
  class: { type: String, required: true, trim: true, uppercase: true },
  section: { type: String, default: 'A', trim: true, uppercase: true },
  rollNumber: { type: String, required: true, unique: true },
  department: { type: String, default: '' },
  batch: { type: String, default: '' },
  parentEmail: { type: String, default: '' },
  parentPhone: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
  },
  pushSubscription: { type: Object, default: null },
  createdAt: { type: Date, default: Date.now },
});

studentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

studentSchema.methods.matchPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Student', studentSchema);
