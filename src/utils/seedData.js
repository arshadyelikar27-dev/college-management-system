require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Admission = require('../models/Admission');
const Payment = require('../models/Payment');
const Notice = require('../models/Notice');
const Material = require('../models/Material');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/collegeDB';

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // 1. Clear existing data (be careful with this for real projects!)
    // For demo purpose, we only add if not present, but for a "clean" demo it's better to start fresh or just add.
    // Let's just add.

    // 2. Add Courses
    const coursesData = [
      { name: 'Information Technology', code: 'IT-101', description: 'Degree in Information Technology & Systems', duration: '4 Years', fee: 55000 },
      { name: 'Computer Science', code: 'CS-102', description: 'Core Computing and Algorithms', duration: '4 Years', fee: 60000 },
      { name: 'Mechanical Engineering', code: 'ME-103', description: 'Core Mechanical and Design', duration: '4 Years', fee: 45000 },
      { name: 'Civil Engineering', code: 'CE-104', description: 'Infrastructure and Design', duration: '4 Years', fee: 40000 },
      { name: 'Electrical Engineering', code: 'EE-105', description: 'Electrical and Electronics Systems', duration: '4 Years', fee: 48000 },
      { name: 'Business Administration', code: 'BBA-201', description: 'Management and Business Operations', duration: '3 Years', fee: 35000 }
    ];

    const savedCourses = [];
    for (const c of coursesData) {
      let existing = await Course.findOne({ code: c.code });
      if (!existing) {
        existing = await Course.create(c);
        console.log(`Created course: ${c.name}`);
      }
      savedCourses.push(existing);
    }

    const itCourse = savedCourses.find(c => c.name === 'Information Technology');

    // 3. Add Demo Student: Sahil Khan
    const sahilEmail = 'sahil@example.com';
    let sahil = await User.findOne({ email: sahilEmail });
    if (!sahil) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      sahil = await User.create({
        name: 'Sahil Khan',
        email: sahilEmail,
        password: hashedPassword,
        role: 'student',
        phone: '1122334455',
        address: 'Latur',
        bloodGroup: 'B+',
        enrollNumber: `ENR${Math.floor(Math.random() * 90000) + 10000}`
      });
      console.log('Created student: Sahil Khan');
    }

    // 4. Add Admission for Sahil in IT
    let sahilAdmission = await Admission.findOne({ studentId: sahil._id, courseId: itCourse._id });
    if (!sahilAdmission) {
      sahilAdmission = await Admission.create({
        studentId: sahil._id,
        studentName: sahil.name,
        courseId: itCourse._id,
        courseName: itCourse.name,
        personalDetails: {
          fullName: 'Sahil Khan',
          phone: '1122334455',
          dob: '2005-05-15',
          address: 'Latur',
          prevSchool: 'Latur Model School',
          marks: '80'
        },
        status: 'Paid', // Fulfills "Fees Paid" and "Enroll in IT" requirements
        appliedAt: new Date()
      });
      console.log('Created admission for Sahil in IT');
    }

    // 5. Add Payment for Sahil Admission
    let payment = await Payment.findOne({ admissionId: sahilAdmission._id });
    if (!payment) {
      payment = await Payment.create({
        admissionId: sahilAdmission._id,
        studentId: sahil._id,
        courseName: itCourse.name,
        amount: String(itCourse.fee + 500), // Fee + Tax
        status: 'success',
        paymentId: 'PAYID_' + Math.random().toString(36).substring(7).toUpperCase(),
        orderId: 'ORDER_' + Math.random().toString(36).substring(7).toUpperCase(),
        date: new Date()
      });
      
      // Update admission status just in case
      sahilAdmission.paymentId = payment.paymentId;
      sahilAdmission.status = 'Approved'; // Setting to Approved so student can access LMS
      await sahilAdmission.save();
      console.log('Recorded fee payment for Sahil');
    }

    // 6. Add Notices
    const noticesData = [
      { title: 'Welcome Sahil!', content: 'Welcome to CollegeHub! We are glad to have you on board.', type: 'Info' },
      { title: 'Academic Calendar 2026', content: 'Our new academic year starts on August 15th.', type: 'Info' },
      { title: 'Exam Schedule Out', content: 'The semester exam schedule is now posted on your portal.', type: 'Exam' },
      { title: 'Summer Holiday', content: 'The college will be closed for summer break from June to July.', type: 'Holiday' }
    ];

    for (const n of noticesData) {
      const exists = await Notice.findOne({ title: n.title });
      if (!exists) {
        await Notice.create({ ...n, author: 'Administrator' });
        console.log(`Created notice: ${n.title}`);
      }
    }

    // 7. Add LMS Materials for each course
    for (const c of savedCourses) {
      const matExists = await Material.findOne({ title: `Introduction to ${c.name}` });
      if (!matExists) {
          await Material.create({
              title: `Introduction to ${c.name}`,
              courseId: c._id,
              description: `Standard starter notes and curriculum for the ${c.name} program.`,
              fileUrl: '#',
              fileName: 'syllabus.pdf'
          });
          console.log(`Created LMS material for: ${c.name}`);
      }
    }

    console.log('\n✅ Demo data seeded successfully!');

  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    mongoose.connection.close();
  }
};

seed();
