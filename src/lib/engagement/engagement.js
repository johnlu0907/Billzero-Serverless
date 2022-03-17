"use strict";

const uuid = require("uuid");
const AWS = require("aws-sdk");
const moment = require("moment-timezone");
const clearTable = require("../db/dbutil");
AWS.config.update({region: "us-east-1"});
const dynamoDb = new AWS.DynamoDB.DocumentClient();


class Engagement {
  constructor(args) {
    for (var parameter in args) {
      this[parameter] = args[parameter];
    }
    this.services.addService("engagementCL", this);
    this.secret = process.env.JWTSECRET;

    this.engagementTable = process.env.ENGAGEMENTTABLE;
    this.engagementParentTimeIndex = 'engagement-parentId-time-index';
    // this.uvUserIdViewerIdIndex = 'uv-userid-viewerId-index';
    // this.userIdViewAtIndex = 'uv-userid-viewAt-index';
  }

  async putNewEngagement(payload) {
    const timeStamp = new Date().toISOString();
    const {parentId, impetus, poolId, result, userId, userName} = payload;
    const newEngagement = {
      id: uuid.v4(),
      parentId: parentId,
      impetus: impetus,
      poolId: poolId,
      result: result,
      time: timeStamp,
      userId: userId,
      userName: userName
    };

    const putParams = {
      TableName: this.engagementTable,
      Item: newEngagement
    };
    await dynamoDb.put(putParams).promise();
    return newEngagement;
  }

  async newEngagementByNewGame(payload) {
    const {value, poolId, playId} = payload;
    let impetus = `Pool Created ${poolId}`;
    const newPoolEngage = await this.putNewEngagement({
      impetus, poolId, result: 'Game Start'
    });

    let impetusPayload = await this.services.dbcl.getImpetusEntry('play-start');

    let promisesEngagement = [];
    for (let i = 0; i < value.length; i ++) {
      // GAME STARTING... \n\nYOU HAVE $[PROB] to WIN TODAY \n\nGet PAYs to BEAT @[NEXTHIGHESTPROBUSERINPOOL] w [COMPETINGUSERPROB]% to WIN
      // msg = msg + `${bill.userid} 's probability is ${bill.prob}` + '\n';
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

      promisesEngagement.push(new Promise((resolve, reject) => {
        this.putNewEngagement({
          userId: value[i].userid,
          impetus: msg,
          poolId: poolId,
          parentId: newPoolEngage.id,
          result: ''
        }).then((res) => {
          resolve();
        })
      }));
    }
    await Promise.all(promisesEngagement);
  }

  async newEngagementByPay(payload) {

    const {poolId, payerId, payeeId, paymentAmount, value} = payload;
    try {
      const payee = await this.services.dbcl.getUser(payeeId);
      const payer = await this.services.dbcl.getUser(payerId);
      const impetus = `${payer.userName} > paid ${payee.userName} ${paymentAmount}$`;
      const engagePay = await this.putNewEngagement({
        impetus, poolId, userId: payeeId, result: '', userName: payee.userName
      });

      let impetusPayload = await this.services.dbcl.getImpetusEntry('play-pay-pool');
      //	[USERNAMEPAYWINNER] GOT a $[PAYAMOUNT] PAY + is NOW #[USERRANK] to WIN
      const rankOfPayee = this.services.dbPlay.getRankOfUser(payeeId, value);
      let msg = impetusPayload.replace('[USERNAMEPAYWINNER]', `${payee.userName}`);
      msg = msg.replace('[PAYAMOUNT]', `${paymentAmount}`);
      msg = msg.replace('[USERRANK]', `${rankOfPayee}`);
      let promises = [];
      let payeeProb = 0.0;
      for (let i = 0; i < value.length; i++) {
        if (payeeId === value[i].userid) {
          payeeProb = value[i].probability
          break;
        }
      }
      promises.push(this.putNewEngagement({
        impetus: msg,
        poolId, userId: payeeId, result: 'POT INCREMENT', userName: payee.userName,
        parentId: engagePay.id
      }));

      let impetusToPayee = await this.services.dbcl.getImpetusEntry('play-pay-payee');
      //YOU W0N [PAYAMOUNT] PAY by [PAYERUSERNAME] INCREASED your PROBABILITY [PROB]
      impetusToPayee = impetusToPayee.replace('[PAYAMOUNT]', `${paymentAmount}`);
      impetusToPayee = impetusToPayee.replace('[PAYERUSERNAME]', `${payer.userName}`);
      impetusToPayee = impetusToPayee.replace('[PROB]', `${payeeProb}%`);

      promises.push(this.putNewEngagement({
        impetus: impetusToPayee,
        poolId, userId: payeeId, result: 'POT INCREMENT', userName: payee.userName,
        parentId: engagePay.id
      }));

      let impetusToPayer = await this.services.dbcl.getImpetusEntry('play-pay-payer');
      //YOU WON KARMA from [PAYEEUSERNAME] YOUR KARMA: [KARMA]
      impetusToPayer = impetusToPayer.replace('[PAYEEUSERNAME]', payee.userName);
        // promises.push(this.putNewEngagement({
        //   impetus: impetusToPayer,
        //   poolId, userId: payeeId, result: 'POT INCREMENT', userName: payee.userName,
        //   parentId: engagePay.id
        // }));
      await Promise.all(promises);
    } catch (e) {
      console.log(e);
    }
  }
  async newEngagementByUVV(payload) {
    const {poolId, userId, viewerId, UVVType} = payload;
    const user = await this.services.dbcl.getUser(userId);
    const viewer = await this.services.dbcl.getUser(viewerId);
    let impetus
    if (UVVType === 'newCC') {
      impetus = `${viewer.userName} > added CC`;
    } else if (UVVType === 'newBill') {
      impetus = `${viewer.userName} > added Bill`;
    }
    else if (UVVType === 'newUV') {
      impetus = `${viewer.userName} > viewed ${user.userName}`;
    }

    try {
      const uvv = await this.putNewEngagement({
        impetus, poolId, userId, result: 'UVV', userName: user.userName
      });
      await this.putNewEngagement({
        impetus: `${user.userName}'s UV Validated`,
        poolId, userId, result: 'UVV', userName: user.userName,
        parentId: uvv.id
      });
      const poolUsers = await this.services.dbPlay.getUsersIdsInPool(poolId);
      let promises = [];
      let i = 1;
      for (const _poolUserId of poolUsers) {
        if (_poolUserId !== userId) {
          const _poolUser = await this.services.dbcl.getUser(_poolUserId);
          impetus = `${user.userName} just got a UV! YOU CAN TOO!`;
          promises.push(this.putNewEngagement({
            impetus: impetus,
            poolId, userId: _poolUserId, result: 'POT INCREMENT', userName: _poolUser.userName,
            parentId: uvv.id
          }));
          i++;
          // this is for test
          promises.push(this.services.msgcl.notifyUser(_poolUserId, impetus));
        }
      }
      impetus = `YOU WON a UV from @${viewer.userName}`;
      promises.push(this.putNewEngagement({
        impetus: impetus,
        poolId, userId: userId, result: 'UVV AWARDED', userName: user.userName,
        parentId: uvv.id
      }));

      promises.push(new Promise((resolve, reject) => {
        this.services.msgcl.notifyUserByImpetus('play-uv-validated-payer',
          {payerId: viewerId, payeeId: userId, payee: user}).then((res) => {
            resolve();
        })
      }));
      await Promise.all(promises);
      console.log('newEngagementByUVV finished');
      return uvv;
    } catch (err) {
      console.log('Sending ProcessCycle', err);
    }
    return null;
  }

