"use strict";

const moment = require("moment");
const momenttimezone = require("moment-timezone");

class statsClass {
  constructor(args) {
    for (var parameter in args) {
      this[parameter] = args[parameter];
    }
    this.services.addService("statscl", this);
  }

  randomNumber(min = 1, max = 100) {
    return Math.floor(Math.random() * max) + min;
  }

  createStatsObject(did, id = "day") {
    return {
      did: did,
      id: id,
      name: null,
      users: 0,
      activeBills: 0,
      totalPaid: 0,
      transactions: 0,
      "cell phone": 0,
      "car insurance": 0,
      "car payment": 0,
      utilities: 0,
      mortgage: 0,
      "medical insurance": 0,
      internet: 0,
      "student loans": 0,
      "credit card": 0,
      other: 0,
    };
  }

  getGeneralStatsMockup() {
    var daysInCurrentMonth = moment().daysInMonth();
    var bzStats = {
      general: {
        newBills: this.randomNumber(),
        payBounceRate: this.randomNumber(10, 50),
        newUsers: this.randomNumber(20, 500),
        totalUsers: this.randomNumber(1000, 10000),
        totalActiveUnpaidBills: this.randomNumber(10, 50),
        totalActivePaidBills: this.randomNumber(100, 500),
        totalAvgNumPayers: this.randomNumber(100, 500),
      },
      vendors: {
        "cell phone": this.randomNumber(),
        "car insurance": this.randomNumber(),
        "car payment": this.randomNumber(),
        utilities: this.randomNumber(),
        mortgage: this.randomNumber(),
        "medical insurance": this.randomNumber(),
        internet: this.randomNumber(),
        "student loans": this.randomNumber(),
        "credit card": this.randomNumber(),
        other: this.randomNumber(),
      },
      billsByVendor: [
        { name: "AT&T", count: this.randomNumber(100, 500) },
        { name: "T-Mobile", count: this.randomNumber(100, 500) },
        { name: "Verizon", count: this.randomNumber(100, 500) },
        { name: "Sprint", count: this.randomNumber(100, 500) },
      ],
      numTransactionsDaily: [],
      numBillsTransactionsMonthly: {
        Bills: [],
        Transactions: [],
      },
    };

    for (let i = 1; i <= daysInCurrentMonth; i++) {
      bzStats.numTransactionsDaily.push(this.randomNumber());
    }

    for (let i = 1; i <= 12; i++) {
      bzStats.numBillsTransactionsMonthly.Bills.push(this.randomNumber());
      bzStats.numBillsTransactionsMonthly.Transactions.push(
        this.randomNumber()
      );
    }

    return bzStats;
  }

  /*     
    https://nathan.atlassian.net/browse/BZ-27
    Vendors > Breakdown of total active unpaid and paid bills, 
    Users > Breakdown of total active unpaid && paid bills && AVG NUM PAYERS
    Bills > Breakdown of total active unpaid && paid bills && AVG NUM PAYERS && AVG TOTAL 
*/
  async getGeneralStats() {
    try {
      var now = moment().tz(process.env.DEFAULT_TIMEZONE);
      var daysInCurrentMonth = moment().daysInMonth();
      var statsTotalObj = await this.services.dbcl.getStats("total", "total");
      if (!statsTotalObj) {
        statsTotalObj = this.createStatsObject("total", "total");
      }

      var did = now.format("YYYY-MM-DD");

      var vendorDailyStats = await this.services.dbcl.getVendorDailyStats(did);
      var dailyStatsRes = vendorDailyStats.filter((item) => item.id === "day");
      var statsObj = dailyStatsRes.length
        ? dailyStatsRes[0]
        : this.createStatsObject(did, "day");
      vendorDailyStats = vendorDailyStats.filter((item) => item.id !== "day");

      const startOfMonth = now.startOf("month").format("YYYY-MM-DD");
      const endOfMonth = now.endOf("month").format("YYYY-MM-DD");
      var monthDailyStats = await this.services.dbcl.getStatsBetween(
        "day",
        startOfMonth,
        endOfMonth
      );

      const startOfYear = now.startOf("year").format("YYYY-MM");
      const endOfYear = now.endOf("year").format("YYYY-MM");
      var yearMonthlyStats = await this.services.dbcl.getStatsBetween(
        "month",
        startOfYear,
        endOfYear
      );

      var bzStats = {
        general: {
          newBills: statsObj.activeBills,
          payBounceRate: 0,
          newUsers: statsObj.users,
          totalUsers: statsTotalObj.users,
          totalActiveUnpaidBills: statsObj.activeBills - statsObj.totalPaid,
          totalActivePaidBills: statsObj.totalPaid,
          totalAvgNumPayers: 0,
        },
        vendors: {
          "cell phone": statsObj["cell phone"],
          "car insurance": statsObj["car insurance"],
          "car payment": statsObj["car payment"],
          utilities: statsObj["utilities"],
          mortgage: statsObj["mortgage"],
          internet: statsObj["internet"] ? statsObj["internet"] : 0,
          "medical insurance": statsObj["medical insurance"],
          "student loans": statsObj["student loans"],
          "credit card": statsObj["credit card"],
          other: statsObj["other"],
        },
        billsByVendor: [],
        numTransactionsDaily: [],
        numBillsTransactionsMonthly: {
          Bills: [],
          Transactions: [],
        },
      };

      vendorDailyStats.forEach((vds) => {
        let item = { name: vds.name, count: vds.activeBills };
        bzStats.billsByVendor.push(item);
      });

      for (let i = 1; i <= daysInCurrentMonth; i++) {
        bzStats.numTransactionsDaily.push(0);
      }

      monthDailyStats.forEach((mds) => {
        let date = moment(mds.did, "YYYY-MM-DD");
        var day = Number(date.date()) - 1;
        bzStats.numTransactionsDaily[day] = mds.transactions;
      });

      for (let i = 1; i <= 12; i++) {
        bzStats.numBillsTransactionsMonthly.Bills.push(0);
        bzStats.numBillsTransactionsMonthly.Transactions.push(0);
      }

      yearMonthlyStats.forEach((yms) => {
        let date = moment(yms.did, "YYYY-MM");
        var month = Number(date.month());
        bzStats.numBillsTransactionsMonthly.Bills[month] = yms.activeBills;
        bzStats.numBillsTransactionsMonthly.Transactions[month] =
          yms.transactions;
      });

      return bzStats;
    } catch (error) {
      throw error;
    }
  }

