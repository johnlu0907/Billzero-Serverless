"use strict";

class iconsoleclass {
  constructor(services) {
    this.debug = process.env.MODE_DEBUG == "true";
    this.services = services;
    this.services.addService("iconsole", this);
  }

  getCallerClassFnName() {
    return new Error().stack.split("\n")[3].split(" ")[5].replace(".", "::");
  }

  log() {
    if (this.debug) {
      console.log("==== " + this.getCallerClassFnName() + " ====");
      for (var i = 0; i < arguments.length; i++) {
        console.log(arguments[i]);
      }
    }
  }

  error() {
    if (this.debug) {
      console.log("==== " + this.getCallerClassFnName() + " ====");
      for (var i = 0; i < arguments.length; i++) {
        console.error(arguments[i]);
      }
    }
  }
}

module.exports = iconsoleclass;
