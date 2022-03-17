const AWS = require("aws-sdk");
const uuid = require("uuid");
const moment = require("moment");
AWS.config.update({region: "us-east-1"});
const dynamoDb = new AWS.DynamoDB.DocumentClient();

class DBPlayHelperClass {
  constructor(args) {
    this.iconsole = args.iconsole;
    this.services = args.services;
    this.services.addService("dbPlay", this);

    this.playTable = process.env.PLAYTABLE;
    this.poolTable = process.env.POOLTABLE;
    this.uvTable = process.env.UNIQUEVIEWTABLE;

    this.playPlayidPoolIdIndex = 'play-playId-poolId-index';
    this.poolPoolidIndex = 'pool-poolId-index';
    this.poolplayIdIndex = 'pool-playId-index';
    this.poolplayIduseridIndex = 'pool-playId-userid-index';
  }

  async refreshPoolInfo(poolId) {
    const queryPoolParams = {
      TableName: this.poolTable,
      KeyConditionExpression: "#poolId = :poolId",
      IndexName: this.poolPoolidIndex,
      ExpressionAttributeNames: {
        "#poolId": "poolId"
      },
      ExpressionAttributeValues: {
        ":poolId": poolId
      }
    }

    // const timeStamp = poolId.split('_')[1];
    const timeStamp = this.services.utils.dateToEpoch(new Date());

    const {startDate, endDate} = this.services.utils.nextDateFromEpoch(timeStamp);


    let poolData = await dynamoDb.query(queryPoolParams).promise();
    let response = {
      poolInfo: [],
      poolSize: 0,
    }

    console.log('poolData ', poolData.Items);
    for (const poolUser of poolData.Items) {
      const user = await this.services.dbcl.getUser(poolUser.userid);
      const uvInfo = await this.services.dbcl.getUVInfo(poolUser.userid, startDate.toISOString(), endDate.toISOString())
      const nBills = await this.services.dbcl.getUserBills(poolUser.userid);
      const _poolUser = {
        username: user.userName,
        prob: poolUser.probability,
        nbill: nBills.length,
        nuvu: (uvInfo.uv1.length - uvInfo.uv2.length),    //total unverified uv (uv1 - uv2)
        nuvv: uvInfo.uv2.length,  //total verified uv
        npays: 0,
        nmr: 0,
        ctr: 0
      }
      response.poolInfo.push(_poolUser);
    }
    response.poolSize = poolData.Items.length;
    return response;
  }

  async getPlayInfo(playId) { // playId: 1630108800 -- NUMBER TYPE
    if (!playId) {
      // scan all plays
      const scanPlays = {
        TableName: this.playTable,
        FilterExpression: "#poolId = :poolId",
        ExpressionAttributeNames: {
          "#poolId": "poolId"
        },
        ExpressionAttributeValues: {
          ":poolId": 0,
        },
      };

      try {
        let data = await dynamoDb.scan(scanPlays).promise();
        if (Object.keys(data).length === 0) {
          throw "Invalid";
        } else {
          return data.Items;
        }
      } catch (error) {
        this.iconsole.log("=== ERROR ===", error);
        throw error;
      }
    }
    else {
      const queryParams = {
        TableName: this.playTable,
        KeyConditionExpression: "#playId = :playId",
        IndexName: this.playPlayidPoolIdIndex,
        ExpressionAttributeNames: {
          "#playId": "playId"
        },
        ExpressionAttributeValues: {
          ":playId": playId
        }
      };
      try {
        let data = await dynamoDb.query(queryParams).promise();
        let response = {
          pools: [],
          poolLength: data.Items.length,
        }
        for (const play of data.Items) {
          const pool = {
            poolId: `${play.poolId}_${play.playId}`,
            rateUV: play.uvRateGlobal,
            ratePay: play.payRateGlobal,
            nPlay: play.nPlay,
            pot: play.pot
          }
          response.pools.push(pool)
        }
        return response;
      } catch(error) {
        console.log(error);
      }
    }
  }

