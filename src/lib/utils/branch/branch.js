const axios = require("axios");

const baseURL = process.env.BRANCH_BASE_URL;
const branchKey = process.env.BRANCH_API_KEY;
const branchAccessToken = process.env.BRANCH_ACCESS_TOKEN;
const branchAPPID = process.env.BRANCH_APP_ID;

const navigationTargets = {
  USER: "user",
  VENDOR: "vendor",
};

function createDeepLink(options, openGraphAttributes) {
  options.data = {...options.data, ...(openGraphAttributes && generateBranchOgAttributes(openGraphAttributes))};
  options.branch_key = options.branch_key || branchKey;
  return postBranchURL(options);
}

function generateBranchOgAttributes(ogObject) {
  return {
    $og_title: ogObject.title,
    $og_description: ogObject.description,
    $og_image_url: ogObject.imageUrl,
  };
}

function postBranchURL(options = {}) {
  return axios.post(baseURL + "url", options);
}

function deleteDeepLink(url) {
  return axios.delete(`${baseURL}url?app_id=${branchAPPID}&url=${url}`, {
    headers: {
      "Access-Token": branchAccessToken
    }
  })
}

module.exports = {
  createDeepLink,
  deleteDeepLink,
  navigationTargets,
};
