"use strict";

const moment = require("moment");
const uuid = require("uuid");
const AWS = require("aws-sdk");
const crypto = require("crypto");
const { uuid4, isObject } = require("stripe/lib/utils");
AWS.config.update({ region: "us-east-1" });
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const s3 = new AWS.S3({ signatureVersion: "v4" });
const sqs = new AWS.SQS();

// Source
//http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.03.html#GettingStarted.NodeJs.03.03

class dbHelperClass {
  constructor(args) {
    this.iconsole = args.iconsole;
    this.services = args.services;
    this.services.addService("dbcl", this);
    this.settingsTable = process.env.SETTINGSTABLE;
    this.tz = process.env.DEFAULT_TIMEZONE;
    this.adminTable = process.env.ADMINTABLE;
    this.userTable = process.env.USERTABLE;
    this.billTable = process.env.BILLTABLE;
    this.vendorTable = process.env.VENDORTABLE;
    this.searchVendorTable = process.env.SEARCHVENDORTABLE;
    this.chargeTable = process.env.CHARGETABLE;
    this.transactionTable = process.env.TRANSACTIONTABLE;
    this.subscriptionsTable = process.env.SUBSCRIPTIONSTABLE;
    this.statsTable = process.env.STATSTABLE;
    this.supportTable = process.env.SUPPORTTABLE;
    this.tasksTable = process.env.TASKSTABLE;
    this.promocodeTable = process.env.PROMOCODETABLE;
    this.reportTable = process.env.REPORTTABLE;
    this.affiliateTable = process.env.AFFILIATETABLE;
    this.invitationTable = process.env.INVITATIONTABLE;
    this.karmaTable = process.env.KARMATABLE;
    this.utouTable = process.env.UTOUTABLE;
    this.sheltersTable = process.env.SHELTERSTABLE;
    this.finoHookTable = process.env.FINOHOOKTABLE;
    this.finoProviderTable = process.env.FINOPROVIDERTABLE;
    this.ingestionTable = process.env.INGESTIONTABLE;
    this.playTable = process.env.PLAYTABLE;
    this.poolTable = process.env.POOLTABLE;
    this.uvTable = process.env.UNIQUEVIEWTABLE;
    this.engagementTable = process.env.ENGAGEMENTTABLE;
    this.impetusTable = process.env.IMPETUSTABLE;

    this.playStatusAmountIndex = "play-status-amount-index";

    this.chargesUidUpdatedAtIndex = "charges-uid-updatedAt-index";
    this.chargesBillUserIdUpdatedAtIndex = "charges-billUserId-updatedAt-index";
    this.subscriptionsPayerUpdatedAtIndex =
      "subscriptions-payer-updatedAt-index";
    this.subscriptionsPayeeUpdatedAtIndex =
      "subscriptions-payee-updatedAt-index";
    this.invitationPhoneUpdatedAtIndex = "invitation-phone-updatedAt-index";
    this.karmaStatusAmountIndex = "karma-status-amount-index";
    this.affiliateStatusInstallsIndex = "affiliate-status-installs-index";
    this.usersRefidCreatedAtIndex = "users-refid-createdAt-index";
    this.reportsYmUpdatedAtIndex = "reports-ym-updatedAt-index";
    this.reportsYearUpdatedAtIndex = "reports-year-updatedAt-index";
    this.supportTypeUpdatedAtIndex = "support-type-updatedAt-index";
    this.supportUidIdIndex = "support-uid-id-index";
    this.statsIdDidIndex = "stats-id-did-index";
    this.userPhoneIndex = "user-phone-index";
    this.userNameIndex = "user-userName-index";
    this.userLoggedinUpdatedAtIndex = "users-loggedin-updatedAt-index";
    this.userActiveUpdatedAtIndex = "users-active-updatedAt-index";
    this.userActiveCreatedAtIndex = "users-active-createdAt-index";
    this.userVerifiedUserNameIndex = "users-verified-userName-index";
    this.adminEmailIndex = "admin-email-index";
    this.vendorsNameIndex = "vendors-supported-sname-index";
    this.vendorsSupportedTopVendorIndexIndex =
      "vendors-supported-topvendorindex-index";
    this.vendorsTypeNameIndex = "vendors-billertype-sname-index";
    this.vendorsBillerTypeTopVendorIndexIndex =
      "vendors-billertype-topvendorIndex-index";
    this.billsIdIndex = "bills-id-index";
    this.billsBillerIdAccountNumberIndex =
      "bills-billerId-account_number-index";
    this.billsActiveUpdatedAtIndex = "bills-active-updatedAt-index";
    this.billsAccountNumberIndex = "bills-account_number-index";
    this.billsUidDueDateIndex = "bills-uid-due_date-index";
    this.billsTransactionsUpdatedAtIndex =
      "transactions-bill_id-updatedAt-index";
    this.transactionsStatusUpdatedAtIndex =
      "transactions-status-updatedAt-index";
    this.transactionsAccountNumberIndex = "transactions-account_number-index";
    this.transactionsIdIndex = "transactions-id-index";
    this.transactionsPayerIdIndex = "transactions-payerId-index";
    this.searchvendorFoundUpdatedAtIndex = "searchvendor-found-updatedAt-index";
    this.searchvendorYearUpdatedAtIndex = "searchvendor-year-updatedAt-index";
    this.ingestIngestIdCreatedAt = "ingestId-createdAt-index";

    this.userIdViewAtIndex = "uv-userid-viewAt-index";
    this.engagementTimeUserIndex = "engagement-time-userid-index";
    this.impetusStageIndex = "stage-index";

    this.playCreatedAt = "play-createdAt-index";
  }

