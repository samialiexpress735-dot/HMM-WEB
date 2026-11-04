import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateStudentPasscode,
  generateStaffPassword,
  authenticateUser,
  validateAdminSignup,
  verifyAdminCredentials,
  UserAccount
} from './authUtils';

test('validateAdminSignup validates field requirements', () => {
  const invalid = validateAdminSignup({
    fullName: 'Ab',
    email: 'bad-email',
    phone: '',
    roleTitle: 'Principal',
    moeCode: '',
    password: '123'
  });
  assert.equal(invalid.valid, false);

  const mismatch = validateAdminSignup({
    fullName: 'Principal Berhanu',
    email: 'director@hailemariammamo.edu.et',
    phone: '+251911425566',
    roleTitle: 'School Director',
    moeCode: 'HMM-MOE-2017',
    password: 'securepassword',
    confirmPassword: 'wrongpassword'
  });
  assert.equal(mismatch.valid, false);
  assert.equal(mismatch.error?.includes('do not match'), true);

  const valid = validateAdminSignup({
    fullName: 'Principal Berhanu Wolde',
    fullNameAmharic: 'አቶ ብርሃኑ ወልደ',
    email: 'director@hailemariammamo.edu.et',
    phone: '+251911425566',
    roleTitle: 'School Director',
    moeCode: 'HMM-MOE-2017',
    password: 'securepassword',
    confirmPassword: 'securepassword'
  });
  assert.equal(valid.valid, true);
});

test('generateStudentPasscode creates consistent Ethiopian student code format', () => {
  const code = generateStudentPasscode(9, 'A', 1);
  assert.equal(code, 'HMM-9A-001');

  const code12 = generateStudentPasscode(12, 'b', 42);
  assert.equal(code12, 'HMM-12B-042');
});

test('generateStaffPassword formats readable password', () => {
  const pass = generateStaffPassword('Teacher', 'Girma');
  assert.equal(pass, 'girma2017!');
});

test('authenticateUser checks credentials and status accurately', () => {
  const accounts: UserAccount[] = [
    {
      id: 'acc-1',
      username: 'admin',
      passwordHash: 'debberhan2017',
      fullName: 'Principal Berhanu Wolde',
      role: 'Admin',
      passcode: 'ADM-9988',
      status: 'Active',
      dateCreated: '2024-09-01'
    },
    {
      id: 'acc-2',
      username: 'HMM-2024-0901',
      studentId: 'HMM-2024-0901',
      passwordHash: 'abebe2017',
      fullName: 'Abebe Bikila Desta',
      role: 'Student',
      passcode: '9A-PASS-01',
      status: 'Active',
      dateCreated: '2024-09-01'
    },
    {
      id: 'acc-3',
      username: 'suspended_user',
      passwordHash: 'pass123',
      fullName: 'Suspended Account',
      role: 'Teacher',
      passcode: 'TCH-000',
      status: 'Suspended',
      dateCreated: '2024-09-01'
    }
  ];

  // Correct login
  const r1 = authenticateUser(accounts, 'admin', 'debberhan2017');
  assert.equal(r1.success, true);
  assert.equal(r1.account?.fullName, 'Principal Berhanu Wolde');

  // Login via studentId
  const r2 = authenticateUser(accounts, 'hmm-2024-0901', 'abebe2017');
  assert.equal(r2.success, true);
  assert.equal(r2.account?.role, 'Student');

  // Login via passcode slip
  const r3 = authenticateUser(accounts, 'HMM-2024-0901', '9A-PASS-01');
  assert.equal(r3.success, true);

  // Wrong password
  const r4 = authenticateUser(accounts, 'admin', 'wrongpass');
  assert.equal(r4.success, false);
  assert.equal(r4.error, 'Incorrect password or passcode.');

  // Suspended account
  const r5 = authenticateUser(accounts, 'suspended_user', 'pass123');
  assert.equal(r5.success, false);
  assert.equal(r5.error?.includes('suspended'), true);
});

test('verifyAdminCredentials strictly validates administrator logins', () => {
  // 1. Correct default admin login
  const validDirector = verifyAdminCredentials('admin', 'debberhan2017');
  assert.equal(validDirector.success, true);
  assert.equal(validDirector.admin?.adminId, 'DIR-HMM-001');

  const validEmail = verifyAdminCredentials('director@hailemariammamo.edu.et', 'debberhan2017');
  assert.equal(validEmail.success, true);

  // 2. Reject incorrect password
  const badPassword = verifyAdminCredentials('admin', 'wrong_pass_123');
  assert.equal(badPassword.success, false);
  assert.equal(badPassword.error?.includes('Invalid administrator credentials'), true);

  // 3. Reject unknown username
  const unknownUser = verifyAdminCredentials('random_intruder', 'debberhan2017');
  assert.equal(unknownUser.success, false);
  assert.equal(unknownUser.error?.includes('Invalid administrator credentials'), true);

  // 4. Custom registered admin verification
  const customAdmin = {
    fullName: 'Kebede Michael',
    email: 'kebede.michael@hailemariammamo.edu.et',
    phone: '+251911223344',
    roleTitle: 'Vice Principal',
    adminId: 'DIR-HMM-555',
    dateRegistered: '2026-09-01',
    password: 'CustomSecretPassword123'
  };

  const validCustom = verifyAdminCredentials('kebede.michael@hailemariammamo.edu.et', 'CustomSecretPassword123', customAdmin);
  assert.equal(validCustom.success, true);
  assert.equal(validCustom.admin?.fullName, 'Kebede Michael');

  const invalidCustomPass = verifyAdminCredentials('kebede.michael@hailemariammamo.edu.et', 'WrongPassword', customAdmin);
  assert.equal(invalidCustomPass.success, false);
});
