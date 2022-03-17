"use strict";

const moment = require("moment");
const momenttimezone = require("moment-timezone");
const uuid = require("uuid");

class supportClass {
  constructor(args) {
    for (var parameter in args) {
      this[parameter] = args[parameter];
    }
    this.services.addService("supportcl", this);
  }

  randomNumber(min = 1, max = 100) {
    return Math.floor(Math.random() * max) + min;
  }

  createSupportTicketObject(data) {
    return {
      id: uuid.v4(),
      uid: data.uid ? data.uid : "undefined",
      userName: data.userName ? data.userName : null,
      firstName: data.firstName ? data.firstName : null,
      lastName: data.lastName ? data.lastName : null,
      email: data.email ? data.email : null,
      subject: data.subject ? data.subject : null,
      profileImage: data.profileImage ? data.profileImage : null,
      Caller: data.Caller ? data.Caller : null,
      RecordingUrl: data.RecordingUrl ? data.RecordingUrl : null,
      type: data.RecordingUrl ? "voice" : "text",
      TranscriptionText: data.TranscriptionText ? data.TranscriptionText : null,
      message: data.message ? data.message : null,
      answer: data.answer ? data.answer : null,
      source: data.source ? data.source : data.RecordingUrl ? "ivr" : "web",
      history: [],
      rawData: data,
    };
  }

  async addSupportTicket(data) {
    try {
      var supportObj = this.createSupportTicketObject(data);
      if (supportObj.Caller) {
        let res = await this.services.dbcl.getUserByPhone(supportObj.Caller);
        if (res.length) {
          let user = res[0];
          supportObj.uid = user.id;
          supportObj.userName = user.userName;
          supportObj.firstName = user.firstName;
          supportObj.lastName = user.lastName;
          supportObj.email = user.email;
          supportObj.profileImage = user.profileImage;
        }
      }

      if (supportObj.message) {
        supportObj.history.push({
          message: data.message,
          subject: data.subject ? data.subject : null,
          who: "user", // "support" if user role==="admin"
          uid: supportObj.uid,
          timestamp: moment().tz(process.env.DEFAULT_TIMEZONE).format(),
        });
      }

      supportObj = this.services.utils.recursiveEmptyStringtoNull(supportObj);
      if (
        supportObj.email &&
        !this.services.utils.validateEmail(supportObj.email)
      ) {
        throw "InvalidEmail";
      }
      return await this.services.dbcl.putSupportTicket(supportObj);
    } catch (error) {
      throw error;
    }
  }

  async updateSupportTicket(data) {
    try {
      var supportObj = await this.services.dbcl.getSupportTicket(data.id);
      data.who = data.who ? data.who : "user";
      supportObj.history = supportObj.history ? supportObj.history : [];
      let historyObj = {
        message: data.message ? data.message : data.content,
        subject: null,
        who: data.who,
        uid: data.uid ? data.uid : null,
        timestamp: moment().tz(process.env.DEFAULT_TIMEZONE).format(),
      };

      if (data.who === "support" && supportObj.uid) {
        let supportUser = await this.services.dbcl.getUser(supportObj.uid);
        if (supportUser.phone) {
          await this.services.msgcl.sendSMS(
            supportUser.phone,
            historyObj.message
          );
        }
      }

      if (data.who === "user") {
        supportObj.message = data.message;
        supportObj.answer = null;
      } else {
        supportObj.answer = data.answer
          ? data.answer
          : {
              subject: data.subject ? data.subject : "Re: Response",
              body: data.content ? data.content : data.message,
            };
        historyObj.subject = data.subject ? data.subject : "Re: Response";
      }

      supportObj.history.push(historyObj);

      supportObj = this.services.utils.recursiveEmptyStringtoNull(supportObj);
      return await this.services.dbcl.putSupportTicket(supportObj);
    } catch (error) {
      throw error;
    }
  }

  async getSupportTicketsBetween(data = {}) {
    try {
      data.type = data.type === "text" ? "text" : "voice";
      data.start = data.start
        ? moment(new Date(data.start)).utc().format()
        : moment().subtract(120, "days").utc().format();
      data.end = data.end
        ? moment(new Date(data.end)).utc().format()
        : moment().utc().format();

      return await this.services.dbcl.getSupportTicketsBetween(
        data.type,
        data.start,
        data.end
      );
    } catch (error) {
      throw error;
    }
  }

  async getSupportTicket(data) {
    try {
      if (data && data.id) {
        return await this.services.dbcl.getSupportTicket(data.id);
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async getUserSupportTickets(uid) {
    try {
      return await this.services.dbcl.getUserSupportTickets(uid);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = supportClass;