  async newEngagementByUVU(payload) {
    const {poolId, userId, viewerId} = payload;
    const user = await this.services.dbcl.getUser(userId);
    const viewer = await this.services.dbcl.getUser(viewerId);
    let impetus = `${viewer.userName} > viewed ${user.userName}`;
    const uvu = await this.putNewEngagement({
      impetus, poolId, userId, result: 'UVU', userName: user.userName
    });
    try {

      impetus = await this.services.msgcl.notifyUserByImpetus('play-uv-pending-payer',
        {payerId: viewerId, payeeId: userId, payee: user, parentId: uvu.id});
      console.log('Sending Payer message by Impetus - newEngagementByUVU');
      await this.putNewEngagement({
        impetus, userId: viewerId, result: 'UVU', userName: viewer.userName,
        parentId: uvu.id
      });
    } catch (err) {
      console.log('Sending ProcessCycle', err);
    }

    try {
      impetus = await this.services.msgcl.notifyUserByImpetus('play-uv-pending-payee',
        {payerId: viewerId, payeeId: userId, parentId: uvu.id});
      console.log('Sending Payee message by Impetus - newEngagementByUVU');
      await this.putNewEngagement({
        impetus, userId, userName: user.userName, result: 'UV Unvalidated',
        parentId: uvu.id
      });
    } catch (err) {
      console.log('Sending ProcessCycle', err);
    }
  }

  getChildEngagement(event) {
    return new Promise((resolve, reject) => {
      const parentId = event.id;
      const queryParent = {
        TableName: this.engagementTable,
        KeyConditionExpression: "#parentId = :parentId",
        IndexName: this.engagementParentTimeIndex,
        ExpressionAttributeNames: {
          "#parentId": "parentId"
        },
        ExpressionAttributeValues: {
          ":parentId": parentId
        },
        ScanIndexForward: false
      };

      this.services.dbcl.queryTable(queryParent).then((groupRes) => {
        let newEngageGroup = []
        for (const item of groupRes.Items) {
          newEngageGroup.push(item);
        }
        const newItem = {event: event, child: newEngageGroup};
        resolve(newItem)
      })
    })
  }

  async getEngagement() {
    var getParams = {
      TableName: this.engagementTable,
      FilterExpression: "attribute_not_exists(parentId)"
    };

    try {
      const res = await dynamoDb.scan(getParams).promise();
      let retItems = [];
      if (res.Items.length > 0) {
        console.log(res.Items);
        let promisesGroup = []
        for (const event of res.Items) {
          promisesGroup.push(this.getChildEngagement(event))
        }
        retItems = await Promise.all(promisesGroup)
        for (let i = 0; i < retItems.length-1; i ++) {
          for (let j = i + 1; j < retItems.length; j ++) {
            if (Date.parse(retItems[i].event.time) < Date.parse(retItems[j].event.time)) {
              const temp = retItems[i];
              retItems[i] = retItems[j];
              retItems[j] = temp;
            }
          }
        }
      }
      return retItems;
    } catch (err) {
      console.log(err);
    }
  }
  async deleteItems() {
    await clearTable(this.engagementTable);
  }
}

module.exports = Engagement;
