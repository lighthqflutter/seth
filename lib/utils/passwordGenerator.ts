/**
 * Generate a secure random password
 *
 * Format: 3 words + 2 numbers (e.g., "BlueSky-Garden42")
 * - Easy to remember
 * - Secure enough for temporary passwords
 * - Users must change on first login
 */

const wordList = [
  'Blue', 'Green', 'Red', 'Gold', 'Silver', 'Bright', 'Quick', 'Smart',
  'Happy', 'Swift', 'Bold', 'Calm', 'Clear', 'Fresh', 'Brave', 'Sharp',
  'Sky', 'Ocean', 'Mountain', 'River', 'Forest', 'Garden', 'Valley', 'Cloud',
  'Star', 'Moon', 'Sun', 'Dawn', 'Dusk', 'Light', 'Wind', 'Rain',
  'Eagle', 'Lion', 'Tiger', 'Wolf', 'Bear', 'Hawk', 'Fox', 'Deer'
];

export function generatePassword(): string {
  // Select 2 random words
  const word1 = wordList[Math.floor(Math.random() * wordList.length)];
  const word2 = wordList[Math.floor(Math.random() * wordList.length)];

  // Generate 2 random numbers (10-99)
  const num = Math.floor(Math.random() * 90) + 10;

  // Combine: Word1-Word2-Num (e.g., "Blue-Sky-42")
  return `${word1}${word2}${num}`;
}

/**
 * Generate a random 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
