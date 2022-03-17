"use strict";

const https = require("https");
const url = require("url");
const moment = require("moment");

const CONTENT_TYPE = "application/json";

const paymentFieldsCC = [
  {
    name: "Card Number",
    stringValue: "4065 9400 6809 4797",
  },
  {
    name: "Card Expiry MM",
    stringValue: "01",
  },
  {
    name: "Card Expiry YYYY",
    stringValue: "2027",
  },
  {
    name: "CVV",
    stringValue: "437",
  },
  {
    name: "Name on Card",
    stringValue: "John Doe",
  },
  {
    name: "Card Billing Address : Zip",
    stringValue: "90021",
  },
  {
    name: "Card Billing Address : Address Line1",
    stringValue: "1250 long beach ave",
  },
  {
    name: "Card Billing Address : Address Line2",
    stringValue: "apt 226",
  },
  {
    name: "Card Billing Address : City",
    stringValue: "Los Angeles",
  },
  {
    name: "Card Billing Address : State",
    stringValue: "CA",
  },
];

const paymentFieldsBank = [
  {
    name: "Bank Routing Number",
    stringValue: "322271627",
  },
  {
    name: "Bank Account Number",
    stringValue: "532027338",
  },
  {
    name: "Bank Account Type",
    stringValue: "3",
  },
  {
    name: "Service Address : Address Line1",
    stringValue: "1250 LONG BEACH AVE APT 226",
  },
  {
    name: "Service Address : City",
    stringValue: "LOS ANGELES",
  },
  {
    name: "Service Address : State",
    stringValue: "CA",
  },
  {
    name: "Service Address : Zip",
    stringValue: "90021",
  },
  {
    name: "Service Address : Phone",
    stringValue: "602-795-2289",
  },
  {
    name: "Service Address : House Number",
    stringValue: "1",
  },
  {
    name: "Service Address : Registered Email",
    stringValue: "ctoxyz@gmail.com",
  },
  {
    name: "Bank Account Holder Name",
    stringValue: "BILLZERO INC",
  },
  {
    name: "Nick Name",
    stringValue: "BZCHASE",
  },
  {
    name: "Select Your Bank Account Use",
    stringValue: "Business",
  },
];

class finoClass {
  constructor(args) {
    for (var parameter in args) {
      this[parameter] = args[parameter];
    }
    this.services.addService("finocl", this);
    this.finoHost = process.env.FINO_API_URL;
    this.finoCode = process.env.FINO_CUSTOMER_CODE;
    this.finoPwd = process.env.FINO_PASSWORD;
  }

  getAllProviders() {
    return this.get("/providers/all");
  }

  getProvidersByName(name) {
    return this.get("/providersByName/" + name);
  }

  getProviderById(id) {
    return this.get("/providers/" + id);
  }

  getUser(id) {
    return this.get("/users/" + id);
  }

  registerUser(data) {
    const userId = data.userId;
    data.ficode = userId;
    return this.post("/users/" + userId, data);
  }

  addProviderAccount(data) {
    const userId = data.userId;
    const providerImmutableId = data.vendorId;

    const content = {
      credentials: data.credentials,
      callbackUrl: process.env.FINO_BILL_WEBHOOK_URL,
    };

    return this.post(
      `/users/${userId}/providers/${providerImmutableId}`,
      content
    );
  }

  // -- mod shriyan ----------
  updateProviderAccount(data) {
    const userId = data.userId;
    const providerAccountId = data.vendorId;

    const content = {
      credentials: data.credentials,
      callbackUrl: process.env.FINO_BILL_WEBHOOK_URL,
    };

    return this.post(
      `/users/${userId}/providers/${providerImmutableId}/credentials`,
      content
    );
  }
  // end mod --------------------

  setMFAAnswer(userId, trackingToken, answer) {
    return this.post(
      `/users/${userId}/mfanswers?trackingToken=${trackingToken}`,
      answer
    );
  }

  refreshAccount(data) {
    const userId = data.user_id;
    const providerAccountId = data.account_id;
    const billerdata = {
      callbackUrl: process.env.FINO_BILL_WEBHOOK_URL,
    };
    return this.post(
      `/users/${userId}/providerAccounts/${providerAccountId}`,
      data
    );
  }

  deleteProviderAccount(userId, providerAccountId) {
    return this.delete(
      `/users/${userId}/providerAccounts/${providerAccountId}`
    );
  }

  getProviderAccounts(userId) {
    return this.get(`/users/${userId}/providerAccounts`);
  }

