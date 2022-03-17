const branch = require("../utils/branch");

function createUserBillLink(user, bill, isForceRefresh) {
  const tags = [`u - ${user.userName}`, `b - ${bill.name}`, `user-bill`];

  if (isForceRefresh) {
    tags.push("force-refresh-bill");
  }
  const options = {
    channel: "in-app",
    stage: isForceRefresh ? "creation" : "refresh",
    campaign: "BillZero",
    feature: "user-mr",
    tags: tags,
    type: 2,
    data: {
      bzdata: {
        userId: user.id,
        userName: user.userName,
        billId: bill.id,
        billName: bill.name,
      },
      '$marketing_title' : `BZ-${user.userName}-MR`,
      $og_title: `Money request by ${user.userName}`,
      $og_description: `${user.userName} is requesting money for ${bill.name}`,
    },
  }
  if (user.profileImage !== null && user.profileImage !== '') {
    options.data['$og_image_url'] = user.profileImage;
  }
  return branch.createDeepLink(options);
}

module.exports = {
  createUserBillLink,
};
