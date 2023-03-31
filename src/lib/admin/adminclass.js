"use strict";

// commented by evgeny

const querystring = require("querystring");
const moment = require("moment");
const uuid = require("uuid");
const { createUserBillLink } = require("../bill/branchLinks");
const axios = require("axios");

class adminClass {
  constructor(args) {
    for (var parameter in args) {
      this[parameter] = args[parameter];
    }
    this.services.addService("admincl", this);
    this.secret = process.env.JWTSECRET;
  }

  // Admin stats functions
  async getGeneralStats(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data.mockup) {
          return this.services.statscl.getGeneralStatsMockup();
        } else {
          return await this.services.statscl.getGeneralStats();
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  // Admin settings functions

  async getSettings(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data.section) {
          let dbSettings = await this.services.dbcl.getAdminSettings(
            data.section.trim().toLowerCase()
          );
          return {
            section: data.section,
            settings: dbSettings.settings,
          };
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async getShelters(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      const shelters = await this.services.dbcl.getShelters();
      return {
        shelters,
      };
    } catch (error) {
      throw error;
    }
  }

  async getPayRuleSettings(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);

      let dbSettings = await this.services.dbcl.getAdminSettings("common");
      const {paymentSettings} = dbSettings.settings;
      return {
        minimum: paymentSettings.minimumAmount,
        maximum: paymentSettings.maximumAmount,
      };
    } catch (error) {
      throw error;
    }
  }

  async updateSettings(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data.section && data.settings) {
          let dbSettings = await this.services.dbcl.getAdminSettings(
            data.section.trim().toLowerCase()
          );
          this.services.utils.updateObject(data.settings, dbSettings.settings);
          dbSettings = await this.services.dbcl.putAdminSettings(dbSettings);
          return {
            section: data.section,
            settings: dbSettings.settings,
          };
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async createAwsS3ImagePresignedUrl(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data && data.module && data.id && data.fileName) {
          if (data.module === "vendors" || data.module === "karma") {
            var path = data.module + "/" + data.id + "/" + data.fileName;
            var presignedUrl =
              await this.services.dbcl.createAwsS3PutPresignedUrl(path, 3000);
            var imageUrl = presignedUrl.split("?")[0];
            return {
              presignedUrl: presignedUrl,
              imageUrl: imageUrl,
              presignedUrlTTL: 3000,
            };
          } else {
            throw "Invalid Module Name";
          }
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  // Admin user functions

  async createAdminObject(data) {
    try {
      if (
        data.email &&
        data.email.trim() &&
        data.password &&
        data.password.trim() &&
        data.firstName &&
        data.lastName
      ) {
        var dbusers = await this.services.dbcl.getAdminUserByEmail(data.email);
        if (dbusers.length) {
          throw "The email address already in use";
        }
        var adminObj = {
          id: uuid.v4(),
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          password: this.services.authcl.encryptText(data.password),
          profileImage: null,
          phone: "undefined",
          settings: {},
          token: null,
          updatedAt: moment().format(),
          createdAt: moment().format(),
        };

        adminObj.token = await this.services.authcl.create({
          id: adminObj.id,
          role: "admin",
        });

        return adminObj;
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async addAdminUser(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        let userObj = await this.createAdminObject(data);
        var user = await this.services.dbcl.putAdminUser(userObj);
        delete user.password;
        return user;
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async getAdminUser(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var user = await this.services.dbcl.getAdminUser(jwtDecode.id);
        delete user.password;
        return user;
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async updateAdminUser(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data && Object.keys(data).length) {
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
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async updateUserFromAdmin(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data && data.payload && Object.keys(data.payload).length) {
          let user = await this.services.dbcl.getUser(data.uid);
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
              "active",
              "geo",
              "ssn",
              "shelter",
            ],
            action: "allow",
          };

          let numChanges = this.services.utils.updateObject(
            data.payload,
            user,
            updateUserRules
          );
          user = await this.services.dbcl.putUser(user);
          delete user.password;
          return user;
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async adminUserLogin(event) {
    try {
      var data = JSON.parse(event.body);
      if (data.email && data.password) {
        var result = await this.services.dbcl.getAdminUserByEmail(data.email);
        if (result && Array.isArray(result) && result.length) {
          var user = result[0];
          if (
            data.password.trim() ===
            this.services.authcl.decryptText(user.password)
          ) {
            delete user.password;
            return user;
          } else {
            throw "Unauthorized";
          }
        } else {
          throw "InvalidEmail";
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  // affiliate module

  async addAffiliate(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data && data.id && data.id.trim()) {
          let affiliate = {
            bzuid: null,
            email: null,
            firstName: null,
            id: null,
            installs: 0,
            lastName: null,
            note: null,
            phone: null,
            profileImage: null,
            userName: "undefined",
            status: "active",
          };

          let res = await this.services.dbcl.getAffiliate(data.id);
          if (res) {
            throw "The affiliate with given id is already exsists";
          } else {
            let resusers = await this.services.dbcl.getUserByUserName(data.id);
            let affiliateBzUser = resusers.length ? resusers[0] : null;
            if (affiliateBzUser) {
              let numChanges = this.services.utils.updateObject(
                affiliateBzUser,
                affiliate
              );
              affiliate.id = affiliateBzUser.userName;
              affiliate.bzuid = affiliateBzUser.id;
            } else {
              let numChanges = this.services.utils.updateObject(
                data,
                affiliate
              );
            }
          }

          return await this.services.dbcl.putAffiliate(affiliate);
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async updateAffiliate(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data && data.id && data.id.trim()) {
          let affiliate = await this.services.dbcl.getAffiliate(data.id);
          if (affiliate) {
            let numChanges = this.services.utils.updateObject(data, affiliate);
            return await this.services.dbcl.putAffiliate(affiliate);
          } else {
            throw "Invalid affiliate id";
          }
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async getAffiliates(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body) || {};
        data.status = data.status || "active";
        return await this.services.dbcl.getAffiliates(data.status);
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async getAffiliate(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body) || {};
        if (data && data.id && data.id.trim()) {
          return await this.services.dbcl.getAffiliate(data.id);
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  // karma module

  async addKarmaOrg(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (
          data &&
          data.type &&
          data.type.trim() &&
          data.name &&
          data.name.trim()
        ) {
          data.id = uuid.v4();
          var karmaOrg = {
            id: data.id,
            name: null,
            type: null,
            email: null,
            web: null,
            phone: null,
            image: null,
            amount: 0,
            amountPaid: 0,
            status: "active",
          };

          let numChanges = this.services.utils.updateObject(data, karmaOrg);
          return await this.services.dbcl.putKarma(karmaOrg);
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async updateKarmaOrg(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data && data.id) {
          var karmaOrg = await this.services.dbcl.getKarma(data.id);
          let numChanges = this.services.utils.updateObject(data, karmaOrg);
          return await this.services.dbcl.putKarma(karmaOrg);
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async getKarmaOrg(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data && data.id) {
          return await this.services.dbcl.getKarma(data.id);
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async getKarmaOrgs(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      return await this.services.dbcl.getKarmaOrgs();
      // if(jwtDecode.role && jwtDecode.role==="admin")  {
      //     return await this.services.dbcl.getKarmaOrgs();
      //  } else {
      //     throw "Forbidden";
      // }
    } catch (error) {
      throw error;
    }
  }


  async testFunc(event) {
    // const url = 'https://billzero.app.link/zaevDMqvIjb';
    const branch_key = "key_live_piT9H2dFIkvOy32aRyZR2ebnqCiYKIGm";
    // const result = await axios.get(`https://api2.branch.io/v1/url?url=${url}&branch_key=${branch_key}`);
    //
    // return result.data;
    // var bill = { userId: '17ee21c4-e042-46f9-98e8-ac7224781920',
    //   providerAccountId: 173497,
    //   trackingToken: '5e04576a-9f40-4778-8bad-9dbc231c1408',
    //   type: 'aggregationCompletedEvent' }
    const bill = {
      accountId: 99320,
      dueDate: '2021-10-04',
      status: 'success',
      dl: '',
      createdAt: '2021-09-17T19:39:30.106Z',
      logo: 'ladwp.utilities.png',
      accountNumber: '8397200000',
      uid: '17ee21c4-e042-46f9-98e8-ac7224781920',
      paymentOptions: {},
      active: 'true',
      balance: 3703.95,
      billerType: 'utilities',
      image: 'https://billzero-prod.s3.amazonaws.com/vendors/051282b2-34b4-45bc-8413-6f79d23272e1/image.jpg',
      updatedAt: '2021-09-17T19:39:30.106Z',
      providerName: 'LADWP',
      id: '051282b2-34b4-45bc-8413-6f79d23272e1',
      bztype: ['utilities'],
      imagex: 'https://billzero-prod.s3.amazonaws.com/vendors/051282b2-34b4-45bc-8413-6f79d23272e1/imagex.jpg',
      name: 'LADWP',
      hookEvent: 'aggregationCompletedEvent',
      providerAccountId: 173497,
      trackingToken: '5e04576a-9f40-4778-8bad-9dbc231c1408',
      accountData:
        {
          accountId: 99320,
          accountNumber: '8397200000',
          userDefinedData: null,
          nickName: null,
          accountName: null,
          dueDate: 1633330800000,
          amountDue: 3703.95,
          lastPaymentAmount: 2.61,
          lastPaymentDate: 1631602800000,
          isEstimatedData: false,
          billerAddress:
            {
              address1: 'PO BOX 30808',
              address2: 'LOS ANGELES  CA 90030-0808',
              city: 'LOS ANGELES ',
              state: 'CA',
              zip: '90030-0808'
            },
          isAutoPay: null,
          billStatus: null,
          autoPayDate: null,
          payFromId: null,
          paymentMethod: null
        },
      paymentMethods: ['bank']
    };
    try {
      // const user = await this.services.dbcl.getUser('17ee21c4-e042-46f9-98e8-ac7224781920');
      const user = { social:
          { snapchat: null, twitter: null, instagram: null, facebook: null },
        shelter: null,
        lastName: 'briggs',
        dl: '',
        email: null,
        devTokens: [],
        firstName: 'nathaniel',
        profileImage: null,
        balance: 0,
        active: 'true',
        token:
          'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE3ZWUyMWM0LWUwNDItNDZmOS05OGU4LWFjNzIyNDc4MTkyMCIsImlhdCI6MTYzMTY4NjI1NSwiaXNzIjoiYmlsbHplcm8ifQ.Jk6qLNJWgmN5XnHq7NByNQWa4wevBgwSww711OmYWmV2L-66JEGubZY2hNl19LjCT5j9Z3JcUuu8xqRLQhofwr12EqaobC93PpyCUBrsPV-V9fdE_d4m-txK6OUrN8PEgKrR2Smr92B5209bRtM8FElBzG9cGkXnNTwfpiJWnswIrT3Q341SQ1TQZOewWO2KrK5rbUrbaNaK9uNyP5OWMtFKg3LVsDt1hnc3HsrSuOPUxL0vzKrmm8Z2cKdLt2IwOHmdFlKn8KBV5BRxoZ10bQ3wL8dl7LBjyAIEApGuf0lcbFhOChWhbBH1vdxwXgYdjm8_ndVb8csZ_pgljv6fdA',
        data: { billId: '051282b2-34b4-45bc-8413-6f79d23272e1' },
        dob: { month: '09', day: '14', year: '2036' },
        payment: { stripeId: 'cus_KEK0141Qx244SV' },
        id: '17ee21c4-e042-46f9-98e8-ac7224781920',
        loggedin: 'false',
        phone: '+12342218202',
        action: null,
        settings: { push: false },
        pincode: null,
        refid: 'foo6',
        userName: 'moo6',
        createdAt: '2021-09-14T23:10:55-07:00',
        address:
          { country: null,
            state: 'CA',
            postal_code: '90027',
            city: 'los angeles',
            line2: null,
            line1: null },
        homeless: 'false',
        verified: 'true',
        gender: null,
        ssn: '',
        geo: { lat: null, lon: null, geohash: null },
        veteran: 'false',
        updatedAt: '2021-09-18T00:06:56.205Z' }
      // const result = await axios.post('https://api2.branch.io/v1/url', {
      //   branch_key,
      //   channel: "in-app",
      //   stage: "refresh",
      //   campaign: "BillZero",
      //   feature: "user-mr",
      //   tags: [`u - ${user.userName}`],
      //   type: 2,
      //   data: {
      //     bzdata: {
      //       userId: user.id,
      //       userName: user.userName,
      //       billId: bill.id,
      //       billName: bill.name,
      //     },
      //     "$marketing_title": `BZ User ${user.userName}`,
      //     "$og_title": `Money request by ${user.userName}`,
      //     "$og_description": `${user.userName} is requesting money for ${bill.name}`,
      //   }
      // });
      // const url = result.data.url;
      const result = await createUserBillLink(user, bill, false);
      console.log(result.data);
      return result.data;
    } catch (e) {
      console.log('testfunc error', e);
    }
    return;

    const {start, end} = this.services.utils.getTimeofDay();
    // const timeStamp = 1631145600;
    // const {startDate, endDate} = this.services.utils.nextDateFromEpoch(timeStamp);
    // console.log(startDate)
    // console.log(endDate);
    return await this.services.dbcl.getUVInfo('addff01b-fb82-4753-8187-313d01c50d55', start, end);
    return await this.services.dbPlay.refreshCycle({playId: '1631491200', poolId: '9_1631491200'},
      'addff01b-fb82-4753-8187-313d01c50d55',
      'dc56b8df-4f4b-4a9f-98ab-4e5394b08a57', {by: 'uv', amount: 3});
    let promises = [];
    promises.push(
      this.services.msgcl.notifyUserByImpetus('play-uv-validated-payer',
        {payerId: '943cda11-b7c9-48ad-90ac-daa7168c99be', payeeId: 'dc56b8df-4f4b-4a9f-98ab-4e5394b08a57'}));
    await Promise.all(promises);
    console.log('TestFunction finished');
    // return this.services.usercl.checkUserUVVirgin('addff01b-fb82-4753-8187-313d01c50d55');
    // await this.services.dbcl.putUserUV('addff01b-fb82-4753-8187-313d01c50d55', '35fd6313-6331-4e64-a917-4fa40ad7a29b');
    // return await this.services.engagementCL.getEngagement();
    // const timeStamp = '1631059200';
    // const {startDate, endDate} = this.services.utils.nextDateFromEpoch(timeStamp);
    // console.log(timeStamp)
    // const {start, end} = this.services.utils.getTimeofDay();
    // return this.services.dbcl.getUVInfo('dc56b8df-4f4b-4a9f-98ab-4e5394b08a57', start, end);
    // let today = new Date();
    // var start = moment.tz('utc').startOf('day').utc().toISOString();
    // var end = moment.tz('utc').endOf('day').utc().toISOString();
    // console.log(start);
    // console.log(end);
    //
    // return this.services.dbcl.getUVInfo('addff01b-fb82-4753-8187-313d01c50d55',
    //   start, end)
    // const length = await this.services.dbcl.checkUserHasBILL('35fd6313-6331-4e64-a917-4fa40ad7a29b');
    // console.log(length);
    // return length;
    // return await this.services.engagementCL.newEngagementByUVU({
    //   userId: 'addff01b-fb82-4753-8187-313d01c50d55',
    //   viewerId: '819e3bd8-ebfe-47d5-8df8-2388438b4a2c',
    //   poolId: '7_1630454400'
    // });
    // return await this.services.dbPlay.refreshCycle({poolId: '5_1630368000', playId: '1630368000'},
    //   'addff01b-fb82-4753-8187-313d01c50d55',
    //   '819e3bd8-ebfe-47d5-8df8-2388438b4a2c')
    // const newUser = await this.services.uvcl.checkNewViewer('addff01b-fb82-4753-8187-313d01c50d55', '819e3bd8-ebfe-47d5-8df8-2388438b4a2c')
    // return {newUser};
    // const today = new Date();
    // const end = today.toISOString();
    // today.setHours(0, 0, 0);
    // today.setMonth(6);
    // const start = today.toISOString();
    // const {uv1, uv2} = await this.services.dbcl.getUVInfo('34a8097a-e0d0-4e5b-a0d0-05ceb279a768', start, end);
    // return {uv1, uv2};
  }

  async setPotRate(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (!data) {
          if (data.poolId === -1) { //global

          } else {

          }
        } else {
          // throw "InvalidPayload";
        }
      }
    } catch (error) {
      throw error;
    }
    await this.services.dbcl.testFunc();
    return {};
  }

  async getPlay(event) {
    try {

      //authorize
      var jwtDecode = await this.services.authcl.auth(event);

      return await this.services.dbcl.getKarmaOrgs();


      // if(jwtDecode.role && jwtDecode.role==="admin")  {
      //     return await this.services.dbcl.getKarmaOrgs();
      //  } else {
      //     throw "Forbidden";
      // }
    } catch (error) {
      throw error;
    }
  }


  // User module functions

  async getActiveUsers(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data) {
          data.active =
            data.active !== undefined &&
            data.active !== null &&
            data.active.toString() === "true"
              ? "true"
              : "false";
          let result = await this.services.dbcl.getActiveUsers(data.active);
          result.forEach((user) => {
            user.profileImage = user.profileImage
              ? user.profileImage
              : "https://" +
              process.env.BZ_S3_BACKET +
              ".s3.amazonaws.com/users/profileImageDefault.jpg";
          });
          return result;
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async getAllUsers(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        
        if (data) {
          let result = await this.services.dbcl.getAllUsers();
          result.forEach((user) => {
            user.profileImage = user.profileImage
              ? user.profileImage
              : "https://" +
              process.env.BZ_S3_BACKET +
              ".s3.amazonaws.com/users/profileImageDefault.jpg";
          });
          return result;
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async getLoggedinUsers(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data) {
          data.loggedin =
            data.loggedin !== undefined &&
            data.loggedin !== null &&
            data.loggedin.toString() === "true"
              ? "true"
              : "false";
          let result = await this.services.dbcl.getLoggedinUsers(data.loggedin);
          result.forEach((user) => {
            user.profileImage = user.profileImage
              ? user.profileImage
              : "https://" +
              process.env.BZ_S3_BACKET +
              ".s3.amazonaws.com/users/profileImageDefault.jpg";
          });
          return result;
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  // Bills API calls

  async getUserBillById(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data && data.id) {
          return await this.services.dbcl.getUserBillByBillerId(
            data.uid,
            data.id
          );
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async getBillsByDate(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (
          data &&
          data.startDate !== undefined &&
          data.endDate !== undefined
        ) {
          var bills = await this.services.dbcl.getBillsByDate(
            data.startDate,
            data.endDate
          );
          for (let vi in bills) {
            let bill = bills[vi];
            let vendorStats = await this.services.statscl.getVendorStats(
              bill.billerId
            );
            bill.activeBills = vendorStats.activeBills;
            bill.totalPaid = vendorStats.totalPaid;
          }
          return bills;
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async filterBillsByBzType(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data && data.type && data.type.trim()) {
          var bills = await this.services.dbcl.filterBillsByBzType(
            data.type.trim()
          );
          for (let vi in bills) {
            let bill = bills[vi];
            let vendorStats = await this.services.statscl.getVendorStats(
              bill.billerId
            );
            bill.activeBills = vendorStats.activeBills;
            bill.totalPaid = vendorStats.totalPaid;
          }
          return bills;
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async getBillsByAccountNumber(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data && data.accountNumber) {
          var bills = await this.services.dbcl.getBillsByAccountNumber(
            data.accountNumber
          );
          for (let vi in bills) {
            let bill = bills[vi];
            let vendorStats = await this.services.statscl.getVendorStats(
              bill.billerId
            );
            bill.activeBills = vendorStats.activeBills;
            bill.totalPaid = vendorStats.totalPaid;
          }
          return bills;
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  // Transactions API calls

  async getTransactionsByDate(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data && data.startDate !== undefined) {
          data.status = data.status ? data.status : "initialized";
          var statuses = [
            "initialized",
            "pending",
            "confirmed",
            "rejected",
            "paid",
          ];
          var result = [];
          var allPromises = [];
          for (let i = 0; i < statuses.length; i++) {
            allPromises.push(
              this.services.dbcl.getTransactionsByDate(
                data.startDate,
                statuses[i]
              )
            );
            //let transactions = await this.services.dbcl.getTransactionsByDate(data.startDate,statuses[i]);
            //result = result.concate(transactions);
          }

          let promRes = await Promise.all(allPromises);
          //this.iconsole.log("promRes::",promRes);
          promRes.forEach((transactions) => {
            result = result.concat(transactions);
          });

          return result.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async getTransactionsByAccountNumber(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data && data.accountNumber) {
          var bills = await this.services.dbcl.getTransactionsByAccountNumber(
            data.accountNumber
          );
          return bills;
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  // vendor functions
  async updateVendor(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data && data.id) {
          var vendor = await this.services.dbcl.getVendor(data.id);
          vendor.bgColor = vendor.bgColor ? vendor.bgColor : "ffffff";
          vendor.textColor = vendor.textColor ? vendor.textColor : "000000";
          vendor.image = vendor.image
            ? vendor.image
            : "https://" +
            process.env.BZ_S3_BACKET +
            ".s3.amazonaws.com/vendors/imageDefault.jpg";
          vendor.imagex = vendor.imagex
            ? vendor.imagex
            : "https://" +
            process.env.BZ_S3_BACKET +
            ".s3.amazonaws.com/vendors/imagexDefault.jpg";
          vendor.topVendorIndex = vendor.topVendorIndex
            ? parseInt(vendor.topVendorIndex)
            : 0;

          let updateVendorRules = {
            options: [
              "name",
              "bztype",
              "topVendorIndex",
              "image",
              "imagex",
              "bgColor",
              "textColor",
              "supported",
            ],

            action: "allow",
          };

          let numChanges = this.services.utils.updateObject(
            data,
            vendor,
            updateVendorRules
          );
          vendor.sname = vendor.name.toLowerCase();
          return await this.services.dbcl.putVendor(vendor);
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async getSearchVendorByYear(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);

      if (jwtDecode.role && jwtDecode.role === "admin") {
        return await this.services.dbcl.getSearchVendorByYear();
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async getSearchVendorByFound(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data && data.found) {
          return await this.services.dbcl.getSearchVendorByFound(data.found);
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async getSupportTicket(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        return await this.services.supportcl.getSupportTicket(data);
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async getSupportTicketsBetween(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        return await this.services.supportcl.getSupportTicketsBetween(data);
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  // Admin support functions

  async addSupportTicket(event) {
    try {
      /*             var jwtDecode = await this.services.authcl.auth(event);
            if(jwtDecode.role && jwtDecode.role==="admin")  {
                var data = JSON.parse(event.body);
                return await this.services.supportcl.addSupportTicket(data);
            } else {
                throw "Forbidden";
            }  */
      var data = JSON.parse(event.body);
      return await this.services.supportcl.addSupportTicket(data);
    } catch (error) {
      throw error;
    }
  }

  async sendEmail(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data.toEmail && data.subject && data.content) {
          if (data.id) {
            data.uid = jwtDecode.id;
            data.who = "support";
            await this.services.supportcl.updateSupportTicket(data);
          }

          if (data.toEmail) {
            await this.services.msgcl.sendEmail(data);
          }

          return {
            status: "Replay sent",
          };
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async adminUpdateSupportTicket(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);

        if (data && data.id && data.message) {
          data.uid = jwtDecode.id;
          data.who = "support";
          return await this.services.supportcl.updateSupportTicket(data);
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async getProblemReports(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        return await this.services.dbcl.getProblemReports();
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async getProblemReport(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data && data.id) {
          return await this.services.dbcl.getProblemReport(data.id);
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async deleteProblemReport(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        if (data && data.id) {
          return await this.services.dbcl.deleteProblemReport(data.id);
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  // due to API gateway 30 sec limitation this function is useless, think how to bypass
  async updateVendors(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        var startPage = data && data.startPage ? parseInt(data.startPage) : 1;
        return await this.services.arcuscl.updateBillersDatabase(startPage);
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  // Admin Testing functions

  async applyTestContentToUser(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (
        jwtDecode.role &&
        jwtDecode.role === "admin" &&
        process.env.NODE_ENV === "dev"
      ) {
        var data = JSON.parse(event.body);
        var baseUserId = process.env.TESTUSERPAYEEID; // varuzhan
        var payerUser = process.env.TESTUSERPAYERID; // payervaruzhan
        if (data.phone) {
          let res = await this.services.dbcl.getUserByPhone(data.phone.trim());
          if (!res.length) {
            res = await this.services.dbcl.getUserByPhone(
              "+1" + data.phone.trim()
            );
          }
          if (res.length) {
            let baseUser = await this.services.dbcl.getUser(baseUserId);
            let user = res[0];

            // >> Begin Add payment methods
            user.payment = baseUser.payment;
            user = await this.services.dbcl.putUser(user);
            // << End Add payment methods

            // >> Begin Add bills
            let baseUserCharges = await this.services.dbcl.getUserPayments(
              baseUserId
            );
            for (let i = 0; i < baseUserCharges.length; i++) {
              let charge = baseUserCharges[i];
              charge.test = "true";
              charge.uid = user.id;
              charge.chargeid = "0000-" + charge.chargeid;
              await this.services.dbcl.putUserPayment(charge);
            }
            // << End Add bills

            // >> Begin Add bills
            let baseUserBills = await this.services.dbcl.getUserBills(
              baseUserId
            );
            for (let i = 0; i < baseUserBills.length; i++) {
              let bill = baseUserBills[i];
              bill.test = "true";
              bill.uid = user.id;
              bill.id = "0000-" + bill.id;
              await this.services.dbcl.putUserBill(bill);
            }
            // << End Add bills

            // >> Begin Add Payments (transaction)
            let baseUserTransactions =
              await this.services.dbcl.getUserTransactions(baseUserId);
            for (let i = 0; i < baseUserTransactions.length; i++) {
              let tr = baseUserTransactions[i];
              tr.test = "true";
              tr.account_number = "0000-" + tr.account_number;
              tr.uid = user.id;
              tr.id = "0000-" + tr.id;
              await this.services.dbcl.putUserTransaction(tr);
            }
            // << End Add Payments (transaction)

            // >> Begin add payer subscriptions
            let baseUserPayeeSubscriptions =
              await this.services.dbcl.getPayeeSubscription(baseUserId);
            for (let i = 0; i < baseUserPayeeSubscriptions.length; i++) {
              let sub = baseUserPayeeSubscriptions[i];
              let subpayer = {
                id: "test_payee_" + sub.id,
                amount: sub.amount,
                planId: sub.planId,
                payer: sub.payer,
                billId: sub.billId,
                vendorId: sub.vendorId,
                payee: user.id,
                test: "true",
              };
              await this.services.dbcl.putSubscription(subpayer);
            }
            // << End Add payer subscriptions

            // >> Begin add payee subscriptions
            let payerUserPayeeSubscriptions =
              await this.services.dbcl.getPayerSubscription(payerUser);
            for (let i = 0; i < payerUserPayeeSubscriptions.length; i++) {
              let sub = payerUserPayeeSubscriptions[i];
              let subpayer = {
                id: "test_payer_" + sub.id,
                amount: sub.amount,
                planId: sub.planId,
                payer: user.id,
                billId: sub.billId,
                vendorId: sub.vendorId,
                payee: sub.payee,
                test: "true",
              };
              await this.services.dbcl.putSubscription(subpayer);
            }
            // << End Add payee subscriptions

            return user;
          } else {
            throw "User with given phone number does not exsist";
          }
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async ProcessTwillioSms(event) {
    this.iconsole.log(event);
    try {
      var data = querystring.parse(event.body);
      if (
        data.SmsStatus &&
        data.SmsStatus === "received" &&
        data.From &&
        data.Body
      ) {
        let res = await this.services.dbcl.getUserByPhone(data.From);
        if (res.length) {
          let user = res[0];
          let tickets = await this.services.dbcl.getUserSupportTickets(user.id);
          if (tickets.length) {
            tickets = tickets.sort(
              (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
            );
            let lastTicket = tickets[0];
            let supportData = {
              id: lastTicket.id,
              uid: user.id,
              message: data.Body,
            };
            await this.services.supportcl.updateSupportTicket(supportData);
          } else {
            let supportData = {};
            supportData.uid = user.id;
            supportData.source = "mobile";
            supportData.userName = user.userName;
            supportData.firstName = user.firstName;
            supportData.lastName = user.lastName;
            supportData.email = user.email;
            supportData.profileImage = user.profileImage;
            supportData.message = data.Body;
            await this.services.supportcl.addSupportTicket(supportData);
          }
        } else {
          let supportData = {
            type: "text",
            Caller: data.From,
            message: data.Body,
          };
          await this.services.supportcl.addSupportTicket(supportData);
        }
      }
      return "Done";
    } catch (err) {
    }
  }

  async deleteTestContentUser(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (
        jwtDecode.role &&
        jwtDecode.role === "admin" &&
        process.env.NODE_ENV === "dev"
      ) {
        var data = JSON.parse(event.body);
        if (data.phone) {
          let res = await this.services.dbcl.getUserByPhone(data.phone.trim());
          if (!res.length) {
            res = await this.services.dbcl.getUserByPhone(
              "+1" + data.phone.trim()
            );
          }
          if (res.length) {
            let user = res[0];

            // >> Begin delete payment methods
            user.payment = {};
            user = await this.services.dbcl.putUser(user);
            // << End delete payment methods

            // >> Begin delete charges
            let baseUserCharges = await this.services.dbcl.getUserPayments(
              user.id
            );
            for (let i = 0; i < baseUserCharges.length; i++) {
              let charge = baseUserCharges[i];
              await this.services.dbcl.deleteUserPayment(
                charge.uid,
                charge.chargeid
              );
            }

            // >> Begin delete bills
            let baseUserBills = await this.services.dbcl.getUserBills(user.id);
            for (let i = 0; i < baseUserBills.length; i++) {
              let bill = baseUserBills[i];
              await this.services.dbcl.deleteUserBill(bill.uid, bill.id);
            }
            // << End delete bills

            // >> Begin delete Payments (transaction)
            let baseUserTransactions =
              await this.services.dbcl.getUserTransactions(user.id);
            for (let i = 0; i < baseUserTransactions.length; i++) {
              let tr = baseUserTransactions[i];
              await this.services.dbcl.deleteUserTransaction(tr.uid, tr.id);
            }
            // << End delete Payments (transaction)

            // >> Begin delete payer subscriptions
            let baseUserPayeeSubscriptions =
              await this.services.dbcl.getPayeeSubscription(user.id);
            for (let i = 0; i < baseUserPayeeSubscriptions.length; i++) {
              let sub = baseUserPayeeSubscriptions[i];
              await this.services.dbcl.deleteSubscription(sub.id);
            }
            // << End delete payer subscriptions

            // >> Begin delete payee subscriptions
            let payerUserPayeeSubscriptions =
              await this.services.dbcl.getPayerSubscription(user.id);
            for (let i = 0; i < payerUserPayeeSubscriptions.length; i++) {
              let sub = payerUserPayeeSubscriptions[i];
              await this.services.dbcl.deleteSubscription(sub.id);
            }
            // << End delete payee subscriptions

            if (data.deleteUser) {
              await this.services.dbcl.deleteUser(user.id);
            }

            return {
              id: user.id,
              status: "deleted",
            };
          } else {
            throw "User with given phone number does not exsist";
          }
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      throw error;
    }
  }

  async killGame(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        console.log("killGame ", data);
        const {playId} = data;
        await this.services.uvcl.deleteItems();
        await this.services.engagementCL.deleteItems();
        const removedPlayIds = await this.services.dbPlay.deletePlay(playId);
        const removedPoolIds = await this.services.dbPlay.deletePoolsByPlayId(playId);
        // const impetusPayload = await this.services.dbcl.getImpetusEntry('play-ending');
        console.log('removedPoolIds ', removedPoolIds);
        let promises = [];
        for (const [key, value] of Object.entries(removedPoolIds)) {
          const pot = removedPlayIds[0].pot;
          promises.push(new Promise((resolve, reject) => {
            this.services.msgcl.notifyUserByImpetus('play-ending', {pot: pot, value: value})
              .then((res) => {
                resolve();
              });
          }));
        }
        await Promise.all(promises);
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      console.log('err kill game: ', error);
      throw error;
    }
  }

  async getPlayInfo(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        const data = JSON.parse(event.body);
        console.log("getPlayInfo", event.body);
        const {playId} = data;
        const allPlays = await this.services.dbPlay.getPlayInfo(playId);
        console.log('getPlayInfo ret ', allPlays);
        return allPlays;
      }
    } catch (err) {
      console.log('getPlayInfo: ', err);
      throw err;
    }
  }

  async genGame(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        var data = JSON.parse(event.body);
        const timeStamp = this.services.utils.dateToEpoch(new Date());
        const playInfo = await this.services.dbPlay.getPlayInfo(timeStamp);
        if (playInfo.pools.length > 0) {
          return {newPlayId: timeStamp, msg: 'already exist'};
        }

        if (data && data.poolSize) {
          const users = await this.services.dbcl.getUsersWithActiveBills('true');
          console.log('adminGenGame 1');
          const groups = await this.services.dbPlay.createGameWithUsers(users, data);
          console.log('adminGenGame 2');
          const gameBillInfo = [];
          let promisesGroup = [];
          console.log('adminGenGame 3');
          for (const _group of groups) {
            promisesGroup.push(this.services.dbPlay.calculateProbability(_group));
          }
          const result = await Promise.all(promisesGroup);
          // const billInfo = await this.services.dbPlay.calculateProbability(_group);
          let promisesEngagement = [];
          let promisesNotify = [];
          for (const _probabilityInfo of result) {
            const {billInfo, group} = _probabilityInfo;
            this.services.dbPlay.populateProbability(billInfo, group).then(() => {
              console.log('Populating Probability succeed');
            }).catch((err) => {
              console.log('Populating Probability error: ', err);
            });

            gameBillInfo.push({
              poolId: group.id,
              probInfo: billInfo
            });
            promisesEngagement.push(this.services.engagementCL.newEngagementByNewGame(
              {value: billInfo, poolId: group.poolId, playId: group.playId}));
            promisesNotify.push(this.services.msgcl.notifyUserByImpetus('play-start',
              {pot: group.pot, value: billInfo}));

            // for (const bill of billInfo) {
            //   // msg = msg + `${bill.userid} 's probability is ${bill.prob}` + '\n';
            //   let msg = impetusPayload;
            //
            //   msg = msg.replace('$[PROB]', `${Math.round(bill.prob)}%`);
            //   promisesEngagement.push(new Promise((resolve, reject) => {
            //       this.services.engagementCL.newEngagementByNewGame({userId: bill.userid, impetus: msg,
            //         poolId: group.poolId, parentId: newPoolEngage.id}).then((res)=>{
            //         resolve()
            //     })
            //   }));
            //   promisesNotify.push(new Promise((resolve, reject) => {
            //     this.services.msgcl.notifyUser(bill.userid, msg).then((res)=>{
            //       resolve()
            //     })
            //   }));
            // }
          }
          await Promise.all(promisesEngagement);
          await Promise.all(promisesNotify);

          console.log("admingenGame return", gameBillInfo);
          return {newPlayId: groups[0].playId};
        } else {
          throw "InvalidPayload";
        }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      console.log('err genGame: ', error);
      throw error;
    }
  }

  async getPoolInfo(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        if (event.body != null) {
          var data = JSON.parse(event.body);
          console.log('getPoolInfo', data);
          return await this.services.dbPlay.refreshPoolInfo(data.poolId);
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  async getEngagementInfo(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        // var data = JSON.parse(event.body);
        // if (data && data.startDate !== undefined) {
        //   return await this.services.dbcl.getEngagementInfoByDate(data.startDate);
        // } else {
        const {start, end} = this.services.utils.getTimeofDay();
        return await this.services.engagementCL.getEngagement(start);
        // }
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      console.log(error);
    }
  }

  async getImpetus(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      if (jwtDecode.role && jwtDecode.role === "admin") {
        // var data = JSON.parse(event.body);
        return await this.services.dbcl.getImpetus();
      } else {
        throw "Forbidden";
      }
    } catch (error) {
      console.log(error);
    }
  }
}

module.exports = adminClass;
