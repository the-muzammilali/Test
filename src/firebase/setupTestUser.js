// This script creates the test user for admin access
// Run this once to set up the test credentials

import { authService } from './authService';

export const createTestUser = async () => {
  try {
    const user = await authService.createUser('test@gmail.com', 'Test@123');
    console.log('Test user created successfully:', user.email);
    return user;
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('Test user already exists');
      return null;
    }
    console.error('Error creating test user:', error);
    throw error;
  }
};

// Uncomment the line below and run this file to create the test user
// createTestUser();
