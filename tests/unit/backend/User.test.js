const User = require('../../../server/models/User');

describe('User Model', () => {
  const validUserData = {
    email: 'test@example.com',
    password: 'SecurePass123',
    firstName: 'John',
    lastName: 'Doe',
  };

  describe('constructor', () => {
    test('should create a user with valid data', () => {
      const user = new User(validUserData);

      expect(user.email).toBe('test@example.com');
      expect(user.password).toBe('SecurePass123');
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeDefined();
    });

    test('should throw error if email is missing', () => {
      expect(() => new User({ password: 'SecurePass123' })).toThrow('Email and password are required');
    });

    test('should throw error if password is missing', () => {
      expect(() => new User({ email: 'test@example.com' })).toThrow('Email and password are required');
    });

    test('should normalize email to lowercase', () => {
      const user = new User({ ...validUserData, email: 'TEST@EXAMPLE.COM' });
      expect(user.email).toBe('test@example.com');
    });

    test('should generate UUID if id not provided', () => {
      const user = new User(validUserData);
      expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('static validation methods', () => {
    test('isValidEmail should accept valid emails', () => {
      expect(User.isValidEmail('test@example.com')).toBe(true);
      expect(User.isValidEmail('user+tag@domain.co.uk')).toBe(true);
    });

    test('isValidEmail should reject invalid emails', () => {
      expect(User.isValidEmail('invalid')).toBe(false);
      expect(User.isValidEmail('test@')).toBe(false);
      expect(User.isValidEmail('@example.com')).toBe(false);
    });

    test('isValidPassword should accept passwords >= 8 characters', () => {
      expect(User.isValidPassword('ValidPass1')).toBe(true);
      expect(User.isValidPassword('12345678')).toBe(true);
    });

    test('isValidPassword should reject short passwords', () => {
      expect(User.isValidPassword('Short1')).toBe(false);
      expect(User.isValidPassword('1234567')).toBe(false);
    });
  });

  describe('getProfile', () => {
    test('should return user profile without password', () => {
      const user = new User(validUserData);
      const profile = user.getProfile();

      expect(profile.email).toBe('test@example.com');
      expect(profile.firstName).toBe('John');
      expect(profile.lastName).toBe('Doe');
      expect(profile.password).toBeUndefined();
      expect(profile.id).toBeDefined();
    });
  });

  describe('updateProfile', () => {
    test('should update user profile', () => {
      const user = new User(validUserData);
      const updated = user.updateProfile({
        firstName: 'Jane',
        lastName: 'Smith',
      });

      expect(updated.firstName).toBe('Jane');
      expect(updated.lastName).toBe('Smith');
      expect(user.updatedAt).not.toEqual(user.createdAt);
    });

    test('should only update provided fields', () => {
      const user = new User(validUserData);
      const originalLastName = user.lastName;
      user.updateProfile({ firstName: 'Jane' });

      expect(user.firstName).toBe('Jane');
      expect(user.lastName).toBe(originalLastName);
    });

    test('should update updatedAt timestamp', () => {
      const user = new User(validUserData);
      const originalUpdatedAt = user.updatedAt;

      // Wait a tiny bit to ensure timestamp difference
      user.updateProfile({ firstName: 'Updated' });

      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('validatePassword', () => {
    test('should validate correct password', () => {
      const user = new User(validUserData);
      expect(user.validatePassword('SecurePass123')).toBe(true);
    });

    test('should reject incorrect password', () => {
      const user = new User(validUserData);
      expect(user.validatePassword('WrongPassword')).toBe(false);
    });

    test('should be case-sensitive', () => {
      const user = new User(validUserData);
      expect(user.validatePassword('securepass123')).toBe(false);
    });
  });
});
