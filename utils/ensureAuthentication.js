const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next(null);
    res.statusCode = 403
    res.json({message:"You must be logged in to perform this operation."})
}

module.exports = ensureAuthenticated