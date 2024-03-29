import crypto from "crypto";
import { Algorithms } from "../contants/encryption";

export const defaultIV = crypto.randomBytes(16);

// https://nodejs.org/api/crypto.html#crypto_crypto_createcipher_algorithm_password_options


export const encrypt = (key: string, text: string, algorithm: string, iv: Buffer) => {
  const cipher = crypto.createCipheriv(
    algorithm ? algorithm : Algorithms.Default,
    key,
    iv ? iv : defaultIV
  );
  let crypted = cipher.update(text, "utf8", "hex");
  crypted += cipher.final("hex");
  return crypted;
};

export const decrypt = (key: string, text: string, algorithm: string, iv: Buffer) => {
  let decipher = crypto.createDecipheriv(
    algorithm ? algorithm : Algorithms.Default,
    key,
    iv ? iv : defaultIV
  );
  let dec = decipher.update(text, "hex", "utf8");
  dec += decipher.final("utf8");
  return dec;
};
