const finoConverter = require("../finoConverter");
const ingestClass = require("../ingestclass");
const mockdate = require("mockdate");
const lodash = require('lodash')

const providers = require("./data/providers.json");

const totalPayableVendors = providers
  .providerList
  .filter((provider) => finoConverter.isPayable(provider))
  .map(provider => (provider))

function getVendor(id) {
  const matchedProviders = totalPayableVendors.map(provider => provider.immutableId === id)
  return (matchedProviders[0])
}

describe("ingestclass.test.js", () => {
  let ingestClassInstance;
  let services;
  let iconsole;
  
  beforeEach(async () => {
    const getVendorMock = 
      jest
        .fn()
        .mockImplementationOnce(async () => (totalPayableVendors[0]))
        .mockImplementationOnce(async () => (totalPayableVendors[32]))
    
    services = {
      finov4cl: {
        getAllProviders: jest
        .fn()
        .mockImplementationOnce(() => providers)
        .mockName("getAllProviders"),
      },
      
      dbcl: {
        getVendor: getVendorMock,
        putFinoVendors: jest.fn().mockName('putFinoVendors')
      },
      
      addService: jest.fn().mockName("addService"),
    };
    
    iconsole = {
      log: jest.fn(),
      error: jest.fn(),
    };
    
    ingestClassInstance = new ingestClass({ services, iconsole });
    mockdate.set("1/30/2000");
  });
  
  test("addService", () => {
    expect(services.addService.mock.calls.length).toBe(1);
  });
  
  test("ingest", async () => {
    ingestClassInstance._ingest = jest.fn();
    await ingestClassInstance.ingest();
    expect(ingestClassInstance._ingest.mock.calls.length).toBe(1);
  });
  
  test("_ingest", async () => {
    ingestClassInstance.putVendors = jest
      .fn()
      .mockImplementation(() => true);
    await ingestClassInstance._ingest();

    expect(ingestClassInstance.putVendors.mock.calls.length).toBe(1);
    expect(ingestClassInstance.putVendors.mock.calls[0][0].length).toBe(
      totalPayableVendors.length
    );
  });

  test("ingestcl.checkIfInSync", () => {
    const checks = new Map([
      [[0, 0], true],
      [[1, 0], false],
      [[2, 0], false],
      [[4, 4], true],
      [[6, 7], false],
    ]);

    for (const [key, value] of checks.entries()) {
      const vendor0 = lodash.cloneDeep(totalPayableVendors[key[0]])
      const vendor1 = lodash.cloneDeep(totalPayableVendors[key[1]])

      vendor0.supported = Math.random() > 0.5
      vendor1.supported = Math.random() < 0.5


      const isInSync = ingestClassInstance.checkIfInSync(vendor0, vendor1);

      if (value) {
        expect(isInSync).toBeTruthy();
      } else {
        expect(isInSync).toBeFalsy();
      }
    }
  });

  test("ingestcl.checkIfInSync does not change the object", () => {
    const vendor0 = totalPayableVendors[0]
    const vendor1 = totalPayableVendors[1]

    const clonedVendor0 = lodash.cloneDeep(vendor0)
    const clonedVendor1 = lodash.cloneDeep(vendor1)

    ingestClassInstance.checkIfInSync(vendor0, vendor1)

    expect(lodash.isEqual(clonedVendor0, vendor0)).toBeTruthy()
    expect(lodash.isEqual(clonedVendor1, vendor1)).toBeTruthy()
  })
});

