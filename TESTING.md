# Testing Guide - Suite Marketing Ecommerce

## Overview

This document provides comprehensive guidelines for testing the Suite Marketing Ecommerce platform. Our testing strategy ensures quality across the full stack: backend API, frontend client, and integrations.

## Project Structure

```
suite-marketing-ecommerce/
├── server/                 # Backend (Express.js)
│   ├── models/            # Data models
│   ├── routes/            # API routes
│   ├── middleware/        # Express middleware
│   └── index.js           # Server entry point
├── client/                # Frontend (React/Vue)
│   ├── components/        # UI components
│   ├── pages/             # Page components
│   └── utils/             # Client utilities
└── tests/
    ├── unit/
    │   ├── backend/       # Backend unit tests
    │   └── frontend/      # Frontend unit tests
    ├── integration/
    │   ├── backend/       # Backend integration tests
    │   └── frontend/      # Frontend integration tests
    └── e2e/               # End-to-end tests (Playwright)
```

## Test Coverage Goals

| Area | Minimum Coverage | Target Coverage | Priority |
|------|------------------|-----------------|----------|
| Backend Models | 75% | 90%+ | High |
| API Routes | 80% | 90%+ | Critical |
| Middleware | 85% | 95%+ | Critical |
| Frontend Components | 70% | 85%+ | High |
| Frontend Utils | 75% | 85%+ | Medium |
| Integration Flows | 70% | 80%+ | High |

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Generate Coverage Report
```bash
npm run test:coverage
```

### Backend Tests Only
```bash
npm run test:backend
```

### Frontend Tests Only
```bash
npm run test:frontend
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### End-to-End Tests
```bash
npm run test:e2e
```

## Testing Categories

### 1. Backend Unit Tests

**Focus areas:**
- Models and data validation
- Utility functions
- Business logic

**Location:** `tests/unit/backend/`

**Example: User Model Testing**
```javascript
describe('User Model', () => {
  test('should create user with valid data', () => {
    const user = new User({
      email: 'test@example.com',
      password: 'SecurePass123'
    });
    expect(user.email).toBe('test@example.com');
  });

  test('should throw error for missing email', () => {
    expect(() => new User({ password: 'pass' }))
      .toThrow('Email and password are required');
  });
});
```

### 2. Backend Integration Tests

**Focus areas:**
- API endpoints
- Database interactions
- Middleware behavior
- Error handling

**Location:** `tests/integration/backend/`

**Example: API Route Testing**
```javascript
const request = require('supertest');
const app = require('../../server/index');

