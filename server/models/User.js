// User model
const { v4: uuidv4 } = require('uuid');

class User {
  constructor(data) {
    if (!data.email || !data.password) {
      throw new Error('Email and password are required');
    }

    this.id = data.id || uuidv4();
    this.email = data.email.toLowerCase();
    this.password = data.password; // In production, should be hashed
    this.firstName = data.firstName || '';
    this.lastName = data.lastName || '';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidPassword(password) {
    return password && password.length >= 8;
  }

  getProfile() {
    const { password, ...profile } = this;
    return profile;
  }

  updateProfile(data) {
    if (data.firstName !== undefined) this.firstName = data.firstName;
    if (data.lastName !== undefined) this.lastName = data.lastName;
    this.updatedAt = new Date();
    return this.getProfile();
  }

  validatePassword(password) {
    return this.password === password;
  }
}

module.exports = User;
