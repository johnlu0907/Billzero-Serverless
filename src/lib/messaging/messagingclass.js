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
        from: {name: params.fromName, email: params.fromEmail},
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
        this.iconsole.log({to: to, message: message, from: from});
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

  notifyUserByObject(user, message, data = null) {
    try {
      if (
        user.devTokens &&
        user.devTokens.length &&
        user.settings &&
        user.settings.push !== undefined &&
        user.settings.push === true
      ) {
        let pushObj = {
          title: "BillZero",
          body: message,
        };
        let pushResult = this.sendPush(user.devTokens, pushObj, data);
        this.iconsole.log(pushResult);
      } else if (user.phone) {
        let smsResult = this.sendSMS(user.phone, message);
        this.iconsole.log(smsResult);
      } else {
        throw "failed to notify user";
      }
      return {status: "success", info: "user notified"};
    } catch (error) {
      this.iconsole.log(error);
      throw error;
    }
  }

  async notifyUser(id, message, data = null) {
    try {
      const filteredNumbers = ['6027952289', '2342218202', '5304752777', '3343283680', '7608842275'];

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
        console.log('dev token Push');
        let pushObj = {
          title: "BillZero",
          body: message,
        };
        let pushResult = await this.sendPush(user.devTokens, pushObj, data);
        this.iconsole.log(pushResult);
      } else if (user.phone) {
        for (const _filterNumber of filteredNumbers) {
          if (user.phone.indexOf(_filterNumber) !== -1) {
            console.log(`messagging - This is filtering Phone ${message}`);
            let smsResult = await this.sendSMS(user.phone, message);
            return {status: "success", info: "user notified"};
          }
        }
        const inMyPool = await this.services.dbPlay.checkInMyPool(id);
        if (!inMyPool) {
          console.log(`Not phone, not in my POOL ${id}`);
          return;
        }
        console.log(`messagging - I am in your pool ${message}`);
        let smsResult = await this.sendSMS('6027952289', message);
        // this.iconsole.log(smsResult);
        return {status: "success", info: "user notified"};
      } else {
        throw "failed to notify user";
      }
      return {status: "success", info: "user notified"};
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

      return {status: "success", info: "task completed", id: task.id};
    } catch (error) {
      this.iconsole.log(error);
      return {status: "fail", info: error, id: task.id};
      //throw error;
    }
  }

  async notifyUserByImpetus(stage, payload) {
    let impetusPayload = await this.services.dbcl.getImpetusEntry(stage);
    let msg;
    if (stage === 'play-uv-pending-payer') {
      // to Payer - YOU'VE ALMOST WON! ADD a CC or BILL for @[PAYEEUSERNAME] to WIN (VERIFICATION)
      let {payeeId, payerId, payee} = payload;
      if (!payee) {
        payee = await this.services.dbcl.getUser(payeeId);
      }
      msg = impetusPayload.replace('[PAYEEUSERNAME]', `${payee.userName}`);
      await this.notifyUser(payerId, msg);
    } else if (stage === 'play-uv-pending-payee') {
      // to Payee - YOU WON a UV.. almost.. Tell them to ADD a CC or BILL to WIN
      const {payeeId} = payload;
      msg = impetusPayload;
      await this.notifyUser(payeeId, msg);

    } else if (stage === 'play-uv-validated-payer') {
      // to Payer - YOU W1N + HELPED @[PAYEEUSERNAME] WN TODAY
      let {payeeId, payerId, payee} = payload;
      if (!payee) {
        payee = await this.services.dbcl.getUser(payeeId);
      }
      msg = impetusPayload.replace('[PAYEEUSERNAME]', `${payee.userName}`);
      await this.notifyUser(payerId, msg);

    } else if (stage === 'play-pay-payee') {
      let {payeeId, payerId, expectProb, payer} = payload;
      // to Payee - YOU WON a PAY! [PAYERUSERNAME] INCREASED your PROBABILITY [PROB]%
      if (!payer) {
        payer = await this.services.dbcl.getUser(payerId);
      }
      msg = impetusPayload.replace('[PAYERUSERNAME]', `${payer.userName}`).replace('[PROB]', `${expectProb}`);
      await this.notifyUser(payeeId, msg);
    } else if (stage === 'play-ending') {
      const {pot, value} = payload;
      impetusPayload = impetusPayload.replace('$[POT]', `${pot}$`);
      let notificationPromise = [];
      for (let i = 0; i < value.length; i++) {
//Game Ending.. POT = $[POT] You have $[PROB] to Win + LAST CHANCE to beat $[@NEXTHIGHESTPROBUSERINPOOL] $[COMPETINGUSERPROB]
        let msg = impetusPayload;
        msg = msg.replace('$[PROB]', `${Math.round(value[i].probability)}%`);
        if (i < value.length - 1) {
          let user = await this.services.dbcl.getUser(value[i].userid);
          msg = msg.replace('[NEXTHIGHESTPROBUSERINPOOL]', `${user.userName}`);
          msg = msg.replace('[COMPETINGUSERPROB]', `${value[i + 1].probability}`);
        } else {
          msg = msg.replace('[NEXTHIGHESTPROBUSERINPOOL]', 'nobody');
          msg = msg.replace('[COMPETINGUSERPROB]', '0');
        }
        notificationPromise.push(new Promise((resolve, reject) => {
          this.services.msgcl.notifyUser(value[i].userid, msg).then((res) => {
            resolve();
          });
        }));
      }
      await Promise.all(notificationPromise);

    } else if (stage === 'play-start') {
      const {value} = payload;
      let notificationPromise = [];
      for (let i = 0; i < value.length; i++) {
//GAME STARTING... YOU HAVE $[PROB] to WIN TODAY nGet PAYs to BEAT @[NEXTHIGHESTPROBUSERINPOOL] w [COMPETINGUSERPROB]% to WIN
        let msg = impetusPayload;
        msg = msg.replace('$[PROB]', `${Math.round(value[i].probability)}%`);
        if (i < value.length - 1) {
          let user = await this.services.dbcl.getUser(value[i + 1].userid);
          msg = msg.replace('[NEXTHIGHESTPROBUSERINPOOL]', `${user.userName}`);
          msg = msg.replace('[COMPETINGUSERPROB]', `${value[i + 1].probability}`);
        } else {
          msg = msg.replace('[NEXTHIGHESTPROBUSERINPOOL]', 'nobody');
          msg = msg.replace('[COMPETINGUSERPROB]', '0');
        }
        notificationPromise.push(new Promise((resolve, reject) => {
          this.services.msgcl.notifyUser(value[i].userid, msg).then((res) => {
            resolve();
          });
        }));
      }
      await Promise.all(notificationPromise);
    } else if (stage === 'play-pay-pool') {
      //	[USERNAMEPAYWINNER] GOT a $[PAYAMOUNT] PAY + is NOW #[USERRANK] to WIN
      const {payerId, payeeId, paymentAmount, value} = payload;
      const rankOfPayee = this.services.dbPlay.getRankOfUser(payeeId, value);
      const payee = await this.services.dbcl.getUser(payeeId);
      msg = impetusPayload.replace('[USERNAMEPAYWINNER]', `${payee.userName}`);
      msg = msg.replace('[PAYAMOUNT]', `${paymentAmount}`);
      msg = msg.replace('[USERRANK]', `${rankOfPayee}`);
      let notificationPromise = [];
      let payeeProb = 0.0;
      for (let i = 0; i < value.length; i++) {
        notificationPromise.push(new Promise((resolve, reject) => {
          this.services.msgcl.notifyUser(value[i].userid, msg).then((res) => {
            resolve();
          });
        }));
        if (payeeId === value[i].userid) {
          payeeProb = value[i].probability
        }
      }

      let impetusToPayee = await this.services.dbcl.getImpetusEntry('play-pay-payee');
      //YOU W0N [PAYAMOUNT] PAY by [PAYERUSERNAME] INCREASED your PROBABILITY [PROB]
      const payer = await this.services.dbcl.getUser(payerId);
      impetusToPayee = impetusToPayee.replace('[PAYAMOUNT]', `${paymentAmount}`);
      impetusToPayee = impetusToPayee.replace('[PAYERUSERNAME]', `${payer.userName}`);
      impetusToPayee = impetusToPayee.replace('[PROB]', `${payeeProb}%`);
      notificationPromise.push(new Promise((resolve, reject) => {
        this.services.msgcl.notifyUser(payeeId, impetusToPayee).then((res) => {
          resolve();
        });
      }));

      let impetusToPayer = await this.services.dbcl.getImpetusEntry('play-pay-payer');
      //YOU WON KARMA from [PAYEEUSERNAME] YOUR KARMA: [KARMA]
      impetusToPayer = impetusToPayer.replace('[PAYEEUSERNAME]', payee.userName);
      notificationPromise.push(new Promise((resolve, reject) => {
        this.services.msgcl.notifyUser(payerId, impetusToPayer).then((res) => {
          resolve();
        });
      }));

      await Promise.all(notificationPromise);
    } else if (stage === 'play-uv-pool') {
      // play-uv-pool	[USERNAMEUVWINNER] WON a UV + is NOW #[USERRANK] to WIN
      const {payerId, payeeId, value} = payload;
      const rankOfPayee = this.services.dbPlay.getRankOfUser(payeeId, value);
      const payee = await this.services.dbcl.getUser(payeeId);
      msg = impetusPayload.replace('[USERNAMEUVWINNER]', `${payee.userName}`);
      msg = msg.replace('[USERRANK]', `${rankOfPayee}`);
      let notificationPromise = [];
      for (let i = 0; i < value.length; i++) {
        notificationPromise.push(new Promise((resolve, reject) => {
          this.services.msgcl.notifyUser(value[i].userid, msg).then((res) => {
            resolve();
          });
        }));
      }
      await Promise.all(notificationPromise);
    }
    return msg;
  }
}

module.exports = messagingClass;