  getProviderAccountById(userId, providerAccountId) {
    return this.get(`/users/${userId}/providerAccounts/${providerAccountId}`);
  }

  getProviderAccountStatus(userId, trackingToken) {
    return this.get(
      `/users/${userId}/connectionStatus?trackingToken=${trackingToken}`
    );
  }

  getUserAccountById(userId, accountId) {
    return this.get(`/users/${userId}/accounts/${accountId}`);
  }

  getPaymentMethods(userId, accountId) {
    return this.get(
      `/users/${userId}/payToAccount/${accountId}/paymentMethods`
    );
  }

  getDirectPaymentFieldsCC(userId, accountId) {
    return this.get(
      `/users/${userId}/payToAccount/${accountId}/paymentMethod/creditcard/paymentFields`
    );
  }

  getDirectPaymentFieldsBank(userId, accountId) {
    return this.get(
      `/users/${userId}/payToAccount/${accountId}/paymentMethod/bank/paymentFields`
    );
  }

  directPaymentWithCC(userId, payToAccountId, amount, additionalFields) {
    const data = {
      payToAccountId,
      amount,
      paymentDateInYYYYMMdd: moment()
        .tz(process.env.DEFAULT_TIMEZONE)
        .format("YYYY-MM-DD"),
      paymentFields: paymentFieldsCC.concat(additionalFields),
      callbackUrl: process.env.FINO_BILL_WEBHOOK_URL,
    };
    return this.post(
      `/users/${userId}/paymentMethod/creditcard/directPayment`,
      data
    );
  }

  directPaymentWithBank(userId, payToAccountId, amount) {
    const data = {
      payToAccountId,
      amount,
      paymentDateInYYYYMMdd: moment()
        .tz(process.env.DEFAULT_TIMEZONE)
        .format("YYYY-MM-DD"),
      paymentFields: paymentFieldsBank,
      callbackUrl: process.env.FINO_BILL_WEBHOOK_URL,
    };
    return this.post(`/users/${userId}/paymentMethod/bank/directPayment`, data);
  }

  getPaymentDetails(userId, accountId, paymentToken) {
    return this.get(
      `/users/${userId}/payToAccount/${accountId}/payments/${paymentToken}`
    );
  }

  getPaymentStatus(userId, paymentToken) {
    return this.get(
      `/users/${userId}/paymentConnectionStatus?paymentTrackingToken=${paymentToken}`
    );
  }

  get(endpoint, params) {
    const queryParams = this.parameterize(params);
    return this.request("GET", this.finoHost + endpoint + queryParams);
  }

  post(endpoint, content) {
    const contentJson = this.json_encode(content);
    return this.request("POST", this.finoHost + endpoint, contentJson);
  }

  delete(endpoint, params) {
    const queryParams = this.parameterize(params);
    return this.request("DELETE", this.finoHost + endpoint + queryParams);
  }

  async request(method, requestUrl, content) {
    try {
      const headers = await this.generateHeaders();
      return await this.sendRequest(method, headers, requestUrl, content);
    } catch (error) {
      console.log("request error::", error);
      throw error;
    }
  }

  sendRequest(method, headers, requestUrl, content) {
    return new Promise((resolve, reject) => {
      console.log("request::", method, headers, requestUrl, content);

      let options = url.parse(requestUrl);
      var proto = https;

      options.method = method;
      options.headers = headers;

      console.log("request options::", options);

      let req = proto.request(options, (res) => {
        let body = "";

        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve(this.json_decode(body)));
      });

      req.on("error", reject);

      if (typeof content !== "undefined") {
        req.write(content);
      }

      req.end();
    });
  }

  async generateHeaders() {
    const res = await this.sendRequest(
      "POST",
      {
        "Content-Type": "application/x-www-form-urlencoded",
      },

      this.finoHost + "/login",
      `customerCode=${this.finoCode}&password=${this.finoPwd}`
    );

    return {
      "Content-Type": CONTENT_TYPE,
      "X-FINOVERA-TOKEN": res.token,
    };
  }

  json_encode(content) {
    return JSON.stringify(content);
  }

  async json_decode(content) {
    try {
      return JSON.parse(content);
    } catch (error) {
      console.log("json_decode error:", error);
      return {};
    }
  }

  now() {
    return new Date().toUTCString();
  }

  parameterize(params) {
    var res = "";
    switch (typeof params) {
      case "string":
        res = "?" + params;
        break;
      case "object":
        res = "?" + this.encode(params);
        break;
      default:
        params = "";
    }

    return res === "?" ? "" : res;
  }
}

module.exports = finoClass;