"use strict";
const AWS = require("aws-sdk");
AWS.config.update({region: "us-east-1"});
const dynamoDb = new AWS.DynamoDB.DocumentClient();

class UniqueView {
  constructor(args) {
    for (var parameter in args) {
      this[parameter] = args[parameter];
    }
    this.services.addService("uvcl", this);
    this.secret = process.env.JWTSECRET;

    this.uvTable = process.env.UNIQUEVIEWTABLE;
    this.uvUserIdViewerIdIndex = 'uv-userid-viewerId-index';
    this.userIdViewAtIndex = 'uv-userid-viewAt-index';
    this.uvviewerIdvewAtIndex = 'uv-viewerId-viewAt-index';

  }

  async putUV(userId, viewerId) {

  }

  async getUVInfo(userId, start, end) {
    try {
      const {uv1, uv2} = await this.services.dbcl.getUVInfo(userId)
      return {uv1, uv2}
    } catch (error) {
      console.log('getUVInfo: ', error);
      throw error;
    }
  }

  async getPendingUVs(viewerId) {
    const {start, end} = this.services.utils.getTimeofDay();
    try {
      var queryParams = {
        TableName: this.uvTable,
        IndexName: this.uvviewerIdvewAtIndex,
        KeyConditionExpression: "#viewerId = :viewerId and (#viewAt BETWEEN :start AND :end)",
        // ConditionExpression: ""
        ExpressionAttributeNames: {
          "#viewerId": "viewerId",
          "#viewAt": "viewAt"
        },
        ExpressionAttributeValues: {
          ":viewerId": viewerId,
          ":start": start,
          ":end": end
        }
      };
      const res = await this.services.dbcl.queryTable(queryParams);
      return res.Items;
    } catch(err) {
      console.log('getPendingUVs err', err)
    }
  }
  async checkNewViewer(userId, viewerId) {
    try {
      const {start, end} = this.services.utils.getTimeofDay();
      var queryParams = {
        TableName: this.uvTable,
        IndexName: this.userIdViewAtIndex,
        KeyConditionExpression: "#userid = :userid and (#viewAt BETWEEN :start AND :end)",
        // ConditionExpression: ""
        ExpressionAttributeNames: {
          "#userid": "userid",
          "#viewAt": "viewAt"
        },
        ExpressionAttributeValues: {
          ":userid": userId,
          ":start": start,
          ":end": end
        },
        ProjectionExpression: "viewerId"
      };
      let res = await this.services.dbcl.queryTable(queryParams);
      let viewerDuplication = 0;
      for (let _viewer of res.Items) {
        if (viewerId === _viewer.viewerId) {
          console.log(`checkNewViewer Has Same viewer ${userId} ${viewerId}`);
          viewerDuplication ++;
          if (viewerDuplication > 1){
            console.log(`checkNewViewer is Not new user`);
            return false;
          }
        }
      }
      return true;
    } catch (error) {
      console.log('checkNewViewer err', error)
    }
  }

  async deleteItems() {
    const {start, end} = this.services.utils.getTimeofDay();
    console.log(start)
    console.log(end)
    const scanParams = {
      TableName: this.uvTable,
      FilterExpression: "#viewAt BETWEEN :start AND :end",
      ExpressionAttributeNames: {
        "#viewAt": "viewAt"
      },
      ExpressionAttributeValues: {
        ":start": start,
        ":end": end
      }
    };
    try {
      let data = await dynamoDb.scan(scanParams).promise();
      let deleteItems = [];
      console.log(data.Items)
      if (data.Items.length > 0) {
        for (let item of data.Items) {
          const newDeleteRequest = {
            DeleteRequest: {
              Key: {
                'id': item.id,
                'userid': item.userid
              }
            }
          }
          deleteItems.push(newDeleteRequest);
        }
        await this.services.dbcl.multipleBatchWrite(this.uvTable, deleteItems);
      }
    } catch (err) {
      console.log(err)
    }
  }
}

module.exports = UniqueView;
