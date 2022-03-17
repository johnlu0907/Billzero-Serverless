"use strict";

const crypto = require("crypto");
const https = require("https");
const http = require("http");
const moment = require("moment");
const { escape } = require("querystring");
const url = require("url");

const ACCEPT = "application/vnd.regalii.v3.2+json";
const CONTENT_TYPE = "application/json";

// Documantation: https://docx.arcusapi.com/#/
class arcusClass {
  constructor(args) {
    for (var parameter in args) {
      this[parameter] = args[parameter];
    }
    this.services.addService("arcuscl", this);
    this.useProxy = true;
    this.apiHost = process.env.ARCUS_API_URL;
    this.apiKey = process.env.ARCUS_API_KEY;
    this.secret = process.env.ARCUS_SECRET_KEY;
  }

  // db update utility functions
  async updateBillersDatabase(startPage = 1) {
    try {
      var result = {};
      var next = true;
      var itemsUpdates = 0;
      var start = moment();
      var params = { page: startPage, product: "xdata" };
      var topVendorsData = [
        {
          bztype: "cell phone",
          names: [
            "at&t",
            "verizon",
            "t-mobile",
            "sprint",
            "virgin mobile",
            "cricket",
            "us cellular",
            "metropcs",
            "airtel",
            "vodafone",
          ],
        },
        {
          bztype: "car insurance",
          names: [
            "state farm",
            "geico",
            "progressive",
            "allstate",
            "usaa",
            "liberty mutual",
            "farmers",
            "nationwide",
            "travelers",
            "american family",
          ],
        },
        {
          bztype: "car payment",
          names: [
            "ally bank",
            "wells fargo",
            "chase",
            "capital one",
            "toyota",
            "ford",
            "nissan",
            "santander",
            "honda",
            "bank of america",
            "chrysler capital",
            "td auto",
            "credit acceptance",
            "carmax",
            "us bank",
            "gm financial",
            "usaa fsb",
            "huntington",
            "kia motor",
            "pnc bank",
          ],
        },
        {
          bztype: "utilities",
          names: [
            "nextera energy",
            "duke energy",
            "dominion resources",
            "southern company",
            "exelon",
            "american electric",
            "public service enterprise group",
            "xcel energy",
            "consolidated edison",
            "pg&e",
            "ladwp",
            "southern california edison",
          ],
        },
        {
          bztype: "medical insurance",
          names: [
            "unitedhealth",
            "wellpoint",
            "kaiser",
            "humana",
            "aetna",
            "hcsc",
            "cigna",
            "highmark",
            "coventry",
            "hip insurance",
            "blue cross",
            "blue shield",
            "physicians",
            "health",
            "centene",
            "carefirst",
            "wellcare",
            "uhc of california",
            "healthcare",
            "cambia",
            "metropolitan",
          ],
        },
        {
          bztype: "student loans",
          names: [
            "navient",
            "fedloan",
            "mohela",
            "nelnet",
            "cornerstone",
            "edfinancial services ",
            "granite state",
            "osla",
            "great lakes",
            "sallie mae",
            "citizens bank",
            "discover",
            "lendkey",
            "laurel road",
            "mpower financing",
            "pnc",
            "sofi",
            "earnest",
            "wells fargo",
            "common bond",
            "simpletuition",
            "cedar education lending",
            "suntrust",
            "student loan network",
            "stafford loans",
            "perkins loans",
            "plus loans",
          ],
        },
        {
          bztype: "credit card",
          names: [
            "visa",
            "mastercard",
            "chase",
            "american express",
            "discover",
            "citibank",
            "capital one",
          ],
        },
      ];
      do {
        this.iconsole.log("get billers::", params);
        result = await this.billers(params);
        if (
          result &&
          result.billers &&
          Array.isArray(result.billers) &&
          result.billers.length
        ) {
          while (result.billers.length) {
            let batch = result.billers.splice(0, 25);
            for (let i = 0; i < batch.length; i++) {
              let vendor = batch[i];
              vendor.id = vendor.uuid;
              vendor.sname = vendor.name.toLowerCase();
              vendor.prefix = vendor.sname;
              vendor.bztype = [];
              vendor.biller_type = vendor.biller_type
                ? vendor.biller_type
                : "Other";
              vendor.topVendorIndex = 100;
              vendor.textColor = "000000";
              vendor.bgColor = "ffffff";
              vendor.image =
                "https://" +
                process.env.BZ_S3_BACKET +
                ".s3.amazonaws.com/vendors/imageDefault.jpg";
              vendor.imagex =
                "https://" +
                process.env.BZ_S3_BACKET +
                ".s3.amazonaws.com/vendors/imagexDefault.jpg";
              vendor.supported = "true";
              vendor.xPayBillerIds = [];
              for (let tvidx = 0; tvidx < topVendorsData.length; tvidx++) {
                let topVendor = topVendorsData[tvidx];
                for (
                  let topvidx = 0;
                  topvidx < topVendor.names.length;
                  topvidx++
                ) {
                  let tvname = topVendor.names[topvidx];
                  if (vendor.sname.search(tvname) !== -1) {
                    // the parameters bellow showld be updated if they are not exsits in database entry
                    vendor.prefix = tvname;
                    vendor.bztype.push(topVendor.bztype);
                    vendor.topVendorIndex = topvidx + 1;
                    break;
                  }
                }
              }

              if (!vendor.bztype.length) {
                vendor.bztype.push("other");
              }

              delete vendor.uuid;
              itemsUpdates++;
            }
            // todo, get vendors batch, update vendors, then put
            let getVendorIds = batch.map((x) => x.id);
            let getbatch = await this.services.dbcl.getVendors(getVendorIds);
            for (let x in batch) {
              let flt = getbatch.find((e) => e.id === batch[x].id);
              if (flt) {
                batch[x].prefix = flt.prefix ? flt.prefix : batch[x].prefix;
                batch[x].bztype = flt.bztype ? flt.bztype : batch[x].bztype;
                //batch[x].topVendorIndex = flt.topVendorIndex ? flt.topVendorIndex:batch[x].topVendorIndex;
                batch[x].textColor = flt.textColor
                  ? flt.textColor
                  : batch[x].textColor;
                batch[x].bgColor = flt.bgColor ? flt.bgColor : batch[x].bgColor;
                batch[x].image = flt.image ? flt.image : batch[x].image;
                batch[x].imagex = flt.imagex ? flt.imagex : batch[x].imagex;
                batch[x].supported = flt.supported
                  ? flt.supported
                  : batch[x].supported;
                batch[x].xPayBillerIds = flt.xPayBillerIds
                  ? flt.xPayBillerIds
                  : batch[x].xPayBillerIds;
              }
            }
            let res = await this.services.dbcl.putVendors(batch);
          }

          params.page++;
        } else {
          next = false;
        }
      } while (next);
      var end = moment();
      var diff = end.diff(start);
      return {
        status: "success",
        itemsUpdates: itemsUpdates,
        duration: moment.utc(diff).format("HH:mm:ss.SSS"),
      };
    } catch (error) {
      throw error;
    }
  }

