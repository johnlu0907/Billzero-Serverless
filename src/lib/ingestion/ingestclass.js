const finoDataConverter = require("./finoConverter");
const lodash = require("lodash");
const { isScheduledEvent } = require('./utils');
const { uuid4 } = require("stripe/lib/utils");

class IngestClass {
  constructor(args) {
    this.services = args.services;
    this.iconsole = args.iconsole;
    this.services.addService("ingestcl", this);
  }

  getAllProviders() {
    return this.services.finov4cl.getAllProviders();
  }


  getIngestionRecordsForLastIngestionId () {
    return this.services.dbcl.getIngestionRecordsForLastIngestionId()
  }


  async getNetNewReport () {
    const ingestionRecords = await this.getIngestionRecordsForLastIngestionId()
    const newPayables = ingestionRecords.filter(record => !record.isSupportedInProdTable && !record.isProdVendorInSync)
    const allPayables = ingestionRecords.filter(record => record.payMethods.length == 3)

    return {
      ingestionRecords,
      newPayables,
      allPayables
    }
  }


  /***
   * Calls the ingest on the basis of schedule
   * 
   */
  async scheduleIngest(event, context) {
    if (!isScheduledEvent(event)) {
      return
    }

    this.ingestId = context.awsRequestId
    
    console.log('Event invoked by Scheduling')
    console.log(`Event invoked at ${event.time}`)

    try {
      const result = await this.ingest()
      console.log('Successfully updated!')
      console.log(JSON.stringify(result))
    } catch (error) {
      console.error('Event failed with error', error)
    }
  }


  ingest() {
    return this._ingest();
  }

  getProvidersFromResponse(response) {
    return response.providerList;
  }

  async _ingest() {
    const providers = this.getProvidersFromResponse(await this.getAllProviders());
    
    console.log("isArray?", Array.isArray(providers))
    console.log("Providers Length: ", providers.length)

    const payableVendors = providers
      .filter((provider) => finoDataConverter.isPayable(provider))
      .map((provider) => finoDataConverter.providerToVendor(provider));

    console.log('Payable Vendors Length: ' + payableVendors.length)

    return await this.putVendors(payableVendors);
  }

  /**
   * InSync check important to see
   */
  checkIfInSync(currentVendor, oldVendor) {
    const pick = (obj) => {
      const clonedObj = lodash.cloneDeep(obj);

      delete clonedObj.id;
      delete clonedObj.supported
      delete clonedObj.cretedAt;
      delete clonedObj.updatedAt;

      return clonedObj;
    };

    return lodash.isEqual(pick(currentVendor), pick(oldVendor));
  }

  /**
   * Creates batch update records, updates all the payable vendors once again
   */
  async putVendors(payableVendors) {
    const status = {
      putsFailed: 0,
      putsSucceeded: 0,
    };

    for (const vendor of payableVendors) {
      try {
        await this.putFinoIngestionVendor(vendor);
        console.log(`Vendor with Id ${vendor.id} put`);
        status.putsSucceeded++;
      } catch (error) {
        console.error(
          `Put for vendor with id ${vendor.id} failed`,
          error
        );
        status.putsFailed++;
      }
    }

    console.log("Fino Vendor Sync Completed");
    console.log("Put Status: ", JSON.stringify(status));
    return status;
  }

  /**
   * Gets the vendor for the vendor id
   * @param {*} vendorId
   */
  async getVendor(vendorId) {
    try {
      return await this.services.dbcl.getVendor(vendorId);
    } catch (error) {
      if (error === "InvalidId" || error.message === "InvalidId") {
        return null;
      }

      throw error;
    }
  }

  async putFinoIngestionVendor (vendor) {
    const currentProdVendor = await this.getVendor(vendor.id);
    console.log('Fetched current vendor for ' + vendor.id)
  
    let isProdVendorInSync = false;
    let isSupportedInProdTable = false;
  
    if (currentProdVendor) {
      isProdVendorInSync = this.checkIfInSync(vendor, currentProdVendor);
      isSupportedInProdTable = currentProdVendor.supported;
    }
  
    const timestamp = new Date().toISOString();

    return this.services.dbcl.putIngestionVenodr({
      source: 'fino',
      ...vendor,
      isProdVendorInSync,
      isSupportedInProdTable,
      updatedAt: timestamp,
      createdAt: timestamp,
      ingestId: this.ingestId
    })
  }
}

module.exports = IngestClass;
