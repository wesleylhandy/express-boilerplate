# Node/Express Boilerplate with MongoDB for Session and User Store and Passport for User Authentication

This is boiler plate code for initializing a Node/Express server that utizes best practices in secure API development. `body-parser` by default limits `json` payload to 100kb. `express-rate-limit` will only allow 100 attempts per session in a 15 minute period. Both these figures can be adjusted. Local User Authentication checks for `typeof` username and password variables. As routes are created that receive user input, middle should be added that checks for types.

## Getting Started

1. Fork this Repo
2. Install this repo with either

```
yarn install
```

or

```
npm install
```

3. Set up Environment Variables

```
touch .env
```

You will need the following variables defined:

```
SESSION_SECRET=
MONGODB_CONNECT_STRING=
DBNAME=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

`SESSION_SECRET` is your secret password for securing session data.
`MONGODB_CONNECT_STRING` is a complete connection string for connecting to your MongoDB instance. The app will default to `mongodb://localhost:27017` plus the name you put in the next varable...
`DBNAME` is the name of the DB you will access in MongoDB

To use `passport-google-oauth20` you need to register your application with your Google Developers Account via the [Google APIs console](https://console.developers.google.com/apis/dashboard). You need to create credientials for `OAuth 2.0 client IDs` to obtain your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## Running the Tests

This is still in progress. Will refer to [this article](https://medium.com/@asciidev/testing-a-node-express-application-with-mocha-chai-9592d41c0083).

## Deployment

Still in progress.

## Built With

 - [Express](http://expressjs.com/) - HTTP Server Framework
 - [Passport](http://www.passportjs.org/) - User Authentication
 - [MongoDB](https://www.mongodb.com/) - NoSQL Database

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/wesleylhandy/got-business-client/tags). 

## Authors

* **Wesley L. Handy** - *Initial work* 

See also the list of [contributors](https://github.com/wesleylhandy/got-business-client/contributors) who participated in this project.

## License

Copyright 2019 Wesley L. Handy

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Acknowledgments