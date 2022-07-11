import { NextFunction, Request, Response } from "express";
import jsonwebtoken, { JwtPayload } from "jsonwebtoken";
import onHeaders from "on-headers";
import { v4 as uuidv4 } from "uuid";
import { decrypt, encrypt, defaultIV } from "./crypto"
import crypto, { BinaryLike, KeyObject} from "crypto";
import { CsrfError } from "./csrf-error";
import { Algorithms } from "../contants/encryption";
import { EnvVars, valueFromEnvironment } from "./environment-variables";

// TODO: Refactor and simplify

const DEFAULT_EXPIRATION_IN_MINUTES = 60;
const DEFAULT_HEADER_NAME = "x-csrf-jwt";
const DEFAULT_CSRF_DRIVER = "DOUBLE_SUBMIT";

// Some quick type testing methods
const toString = Object.prototype.toString;
const isRegExp = (obj: unknown): obj is RegExp => {
  return !!/object RegExp/.exec(toString.apply(obj));
};
const isString = (obj: unknown): obj is String => {
  return !!/object String/.exec(toString.apply(obj));
};

/*
    Hash
    ----
    Hash a string using sha256
 */
const hash = (secret: BinaryLike | KeyObject, text: string) => {
  return crypto
    .createHmac("sha256", secret)
    .update(text)
    .digest("hex");
};

/*
    Resolve Domain
    --------------

    Determine the current domain
 */

const resolveDomain = (req: Request) => {
  var host = req.get("host"); // Ex: "mysite.com:8000"
  var truncateAt = host?.indexOf(":") ?? -1;
  var domain = host?.slice(0, truncateAt > -1 ? truncateAt : host.length); // Ex: "mysite.com"

  return "." + domain;
};

/*
    JWT
    ---
    An abstraction on top of JWT which also handles serialization/deserialization and encryption/decryption
    The final token looks something like:
    [JWT-SIGNED [ENCRYPTED [JSON SERIALIZED [JS OBJECT]]]]
    These methods just handle creating and unpacking this object.
    * pack: serialize, encrypt and sign a javascript object token
    * unpack: verify, decrypt and deserialize an jwt token
 */
export interface JwtCsrfConfigurationOptions {
  getCookieDomain?: (req: Request) => string;
  getUserToken: (req: Request) => string | null;
  baseUrl?: string;
  excludeUrls: (string[] | RegExp | string)[];
  csrfDriver: keyof typeof CSRF_DRIVERS;
  expiresInMinutes: number;
  headerName?: string;
  secret: string;
  token?: string;
  algorithm?: string;
  iv?: Buffer;
}

interface Token {
  header: {
    id: string;
  } & { [x: string]: unknown },
  cookie: {
    id: string
  } & { [x: string]: unknown }
}
const JWT = {
  pack: (token: unknown, options: JwtCsrfConfigurationOptions ) => {
    // Attempt to serialize and encrypt the token
    const encryptedToken = {
      token: encrypt(
        options.secret,
        JSON.stringify(token),
        options.algorithm ?? Algorithms.Default,
        options.iv ?? defaultIV
      )
    };
    // Then sign it using jsonwebtoken
    return jsonwebtoken.sign(encryptedToken, options.secret, {
      expiresIn: `${
        options.expiresInMinutes
          ? options.expiresInMinutes
          : DEFAULT_EXPIRATION_IN_MINUTES
      } minutes`
    });
  },

  unpack: (token: string, options: JwtCsrfConfigurationOptions )=> {
    let encryptedPayload: string | JwtPayload;

    try {
      // Verify the json token
      encryptedPayload = jsonwebtoken.verify(token, options.secret);
    } catch (err: unknown) {
      // If there's no message, it's probably some weird unhandled error
      if (!(err as Error).message) {
        throw err;
      }

      // Normalize 'some error message' to 'SOME_ERROR_MESSAGE'
      throw new CsrfError(
        (err as Error).message
          .slice(0, 25)
          .replace(/ /, "_")
          .toUpperCase()
      );
    }

    // Attempt to decrypt and deserialize the token
    return JSON.parse(
      decrypt(
        options.secret,
        (encryptedPayload as JwtPayload).token,
        options.algorithm ?? Algorithms.Default,
        options.iv ?? defaultIV,
      )
    );
  }
};