  // common functions

  // Returns the properties of your Arcus account.
  account() {
    return this.get("/account");
  }

  // Provides the current list of billers
  billers(params) {
    return this.get("/billers", params);
  }

  // xPay functions

  // Retrieves all your bills if params is not provided
  bills(params) {
    return this.get("/bills", params);
  }

  // Creates a bill for a specific biller
  createBill(data) {
    var billerdata = {
      biller_id: data.biller_id,
      login: data.login,
      password: data.password,
    };
    if (data.external_user_id) {
      billerdata.external_user_id = data.external_user_id;
    }
    return this.post("/bills", billerdata);
  }

  // Retrieves a specific bill’s cached data
  getBill(billId) {
    return this.get("/bills/" + billId);
  }

  // Refreshes a specific bill by polling the biller
  refreshBill(billId) {
    return this.post("/bills/" + billId + "/refresh", {});
  }

  // Receives an array of bill ids and refreshes them
  refreshBillsBulk(billIds) {
    return this.post("/bills/bulk_refresh", { bill_ids: billIds });
  }

  // delete specific bill
  deleteBill(billId) {
    return this.delete("/bills/" + billId);
  }

  // Allows you to update a specific bill's credentials and/or answer MFA challenges
  updateBill(billId, content) {
    return this.patch("/bills/" + billId, content);
  }

  // xPay functions

