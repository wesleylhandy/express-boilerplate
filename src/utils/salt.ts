import bcrypt from 'bcrypt';
import { Logger } from 'winston';

const saltFactor = 10;

export async function saltPassword(password: string, logger: Logger) {
  try {
    const salt = await bcrypt.genSalt(saltFactor);
    try {
      const hash = bcrypt.hash(password, salt);
      return hash;
    } catch (err) {
      logger.error("Unable to create Hash");
      console.error(err);
      return password;
    }
  } catch (err) {
    logger.error("Unable to create Salt");
    console.error(err);
    return password;
  }
}