/*
    PERSISTENCE DRIVERS
    -------------------
    Drivers for writing and reading to 'persistence' layers, e.g. headers or cookies
    * drop: a user defined method which drops the encrypted jwt token to the persistence layer of choice
    * retrieve: a user defined method which reads the encrypted jwt token from the persistence layer of choice
 */

const PERSISTENCE_DRIVERS = {
  header: {
    drop: (_req: Request, res: Response, options: JwtCsrfConfigurationOptions, jwtToken: string) => {
      var headerName = options.headerName || DEFAULT_HEADER_NAME;

      res.setHeader(headerName, jwtToken);
      res.setHeader(headerName + "-hash", hash(options.secret, jwtToken));
    },

    retrieve: (req: Request, res: Response, options: JwtCsrfConfigurationOptions) => {
      const headerName = options.headerName || DEFAULT_HEADER_NAME;

      let jwtToken = req.headers[headerName];
      const jwtTokenBody =
        req.body && req.body.meta && req.body.meta[headerName];

      if (!jwtToken && jwtTokenBody) {
        const jwtTokenHash = req.headers[headerName + "-hash"];

        if (!jwtTokenHash) {
          throw new CsrfError("BODY_CSRF_HASH_HEADER_MISSING");
        }

        if (jwtTokenHash !== hash(options.secret, jwtTokenBody)) {
          throw new CsrfError("BODY_CSRF_HASH_MISMATCH");
        }

        jwtToken = jwtTokenBody;
      }

      return jwtToken;
    }
  },

  cookie: {
    drop: (req: Request, res: Response, options: JwtCsrfConfigurationOptions, jwtToken: string) => {
      const secure = Boolean(
        valueFromEnvironment(EnvVars.DEPLOY_ENV) ?? req.protocol === "https"
      );
      const expires = Date.now() + 1000 * 60 * 60 * 24 * 7; // 1 week

      res.cookie(options.headerName ?? DEFAULT_HEADER_NAME, jwtToken, {
        secure: secure,
        httpOnly: true,
        domain: options.getCookieDomain
          ? options.getCookieDomain(req)
          : resolveDomain(req),
        expires: new Date(expires),
      });
    },

    retrieve: (req: Request, res: Response, options: JwtCsrfConfigurationOptions) => {
      return req.cookies[options.headerName ?? DEFAULT_HEADER_NAME];
    }
  }
};

/*
    CSRF DRIVERS
    ------------
    Drivers for generating and verifying jwt tokens.
    The process of retrieving, decrypting and dropping the tokens is abstracted, so
    we can just deal with simple javascript objects.
    * persist: a mapping of persistence layers we want to enable for the given csrf mode
    * generate: a user defined method which generates and returns the token (a javascript object)
                with everything needed to verify later
    * verify: a user defined method which recieves the token(s) on inbound requests, and throws a CsrfError if there
              is a verification problem. This later manifests as a 401 response to the browser.
 */
