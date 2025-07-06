import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-32-chars-long-please!';
const ALGORITHM = 'aes-256-cbc';

// Ensure the key is exactly 32 bytes
function getKey(): Buffer {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

export function encrypt(text: string): string {
  try {
    const key = getKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return text; // Return original text on error
  }
}

export function decrypt(encryptedText: string): string {
  try {
    // If the text doesn't contain ':', it's probably not encrypted
    if (!encryptedText.includes(':')) {
      return encryptedText;
    }
    
    const [ivHex, encrypted] = encryptedText.split(':');
    
    // Validate hex strings
    if (!ivHex || !encrypted || ivHex.length !== 32) {
      console.log('Invalid encrypted format, returning original text');
      return encryptedText;
    }
    
    const key = getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Return default config JSON if decryption fails
    return JSON.stringify({
      googleCalendar: {
        enabled: true,
        apiKey: "",
        calendarId: "primary",
        accessToken: "",
      },
      whatsapp: {
        enabled: true,
        apiKey: "",
        phoneId: "",
        webhookUrl: "",
      },
    });
  }
}