const twilio = require("twilio");
const sgMail = require("@sendgrid/mail");
const path = require("path");
var admin = require("firebase-admin");
var serviceAccount = require(path.resolve(
  process.cwd(),
  "./data/firebase/" + process.env.NODE_ENV + "/billzeroapp.json"
));
var twiliocl = new twilio(process.env.TWILIOSID, process.env.TWILIOTOKEN);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
sgMail.setSubstitutionWrappers("{{", "}}");

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DB_ENDPOINT,
  });
}

class messagingClass {
  constructor(args) {
    for (var parameter in args) {
      this[parameter] = args[parameter];
    }
    this.services.addService("msgcl", this);
  }

  async sendEmail(params) {
    try {
      this.iconsole.log(params);
      params.fromName = params.fromName
        ? params.fromName
        : process.env.SENDGRID_FROM_NAME;
      params.fromEmail = params.fromEmail
        ? params.fromEmail
        : process.env.SENDGRID_FROM_EMAIL;
      var emailParam = {
        to: params.toEmail,
        from: { name: params.fromName, email: params.fromEmail },
        subject: params.subject,
        html: params.content,
        substitutions: {},
      };

      if (params.templateId) {
        emailParam.templateId = params.templateId;
        if (params.templateSubstitutions) {
          params.templateSubstitutions.forEach((item) => {
            item.name = item.name.replace("{{", "").replace("}}", "");
            emailParam.substitutions[item.name] = item.value;
          });
        }
      }
      this.iconsole.log("emailParam:", emailParam);
      return await sgMail.send(emailParam);
    } catch (error) {
      this.iconsole.log("Sendgrid Error:", JSON.stringify(error));
      throw error;
    }
  }

  async sendSMS(to, message, from) {
    try {
      try {
        from = from ? from : process.env.TWILIOPHONE;
        this.iconsole.log({ to: to, message: message, from: from });
        var message = await twiliocl.messages.create({
          body: message,
          to: to,
          from: from,
        });

        this.iconsole.log(message);

        return {
          status: "sms sent",
        };
      } catch (error) {
        this.iconsole.log(error);
        return {
          status: "sms was not sent:" + error,
        };
      }
    } catch (error) {
      this.iconsole.log(error);
      throw error;
    }
  }

  // https://firebase.google.com/docs/auth/admin/create-custom-tokens
  async createFirebaseToken(uid, additionalClaims) {
    try {
      this.iconsole.log(uid, additionalClaims);
      var customToken = null;
      if (additionalClaims) {
        customToken = await admin
          .auth()
          .createCustomToken(uid, additionalClaims);
      } else {
        customToken = await admin.auth().createCustomToken(uid);
      }
      this.iconsole.log("firebaseCustomToken::", customToken);

      return {
        firebaseCustomToken: customToken,
      };
    } catch (error) {
      this.iconsole.log("Error creating custom token:", error);
      throw error;
    }
  }

  // https://firebase.google.com/docs/cloud-messaging/send-message
  // https://firebase.google.com/docs/reference/admin/node/admin.messaging.MulticastMessage
  // devTokens[{id:"123",token:"5678"},{id:"456",token:"890"}]
  async sendPush(devTokens, notification, data) {
    try {
      this.iconsole.log(devTokens, notification, data);
      const registrationTokens = devTokens.map((x) => x.token);
      const message = {
        tokens: registrationTokens,
      };

      if (notification) {
        message.notification = notification;
      }

      if (data) {
        message.data = data;
      }

      var failedTokens = [];
      var response = await admin.messaging().sendMulticast(message);
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(registrationTokens[idx]);
          }
        });
        this.iconsole.log(
          "Firebase List of tokens that caused failures: " + failedTokens
        );
      }
      return {
        status: "push notification sent",
        failedTokens: failedTokens,
      };
    } catch (error) {
      this.iconsole.log(error);
      throw error;
    }
  }

  async notifyUser(id, message, data = null) {
    try {
      this.iconsole.log(id, message);
      let user = await this.services.dbcl.getUser(id);
      // if user.settings
      if (
        user.devTokens &&
        user.devTokens.length &&
        user.settings &&
        user.settings.push !== undefined &&
        user.settings.push === true
      ) {
        let pushObj = {
          title: "BillZero Notification",
          body: message,
        };
        let pushResult = await this.sendPush(user.devTokens, pushObj, data);
        this.iconsole.log(pushResult);
      } else if (user.phone) {
        let smsResult = await this.sendSMS(user.phone, message);
        this.iconsole.log(smsResult);
      } else {
        throw "failed to notify user";
      }
      return { status: "success", info: "user notified" };
    } catch (error) {
      this.iconsole.log(error);
      throw error;
    }
  }

  /*   var task1 = {
      to:"msgcl",
      owner:"billcl",
      ttl:moment(new Date(bill.due_date)).add(1,"month").subtract(10,"days").valueOf()/1000,
      event:{
        action:"sendSMS", 
        to:"+18188506642",
        message:"Your BillZerro bill is due after 10 days"
      },
      recurring:"true",
      recurringType:"month",
      recurringAfter:1
  } 
  
  var task2 = {
      to:"msgcl",
      owner:"billcl",
      ttl:moment(new Date(bill.due_date)).add(1,"month").subtract(10,"days").valueOf()/1000,
      event:{
        action:"sendPush",
        devTokens:[{id:"123",token:"5555"}],
        message:"Your BillZerro bill is due after 10 days"
      },
      recurring:"true",
      recurringType:"month",
      recurringAfter:1
  }

  var task3 = {
      to:"msgcl",
      owner:"billcl",
      ttl:moment(new Date(bill.due_date)).add(1,"month").subtract(10,"days").valueOf()/1000,
      event:{
        action:"notifyUser",
        id:"cd1bd95d-4ae1-4615-99e3-48e522543225",
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
        task.event.action === "sendSMS" &&
        task.event.to &&
        task.event.message
      ) {
        await this.sendSMS(task.event.to, task.event.message);
      } else if (
        task.event.action === "sendPush" &&
        task.event.devTokens &&
        task.event.devTokens.length &&
        task.event.message
      ) {
        await this.sendPush(task.event.devTokens, task.event.message);
      } else if (
        task.event.action === "notifyUser" &&
        task.event.id &&
        task.event.message
      ) {
        await this.notifyUser(task.event.id, task.event.message);
      } else {
        throw "Invalid task";
      }

      return { status: "success", info: "task completed", id: task.id };
    } catch (error) {
      this.iconsole.log(error);
      return { status: "fail", info: error, id: task.id };
      //throw error;
    }
  }
}

module.exports = messagingClass;