const CSRF_DRIVERS = {
  AUTHED_TOKEN: {
    persist: {
      cookie: false,
      header: true
    },

    generate: (req: Request, res: Response, options: JwtCsrfConfigurationOptions) => {
      return {
        uid: options.getUserToken(req)
      };
    },

    verify: (req: Request, res: Response, options: JwtCsrfConfigurationOptions, tokens: Token) => {
      // tokens.header will always be an object
      if (Object.keys(tokens.header).length === 0) {
        throw new CsrfError("TOKEN_NOT_IN_HEADER");
      }

      if (options.getUserToken(req)) {
        if (!tokens.header.uid) {
          throw new CsrfError("TOKEN_PAYERID_MISSING");
        }

        if (tokens.header.uid !== options.getUserToken(req)) {
          throw new CsrfError("TOKEN_PAYERID_MISMATCH");
        }
      }
    }
  },

  DOUBLE_SUBMIT: {
    persist: {
      cookie: true,
      header: true
    },

    generate: (req: Request, res: Response, options: JwtCsrfConfigurationOptions) => {
      return {
        id: uuidv4()
      };
    },

    verify: (req: Request, res: Response, options: JwtCsrfConfigurationOptions, tokens: Token) => {
      if (!Object.keys(tokens.header).length) {
        throw new CsrfError("TOKEN_NOT_IN_HEADER");
      }

      if (!tokens.header.id) {
        throw new CsrfError("ID_NOT_IN_HEADER");
      }

      if (!tokens.cookie.id) {
        throw new CsrfError("ID_NOT_IN_COOKIE");
      }

      if (tokens.header.id !== tokens.cookie.id) {
        throw new CsrfError("HEADER_COOKIE_ID_MISMATCH");
      }
    }
  },

  AUTHED_DOUBLE_SUBMIT: {
    persist: {
      cookie: true,
      header: true
    },

    generate: (req: Request, res: Response, options: JwtCsrfConfigurationOptions) => {
      return {
        uid: options.getUserToken(req),
        id: uuidv4()
      };
    },

    verify: (req: Request, res: Response, options: JwtCsrfConfigurationOptions, tokens: Token) => {
      if (!Object.keys(tokens.header).length) {
        throw new CsrfError("TOKEN_NOT_IN_HEADER");
      }

      try {
        // First do the cookie check

        if (!Object.keys(tokens.cookie).length) {
          throw new CsrfError("TOKEN_NOT_IN_COOKIE");
        }

        if (!tokens.header.id) {
          throw new CsrfError("ID_NOT_IN_HEADER");
        }

        if (!tokens.cookie.id) {
          throw new CsrfError("ID_NOT_IN_COOKIE");
        }

        if (tokens.header.id !== tokens.cookie.id) {
          throw new CsrfError("HEADER_COOKIE_MISMATCH");
        }
      } catch (err) {
        // Then if this fails, fall back to payerid

        if (err instanceof CsrfError) {
          if (options.getUserToken(req)) {
            if (!tokens.header.uid) {
              throw new CsrfError("TOKEN_PAYERID_MISSING");
            }

            if (tokens.header.uid !== options.getUserToken(req)) {
              throw new CsrfError("TOKEN_PAYERID_MISMATCH");
            }
          }
        } else {
          throw err;
        }
      }
    }
  }
};

/*
    Generate
    --------
    Generate an object containing packed jwt tokens for each persistence layer:
    {
        header: 'xxxxxxxxx',
        cookie: 'yyyyyyyyy'
    }
 */

const generate = (req: Request, res: Response, options: JwtCsrfConfigurationOptions) => {
  // Determine which driver to use to generate the token
  const csrfDriver = options.csrfDriver || DEFAULT_CSRF_DRIVER;
  const driver = CSRF_DRIVERS[csrfDriver];

  // Generate the token from our chosen driver
  const token = driver.generate(req, res, options);

  // Build a collection of jwt tokens
  const jwtTokens: { [x: string]: string } = {};

  // Loop through each persistance type for the current csrfDriver
  Object.keys(driver.persist).forEach(persistenceDriver => {
    // Check if this persistence type is enabled for the current csrfDriver
    if (driver.persist[persistenceDriver as keyof typeof PERSISTENCE_DRIVERS]) {
      // Add the csrfDriver and persistenceDriver into the token so we can verify them on inbound requests
      const payload = {
          csrfDriver: csrfDriver,
          persistenceDriver: persistenceDriver,
          ...token
        }
      // console.log({ payload, persistenceDriver });
      // Pack and save our token
      jwtTokens[persistenceDriver] = JWT.pack(payload, options);
    }
  });

  return jwtTokens;
};

