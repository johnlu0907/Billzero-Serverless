"use strict";

const https = require("https");
const url = require("url");

const CONTENT_TYPE = "application/json";

class finov4Class {
  constructor(args) {
    for (var parameter in args) {
      this[parameter] = args[parameter];
    }

    this.services.addService("finov4cl", this);
    this.finoHost = process.env.FINO_API_V4_URL;
    this.finoCode = process.env.FINO_CUSTOMER_CODE;
    this.finoPwd = process.env.FINO_PASSWORD;
  }

  getAllProviders() {
    return this.get("/providers/all");
  }

  get(endpoint, params) {
    const queryParams = this.parameterize(params);
    return this.request("GET", this.finoHost + `/customer/${this.finoCode}` + endpoint + queryParams);
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
      this.finoHost + `/customer/${this.finoCode}/login`,
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

module.exports = finov4Class;
