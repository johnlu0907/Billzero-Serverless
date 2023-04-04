"use strict";

const axios = require("axios");
const moment = require("moment");
const momenttimezone = require("moment-timezone");
const uuid = require("uuid");
const randomize = require("randomatic");
const pwdgen = require("generate-password");
const jsdom = require("jsdom");
const { createUserBillLink } = require("./branchLinks");
const branch = require("../utils/branch");

const branch_key = "key_live_piT9H2dFIkvOy32aRyZR2ebnqCiYKIGm";

class billClass {
  constructor(args) {
    for (var parameter in args) {
      this[parameter] = args[parameter];
    }
    this.services.addService("billcl", this);
    this.secret = process.env.JWTSECRET;
  }

  normilizeBill(bill) {
    try {
      if (bill.error_message) {
        throw bill.error_message;
      }
      bill.id = bill.uuid;
      bill.uid = bill.external_user_id;
      bill.billerId = bill.biller_uuid;
      //bill.active = "true";
      delete bill.uuid;
      delete bill.external_user_id;
      delete bill.biller_id;
      delete bill.biller_uuid;
      return bill;
    } catch (error) {
      throw error;
    }
  }

  async createDeepLink(event) {
    // try {
    //   var jwtDecode = await this.services.authcl.auth(event);
    //   var data = JSON.parse(event.body);
    //   if(data && data.billId)  {
    //     data.amount = data.amount ? Number(data.amount):0;
    //     var bill = await this.services.dbcl.getUserBillById(data.billId);
    //     var promocode = pwdgen.generate({ length: 10, numbers: true});
    //     var billpromo = {
    //       id:promocode,
    //       billId:data.billId,
    //       amount:data.amount,
    //       link:"billzero://paybill/"+promocode
    //     }
    //     return await this.services.dbcl.putPromocode(billpromo);
    //   } else {
    //       throw "InvalidPayload";
    //   }
    // } catch (error) {
    //     throw error;
    // }
  }

  async getDeepLinkBill(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.id) {
        let result = await this.services.dbcl.getPromocode(data.id);
        if (result.userId) {
          const user = await this.services.dbcl.getUser(result.userId);
          result.userName = user.userName;
        }
        return result;
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  // for testing, manual linking
  async xDataLinkWithXPay(vendorId, account_number) {
    try {
      var vendor = await this.services.dbcl.getVendor(vendorId);
      vendor.xPayBillerIds =
        vendor.xPayBillerIds && Array.isArray(vendor.xPayBillerIds)
          ? vendor.xPayBillerIds
          : [];
      if (!vendor.xPayBillerIds.length) {
        var xPayRppsBiller = await this.services.arcuscl.xpayBillerFind({
          vendor: vendor,
          account_number: account_number,
        });
        if (xPayRppsBiller) {
          this.iconsole.log("1.Found xPay biller:", xPayRppsBiller);
          if (
            !vendor.xPayBillerIds.find((item) => item === xPayRppsBiller.id)
          ) {
            vendor.xPayBillerIds.push(xPayRppsBiller.id);
            this.iconsole.log(
              "2.Found xPay biller adding to list:",
              xPayRppsBiller
            );
            await this.services.dbcl.putVendor(vendor);
          } else {
            this.iconsole.log(
              "3.Found xPay biller, already in list:",
              xPayRppsBiller
            );
          }
        } else {
          this.iconsole.log("4.Could not find xPay biller");
          throw "Could not find xPay biller";
        }
      }

      return vendor;
    } catch (error) {
      throw error;
    }
  }

  async getBillTransactions(bill) {
    try {
      bill.payers = [];
      var transactions = await this.services.dbcl.getBillTransactions(bill.id);
      var payerSet = new Set();
      var payerMap = new Map();
      transactions.forEach((tr) => {
        payerSet.add(tr.payerId);
      });

      var payerIds = Array.from(payerSet);
      while (payerIds.length) {
        let batchpayerIds = payerIds.splice(0, 25);
        let payerUsers = await this.services.dbcl.getUsers(batchpayerIds);
        payerUsers.forEach((pu) => {
          payerMap.set(pu.id, pu);
        });
      }

      transactions.forEach((tr) => {
        let trPayer = payerMap.has(tr.payerId)
          ? payerMap.get(tr.payerId)
          : {
              id: "undefined",
              userName: "undefined",
              firstName: "undefined",
              lastName: "undefined",
              profileImage: "undefined",
              address: { city: "undefined", state: "undefined" },
            };
        /*           tr.payerInfo = {
            id:tr.payerId,
            userName: trPayer.userName,
            firstName: trPayer.firstName,
            lastName: trPayer.lastName,
            profileImage: trPayer.profileImage,
            city:trPayer.address.city,
            state:trPayer.address.state
          } */
        bill.payers.push({
          id: tr.payerId,
          amount: tr.amount,
          userName: trPayer.userName,
          profileImage: trPayer.profileImage,
        });
      });

      return transactions;
    } catch (error) {
      throw error;
    }
  }

  async getMyBills(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      var userBills = await this.services.dbcl.getUserBills(jwtDecode.id);
      if (jwtDecode.role !== "admin") {
        // security related issue - remove fields: payments, payment_method, subordinates, account_number, address
        userBills = userBills.filter((ub) => ub.active == "true");
      }

      for (let i = 0; i < userBills.length; i++) {
        let ub = userBills[i];
        ub.repost = "false";
        await this.getBillTransactions(ub);
        delete ub.payments;
        delete ub.payment_method;
        delete ub.subordinates;
        delete ub.account_number;
        delete ub.statements;
        delete ub.address;
        if (ub.status === "success" && ub.dueDate) {
          let diff = moment().diff(moment(new Date(ub.dueDate)), "days");
          if (diff >= 1) {
            ub.repost = "true";
          }
        }
      }

      for (let ub of userBills) {
        const vendor = await this.services.dbcl.getVendor(ub.id);
        ub.image = vendor.image;
        ub.imagex = vendor.imagex;
      }

      return userBills;
    } catch (error) {
      throw error;
    }
  }