describe('POST /api/users', () => {
  test('should create a new user', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123'
      });
    
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('test@example.com');
  });

  test('should return 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        email: 'invalid',
        password: 'SecurePass123'
      });
    
    expect(res.status).toBe(400);
  });
});
```

### 3. Frontend Unit Tests

**Focus areas:**
- Component rendering
- User interactions
- State management
- Props validation

**Location:** `tests/unit/frontend/`

### 4. Frontend Integration Tests

**Focus areas:**
- Component interactions
- API mocking
- Form submissions
- Navigation

**Location:** `tests/integration/frontend/`

### 5. End-to-End Tests

**Focus areas:**
- Complete user workflows
- Real browser interactions
- Visual verification
- Cross-browser compatibility

**Location:** `tests/e2e/`

**Example: Checkout Flow**
```javascript
test('should complete checkout flow', async ({ page }) => {
  // Navigate and login
  await page.goto('http://localhost:3000/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'SecurePass123');
  await page.click('[type="submit"]');
  
  // Add product to cart
  await page.goto('http://localhost:3000/products/1');
  await page.click('[data-testid="add-to-cart"]');
  
  // Checkout
  await page.goto('http://localhost:3000/checkout');
  await page.fill('[name="cardNumber"]', '4532015112830366');
  await page.click('[data-testid="place-order"]');
  
  // Verify success
  await expect(page).toHaveURL(/.*\/order-success/);
});
```

## Testing Patterns

### Backend: Using Supertest

```javascript
const request = require('supertest');
const app = require('../../server/index');

describe('User API', () => {
  test('should fetch user profile', async () => {
    const res = await request(app)
      .get('/api/users/123')
      .set('Authorization', 'Bearer token123');
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email');
  });
});
```

### Frontend: Using Testing Library

```javascript
import { render, screen, fireEvent } from '@testing-library/dom';
import { LoginForm } from '../../client/components/LoginForm';

describe('LoginForm', () => {
  test('should submit form with valid data', async () => {
    render(LoginForm);
    
    fireEvent.change(screen.getByName('email'), {
      target: { value: 'test@example.com' }
    });
    
    fireEvent.click(screen.getByText('Login'));
    
    expect(screen.getByText('Welcome')).toBeInTheDocument();
  });
});
```

## Mocking Strategies

### Mocking Database
```javascript
jest.mock('../../../server/db', () => ({
  findUser: jest.fn(),
  createUser: jest.fn(),
}));
```

### Mocking External APIs
```javascript
global.fetch = jest.fn()
  .mockResolvedValue({
    ok: true,
    json: async () => ({ data: 'response' })
  });
```

### Mocking Modules
```javascript
jest.mock('../../../server/mail', () => ({
  sendEmail: jest.fn().mockResolvedValue(true)
}));
```

## Critical Paths (High Priority)

### Authentication
- [ ] User registration with validation
- [ ] Email verification
- [ ] Login with correct credentials
- [ ] Login with incorrect credentials
- [ ] Password reset flow
- [ ] Token generation and validation
- [ ] Logout and session cleanup

### User Management
- [ ] Create user account
- [ ] Update user profile
- [ ] Change password
- [ ] Delete account
- [ ] User permissions/roles

### Products & Catalog
- [ ] Fetch product list
- [ ] Get product details
- [ ] Search products
- [ ] Filter and sort
- [ ] Pagination

### Cart & Checkout
- [ ] Add item to cart
- [ ] Remove item
- [ ] Update quantities
- [ ] Calculate totals
- [ ] Apply discounts
- [ ] Apply shipping
- [ ] Place order

### Payment Processing
- [ ] Validate card details
- [ ] Process payment
- [ ] Handle payment failures
- [ ] Generate receipt
- [ ] Process refunds
- [ ] Track transactions

### Admin Functions
- [ ] Create/update products
- [ ] Manage inventory
- [ ] View orders
- [ ] Manage users
- [ ] Generate reports

## Best Practices

### 1. Test Organization
- Use nested `describe` blocks for clear hierarchy
- Keep test names descriptive and action-oriented
- Group related tests together

```javascript
describe('User API', () => {
  describe('POST /users', () => {
    test('should create user with valid data', () => {});
    test('should reject invalid email', () => {});
  });
  
  describe('GET /users/:id', () => {
    test('should return user data', () => {});
  });
});
```

### 2. Assertion Clarity
```javascript
// Good
expect(user.email).toBe('test@example.com');
expect(response.status).toBe(201);

// Less clear
expect(user.email === 'test@example.com').toBe(true);
expect(response.status === 201).toBe(true);
```

### 3. Test Data Factories
```javascript
function createTestUser(overrides = {}) {
  return {
    email: 'test@example.com',
    password: 'SecurePass123',
    firstName: 'Test',
    ...overrides
  };
}

test('should update user', () => {
  const user = new User(createTestUser());
  user.updateProfile({ firstName: 'Updated' });
  expect(user.firstName).toBe('Updated');
});
```

### 4. Setup and Teardown
```javascript
describe('User Tests', () => {
  beforeEach(() => {
    // Reset state before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    jest.clearAllMocks();
  });
});
```

### 5. Async Testing
```javascript
// With async/await
test('should fetch user', async () => {
  const user = await getUserById(123);
  expect(user.id).toBe(123);
});

// With promises
test('should fetch user', () => {
  return getUserById(123).then(user => {
    expect(user.id).toBe(123);
  });
});

// With jest matchers
test('should fetch user', () => {
  return expect(getUserById(123))
    .resolves.toHaveProperty('id');
});
```

## Code Coverage

### View Coverage Report
```bash
npm run test:coverage
```

### HTML Report
```bash
npm run test:coverage:report
```

### Coverage Thresholds
- **Global:** 70% branches, functions, lines, statements
- **Middleware:** 85% coverage required
- **API Routes:** 80% coverage required

Failed coverage thresholds will fail CI/CD pipeline.

## Continuous Integration

### Before Merging
- ✅ All tests passing
- ✅ Coverage thresholds met
- ✅ No console errors/warnings
- ✅ Code review approval

### Test Environment
- Node.js version specified in package.json
- Database reset between test runs
- Isolated test instances

## Debugging Tests

### Run Single Test
```bash
jest tests/unit/backend/User.test.js
```

### Run Tests Matching Pattern
```bash
jest --testNamePattern="should create user"
```

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Verbose Output
```bash
jest --verbose
```

## Common Issues

### Issue: Async timeout
**Solution:** Increase timeout
```javascript
test('slow operation', async () => {
  // test code
}, 10000); // 10 seconds
```

### Issue: Mock not applied
**Solution:** Mock before import
```javascript
jest.mock('../module');
const module = require('../module');
```

### Issue: Port already in use
**Solution:** Use dynamic ports
```javascript
const PORT = process.env.TEST_PORT || 3001;
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest](https://github.com/visionmedia/supertest)
- [Testing Library](https://testing-library.com/)
- [Playwright](https://playwright.dev/)

## Getting Help

For testing questions:
1. Review existing tests in the codebase
2. Check official documentation
3. Discuss in code reviews
4. Ask the team for guidance
