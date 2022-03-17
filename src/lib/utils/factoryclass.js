"use strict";

const fs = require("fs");

class factoryClass {
  constructor() {
    this.svc = {};
  }

  getServiceNameFromFilePath(name) {
    if (name.toLowerCase().endsWith("class.js")) {
      var parts = name.toLowerCase().split("/");
      return parts[parts.length - 1].toLowerCase().replace("class.js", "");
    } else {
      return null;
    }
  }

  getServiceName(service) {
    return service.constructor.name.toLowerCase().replace("class", "");
  }

  addService(serviceName, service) {
    serviceName = serviceName ? serviceName : this.generateServiceName(service);
    this[serviceName] = service;
    return serviceName;
  }

  getInstance(serviceName) {
    this.iconsole.log(serviceName);
    return this.svc[serviceName] ? this[serviceName] : null;
  }

  loadModules(path) {
    path = path ? path : ".";
    fs.lstat(path, (err, stat) => {
      if (stat.isDirectory()) {
        fs.readdir(path, (err, files) => {
          if (!err) {
            var f,
              l = files.length;
            for (var i = 0; i < l; i++) {
              var pathj = [path, files[i]];
              f = pathj.join("/");
              this.loadModules(f);
            }
          }
        });
      } else {
        var serviceName = this.getServiceNameFromFilePath(path);
        if (serviceName) {
          const objClass = require(path);
          var obj = new objClass();
          obj.sf = this.svc;
          this.svc[serviceName] = obj;
        }
      }
    });
  }
}

module.exports = factoryClass;