  // provides the list of xPay billers and their associated properties, paginated on batches of 50 entries per request. If you send any of the q[] parameters, it will return a set of billers that meet the criteria specified.
  xpayBillers(params = {}) {
    return this.get("/rpps_billers", params);
  }

  // The q[name_cont] filter is not mandatory in the method explained above, you can still narrow down the correct biller using just the q[bin_eq] and q[mask_cont]. I understand that this method is not ideal when searching programmatically, but it is the best way we have right now. We do intend on creating that direct call xData biller id to xPay biller id, however, since it requires reassigning engineering resources it is subject to approval by management and may take a little longer than we'd like.

  async prevalidateRppsBillersArray(account_number, rppsBillersData) {
    try {
      if (
        rppsBillersData &&
        rppsBillersData.rpps_billers &&
        rppsBillersData.rpps_billers.length
      ) {
        let rppsBillers = rppsBillersData.rpps_billers;
        for (let i = 0; i < rppsBillers.length; i++) {
          let rppsBiller = rppsBillers[i];
          let prevalidateParams = {
            account_number: account_number,
            rpps_biller_id: rppsBiller.id,
          };
          let prevalidateResult = await this.prevalidateTransaction(
            prevalidateParams
          );
          if (prevalidateResult) {
            return rppsBiller;
          }
        }
      }
    } catch (error) {
      this.iconsole.log(error);
    }
    return null;
  }

  async prevalidateRppsBillerFromIdsArray(account_number, xPayBillerIds) {
    this.iconsole.log("---xpayBillerIds: ", xPayBillerIds);
    for (let i = 0; i < xPayBillerIds.length; i++) {
      let id = xPayBillerIds[i];
      let prevalidateParams = {
        account_number: account_number,
        rpps_biller_id: id,
      };
      let prevalidateResult = await this.prevalidateTransaction(
        prevalidateParams
      );
      if (prevalidateResult) {
        return {
          id: id,
        };
      }
    }
    return null;
  }

  async xpayBillerFind(data) {
    try {
      if (!data || !data.vendor || !data.account_number) {
        throw "Invalid input in xpayBillerFind";
      }

      if (data.vendor.xPayBillerIds) {
        let xPayBillerId = await this.prevalidateRppsBillerFromIdsArray(
          data.account_number,
          data.vendor.xPayBillerIds
        );
        if (xPayBillerId) {
          this.iconsole.log("from xPayerBillerIds success");
          return xPayBillerId;
        }
      }

      let params = {
        q: {
          bin_eq: data.account_number.substring(0, 8),
        },
      };

      let result = await this.xpayBillers(params);
      let rppsBiller = await this.prevalidateRppsBillersArray(
        data.account_number,
        result
      );
      if (rppsBiller) {
        this.iconsole.log("0.bin_eq 8 success");
        return rppsBiller;
      }

      params.q.bin_eq = data.account_number.substring(0, 6);
      result = await this.xpayBillers(params);
      rppsBiller = await this.prevalidateRppsBillersArray(
        data.account_number,
        result
      );
      if (rppsBiller) {
        this.iconsole.log("1.bin_eq 6 success");
        return rppsBiller;
      }

      params.q.bin_eq = data.account_number.substring(0, 4);
      result = await this.xpayBillers(params);
      rppsBiller = await this.prevalidateRppsBillersArray(
        data.account_number,
        result
      );
      if (rppsBiller) {
        this.iconsole.log("2.bin_eq 4 success");
        return rppsBiller;
      }

      params = {
        q: {
          country_eq: "USA",
          name_eq: data.vendor.name,
        },
      };

      result = await this.xpayBillers(params);
      rppsBiller = await this.prevalidateRppsBillersArray(
        data.account_number,
        result
      );
      if (rppsBiller) {
        this.iconsole.log("3.name_eq vendor.name success");
        return rppsBiller;
      }

      params = {
        q: {
          country_eq: "USA",
          name_cont: data.vendor.sname ? data.vendor.sname : data.vendor.name,
        },
      };

      if (data.vendor.biller_type) {
        params.q.biller_class_cont = data.vendor.biller_type;
      }
      result = await this.xpayBillers(params);
      rppsBiller = await this.prevalidateRppsBillersArray(
        data.account_number,
        result
      );
      if (rppsBiller) {
        this.iconsole.log("4.biller_class_cont success");
        return rppsBiller;
      }

      params = {
        q: {
          country_eq: "USA",
          name_cont: data.vendor.sname ? data.vendor.sname : data.vendor.name,
        },
      };
      result = await this.xpayBillers(params);
      rppsBiller = await this.prevalidateRppsBillersArray(
        data.account_number,
        result
      );
      if (rppsBiller) {
        this.iconsole.log("5.name_cont success");
        return rppsBiller;
      }

      if (data.vendor.prefix && data.vendor.prefix !== data.vendor.sname) {
        params = {
          q: {
            country_eq: "USA",
            name_cont: data.vendor.prefix,
          },
        };
        result = await this.xpayBillers(params);
        rppsBiller = await this.prevalidateRppsBillersArray(
          data.account_number,
          result
        );
        if (rppsBiller) {
          this.iconsole.log("6.name_cont prefix success");
          return rppsBiller;
        }
      }

      return null;
    } catch (error) {
      throw error;
    }
  }