/*
    Drop
    ----
    Generate new jwt tokens and drop them to the persistence layers (response headers/cookies).
    The persistence layers used will be those valid for the passed csrfType.
 */

const drop = (req: Request, res: Response, options: JwtCsrfConfigurationOptions) => {
  // Generate the jwt tokens we need to drop
  const jwtTokens = generate(req, res, options);

  // Add them to res.locals for other middlewares to consume
  res.locals.csrfJwtTokens = jwtTokens;

  // Loop through each persistence type for the current csrf driver
  Object.keys(jwtTokens).forEach(persistenceDriver => {
    // Get the individual token
    const jwtToken = jwtTokens[persistenceDriver];

    // Drop the token to the persistence layer
    PERSISTENCE_DRIVERS[persistenceDriver as keyof typeof PERSISTENCE_DRIVERS].drop(req, res, options, jwtToken);
  });
};

/*
    Read
    ----
    Read and unpack a token, given a persistence driver name.
    e.g. giving 'header' would read the encrypted cookie from req.headers, then decrypt/unpack it.
    Returns an unpacked token, e.g.
    {
        uid: XXXX
    }
 */

const read = (req: Request, res: Response, options: JwtCsrfConfigurationOptions, persistenceDriver: keyof typeof PERSISTENCE_DRIVERS) => {
  const jwtToken = PERSISTENCE_DRIVERS[persistenceDriver].retrieve(
    req,
    res,
    options
  );

  if (!jwtToken) {
    return {};
  }

  const token = JWT.unpack(jwtToken, options);

  // Default the persistenceDriver to 'header' (for legacy tokens -- can remove this later)
  // token.persistenceDriver = token.persistenceDriver || "header";
  // console.log({ persistenceDriver, tokenPersistance: token.persistenceDriver });

  // Validate that it has the correct persistenceDriver
  if (token.persistenceDriver !== persistenceDriver) {
    throw new CsrfError(
      "GOT_" +
        token.persistenceDriver.toUpperCase() +
        "_EXPECTED_" +
        persistenceDriver.toUpperCase()
    );
  }

  return token;
};

/*
    Retrieve
    --------
    Retrieve and unpack all tokens from the persistence layer for our driver.
    Returns a mapping of unpacked tokens, e.g.
    {
        header: {
            uid: XXX
        },
        cookie: {
            uid: YYY
        }
    }
 */

const retrieve = (req: Request, res: Response, options: JwtCsrfConfigurationOptions, csrfDriver: keyof typeof CSRF_DRIVERS) => {
  const driver = CSRF_DRIVERS[csrfDriver];
  // console.log({ driver });
  // Build an object of tokens
  const tokens: { [x: string]: string } = {};

  // Loop over each persistence mechanism and build an object of decrypted tokens
  Object.keys(driver.persist).forEach(persistenceDriver => {
    // We only want tokens which are valid for the current csrf driver
    // console.log({ retrievePersistDriver: persistenceDriver });
    if (driver.persist[persistenceDriver as keyof typeof driver.persist]) {
      tokens[persistenceDriver] = read(req, res, options, persistenceDriver as keyof typeof PERSISTENCE_DRIVERS);
    }
  });
  // console.log({ tokens });
  return tokens;
};

/*
    Verify
    ------
    Verify all tokens from the relevant persistence layers.
    Throw a CsrfError on any verification failures.
 */

