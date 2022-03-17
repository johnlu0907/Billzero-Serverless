"use strict";

const uuid = require("uuid");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
var crypto = require("crypto");
//const rp = require("request-promise");

class authclass {
  constructor(args) {
    this.iconsole = args.iconsole;
    this.services = args.services;
    this.iss = process.env.JWTISS;
    var privateKeyPath = path.resolve(
      process.cwd(),
      "./data/ppk/" + process.env.NODE_ENV + "/private.key"
    );
    var publicKeyPath = path.resolve(
      process.cwd(),
      "./data/ppk/" + process.env.NODE_ENV + "/public.key"
    );
    this.privateKey = fs.readFileSync(privateKeyPath, "utf8");
    this.publicKey = fs.readFileSync(publicKeyPath, "utf8");
    this.services.addService("authcl", this);
    this.secret = process.env.JWTSECRET;
  }

  encryptText(text) {
    const nonce = crypto.randomBytes(16);
    var cipher = crypto.createCipheriv("aes-256-ctr", this.secret, nonce);
    var result = cipher.update(text, "utf8", "hex");
    result += cipher.final("hex");
    return nonce.toString("hex") + result;
  }

  decryptText(hexEncText) {
    this.iconsole.log(hexEncText);
    var hexNonce = Buffer.from(hexEncText.slice(0, 32), "hex");
    var hexText = hexEncText.slice(32, hexEncText.length);

    var decipher = crypto.createDecipheriv(
      "aes-256-ctr",
      this.secret,
      hexNonce
    );
    var result = decipher.update(hexText, "hex");
    result += decipher.final();
    return result;
  }

  /*     async fbAuth(id,user_access_token){
      try {
        const userFieldSet = 'id, name, about, email, accounts, link, is_verified, significant_other, relationship_status, website, picture, photos, feed';

        const options = {
          method: 'GET',
          uri: `https://graph.facebook.com/v2.8/${id}`,
          qs: {
            access_token: user_access_token,
            fields: userFieldSet
          }
        }        
        
        var fbRes= await rp(options);      
        return  fbRes;
      } catch (error) {
        throw error;
      }
    } */

  async verify(token) {
    this.iconsole.log("token:", token);
    try {
      var verifyOptions = {
        issuer: this.iss,
        algorithms: ["RS256"],
      };

      return await jwt.verify(token, this.publicKey, verifyOptions);
    } catch (error) {
      throw error;
    }
  }

  async auth(event) {
    this.iconsole.log();
    try {
      if (event.headers[process.env.JWTHDRPARAM]) {
        return await this.verify(event.headers[process.env.JWTHDRPARAM]);
      } else {
        throw "Unauthorized";
      }
    } catch (error) {
      throw error;
    }
  }

  async create(params) {
    this.iconsole.log(params);
    try {
      if (params.id) {
        var signOptions = {
          issuer: this.iss,
          algorithm: "RS256",
        };
        return await jwt.sign(params, this.privateKey, signOptions);
      } else {
        throw "BadRequest";
      }
    } catch (error) {
      throw error;
    }
  }
}

module.exports = authclass;
