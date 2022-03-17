"use strict";

const moment = require("moment");
const momenttimezone = require("moment-timezone");
const uuid = require("uuid");

class taskClass {
  constructor(args) {
    for (var parameter in args) {
      this[parameter] = args[parameter];
    }
    this.services.addService("taskcl", this);
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

  var task4 = {
      "createdAt": "2019-07-11T18:08:45.120Z",
      "event": {
        "action":"notifyUser",
        "billId":"f5ba3901-df2e-4297-b9eb-69ead9e0203b",
        "message":"Your BillZerro bill is due after 10 days"
      },
      "id": "1c10ffaa-7fe0-49e2-acf1-f369062b5e69",
      "owner": "billcl",
      "recurring": "true",
      "recurringAfter": 1,
      "recurringType": "month",
      "status": "pending",
      "to": "billcl",
      "ttl": 1566345600,
      "updatedAt": "2019-07-11T18:08:45.120Z"
    }   
  */
  async createTask(task) {
    try {
      var now = moment().tz(process.env.DEFAULT_TIMEZONE);
      if (task.to && task.owner && task.event && task.ttl) {
        task.id = uuid.v4();
        task.status = "pending"; // "completed"
        task.recurring = task.recurring === "true" ? task.recurring : "false";
        task.recurringType = task.recurringType ? task.recurringType : "days";
        task.recurringAfter = task.recurringAfter
          ? parseInt(task.recurringAfter)
          : 0;
        return await this.services.dbcl.putTask(task);
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async processTask(task) {
    try {
      var now = moment().tz(process.env.DEFAULT_TIMEZONE);
      var taskResult = await this.services[task.to].processTask(task);
      if (task.recurring === "true" && !taskResult.cancel) {
        task.id = uuid.v4();
        task.ttl =
          moment(task.ttl * 1000)
            .add(task.recurringAfter, task.recurringType)
            .valueOf() / 1000;
        await this.services.dbcl.putTask(task);
        return taskResult;
      }

      return taskResult; //{status:"success",info:"task completed",id:task.id}
    } catch (error) {
      throw error;
    }
  }
}

module.exports = taskClass;