  async updateStats(data, id = "day", updateTotals = true) {
    try {
      this.iconsole.log(data, id, updateTotals);
      var formatTemplate =
        id === "year" ? "YYYY" : id === "month" ? "YYYY-MM" : "YYYY-MM-DD";
      var now = moment().tz(process.env.DEFAULT_TIMEZONE);
      var did = now.format(formatTemplate);
      var statsObj = await this.services.dbcl.getStats(did, id);
      if (!statsObj) {
        statsObj = this.createStatsObject(did, id);
        if (id !== "day" && id !== "month" && id !== "year") {
          let vendor = await this.services.dbcl.getVendor(id);
          statsObj.name = vendor.name;
        } else {
          statsObj.name = "Daily Statistics";
        }
      }

      statsObj.internet = statsObj.internet ? statsObj.internet : 0;

      for (var x in data) {
        if (statsObj[x] !== undefined) {
          statsObj[x] += Number(data[x]);
        }
      }

      statsObj = await this.services.dbcl.putStats(statsObj);

      if (id === "day" && updateTotals) {
        var didMonth = now.format("YYYY-MM");
        var statsMonthlyObj = await this.services.dbcl.getStats(
          didMonth,
          "month"
        );
        if (!statsMonthlyObj) {
          statsMonthlyObj = this.createStatsObject(didMonth, "month");
          statsMonthlyObj.name = "Monthly Statistics";
        }

        statsMonthlyObj.internet = statsMonthlyObj.internet
          ? statsMonthlyObj.internet
          : 0;

        for (var x in data) {
          if (statsMonthlyObj[x] !== undefined) {
            statsMonthlyObj[x] += Number(data[x]);
          }
        }

        await this.services.dbcl.putStats(statsMonthlyObj);

        var statsTotalObj = await this.services.dbcl.getStats("total", "total");
        if (!statsTotalObj) {
          statsTotalObj = this.createStatsObject("total", "total");
          statsTotalObj.name = "Total Statistics";
        }

        statsTotalObj.internet = statsTotalObj.internet
          ? statsTotalObj.internet
          : 0;

        for (var x in data) {
          if (statsTotalObj[x] !== undefined) {
            statsTotalObj[x] += Number(data[x]);
          }
        }
        await this.services.dbcl.putStats(statsTotalObj);
      }

      return statsObj;
    } catch (error) {
      throw error;
    }
  }

  async updateVendorStats(id, data) {
    try {
      this.iconsole.log(id, data);
      return await this.updateStats(data, id, false);
    } catch (error) {
      throw error;
    }
  }

  async updateArcusStats(data, id = "month") {
    try {
      this.iconsole.log(data, id);
      var formatTemplate = "YYYY-MM";
      var now = moment().tz(process.env.DEFAULT_TIMEZONE);
      var did = "arcus-" + now.format(formatTemplate);
      var statsObj = await this.services.dbcl.getStats(did, id);
      if (!statsObj) {
        statsObj = {
          did: did,
          id: id,
          calls: 0,
          cost: 0,
          xpay: 0,
          xdata: 0,
          name: "Arcus Monthly Statistics",
        };
      }
      data.calls = 0;
      data.cost = 0;
      if (data.xpay) {
        data.calls += data.xpay;
        data.cost += 0.25;
      }
      if (data.xdata) {
        data.calls += data.xdata;
        if (statsObj.calls <= 10000) {
          data.cost += 0.3;
        } else if (statsObj.calls <= 50000) {
          data.cost += 0.25;
        } else if (statsObj.calls <= 200000) {
          data.cost += 0.2;
        } else {
          data.cost += 0.15;
        }
      }

      for (var x in data) {
        if (statsObj[x] !== undefined) {
          statsObj[x] += Number(data[x]);
        }
      }

      return await this.services.dbcl.putStats(statsObj);
    } catch (error) {
      throw error;
    }
  }

  async getVendorStats(id) {
    try {
      var now = moment().tz(process.env.DEFAULT_TIMEZONE);
      var did = now.format("YYYY-MM-DD");
      var statsObj = await this.services.dbcl.getStats(did, id);
      if (!statsObj) {
        return this.createStatsObject(did, id);
      }

      return statsObj;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = statsClass;
