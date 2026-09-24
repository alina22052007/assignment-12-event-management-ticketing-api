const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebaseConfig');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_for_development_only';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Register a new user (Attendee or Organizer)
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validation: Required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'All fields (name, email, password, role) are required.'
      });
    }

    // Validation: Role checking
    const normalizedRole = role.toLowerCase().trim();
    if (!['attendee', 'organizer'].includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified. Role must be either 'attendee' or 'organizer'."
      });
    }

    // Validation: Email format & Password strength
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format provided.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check if user with this email already exists
    const usersRef = db.collection('users');
    const existingSnapshot = await usersRef.where('email', '==', email.toLowerCase().trim()).get();

    if (!existingSnapshot.empty) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user in Firestore
    const newUserRef = usersRef.doc();
    const createdAt = new Date().toISOString();
    const userData = {
      id: newUserRef.id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: normalizedRole,
      createdAt
    };

    await newUserRef.set(userData);

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newUserRef.id,
        email: userData.email,
        role: userData.role,
        name: userData.name
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return sanitized response (without password)
    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      data: {
        user: {
          id: newUserRef.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          createdAt: userData.createdAt
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error during registration.'
    });
  }
};

/**
 * Authenticate user and issue JWT
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const usersRef = db.collection('users');
    const userSnapshot = await usersRef.where('email', '==', email.toLowerCase().trim()).limit(1).get();

    if (userSnapshot.empty) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, userData.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: userDoc.id,
        email: userData.email,
        role: userData.role,
        name: userData.name
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      data: {
        user: {
          id: userDoc.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          createdAt: userData.createdAt
        },
        token
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error during login.'
    });
  }
};

/**
 * Get current authenticated user profile
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    const userData = userDoc.data();

    return res.status(200).json({
      success: true,
      data: {
        id: userDoc.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        createdAt: userData.createdAt
      }
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error fetching user profile.'
    });
  }
};
