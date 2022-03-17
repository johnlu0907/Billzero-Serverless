function providerToVendor(provider) {
  const defaultImage =
    "https://billzero-prod.s3.amazonaws.com/vendors/imageDefault.jpg";
  const currentDate = new Date().toISOString();

  return {
    id: provider.immutableId,
    bgColor: "ffffff",
    bill_type: "credentials",
    biller_type: provider.category,
    bztype: [],
    can_migrate: false,
    change_user: false,
    country: "US",
    currency: "USD",
    has_xdata: "true",
    credentials: provider.credentialFieldInfoList,
    image: defaultImage,
    imagex: defaultImage,
    login_category: "true",
    name: provider.displayName,
    prefix: provider.displayName.toLowerCase(),
    sname: provider.displayName.toLowerCase(),
    required_parameters: [],
    returned_parameters: [],
    supported: "false",
    createdAt: currentDate,
    updatedAt: currentDate,
    topVendorIndex: 100,
    type: "biller",
    xPayBillerIds: [],
    logo: provider.logo,
    textColor: "ffffff",
    payMethods: getPayMethods(provider),
  };
}

function getPayMethods(provider) {
  const payMethods = [];

  provider.isCreditCardPaymentEnabled && payMethods.push("cc");
  provider.isDebitCardPaymentEnabled && payMethods.push("debit");
  provider.isACHPaymentEnabled && payMethods.push("ach");

  return payMethods;
}

function isPayable(provider) {
  return getPayMethods(provider).length > 0;
}

module.exports = {
  providerToVendor,
  isPayable,
};
