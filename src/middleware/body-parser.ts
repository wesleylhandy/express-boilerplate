import bodyParser from 'body-parser'
  
// parsing application/json
export const extendedUrlParser = bodyParser.urlencoded({
    extended: true
});

export const unextendedUrlParser = bodyParser.urlencoded({ extended: false });