  async getUserBills(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      console.log(data);
      var userBills = [];
      if (data && data.id) {
        userBills = await this.services.dbcl.getUserBills(data.id);
      } else if (data && data.userName && data.userName.trim()) {
        var result = await this.services.dbcl.getUserByUserName(
          data.userName.trim().toLowerCase()
        );
        if (result && result.length) {
          let user = result[0];
          let adminSettings = await this.services.dbcl.getAdminSettings(
            "common"
          );
          let paymentSettings = adminSettings.settings.paymentSettings;
          userBills = await this.services.dbcl.getUserBills(user.id);
          // userBills = userBills.reduce((res,item)=>{
          //   if(item.status === "updated" && item.due_date && Number(item.balance)>=Number(paymentSettings.minimumAmount)){
          //     let diff = moment().diff(moment(new Date(item.due_date)),'days');
          //     if (diff <= 0){
          //       res.push(item);
          //     }
          //   }

          //   return res;
          // },[]);
          if (user.id !== jwtDecode.id) {
            let viewer = await this.services.dbcl.getUser(jwtDecode.id);
            if (viewer.userName === "guest") {
              this.iconsole.log("Is the guest user");
            } else {
              // TO DO update UV table here
              // TO DO Check viewer for valid or not.
              let valid = false;
              await this.services.dbcl.putUserUV(user.id, viewer.id);

              let msg = "BillZero | @" + viewer.userName + " viewed your Bills";
              console.log(
                `BillZero | @${viewer.userName} viewed ${user.userName} Bills`
              );
              await this.services.msgcl.notifyUser(user.id, msg);
            }
          } else {
            this.iconsole.log("Is the same user");
          }
        } else {
          throw "InvalidUserName";
        }
      } else {
        userBills = await this.services.dbcl.getUserBills(jwtDecode.id);
      }

      if (jwtDecode.role !== "admin") {
        // security related issue - remove fields: payments, payment_method, subordinates, account_number, address
        userBills = userBills.filter((ub) => ub.active == "true");
        userBills.forEach((ub) => {
          delete ub.payments;
          delete ub.payment_method;
          delete ub.subordinates;
          delete ub.account_number;
          delete ub.statements;
          delete ub.address;
        });
      }

      for (let ub of userBills) {
        const vendor = await this.services.dbcl.getVendor(ub.id);
        ub.image = vendor.image;
        ub.imagex = vendor.imagex;
      }

      return userBills;
    } catch (error) {
      throw error;
    }
  }

  async getUserBill(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.userName && data.id) {
        const result = await this.services.dbcl.getUserByUserName(
          data.userName
        );
        if (result && result.length) {
          let ub = await this.services.dbcl.getUserBillByBillerId(
            result[0].id,
            data.id
          );
          delete ub.payments;
          delete ub.payment_method;
          delete ub.subordinates;
          delete ub.account_number;
          delete ub.statements;
          delete ub.address;
          return ub;
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

  async userBillViewed(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.billId) {
        var bill = await this.services.dbcl.getUserBillById(data.billId);
        if (bill.uid !== jwtDecode.id) {
          let user = await this.services.dbcl.getUser(jwtDecode.id);
          let msg =
            user.userName === "guest"
              ? "You BillZero bill viewed by anonymous user"
              : "You BillZero bill viewed by @" + user.userName;
          await this.services.msgcl.notifyUser(bill.uid, msg);
        }
        return {
          status: "notification sent",
        };
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async getUserBillTransactions(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.id) {
        var transactions = [];
        var bill = await this.services.dbcl.getUserBillById(data.id);
        if (jwtDecode.role && jwtDecode.role === "admin") {
          transactions = await this.services.dbcl.getBillTransactions(bill.id);
        } else {
          if (bill.uid === jwtDecode.id) {
            transactions = await this.services.dbcl.getBillTransactions(
              bill.id
            );
          } else {
            throw "Forbidden";
          }
        }

        var payerSet = new Set();
        var payerMap = new Map();
        transactions.forEach((tr) => {
          payerSet.add(tr.payerId);
        });

        var payerIds = Array.from(payerSet);
        while (payerIds.length) {
          let batchpayerIds = payerIds.splice(0, 25);
          let payerUsers = await this.services.dbcl.getUsers(batchpayerIds);
          payerUsers.forEach((pu) => {
            payerMap.set(pu.id, pu);
          });
        }

        transactions.forEach((tr) => {
          let trPayer = payerMap.has(tr.payerId)
            ? payerMap.get(tr.payerId)
            : {
                id: "undefined",
                userName: "undefined",
                firstName: "undefined",
                lastName: "undefined",
                profileImage: "undefined",
                address: { city: "undefined", state: "undefined" },
              };
          tr.payerInfo = {
            id: tr.payerId,
            userName: trPayer.userName,
            firstName: trPayer.firstName,
            lastName: trPayer.lastName,
            profileImage: trPayer.profileImage,
            city: trPayer.address.city,
            state: trPayer.address.state,
          };
        });

        return transactions;
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async getBillTransactionsByUserID(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.id) {
        var transactions = [];
        var bill = await this.services.dbcl.getUserBillById(data.id);
        if (jwtDecode.role && jwtDecode.role === "admin" && data.uid) {
          transactions = await this.services.dbcl.getBillTransactionsByUserID(
            bill.id,
            data.uid
          );
        } else {
          if (bill.uid === jwtDecode.id) {
            transactions = await this.services.dbcl.getBillTransactionsByUserID(
              bill.id,
              jwtDecode.id
            );
          } else {
            throw "Forbidden";
          }
        }

        var payerSet = new Set();
        var payerMap = new Map();
        transactions.forEach((tr) => {
          payerSet.add(tr.payerId);
        });

        var payerIds = Array.from(payerSet);
        while (payerIds.length) {
          let batchpayerIds = payerIds.splice(0, 25);
          let payerUsers = await this.services.dbcl.getUsers(batchpayerIds);
          payerUsers.forEach((pu) => {
            payerMap.set(pu.id, pu);
          });
        }

        transactions.forEach((tr) => {
          let trPayer = payerMap.has(tr.payerId)
            ? payerMap.get(tr.payerId)
            : {
                id: "undefined",
                userName: "undefined",
                firstName: "undefined",
                lastName: "undefined",
                profileImage: "undefined",
                address: { city: "undefined", state: "undefined" },
              };
          tr.payerInfo = {
            id: tr.payerId,
            userName: trPayer.userName,
            firstName: trPayer.firstName,
            lastName: trPayer.lastName,
            profileImage: trPayer.profileImage,
            city: trPayer.address.city,
            state: trPayer.address.state,
          };
        });

        return transactions;
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async putEmptyBill(userId, vendorId) {
    const vendor = await this.services.dbcl.getVendor(vendorId);
    const bill = {
      id: vendor.id,
      uid: userId,
      active: "false",
      providerName: vendor.name,
      billerType: vendor.biller_type,
      bztype: vendor.bztype,
      dueDate: "2022-01-01",
      logo: vendor.logo,
      image: vendor.image,
      imagex: vendor.imagex,
      status: "pending",
      balance: 0,
      accountId: null,
      accountNumber: null,
      dl: "",
      paymentOptions: {},
    };

    await this.services.dbcl.putUserBill(bill);
  }

  async postBill(event) {
    var user = null;
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.vendorId && data.credentials) {
        if (jwtDecode.id === process.env.DEFAULTUSERID) {
          // new user
          let userObj = await this.services.usercl.createUserObject(data);
          if (data.refid && data.refid.trim()) {
            userObj.refid = data.refid.toLowerCase();
          }

          userObj.action = "post";
          userObj.pincode = randomize("0", 4);
          userObj.data = {};
          userObj.data[data.vendorId] = data.credentials;
          user = await this.services.dbcl.putUser(userObj);
          return {
            status: "waiting",
            statusData: "phone_validation",
            bill: null,
            user: this.services.usercl.normilizeUser(user),
          };
        } else {
          user = await this.services.dbcl.getUser(jwtDecode.id);
          if (user.verified === "false") {
            throw "UserIsNotVerified";
          }
          user.action = null;
          user = await this.services.dbcl.putUser(user);
          /*           if(process.env.NODE_ENV === "dev"){
            data.vendorId = "f39bc1ee-0433-4377-a284-a42d49a1c14f";
          }    */

          let userBills = await this.services.dbcl.getUserBillsByBillerId(
            user.id,
            data.vendorId
          );
          if (userBills && userBills.length) {
            return {
              status: "bill_exsist",
              bill: userBills[0],
              user: this.services.usercl.normilizeUser(user),
            };
          } else {
            await this.putEmptyBill(user.id, data.vendorId);

            const finoData = {
              userId: user.id,
              vendorId: data.vendorId,
              credentials: data.credentials,
            };

            const billStatus = await this.services.finocl.addProviderAccount(
              finoData
            );

            return {
              status: "bill_processing",
              bill: billStatus,
              user: this.services.usercl.normilizeUser(user),
            };
          }
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      await this.services.dbcl.putProblemReport({
        group: "bill",
        func: "postBill",
        subject: error,
        info: {
          userId: jwtDecode.id,
          vendorId: data.vendorId,
          error: error,
        },
      });
      throw error;
    }
  }

  async postToArcusSQS(data) {
    try {
      return this.services.dbcl.sqsSendMessage(process.env.ARCUS_SQS_URL, data);
    } catch (error) {
      throw error;
    }
  }

  async postToFinoSQS(data) {
    try {
      return this.services.dbcl.sqsSendMessage(process.env.FINO_SQS_URL, data);
    } catch (error) {
      throw error;
    }
  }

  //This endpoint allows you to update a specific bill's credentials and/or answer MFA challenges.
  async updateBill(event) {
    var user = null;

    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.billId && data.answer) {
        if (jwtDecode.id === process.env.DEFAULTUSERID) {
          throw "Forbidden";
        } else if (jwtDecode.role && jwtDecode.role === "admin") {
          throw "Forbidden";
        } else {
          user = await this.services.dbcl.getUser(jwtDecode.id);
          if (user.verified === "false") {
            throw "UserIsNotVerified";
          }
          let dbBill = await this.services.dbcl.getUserBillByBillerId(
            user.id,
            data.billId
          );
          // let dbBill = await this.services.dbcl.getBillById(data.billId);
          this.iconsole.log("dbBill::", dbBill);
          if (dbBill) {
            // var billerdata = {
            //   user_id: user.id,
            //   tracking_token: dbBill.trackingToken,
            //   answer: data.answer,
            //   bzFunc: "updateBill"
            // }

            // var sqsResponse = await this.postToFinoSQS(billerdata);
            // this.iconsole.log("sqsResponse:",sqsResponse);
            await this.services.finocl.setMFAAnswer(
              user.id,
              dbBill.trackingToken,
              data.answer
            );
            return {
              status: "bill_processing",
              bill: null,
              user: this.services.usercl.normilizeUser(user),
            };
          } else {
            return {
              status: "bill_expired",
              bill: null,
              user: this.services.usercl.normilizeUser(user),
            };
          }
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async forceUpdateBill(event) {
    var user = null;

    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.billId && data.uid) {
        if (jwtDecode.role && jwtDecode.role === "admin") {
          user = await this.services.dbcl.getAdminUser(jwtDecode.id);
          let dbBill = await this.services.dbcl.getUserBillByBillerId(
            data.uid,
            data.billId
          );
          // let dbBill = await this.services.dbcl.getBillById(data.billId);
          this.iconsole.log("dbBill::", dbBill);
          if (dbBill) {
            let updateUserRules = {
              options: [
                "uid",
                "accountData",
                "accountId",
                "accountNumber",
                "active",
                "balance",
                "billerType",
                "bztype",
                "updatedAt",
                "dl",
                "dueDate",
                "hookEvent",
                "image",
              ],
              action: "allow",
            };

            let numChanges = this.services.utils.updateObject(
              data.payload,
              dbBill,
              updateUserRules
            );
            const bill = await this.services.dbcl.putUserBill(dbBill);
            return bill;
          } else {
            throw "Not Exist";
          }
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async refreshBill(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.billId) {
        if (jwtDecode.id === process.env.DEFAULTUSERID) {
          throw "Forbidden";
        } else {
          var user = await this.services.dbcl.getUser(jwtDecode.id);

          if (user.verified === "false") {
            throw "UserIsNotVerified";
          }
          // var bill = await this.services.dbcl.getUserBillById(data.billId);
          //var billUser = await this.services.dbcl.getUser(bill.uid);

          var bill = await this.services.dbcl.getUserBillByBillerId(
            user.id,
            data.billId
          );

          this.iconsole.log("===refresh bill: ", bill);

          if (bill && bill.accountId) {
            const account = await this.services.finocl.getUserAccountById(
              user.id,
              bill.accountId
            );
            const accountResponse = account.accountResponse;
            const { accountData } = accountResponse;

            const dueDate =
              accountData.dueDate && accountData.dueDate !== ""
                ? moment(accountData.dueDate)
                    .tz(process.env.DEFAULT_TIMEZONE)
                    .format("YYYY-MM-DD")
                : moment()
                    .add(30, "days")
                    .tz(process.env.DEFAULT_TIMEZONE)
                    .format("YYYY-MM-DD");

            bill = {
              ...bill,
              balance: accountData.amountDue,
              dueDate,
              accountData,
            };

            await this.services.dbcl.putUserBill(bill);

            // const refreshResult = await this.services.finocl.refreshAccount({
            //   user_id : user.id,
            //   account_id: bill.providerAccountId
            // });
            // this.iconsole.log('refreshBillResult: ', refreshResult);
            // bill.status = "refresh";
            // this.services.dbcl.putUserBill(bill);

            // let billerdata = {
            //   bzFunc : "refreshBill",
            //   user_id : user.id,
            //   account_id: bill.providerAccountId
            // };

            // var sqsResponse = await this.postToFinoSQS(billerdata);
            // this.iconsole.log("sqsResponse:",sqsResponse);
            // return {
            //   status:"bill_processing",
            //   bill:bill
            // }
          }
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async forceRefreshBill(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      console.log("forceRefreshBill - ", data);
      if (data && data.billId && data.accountId) {
        if (jwtDecode.id === process.env.DEFAULTUSERID) {
          throw "Forbidden";
        } else {
          const user = await this.services.dbcl.getUser(jwtDecode.id);

          if (user.verified === "false") {
            throw "UserIsNotVerified";
          }

          const userId = user.id;
          const accountId = data.accountId;

          let bill = await this.services.dbcl.getUserBillByBillerId(
            userId,
            data.billId
          );
          const account = await this.services.finocl.getUserAccountById(
            userId,
            accountId
          );
          const accountResponse = account.accountResponse;
          const { accountData } = accountResponse;

          const dueDate =
            accountData.dueDate && accountData.dueDate !== ""
              ? moment(accountData.dueDate)
                  .tz(process.env.DEFAULT_TIMEZONE)
                  .format("YYYY-MM-DD")
              : moment()
                  .add(30, "days")
                  .tz(process.env.DEFAULT_TIMEZONE)
                  .format("YYYY-MM-DD");

          bill = {
            ...bill,
            active: "true",
            balance: accountData.amountDue,
            accountId,
            dueDate,
            accountData,
            accountNumber: accountData.accountNumber,
          };

          const payMethods = await this.services.finocl.getPaymentMethods(
            userId,
            accountId
          );
          bill.paymentMethods = payMethods.paymentMethods;
          console.log("forceRefreshBill - createuserBillLink ", bill);
          try {
            const result = await createUserBillLink(user, bill, true);

            const url = result.data.url;
            bill.dl = url;

            const billpromo = {
              id: url.substr(url.length - 11),
              userId: user.id,
              billId: bill.id,
              url: url,
            };
            await this.services.dbcl.putPromocode(billpromo);
            console.log("==Branch createUserBillLink 1:", url);
          } catch (error) {
            this.iconsole.log("===Branch Error:", error);
          }
          if (
            bill.paymentMethods.findIndex(
              (method) => method === "creditcard"
            ) != -1
          ) {
            const reqPayFields =
              await this.services.finocl.getDirectPaymentFieldsCC(
                bill.uid,
                bill.accountId
              );
            const fields = reqPayFields.paymentFields;
            let paymentOptions = {};

            if (
              fields.findIndex((field) => field.name === "User First Name") !=
              -1
            ) {
              paymentOptions.user = true;
            }

            if (
              fields.findIndex(
                (field) => field.name.includes("Service Address :") != -1
              )
            ) {
              paymentOptions.service = true;
            }

            bill.paymentOptions = paymentOptions;
          }

          await this.services.dbcl.putUserBill(bill);

          return bill;
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async removeBill(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.billId) {
        if (jwtDecode.id === process.env.DEFAULTUSERID) {
          throw "Forbidden";
        } else {
          const user = await this.services.dbcl.getUser(jwtDecode.id);

          if (user.verified === "false") {
            throw "UserIsNotVerified";
          }

          const bill = await this.services.dbcl.getUserBillByBillerId(
            user.id,
            data.billId
          );
          this.iconsole.log("===bill: ", bill);

          await this.services.finocl.deleteProviderAccount(
            user.id,
            bill.providerAccountId
          );
          await this.services.dbcl.deleteUserBill(user.id, bill.id);
          return bill;
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async deleteUserBill(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.billId && data.uid) {
        if (jwtDecode.role && jwtDecode.role === "admin") {
          const bill = await this.services.dbcl.getUserBillByBillerId(
            data.uid,
            data.billId
          );

          await this.services.finocl.deleteProviderAccount(
            bill.uid,
            bill.providerAccountId
          );
          await this.services.dbcl.deleteUserBill(bill.uid, bill.id);

          const errorMsg = `Your ${bill.providerName} Bill had a problem & Needs to be Updated\nRe-Add to Fix`;
          await this.services.msgcl.notifyUser(bill.uid, errorMsg);

          return bill;
        } else {
          throw "Forbidden";
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async payBill(event) {
    var user = null;
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.billId) {
        var bill = await this.services.dbcl.getUserBillById(data.billId);
        var billUser = await this.services.dbcl.getUser(bill.uid);
        if (jwtDecode.id === process.env.DEFAULTUSERID) {
          // new user
          let userObj = await this.services.usercl.createUserObject(data);
          userObj.refid = billUser.userName;
          userObj.action = "pay";
          userObj.pincode = randomize("0", 4);
          userObj.data["billId"] = data.billId;
          user = await this.services.dbcl.putUser(userObj);
          return {
            status: "waiting",
            statusData: "phone_validation",
            billId: data.billId,
            user: this.services.usercl.normilizeUser(user),
          };
        } else {
          user = await this.services.dbcl.getUser(jwtDecode.id);

          if (user.verified === "false") {
            throw "UserIsNotVerified";
          }

          if (bill.active === "false") {
            throw "Disabled bill";
          }

          user.action = "pay";
          user.data = {
            billId: data.billId,
          };
          user = await this.services.dbcl.putUser(user);
          if (!user.payment.stripeId) {
            return {
              status: "waiting",
              statusData: "payment_method",
              billId: data.billId,
              user: this.services.usercl.normilizeUser(user),
            };
          }
          return {
            status: "success",
            statusData: "ready_to_charge",
            billId: data.billId,
            user: this.services.usercl.normilizeUser(user),
          };
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      await this.services.dbcl.putProblemReport({
        group: "bill",
        func: "payBill",
        subject: error,
        info: {
          userId: jwtDecode.id,
          billId: data.billId,
          error: error,
        },
      });
      throw error;
    }
  }

  async getProcessingFee(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.uid && data.amount) {
        if (jwtDecode.id === process.env.DEFAULTUSERID) {
          throw "Forbidden";
        } else if (jwtDecode.role && jwtDecode.role === "admin") {
          throw "Forbidden";
        } else {
          let dataBillZeroFees = await this.services.stripecl.calculateFees({
            amount: data.amount,
            uid: data.uid,
          });
          this.iconsole.log("dataBillZeroFees:", dataBillZeroFees);
          return dataBillZeroFees;
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async calculateProcessingFee(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.billId && data.amount) {
        if (jwtDecode.id === process.env.DEFAULTUSERID) {
          throw "Forbidden";
        } else if (jwtDecode.role && jwtDecode.role === "admin") {
          throw "Forbidden";
        } else {
          var bill = await this.services.dbcl.getUserBillById(data.billId);
          let paymentData = {
            amount: Number(data.amount),
            subscribe:
              data.subscribe &&
              (data.subscribe === true || data.subscribe === "true")
                ? true
                : false,
            payPayeeFee:
              data.payPayeeFee &&
              (data.payPayeeFee === true || data.payPayeeFee === "true")
                ? true
                : false,
          };

          let dataBillZeroFees =
            await this.services.stripecl.calculateBillZeroFees(
              paymentData,
              bill.balance
            );
          this.iconsole.log("dataBillZeroFees:", dataBillZeroFees);
          return {
            amount: Number(data.amount),
            amountToAddBalance: dataBillZeroFees.amountToAddBalance,
            subscribe: dataBillZeroFees.subscribe,
            fee: dataBillZeroFees.fee,
            feePayee: dataBillZeroFees.feePayee,
            total: dataBillZeroFees.amount,
          };
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async chargeBill(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.billId && data.amount) {
        if (jwtDecode.id === process.env.DEFAULTUSERID) {
          throw "Forbidden";
        } else if (jwtDecode.role && jwtDecode.role === "admin") {
          throw "Forbidden";
        } else {
          var signatureUrl = null;
          var plan = null;
          var user = await this.services.dbcl.getUser(jwtDecode.id);
          if (user.verified === "false") {
            throw "UserIsNotVerified";
          }

          if (!user.payment.stripeId) {
            throw "paymentMethodIsMissing";
          }

          var bill = await this.services.dbcl.getUserBillByBillerId(
            data.userId,
            data.billId
          );

          if (bill.active === "false") {
            throw "Disabled bill";
          }
          let payMethod = "";
          const paymentMethods = bill.paymentMethods;
          if (
            paymentMethods.findIndex((method) => method === "creditcard") != -1
          ) {
            payMethod = "cc";
          } else if (
            paymentMethods.findIndex((method) => method === "bank") != -1
          ) {
            payMethod = "bank";
          } else {
            throw "This bill is not payable";
          }

          var billUser = await this.services.dbcl.getUser(bill.uid);

          // if(!billUser.phone){
          //   throw "payeeUserPhoneIsNotSet";
          // }

          // if(!billUser.firstName){
          //   throw "payeeUserFirstNameIsBlank";
          // }

          // if(!billUser.lastName){
          //   throw "payeeUserLastNameIsBlank";
          // }
          // if(!(billUser.dob.year && billUser.dob.month && billUser.dob.day)){
          //   throw "payeeUserDobUnavailable";
          // }

          // if(!(billUser.address.city && billUser.address.state)){
          //   throw "payeeAddressUnavailable";
          // }

          if (data.signature) {
            let signaturePath =
              "users/" +
              jwtDecode.id +
              "/signature/" +
              data.billId +
              "_" +
              uuid.v4();
            signatureUrl = await this.services.dbcl.uploadBase64ImageToAwsS3(
              signaturePath,
              data.signature
            );
          }

          if (data.planId) {
            data.subscribe = true;
            plan = await this.services.stripecl.retrievePlan(data.planId);
            data.amount = Number(plan.amount / 100);
          } else {
            data.subscribe = false;
          }

          if (
            (data.payPayeeFee && data.payPayeeFee === true) ||
            data.payPayeeFee === "true"
          ) {
            data.payPayeeFee = true;
          } else {
            data.payPayeeFee = false;
          }
          // payment start

          let dataBillZeroFees = await this.services.stripecl.calculateFees({
            amount: data.amount,
            uid: bill.uid,
          });

          let paymentData = {
            amount: dataBillZeroFees.total,
            currency: "usd",
            customer: user.payment.stripeId,
            description: "payment for bill " + data.userId + ":" + data.billId,
            metadata: {
              uid: user.id,
              billId: data.billId,
              billUserId: bill.uid,
            },
          };

          if (data.paymentSource) {
            paymentData.source = data.paymentSource;
          }

          // let dataBillZeroFees = await this.services.stripecl.calculateBillZeroFees(paymentData,bill.balance);
          this.iconsole.log("dataBillZeroFees:", dataBillZeroFees);
          let stripeCharge = await this.services.stripecl.authorizeCharge(
            paymentData
          );
          this.iconsole.log("stripeCharge Response: ", stripeCharge);

          let payResult;
          if (payMethod == "cc") {
            let aFields = [];
            // if (bill.paymentOptions && bill.paymentOptions.user) {
            aFields = [
              {
                name: "User First Name",
                stringValue: billUser.firstName ? billUser.firstName : "",
              },
              {
                name: "User Last Name",
                stringValue: billUser.lastName ? billUser.lastName : "",
              },
              {
                name: "User Email",
                stringValue: "payments@billzero.app",
              },
            ];
            // }
            // if (bill.paymentOptions && bill.paymentOptions.service) {
            let serviceFields = [];
            if (
              bill.accountData &&
              bill.accountData.billerAddress &&
              bill.accountData.billerAddress.address1
            ) {
              const address = bill.accountData.billerAddress;
              serviceFields = [
                {
                  name: "Service Address : Address Line1",
                  stringValue: address.address1,
                },
                {
                  name: "Service Address : Address Line2",
                  stringValue: address.address2,
                },
                {
                  name: "Service Address : City",
                  stringValue: address.city,
                },
                {
                  name: "Service Address : State",
                  stringValue: address.state,
                },
                {
                  name: "Service Address : Zip1",
                  stringValue: address.zip,
                },
              ];
            } else {
              serviceFields = [
                {
                  name: "Service Address : Address Line1",
                  stringValue: "1250 long beach ave",
                },
                {
                  name: "Service Address : Address Line2",
                  stringValue: "apt 226",
                },
                {
                  name: "Service Address : City",
                  stringValue: "Los Angeles",
                },
                {
                  name: "Service Address : State",
                  stringValue: "CA",
                },
                {
                  name: "Service Address : Zip1",
                  stringValue: "90021",
                },
              ];
            }
            aFields = [...aFields, ...serviceFields];
            // }
            payResult = await this.services.finocl.directPaymentWithCC(
              bill.uid,
              bill.accountId,
              dataBillZeroFees.payee,
              aFields
            );
          } else if (payMethod == "bank") {
            payResult = await this.services.finocl.directPaymentWithBank(
              bill.uid,
              bill.accountId,
              dataBillZeroFees.payee
            );
          }
          this.iconsole.log("Fino pay result: ", payResult);

          if (payResult.operationStatus === "SUCCESS") {
            // let msg = "BillZero | "+user.userName+" paid $"+dataBillZeroFees.amount+" ur "+this.services.utils.titleCase(bill.name)+" bill";
            // await this.services.msgcl.notifyUser(bill.uid,msg);

            await this.services.dbcl.putUTOU({
              id: bill.uid,
              payerid: jwtDecode.id,
              thanks: "true",
            });

            var charge = {
              amount: Number(stripeCharge.amount) / 100,
              amountToAddBalance: dataBillZeroFees.amount,
              uid: user.id, // payer
              chargeid: stripeCharge.id,
              billId: bill.id, // payee
              billAccountNumber: bill.accountNumber,
              billUserId: bill.uid,

              // fields from stripe charge
              name: stripeCharge.name,
              method: stripeCharge.payment_method_details.type,
              currency: stripeCharge.currency,
              customer: stripeCharge.customer,
              description: stripeCharge.description,
              paymentSource: stripeCharge.payment_method,
              paymentReceiptUrl: stripeCharge.receipt_url,
              paymentMethodDetails: {
                type: stripeCharge.payment_method_details.type,
                brand:
                  stripeCharge.payment_method_details[
                    stripeCharge.payment_method_details.type
                  ].brand,
                last4:
                  stripeCharge.payment_method_details[
                    stripeCharge.payment_method_details.type
                  ].last4,
                country:
                  stripeCharge.payment_method_details[
                    stripeCharge.payment_method_details.type
                  ].country,
              },
              metadata: {}, // stripe metadata
            };

            const finoTransaction = {
              id: payResult.trackingToken,
              billId: bill.id,
              uid: billUser.id,
              userName: billUser.userName,
              payerId: user.id,
              payerUserName: user.userName,
              chargeId: charge.chargeid,
              billerName: bill.name,
              bztype: bill.bztype,
              amount: charge.amount,
              amountToAddBalance: charge.amountToAddBalance,
              amountPayer: dataBillZeroFees.total,
              amountPayee: dataBillZeroFees.payee,
              accountNumber: bill.accountNumber,
              status: "pending",
              method: payMethod,
              last4: charge.paymentMethodDetails.last4,
            };
            await this.services.dbcl.putUserTransaction(finoTransaction);

            charge.finoTransactionId = finoTransaction.id;
            charge.signatureUrl = signatureUrl;
            let stripeChargeCaptureResult =
              await this.services.stripecl.captureCharge(charge.chargeid);
            charge = await this.services.dbcl.putUserPayment(charge); //error_code

            // bill.balance = Number(bill.balance) - Number(charge.amountToAddBalance);
            const billPaymentEntry = {
              amount: Number(charge.amountToAddBalance),
              date: moment()
                .tz(process.env.DEFAULT_TIMEZONE)
                .format("YYYY-MM-DD"),
            };
            if (bill.payments && Array.isArray(bill.payments)) {
              bill.payments.unshift(billPaymentEntry);
            } else {
              bill.payments = [billPaymentEntry];
            }
            await this.services.dbcl.putUserBill(bill);

            return {
              ...payResult,
              method: payMethod,
            };
          } else {
            await this.services.stripecl.refundCharge(stripeCharge.id);
            throw "FINO Pay Bill Error ";
          }
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      await this.services.dbcl.putProblemReport({
        group: "bill",
        func: "chargeBill",
        subject: error,
        info: {
          userId: jwtDecode.id,
          billId: data.billId,
          error: error,
        },
      });
      throw error;
    }
  }

  async retryBill(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data.transactionId) {
        if (jwtDecode.role && jwtDecode.role === "admin") {
          var transaction = await this.services.dbcl.getTransactionById(
            data.transactionId
          );
          var user = await this.services.dbcl.getUser(transaction.uid);
          if (user.verified === "false") {
            throw "UserIsNotVerified";
          }
          if (!user.payment.stripeId) {
            throw "paymentMethodIsMissing";
          }
          var bill = await this.services.dbcl.getUserBillByBillerId(
            transaction.uid,
            transaction.billId
          );

          if (bill.active === "false") {
            throw "Disabled bill";
          }

          let payMethod = data.paymentMethod;
          const paymentMethods = bill.paymentMethods;

          // temporary commented
          // if (
          //   paymentMethods.findIndex((method) => method === "creditcard") == -1
          // ) {
          //   throw "Payment method is not supported";
          // }

          var billUser = await this.services.dbcl.getUser(bill.uid);
          var charge = await this.services.dbcl.getUserPayment(
            transaction.uid,
            transaction.chargeId
          );
          // payment start
          let payResult;

          let aFields = [];
          // if (bill.paymentOptions && bill.paymentOptions.user) {
          aFields = [
            {
              name: "User First Name",
              stringValue: billUser.firstName ? billUser.firstName : "",
            },
            {
              name: "User Last Name",
              stringValue: billUser.lastName ? billUser.lastName : "",
            },
            {
              name: "User Email",
              stringValue: "payments@billzero.app",
            },
          ];
          // }
          // if (bill.paymentOptions && bill.paymentOptions.service) {
          let serviceFields = [];
          if (
            bill.accountData &&
            bill.accountData.billerAddress &&
            bill.accountData.billerAddress.address1
          ) {
            const address = bill.accountData.billerAddress;
            serviceFields = [
              {
                name: "Service Address : Address Line1",
                stringValue: address.address1,
              },
              {
                name: "Service Address : Address Line2",
                stringValue: address.address2,
              },
              {
                name: "Service Address : City",
                stringValue: address.city,
              },
              {
                name: "Service Address : State",
                stringValue: address.state,
              },
              {
                name: "Service Address : Zip1",
                stringValue: address.zip,
              },
            ];
          } else {
            serviceFields = [
              {
                name: "Service Address : Address Line1",
                stringValue: "1250 long beach ave",
              },
              {
                name: "Service Address : Address Line2",
                stringValue: "apt 226",
              },
              {
                name: "Service Address : City",
                stringValue: "Los Angeles",
              },
              {
                name: "Service Address : State",
                stringValue: "CA",
              },
              {
                name: "Service Address : Zip1",
                stringValue: "90021",
              },
            ];
          }
          aFields = [...aFields, ...serviceFields];
          // }
          if (payMethod == 'cc') {
            payResult = await this.services.finocl.directPaymentWithCC(
              bill.uid,
              bill.accountId,
              transaction.amountPayee,
              aFields
            );  
          } else if (payMethod == 'vcc') {
            payResult = await this.services.finocl.directPaymentWithVCC(
              bill.uid,
              bill.accountId,
              transaction.amountPayee,
              aFields
            );  
          }

          this.iconsole.log("Fino pay result: ", payResult);

          if (payResult.operationStatus === "SUCCESS") {
            // let msg = "BillZero | "+user.userName+" paid $"+dataBillZeroFees.amount+" ur "+this.services.utils.titleCase(bill.name)+" bill";
            // await this.services.msgcl.notifyUser(bill.uid,msg);

            // send to user
            // await this.services.dbcl.putUTOU({
            //   id: bill.uid,
            //   payerid: jwtDecode.id,
            //   thanks: "true",
            // });

            await this.services.dbcl.deleteUserTransaction(
              transaction.uid,
              transaction.id
            );
            transaction.id = payResult.trackingToken;
            transaction.status = "pending";
            await this.services.dbcl.putUserTransaction(transaction);

            charge.finoTransactionId = transaction.id;
            charge = await this.services.dbcl.putUserPayment(charge); //error_code

            return transaction;
            // return {
            //   ...payResult,
            //   method: payMethod,
            // };
          } else {
            // await this.services.stripecl.refundCharge(stripeCharge.id);
            throw "FINO Retry Pay Bill Error ";
          }
        } else {
          throw "Forbidden";
        }
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      await this.services.dbcl.putProblemReport({
        group: "bill",
        func: "retryBill",
        subject: error,
        info: {
          userId: transaction.uid,
          billId: transaction.billId,
          error: error,
        },
      });
      throw error;
    }
  }
  // async processBillSubscription(subscritpionId,amount,user,bill,billUser){
  //   try {
  //       var adminSettings = await this.services.dbcl.getAdminSettings("common");
  //       var paymentSettings = adminSettings.settings.paymentSettings;
  //       var amountToAddBalance = Number(amount) - Number(paymentSettings.feeAmountPayer);

  //       let payMethod = "";
  //       let payResult;
  //       const paymentMethods = bill.paymentMethods;
  //       if (paymentMethods.findIndex(method => method === "creditcard") != -1) {
  //         payMethod = "cc";
  //         payResult = await this.services.finocl.directPaymentWithCC(bill.uid, bill.accountId, dataBillZeroFees.amountToAddBalance);
  //       } else if (paymentMethods.findIndex(method => method === "bank") != -1) {
  //         payMethod = "bank";
  //         payResult = await this.services.finocl.directPaymentWithBank(bill.uid, bill.accountId, dataBillZeroFees.amountToAddBalance);
  //       } else {
  //         throw "This bill is not payable";
  //       }

  //       if (payResult.operationStatus === "SUCCESS") {
  //         const finoTransaction = {
  //           id: payResult.trackingToken,
  //           billId: bill.id,
  //           uid: billUser.id,
  //           userName: billUser.userName,
  //           payerId: user.id,
  //           payerUserName: user.userName,
  //           chargeId: null,
  //           subscritpionId,
  //           billerName: bill.name,
  //           bztype: bill.bztype,
  //           amount: amount,
  //           amountToAddBalance: amountToAddBalance,
  //           accountNumber: bill.accountNumber,
  //           status: "pending"
  //         }
  //         await this.services.dbcl.putUserTransaction(finoTransaction);

  //         const billPaymentEntry = {
  //           "amount": Number(charge.amountToAddBalance),
  //           "date": moment().tz(process.env.DEFAULT_TIMEZONE).format('YYYY-MM-DD')
  //         }
  //         if(bill.payments && Array.isArray(bill.payments)){
  //           bill.payments.unshift(billPaymentEntry)
  //         } else {
  //           bill.payments = [billPaymentEntry];
  //         }
  //         await this.services.dbcl.putUserBill(bill);
  //       }

  //       return payResult;

  //   } catch (error) {
  //       throw error;
  //   }
  // }

  async processStripeWebHook(request) {
    try {
      this.iconsole.log(request);
      var event = await this.services.stripecl.processStripeWebHook(request);
      /*         var event = {
          type:"invoice.payment_succeeded",
          subscription:null,
          data:{
            object:{
              metadata:{
                "amount": "50",
                "planId":"plan_pay50Monthly",
                "uid": "4c7487ca-d284-4ed1-9b9d-6ebc1b7ced57",
                "billId": "5958c655-286b-4c8f-9a03-f10cf45d077c",
                "billUserId": "4c7487ca-d284-4ed1-9b9d-6ebc1b7ced57"
              }
            }
          }
        }  */
      if (event && event.type === "invoice.payment_succeeded") {
        var data = event.data.object;
        this.iconsole.log("invoice.payment_succeeded::::", data);
        var metadata = data.metadata;

        // create Arcus transaction here
        //var plan = await this.services.stripecl.retrievePlan(metadata.planId);

        var bill = await this.services.dbcl.getUserBillByBillerId(
          metadata.billUserId,
          metadata.billId
        );
        var billUser = await this.services.dbcl.getUser(bill.uid);
        var user = await this.services.dbcl.getUser(metadata.uid);

        // let diff = moment().diff(moment(new Date(bill.due_date)),'days');
        // if (diff > 0) {
        //   let billerdata = {
        //     bzFunc : "refreshBill",
        //     billId : bill.id,
        //     external_user_id : billUser.id,
        //     biller_id : bill.billerId
        //   }

        //   var sqsResponse = await this.postToArcusSQS(billerdata);
        //   this.iconsole.log("sqsResponse:",sqsResponse);
        // }

        var chargeResult = await this.processBillSubscription(
          data.subscription,
          metadata.amount,
          user,
          bill,
          billUser
        );
      }
      return { received: true };
    } catch (error) {
      this.iconsole.log(error);
      //throw error;
      return { received: true };
    }
  }

  /*
    var task3 = {
      to:"billcl",
      owner:"billcl",
      ttl:moment(new Date(bill.due_date)).add(1,"month").subtract(10,"days").valueOf()/1000,
      event:{
        action:"notifyUser",
        billId:"cd1bd95d-4ae1-4615-99e3-48e522543225",
        message:"Your BillZerro bill is due after 10 days"
      },
      recurring:"true",
      recurringType:"month",
      recurringAfter:1
  }
  */
  async processTask(task) {
    try {
      this.iconsole.log(task);
      if (
        task.event.action === "notifyUser" &&
        task.event.billId &&
        task.event.message
      ) {
        var bill = await this.services.dbcl.getUserBillById(task.event.billId);
        if (bill.active === "true") {
          await this.services.msgcl.notifyUser(bill.uid, task.event.message);
        } else {
          return {
            status: "fail",
            info: "bill is not active",
            id: task.id,
            billId: task.event.billId,
            cancel: true,
          };
        }

        return {
          status: "success",
          info: "task completed",
          id: task.id,
          billId: task.event.billId,
        };
      } else {
        throw "Invalid task";
      }
    } catch (error) {
      this.iconsole.log(error);
      return { status: "fail", info: error, id: task.id, cancel: true };
      //throw error;
    }
  }

  async processFinoBillWebHook(event) {
    try {
      this.iconsole.log(event);
      console.log(event.body);
      var bill = JSON.parse(event.body);
      this.iconsole.log("processFinoBillWebHook data::", bill);
      console.log("processFinoBillWebHook data::", bill);
      await this.services.dbcl.putFinoHook(bill);

      const { userId, type, trackingToken, providerAccountId } = bill;
      if (!userId) {
        return;
      }

      if (type === "paymentEvent") {
        let transaction = await this.services.dbcl.getTransactionById(
          trackingToken
        );
        const status = await this.services.finocl.getPaymentStatus(
          userId,
          trackingToken
        );
        this.iconsole.log("paymentEvent Status: ", status);
        if (status.errors && status.errors.length > 0) {
          transaction.status = "rejected";

          await this.services.dbcl.putProblemReport({
            group: "bill",
            func: "chargeBill",
            subject: `${transaction.billerName} | $${transaction.amountToAddBalance} transaction rejected`,
            info: {
              error: "Transaction Rejected",
              errorDescription: status.errors[0].description
                ? status.errors[0].description
                : "",
              errorActionToBeTaken: status.errors[0].actionToBeTaken
                ? status.errors[0].actionToBeTaken
                : "",
              userId: transaction.uid,
              payerId: transaction.payerId,
              vendorId: transaction.id,
              trackingToken,
            },
          });
          // let msg = "BillZero | "+this.services.utils.titleCase(transaction.billerName)+" rejected $"+transaction.amountToAddBalance+" for bill";
          // const action = status.errors[0].actionToBeTaken ? ".  " + status.errors[0].actionToBeTaken.replace(/Finovera/g, "BillZero") : "";
          // await this.services.msgcl.notifyUser(transaction.uid, msg + action);
          // await this.services.stripecl.refundCharge(transaction.chargeId);
        } else {
          transaction.status = "paid";
          if (status.connectionStatus === "COMPLETED") {
            let receiveSMS = `BillZero | Your ${this.services.utils.titleCase(
              transaction.billerName
            )} bill received a payment`;
            if (
              transaction.payerUserName === "ceo" ||
              transaction.payerUserName === "cmo"
            ) {
              receiveSMS += `\n\nCONGRATS!\n\nYOU WON FREE MONEY!\n\nSHARE ON SOCIAL MEDIA YOUR BILL LINK + #billzero`;
            }
            await this.services.msgcl.notifyUser(transaction.uid, receiveSMS);
            await this.services.msgcl.notifyUser(
              transaction.payerId,
              "BillZero | " +
                transaction.userName +
                " received $" +
                transaction.amountToAddBalance +
                " for " +
                this.services.utils.titleCase(transaction.billerName) +
                " bill"
            );
            // "BillZero | "+transaction.payerUserName+" paid $"+transaction.amountToAddBalance+" ur "+this.services.utils.titleCase(transaction.billerName)+" bill"
            // "BillZero | "+transaction.userName+" received $"+transaction.amountToAddBalance+" for "+this.services.utils.titleCase(transaction.billerName)+" bill"
            // await this.services.msgcl.notifyUser(transaction.payerId,
            //   "BillZero | "+this.services.utils.titleCase(transaction.billerName)+" received $"+transaction.amountToAddBalance+" for bill"
            // );
          }

          await this.services.dbcl.putProblemReport({
            group: "bill",
            func: "chargeBill",
            subject: `${transaction.billerName} | $${transaction.amountToAddBalance} transaction paid`,
            info: {
              userId: transaction.uid,
              payerId: transaction.payerId,
              vendorId: transaction.id,
              trackingToken,
            },
          });
        }
        await this.services.dbcl.putUserTransaction(transaction);
        return transaction;
      }

      const providerAccount = await this.services.finocl.getProviderAccountById(
        userId,
        providerAccountId
      );
      const operationStatus = providerAccount.operationStatus;
      if (operationStatus !== "SUCCESS") {
        return providerAccount;
      }

      const providerAccountData = providerAccount.providerAccountData;
      const {
        providerImmutableId,
        providerName,
        providerAccountErrors,
        accountSummaries,
      } = providerAccountData;

      if (providerAccountErrors && providerAccountErrors.length > 0) {
        const errorMsg = `${providerName}: ${
          providerAccountErrors[0].description
            ? providerAccountErrors[0].description.replace(
                /Finovera/g,
                "BillZero"
              )
            : "ERROR"
        }`;
        if (errorMsg) {
          await this.services.msgcl.notifyUser(userId, errorMsg);

          await this.services.dbcl.putProblemReport({
            group: "bill",
            func: "syncBill",
            subject: errorMsg,
            info: {
              error: errorMsg,
              userId: userId,
              vendorId: providerImmutableId,
              trackingToken,
            },
          });
        }
        await this.services.finocl.deleteProviderAccount(
          userId,
          providerAccountId
        ); //was remarked out - n8 03.27.2021 readding to test
        await this.services.dbcl.deleteUserBill(userId, providerImmutableId);
        throw errorMsg;
      }

      const dbBill = await this.services.dbcl.getUserBillByBillerId(
        userId,
        providerImmutableId
      );
      bill = {
        ...dbBill,
        name: providerName,
        hookEvent: type,
        providerAccountId,
        trackingToken,
      };

      if (type === "aggregationCompletedEvent") {
        const transaction = await this.services.dbcl.getTransactionById(
          trackingToken
        );
        if (transaction && transaction.status === "pending") {
          transaction.status = "rejected";
          await this.services.dbcl.putUserTransaction(transaction);

          const status = await this.services.finocl.getPaymentStatus(
            transaction.uid,
            transaction.id
          );
          if (status.errors && status.errors.length > 0) {
            transaction.status = "rejected";

            await this.services.dbcl.putProblemReport({
              group: "bill",
              func: "chargeBill",
              subject: `${transaction.billerName} | $${transaction.amountToAddBalance} transaction rejected`,
              info: {
                error: "Transaction Rejected",
                errorDescription: status.errors[0].description
                  ? status.errors[0].description
                  : "",
                errorActionToBeTaken: status.errors[0].actionToBeTaken
                  ? status.errors[0].actionToBeTaken
                  : "",
                userId: transaction.uid,
                payerId: transaction.payerId,
                vendorId: transaction.id,
                trackingToken,
              },
            });
          }

          return;
        }
        bill.status = "success";
        if (accountSummaries && accountSummaries.length > 0) {
          for (let i = 0; i < accountSummaries.length; i++) {
            const summary = accountSummaries[i];
            const accountId = summary.id;
            if (accountId) {
              const account = await this.services.finocl.getUserAccountById(
                userId,
                accountId
              );
              const accountResponse = account.accountResponse;
              const { accountData } = accountResponse;

              if (accountData.amountDue || i == accountSummaries.length - 1) {
                const dueDate =
                  accountData.dueDate && accountData.dueDate !== ""
                    ? moment(accountData.dueDate)
                        .tz(process.env.DEFAULT_TIMEZONE)
                        .format("YYYY-MM-DD")
                    : moment()
                        .add(30, "days")
                        .tz(process.env.DEFAULT_TIMEZONE)
                        .format("YYYY-MM-DD");

                bill = {
                  ...bill,
                  active: "true",
                  balance: accountData.amountDue,
                  accountId,
                  dueDate,
                  accountData,
                  accountNumber: accountData.accountNumber,
                };

                if (dbBill.active === "false") {
                  const payMethods =
                    await this.services.finocl.getPaymentMethods(
                      userId,
                      accountId
                    );
                  bill.paymentMethods = payMethods.paymentMethods;

                  const msg = `${providerName}: SUCCESSFULLY SYNCED BILL`;
                  await this.services.msgcl.notifyUser(userId, msg);

                  await this.services.dbcl.putProblemReport({
                    group: "bill",
                    func: "syncBill",
                    subject: `${providerName} | SUCCESSFULLY SYNCED BILL`,
                    info: {
                      userId: bill.uid,
                      vendorId: bill.id,
                      trackingToken,
                    },
                  });

                  try {
                    console.log(
                      "processFinoBillWebHook - createuserBillLink ",
                      bill
                    );
                    const user = await this.services.dbcl.getUser(userId);
                    const result = await createUserBillLink(user, bill, false);
                    console.log(result);
                    const url = result.data.url;
                    bill.dl = url;

                    const billpromo = {
                      id: url.substr(url.length - 11),
                      userId: user.id,
                      billId: bill.id,
                      url: url,
                    };
                    await this.services.dbcl.putPromocode(billpromo);
                    console.log("===Branch Link2:", url);
                  } catch (error) {
                    this.iconsole.log("===Branch Error:", error);
                  }
                  if (
                    bill.paymentMethods.findIndex(
                      (method) => method === "creditcard"
                    ) != -1
                  ) {
                    const reqPayFields =
                      await this.services.finocl.getDirectPaymentFieldsCC(
                        bill.uid,
                        bill.accountId
                      );
                    const fields = reqPayFields.paymentFields;
                    let paymentOptions = {};

                    if (
                      fields.findIndex(
                        (field) => field.name === "User First Name"
                      ) != -1
                    ) {
                      paymentOptions.user = true;
                    }

                    if (
                      fields.findIndex(
                        (field) =>
                          field.name.includes("Service Address :") != -1
                      )
                    ) {
                      paymentOptions.service = true;
                    }

                    bill.paymentOptions = paymentOptions;
                  }
                }

                break;
              }
            }
          }
        }

        await this.services.dbcl.putUserBill(bill);
      }

      if (type === "mfaEvent") {
        // const transaction = await this.services.dbcl.getTransactionById(trackingToken);
        // if (transaction) {
        //   const status = await this.services.finocl.getProviderAccountStatus(userId, trackingToken);
        //   bill.status = "mfa";
        //   bill.mfaChallenges = status.mfaList;
        //   await this.services.dbcl.putUserBill(bill);

        //   const msg = `BillZero | ${transaction.payerUserName} is paying your ${providerName} bill. Please enter MFA on profile bills`;
        //   await this.services.msgcl.notifyUser(transaction.uid, msg);
        // }    MFA payment. NEED TO BE IMPLEMENTED IN FUTURE
        if (dbBill.active === "false") {
          const status = await this.services.finocl.getProviderAccountStatus(
            userId,
            trackingToken
          );
          bill.status = "mfa";
          bill.mfaChallenges = status.mfaList;

          await this.services.msgcl.notifyUser(
            userId,
            `${providerName}: Enter MFA on Billzero app`
          );
          await this.services.dbcl.putUserBill(bill);
        }
      }

      return { received: true };
    } catch (error) {
      this.iconsole.log(error);
      throw error;
      // return {received: true};
    }
  }

  async getRecaptchaChecks(event) {
    try {
      const data = JSON.parse(event.body);
      const dom = new jsdom.JSDOM(data.html);
      const items = [
        "1_1",
        "1_2",
        "1_3",
        "2_1",
        "2_2",
        "2_3",
        "3_1",
        "3_2",
        "3_3",
      ];
      const result = items
        .filter(
          (item) =>
            dom.window[`finovera_recaptcha_checkbox_${item}`].checked === true
        )
        .map((item) => dom.window[`finovera_recaptcha_checkbox_${item}`].value);
      return {
        selectedImages: result.join(","),
      };
    } catch (error) {
      this.iconsole.log(error);
      throw error;
    }
  }
}

module.exports = billClass;
