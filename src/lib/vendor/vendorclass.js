"use strict";

const branch = require("../utils/branch");

class vendorClass {
  constructor(args) {
    for (var parameter in args) {
      this[parameter] = args[parameter];
    }
    this.services.addService("vendorcl", this);

    this.defaults = {
      textColor: "000000",
      bgColor: "ffffff",
      image:
        "https://" +
        process.env.BZ_S3_BACKET +
        ".s3.amazonaws.com/vendors/imageDefault.jpg",
      imagex:
        "https://" +
        process.env.BZ_S3_BACKET +
        ".s3.amazonaws.com/vendors/imagexDefault.jpg",
    };
  }

  // replace static data with dynamic from stats module
  async getVendorStats(id) {
    try {
      return await this.services.statscl.getVendorStats(id);
    } catch (error) {
      throw error;
    }
  }

  async getVendor(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.id) {
        let vendor = await this.services.dbcl.getVendor(data.id);
        let vendorStats = await this.getVendorStats(data.id);
        vendor.activeBills = vendorStats.activeBills;
        vendor.totalPaid = vendorStats.totalPaid;
        vendor.bgColor = vendor.bgColor
          ? vendor.bgColor
          : this.defaults.bgColor;
        vendor.textColor = vendor.textColor
          ? vendor.textColor
          : this.defaults.textColor;
        vendor.image = vendor.image ? vendor.image : this.defaults.image;
        vendor.imagex = vendor.imagex ? vendor.imagex : this.defaults.imagex;
        return vendor;
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async searchVendor(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.name && data.name.trim()) {
        let vendorType =
          data.type && data.type.trim() ? data.type.trim() : null;
        data.limit =
          data.limit && parseInt(data.limit) ? parseInt(data.limit) : 100;
        let result = await this.services.dbcl.searchVendor(
          data.name.trim(),
          vendorType,
          data.limit
        );
        if (!result.length && !vendorType) {
          result = await this.services.dbcl.searchVendorByContent(
            data.name.trim(),
            data.limit
          );
        } else if (result.length && result.length < data.limit) {
          let contres = await this.services.dbcl.searchVendorByContent(
            data.name.trim(),
            data.limit
          );
          contres = contres.reduce((ret, item) => {
            let sr = result.find((x) => x.id === item.id);
            if (!sr) {
              ret.push(item);
            }
            return ret;
          }, []);
          result = result.concat(contres.slice(0, data.limit - result.length));
        }
        for (let vi in result) {
          let vendor = result[vi];
          let vendorStats = await this.getVendorStats(vendor.id);
          vendor.activeBills = vendorStats.activeBills;
          vendor.totalPaid = vendorStats.totalPaid;
          vendor.bgColor = vendor.bgColor
            ? vendor.bgColor
            : this.defaults.bgColor;
          vendor.image = vendor.image ? vendor.image : this.defaults.image;
          vendor.imagex = vendor.imagex ? vendor.imagex : this.defaults.imagex;
        }

        let found = result.length ? "true" : "false";
        let vendorSearch = await this.services.dbcl.getSearchVendor(
          data.name.trim(),
          found
        );
        if (vendorSearch) {
          vendorSearch.count += 1;
        } else {
          vendorSearch = {
            query: data.name.trim(),
            found: found,
            count: 1,
          };
        }

        await this.services.dbcl.putSearchVendor(vendorSearch);
        return result;
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async filterVendor(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.type && data.type.trim()) {
        let result = await this.services.dbcl.filterVendor(
          data.type.trim(),
          data.limit
        );
        if (result.length == 0) {
          result = await this.services.dbcl.filterVendorByBzType(
            data.type.trim(),
            data.limit
          );
        }
        for (let vi in result) {
          let vendor = result[vi];
          let vendorStats = await this.getVendorStats(vendor.id);
          vendor.activeBills = vendorStats.activeBills;
          vendor.totalPaid = vendorStats.totalPaid;
          vendor.bgColor = vendor.bgColor
            ? vendor.bgColor
            : this.defaults.bgColor;
          vendor.image = vendor.image ? vendor.image : this.defaults.image;
          vendor.imagex = vendor.imagex ? vendor.imagex : this.defaults.imagex;
        }
        return result;
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async filterVendorByType(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.type && data.type.trim()) {
        let result = await this.services.dbcl.filterVendorByType(
          data.type,
          data.limit
        );
        for (let vi in result) {
          let vendor = result[vi];
          // let vendorStats = await this.getVendorStats(vendor.id);
          // vendor.activeBills = vendorStats.activeBills;
          // vendor.totalPaid = vendorStats.totalPaid;
          vendor.bgColor = vendor.bgColor
            ? vendor.bgColor
            : this.defaults.bgColor;
          vendor.image = vendor.image ? vendor.image : this.defaults.image;
          vendor.imagex = vendor.imagex ? vendor.imagex : this.defaults.imagex;
        }
        return result;
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async filterVendorByBzType(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data && data.type && data.type.trim()) {
        let result = [];
        if (data.type.trim().toLowerCase() === "insurance") {
          let result1 = await this.services.dbcl.filterVendorByBzType(
            "car insurance",
            data.limit
          );
          let result2 = await this.services.dbcl.filterVendorByBzType(
            "medical insurance",
            data.limit
          );
          result = result1.concat(result2);
          result = result.filter(
            (item, index) => result.findIndex((v) => v.id === item.id) === index
          );
          result = result.sort((a, b) => {
            return a.topVendorIndex > b.topVendorIndex;
          });
          result = result.slice(0, data.limit);
        } else if (data.type.trim().toLowerCase() === "car") {
          let result1 = await this.services.dbcl.filterVendorByBzType(
            "car insurance",
            data.limit
          );
          let result2 = await this.services.dbcl.filterVendorByBzType(
            "car payment",
            data.limit
          );
          result = result1.concat(result2);
          result = result.filter(
            (item, index) => result.findIndex((v) => v.id === item.id) === index
          );
          result = result.sort((a, b) => {
            return a.topVendorIndex > b.topVendorIndex;
          });
          result = result.slice(0, data.limit);
        } else if (data.type.trim().toLowerCase() === "school") {
          let result1 = await this.services.dbcl.filterVendorByBzType(
            "school",
            data.limit
          );
          let result2 = await this.services.dbcl.filterVendorByBzType(
            "student loans",
            data.limit
          );
          result = result1.concat(result2);
          result = result.filter(
            (item, index) => result.findIndex((v) => v.id === item.id) === index
          );
          result = result.sort((a, b) => {
            return a.topVendorIndex > b.topVendorIndex;
          });
          result = result.slice(0, data.limit);
        } else if (data.type.trim().toLowerCase() === "medical") {
          let result1 = await this.services.dbcl.filterVendorByBzType(
            "medical",
            data.limit
          );
          let result2 = await this.services.dbcl.filterVendorByBzType(
            "medical insurance",
            data.limit
          );
          result = result1.concat(result2);
          result = result.filter(
            (item, index) => result.findIndex((v) => v.id === item.id) === index
          );
          result = result.sort((a, b) => {
            return a.topVendorIndex > b.topVendorIndex;
          });
          result = result.slice(0, data.limit);
        } else {
          result = await this.services.dbcl.filterVendorByBzType(
            data.type.trim(),
            data.limit
          );
        }

        for (let vi in result) {
          let vendor = result[vi];
          let vendorStats = await this.getVendorStats(vendor.id);
          vendor.activeBills = vendorStats.activeBills;
          vendor.totalPaid = vendorStats.totalPaid;
          vendor.bgColor = vendor.bgColor
            ? vendor.bgColor
            : this.defaults.bgColor;
          vendor.image = vendor.image ? vendor.image : this.defaults.image;
          vendor.imagex = vendor.imagex ? vendor.imagex : this.defaults.imagex;
        }
        return result;
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async getCommonVendors(event) {
    try {
      var jwtDecode = await this.services.authcl.auth(event);
      var data = JSON.parse(event.body);
      if (data) {
        data.limit =
          data.limit && parseInt(data.limit) ? parseInt(data.limit) : 100;
        let result = await this.services.dbcl.getCommonVendors(data.limit);
        for (let vi in result) {
          let vendor = result[vi];
          let vendorStats = await this.getVendorStats(vendor.id);
          vendor.activeBills = vendorStats.activeBills;
          vendor.totalPaid = vendorStats.totalPaid;
          vendor.bgColor = vendor.bgColor
            ? vendor.bgColor
            : this.defaults.bgColor;
          vendor.image = vendor.image ? vendor.image : this.defaults.image;
          vendor.imagex = vendor.imagex ? vendor.imagex : this.defaults.imagex;
        }
        return result;
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async createBranchDL(event) {
    const body = JSON.parse(event.body);
    const vendor = await this.services.dbcl.getVendor(body.vendor.id);

    if (!vendor) {
      throw new Error("InvalidPayload");
    }

    try {
      const result = await branch.createDeepLink({
        channel: body.channel,
        stage: body.stage,
        campaign: body.campaign,
        feature: body.feature,
        tags: [...(body.tags || []), "vendor-dls"],
        type: body.type || 2,

        data: {
          bzdata: {
            navigationTarget: branch.navigationTargets.VENDOR,
            vendor,
          },

          $og_image_url: vendor.image,
          $og_title: `Play ${vendor.name} bills`,
          $og_description: `Play ${vendor.name} bills`,
          "$marketing_title": `BZ Vendor ${vendor.sname}`,
          ...body.data,
        },
      });

      const url = result.data.url;

      const vendorpromo = {
        id: url.substr(url.length - 11),
        vendorId: vendor.id,
        url: url,
      };

      await this.services.dbcl.putPromocode(vendorpromo);
      return result.data;
    } catch (error) {
      this.iconsole.log("===Branch Error:", error);
      return null;
    }
  }
}

module.exports = vendorClass;
