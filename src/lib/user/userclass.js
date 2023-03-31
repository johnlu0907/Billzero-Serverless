"use strict";

const axios = require("axios");
const moment = require("moment");
const uuid = require("uuid");
const crypto = require("crypto");
const empty = require("is-empty");
const pwdgen = require("generate-password");
const randomize = require("randomatic");
//Test
var Ajv = require("ajv");
var ajv = new Ajv({ useDefaults: true });

const randomWord = require("random-word");

const branch_key = "key_live_piT9H2dFIkvOy32aRyZR2ebnqCiYKIGm";
const branch_secret = "secret_live_GXFqJ7WqmNTOtabjxGEfsWSqhSJRusgB";

class userclass {
  constructor(args) {
    for (var parameter in args) {
      this[parameter] = args[parameter];
    }
    this.count = 0;
    this.services.addService("usercl", this);
    this.secret = process.env.JWTSECRET;

    ajv.addFormat("phone", "^[+0-9()\\-\\.\\s]+$");
    this.userDataSchema = {
      definitions: {
        address: {
          type: "object",
          properties: {
            line1: { type: ["string", "null"], default: null },
            line2: { type: ["string", "null"], default: null },
            city: { type: ["string", "null"], default: null },
            state: { type: "string" },
            postal_code: { type: "string" },
            country: { type: ["string", "null"], default: null },
          },
          additionalProperties: false,
          required: ["state", "postal_code"],
        },
        dob: {
          type: "object",
          properties: {
            day: { type: ["string", "null"], default: null },
            month: { type: ["string", "null"], default: null },
            year: { type: ["string", "null"], default: null },
          },
          additionalProperties: false,
          required: [],
        },
        geo: {
          type: "object",
          properties: {
            geohash: { type: ["string", "null"], default: null },
            lat: { type: ["number", "null"], default: null },
            lon: { type: ["number", "null"], default: null },
          },
          additionalProperties: false,
          required: [],
        },
        social: {
          type: "object",
          properties: {
            facebook: { type: ["string", "null"], default: null },
            instagram: { type: ["string", "null"], default: null },
            snapchat: { type: ["string", "null"], default: null },
            twitter: { type: ["string", "null"], default: null },
          },
          additionalProperties: false,
          required: [],
        },
      },
      type: "object",
      properties: {
        active: { type: ["string"], enum: ["true", "false"] },
        loggedin: { type: ["string"], enum: ["true", "false"] },
        address: { $ref: "#/definitions/address" },
        dob: { $ref: "#/definitions/dob" },
        geo: { $ref: "#/definitions/geo" },
        social: { $ref: "#/definitions/social" },
        firstName: { type: ["string", "null"] },
        lastName: { type: ["string", "null"] },
        profileImage: { type: ["string", "null"] },
        email: { type: ["string", "null"], format: "email" },
        phone: { type: ["string", "null"], format: "phone" },
        veteran: { type: ["string", "null"], enum: ["true", "false", null] },
        ssn: { type: ["string", "null"] },
        shelter: { type: ["string", "null"] },
        homeless: { type: ["string", "null"], enum: ["true", "false", null] },
        gender: { type: ["string", "null"], enum: ["male", "female", null] },
        devTokens: {
          type: "array",
          items: {
            type: "object",
            properties: { id: { type: "string" }, token: { type: "string" } },
            required: ["id", "token"],
          },
        },
      },
      additionalProperties: true,
      required: [],
    };
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

  async createBranchDL(user) {
    try {
      const result = await axios.post("https://api2.branch.io/v1/url", {
        branch_key,
        channel: "BillZero",
        stage: "BillZero",
        campaign: "BillZero",
        feature: "marketing",
        tags: [`u - ${user.userName}`],
        type: 2,
        data: {
          bzdata: {
            navigationTarget: "user",
            userId: user.id,
            userName: user.userName,
          },
          $marketing_title: `BZ User ${user.userName}`,
        },
      });
      const url = result.data.url;

      const userpromo = {
        id: url.substr(url.length - 11),
        userId: user.id,
        url: url,
      };
      await this.services.dbcl.putPromocode(userpromo);
      return url;
    } catch (error) {
      this.iconsole.log("===Branch Error:", error);
      return null;
    }
  }

  async updateBranchDL(user) {
    try {
      const result = await axios.put(
        `https://api2.branch.io/v1/url?url=${user.dl}`,
        {
          branch_key,
          branch_secret,
          tags: [`u - ${user.userName}`],
          data: {
            bzdata: {
              userId: user.id,
              userName: user.userName,
            },
            $marketing_title: `BZ User ${user.userName}`,
          },
        }
      );
      return true;
    } catch (error) {
      this.iconsole.log("===Branch Error:", error);
      return false;
    }
  }

  async createUserObject(data) {
    try {
      const id = uuid.v4();
      const userName = randomWord() + Math.floor(Math.random() * 90 + 10);
      // const dl = await this.createBranchDL({
      //     id,
      //     userName
      // });
      const dl = "";
      var userObj = {
        id: id,
        address: {
          city: null,
          country: null,
          line1: null,
          line2: null,
          postal_code: null,
          state: null,
        },
        createdAt: moment().tz(process.env.DEFAULT_TIMEZONE).format(),
        dob: {
          day: null,
          month: null,
          year: null,
        },
        payment: {},
        social: {
          snapchat: null,
          facebook: null,
          twitter: null,
          instagram: null,
        },
        email: null,
        firstName: null,
        geo: {
          geohash: null,
          lat: null,
          lon: null,
        },
        profileImage: null,
        lastName: null,
        phone: "undefined",
        pincode: null,
        settings: {},
        token: null,
        devTokens: [],
        veteran: "false",
        ssn: "",
        homeless: "false",
        shelter: "",
        gender: null,
        updatedAt: moment().tz(process.env.DEFAULT_TIMEZONE).format(),
        // "userName": pwdgen.generate({ length: 10, numbers: true}),
        userName: userName,
        verified: "false",
        action: null,
        active: "true",
        loggedin: "false",
        refid: "undefined",
        balance: 0,
        data: {},
        dl: dl,
      };

      userObj.token = await this.services.authcl.create({ id: userObj.id });

      this.services.dbcl.sqsSendMessage(process.env.FINO_SQS_URL, {
        userId: userObj.id,
        ficode: userObj.id,
        bzFunc: "createUser",
      });

      return userObj;
    } catch (error) {
      throw error;
    }
  }

  normilizeUser(user) {
    delete user.pincode;
    delete user.data;
    delete user.payment;
    //delete user.action;
    return user;
  }

  async checkUserNameAvailability(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.userName && data.userName.trim()) {
        data.userName = data.userName.trim().toLowerCase();
        var result = await this.services.dbcl.getUserByUserName(data.userName);
        if (result && result.length) {
          return {
            userName: data.userName,
            status: "unavailable",
          };
        } else {
          return {
            userName: data.userName,
            status: "available",
          };
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async getUser(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        if (data && data.id) {
          return await this.services.dbcl.getUser(data.id);
        } else {
          let user = await this.services.dbcl.getAdminUser(jwtDecode.id);
          delete user.password;
          return user;
        }
      } else {
        let user = await this.services.dbcl.getUser(jwtDecode.id);
        var userBills = await this.services.dbcl.getUserBills(jwtDecode.id);
        user.mainbills = {
          mobile: null,
          car: null,
          loans: null,
          internet: null,
          credit: null,
          insurance: null,
        };

        user.bills = [];

        for (let i = 0; i < userBills.length; i++) {
          let ub = userBills[i];
          const vd = await this.services.dbcl.getVendor(ub.id);
          if (ub.active === "true") {
            user.bills.push({
              id: ub.id,
              image: vd.image,
              dl: ub.dl,
              balance: ub.balance,
              dueDate: ub.dueDate,
            });
          }
          if (vd.bztype) {
            if (vd.bztype.indexOf("cell phone") !== -1) {
              user.mainbills.mobile = vd.image;
            }
            if (
              vd.bztype.indexOf("car payment") !== -1 ||
              vd.bztype.indexOf("car insurance") !== -1
            ) {
              user.mainbills.car = vd.image;
            }
            if (vd.bztype.indexOf("student loans") !== -1) {
              user.mainbills.loans = vd.image;
            }
            if (vd.bztype.indexOf("internet") !== -1) {
              user.mainbills.internet = vd.image;
            }
            if (vd.bztype.indexOf("credit card") !== -1) {
              user.mainbills.credit = vd.image;
            }
            if (
              vd.bztype.indexOf("medical insurance") !== -1 ||
              vd.bztype.indexOf("car insurance") !== -1
            ) {
              user.mainbills.insurance = vd.image;
            }
          }
        }
        return this.normilizeUser(user);
      }
    } catch (error) {
      throw error;
    }
  }

  async getFirebaseToken(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (jwtDecode.id === process.env.DEFAULTUSERID) {
        throw "Forbidden";
      } else {
        return this.services.msgcl.createFirebaseToken(jwtDecode.id);
      }
    } catch (error) {
      throw error;
    }
  }

