"use strict";

const rp = require("request-promise");

class billcomClass {
  constructor(args) {
    for (var parameter in args) {
      this[parameter] = args[parameter];
    }
    this.services.addService("billcomcl", this);
    this.apiEmail = process.env.BILLCOM_API_EMAIL;
    this.apiPwd = process.env.BILLCOM_API_PWD;
    this.apiHost = process.env.BILLCOM_API_URL;
    this.apiKey = process.env.BILLCOM_API_KEY;
    this.apiOrg = process.env.BILLCOM_API_ORG;
    this.apiSessionId = null;
  }

  async post(uri, params, xform = false) {
    try {
      var options = {
        method: "POST",
        uri: uri,
        json: true, // Automatically stringifies the body to JSON
      };

      if (xform) {
        options.form = params;
      } else {
        options.body = params;
      }

      var res = await rp(options);
      if (res.response_status === 0) {
        return res.response_data;
      } else {
        throw res.response_data.error_message;
      }
    } catch (error) {
      throw error;
    }
  }

  // <API_URL_EndPoint>/Login.json - method GET userName=<YourUserNameEmailAddress>&password=<YourPassword>&orgId=<YourOrgID>&devKey=<YourDevelopmentKey></YourDevelopmentKey>
  /*   Response::::
      {
      "response_status" : 0,
      "response_message" : "Success",
      "response_data" : {
      "sessionId" : "!a0s4gpoZg0vGlPTmHHOlQFopXjQ35JOmvRwlmy33PI0k",
      "orgId" : "00901IJYABCDWTYU7bpq",
      "apiEndPoint" : "https://app-sandbox.bill.com/api/v2",
      "usersId" : "04601WMDNOLDPOOHacll"
    }
   }
   NOTE:  Keep track of the "active" sessionId and devKey. These are used in subsequent API calls during the current login session.
   */

  async login() {
    try {
      var url = this.apiHost + "Login.json";
      var data = {
        userName: this.apiEmail,
        password: this.apiPwd,
        orgId: this.apiOrg,
        devKey: this.apiKey,
      };
      var res = await this.post(url, data, true);
      this.apiSessionId = res["sessionId"];
      return res;
    } catch (error) {
      throw error;
    }
  }

  //https://developer.bill.com/hc/en-us/articles/210136993-List#sub-anchor-1-2
  async list(paramId) {
    try {
      var url = this.apiHost + "List/" + paramId + ".json";
      if (!this.apiSessionId) {
        await this.login();
      }
      var data = {
        nested: true,
        start: 0,
        max: 999,
        filters: [{ field: "", op: "", value: "" }],
        sort: [{ field: "", asc: "" }],
      };

      var payload = {
        devKey: this.apiKey,
        sessionId: this.apiSessionId,
        data: data,
      };
      return await this.post(url, payload);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = billcomClass;
