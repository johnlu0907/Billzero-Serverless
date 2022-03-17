function getProviders(providerIds) {
  const data = require("./data/providers.json");

  return data.providerList.filter((provider) =>
    providerIds.some((id) => id === provider.immutableId)
  );
}

module.exports = {
  getProviders,
};
