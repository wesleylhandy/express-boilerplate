import jwt, { SignOptions } from "jsonwebtoken";
import { isAbsent } from "@perfective/common"
import { EnvVars, valueFromEnvironment } from "./environment-variables";
import { Algorithms } from "../contants/encryption";

export function signedToken(payload: string | object | Buffer) {
    const options: SignOptions = {
        expiresIn: "2d",
        algorithm: Algorithms.JWT
    };
    const secret = valueFromEnvironment<string>(EnvVars.JWT_SECRET);
    if (isAbsent(secret)) {
        throw new Error('Invalid JWT Secret');
    }
    return jwt.sign(payload, secret, options); 
}