  // utot
  async putUTOU(data) {
    try {
      if (data && data.id && data.payerid) {
        this.iconsole.log(data);
        const timestamp = new Date().toISOString();
        data.updatedAt = timestamp;
        data.createdAt = data.createdAt || timestamp;
        var putParams = {
          TableName: this.utouTable,
          Item: data,
        };

        await dynamoDb.put(putParams).promise();
        return data;
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async getUTOU(id, payerid) {
    this.iconsole.log(id, payerid);
    var getParams = {
      TableName: this.utouTable,
      Key: {
        id: id,
        payerid: payerid,
      },
    };
    try {
      let data = await dynamoDb.get(getParams).promise();
      if (Object.keys(data).length === 0) {
        let obj = {
          id: id,
          payerid: payerid,
          thanks: "true",
        };
        obj = await this.putUTOU(obj);
        return obj;
      } else {
        return data.Item;
      }
    } catch (error) {
      throw error;
    }
  }

  async getUTOUByIds(id, payerIds) {
    try {
      const getParams = {
        RequestItems: {},
      };

      getParams.RequestItems[this.utouTable] = { Keys: [] };
      payerIds.forEach((payerid) => {
        getParams.RequestItems[this.utouTable].Keys.push({
          id: id,
          payerid: payerid,
        });
      });

      var res = await dynamoDb.batchGet(getParams).promise();
      this.iconsole.log(res);
      return res.Responses[this.utouTable];
    } catch (error) {
      throw error;
    }
  }

  // karma

  async putKarma(data) {
    try {
      if (data && data.id) {
        this.iconsole.log(data);
        if (data.name) {
          data.sname = data.name.toLowerCase();
        }

        const timestamp = new Date().toISOString();
        data.updatedAt = timestamp;
        data.createdAt = data.createdAt || timestamp;
        var putParams = {
          TableName: this.karmaTable,
          Item: data,
        };

        await dynamoDb.put(putParams).promise();
        return data;
      } else {
        throw "Karma Id is mandatory field";
      }
    } catch (error) {
      throw error;
    }
  }

  async getKarma(id) {
    this.iconsole.log("id:" + id);
    var getParams = {
      TableName: this.karmaTable,
      Key: {
        id: id,
      },
    };
    try {
      let data = await dynamoDb.get(getParams).promise();
      if (Object.keys(data).length === 0) {
        throw "InvalidId";
      } else {
        return data.Item;
      }
    } catch (error) {
      throw error;
    }
  }

  async getKarmaOrgs(status) {
    status = status || "active";
    this.iconsole.log(status);
    try {
      var queryParams = {
        TableName: this.karmaTable,
        KeyConditionExpression: "#status = :status",
        IndexName: this.karmaStatusAmountIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": status,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async getPlays(status) {
    status = status || "active";
    this.iconsole.log(status);
    try {
      var queryParams = {
        TableName: this.playTable,
        KeyConditionExpression: "#status = :status",
        IndexName: this.karmaStatusAmountIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": status,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  // affiliate / invitation

  async putInvitation(data) {
    try {
      this.iconsole.log(data);
      data.status = data.status || "pending";
      const timestamp = new Date().toISOString();
      data.updatedAt = timestamp;
      data.createdAt = data.createdAt || timestamp;
      var putParams = {
        TableName: this.invitationTable,
        Item: data,
      };

      await dynamoDb.put(putParams).promise();
      return data;
    } catch (error) {
      throw error;
    }
  }

  async getInvitation(id, phone) {
    this.iconsole.log(id, phone);
    var getParams = {
      TableName: this.invitationTable,
      Key: {
        id: id,
        phone: phone,
      },
    };
    try {
      let data = await dynamoDb.get(getParams).promise();
      if (Object.keys(data).length === 0) {
        return null;
      } else {
        return data.Item;
      }
    } catch (error) {
      throw error;
    }
  }

  async getInvitationAffiliates(phone) {
    this.iconsole.log(phone);
    try {
      var queryParams = {
        TableName: this.invitationTable,
        KeyConditionExpression: "#phone = :phone",
        IndexName: this.invitationPhoneUpdatedAtIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        ExpressionAttributeNames: {
          "#phone": "phone",
        },
        ExpressionAttributeValues: {
          ":phone": phone,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  // affiliate

  async putAffiliate(data) {
    try {
      data = data || {};
      this.iconsole.log(data);
      data.id = data.id || uuid.v4();
      const timestamp = new Date().toISOString();
      data.updatedAt = timestamp;
      data.createdAt = data.createdAt || timestamp;
      var putParams = {
        TableName: this.affiliateTable,
        Item: data,
      };

      await dynamoDb.put(putParams).promise();
      return data;
    } catch (error) {
      throw error;
    }
  }

  async getAffiliate(id) {
    this.iconsole.log("id:" + id);
    var getParams = {
      TableName: this.affiliateTable,
      Key: {
        id: id,
      },
    };
    try {
      let data = await dynamoDb.get(getParams).promise();
      if (Object.keys(data).length === 0) {
        return null;
      } else {
        return data.Item;
      }
    } catch (error) {
      throw error;
    }
  }

  async getAffiliates(status) {
    status = status || "active";
    this.iconsole.log(status);
    try {
      var queryParams = {
        TableName: this.affiliateTable,
        KeyConditionExpression: "#status = :status",
        IndexName: this.affiliateStatusInstallsIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": status,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async getAffiliateRefferedUsers(refid) {
    this.iconsole.log(refid);
    try {
      var queryParams = {
        TableName: this.userTable,
        KeyConditionExpression: "#refid = :refid",
        IndexName: this.usersRefidCreatedAtIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        ExpressionAttributeNames: {
          "#refid": "refid",
        },
        ExpressionAttributeValues: {
          ":refid": refid,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  // report

  async putProblemReport(data) {
    try {
      this.iconsole.log(data);
      if (data.group && data.info) {
        data.id = data.id || uuid.v4();
        const timestamp = new Date().toISOString();
        data.updatedAt = timestamp;
        data.createdAt = data.createdAt ? data.createdAt : timestamp;
        if (!data.ym || !data.year) {
          let now = moment().tz(process.env.DEFAULT_TIMEZONE);
          data.ym = now.format("YYYY-MM");
          data.year = now.format("YYYY");
        }
        var putParams = {
          TableName: this.reportTable,
          Item: data,
        };

        await dynamoDb.put(putParams).promise();
        return data;
      } else {
        throw "Report group and info fields are mandatory";
      }
    } catch (error) {
      throw error;
    }
  }

  async deleteProblemReport(id) {
    this.iconsole.log("id:" + id);
    var delParams = {
      TableName: this.reportTable,
      Key: {
        id: id,
      },
    };
    try {
      await dynamoDb.delete(delParams).promise();
      return {
        id: id,
        status: "deleted",
      };
    } catch (error) {
      throw error;
    }
  }

  async getProblemReport(id) {
    try {
      this.iconsole.log("id:" + id);
      var getParams = {
        TableName: this.reportTable,
        Key: {
          id: id,
        },
      };
      let data = await dynamoDb.get(getParams).promise();
      if (Object.keys(data).length === 0) {
        throw "InvalidId";
      } else {
        return data.Item;
      }
    } catch (error) {
      throw error;
    }
  }

  async getProblemReports(year) {
    try {
      if (!year) {
        let now = moment().tz(process.env.DEFAULT_TIMEZONE);
        year = now.format("YYYY");
      }
      var queryParams = {
        TableName: this.reportTable,
        IndexName: this.reportsYearUpdatedAtIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        KeyConditionExpression: "#year = :year",
        ExpressionAttributeNames: {
          "#year": "year",
        },
        ExpressionAttributeValues: {
          ":year": year,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async getMonthlyProblemReports(ym) {
    try {
      if (!ym) {
        let now = moment().tz(process.env.DEFAULT_TIMEZONE);
        ym = now.format("YYYY-MM");
      }
      var queryParams = {
        TableName: this.reportTable,
        IndexName: this.reportsYmUpdatedAtIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        KeyConditionExpression: "#ym = :ym",
        ExpressionAttributeNames: {
          "#ym": "ym",
        },
        ExpressionAttributeValues: {
          ":ym": ym,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  // Search

  async putSearchVendor(data) {
    this.iconsole.log(data);
    const timestamp = new Date().toISOString();
    data.updatedAt = timestamp;
    data.createdAt = data.createdAt ? data.createdAt : timestamp;
    if (!data.ym || !data.year) {
      let now = moment().tz(process.env.DEFAULT_TIMEZONE);
      data.ym = now.format("YYYY-MM");
      data.year = now.format("YYYY");
    }
    var putParams = {
      TableName: this.searchVendorTable,
      Item: data,
    };

    await dynamoDb.put(putParams).promise();
    return data;
  }

  async getSearchVendor(query, found = "false") {
    this.iconsole.log("query:" + query);
    var getParams = {
      TableName: this.searchVendorTable,
      Key: {
        query: query,
        found: found,
      },
    };
    try {
      let data = await dynamoDb.get(getParams).promise();
      if (Object.keys(data).length === 0) {
        return null;
      } else {
        return data.Item;
      }
    } catch (error) {
      throw error;
    }
  }

  async getSearchVendorByYear(year) {
    if (!year) {
      let now = moment().tz(process.env.DEFAULT_TIMEZONE);
      year = now.format("YYYY");
    }
    this.iconsole.log(year);
    try {
      var queryParams = {
        TableName: this.searchVendorTable,
        IndexName: this.searchvendorYearUpdatedAtIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        KeyConditionExpression: "#year = :year",
        ExpressionAttributeNames: {
          "#year": "year",
        },
        ExpressionAttributeValues: {
          ":year": year,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async getSearchVendorByFound(found) {
    this.iconsole.log(found);
    try {
      var queryParams = {
        TableName: this.searchVendorTable,
        IndexName: this.searchvendorFoundUpdatedAtIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        KeyConditionExpression: "#found = :found",
        ExpressionAttributeNames: {
          "#found": "found",
        },
        ExpressionAttributeValues: {
          ":found": found,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  // Promocode

  async getPromocode(id) {
    this.iconsole.log("id:" + id);
    var getParams = {
      TableName: this.promocodeTable,
      Key: {
        id: id,
      },
    };
    try {
      let data = await dynamoDb.get(getParams).promise();
      if (Object.keys(data).length === 0) {
        throw "InvalidId";
      } else {
        return data.Item;
      }
    } catch (error) {
      throw error;
    }
  }

  async putPromocode(promo) {
    try {
      this.iconsole.log("promo:" + promo);
      const timestamp = new Date().toISOString();
      promo.createdAt = promo.createdAt ? promo.createdAt : timestamp;
      promo.updatedAt = timestamp;

      var putParams = {
        TableName: this.promocodeTable,
        Item: promo,
      };
      await dynamoDb.put(putParams).promise();
      return promo;
    } catch (error) {
      throw error;
    }
  }

  async deletePromocode(id) {
    var deleteParams = {
      TableName: this.promocodeTable,
      Key: {
        id: id,
      },
    };
    try {
      let data = await dynamoDb.delete(deleteParams).promise();
      return {
        id: id,
        status: "deleted",
      };
    } catch (error) {
      return {
        status: "failed",
      };
      // throw error;
    }
  }

  // Support

  async putSupportTicket(supportTicket) {
    this.iconsole.log(supportTicket);
    const timestamp = new Date().toISOString();
    supportTicket.updatedAt = timestamp;
    supportTicket.createdAt = supportTicket.createdAt
      ? supportTicket.createdAt
      : timestamp;
    var putParams = {
      TableName: this.supportTable,
      Item: supportTicket,
    };

    await dynamoDb.put(putParams).promise();
    return supportTicket;
  }

  async getSupportTicket(id) {
    this.iconsole.log("id:" + id);
    var getParams = {
      TableName: this.supportTable,
      Key: {
        id: id,
      },
    };

    try {
      let data = await dynamoDb.get(getParams).promise();
      if (Object.keys(data).length === 0) {
        throw "InvalidId";
      } else {
        return data.Item;
      }
    } catch (error) {
      throw error;
    }
  }

  async getSupportTicketsBetween(type, start, end) {
    this.iconsole.log(type, start, end);
    try {
      var queryParams = {
        TableName: this.supportTable,
        IndexName: this.supportTypeUpdatedAtIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        KeyConditionExpression:
          "#type = :type AND #updatedAt BETWEEN :start AND :end",
        ExpressionAttributeNames: {
          "#type": "type",
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: {
          ":type": type,
          ":start": start,
          ":end": end,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async getUserSupportTickets(uid) {
    this.iconsole.log(uid);
    try {
      var queryParams = {
        TableName: this.supportTable,
        IndexName: this.supportUidIdIndex,
        KeyConditionExpression: "#uid = :uid",
        FilterExpression: "#type = :type",
        ExpressionAttributeNames: {
          "#uid": "uid",
          "#type": "type",
        },
        ExpressionAttributeValues: {
          ":uid": uid,
          ":type": "text",
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  // admin settings functions
  async getAdminSettings(id) {
    this.iconsole.log("id:" + id);
    var getParams = {
      TableName: this.settingsTable,
      Key: {
        id: id,
      },
    };

    try {
      let data = await dynamoDb.get(getParams).promise();
      if (Object.keys(data).length === 0) {
        throw "InvalidId";
      } else {
        return data.Item;
      }
    } catch (error) {
      throw error;
    }
  }

  async putAdminSettings(settings) {
    this.iconsole.log(settings);
    const timestamp = new Date().toISOString();
    settings.updatedAt = timestamp;
    settings.createdAt = settings.createdAt ? settings.createdAt : timestamp;
    var putParams = {
      TableName: this.settingsTable,
      Item: settings,
    };

    await dynamoDb.put(putParams).promise();
    return settings;
  }

  // Admin user functions

  async getAdminUser(id) {
    this.iconsole.log("id:" + id);
    var getParams = {
      TableName: this.adminTable,
      Key: {
        id: id,
      },
    };

    try {
      let data = await dynamoDb.get(getParams).promise();
      if (Object.keys(data).length === 0) {
        throw "InvalidId";
      } else {
        return data.Item;
      }
    } catch (error) {
      throw error;
    }
  }

  async getAdminUserByEmail(email) {
    this.iconsole.log(email);
    try {
      var queryParams = {
        TableName: this.adminTable,
        KeyConditionExpression: "#email = :email",
        IndexName: this.adminEmailIndex,
        ExpressionAttributeNames: {
          "#email": "email",
        },
        ExpressionAttributeValues: {
          ":email": email,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async putAdminUser(user) {
    this.iconsole.log(user);
    const timestamp = new Date().toISOString();
    user.updatedAt = timestamp;
    user.createdAt = user.createdAt ? user.createdAt : timestamp;
    var putParams = {
      TableName: this.adminTable,
      Item: user,
    };

    await dynamoDb.put(putParams).promise();
    return user;
  }

  // charge functions

  async getUserPayments(uid) {
    this.iconsole.log(uid);
    try {
      var queryParams = {
        TableName: this.chargeTable,
        KeyConditionExpression: "#uid = :uid",
        ExpressionAttributeNames: {
          "#uid": "uid",
        },
        ExpressionAttributeValues: {
          ":uid": uid,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      this.iconsole.log(error);
      throw error;
    }
  }

  async getUserPayment(uid, chargeid) {
    this.iconsole.log(uid, chargeid);
    var getParams = {
      TableName: this.chargeTable,
      Key: {
        uid: uid,
        chargeid: chargeid,
      },
    };

    try {
      let data = await dynamoDb.get(getParams).promise();
      if (Object.keys(data).length === 0) {
        throw "InvalidId";
      } else {
        return data.Item;
      }
    } catch (error) {
      throw error;
    }
  }

  async putUserPayment(charge) {
    this.iconsole.log(charge);
    const timestamp = new Date().toISOString();

    charge.updatedAt = timestamp;
    charge.createdAt = timestamp;
    var putParams = {
      TableName: this.chargeTable,
      Item: charge,
    };

    await dynamoDb.put(putParams).promise();
    return charge;
  }

  async deleteUserPayment(uid, chargeid) {
    this.iconsole.log(uid, chargeid);
    var delParams = {
      TableName: this.chargeTable,
      Key: {
        uid: uid,
        chargeid: chargeid,
      },
    };
    try {
      await dynamoDb.delete(delParams).promise();
      return {
        uid: uid,
        chargeid: chargeid,
        status: "deleted",
      };
    } catch (error) {
      throw error;
    }
  }

  async getUserOutboundPayments(uid) {
    this.iconsole.log(uid);
    try {
      var queryParams = {
        TableName: this.chargeTable,
        IndexName: this.chargesUidUpdatedAtIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        KeyConditionExpression: "#uid = :uid",
        ExpressionAttributeNames: {
          "#uid": "uid",
        },
        ExpressionAttributeValues: {
          ":uid": uid,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async getUserInboundPayments(uid, start, end) {
    this.iconsole.log(uid);
    try {
      var queryParams = {
        TableName: this.chargeTable,
        IndexName: this.chargesBillUserIdUpdatedAtIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        KeyConditionExpression:
          "#billUserId = :billUserId and #updatedAt BETWEEN :start AND :end",
        ExpressionAttributeNames: {
          "#billUserId": "billUserId",
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: {
          ":billUserId": uid,
          ":start": start,
          ":end": end,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  // tasks

  async getTask(id) {
    this.iconsole.log("id:" + id);
    var getParams = {
      TableName: this.this.tasksTable,
      Key: {
        id: id,
      },
    };
    try {
      let data = await dynamoDb.get(getParams).promise();
      if (Object.keys(data).length === 0) {
        throw "InvalidId";
      } else {
        return data.Item;
      }
    } catch (error) {
      throw error;
    }
  }

  async putTask(task) {
    this.iconsole.log(task);
    const timestamp = new Date().toISOString();
    task.updatedAt = timestamp;
    task.createdAt = task.createdAt ? task.createdAt : timestamp;
    var putParams = {
      TableName: this.tasksTable,
      Item: task,
    };

    await dynamoDb.put(putParams).promise();
    return task;
  }

  // statistics

  async getStats(did, id) {
    this.iconsole.log(did, id);
    var ymd = did.split("-");
    id = id
      ? id
      : ymd.length === 3
      ? "day"
      : ymd.length === 2
      ? "month"
      : "year";
    var getParams = {
      TableName: this.statsTable,
      Key: {
        did: did,
        id: id,
      },
    };
    try {
      let data = await dynamoDb.get(getParams).promise();
      if (Object.keys(data).length === 0) {
        return null; //throw "InvalidId";
      } else {
        return data.Item;
      }
    } catch (error) {
      throw error;
    }
  }

  async getVendorDailyStats(did) {
    this.iconsole.log(did);
    try {
      var queryParams = {
        TableName: this.statsTable,
        KeyConditionExpression: "#did = :did",
        ExpressionAttributeNames: {
          "#did": "did",
        },
        ExpressionAttributeValues: {
          ":did": did,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async getStatsBetween(id, start, end) {
    this.iconsole.log(id, start, end);
    try {
      var queryParams = {
        TableName: this.statsTable,
        IndexName: this.statsIdDidIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        KeyConditionExpression: "#id = :id AND #did BETWEEN :start AND :end",
        ExpressionAttributeNames: {
          "#id": "id",
          "#did": "did",
        },
        ExpressionAttributeValues: {
          ":id": id,
          ":start": start,
          ":end": end,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async putStats(stats) {
    this.iconsole.log(stats);
    const timestamp = new Date().toISOString();
    stats.updatedAt = timestamp;
    stats.createdAt = stats.createdAt ? stats.createdAt : timestamp;
    var putParams = {
      TableName: this.statsTable,
      Item: stats,
    };

    await dynamoDb.put(putParams).promise();
    return stats;
  }

  async deleteStats(did, id) {
    this.iconsole.log("did:" + did + " id:" + id);
    var delParams = {
      TableName: this.statsTable,
      Key: {
        did: did,
        id: id,
      },
    };
    try {
      await dynamoDb.delete(delParams).promise();
      return {
        did: did,
        id: id,
        status: "deleted",
      };
    } catch (error) {
      throw error;
    }
  }

  // subscriptions

  async getSubscription(id) {
    this.iconsole.log("id:" + id);
    var getParams = {
      TableName: this.subscriptionsTable,
      Key: {
        id: id,
      },
    };
    try {
      let data = await dynamoDb.get(getParams).promise();
      if (Object.keys(data).length === 0) {
        throw "InvalidId";
      } else {
        return data.Item;
      }
    } catch (error) {
      throw error;
    }
  }

  async getPayerSubscription(payer) {
    try {
      this.iconsole.log("payer:" + payer);
      var queryParams = {
        TableName: this.subscriptionsTable,
        IndexName: this.subscriptionsPayerUpdatedAtIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        KeyConditionExpression: "#payer = :payer",
        ExpressionAttributeNames: {
          "#payer": "payer",
        },
        ExpressionAttributeValues: {
          ":payer": payer,
        },
      };

      let res = await this.queryTable(queryParams);
      if (res.Items.length) {
        let payeeSet = new Set();
        var payeeMap = new Map();
        let vendorsSet = new Set();
        var vendorsMap = new Map();
        res.Items.forEach((item) => {
          payeeSet.add(item.payer);
          vendorsSet.add(item.vendorId);
        });

        var payeeIds = Array.from(payeeSet);
        while (payeeIds.length) {
          let batchpayeeIds = payeeIds.splice(0, 25);
          let payeeUsers = await this.getUsers(batchpayeeIds);
          payeeUsers.forEach((pu) => {
            payeeMap.set(pu.id, pu);
          });
        }

        var vendorIds = Array.from(vendorsSet);
        while (vendorIds.length) {
          let batchvendorIds = vendorIds.splice(0, 25);
          let payerVendors = await this.getVendors(batchvendorIds);
          payerVendors.forEach((pv) => {
            vendorsMap.set(pv.id, pv);
          });
        }

        res.Items.forEach((item) => {
          let trPayee = payeeMap.has(item.payee)
            ? payeeMap.get(item.payee)
            : {
                id: "undefined",
                userName: "undefined",
                profileImage: "undefined",
              };
          let trVendor = vendorsMap.has(item.vendorId)
            ? vendorsMap.get(item.vendorId)
            : {
                id: "undefined",
                name: "undefined",
                image: "undefined",
                imagex: "undefined",
              };
          item.payeeInfo = {
            userName: trPayee.userName,
            profileImage: trPayee.profileImage,
          };
          item.vendorInfo = {
            name: trVendor.name,
            image: trVendor.image,
            imagex: trVendor.imagex,
          };
        });
      }
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async getPayeeSubscription(payee) {
    try {
      this.iconsole.log("payee:" + payee);
      var queryParams = {
        TableName: this.subscriptionsTable,
        IndexName: this.subscriptionsPayeeUpdatedAtIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        KeyConditionExpression: "#payee = :payee",
        ExpressionAttributeNames: {
          "#payee": "payee",
        },
        ExpressionAttributeValues: {
          ":payee": payee,
        },
      };

      let res = await this.queryTable(queryParams);
      if (res.Items.length) {
        let payerSet = new Set();
        var payerMap = new Map();
        let vendorsSet = new Set();
        var vendorsMap = new Map();
        res.Items.forEach((item) => {
          payerSet.add(item.payer);
          vendorsSet.add(item.vendorId);
        });

        var payerIds = Array.from(payerSet);
        while (payerIds.length) {
          let batchpayerIds = payerIds.splice(0, 25);
          let payerUsers = await this.getUsers(batchpayerIds);
          payerUsers.forEach((pu) => {
            payerMap.set(pu.id, pu);
          });
        }

        var vendorIds = Array.from(vendorsSet);
        while (vendorIds.length) {
          let batchvendorIds = vendorIds.splice(0, 25);
          let payerVendors = await this.getVendors(batchvendorIds);
          payerVendors.forEach((pv) => {
            vendorsMap.set(pv.id, pv);
          });
        }

        res.Items.forEach((item) => {
          let trPayer = payerMap.has(item.payer)
            ? payerMap.get(item.payer)
            : {
                id: "undefined",
                userName: "undefined",
                profileImage: "undefined",
              };
          let trVendor = vendorsMap.has(item.vendorId)
            ? vendorsMap.get(item.vendorId)
            : {
                id: "undefined",
                name: "undefined",
                image: "undefined",
                imagex: "undefined",
              };
          item.payerInfo = {
            userName: trPayer.userName,
            profileImage: trPayer.profileImage,
          };
          item.vendorInfo = {
            name: trVendor.name,
            image: trVendor.image,
            imagex: trVendor.imagex,
          };
        });
      }
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async putSubscription(subscription) {
    this.iconsole.log(subscription);
    const timestamp = new Date().toISOString();
    subscription.updatedAt = timestamp;
    subscription.createdAt = subscription.createdAt
      ? subscription.createdAt
      : timestamp;
    var putParams = {
      TableName: this.subscriptionsTable,
      Item: subscription,
    };

    await dynamoDb.put(putParams).promise();
    return subscription;
  }

  async deleteSubscription(id) {
    this.iconsole.log("id:" + id);
    var getParams = {
      TableName: this.subscriptionsTable,
      Key: {
        id: id,
      },
    };
    try {
      let data = await dynamoDb.delete(getParams).promise();
      return {
        id: id,
        status: "deleted",
      };
    } catch (error) {
      throw error;
    }
  }

  // transactions functions

  async getUserTransactions(uid) {
    this.iconsole.log(uid);
    try {
      var queryParams = {
        TableName: this.transactionTable,
        KeyConditionExpression: "#uid = :uid",
        FilterExpression: "#status = :status",
        ExpressionAttributeNames: {
          "#uid": "uid",
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":uid": uid,
          ":status": "paid",
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async getUserTransactionsByChargeId(uid, chargeid) {
    this.iconsole.log(uid);
    try {
      var queryParams = {
        TableName: this.transactionTable,
        KeyConditionExpression: "#uid = :uid",
        FilterExpression: "#status = :status and chargeid = :chargeid",
        ExpressionAttributeNames: {
          "#uid": "uid",
          "#status": "status",
          "#chargeid": "chargeId",
        },
        ExpressionAttributeValues: {
          ":uid": uid,
          ":status": "paid",
          ":chargeid": chargeid,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      return [];
    }
  }

  async getUserOutboundTransactions(uid) {
    this.iconsole.log(uid);
    try {
      var queryParams = {
        TableName: this.transactionTable,
        KeyConditionExpression: "#uid = :uid",
        FilterExpression: "#status = :status",
        ExpressionAttributeNames: {
          "#uid": "uid",
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":uid": uid,
          ":status": "paid",
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      return [];
    }
  }

  async getUserInboundTransactions(uid) {
    this.iconsole.log(uid);
    try {
      var queryParams = {
        TableName: this.transactionTable,
        IndexName: this.transactionsPayerIdIndex,
        KeyConditionExpression: "#payerId = :payerId",
        FilterExpression: "#status = :status",
        ExpressionAttributeNames: {
          "#payerId": "payerId",
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":payerId": uid,
          ":status": "paid",
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      return [];
    }
  }

  async putUserTransaction(transaction) {
    this.iconsole.log(transaction);
    const timestamp = new Date().toISOString();
    transaction.id = transaction.id.toString();
    transaction.updatedAt = transaction.updated_at
      ? transaction.updated_at
      : timestamp;
    transaction.createdAt = transaction.created_at
      ? transaction.created_at
      : timestamp;
    delete transaction.updated_at;
    delete transaction.created_at;
    var putParams = {
      TableName: this.transactionTable,
      Item: transaction,
    };

    await dynamoDb.put(putParams).promise();
    return transaction;
  }

  async deleteUserTransaction(uid, id) {
    this.iconsole.log("uid:" + uid + " id:" + id);
    var delParams = {
      TableName: this.transactionTable,
      Key: {
        uid: uid,
        id: id,
      },
    };
    try {
      await dynamoDb.delete(delParams).promise();
      return {
        uid: uid,
        id: id,
        status: "deleted",
      };
    } catch (error) {
      throw error;
    }
  }

  async getTransactionsByDate(startDate, status = "initialized") {
    this.iconsole.log(startDate);
    status = status ? status : "initialized";
    startDate = startDate
      ? moment(startDate).utc().format()
      : moment().subtract(7, "days").format();
    try {
      var queryParams = {
        TableName: this.transactionTable,
        IndexName: this.transactionsStatusUpdatedAtIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        KeyConditionExpression: "#status = :status AND #updatedAt >= :start",
        ExpressionAttributeNames: {
          "#status": "status",
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: {
          ":status": status,
          ":start": startDate,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async getTransactionById(id) {
    this.iconsole.log(id);
    try {
      var queryParams = {
        TableName: this.transactionTable,
        IndexName: this.transactionsIdIndex,
        KeyConditionExpression: "#id = :id",
        ExpressionAttributeNames: {
          "#id": "id",
        },
        ExpressionAttributeValues: {
          ":id": id,
        },
      };
      let res = await this.queryTable(queryParams);
      if (res.Items && res.Items.length) {
        return res.Items[0];
      } else {
        return null;
        // throw "InvalidTransactionId";
      }
    } catch (error) {
      throw error;
    }
  }

  async getTransactionsByAccountNumber(accountNumber) {
    this.iconsole.log(accountNumber);
    try {
      var queryParams = {
        TableName: this.transactionTable,
        IndexName: this.transactionsAccountNumberIndex,
        KeyConditionExpression: "#account_number = :account_number",
        ExpressionAttributeNames: {
          "#account_number": "account_number",
        },
        ExpressionAttributeValues: {
          ":account_number": accountNumber,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async getBillTransactions(billId) {
    this.iconsole.log(billId);
    try {
      var queryParams = {
        TableName: this.transactionTable,
        IndexName: this.billsTransactionsUpdatedAtIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        KeyConditionExpression: "#billId = :billId",
        ExpressionAttributeNames: {
          "#billId": "billId",
        },
        ExpressionAttributeValues: {
          ":billId": billId,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async getBillTransactionsByUserID(billId, uid) {
    this.iconsole.log(billId, uid);
    try {
      var queryParams = {
        TableName: this.transactionTable,
        IndexName: this.billsTransactionsUpdatedAtIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        KeyConditionExpression: "#billId = :billId",
        FilterExpression: "#uid = :uid",
        ExpressionAttributeNames: {
          "#billId": "billId",
          "#uid": "uid",
        },
        ExpressionAttributeValues: {
          ":billId": billId,
          ":uid": uid,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }
  // bills functions

  async getBillsByUidDueDate(uid, due_date = null, showUnpaid = true) {
    this.iconsole.log(uid);
    due_date = due_date ? due_date : moment().tz(this.tz).format("YYYY-MM-DD");
    try {
      var queryParams = {
        TableName: this.billTable,
        IndexName: this.billsUidDueDateIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        KeyConditionExpression: "#uid = :uid AND #due_date >= :due_date",
        ExpressionAttributeNames: {
          "#uid": "uid",
          "#due_date": "due_date",
        },
        ExpressionAttributeValues: {
          ":uid": uid,
          ":due_date": due_date,
        },
      };

      if (showUnpaid) {
        queryParams.ExpressionAttributeNames["#balance"] = "balance";
        queryParams.ExpressionAttributeValues[":balance"] = 0;
        queryParams.FilterExpression = "#balance > :balance";
      }
      this.iconsole.log(queryParams);
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async getBillsByDate(startDate, endDate = null) {
    this.iconsole.log(startDate);
    startDate = startDate
      ? moment(startDate).format()
      : moment().subtract(30, "days").format();
    endDate = endDate ? moment(endDate).format() : moment().format();
    try {
      var queryParams = {
        TableName: this.billTable,
        IndexName: this.billsActiveUpdatedAtIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        KeyConditionExpression:
          "#active = :active AND #updatedAt BETWEEN :start AND :end",
        ExpressionAttributeNames: {
          "#active": "active",
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: {
          ":active": "true",
          ":start": startDate,
          ":end": endDate,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async filterBillsByBzType(filterParam) {
    filterParam = filterParam.trim().toLowerCase();
    this.iconsole.log(filterParam);
    try {
      var queryParams = {
        TableName: this.billTable,
        IndexName: this.billsActiveUpdatedAtIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        KeyConditionExpression: "#active = :active",
        FilterExpression: "contains (#bztype, :bztype)",
        ExpressionAttributeNames: {
          "#active": "active",
          "#bztype": "bztype",
        },
        ExpressionAttributeValues: {
          ":active": "true",
          ":bztype": filterParam,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async getBillsByAccountNumber(accountNumber) {
    this.iconsole.log(accountNumber);
    try {
      var queryParams = {
        TableName: this.billTable,
        IndexName: this.billsAccountNumberIndex,
        KeyConditionExpression: "#account_number = :account_number",
        ExpressionAttributeNames: {
          "#account_number": "account_number",
        },
        ExpressionAttributeValues: {
          ":account_number": accountNumber,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async getUserBillById(id) {
    this.iconsole.log(id);
    try {
      var queryParams = {
        TableName: this.billTable,
        IndexName: this.billsIdIndex,
        KeyConditionExpression: "#id = :id",
        ExpressionAttributeNames: {
          "#id": "id",
        },
        ExpressionAttributeValues: {
          ":id": id,
        },
      };
      let res = await this.queryTable(queryParams);
      if (res.Items && res.Items.length) {
        return res.Items[0];
      } else {
        throw "InvalidBillId";
      }
    } catch (error) {
      throw error;
    }
  }

  async getBillById(id) {
    this.iconsole.log(id);
    try {
      var queryParams = {
        TableName: this.billTable,
        IndexName: this.billsIdIndex,
        KeyConditionExpression: "#id = :id",
        ExpressionAttributeNames: {
          "#id": "id",
        },
        ExpressionAttributeValues: {
          ":id": id,
        },
      };
      let res = await this.queryTable(queryParams);
      if (res.Items && res.Items.length) {
        return res.Items[0];
      } else {
        return null;
      }
    } catch (error) {
      throw error;
    }
  }

  async getUserBillByIds(uid, billIds) {
    try {
      const getParams = {
        RequestItems: {},
      };

      getParams.RequestItems[this.billTable] = { Keys: [] };
      billIds.forEach((billId) => {
        getParams.RequestItems[this.billTable].Keys.push({
          uid: uid,
          id: billId,
        });
      });

      var res = await dynamoDb.batchGet(getParams).promise();
      this.iconsole.log(res);
      return res.Responses[this.billTable];
    } catch (error) {
      throw error;
    }
  }

  async getUserBillByBillerIdAccountNumber(uid, billerId, accountNumber) {
    this.iconsole.log(billerId, accountNumber);
    try {
      var queryParams = {
        TableName: this.billTable,
        IndexName: this.billsBillerIdAccountNumberIndex,
        KeyConditionExpression:
          "#billerId = :billerId and #accountNumber = :accountNumber",
        FilterExpression: "#uid = :uid and #active = :active",
        ExpressionAttributeNames: {
          "#uid": "uid",
          "#active": "active",
          "#billerId": "billerId",
          "#accountNumber": "account_number",
        },
        ExpressionAttributeValues: {
          ":uid": uid,
          ":active": "true",
          ":billerId": billerId,
          ":accountNumber": accountNumber,
        },
      };
      let res = await this.queryTable(queryParams);
      if (res.Items && res.Items.length) {
        return res.Items[0];
      } else {
        return null;
      }
    } catch (error) {
      throw error;
    }
  }

  async getUserBills(uid) {
    this.iconsole.log(uid);
    try {
      var queryParams = {
        TableName: this.billTable,
        KeyConditionExpression: "#uid = :uid",
        ExpressionAttributeNames: {
          "#uid": "uid",
        },
        ExpressionAttributeValues: {
          ":uid": uid,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async getUserBillByBillerId(uid, id) {
    this.iconsole.log(uid, id);
    try {
      var queryParams = {
        TableName: this.billTable,
        KeyConditionExpression: "#uid = :uid and #id = :id",
        ExpressionAttributeNames: {
          "#uid": "uid",
          "#id": "id",
        },
        ExpressionAttributeValues: {
          ":uid": uid,
          ":id": id,
        },
      };
      let res = await this.queryTable(queryParams);
      this.iconsole.log(res.Items);
      if (res.Items && res.Items.length) {
        return res.Items[0];
      } else {
        throw "InvalidBillId";
      }
    } catch (error) {
      throw error;
    }
  }

  async getUserBillsByBillerId(uid, billerId) {
    this.iconsole.log(uid, billerId);
    try {
      var queryParams = {
        TableName: this.billTable,
        KeyConditionExpression: "#uid = :uid AND #id = :id",
        ExpressionAttributeNames: {
          "#uid": "uid",
          "#id": "id",
        },
        ExpressionAttributeValues: {
          ":uid": uid,
          ":id": billerId,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async putUserBill(bill) {
    this.iconsole.log(bill);
    const timestamp = new Date().toISOString();
    // bill.id = bill.id.toString();
    bill.updatedAt = timestamp;
    bill.createdAt = bill.createdAt ? bill.createdAt : timestamp;
    var putParams = {
      TableName: this.billTable,
      Item: bill,
    };

    await dynamoDb.put(putParams).promise();
    return bill;
  }

  async deleteUserBill(uid, id) {
    this.iconsole.log("uid:" + uid + " id:" + id);
    var delParams = {
      TableName: this.billTable,
      Key: {
        uid: uid,
        id: id,
      },
    };
    try {
      await dynamoDb.delete(delParams).promise();
      return {
        uid: uid,
        id: id,
        status: "deleted",
      };
    } catch (error) {
      throw error;
    }
  }

  // users db functions

  async getActiveUsers(active = "true") {
    this.iconsole.log(active);
    try {
      var queryParams = {
        TableName: this.userTable,
        KeyConditionExpression: "#active = :active",
        IndexName: this.userActiveCreatedAtIndex, // this.userActiveUpdatedAtIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        ExpressionAttributeNames: {
          "#active": "active",
        },
        ExpressionAttributeValues: {
          ":active": active,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  //get all users regardless of any conditions
  async getAllUsers() {
    var queryParams = {
      TableName: this.userTable,
    };

    try {
      let data = await (await dynamoDb.scan(queryParams).promise()).Items;
      data.sort((a, b) => {
        if (new Date(a.createdAt) > new Date(b.createdAt)) return -1;
        if (new Date(a.createdAt) < new Date(b.createdAt)) return 1;
        return 0;
      });
      for (let i = 0; i < data.length; i++) {
        let bills = await this.getUserBills(data[i].id);
        if (bills && bills.length > 0) {
          for (let j = 0; j < bills.length; j++) {
            const transactions = await this.getBillTransactionsByUserID(
              bills[j].id,
              data[i].id
            );
            bills[j]["transactions"] = transactions;
          }
        }
        data[i]["bills"] = bills;
        if (bills.length > 0 || (isObject(data[i].payment) && "stripeId" in data[i].payment)) {
          data[i]["state"] = "Verified";
        } else {
          data[i]["state"] = "Unverified";
        }
        if (
          data[i].profileImage &&
          data[i].profileImage !==
            "https://" +
              process.env.BZ_S3_BACKET +
              ".s3.amazonaws.com/users/profileImageDefault.jpg"
        ) {
          data[i]["state"] += "+";
        } else {
          data[i]["state"] = "+";
        }
      }
      console.log(data, "all user data");
      return data;
    } catch (error) {
      this.iconsole.log("=== ERROR ===", error);
      throw error;
    }
  }

  async getLoggedinUsers(loggedin = "true") {
    this.iconsole.log(loggedin);
    try {
      var queryParams = {
        TableName: this.userTable,
        KeyConditionExpression: "#loggedin = :loggedin",
        IndexName: this.userLoggedinUpdatedAtIndex,
        ScanIndexForward: false, // true = ascending, false = descending
        ExpressionAttributeNames: {
          "#loggedin": "loggedin",
        },
        ExpressionAttributeValues: {
          ":loggedin": loggedin,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async getUserByUserName(userName) {
    this.iconsole.log(userName);
    try {
      var queryParams = {
        TableName: this.userTable,
        KeyConditionExpression: "#username = :username",
        IndexName: this.userNameIndex,
        ExpressionAttributeNames: {
          "#username": "userName",
        },
        ExpressionAttributeValues: {
          ":username": userName,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async searchUserByUserName(userName, limit) {
    this.iconsole.log(userName);
    try {
      limit = limit ? parseInt(limit) : 100;
      var queryParams = {
        TableName: this.userTable,
        KeyConditionExpression:
          "#verified = :verified and begins_with(#username, :username)",
        IndexName: this.userVerifiedUserNameIndex,
        ExpressionAttributeNames: {
          "#verified": "verified",
          "#username": "userName",
        },
        ExpressionAttributeValues: {
          ":verified": "true",
          ":username": userName,
        },
      };
      let res = await this.queryTable(queryParams, limit);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async getTestUsers(limit = 1000) {
    this.iconsole.log(limit);
    try {
      var queryParams = {
        TableName: this.userTable,
        KeyConditionExpression: "#verified = :verified",
        FilterExpression: "#test = :test",
        IndexName: this.userVerifiedUserNameIndex,
        ExpressionAttributeNames: {
          "#verified": "verified",
          "#test": "test",
        },
        ExpressionAttributeValues: {
          ":verified": "true",
          ":test": "true",
        },
      };
      let res = await this.queryTable(queryParams, limit);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async getUserByPhone(phone) {
    this.iconsole.log(phone);
    try {
      var queryParams = {
        TableName: this.userTable,
        KeyConditionExpression: "#phone = :phone",
        IndexName: this.userPhoneIndex,
        ExpressionAttributeNames: {
          "#phone": "phone",
        },
        ExpressionAttributeValues: {
          ":phone": phone,
        },
      };
      let res = await this.queryTable(queryParams);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async getUser(id) {
    this.iconsole.log("id:" + id);
    var getParams = {
      TableName: this.userTable,
      Key: {
        id: id,
      },
    };
    try {
      let data = await dynamoDb.get(getParams).promise();
      if (Object.keys(data).length === 0) {
        throw "InvalidId";
      } else {
        return data.Item;
      }
    } catch (error) {
      throw error;
    }
  }

  async getUsers(uids) {
    try {
      const getParams = {
        RequestItems: {},
      };

      getParams.RequestItems[this.userTable] = { Keys: [] };
      uids.forEach((uid) => {
        getParams.RequestItems[this.userTable].Keys.push({
          id: uid,
        });
      });

      var res = await dynamoDb.batchGet(getParams).promise();
      this.iconsole.log(res);
      return res.Responses[this.userTable];
    } catch (error) {
      throw error;
    }
  }

  async putUser(user) {
    this.iconsole.log(user);
    const timestamp = new Date().toISOString();
    user.updatedAt = timestamp;
    user.createdAt = user.createdAt ? user.createdAt : timestamp;
    var putParams = {
      TableName: this.userTable,
      Item: user,
    };

    await dynamoDb.put(putParams).promise();
    return user;
  }

  async deleteUser(id) {
    this.iconsole.log("id:" + id);
    var getParams = {
      TableName: this.userTable,
      Key: {
        id: id,
      },
    };
    try {
      let data = await dynamoDb.delete(getParams).promise();
      return {
        id: id,
        status: "deleted",
      };
    } catch (error) {
      throw error;
    }
  }

  // Vendors DB functions

  async getCommonVendors(limit) {
    try {
      limit = limit ? parseInt(limit) : 100;
      var queryParams = {
        TableName: this.vendorTable,
        KeyConditionExpression: "#supported = :supported",
        IndexName: this.vendorsSupportedTopVendorIndexIndex,
        ScanIndexForward: true, // true = ascending, false = descending
        ExpressionAttributeNames: {
          "#supported": "supported",
        },
        ExpressionAttributeValues: {
          ":supported": "true",
        },
      };

      let res = await this.queryTable(queryParams, limit);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async searchVendor(searchString, filterParam = null, limit) {
    try {
      searchString = searchString.trim().toLowerCase();
      limit = limit ? parseInt(limit) : 100;
      this.iconsole.log(searchString);

      var queryParams = {
        TableName: this.vendorTable,
        KeyConditionExpression:
          "#supported = :supported and begins_with(#sname, :sname)",
        IndexName: this.vendorsNameIndex,
        ExpressionAttributeNames: {
          "#supported": "supported",
          "#sname": "sname",
        },
        ExpressionAttributeValues: {
          ":supported": "true",
          ":sname": searchString,
        },
      };

      if (filterParam) {
        let flt = filterParam.trim().split(" ");
        for (let i = 0; i < flt.length; i++) {
          flt[i] = flt[i]
            .trim()
            .toLowerCase()
            .replace(/(?:(^.)|(\s+.))/g, function (match) {
              return match.charAt(match.length - 1).toUpperCase();
            });
        }
        filterParam = flt.join(" ");
        this.iconsole.log(filterParam);
        queryParams = {
          TableName: this.vendorTable,
          KeyConditionExpression:
            "#type = :type and begins_with(#sname, :sname)",
          IndexName: this.vendorsTypeNameIndex,
          ExpressionAttributeNames: {
            "#type": "biller_type",
            "#sname": "sname",
          },
          ExpressionAttributeValues: {
            ":type": filterParam,
            ":sname": searchString,
          },
        };
      }

      let res = await this.queryTable(queryParams, limit);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async searchVendorByContent(searchString, limit) {
    try {
      searchString = searchString.trim().toLowerCase();
      limit = limit ? parseInt(limit) : 100;
      this.iconsole.log(searchString);

      var queryParams = {
        TableName: this.vendorTable,
        KeyConditionExpression: "#supported = :supported",
        FilterExpression: "contains (#sname, :sname)",
        IndexName: this.vendorsSupportedTopVendorIndexIndex,
        ExpressionAttributeNames: {
          "#supported": "supported",
          "#sname": "sname",
        },
        ExpressionAttributeValues: {
          ":supported": "true",
          ":sname": searchString,
        },
      };

      let res = await this.queryTable(queryParams, limit);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async filterVendor(filterParam, limit) {
    try {
      // this.iconsole.log(filterParam);
      // var searchTerms = filterParam.trim().split(" ");
      // limit = limit ? parseInt(limit):100;
      // for(let i=0;i<searchTerms.length;i++){
      //   searchTerms[i] = searchTerms[i].trim().toLowerCase().replace(/(?:(^.)|(\s+.))/g, function(match) {
      //         return match.charAt(match.length-1).toUpperCase();
      //     });
      // }
      // filterParam = searchTerms.join(" ");
      limit = limit ? parseInt(limit) : 1200;
      this.iconsole.log(filterParam);
      var queryParams = {
        TableName: this.vendorTable,
        KeyConditionExpression: "#type = :type",
        FilterExpression: "#supported = :supported",
        IndexName: this.vendorsBillerTypeTopVendorIndexIndex,
        ScanIndexForward: true, // true = ascending, false = descending
        ExpressionAttributeNames: {
          "#type": "biller_type",
          "#supported": "supported",
        },
        ExpressionAttributeValues: {
          ":type": filterParam,
          ":supported": "true",
        },
      };

      let res = await this.queryTable(queryParams, limit);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async filterVendorByType(filterParam, limit) {
    try {
      filterParam = filterParam.trim();
      limit = limit ? parseInt(limit) : 1200;
      this.iconsole.log(filterParam);
      var queryParams = {
        TableName: this.vendorTable,
        KeyConditionExpression: "#supported = :supported",
        FilterExpression: "contains (#biller_type, :biller_type)",
        IndexName: this.vendorsSupportedTopVendorIndexIndex,
        ScanIndexForward: true, // true = ascending, false = descending
        ExpressionAttributeNames: {
          "#supported": "supported",
          "#biller_type": "biller_type",
        },
        ExpressionAttributeValues: {
          ":supported": "true",
          ":biller_type": filterParam,
        },
      };

      let res = await this.queryTable(queryParams, limit);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async filterVendorByBzType(filterParam, limit) {
    try {
      filterParam = filterParam.trim().toLowerCase();
      limit = limit ? parseInt(limit) : 1200;
      this.iconsole.log(filterParam);
      var queryParams = {
        TableName: this.vendorTable,
        KeyConditionExpression: "#supported = :supported",
        FilterExpression: "contains (#bztype, :bztype)",
        IndexName: this.vendorsSupportedTopVendorIndexIndex,
        ScanIndexForward: true, // true = ascending, false = descending
        ExpressionAttributeNames: {
          "#supported": "supported",
          "#bztype": "bztype",
        },
        ExpressionAttributeValues: {
          ":supported": "true",
          ":bztype": filterParam,
        },
      };

      let res = await this.queryTable(queryParams, limit);
      return res.Items;
    } catch (error) {
      throw error;
    }
  }

  async putVendor(vendor) {
    try {
      this.iconsole.log(vendor);
      const timestamp = new Date().toISOString();

      vendor.updatedAt = timestamp;
      vendor.createdAt = vendor.createdAt ? vendor.createdAt : timestamp;

      var putParams = {
        TableName: this.vendorTable,
        Item: vendor,
      };

      await dynamoDb.put(putParams).promise();
      return vendor;
    } catch (error) {
      throw error;
    }
  }

  async getVendors(vendors) {
    try {
      const getParams = {
        RequestItems: {},
      };

      getParams.RequestItems[this.vendorTable] = { Keys: [] };
      vendors.forEach((vendor) => {
        getParams.RequestItems[this.vendorTable].Keys.push({
          id: vendor,
        });
      });

      var res = await dynamoDb.batchGet(getParams).promise();
      //this.iconsole.log(res);
      return res.Responses[this.vendorTable];
    } catch (error) {
      throw error;
    }
  }

  // create or delete up to 25 items
  async putVendors(vendors) {
    try {
      const timestamp = new Date().toISOString();
      const putParams = {
        RequestItems: {},
      };
      putParams.RequestItems[this.vendorTable] = [];
      vendors.forEach((vendor) => {
        vendor.updatedAt = timestamp;
        vendor.createdAt = vendor.createdAt ? vendor.createdAt : timestamp;
        putParams.RequestItems[this.vendorTable].push({
          PutRequest: {
            Item: vendor,
          },
        });
      });

      await dynamoDb.batchWrite(putParams).promise();
      return { status: "success", itemsAdded: vendors.length };
    } catch (error) {
      throw error;
    }
  }

  async getVendor(id) {
    this.iconsole.log("id:" + id);
    var getParams = {
      TableName: this.vendorTable,
      Key: {
        id: id,
      },
    };

    try {
      let data = await dynamoDb.get(getParams).promise();
      if (Object.keys(data).length === 0) {
        throw "InvalidId";
      } else {
        return data.Item;
      }
    } catch (error) {
      throw error;
    }
  }

  putFinoVendor(params) {
    return dynamoDb
      .put({
        TableName: this.finoProviderTable,
        Item: params,
      })
      .promise();
  }

  updateFinoVendor(params) {
    return dynamoDb
      .update({
        TableName: this.finoProviderTable,

        Key: {
          id: params.vendor.id,
        },

        UpdateExpression: [
          "SET isProdVendorInSync = :isProdVendorInSync",
          "isSupportedInProdTable = :isSupportedInProdTable",
          "createdAt = :createdAt",
          "updatedAt = :updatedAt",
          "vendor = :vendor",
        ].join(", "),

        ExpressionAttributeValues: {
          isProdVendorInSync: params.isProdVendorInSync || false,
          isSupportedInProdTable: params.isSupportedInProdTable || false,
          updatedAt: params.updatedAt,
          vendor: params.vendor,
        },
      })
      .promise();
  }

  putIngestionVendor(params) {
    return dynamoDb
      .put({
        TableName: this.ingestionTable,
        Item: params,
      })
      .promise();
  }

  queryIngestionData(params) {
    return this.queryTable({
      TableName: this.ingestionTable,
      params: params,
    });
  }
  // utility functions

  async queryTable(queryParams, limit) {
    var response = {
      Items: [],
      Count: 0,
      startAfter: null,
    };
    limit = limit ? parseInt(limit) : 0;
    try {
      const reQuery = async (params, response) => {
        try {
          let data = await dynamoDb.query(params).promise();
          response.Items = response.Items.concat(data.Items);

          if (limit && response.Items.length >= parseInt(limit)) {
            response.Items = response.Items.slice(0, parseInt(limit));
            response.Count = response.Items.length;
            if (data.LastEvaluatedKey) {
              response.startAfter = data.LastEvaluatedKey;
            }
            //this.iconsole.log(data);
            return response;
          } else {
            response.Count = response.Items.length;
            if (data.LastEvaluatedKey) {
              params.ExclusiveStartKey = data.LastEvaluatedKey;
              return reQuery(params, response);
            }

            return response;
          }
        } catch (error) {
          this.iconsole.log(error);
          throw error;
        }
      };

      return await reQuery(queryParams, response);
    } catch (error) {
      this.iconsole.log(error);
      throw error;
    }
  }

  async getLastIngestionId(source) {
    const queryResult = await this.queryTable(
      {
        TableName: this.ingestionTable,
        IndexName: this.ingestIngestIdIndex,
        ScanIndexForward: false,
      },
      2
    );

    return queryResult.Items[0].ingestId;
  }

  async getIngestionRecordsForLastIngestionId() {
    const ingestionId = await this.getLastIngestionId();
    return await this.getIngestedRecordsByIngestionId(ingestionId);
  }

  async getIngestedRecordsByIngestionId(ingestionId) {
    const response = await this.queryTable({
      TableName: this.ingestionTable,
      IndexName: this.ingestIngestIdIndex,
      KeyConditionExpression: "ingestId = :ingestionId",
      ScanIndexForward: false,
      ExpressionAttributeValues: { ingestionId },
    });

    return response.Items;
  }

  putRawData(data, tableName) {
    var putParams = {
      TableName: tableName,
      Item: data,
    };

    return dynamoDb.put(putParams).promise();
  }

  async recursiveScanTable(params, callbackFunction) {
    try {
      var data = await dynamoDb.scan(params).promise();
      for (let i = 0; i < data.Items.length; i++) {
        let item = data.Items[i];
        await callbackFunction(item);
      }
      if (data.LastEvaluatedKey) {
        params.ExclusiveStartKey = data.LastEvaluatedKey;
        return this.recursiveScanTable(params, callbackFunction);
      } else {
        return "Done";
      }
    } catch (error) {
      this.iconsole.log(error);
      this.iconsole.log(JSON.stringify(error));
      throw error;
    }
  }

  // converters from JavaScript Object to DynamoDb Format
  marshall(dataJson) {
    return AWS.DynamoDB.Converter.marshall(dataJson);
  }

  // converters from DynamoDb to JavaScript Object
  unmarshall(dataDynamo) {
    return AWS.DynamoDB.Converter.unmarshall(dataDynamo);
  }

  // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#createPresignedPost-property
  async createAwsS3PutPresignedUrl(myKey, expireSeconds, payloadField) {
    try {
      expireSeconds = expireSeconds ? expireSeconds : 300;

      var params = {
        Bucket: process.env.BZ_S3_BACKET,
        Key: myKey,
        ACL: "public-read",
        ContentType: "binary/octet-stream",
      };
      if (expireSeconds) {
        params.Expires = expireSeconds;
      }
      if (payloadField) {
        params.Body = payloadField;
      }

      return await s3.getSignedUrl("putObject", params);
    } catch (error) {
      throw error;
    }
  }

  async uploadBase64ImageToAwsS3(pathName, base64String) {
    try {
      const type = base64String.split(";")[0].split("/")[1];
      let buffer = new Buffer.from(
        base64String.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );
      var params = {
        Bucket: process.env.BZ_S3_BACKET,
        Key: `${pathName}.${type}`,
        Body: buffer,
        ACL: "public-read",
        ContentEncoding: "base64",
        ContentType: `image/${type}`,
      };

      //this.iconsole.log("params:",params);
      const { Location, Key } = await s3.upload(params).promise();
      this.iconsole.log(Location, Key);
      return Location;
    } catch (error) {
      this.iconsole.log("=== ERROR ===", error);
      throw error;
    }
  }

  async sqsSendMessage(queueUrl, payload) {
    try {
      var params = {
        MessageBody: JSON.stringify(payload),
        QueueUrl: queueUrl,
        DelaySeconds: 0,
      };

      this.iconsole.log(params);
      return await sqs.sendMessage(params).promise();
    } catch (error) {
      this.iconsole.log("=== ERROR ===", error);
      throw error;
    }
  }

  async putFinoHook(bill) {
    this.iconsole.log(bill);
    const timestamp = new Date().toISOString();
    bill.id = uuid.v4();
    bill.createdAt = timestamp;
    var putParams = {
      TableName: this.finoHookTable,
      Item: bill,
    };

    await dynamoDb.put(putParams).promise();
    return bill;
  }

  async getShelters() {
    var getParams = {
      TableName: this.sheltersTable,
      FilterExpression: "title <> :title",
      ExpressionAttributeValues: {
        ":title": "",
      },
    };

    try {
      let data = await dynamoDb.scan(getParams).promise();
      if (Object.keys(data).length === 0) {
        throw "Invalid";
      } else {
        return data.Items;
      }
    } catch (error) {
      this.iconsole.log("=== ERROR ===", error);
      throw error;
    }
  }

  async getUsersWithActiveBills(active) {
    var queryParams = {
      TableName: this.billTable,
      IndexName: this.billsActiveUpdatedAtIndex,
      KeyConditionExpression: "#active = :active",
      ExpressionAttributeNames: {
        "#active": "active",
      },
      ExpressionAttributeValues: {
        ":active": active,
      },
      ProjectionExpression: "uid",
    };
    try {
      let res = await this.queryTable(queryParams);
      let users = [];
      for (let user of res.Items) {
        if (!users.includes(user.uid)) {
          users.push(user.uid);
        }
      }
      console.log("usersWithActiveBills ", users);
      return users;
    } catch (error) {
      this.iconsole.log("=== ERROR ===", error);
      throw error;
    }
  }

  async putUserUV(userId, viewerId) {
    console.log(`newUV = ${userId} ${viewerId}`);
    const pendingUVsofViewer = await this.services.uvcl.getPendingUVs(viewerId);
    console.log("putUserUV", pendingUVsofViewer);
    if (pendingUVsofViewer.length > 0) {
      return;
    }

    const timestamp = new Date().toISOString();

    var putParams = {
      TableName: this.uvTable,
      Item: {
        id: uuid.v4(),
        viewAt: timestamp,
        userid: userId,
        viewerId: viewerId,
      },
    };
    try {
      await dynamoDb.put(putParams).promise();
    } catch (err) {
      return err;
    }
  }

  async getUserUV1(userId, start, end) {
    try {
      var queryParams = {
        TableName: this.uvTable,
        IndexName: this.userIdViewAtIndex,
        KeyConditionExpression:
          "#userid = :userid and (#viewAt BETWEEN :start AND :end)",
        // ConditionExpression: ""
        ExpressionAttributeNames: {
          "#userid": "userid",
          "#viewAt": "viewAt",
        },
        ExpressionAttributeValues: {
          ":userid": userId,
          ":start": start,
          ":end": end,
        },
        ProjectionExpression: "viewerId",
      };
      let res = await this.queryTable(queryParams);
      let uniqueViewers = [];
      let uniqueIds = [];
      for (let _viewer of res.Items) {
        if (uniqueIds.indexOf(_viewer.viewerId) >= 0) {
          continue;
        }
        uniqueViewers.push(_viewer);
        uniqueIds.push(_viewer.viewerId);
      }
      return uniqueViewers;
    } catch (error) {
      throw error;
    }
  }

  async checkUserHasCC(userId) {
    try {
      const userInfo = await this.getUser(userId);
      if (userInfo.payment !== undefined) {
        const hasCC =
          userInfo.payment.stripeId !== undefined &&
          userInfo.payment.stripeId !== "";
        const uvV = userInfo.UVV !== undefined && userInfo.UVV === true;
        return { hasCC, uvV };
      }
    } catch (error) {
      console.log("checkUserHasBILL ", error);
    }
    return false;
  }

  async checkUserHasBILL(userId) {
    try {
      const userBills = await this.getUserBills(userId);
      return userBills.length;
    } catch (err) {
      return 0;
    }
  }

  async getUVInfo(userId, start, end) {
    try {
      const uv1s = await this.getUserUV1(userId, start, end);
      let uv2s = [];
      for (const uv1 of uv1s) {
        // check if viewer has one payment
        const userHasBill = await this.checkUserHasBILL(uv1.viewerId);
        if (userHasBill) {
          console.log("has bill", userHasBill);
          uv2s.push(uv1);
          continue;
        }
        // check if viewer has cc
        const { hasCC, uvV } = await this.checkUserHasCC(uv1.viewerId);
        if (hasCC) {
          console.log("has cc");
          uv2s.push(uv1);
        }
      }
      console.log("getUVInfo ", uv1s, uv2s);
      return { uv1: uv1s, uv2: uv2s };
    } catch (error) {
      console.log("getUVInfo error ", error);
      throw error;
    }
  }

  async calculateExpectationProbability(group, updatedUserId) {
    //      group: {
    //         pool: _pool - users of group
    //         id: gameId,
    //         count: j,
    //         poolId: nGroups + 1
    //       }
    let gameUsers = group.pool;
    let billsInfo = [];
    let totalBills = 0;
    let uvItems = [];
    for (const gameUserId of gameUsers) {
      const bills = await this.getUserBills(gameUserId);
      const { start, end } = this.services.utils.getTimeofDay();
      console.log("calculate Probability ", gameUserId, start, end);

      const { uv1, uv2 } = await this.getUVInfo(gameUserId, start, end);
      if (gameUserId !== updatedUserId) {
        uvItems = uv1;
      } else {
        uvItems = uv2;
      }
      const payItems = await this.getUserInboundPayments(
        gameUserId,
        start,
        end
      );

      console.log("calculateProbability UV=", uvItems.length);
      let billsCount = bills.length;
      if (payItems.length > 0) {
        billsCount = billsCount * 2 * payItems.length;
      }
      if (uv2.length > 0) {
        billsCount = billsCount * 2 * uv2.length;
      }

      // const billsCount = bills.length * Math.pow(2, payItems.length) * Math.pow(2, uvItems.length);
      billsInfo.push({
        userid: gameUserId,
        bills: billsCount,
        prob: 0,
      });
      totalBills = totalBills + billsCount;
    }
    console.log("calculate totalBills return==", totalBills);
    for (const billInfo of billsInfo) {
      billInfo.prob = Math.round((billInfo.bills / totalBills) * 100).toFixed(
        2
      );
    }
    return billsInfo;
  }

  async getPoolInfoByDate(param) {
    // const {startDate, poolId} = param;
    // let startDateArg = startDate
    //   ? moment(startDate).format("YYYY-MM-DD")
    //   : moment().format("YYYY-MM-DD");
    // console.log(`start-Date '${startDate}'`);
    // console.log('getPoolInfoByDate ', this.poolTable, this.poolsCreatedAtPoolid)
    // let queryParams = {};
    // if (poolId !== undefined) {
    //   queryParams = {
    //     TableName: this.poolTable,
    //     KeyConditionExpression: "#createdAt = :createdAtDate and #poolid = :poolid",
    //     IndexName: this.poolsCreatedAtPoolid,
    //     ExpressionAttributeNames: {
    //       "#createdAt": "createdAt",
    //       "#poolid": "poolid"
    //     },
    //     ExpressionAttributeValues: {
    //       ":createdAtDate": startDateArg,
    //       ":poolId" : poolId
    //     }
    //   };
    //
    // } else {
    //   queryParams = {
    //     TableName: this.poolTable,
    //     KeyConditionExpression: "#createdAt = :createdAtDate",
    //     IndexName: this.poolsCreatedAtPoolid,
    //     ExpressionAttributeNames: {
    //       "#createdAt": "createdAt",
    //     },
    //     ExpressionAttributeValues: {
    //       ":createdAtDate": startDateArg,
    //     }
    //   };
    // }
    //
    // let data = await this.queryTable(queryParams);
    // console.log(data.Item);
    // return data.Items;

    var getParams = {
      TableName: this.poolTable,
      FilterExpression: "createdAt <> :createdAt",
      ExpressionAttributeValues: {
        ":createdAt": "",
      },
    };

    console.log("scanning getPoolInfo");
    try {
      let data = await dynamoDb.scan(getParams).promise();
      if (Object.keys(data).length === 0) {
        throw "Invalid";
      } else {
        return data.Items;
      }
    } catch (error) {
      this.iconsole.log("=== ERROR ===", error);
      console.log(error);
    }
  }

  async getEngagementInfoByDate(startDate) {
    // startDate = startDate
    //   ? moment(startDate).format("YYYY-MM-DD")
    //   : moment().format("YYYY-MM-DD");
    // const queryParams = {
    //   TableName: this.engagementTable,
    //   KeyConditionExpression: "#time = :time",
    //   IndexName: this.engagementTimeUserIndex,
    //   ExpressionAttributeNames: {
    //     "#time": "time",
    //   },
    //   ExpressionAttributeValues: {
    //     ":time": startDate,
    //   }
    // };
    // let data = await this.queryTable(queryParams);
    // console.log(data.Item);
    // return data.Items;
    var getParams = {
      TableName: this.engagementTable,
      FilterExpression: "impetus <> :impetus",
      ExpressionAttributeValues: {
        ":impetus": "",
      },
    };

    try {
      let data = await dynamoDb.scan(getParams).promise();
      if (Object.keys(data).length === 0) {
        throw "Invalid";
      } else {
        console.log(data.Items);
        return data.Items;
      }
    } catch (error) {
      this.iconsole.log("=== ERROR ===", error);
      console.log(error);
      throw error;
    }
  }
  async getImpetusEntry(stage) {
    const queryParams = {
      TableName: this.impetusTable,
      KeyConditionExpression: "#stage = :stage",
      IndexName: this.impetusStageIndex,
      ExpressionAttributeNames: {
        "#stage": "stage",
      },
      ExpressionAttributeValues: {
        ":stage": stage,
      },
    };
    try {
      let res = await this.queryTable(queryParams);
      return res.Items[0].payload;
    } catch (error) {
      throw error;
    }
  }
  async getImpetus() {
    // startDate = startDate
    //   ? moment(startDate).format("YYYY-MM-DD")
    //   : moment().format("YYYY-MM-DD");
    // console.log(`start-Date '${startDate}'`);
    var getParams = {
      TableName: this.impetusTable,
      FilterExpression: "payload <> :payload",
      ExpressionAttributeValues: {
        ":payload": "",
      },
    };

    try {
      let data = await dynamoDb.scan(getParams).promise();
      if (Object.keys(data).length === 0) {
        throw "Invalid";
      } else {
        return data.Items;
      }
    } catch (error) {
      this.iconsole.log("=== ERROR ===", error);
      console.log(error);
      throw error;
    }
  }

  async testFunc() {
    var itemsArray = [];
    var item1 = {
      DeleteRequest: {
        Key: {
          id: "3b449b15975f5b698125c216a7d2ba2d",
        },
      },
    };
    itemsArray.push(item1);
    var item2 = {
      DeleteRequest: {
        Key: {
          id: "720bdcf13a18bd951d03ac3e081a8944",
        },
      },
    };

    itemsArray.push(item2);

    var params = {
      RequestItems: {
        "billzero-prod-pool": itemsArray,
      },
    };
    await dynamoDb.batchWrite(params).promise();
  }

  async multipleBatchWrite(tableName, items) {
    while (items.length) {
      const batchItems = items.splice(0, 25);
      let requestItems = {
        RequestItems: {},
      };
      requestItems.RequestItems[tableName] = batchItems;
      await dynamoDb.batchWrite(requestItems).promise();
    }
  }
}

module.exports = dbHelperClass;