  //billers/9bb09838-2b78-4bf2-bf81-b410593be8bb/rpps_billers
  xDataXPayBillers(xDataBillerId, params = {}) {
    return this.get("/billers/" + xDataBillerId + "/rpps_billers", params);
  }

  // xpayElectronicTransaction - With this endpoint you can create a new electronic transaction.
  xpayElectronicTransaction(content) {
    return this.post("/transactions", content);
  }

  // xpayCheckTransaction - With this endpoint you can create a new Check transaction.
  xpayCheckTransaction(content) {
    return this.post("/transactions", content);
  }

  // transactions - Returns the list of transactions that Arcus has processed for you
  transactions(params) {
    return this.get("/transactions", params);
  }

  // getTransaction - Returns the specific transactions by id
  getTransaction(transactionId) {
    return this.get("/transactions/" + transactionId);
  }

  // deleteTransaction - Deletes a specific transaction
  //  It’s only possible to delete a transaction if the processing of the transaction's payment hasn’t started, i.e., if it’s still in the initialized state.
  deleteTransaction(transactionId) {
    return this.delete("/transactions/" + transactionId);
  }

  // updateTransaction - allows you to update the amount of an on_hold electronic transaction and/or change its status to initialized, so that it can be processed.
  updateTransaction(transactionId, params) {
    return this.patch("/transactions/" + transactionId, params);
  }

  // determine which is the right biller: responses: { message: 'Account number is valid' } or { message: 'Account number is invalid' }
  async prevalidateTransaction(params) {
    try {
      var prevalidateResult = await this.get(
        "/transactions/prevalidate",
        params
      );
      this.iconsole.log("prevalidateResult::", prevalidateResult);
      if (
        prevalidateResult &&
        prevalidateResult.message &&
        prevalidateResult.message === "Account number is valid"
      ) {
        return true;
      }
      return false;
    } catch (error) {
      //throw error;
      return false;
    }
  }

  // getCheckTransaction - returns the details of a specific check transaction.
  getCheckTransaction(transactionId) {
    return this.get("/transactions/" + transactionId + "/check");
  }

  // getCheckTransactionPdf - generates the PDF file of a specific check transaction
  getCheckTransactionPdf(transactionId) {
    return this.get("/transactions/" + transactionId + "/check.pdf");
  }

  // addCheckAddress - allows you to save a new address to be used as a Sender or Receiver on a check.
  addCheckAddress(address) {
    return this.post("/addresses", address);
  }

  // getCheckAddresses - returns the addresses that have been created to be used as Sender or Receiver on your check transactions.
  getCheckAddresses() {
    return this.get("/addresses");
  }

  // getCheckAddress - Returns the details of a specific address
  getCheckAddress(addressId) {
    return this.get("/addresses/" + addressId);
  }

  // deleteAddress - Deletes a specific address, NOTE: only addresses that haven't been used in checks can be deleted
  deleteAddress(addressId) {
    return this.delete("/addresses/" + addressId);
  }

  // Request functions
  get(endpoint, params) {
    const contentMd5 = "";
    const queryParams = this.parameterize(params);
    const headers = this.generateHeaders(endpoint + queryParams, contentMd5);

    return this.request("GET", headers, this.apiHost + endpoint + queryParams);
  }