  async deletePlay(playId) {
    const queryParams = {
      TableName: this.playTable,
      KeyConditionExpression: "#playId = :playId",
      IndexName: this.playPlayidPoolIdIndex,
      ExpressionAttributeNames: {
        "#playId": "playId"
      },
      ExpressionAttributeValues: {
        ":playId": playId
      }
    };

    try {
      let res = await this.services.dbcl.queryTable(queryParams);
      let deleteItems = [];
      let deleteIds = [];
      for (let item of res.Items) {
        const newDeleteRequest = {
          DeleteRequest: {
            Key: {
              'id': item.id
            }
          }
        }
        deleteItems.push(newDeleteRequest);
        deleteIds.push(item);
      }
      if (deleteItems.length > 0) {
        await this.services.dbcl.multipleBatchWrite(this.playTable, deleteItems);
        return deleteIds;
      }
    } catch (error) {
      console.log('deletePlay ', error);
      throw error;
    }
  }

  async deletePool(poolId) {
    const queryParams = {
      TableName: this.poolTable,
      KeyConditionExpression: "#poolId = :poolId",
      IndexName: this.poolPoolidIndex,
      ExpressionAttributeNames: {
        "#poolId": "poolId"
      },
      ExpressionAttributeValues: {
        ":poolId": poolId
      }
    };

    try {
      let res = await this.services.dbcl.queryTable(queryParams);
      let deleteItems = [];
      let deletedItems = [];
      for (let item of res.Items) {
        const newDeleteRequest = {
          DeleteRequest: {
            Key: {
              'id': item.id
            }
          }
        }
        deletedItems.push({...item});
        deleteItems.push(newDeleteRequest);
      }
      console.log('deletePool ', deleteItems)
      if (deleteItems.length > 0) {
        await this.services.dbcl.multipleBatchWrite(this.poolTable, deleteItems);
        return deletedItems;
      }
    } catch (error) {
      console.log('deletePool error', error);
      throw error;
    }
  }

  async getPoolStartInfo(poolId) {
    const queryParams = {
      TableName: this.poolTable,
      KeyConditionExpression: "#poolId = :poolId",
      IndexName: this.poolPoolidIndex,
      ExpressionAttributeNames: {
        "#poolId": "poolId"
      },
      ExpressionAttributeValues: {
        ":poolId": poolId
      }
    };

    try {
      let res = await this.services.dbcl.queryTable(queryParams);
      let highUser = res.Items[0]
      for (let i = 1; i < res.Items.length; i ++) {
        if (parseFloat(highUser.probability) < parseFloat(res.Items[i].probability)) {
          highUser = res.Items[i];
        }
      }
      return highUser;
    } catch (err) {
      console.log(err)
    }
  }

  async deletePoolsByPlayId(playId) {
    const queryParams = {
      TableName: this.poolTable,
      KeyConditionExpression: "#playId = :playId",
      IndexName: this.poolplayIdIndex,
      ExpressionAttributeNames: {
        "#playId": "playId"
      },
      ExpressionAttributeValues: {
        ":playId": playId
      }
    };

    try {
      let res = await this.services.dbcl.queryTable(queryParams);
      let deleteItems = [];
      let deleteIds = {};
      for (let item of res.Items) {
        const newDeleteRequest = {
          DeleteRequest: {
            Key: {
              'id': item.id
            }
          }
        }
        deleteItems.push(newDeleteRequest);
        if (deleteIds.hasOwnProperty(item.poolId)) {
          let push = false;
          for (let i = 0; i < deleteIds[item.poolId].length; i ++) {
            if (parseFloat(item.probability) < parseFloat(deleteIds[item.poolId][i].probability)) {
              deleteIds[item.poolId].splice(i, 0, {
                'id': item.id,
                'poolId': item.poolId,
                'userid': item.userid,
                'probability': item.probability
              });
              push = true;
              break;
            }
          }
          if (!push) {
            deleteIds[item.poolId].push({
              'id': item.id,
              'poolId': item.poolId,
              'userid': item.userid,
              'probability': item.probability
            });
          }
        } else {
          deleteIds[item.poolId] = [];
          deleteIds[item.poolId].push({
            'id': item.id,
            'poolId': item.poolId,
            'userid': item.userid,
            'probability': item.probability
          });
        }
      }
      console.log('deletePoolsByPlayId ', deleteItems)
      if (deleteItems.length > 0) {
        await this.services.dbcl.multipleBatchWrite(this.poolTable, deleteItems);
        return deleteIds;
      }
    } catch (error) {
      console.log('deletePoolsByPlayId error', error);
      throw error;
    }
  }

