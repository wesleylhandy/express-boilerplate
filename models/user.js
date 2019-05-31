const mongodb = require('mongodb');
const Model = require('./model');
const moment = require('moment');
const bcrypt = require('bcrypt');

const saltFactor = 10;

"use strict";
class User {
    constructor({username="", displayName="", image={ url: "" }, id="", emails=[{value:""}]}) {
        if (!(this instanceof User)) {
            return new User({username, displayName, image, id, emails})
        }
        this.username = username || emails[0].value
        this.fullName = displayName
        this.profilePicUrl = image && image.url ? image.url : "";
        this.dateAdded = moment().format('x')
        this.subscriptionStatus='basic'
        this.googleId = id
        this.email = emails[0].value
        this.twitterProfile = {}
        this.linkedInProfile = {}
        this.facebookProfile = {}
        this.businessProfile = {
                businessName:'',
                addresses:[{
                    address1:'',
                    address2:'',
                    city:'',
                    state:'',
                    country:'',
                    zipCode:''
                }],
                emailAddress:'',
                website:'',
                phone:'',
                logoUrl:'',
                contactEmails:[],
                twitter:'',
                linkedIn:'',
                facebook:''
            }
        this.verified=emails[0].value ? true : false
        this.contactedBusinesses=[];
    }

    static async saltPassword(password) {
        try {
            const salt = await bcrypt.genSalt(saltFactor)
            try {
                const hash = bcrypt.hash(password, salt)
                return hash
            } catch (err) {
                console.log("Unable to create Hash")
                console.error(JSON.stringify(err, null, 2))
                return password
            }
        } catch (err) {
            console.log("Unable to create Salt")
            console.error(JSON.stringify(err, null, 2))
            return password
        }
    }
}

class UsersDAO extends Model {

    constructor(db, collectionName) {
        super(db, collectionName);
        if (!(this instanceof UsersDAO)) {
            return new UsersDAO(db, collectionName)
        }
        this.indexes = [ 
            { 
                key: { 
                    googleId:1
                }, 
                name: "GoogleId", 
                unique: true, 
                background: true 
            }, { 
                key: { 
                    username:1
                }, 
                name: "UserName", 
                unique: true, 
                background: true 
            }, {
                key: {
                    subscription_status: 1
                },
                name: "SubscriptionStatus"
            }, {
                key: { 
                    dateAdded: -1 
                }, 
                name: "DateAddedToDB"
            }
        ]
        this.createIndexes();
    }

    async getUser(query={}) {
        try {
            const user = await this.collection.findOne(query)
            return user;
        } catch(err) {
            throw new Error(err)
        }
    }

    async addGoogleUser({_json: profile}){
        const user = new User(profile)
        try {
            const {insertedId} = await this.collection.insertOne(user, {fullResult: true})
            console.log({insertedId})
            return insertedId
        } catch(err) {
            throw new Error(err)
        }
    }

    async addLocalUser(username, password) {
        const user = new User({username})
        try {
            user.password = await User.saltPassword(password)
            try {
                const {insertedId} = await this.collection.insertOne(user, {fullResult: true})
                console.log({insertedId})
                return insertedId
            } catch(err) {
                
            }
        } catch(err) {
            throw new Error(err)
        }
    }

    async comparePassword(candidatePassword, dbPassword) {
        try {
            const isMatch = bcrypt.compare(candidatePassword, dbPassword)
            return isMatch
        } catch(err) {
            throw new Error(err)
        }
    }

}

module.exports = UsersDAO