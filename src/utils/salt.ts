import bcrypt from 'bcrypt';
import { Logger } from 'winston';

const saltFactor = 10;

export async function saltPassword(password: string, logger: Logger) {
  try {
    const salt = await bcrypt.genSalt(saltFactor);
    try {
      return bcrypt.hash(password, salt);
    } catch (error) {
      throw new Error(`Unable to create Hash: ${JSON.stringify(error, null, 5)}`);
    }
  } catch (error) {
    logger.log('error', `Unable to create Salt: ${JSON.stringify(error, null, 5)}`);
  }
  return password;
}