  //temp function to check in ceo's pool
  async checkInMyPool(userId) { // get the pool of current play
    //'ceo'
    const timeStamp = this.services.utils.dateToEpoch(new Date())
    var queryParams = {
      TableName: this.poolTable,
      IndexName: this.poolplayIduseridIndex,
      KeyConditionExpression: "#playId = :playId and #userid = :userId",
      ExpressionAttributeNames: {
        "#playId": "playId",
        "#userid": "userid"
      },
      ExpressionAttributeValues: {
        ":playId": timeStamp,
        ":userId": userId
      },
    };

    try {
      let data = await this.services.dbcl.queryTable(queryParams);
      if (data.Items.length > 0) {
        queryParams = {
          TableName: this.poolTable,
          IndexName: this.poolplayIduseridIndex,
          KeyConditionExpression: "#playId = :playId and #userid = :userId",
          ExpressionAttributeNames: {
            "#playId": "playId",
            "#userid": "userid"
          },
          ExpressionAttributeValues: {
            ":playId": timeStamp,
            ":userId": 'addff01b-fb82-4753-8187-313d01c50d55' //ceo
          },
        };
        let myPool = await this.services.dbcl.queryTable(queryParams);
        if (myPool.Items.length > 0) {
          return (data.Items[0].poolId === myPool.Items[0].poolId);
        }
      }
      return false;
    } catch (err) {
      console.log('checkInMyPool ' ,err);
      return false;
    }
  };


  async getPoolOfUser(userId) { // get the pool of current play
    const timeStamp = this.services.utils.dateToEpoch(new Date())
    var queryParams = {
      TableName: this.poolTable,
      IndexName: this.poolplayIduseridIndex,
      KeyConditionExpression: "#playId = :playId and #userid = :userId",
      ExpressionAttributeNames: {
        "#playId": "playId",
        "#userid": "userid"
      },
      ExpressionAttributeValues: {
        ":playId": timeStamp,
        ":userId": userId
      },

    };
    try {
      let data = await this.services.dbcl.queryTable(queryParams);
      if (data.Items.length > 0) {
        return data.Items[0];
      }
    } catch (err) {
      console.log('getPoolOfUser ' ,err);
      return null;
    }
    return null;
  }

  async populateProbability(billsInfo, group) {
    //         group: {pool: _pool,
    //         id: uuid.v4(),
    //         count: j,
    //         playId: playId,
    //         poolId: nGroups,
    //         timeStamp: timeStamp,
    //         payRateGlobal: payRateGlobal,
    //         uvRateGlobal: uvRateGlobal     }
    try {
      const putParams = {
        RequestItems: {},
      };
      putParams.RequestItems[this.poolTable] = [];
      billsInfo.forEach((billInfo) => {
        // id = [user_id + today_string]
        putParams.RequestItems[this.poolTable].push({
          PutRequest: {
            Item: {
              id: uuid.v4(),
              playId: group.playId,
              poolId: group.poolId,
              userid: billInfo.userid,
              probability: billInfo.probability,
              payRate: group.payRateGlobal,
              uvRate: group.uvRateGlobal
            },
          },
        });
      });
      await dynamoDb.batchWrite(putParams).promise();
      return billsInfo;
    } catch (error) {
      console.log('populateProbability error', error);
      throw error;
    }
  }

