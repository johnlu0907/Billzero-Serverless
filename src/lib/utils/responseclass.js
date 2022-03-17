"use strict";

class responseclass {
  constructor() {
    var type = "application/json"; // 'text/html'; charset=UTF-8' , 'application/json', 'image/gif', etc ...
    this.OK = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS, GET, POST, PUT, DELETE",
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Allow-Headers":
          "X-Requested-With, Content-Type, X-Amz-Date, Authorization, X-Amz-Security-Token, bz-api-token, Accept, Origin",
        "Content-Type": type,
      },
      body: {
        code: 200,
        status: "success",
        message: "operation was successful",
        payload: [],
      },
    };

    this.ERROR = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS, GET, POST, PUT, DELETE",
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Allow-Headers":
          "X-Requested-With, Content-Type, X-Amz-Date, Authorization, X-Amz-Security-Token, bz-api-token, Accept, Origin",
        "Content-Type": type,
      },
      body: {
        code: 400,
        subcode: 400,
        status: "fail",
        message: "Something went wrong. Please try again.",
        payload: [],
      },
    };

    this.OPTIONS = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS, GET, POST, PUT, DELETE",
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Allow-Headers":
          "X-Requested-With, Content-Type, X-Amz-Date, Authorization, X-Amz-Security-Token, bz-api-token, Accept, Origin",
      },
    };

    this.errorMap = new Map();
    // 0 - 1000 General error
    this.errorMap.set("BadRequest", { subcode: 400, desc: "Bad Request" });
    this.errorMap.set("Unauthorized", { subcode: 401, desc: "Unauthorized" });
    this.errorMap.set("PaymentRequired", {
      subcode: 402,
      desc: "Payment Required",
    });
    this.errorMap.set("Forbidden", { subcode: 403, desc: "Forbidden" });
    this.errorMap.set("NotFound", { subcode: 404, desc: "Not Found" });
    this.errorMap.set("MethodNotAllowed", {
      subcode: 405,
      desc: "Method Not Allowed",
    });
    this.errorMap.set("NotAcceptable", {
      subcode: 406,
      desc: "Not Acceptable",
    });
    this.errorMap.set("RequestTimeout", {
      subcode: 408,
      desc: "Request Timeout",
    });
    this.errorMap.set("Conflict", { subcode: 409, desc: "Conflict" });

    // 1001 - 2000 - user error
    this.errorMap.set("EmailAlreadyInSystem", {
      subcode: 1001,
      desc: "Email already in use",
    });
    this.errorMap.set("InvalidUserName", {
      subcode: 1002,
      desc: "Invalid User Name",
    });
    this.errorMap.set("BadPassword", {
      subcode: 1003,
      desc: "Password length should be 8 characters or more",
    });
    this.errorMap.set("InvalidEmail", { subcode: 1004, desc: "Invalid email" });
    this.errorMap.set("InvalidPayload", {
      subcode: 1005,
      desc: "Invalid Payload",
    });
    this.errorMap.set("UserIsNotVerified", {
      subcode: 1006,
      desc: "The User Is Not Verified",
    });
    this.errorMap.set("UserPhoneIsNotSet", {
      subcode: 1007,
      desc: "The user phone is not set",
    });
    this.errorMap.set("payeeUserPhoneIsNotSet", {
      subcode: 1007,
      desc: "The payee user phone is not set",
    });
    this.errorMap.set("UserPhoneIsNotVerified", {
      subcode: 1008,
      desc: "The user phone is not verified",
    });
    this.errorMap.set("UserNameUnavailable", {
      subcode: 1009,
      desc: "The user name is unavailable",
    });
    this.errorMap.set("UserDobUnavailable", {
      subcode: 10010,
      desc: "The user date of birth is unavailable",
    });
    this.errorMap.set("payeeUserDobUnavailable", {
      subcode: 10011,
      desc: "The payee user date of birth is unavailable",
    });
    this.errorMap.set("payeeAddressUnavailable", {
      subcode: 10012,
      desc: "The payee address is unavailable",
    });
    this.errorMap.set("payeeUserFirstNameIsBlank", {
      subcode: 10013,
      desc: "The payee first name is blank",
    });
    this.errorMap.set("payeeUserLastNameIsBlank", {
      subcode: 10014,
      desc: "The payee last name is blank",
    });

    // 3001 - 4000 - Bill related errors
    this.errorMap.set("InvalidBillId", {
      subcode: 3001,
      desc: "Invalid bill Id",
    });
    this.errorMap.set("FailedToFindXPayBillerId", {
      subcode: 3002,
      desc: "Failed to find Biller Payment Id",
    });

    // 4001 - 5000 - Payment related errors
    this.errorMap.set("paymentMethodIsMissing", {
      subcode: 4001,
      desc: "Payment Method is missing",
    });
    this.errorMap.set("paymentFailed", {
      subcode: 4002,
      desc: "Payment Failed",
    });
  }

  success(payload) {
    if (payload) {
      this.OK.body.payload = payload;
    }
    if (this.OK.headers["Content-Type"] == "application/json") {
      this.OK.body = JSON.stringify(this.OK.body);
    } else {
      this.OK.body = this.OK.body.payload;
    }
    return this.OK;
  }

  fail(err) {
    if (err) {
      if (this.errorMap.has(err)) {
        let errObj = this.errorMap.get(err);
        this.ERROR.body.subcode = errObj.subcode;
        this.ERROR.body.message = errObj.desc;
      } else {
        this.ERROR.body.message = err;
      }
    } else if (this.errorMap.has(this.ERROR.body.message)) {
      let errObj = this.errorMap.get(this.ERROR.body.message);
      this.ERROR.body.subcode = errObj.subcode;
      this.ERROR.body.message = errObj.desc;
    }
    if (this.ERROR.headers["Content-Type"] == "application/json") {
      this.ERROR.body = JSON.stringify(this.ERROR.body);
    } else {
      this.ERROR.body = this.ERROR.body.message;
    }
    return this.ERROR;
  }

  options() {
    return this.OPTIONS;
  }
}

module.exports = responseclass;
