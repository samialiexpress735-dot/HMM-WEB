/**
 * Authentication and User Credential Utilities for Hailemariam Mamo Secondary School
 * Compliant with Ethiopian MoE School Information System (SIS) guidelines.
 */

export interface UserAccount {
  id: string;
  username: string; // e.g. 'admin', 'daniel.girma', 'HMM-2024-0901', '0911421100'
  passwordHash: string; // Plain text or hashed password for prototype
  fullName: string;
  fullNameAmharic?: string;
  role: 'Admin' | 'SubAdmin' | 'Teacher' | 'Student' | 'Parent';
  email?: string;
  phone?: string;
  department?: string; // For teachers/sub-admins
  assignedSections?: string[]; // e.g. ['9A', '10B']
  studentId?: string; // For students and parents
  passcode: string; // Human-readable passcode for credential slips (e.g. 'HMM-9A-7821')
  status: 'Active' | 'Suspended';
  dateCreated: string;
}

export interface AdminRegistrationInput {
  fullName: string;
  fullNameAmharic?: string;
  email: string;
  phone: string;
  roleTitle: string;
  moeCode: string;
  password: string;
  confirmPassword?: string;
}

/**
 * Validates admin signup submission against Ethiopian secondary school requirements
 */
export function validateAdminSignup(input: AdminRegistrationInput): { valid: boolean; error?: string } {
  if (!input.fullName || input.fullName.trim().length < 3) {
    return { valid: false, error: 'Please enter a valid administrator full name (at least 3 characters).' };
  }
  if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return { valid: false, error: 'Please enter a valid administrative email address.' };
  }
  if (!input.phone || input.phone.trim().length < 7) {
    return { valid: false, error: 'Please enter a valid Ethiopian contact phone number.' };
  }
  if (!input.password || input.password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long.' };
  }
  if (input.confirmPassword !== undefined && input.password !== input.confirmPassword) {
    return { valid: false, error: 'Passwords do not match. Please re-enter identical passwords.' };
  }
  if (!input.moeCode || input.moeCode.trim().length < 3) {
    return { valid: false, error: 'Please enter the Ethiopian Ministry of Education School Code (e.g. HMM-MOE-2017).' };
  }
  return { valid: true };
}

/**
 * Generates an authentic Ethiopian student login passcode slip format
 */
export function generateStudentPasscode(grade: number, section: string, index: number): string {
  const cleanSec = section.toUpperCase().trim() || 'A';
  const padded = String(index).padStart(3, '0');
  return `HMM-${grade}${cleanSec}-${padded}`;
}

/**
 * Generates temporary password for new teacher or staff
 */
export function generateStaffPassword(role: 'Teacher' | 'SubAdmin', surname: string): string {
  const clean = surname.toLowerCase().replace(/[^a-z]/g, '') || 'staff';
  return `${clean}2017!`;
}

/**
 * Validates credentials against account database
 */
export function authenticateUser(
  accounts: UserAccount[],
  loginIdentifier: string,
  enteredPasscode: string
): { success: boolean; account?: UserAccount; error?: string } {
  const normalizedId = loginIdentifier.trim().toLowerCase();
  const normalizedPass = enteredPasscode.trim();

  if (!normalizedId || !normalizedPass) {
    return { success: false, error: 'Please enter both login identifier and password.' };
  }

  const found = accounts.find(
    (acc) =>
      acc.username.toLowerCase() === normalizedId ||
      (acc.studentId && acc.studentId.toLowerCase() === normalizedId) ||
      (acc.phone && acc.phone.replace(/\s+/g, '') === normalizedId.replace(/\s+/g, ''))
  );

  if (!found) {
    return { success: false, error: 'User account or student ID not found.' };
  }

  if (found.passwordHash !== normalizedPass && found.passcode !== normalizedPass) {
    return { success: false, error: 'Incorrect password or passcode.' };
  }

  if (found.status !== 'Active') {
    return { success: false, error: 'Account is suspended. Please contact the Registrar Office.' };
  }

  return { success: true, account: found };
}

/**
 * Prepares printable credential slips for a specific section
 */
export function filterCredentialsForSection(
  accounts: UserAccount[],
  grade: number,
  section: string
): UserAccount[] {
  const targetTag = `${grade}${section.toUpperCase()}`;
  return accounts.filter((acc) => {
    if (acc.role === 'Student' || acc.role === 'Parent') {
      return acc.assignedSections?.includes(targetTag) || acc.username.includes(`-${grade}${section.toUpperCase()}`);
    }
    return false;
  });
}

export interface AdminUser {
  fullName: string;
  fullNameAmharic?: string;
  email: string;
  phone: string;
  roleTitle: string;
  adminId: string;
  dateRegistered: string;
  password?: string;
}

export const DEFAULT_SCHOOL_ADMIN: AdminUser = {
  fullName: 'Berhanu Wolde Mengesha, M.Ed.',
  fullNameAmharic: 'ብርሃኑ ወልደ መንገሻ',
  email: 'director@hailemariammamo.edu.et',
  phone: '+251 91 142 5566',
  roleTitle: 'Principal & School Director',
  adminId: 'DIR-HMM-001',
  dateRegistered: '2024-09-01'
};

/**
 * Strictly verifies admin login credentials against default accounts or registered local credentials
 */
export function verifyAdminCredentials(
  identifier: string,
  pass: string,
  storedAdmin?: (AdminUser & { password?: string }) | null
): { success: boolean; admin?: AdminUser; error?: string } {
  const id = identifier.trim().toLowerCase();
  const rawPass = pass.trim();

  if (!id || !rawPass) {
    return { success: false, error: 'Please enter both administrator username/email and password.' };
  }

  // 1. Check default director credentials
  const isDefaultAdminId =
    id === 'admin' ||
    id === 'director@hailemariammamo.edu.et' ||
    id === 'dir-hmm-001' ||
    id === 'berhanu';
  const isDefaultAdminPass = rawPass === 'debberhan2017';

  if (isDefaultAdminId && isDefaultAdminPass) {
    const active = storedAdmin && (storedAdmin.email === 'director@hailemariammamo.edu.et' || storedAdmin.adminId === 'DIR-HMM-001')
      ? storedAdmin
      : DEFAULT_SCHOOL_ADMIN;
    return { success: true, admin: active };
  }

  // 2. Check custom registered administrator
  if (storedAdmin) {
    const matchesStoredId =
      storedAdmin.email.toLowerCase() === id ||
      storedAdmin.adminId.toLowerCase() === id ||
      (storedAdmin.phone && storedAdmin.phone.replace(/\s+/g, '') === id.replace(/\s+/g, ''));

    const matchesStoredPass =
      storedAdmin.password === rawPass ||
      (storedAdmin.password === undefined && rawPass === 'debberhan2017');

    if (matchesStoredId && matchesStoredPass) {
      return { success: true, admin: storedAdmin };
    }
  }

  // 3. Check official sub-admin registrar credentials
  if ((id === 'registrar' || id === 'registrar@hailemariammamo.edu.et') && rawPass === 'reg2017!') {
    const registrarAdmin: AdminUser = {
      fullName: 'Mengistu Haile',
      fullNameAmharic: 'መንግስቱ ኃይሌ',
      email: 'registrar@hailemariammamo.edu.et',
      phone: '+251 91 188 4400',
      roleTitle: 'Senior Registrar & SIS Officer',
      adminId: 'REG-HMM-101',
      dateRegistered: '2024-09-01'
    };
    return { success: true, admin: registrarAdmin };
  }

  return {
    success: false,
    error: 'Invalid administrator credentials. Access denied. Please enter the correct email/username and password.'
  };
}
