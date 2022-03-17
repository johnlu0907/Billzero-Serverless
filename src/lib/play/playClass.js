"use strict";

class PlayClass {
  constructor(args) {
    for(var parameter in args){
      this[parameter] = args[parameter];
    }
    this.services.addService("playcl",this);
    this.secret = process.env.JWTSECRET;
  }

  async gameStart(event) {
    // insert record
    // var  = await this.services.dbcl.getBillTransactions(bill.id);
  }


}

module.exports = PlayClass;