  async addUserSubscription(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (jwtDecode.id === process.env.DEFAULTUSERID) {
        throw "Forbidden";
      } else if (jwtDecode.role && jwtDecode.role === "admin") {
        throw "Forbidden";
      } else {
        if (data && data.billId && data.planId) {
          var user = await this.services.dbcl.getUser(jwtDecode.id);
          var plan = await this.services.stripecl.retrievePlan(data.planId);
          data.amount = Number(plan.amount / 100);
          var bill = await this.services.dbcl.getUserBillById(data.billId);
          //var billUser = await this.services.dbcl.getUser(bill.uid);

          // charge user before subscription
          //var chargeResult = await this.services.billcl.chargeBillRaw(data,user,bill,billUser);

          if (user.payment && user.payment.stripeId) {
            var metadata = {
              amount: Number(plan.amount / 100),
              planId: data.planId,
              payer: user.id,
              billId: data.billId,
              vendorId: bill.billerId,
              payee: bill.uid,
            };
            let subscription = await this.services.stripecl.createSubscription(
              user.payment.stripeId,
              data.planId,
              metadata
            );
            metadata.id = subscription.id;
            await this.services.dbcl.putSubscription(metadata);
            return subscription;
          } else {
            throw "paymentMethodIsMissing";
          }
        } else {
          throw "InvalidPayload";
        }
      }
    } catch (error) {
      throw error;
    }
  }

  async cancelUserSubscription(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (jwtDecode.id === process.env.DEFAULTUSERID) {
        throw "Forbidden";
      } else {
        if (data && data.subscriptionId) {
          let result = await this.services.stripecl.cancelSubscription(
            data.subscriptionId
          );
          await this.services.dbcl.deleteSubscription(data.subscriptionId);
          return result;
        } else {
          throw "InvalidPayload";
        }
      }
    } catch (error) {
      throw error;
    }
  }

  async listSubscriptionPlans(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (jwtDecode.id === process.env.DEFAULTUSERID) {
        throw "Forbidden";
      } else {
        let plans = await this.services.stripecl.listSubscriptionPlans(
          data.subscriptionId
        );
        plans.forEach((plan) => {
          plan.amount = Number(plan.amount / 100);
        });
        return plans;
      }
    } catch (error) {
      throw error;
    }
  }

  async getUserSubscriptions(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        if (data && data.id) {
          let user = await this.services.dbcl.getUser(data.id);
          if (user.payment && user.payment.stripeId) {
            return await this.services.stripecl.getUserSubscriptions(
              user.payment.stripeId
            );
          }
        } else {
          throw "InvalidPayload";
        }
      } else {
        let user = await this.services.dbcl.getUser(jwtDecode.id);
        let userSubscriptions = await this.services.dbcl.getPayerSubscription(
          jwtDecode.id
        );
        let userPayeeSubscriptions =
          await this.services.dbcl.getPayeeSubscription(jwtDecode.id);
        userPayeeSubscriptions.forEach((item) => {
          let res = userPayeeSubscriptions.find((x) => x.id === item.id);
          if (!res) {
            userSubscriptions.push(item);
          }
        });

        userSubscriptions = userSubscriptions.sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        );
        if (userSubscriptions.length) {
          let payerSet = new Set();
          let payerMap = new Map();
          let vendorsSet = new Set();
          let vendorsMap = new Map();
          userSubscriptions.forEach((item) => {
            payerSet.add(item.payer);
            vendorsSet.add(item.vendorId);
          });

          let payerIds = Array.from(payerSet);
          while (payerIds.length) {
            let batchpayerIds = payerIds.splice(0, 25);
            let payerUsers = await this.services.dbcl.getUsers(batchpayerIds);
            let utouUsers = await this.services.dbcl.getUTOUByIds(
              jwtDecode.id,
              batchpayerIds
            );
            payerUsers.forEach((pu) => {
              pu.thanks = true;
              payerMap.set(pu.id, pu);
            });

            utouUsers.forEach((ut) => {
              if (payerMap.has(ut.payerid)) {
                let pum = payerMap.get(ut.payerid);
                pum.thanks = ut.thanks === "true" ? true : false;
                payerMap.set(pum.id, pum);
              }
            });
          }

          let vendorIds = Array.from(vendorsSet);
          while (vendorIds.length) {
            let batchvendorIds = vendorIds.splice(0, 25);
            let subVendors = await this.services.dbcl.getVendors(
              batchvendorIds
            );

            subVendors.forEach((pv) => {
              vendorsMap.set(pv.id, pv);
            });
          }

          userSubscriptions.forEach((item) => {
            let trVendor = vendorsMap.has(item.vendorId)
              ? vendorsMap.get(item.vendorId)
              : {
                  id: "undefined",
                  name: "undefined",
                  image: "undefined",
                  imagex: "undefined",
                };
            let trPayer = payerMap.has(item.payer)
              ? payerMap.get(item.payer)
              : {
                  id: "undefined",
                  userName: "undefined",
                  firstName: "undefined",
                  lastName: "undefined",
                  profileImage: "undefined",
                  thanks: false,
                  address: { city: "undefined", state: "undefined" },
                };
            item.vendorInfo = {
              name: trVendor.name,
              image: trVendor.image,
              imagex: trVendor.imagex,
            };
            item.payerInfo = {
              id: trPayer.id,

              userName: trPayer.userName,
              profileImage: trPayer.profileImage,
              thanks: trPayer.thanks !== undefined ? trPayer.thanks : false,
            };
            item.allowDelete = trPayer.id === jwtDecode.id ? true : false;
          });
        }

        return userSubscriptions;
      }

      return [];
    } catch (error) {
      throw error;
    }
  }

  async getPayeeSubscription(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      return await this.services.dbcl.getPayeeSubscription(jwtDecode.id);
    } catch (error) {
      throw error;
    }
  }

  async deleteMe(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      this.iconsole.log("payload data:", data);
      if (jwtDecode.id !== process.env.DEFAULTUSERID) {
        this.iconsole.log("user id:", jwtDecode.id);
        await this.services.dbcl.deleteUser(jwtDecode.id);
        return {
          status: "user deleted",
          id: jwtDecode.id,
        };
      } else {
        throw "Not allowed to delete guest user";
      }
    } catch (error) {
      throw error;
    }
  }

  async notifyUser(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.id && data.message) {
        this.iconsole.log("payload data:", data);
        if (jwtDecode.id !== process.env.DEFAULTUSERID) {
          this.iconsole.log("user id:", jwtDecode.id);
          let obj = {
            id: jwtDecode.id,
            payerid: data.id,
            thanks: "false",
          };
          await this.services.dbcl.putUTOU(obj);
          return await this.services.msgcl.notifyUser(data.id, data.message);
        } else {
          throw "Not allowed to send push to guest user";
        }
      } else {
        throw "Invalid payload, notification parameter is missing in payload";
      }
    } catch (error) {
      throw error;
    }
  }

  async sendTestPush(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.notification) {
        this.iconsole.log("payload data:", data);
        if (jwtDecode.id !== process.env.DEFAULTUSERID) {
          this.iconsole.log("user id:", jwtDecode.id);
          let user = await this.services.dbcl.getUser(jwtDecode.id);
          if (user.devTokens && user.devTokens.length) {
            let payload = data.data ? data.data : null;
            return await this.services.msgcl.sendPush(
              user.devTokens,
              data.notification,
              payload
            );
          } else {
            throw "user device token is missing";
          }
          return { status: "success", info: "user notified" };
        } else {
          throw "Not allowed to send push to guest user";
        }
      } else {
        throw "Invalid payload, notification parameter is missing in payload";
      }
    } catch (error) {
      throw error;
    }
  }

  async updateUser(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      this.iconsole.log("payload data:", data);
      if (data && Object.keys(data).length) {
        if (jwtDecode.id === process.env.DEFAULTUSERID) {
          throw "Forbidden";
        } else if (jwtDecode.role && jwtDecode.role === "admin") {
          let user = await this.services.dbcl.getAdminUser(jwtDecode.id);
          let updateUserRules = {
            options: [
              "firstName",
              "lastName",
              "profileImage",
              "phone",
              "email",
              "settings",
            ],
            action: "allow",
          };

          let numChanges = this.services.utils.updateObject(
            data,
            user,
            updateUserRules
          );
          user = await this.services.dbcl.putAdminUser(user);
          delete user.password;
          return user;
        } else {
          let user = await this.services.dbcl.getUser(jwtDecode.id);
          let valid = ajv.validate(this.userDataSchema, data);
          if (!valid) {
            throw ajv.errorsText();
          }

          if (data.userName && data.userName.trim()) {
            if (data.userName.toLowerCase().trim() === user.userName) {
              delete data.userName;
            } else {
              data.userName = data.userName.toLowerCase().trim();
              let result = await this.services.dbcl.getUserByUserName(
                data.userName
              );
              if (result && result.length) {
                throw "UserNameUnavailable";
              }
              // await this.updateBranchDL({
              //     id: user.id,
              //     userName: data.userName,
              //     dl: user.dl
              // });
            }
          }

          this.iconsole.log("before update data:", data);
          let updateUserRules = {
            options: [
              "firstName",
              "lastName",
              "profileImage",
              "address",
              "dob",
              "social",
              "veteran",
              "homeless",
              "gender",
              "userName",
              "settings",
              "devTokens",
              "geo",
              "ssn",
              "shelter",
            ],
            action: "allow",
          };

          if (data.settings && data.settings.push !== undefined) {
            if (user.settings.push === undefined) {
              this.iconsole.log("user.settings.push === undefined");
              user.settings.push = false;
            }
          }

          let numChanges = this.services.utils.updateObject(
            data,
            user,
            updateUserRules
          );
          user = await this.services.dbcl.putUser(user);
          return this.normilizeUser(user);
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async addPaymentMethod(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.paymentToken && data.paymentToken.trim()) {
        if (jwtDecode.id === process.env.DEFAULTUSERID) {
          throw "Forbidden";
        } else if (jwtDecode.role && jwtDecode.role === "admin") {
          throw "Forbidden";
        } else {
          let user = await this.services.dbcl.getUser(jwtDecode.id);
          if (user.verified === "false") {
            throw "UserPhoneIsNotVerified";
          }
          if (user.payment && user.payment.stripeId) {
            let stripeResponse = await this.services.stripecl.createSource(
              user.payment.stripeId,
              data.paymentToken.trim()
            );
            this.iconsole.log(stripeResponse);
          } else {
            let customerData = {
              phone: user.phone,
              source: data.paymentToken.trim(), //"tok_mastercard" "tok_visa", "tok_amex"
              metadata: {
                uid: user.id,
              },
            };

            if (user.firstName && user.lastName) {
              customerData.name = user.firstName + " " + user.lastName;
            }
            let stripeCustomer = await this.services.stripecl.createCustomer(
              customerData
            );
            user.payment.stripeId = stripeCustomer.id;
            user = await this.services.dbcl.putUser(user);
          }
          return await this.services.stripecl.getPaymentMethods(
            user.payment.stripeId
          );
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async updatePaymentMethod(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.exp_month && data.exp_year && data.paymentSource) {
        if (jwtDecode.id === process.env.DEFAULTUSERID) {
          throw "Forbidden";
        } else if (jwtDecode.role && jwtDecode.role === "admin") {
          throw "Forbidden";
        } else {
          let user = await this.services.dbcl.getUser(jwtDecode.id);
          if (user.payment && user.payment.stripeId) {
            let updateData = {
              exp_month: data.exp_month,
              exp_year: data.exp_year,
            };
            let stripeResponse = await this.services.stripecl.updateSource(
              user.payment.stripeId,
              data.paymentSource,
              updateData
            );
            this.iconsole.log(stripeResponse);
            return stripeResponse;
          } else {
            throw "UserHasNotPaymentMethodToUpdate";
          }
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async updateSubscriptionPaymentSource(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.subscriptionId && data.paymentSource) {
        if (jwtDecode.id === process.env.DEFAULTUSERID) {
          throw "Forbidden";
        } else if (jwtDecode.role && jwtDecode.role === "admin") {
          throw "Forbidden";
        } else {
          let stripeResponse =
            await this.services.stripecl.updateSubscriptionPaymentSource(
              data.subscriptionId,
              data.paymentSource
            );
          this.iconsole.log(stripeResponse);
          return stripeResponse;
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async updateSubscriptionPlan(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.subscriptionId && data.planId) {
        if (jwtDecode.id === process.env.DEFAULTUSERID) {
          throw "Forbidden";
        } else if (jwtDecode.role && jwtDecode.role === "admin") {
          throw "Forbidden";
        } else {
          let stripeResponse =
            await this.services.stripecl.updateSubscriptionPlan(
              data.subscriptionId,
              data.planId
            );
          this.iconsole.log(stripeResponse);
          return stripeResponse;
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async deletePaymentMethod(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.paymentSource) {
        if (jwtDecode.id === process.env.DEFAULTUSERID) {
          throw "Forbidden";
        } else if (jwtDecode.role && jwtDecode.role === "admin") {
          throw "Forbidden";
        } else {
          let user = await this.services.dbcl.getUser(jwtDecode.id);
          if (user.payment && user.payment.stripeId) {
            let stripeResponse = await this.services.stripecl.deleteSource(
              user.payment.stripeId,
              data.paymentSource
            );
            this.iconsole.log(stripeResponse);
            return stripeResponse;
          } else {
            throw "UserHasNotPaymentMethodToUpdate";
          }
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async getPaymentMethods(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.id === process.env.DEFAULTUSERID) {
        throw "Forbidden";
      } else if (jwtDecode.role && jwtDecode.role === "admin") {
        throw "Forbidden";
      } else {
        let user = await this.services.dbcl.getUser(jwtDecode.id);
        if (user.verified === "false") {
          throw "UserPhoneIsNotVerified";
        }
        if (user.payment && user.payment.stripeId) {
          return await this.services.stripecl.getPaymentMethods(
            user.payment.stripeId
          );
        } else {
          return {
            paymentMethods: [],
          };
        }
      }
    } catch (error) {
      throw error;
    }
  }

  async getUserPayments(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.id === process.env.DEFAULTUSERID) {
        throw "Forbidden";
      } else if (jwtDecode.role && jwtDecode.role === "admin") {
        throw "Forbidden";
      } else {
        let userPayments = await this.services.dbcl.getUserOutboundTransactions(
          jwtDecode.id
        );
        let userInboundPayments =
          await this.services.dbcl.getUserInboundTransactions(jwtDecode.id);
        userInboundPayments.forEach((item) => {
          let res = userPayments.find((x) => x.chargeid === item.chargeid);
          if (!res) {
            userPayments.push(item);
          }
        });

        userPayments = userPayments.sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        );

        if (userPayments.length) {
          let payerSet = new Set();
          let payerMap = new Map();
          let vendorsSet = new Set();
          let vendorsMap = new Map();
          userPayments.forEach((item) => {
            payerSet.add(item.payerId);
            if (item.billId) {
              vendorsSet.add(item.billId);
            }
          });

          let payerIds = Array.from(payerSet);
          while (payerIds.length) {
            let batchpayerIds = payerIds.splice(0, 25);
            let payerUsers = await this.services.dbcl.getUsers(batchpayerIds);
            let utouUsers = await this.services.dbcl.getUTOUByIds(
              jwtDecode.id,
              batchpayerIds
            );
            payerUsers.forEach((pu) => {
              pu.thanks = true;
              payerMap.set(pu.id, pu);
            });

            utouUsers.forEach((ut) => {
              if (payerMap.has(ut.payerid)) {
                let pum = payerMap.get(ut.payerid);
                pum.thanks = ut.thanks === "true" ? true : false;
                payerMap.set(pum.id, pum);
              }
            });
          }

          let vendorIds = Array.from(vendorsSet);
          while (vendorIds.length) {
            let batchvendorIds = vendorIds.splice(0, 25);
            let subVendors = await this.services.dbcl.getVendors(
              batchvendorIds
            );

            subVendors.forEach((pv) => {
              vendorsMap.set(pv.id, pv);
            });
          }

          userPayments.forEach((item) => {
            let trVendor = vendorsMap.has(item.billId)
              ? vendorsMap.get(item.billId)
              : {
                  id: "undefined",
                  name: "undefined",
                  image: "undefined",
                  imagex: "undefined",
                };
            let trPayer = payerMap.has(item.payerId)
              ? payerMap.get(item.payerId)
              : {
                  id: "undefined",
                  userName: "undefined",
                  firstName: "undefined",
                  lastName: "undefined",
                  profileImage: "undefined",
                  thanks: false,
                  address: { city: "undefined", state: "undefined" },
                };
            item.vendorInfo = {
              name: trVendor.name,
              image: trVendor.image,
              imagex: trVendor.imagex,
            };
            item.payerInfo = {
              id: trPayer.id,
              userName: trPayer.userName,
              profileImage: trPayer.profileImage,
              thanks: trPayer.thanks !== undefined ? trPayer.thanks : false,
            };
          });
        }

        return userPayments;
      }
    } catch (error) {
      throw error;
    }
  }

  async getUserByUserName(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.userName && data.userName.trim()) {
        data.userName = data.userName.trim().toLowerCase();
        var result = await this.services.dbcl.getUserByUserName(data.userName);
        if (result && result.length) {
          let user = result[0];
          if (jwtDecode.role && jwtDecode.role === "admin") {
            return user;
          } else {
            return {
              id: user.id,
              profileImage: user.profileImage,
              userName: user.userName,
              firstName: user.firstName,
              lastName: user.lastName,
              address: user.address,
              veteran: user.veteran,
              homeless: user.homeless,
            };
          }
        } else {
          throw "InvalidUserName";
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async searchUserByUserName(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.userName && data.userName.trim()) {
        data.userName = data.userName.trim().toLowerCase();
        data.limit =
          data.limit && parseInt(data.limit) ? parseInt(data.limit) : 100;
        var result = await this.services.dbcl.searchUserByUserName(
          data.userName,
          data.limit
        );
        if (jwtDecode.role && jwtDecode.role === "admin") {
          return result;
        } else {
          var response = [];
          result.forEach((user) => {
            response.push({
              id: user.id,
              profileImage: user.profileImage,
              userName: user.userName,
              firstName: user.firstName,
              lastName: user.lastName,
              address: user.address,
              veteran: user.veteran,
              homeless: user.homeless,
            });
          });
          return response;
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async sendInvitation(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.id === process.env.DEFAULTUSERID) {
        throw "Forbidden";
      }

      var data = JSON.parse(event.body);
      if (data && data.phones && Array.isArray(data.phones)) {
        let user = await this.services.dbcl.getUser(jwtDecode.id);
        for (let i = 0; i < data.phones.length; i++) {
          let phone = this.services.utils.normilizePhoneNumber(data.phones[i]);
          let previnv = await this.services.dbcl.getInvitation(
            user.userName,
            phone
          );
          // we can add: https://www.billzero.com/invite/?utm_source=bzapp&utm_medium=refid&utm_campaign=bzaff
          if (data.text) {
            await this.services.msgcl.sendSMS(phone, data.text);
          } else {
            let msg =
              "Want Free Bills? Use BillZero " +
              process.env.INVITATION_ENDPOINT; //+"?ref="+user.userName;
            await this.services.msgcl.sendSMS(phone, msg);
            if (!previnv) {
              let invitation = {
                id: user.userName,
                phone: phone,
              };
              await this.services.dbcl.putInvitation(invitation);
            }
          }
        }

        return {
          status: "invitation sent",
        };
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async sendPin(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.id === process.env.DEFAULTUSERID) {
        throw "Forbidden";
      }
      var user = await this.services.dbcl.getUser(jwtDecode.id);
      var data = JSON.parse(event.body);
      if (data && data.phone && data.phone.trim()) {
        if (
          user.phone &&
          user.phone !== "undefined" &&
          user.phone === data.phone.trim() &&
          user.verified === "true"
        ) {
          this.iconsole.log("User phone already verified");
          throw "User phone already verified";
        } else {
          user.phone = data.phone.trim();
          user.pincode = randomize("0", 4);
          user.verified = "false";
          await this.services.dbcl.putUser(user);
          // send code here by twillio
          let msg = "BillZero PIN " + user.pincode;
          await this.services.msgcl.sendSMS(user.phone, msg);
          this.iconsole.log("pin code sent to user phone");
          return {
            status: "phone validation pin code sent",
            phone: data.phone,
          };
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async procAffiliateData(user) {
    try {
      if (user.verified === "false") {
        this.iconsole.log("this is new user");
        var affRefAmount = Number(process.env.AFFILITE_REF_AMOUNT);
        await this.services.statscl.updateStats({ users: 1 });

        let invAffiliates = await this.services.dbcl.getInvitationAffiliates(
          user.phone
        );
        if (invAffiliates && invAffiliates.length) {
          let refAffiliateId = invAffiliates.reduce((res, item) => {
            if (item.status === "pending") {
              res = item.id;
            }
            return res;
          }, null);

          if (refAffiliateId) {
            user.refid = refAffiliateId;
            for (let i = 0; i < invAffiliates.length; i++) {
              invAffiliates[i].status = "installed";
              await this.services.dbcl.putInvitation(invAffiliates[i]);
            }

            let resusers = await this.services.dbcl.getUserByUserName(
              user.refid
            );
            let affiliateBzUser = resusers.length ? resusers[0] : null;
            if (affiliateBzUser) {
              affiliateBzUser.balance = affiliateBzUser.balance
                ? Number(affiliateBzUser.balance) + affRefAmount
                : affRefAmount;
              await this.services.dbcl.putUser(affiliateBzUser);

              let affiliate = await this.services.dbcl.getAffiliate(
                affiliateBzUser.id
              );
              if (affiliate) {
                affiliate.installs = affiliate.installs
                  ? affiliate.installs++
                  : 1;
              } else {
                affiliate = {
                  bzuid: affiliateBzUser.id,
                  email: affiliateBzUser.email,
                  firstName: affiliateBzUser.firstName,
                  id: affiliateBzUser.userName,
                  installs: 1,
                  lastName: affiliateBzUser.lastName,
                  note: null,
                  phone: affiliateBzUser.phone,
                  profileImage: affiliateBzUser.profileImage,
                  userName: affiliateBzUser.userName,
                  status: "active",
                };
              }

              await this.services.dbcl.putAffiliate(affiliate);
            }
          }
        }
      }

      return user;
    } catch (error) {
      this.iconsole.log(error);
      return user;
    }
  }

  async validatePhone(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.id === process.env.DEFAULTUSERID) {
        throw "Forbidden";
      }
      var user = await this.services.dbcl.getUser(jwtDecode.id);
      var data = JSON.parse(event.body);
      if (data.pincode) {
        if (user.phone === "undefined") {
          throw "UserPhoneIsNotSet";
        }
        if (user.pincode === data.pincode.trim()) {
          // check if user already exsists, if yes swith to new user and delete temporary user
          var userResults = await this.services.dbcl.getUserByPhone(user.phone);
          if (userResults && userResults.length) {
            this.iconsole.log("user already exsists");

            var oldUserId = jwtDecode.id;
            var oldUserData = Object.assign({}, user.data);
            var oldUserAction = user.action;
            if (userResults.length > 1) {
              user = userResults.find((u) => u.id !== oldUserId);
            } else {
              user = userResults[0];
            }

            await this.services.dbcl.deleteUser(oldUserId);
            user.action = oldUserAction;
            user.data = oldUserData;
          }

          if (user.verified === "false") {
            await this.procAffiliateData(user);
          }

          user.pincode = null;
          user.verified = "true";

          // if user action is
          if (user.action === "post") {
            if (
              user.data &&
              Object.keys(user.data) &&
              Object.keys(user.data).length
            ) {
              var vendorId = Object.keys(user.data)[0];
              var billerdata = {
                user_id: user.id,
                biller_id: vendorId,
                credentials: user.data[vendorId],
                // login: this.services.authcl.decryptText(user.data[vendorId].login),
                // password: this.services.authcl.decryptText(user.data[vendorId].password),
                // external_user_id:user.id,
                bzFunc: "createBill",
              };
              let userBills = await this.services.dbcl.getUserBillsByBillerId(
                user.id,
                vendorId
              );
              if (userBills && userBills.length) {
                user.data = {};
                user.action = null;
                user = await this.services.dbcl.putUser(user);
                return {
                  status: "verified",
                  statusData: "phone_verified", //bill_created
                  bill: userBills[0],
                  user: this.normilizeUser(user),
                };
              } else {
                try {
                  // let sqsResponse = await this.services.billcl.postToArcusSQS(billerdata);
                  await this.services.billcl.putEmptyBill(user.id, vendorId);
                  let sqsResponse = await this.services.billcl.postToFinoSQS(
                    billerdata
                  );
                  this.iconsole.log("sqsResponse:", sqsResponse);
                  user.data = {};
                  user.action = null;
                  user = await this.services.dbcl.putUser(user);
                  return {
                    status: "verified",
                    statusData: "phone_verified", //bill_created
                    bill: null,
                    user: this.normilizeUser(user),
                  };
                } catch (error) {
                  user.data = {};
                  user.action = null;
                  user = await this.services.dbcl.putUser(user);
                  return {
                    status: "verified",
                    statusData: "phone_verified",
                    bill: null,
                    user: this.normilizeUser(user),
                  };
                }
              }
            } else {
              user = await this.services.dbcl.putUser(user);
              return {
                status: "verified",
                statusData: "phone_verified",
                bill: null,
                user: this.normilizeUser(user),
              };
            }
          }
          if (user.action === "pay") {
            user = await this.services.dbcl.putUser(user);
            return {
              status: "verified",
              statusData: "phone_verified",
              bill: null,
              user: this.normilizeUser(user),
            };
          } else {
            user = await this.services.dbcl.putUser(user);
            return {
              status: "verified",
              statusData: "phone_verified",
              bill: null,
              user: this.normilizeUser(user),
            };
          }
        } else {
          throw "Unauthorized";
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async createAwsS3PutPresignedUrl(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.id === process.env.DEFAULTUSERID) {
        throw "Forbidden";
      }
      var data = JSON.parse(event.body);
      if (data) {
        data.fileName =
          data.fileName && data.fileName.trim() ? data.fileName : "profile.jpg";
        var path = "users/" + jwtDecode.id + "/" + data.fileName;
        var presignedUrl = await this.services.dbcl.createAwsS3PutPresignedUrl(
          path,
          3000
        );
        var imageUrl = presignedUrl.split("?")[0];
        return {
          presignedUrl: presignedUrl,
          imageUrl: imageUrl,
          presignedUrlTTL: 3000,
        };
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async createAwsS3PutThxPresignedUrl(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.id === process.env.DEFAULTUSERID) {
        throw "Forbidden";
      }
      var data = JSON.parse(event.body);
      if (data) {
        data.fileName =
          data.uri && data.uri.trim() ? data.uri : `thx${this.count}.jpg`;
        this.count = this.count + 1;
        var path = "users/" + jwtDecode.id + "/" + data.fileName;
        // let imagePath =
        //       "users/" +
        //       jwtDecode.id +
        //       "/" +
        //       uuid.v4();
        //     imageUrl = await this.services.dbcl.uploadBase64ImageToAwsS3(
        //       imagePath,
        //       data.fileName
        //     );


        var presignedUrl = await this.services.dbcl.createAwsS3PutPresignedUrl(
          path,
          3000
        );
        var imageUrl = presignedUrl.split("?")[0];
        return {
          presignedUrl: presignedUrl,
          imageUrl: imageUrl,
          presignedUrlTTL: 3000,
        };
        
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
    
  }

  async AwsS3PictureDeletion(event) {

    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      var s3Bucket = data.bucketParams.Bucket
      var s3Key = data.bucketParams.Key
      // Delete the object.
      // console.log(`\nDeleting object "${bucketParams.Key}"} from bucket`);
      var deletePicture = await s3Client.send(
        new DeleteObjectCommand({ Bucket: s3Bucket, Key: s3Key })
      );
      return deletePicture
    } catch (err) {
      console.log("Error deleting object", err);
      return err
    }


  }

  async getUserSupportTickets(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.id === process.env.DEFAULTUSERID) {
        throw "Forbidden";
      } else if (jwtDecode.role && jwtDecode.role === "admin") {
        throw "Forbidden";
      } else {
        return await this.services.supportcl.getUserSupportTickets(
          jwtDecode.id
        );
      }
    } catch (error) {
      throw error;
    }
  }

  async addMobileSupportTicket(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.id === process.env.DEFAULTUSERID) {
        throw "Forbidden";
      } else if (jwtDecode.role && jwtDecode.role === "admin") {
        throw "Forbidden";
      } else {
        var user = await this.services.dbcl.getUser(jwtDecode.id);
        var data = JSON.parse(event.body);
        data.uid = jwtDecode.id;
        data.source = "mobile";
        data.userName = user.userName;
        data.firstName = user.firstName;
        data.lastName = user.lastName;
        data.email = user.email;
        data.profileImage = user.profileImage;
        return await this.services.supportcl.addSupportTicket(data);
      }
    } catch (error) {
      throw error;
    }
  }

  async updateMobileSupportTicket(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.id === process.env.DEFAULTUSERID) {
        throw "Forbidden";
      } else if (jwtDecode.role && jwtDecode.role === "admin") {
        throw "Forbidden";
      } else {
        var data = JSON.parse(event.body);
        if (data && data.id && data.message) {
          data.uid = jwtDecode.id;
          data.who = "user";
          return await this.services.supportcl.updateSupportTicket(data);
        } else {
          throw "InvalidPayload";
        }
      }
    } catch (error) {
      throw error;
    }
  }

  async getTermsOfService(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      let data = await this.services.dbcl.getAdminSettings("tos");
      return {
        body: data.settings.body,
      };
    } catch (error) {
      throw error;
    }
  }

  async getPrivacyPolicy(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      let data = await this.services.dbcl.getAdminSettings("pp");
      return {
        body: data.settings.body,
      };
    } catch (error) {
      throw error;
    }
  }

  async checkUserUVVirgin(userId) {
    try {
      const userInfo = await this.services.dbcl.getUser(userId);
      const uvV = (userInfo.UVV !== undefined && userInfo.UVV !== '');
      if (uvV) {
        return {uvV: true, needUpdate: false};
      }
      //has cc, update UVV = true
      const hasCC = (userInfo.payment.stripeId !== undefined && userInfo.payment.stripeId !== '');
      const userBills = await this.services.dbcl.getUserBills(userId);
      if (hasCC || userBills.length > 0) {
        return {uvV: true, cc: hasCC, bills: userBills.length, needUpdate: true}
      }
      return {uvV: false, needUpdate: false}
    } catch (error) {
      console.log('checkUserHasBILL ', error);
    }
    return false;
  }

  // async checkUserHasBILL(userId) {
  //   try {
  //     const userBills = await this.getUserBills(userId);
  //     return userBills.length;
  //   } catch(err) {
  //     return false;
  //   }
  //
  // }



  // ---------------------------------------------------------------------------
  async getn8(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);

      //get data
      let data = await this.services.dbcl.getAdminSettings("pp");




      return {
        body: data.settings.body,
      };
    } catch (error) {
      throw error;
    }
  }
  // ---------------------------------------------------------------------------
}

module.exports = userclass;
