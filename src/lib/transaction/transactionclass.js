"use strict";

const moment = require("moment");
const uuid = require("uuid");

class transactionClass {
  constructor(args) {
    for (var parameter in args) {
      this[parameter] = args[parameter];
    }
    this.services.addService("transactioncl", this);
  }

  async getUserTransactions(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      var payerSet = new Set();
      var payerMap = new Map();
      var billSet = new Set();
      var billMap = new Map();
      var transactions = [];
      if (jwtDecode.role && jwtDecode.role === "admin" && data.id) {
        transactions = await this.services.dbcl.getUserTransactions(data.id);
      } else {
        transactions = await this.services.dbcl.getUserTransactions(
          jwtDecode.id
        );
        transactions.forEach((tr) => {
          delete tr.signatureUrl;
        });
      }

      transactions = transactions.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      transactions.forEach((tr) => {
        payerSet.add(tr.payerId);
        billSet.add(tr.billId);
      });

      var payerIds = Array.from(payerSet);
      while (payerIds.length) {
        let batchpayerIds = payerIds.splice(0, 25);
        let payerUsers = await this.services.dbcl.getUsers(batchpayerIds);
        payerUsers.forEach((pu) => {
          payerMap.set(pu.id, pu);
        });
      }

      var billIds = Array.from(billSet);
      while (billIds.length) {
        let batchbillIds = billIds.splice(0, 25);
        let userBills = await this.services.dbcl.getUserBillByIds(
          jwtDecode.id,
          batchbillIds
        );
        userBills.forEach((bl) => {
          billMap.set(bl.id, bl);
        });
      }

      transactions.forEach((tr) => {
        let trPayer = payerMap.has(tr.payerId)
          ? payerMap.get(tr.payerId)
          : {
              id: "undefined",
              userName: "undefined",
              firstName: "undefined",
              lastName: "undefined",
              profileImage: "undefined",
            };
        let trBill = billMap.has(tr.billId)
          ? billMap.get(tr.billId)
          : {
              billerName: "undefined",
              image: "undefined",
              imagex: "undefined",
            };
        tr.payerUserName = trPayer.userName;
        tr.payerProfileImage = trPayer.profileImage;
        tr.billerName = trBill.billerName;
        tr.image = trBill.image;
        tr.imagex = trBill.imagex;
      });

      return transactions;
    } catch (error) {
      throw error;
    }
  }

  async getUserPayers(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var transactions = await this.services.dbcl.getUserTransactions(
        jwtDecode.id
      );
      transactions = transactions.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      var payerSet = new Set();
      var payerMap = new Map();
      var billSet = new Set();
      var billMap = new Map();
      var payers = [];
      transactions.forEach((tr) => {
        payerSet.add(tr.payerId);
        billSet.add(tr.billId);
      });
      var payerIds = Array.from(payerSet);
      while (payerIds.length) {
        let batchpayerIds = payerIds.splice(0, 25);
        let payerUsers = await this.services.dbcl.getUsers(batchpayerIds);
        let utouUsers = await this.services.dbcl.getUTOUByIds(
          jwtDecode.id,
          batchpayerIds
        );
        payerUsers.forEach((pu) => {
          pu.thanks = true;
          payerMap.set(pu.id, pu);
        });

        utouUsers.forEach((ut) => {
          if (payerMap.has(ut.payerid)) {
            let pum = payerMap.get(ut.payerid);
            pum.thanks = ut.thanks === "true" ? true : false;
            payerMap.set(pum.id, pum);
          }
        });
      }

      var billIds = Array.from(billSet);
      while (billIds.length) {
        let batchbillIds = billIds.splice(0, 25);
        let userBills = await this.services.dbcl.getUserBillByIds(
          jwtDecode.id,
          batchbillIds
        );
        userBills.forEach((bl) => {
          billMap.set(bl.id, bl);
        });
      }

      let groupedRes = transactions.reduce((res, tr) => {
        let payerEntry = res.find((item) => item.id === tr.payerId);
        let trBill = billMap.has(tr.billId)
          ? billMap.get(tr.billId)
          : {
              billerName: "undefined",
              image: "undefined",
              imagex: "undefined",
            };
        if (payerEntry) {
          payerEntry.transactions.push({
            id: tr.id,
            amount: tr.amount,
            billerName: trBill.name,
            image: trBill.image,
            imagex: trBill.imagex,
            date: tr.updatedAt,
          });
        } else {
          let trPayer = payerMap.has(tr.payerId)
            ? payerMap.get(tr.payerId)
            : {
                id: "undefined",
                userName: "undefined",
                firstName: "undefined",
                lastName: "undefined",
                profileImage: "undefined",
                thanks: false,
                address: { city: "undefined", state: "undefined" },
              };
          let obj = {
            id: tr.payerId,
            thanks: trPayer.thanks !== undefined ? trPayer.thanks : false,
            userName: trPayer.userName,
            firstName: trPayer.firstName,
            lastName: trPayer.lastName,
            profileImage: trPayer.profileImage,
            city: trPayer.address.city,
            state: trPayer.address.state,
            transactions: [
              {
                id: tr.id,
                amount: tr.amount,
                billerName: trBill.name,
                image: trBill.image,
                imagex: trBill.imagex,
                date: tr.updatedAt,
              },
            ],
          };
          res.push(obj);
        }
        return res;
      }, []);

      return groupedRes;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = transactionClass;
