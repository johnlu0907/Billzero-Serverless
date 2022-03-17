/**
 * Tests the finoCredentialsConverter.test.js
 *
 */
const finoConverter = require("../finoConverter");
const utils = require("./utils");

const providerIds = [
  "f8e3653f-da3a-4396-af22-6fbf5bbe1f46",
  "cae2f322-59a6-4592-a569-6559735af17f",
  "cb3055a8-e5d1-4bef-9453-870a40c85117",
  "cf88552b-e5c9-4f97-bc34-f623f31155c7",
  "d2e72d3c-7539-4471-a5ca-4823216b615a",
  "d5789264-ae63-41b2-91da-33be3bbc8a99",
  "c75450a8-f3b5-4066-a2bc-4a84e4b0cdd8",
];

describe("fino converter", () => {
  describe("providerToVendor", () => {
    const providers = utils.getProviders(providerIds);

    providers.map((provider) => {
      describe(`providerId -> ${provider.immutableId}`, () => {
        test("Snapshot matched", () => {
          const vendor = finoConverter.providerToVendor(provider);

          delete vendor.updatedAt;
          delete vendor.createdAt;

          expect(vendor).toMatchSnapshot();
        });

        test("Attribute type checking", () => {
          const vendor = finoConverter.providerToVendor(provider);

          expect(vendor.supported).toBe("false");
          expect(typeof vendor.updatedAt).toBe("string");
          expect(typeof vendor.createdAt).toBe("string");
        });
      });
    });
  });

  test("isPayable", () => {
    const payableProvider = utils.getProviders([
      "cb3055a8-e5d1-4bef-9453-870a40c85117",
    ])[0];
    const notPayableProvider = utils.getProviders([
      "cae2f322-59a6-4592-a569-6559735af17f",
    ])[0];

    expect(finoConverter.isPayable(payableProvider)).toBe(true);
    expect(finoConverter.isPayable(notPayableProvider)).toBe(false);
  });
});