  // refresh game Cycle by updated bills or uv information
  // when it is triggered by uv, calculate diff with old and new probability and notify payee
  async refreshCycle(poolInfo, payeeId, payerId, payload) {
    let {playId, poolId} = poolInfo;
    // this.services.dbcl.calculateExpectationProbability(group, )
    playId = parseInt(playId, 10)
    const pools = await this.getUsersIdsInPool(poolId);
    try {
      let group = {
        pool: pools,
        poolId: poolId,
        playId: playId
      }

      console.log('refreshCycle group', group);

      const oldUserProb = await this.getCurrentProbability(payeeId, playId);
      const billsInfo = await this.calculateInnerProbability(group)
      console.log('refreshCycle oldUser ', oldUserProb)
      console.log('refreshCycle billsInfo ', billsInfo)
      const deletedPools = await this.deletePool(poolId)
      console.log('deletedPools ', deletedPools)
      group.payRateGlobal = parseFloat(deletedPools[0].payRate);
      group.uvRateGlobal = parseFloat(deletedPools[0].uvRate);
      await this.populateProbability(billsInfo, group)

      // const currentUserProb = await this.getCurrentProbability(payeeId, playId);
      const {by, paymentAmount } = payload;

      // notify them after new recycle

      if (by === 'bill') { //recalculated by new bills, notify them new probability
        // await this.services.msgcl.notifyUserByImpetus('play-pay-pool', payload);
      } else if (by === 'uv') { //recalculated by new uv
        console.log('by UV', billsInfo);
        await this.services.msgcl.notifyUserByImpetus('play-uv-pool', {payerId, payeeId,
          value: billsInfo});
      } else if (by === 'pay') { //recalculated by new bills
        await this.services.msgcl.notifyUserByImpetus('play-pay-pool', {payerId, payeeId, paymentAmount,
          value: billsInfo});
        await this.services.engagementCL.newEngagementByPay({poolId, payerId, payeeId, paymentAmount,
          value: billsInfo})
      } else if (by === 'cc') { // recalculated by new cc
        
      }
    } catch (e) {
      console.log('refreshCycle error', e);
    }
  }

  async getUsersIdsInPool(poolId) {
    // return ids in the Pool
    this.iconsole.log('---getUsersIdsInPool---', poolId);
    try {
      var queryParams = {
        TableName: this.poolTable,
        KeyConditionExpression: "#poolId = :poolId",
        IndexName: this.poolPoolidIndex,
        ExpressionAttributeNames: {
          "#poolId": "poolId",
        },
        ExpressionAttributeValues: {
          ":poolId": poolId,
        },
      };
      let res = await this.services.dbcl.queryTable(queryParams);
      let poolUsers = []
      for (const _user of res.Items) {
        poolUsers.push(_user.userid);
      }
      return poolUsers;
    } catch (error) {
      throw error;
    }
  }

  async getCurrentProbability(userId, playId) {
    console.log(`---getCurrentProbability---${playId} ${userId}`);
    try {
      var queryParams = {
        TableName: this.poolTable,
        KeyConditionExpression: "#playId = :playId and #userid = :userid",
        IndexName: this.poolplayIduseridIndex,
        ExpressionAttributeNames: {
          "#playId": "playId",
          "#userid": "userid"
        },
        ExpressionAttributeValues: {
          ":playId": playId,
          ":userid": userId
        },
        ProjectionExpression: "probability"
      };
      let res = await this.services.dbcl.queryTable(queryParams);
      if (res.Items != null && res.Items.length > 0) {
        return parseFloat(res.Items[0].probability);
      }
      return 0;
    } catch (error) {
      throw error;
    }
  }

  async clearPool(poolId) {
  }
  calculateProbability(group) {
    return new Promise((resolve, reject) => {
      this.calculateInnerProbability(group).then((res)=>{
          resolve({billInfo: res, group: group})
      })
    })
  }