const verify = (req: Request, res: Response, options: JwtCsrfConfigurationOptions) => {
  // First we need to get the header first to figure out which csrfDriver we need to verify
  const headerToken = read(req, res, options, "header");
  // console.log({ csrfDriver: headerToken.csrfDriver });

  const csrfDriver =
    headerToken.csrfDriver && CSRF_DRIVERS[headerToken.csrfDriver as keyof typeof CSRF_DRIVERS]
      ? headerToken.csrfDriver as keyof typeof CSRF_DRIVERS
      : DEFAULT_CSRF_DRIVER;

  // Now we know the mode, we can retrieve the tokens from all persistence types for this mode
  const tokens = retrieve(req, res, options, csrfDriver) as unknown as Token;

  // Now we have all of the tokens, pass to the driver to verify them
  return CSRF_DRIVERS[csrfDriver].verify(req, res, options, tokens);
};

export const getHeaderToken = (req: Request, res: Response, options: JwtCsrfConfigurationOptions) => {
  const csrfDriver = options.csrfDriver || DEFAULT_CSRF_DRIVER;
  const token = CSRF_DRIVERS[csrfDriver].generate(req, res, options);

  const payload = {
      csrfDriver: csrfDriver,
      persistenceDriver: "header",
      ...token
    }

  return JWT.pack(payload, options);
};

export const middleware = (options: JwtCsrfConfigurationOptions) => {
  const csrfDriver = options.csrfDriver || DEFAULT_CSRF_DRIVER;

  if (/AUTHED_TOKEN|AUTHED_DOUBLE_SUBMIT/.test(csrfDriver)) {
    if (!options.getUserToken) {
      throw new Error(
        "csrf-jwt - getUserToken option required for AUTHED_TOKEN and AUTHED_DOUBLE_SUBMIT drivers"
      );
    }
  }

  let excludeUrls = options.excludeUrls || [];

  if (options.baseUrl) {
    excludeUrls = excludeUrls.map(route => {
      return (options.baseUrl ?? '') + route;
    });
  }

  return (req: Request, res: Response, next: NextFunction) => {
    // An array to show us the matching excluded urls. If this array
    // contains any values, we should skip out and allow.
    let urlToTest: string;
    let excludeTheseUrls: JwtCsrfConfigurationOptions['excludeUrls'];

    // Set JWT in header and cookie before response goes out
    // This is done in onHeaders since we need to wait for any service
    // calls (e.g. auth) which may otherwise change the state of
    // our token
    onHeaders(res, () => {
      drop(req, res, options);
    });

    // Skip out on non mutable REST methods
    if (/GET|HEAD|OPTIONS|TRACE/i.test(req.method)) {
      return next();
    }

    if (excludeUrls.length) {
      // We only want to verify certain requests
      urlToTest = req.originalUrl;
      // console.log({ urlToTest, excludeUrls });
      excludeTheseUrls = excludeUrls.filter(excludeUrl => {
        if (Array.isArray(excludeUrl)) {
          const expression = excludeUrl[0];
          const options = excludeUrl[1] || "";

          return new RegExp(expression, options).test(urlToTest);
        } else if (isRegExp(excludeUrl)) {
          // console.log({ excludeUrl, exclude: excludeUrl.test(urlToTest) });
          return excludeUrl.test(urlToTest);
        } else if (isString(excludeUrl)) {
          // Setup some variables: regExp for regExp testing and
          // some bits to use in the indexOf comparison
          const regExp = new RegExp(excludeUrl);
          const bits = (urlToTest || "").split(/[?#]/, 1)[0];

          // Test regular expression strings first
          if (regExp.exec(urlToTest)) {
            return true;
          }

          // If we are still here, test the legacy indexOf case
          return excludeUrls.indexOf(bits) !== -1;
        }
      });

      // If the filter above actually found anything, that means
      // we matched on the possible exclusions. In this case, var's
      // just pop out and var the next piece of middleware have a
      // shot.
      if (excludeTheseUrls.length) {
        return next();
      }
    }

    try {
      verify(req, res, options);
    } catch (err) {
      // If we get a CsrfError, we can send a 401 to trigger a retry,
      // otherwise the error will be unhandled
      if (err instanceof CsrfError) {
        res.status(401);
      }

      return next(err);
    }

    return next();
  };
};
