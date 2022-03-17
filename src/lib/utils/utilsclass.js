"use strict";

const moment = require("moment");
const momentTZ = require("moment-timezone");
const AWS = require("aws-sdk");
AWS.config.update({region: "us-east-1"});
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

class utilsclass {
  constructor(args) {
    this.iconsole = args.iconsole;
    this.services = args.services;
    this.services.addService("utils", this);
  }

  toFixedNumber(num) {
    return (parseFloat(parseFloat(num).toFixed(2)) * 100) / 100;
  }

  recursiveEmptyStringtoNull(input) {
    if (typeof input == "string") {
      input = input.trim().length === 0 ? null : input.trim();
    } else if (input && typeof input == "object") {
      Object.keys(input).forEach((param) => {
        input[param] = this.recursiveEmptyStringtoNull(input[param]);
      });
    }

    return input;
  }

  // "(602) 795-2289" to +16027952289
  normilizePhoneNumber(number) {
    var res = parseInt(number.replace(/[^0-9]/g, ""), 10).toString();

    if (res[0] !== "1") {
      res = "1" + res;
    }

    res = "+" + res;
    return res;
  }

  titleCase(str) {
    if (str && str.trim()) {
      let splitStr = str.trim().toLowerCase().split(" ");
      for (let i = 0; i < splitStr.length; i++) {
        splitStr[i] =
          splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
      }
      return splitStr.join(" ");
    } else {
      return "";
    }
  }

  validateEmail(email) {
    var re =
      /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  }

  updateObject(input, outputObject, ruls) {
    var numChanges = 0;
    ruls = ruls ? ruls : {};
    var action = ruls.action ? ruls.action : "disallow";
    input = this.recursiveEmptyStringtoNull(input);
    Object.keys(outputObject).forEach((param) => {
      if (action === "allow") {
        if (
          ruls.options &&
          Array.isArray(ruls.options) &&
          ruls.options.length
        ) {
          if (input[param] !== undefined && ruls.options.indexOf(param) > -1) {
            if (typeof outputObject[param] == "object" && outputObject[param]) {
              if (Array.isArray(input[param])) {
                outputObject[param] = input[param];
                numChanges++;
              } else {
                numChanges += this.updateObject(
                  input[param],
                  outputObject[param]
                );
              }
            } else {
              outputObject[param] = input[param];
              numChanges++;
            }
          }
        }
      } else if (action === "disallow") {
        if (
          ruls.options &&
          Array.isArray(ruls.options) &&
          ruls.options.length
        ) {
          if (
            input[param] !== undefined &&
            ruls.options.indexOf(param) === -1
          ) {
            if (typeof outputObject[param] == "object" && outputObject[param]) {
              if (Array.isArray(input[param])) {
                outputObject[param] = input[param];
                numChanges++;
              } else {
                numChanges += this.updateObject(
                  input[param],
                  outputObject[param]
                );
              }
            } else {
              outputObject[param] = input[param];
              numChanges++;
            }
          }
        } else {
          if (input[param] !== undefined) {
            if (typeof outputObject[param] == "object" && outputObject[param]) {
              if (Array.isArray(input[param])) {
                outputObject[param] = input[param];
                numChanges++;
              } else {
                numChanges += this.updateObject(
                  input[param],
                  outputObject[param]
                );
              }
            } else {
              outputObject[param] = input[param];
              numChanges++;
            }
          }
        }
      }
    });

    return numChanges;
  }

  shuffle(array) {
    var tmp, current, top = array.length;
    if (top) while (--top) {
      current = Math.floor(Math.random() * (top + 1));
      tmp = array[current];
      array[current] = array[top];
      array[top] = tmp;
    }
    return array;
  }

  generateRandomList(n) {
    for (var a = [], i = 0; i < n; ++i) a[i] = i;
    a = this.shuffle(a);
    return a;
  }

  // epochToSpecificTimezone(timeEpoch, offset){
  //   //utc - 8 = pst
  //   var d = new Date(timeEpoch);
  //   var utc = d.getTime() + (d.getTimezoneOffset() * 60000);  //This converts to UTC 00:00
  //   var nd = new Date(utc + (3600000*offset));
  //   return nd.toLocaleString();
  // }

  epochToDate(epochStamp) { //seconds
    const date = new Date(0);
    date.setUTCSeconds(epochStamp);
    return date;
  }

  dateToEpoch(date) {
    return date.setUTCHours(0, 0, 0, 0) / 1000;
  }

  nextDateFromEpoch(epochStamp) {
    const startDate = this.epochToDate(epochStamp);
    const endDate = new Date(startDate.getTime() + ((24 * 60 * 60) - 1) * 1000);  //23.59.59
    return {startDate, endDate};
  }

  getTimeofDay() {  //PST zone
    var start = moment.tz('utc').startOf('day').toISOString();
    var end = moment.tz('utc').endOf('day').toISOString();
    // var start = moment.tz('America/Los_Angeles').startOf('day').toISOString();
    // var end = moment.tz('America/Los_Angeles').endOf('day').toISOString();
    return {start, end};
  }

}

module.exports = utilsclass;