  getRankOfUser(userId, billsInfo) {
    for (let i = 0; i < billsInfo.length; i ++) {
      if (billsInfo[i].userid === userId) {
        return (billsInfo.length - i);
      }
    }
    return -1;
  }
  async calculateInnerProbability(group) {
    // group : {
    //   pool: _pool,
    //   id: uuid.v4(),
    //   count: j,
    //   playId: playId,
    //   poolId: nGroups,
    //   timeStamp: timeStamp,
    //   payRateGlobal: payRateGlobal,
    //   uvRateGlobal: uvRateGlobal }

    let gameUsers = group.pool;
    let billsInfo = [];
    let totalBills = 0;

    const {start, end} = this.services.utils.getTimeofDay();
    for (const gameUserId of gameUsers) {
      const bills = await this.services.dbcl.getUserBills(gameUserId);
      console.log('calculate Probability ', gameUserId, start, end);

      const {uv1, uv2} = await this.services.dbcl.getUVInfo(gameUserId, start, end);
      const payItems = await this.services.dbcl.getUserInboundPayments(gameUserId, start, end);

      console.log('calculateProbability UV=', uv2.length);
      let billsCount = bills.length;
      if (payItems.length > 0) {
        billsCount = billsCount * 2 * payItems.length;
      }
      if (uv2.length > 0) {
        billsCount = billsCount * 2 * uv2.length;
      }

      billsInfo.push({
        userid: gameUserId,
        bills: billsCount,
        probability: 0
      })
      totalBills = totalBills + billsCount;
    }
    console.log('calculate totalBills return==', totalBills);
    for (const billInfo of billsInfo) {
      billInfo.probability = (Math.round(billInfo.bills / totalBills * 100)).toFixed(2);
    }

    //sort bill to ascending order
    for (let i = 0; i < billsInfo.length - 1; i ++) {
      for (let j = i + 1; j<billsInfo.length; j ++) {
        if (billsInfo[i].bills > billsInfo[j].bills) {
          const temp = Object.assign({}, billsInfo[i]);
          billsInfo[i] = Object.assign({}, billsInfo[j]);
          billsInfo[j] = Object.assign({}, temp);
        }
      }
    }
    console.log(billsInfo);
    return billsInfo;
  }

  async createGameWithUsers(users, data) {
    // const gids = ['1627887600'];
    let {poolSize,  uvRateGlobal, payRateGlobal, pot} = data;
    console.log(data);
    if (uvRateGlobal === '' || uvRateGlobal === undefined) {
      uvRateGlobal = 0.5;
      payRateGlobal = 0.5;
      pot = 0.5;
    }
    let groups = [];
    const nUsers = users.length;
    const randomList = this.services.utils.generateRandomList(nUsers);
    let i = 0, j = 0, nGroups = 0;
    // const timeStamp = moment();
    const timeStamp = this.services.utils.dateToEpoch(new Date())

    while (i < nUsers) {
      let _pool = [];
      j = 0;
      while (j < poolSize && i < nUsers) {
        _pool.push(users[randomList[i]]);
        j++;
        i++;
      }

      groups.push({
        pool: _pool,
        id: uuid.v4(),
        count: j,
        playId: timeStamp,
        poolId: `${nGroups}_${timeStamp}`,
        payRateGlobal: payRateGlobal,
        uvRateGlobal: uvRateGlobal,
        pot: pot
      })
      nGroups++;
    }

    try {
      const putParams = {
        RequestItems: {},
      };
      putParams.RequestItems[this.playTable] = [];
      groups.forEach((group, index) => {
        putParams.RequestItems[this.playTable].push({
          PutRequest: {
            Item: {
              id: group.id,
              nPlay: group.count,
              playId: timeStamp,
              poolId: index,
              payRateGlobal: payRateGlobal,
              uvRateGlobal: uvRateGlobal,
              pot: pot,
            },
          },
        });
      });
      await dynamoDb.batchWrite(putParams).promise();
      return groups;
    } catch (error) {
      console.log(error)
      throw error;
    }
  }


}

module.exports = DBPlayHelperClass;