  post(endpoint, content) {
    const contentJson = this.json_encode(content);
    const contentMd5 = this.md5(contentJson);
    const headers = this.generateHeaders(endpoint, contentMd5);

    return this.request("POST", headers, this.apiHost + endpoint, contentJson);
  }

  patch(endpoint, content) {
    const contentJson = this.json_encode(content);
    const contentMd5 = this.md5(contentJson);
    const headers = this.generateHeaders(endpoint, contentMd5);

    return this.request("PATCH", headers, this.apiHost + endpoint, contentJson);
  }

  delete(endpoint, params) {
    const contentMd5 = "";
    const queryParams = this.parameterize(params);
    const headers = this.generateHeaders(endpoint, contentMd5);

    return this.request(
      "DELETE",
      headers,
      this.apiHost + endpoint + queryParams
    );
  }

  authHash(endpoint, contentMd5, date) {
    let data = [CONTENT_TYPE, contentMd5, endpoint, date].join(",");

    return this.sha1(data);
  }

  generateHeaders(endpoint, contentMd5) {
    let date = this.now();
    let hash = this.authHash(endpoint, contentMd5, date);

    return {
      "Content-Type": CONTENT_TYPE,
      Accept: ACCEPT,
      Date: date,
      "Content-MD5": contentMd5,
      Authorization: "APIAuth " + this.apiKey + ":" + hash,
    };
  }

  json_encode(content) {
    return JSON.stringify(content);
  }

  async json_decode(content) {
    try {
      return JSON.parse(content);
    } catch (error) {
      //throw "Invalid Json response data";
      return {};
    }
  }

  md5(content) {
    return crypto.createHash("md5").update(content).digest("base64");
  }

  now() {
    return new Date().toUTCString();
  }

  encode(queryObj, nesting = "") {
    let queryString = "";
    //console.log("nesting:",nesting);

    const pairs = Object.entries(queryObj).map(([key, val]) => {
      // Handle a second base case where the value to encode is an array
      if (Array.isArray(val)) {
        return val
          .map((subVal) => [nesting + key, subVal].map(escape).join("="))
          .join("&");
      } else if (typeof val === "object") {
        return this.encode(val, nesting + `${key}`);
      } else {
        if (nesting) {
          return [nesting + "[" + key + "]", val].map(escape).join("=");
        } else {
          return [nesting + key, val].map(escape).join("=");
        }
      }
    });
    return pairs.join("&");
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

  async request(method, headers, requestUrl, content) {
    try {
      this.iconsole.log("request::", method, headers, requestUrl, content);
      var data = {
        xdata: 1,
      };
      if (
        requestUrl.includes("transactions") ||
        requestUrl.includes("/addresses")
      ) {
        data = {
          xpay: 1,
        };
      }

      if (!requestUrl.includes("billers")) {
        // xData billers and xpay rpps_billers
        await this.services.statscl.updateArcusStats(data);
      }

      return await this.sendRequest(method, headers, requestUrl, content);
    } catch (error) {
      throw error;
    }
  }

  sendRequest(method, headers, requestUrl, content) {
    return new Promise((resolve, reject) => {
      this.iconsole.log("request::", method, headers, requestUrl, content);
      let options = url.parse(requestUrl);
      var proto = https;

      options.method = method;
      options.headers = headers;
      if (this.useProxy) {
        proto = http;
        let proxy = url.parse(process.env.ARCUS_API_PROXY_HOST);
        let target = url.parse(requestUrl);
        options = {
          method: method,
          hostname: proxy.hostname,
          port: proxy.port,
          path: target.href,
          headers: headers,
        };

        headers["Proxy-Authorization"] =
          "Basic " + Buffer.from(proxy.auth).toString("base64");
        headers["Host"] = target.hostname;
      }

      this.iconsole.log("request options::", options);

      let req = proto.request(options, (res) => {
        let body = "";

        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        //res.on('end', () => resolve({body: this.json_decode(body), req: res.req, res: res}));
        res.on("end", () => resolve(this.json_decode(body)));
      });

      req.on("error", reject);

      if (typeof content !== "undefined") {
        req.write(content);
      }

      req.end();
    });
  }

  sha1(content) {
    return crypto
      .createHmac("sha1", this.secret)
      .update(content)
      .digest("base64");
  }
}

module.exports = arcusClass;
