const Student = require('../models/Student');

exports.getAllStudents = async (req, res) => {
  try {
    const { class: cls, section, search } = req.query;
    const filter = { isActive: true };
    if (cls) filter.class = cls;
    if (section) filter.section = section;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const students = await Student.find(filter).select('-password -faceDescriptor');
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('-password');
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.password;
    if (req.file) updates.photo = `/uploads/${req.file.filename}`;

    const student = await Student.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.saveFaceDescriptor = async (req, res) => {
  try {
    const { faceDescriptor } = req.body;
    if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
      return res.status(400).json({ message: 'Invalid face descriptor' });
    }
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { faceDescriptor },
      { new: true }
    ).select('-password');
    res.json({ message: 'Face descriptor saved', student });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    await Student.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Student deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateNotificationPreferences = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.userId,
      { notificationPreferences: req.body },
      { new: true }
    ).select('-password');
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
