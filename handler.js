'use strict';

const factoryClass = require('./src/lib/utils/factoryclass');
const responseclass = require('./src/lib/utils/responseclass');
const iconsoleclass = require('./src/lib/utils/iconsoleclass');
const utilsclass = require('./src/lib/utils/utilsclass');
const messagingClass = require('./src/lib/messaging/messagingclass');
const taskClass = require('./src/lib/task/taskclass');
const dbHelperClass = require('./src/lib/db/dbhelperclass');
const authclass = require('./src/lib/auth/authclass');
const statsClass = require('./src/lib/stats/statsclass');
const supportClass = require('./src/lib/support/supportclass');

const finoClass = require('./src/lib/payment/finoclass');
const finov4Class = require('./src/lib/payment/finov4class');
const stripeClass = require('./src/lib/payment/stripeclass');
const userclass = require('./src/lib/user/userclass');
const adminClass = require('./src/lib/admin/adminclass');
const transactionClass = require('./src/lib/transaction/transactionclass');
const billClass = require('./src/lib/bill/billclass');
const vendorClass = require('./src/lib/vendor/vendorclass');
const ingestClass = require('./src/lib/ingestion/ingestclass');
const playClass = require('./src/lib/play/playClass');
const DBPlayHelperClass = require('./src/lib/db/play');
const UniqueView = require('./src/lib/uniqueview/uniqueView');
const Engagement = require('./src/lib/engagement/engagement');

const services = new factoryClass();
const iconsole = new iconsoleclass(services);

const utils = new utilsclass({iconsole, services});
const msgcl = new messagingClass({iconsole, services});
const taskcl = new taskClass({iconsole, services});
const dbcl = new dbHelperClass({iconsole, services});
const authcl = new authclass({iconsole, services});
const statscl = new statsClass({iconsole, services});
const supportcl = new supportClass({iconsole, services});
const finocl = new finoClass({iconsole, services});
const finov4cl = new finov4Class({iconsole, services});

const stripecl = new stripeClass({iconsole, services});
const usercl = new userclass({iconsole, services});
const admincl = new adminClass({iconsole, services});
const transactioncl = new transactionClass({iconsole, services});
const billcl = new billClass({iconsole, services});
const vendorcl = new vendorClass({iconsole, services});
const ingestcl = new ingestClass({iconsole, services});
const playcl = new playClass({iconsole, services});
const dbPlay = new DBPlayHelperClass({iconsole, services});
const uvcl = new UniqueView({iconsole, services});
const engagementCL = new Engagement({iconsole, services});


module.exports.AdminManage = async (event) => {
  iconsole.log(event);
  const response = new responseclass();
  if (event.httpMethod === 'OPTIONS') {
    return response.options();
  } else {
    var fn = event.pathParameters.fn;
    try {
      if (fn === "get") {
        response.OK.body.payload = await admincl.getAdminUser(event);
        return response.success();
      } else if (fn === "update") {
        response.OK.body.payload = await admincl.updateAdminUser(event);
        return response.success();
      } else if (fn === "login") {
        response.OK.body.payload = await admincl.adminUserLogin(event);
        return response.success();
      } else if (fn === "addadminuser") {
        response.OK.body.payload = await admincl.addAdminUser(event);
        return response.success();
      } else if (fn === "getgeneralstats") {
        response.OK.body.payload = await admincl.getGeneralStats(event);
        return response.success();
      } else if (fn === "getsettings") {
        response.OK.body.payload = await admincl.getSettings(event);
        return response.success();
      } else if (fn === "getpayrulesettings") {
        response.OK.body.payload = await admincl.getPayRuleSettings(event);
        return response.success();
      } else if (fn === "sendemail") {
        response.OK.body.payload = await admincl.sendEmail(event);
        return response.success();
      } else if (fn === "updatesettings") {
        response.OK.body.payload = await admincl.updateSettings(event);
        return response.success();
      } else if (fn === "getbillsbydate") {
        response.OK.body.payload = await admincl.getBillsByDate(event);
        return response.success();
      } else if (fn === "filterbillsbybztype") {
        response.OK.body.payload = await admincl.filterBillsByBzType(event);
        return response.success();
      } else if (fn === "getbillsbyaccountnumber") {
        response.OK.body.payload = await admincl.getBillsByAccountNumber(event);
        return response.success();
      } else if (fn === "getbillbyid") {
        response.OK.body.payload = await admincl.getUserBillById(event);
        return response.success();
      } else if (fn === "gettransactionsbydate") {
        response.OK.body.payload = await admincl.getTransactionsByDate(event);
        return response.success();
      } else if (fn === "gettransactionsbyaccountnumber") {
        response.OK.body.payload = await admincl.getTransactionsByAccountNumber(event);
        return response.success();
      } else if (fn === "createimagepresignedurl") {
        response.OK.body.payload = await admincl.createAwsS3ImagePresignedUrl(event);
        return response.success();
      } else if (fn === "updatevendor") {
        response.OK.body.payload = await admincl.updateVendor(event);
        return response.success();
      } else if (fn === "getactiveusers") {
        response.OK.body.payload = await admincl.getActiveUsers(event);
        return response.success();
      } else if (fn === "getallusers") {
        response.OK.body.payload = await admincl.getAllUsers(event);
        return response.success();
      } else if (fn === "getloggedinusers") {
        response.OK.body.payload = await admincl.getLoggedinUsers(event);
        return response.success();
      } else if (fn === "addsupportticket") {
        response.OK.body.payload = await admincl.addSupportTicket(event);
        return response.success();
      } else if (fn === "adminupdatesupportticket") {
        response.OK.body.payload = await admincl.adminUpdateSupportTicket(event);
        return response.success();
      } else if (fn === "getsupportticket") {
        response.OK.body.payload = await admincl.getSupportTicket(event);
        return response.success();
      } else if (fn === "getsupporttickets") {
        response.OK.body.payload = await admincl.getSupportTicketsBetween(event);
        return response.success();
      } else if (fn === "getsearchvendorbyyear") {
        response.OK.body.payload = await admincl.getSearchVendorByYear(event);
        return response.success();
      } else if (fn == "getsearchvendorbyfound") {
        response.OK.body.payload = await admincl.getSearchVendorByFound(event);
        return response.success();
      } else if (fn == "getproblemreports") {
        response.OK.body.payload = await admincl.getProblemReports(event);
        return response.success();
      } else if (fn == "getproblemreport") {
        response.OK.body.payload = await admincl.getProblemReport(event);
        return response.success();
      } else if (fn == "deleteproblemreport") {
        response.OK.body.payload = await admincl.deleteProblemReport(event);
        return response.success();
      } else if (fn == "getaffiliate") {
        response.OK.body.payload = await admincl.getAffiliate(event);
        return response.success();
      } else if (fn == "getaffiliates") {
        response.OK.body.payload = await admincl.getAffiliates(event);
        return response.success();
      } else if (fn == "updateaffiliate") {
        response.OK.body.payload = await admincl.updateAffiliate(event);
        return response.success();
      } else if (fn == "addaffiliate") {
        response.OK.body.payload = await admincl.addAffiliate(event);
        return response.success();
      } else if (fn == "addkarmaorg") {
        response.OK.body.payload = await admincl.addKarmaOrg(event);
        return response.success();
      } else if (fn == "updatekarmaorg") {
        response.OK.body.payload = await admincl.updateKarmaOrg(event);
        return response.success();
      } else if (fn == "getkarmaorg") {
        response.OK.body.payload = await admincl.getKarmaOrg(event);
        return response.success();
      } else if (fn == "getkarmaorgs") {
        response.OK.body.payload = await admincl.getKarmaOrgs(event);
        return response.success();
      } else if (fn === "applytestcontenttouser") {
        response.OK.body.payload = await admincl.applyTestContentToUser(event);
        return response.success();
      } else if (fn === "deletetestcontentuser") {
        response.OK.body.payload = await admincl.deleteTestContentUser(event);
        return response.success();
      } else if (fn == "processtwilliosms") {
        let twres = await admincl.ProcessTwillioSms(event);
        response.OK.headers['Content-Type'] = 'text/xml';
        return response.success("<Response><Message>Your message received by BillZero support</Message></Response>");
      } else if (fn == "getshelters") {
        response.OK.body.payload = await admincl.getShelters(event);
        return response.success();
      } else if (fn === "adminGenGame") {
        response.OK.body.payload = await admincl.genGame(event);
        return response.success();
      } else if (fn === "adminKillGame") {
        response.OK.body.payload = await admincl.killGame(event);
        return response.success();
      } else if (fn === "getPlayInfo") {
        response.OK.body.payload = await admincl.getPlayInfo(event);
        return response.success();
      } else if (fn === "getPoolInfo") {
        response.OK.body.payload = await admincl.getPoolInfo(event);
        return response.success();
      } else if (fn === "getEngagementbyDate") {
        response.OK.body.payload = await admincl.getEngagementInfo(event);
        return response.success();
      } else if (fn === "getImpetus") {
        response.OK.body.payload = await admincl.getImpetus(event);
        return response.success();
      } else if (fn === "getplay") {
        response.OK.body.payload = await admincl.getPlay(event);
        return response.success();
      } else if (fn === "testFunc") {
        response.OK.body.payload = await admincl.testFunc(event);
        return response.success();
      } else if (fn === "setpotrate") {
        response.OK.body.payload = await admincl.setPotRate(event);
        return response.success();
      } else if (fn === "updateUserFromAdmin") {
        response.OK.body.payload = await admincl.updateUserFromAdmin(event);
        return response.success();
      } else {
        return response.fail("BadRequest");
      }
    } catch (error) {
      return response.fail(error);
    }
  }

};

module.exports.UserManage = async (event) => {
  iconsole.log(event);
  const response = new responseclass();
  if (event.httpMethod === 'OPTIONS') {
    return response.options();
  } else {
    var fn = event.pathParameters.fn;
    try {
      if (fn == "get") {
        response.OK.body.payload = await usercl.getUser(event);
        return response.success();
      } else if (fn == "update") {
        response.OK.body.payload = await usercl.updateUser(event);
        return response.success();
      } else if (fn == "checkusername") {
        response.OK.body.payload = await usercl.checkUserNameAvailability(event);
        return response.success();
      } else if (fn == "getbyusername") {
        response.OK.body.payload = await usercl.getUserByUserName(event);
        return response.success();
      } else if (fn == "search") {
        response.OK.body.payload = await usercl.searchUserByUserName(event);
        return response.success();
      } else if (fn == "sendinvite") {
        response.OK.body.payload = await usercl.sendInvitation(event);
        return response.success();
      } else if (fn == "sendpin") {
        response.OK.body.payload = await usercl.sendPin(event);
        return response.success();
      } else if (fn == "validatephone") {
        response.OK.body.payload = await usercl.validatePhone(event);
        return response.success();
      } else if (fn == "creates3presignedurl") {
        response.OK.body.payload = await usercl.createAwsS3PutPresignedUrl(event);
        return response.success();
      } else if (fn == "creates3thxpresignedurl") {
        response.OK.body.payload = await usercl.createAwsS3PutThxPresignedUrl(event);
        return response.success();
      } else if (fn == "awsS3PictureDeletion") {
        response.OK.body.payload = await usercl.AwsS3PictureDeletion(event)
        return response.success
      } else if (fn == "addpaymentmethod") {
        response.OK.body.payload = await usercl.addPaymentMethod(event);
        return response.success();
      } else if (fn == "updatepaymentmethod") {
        response.OK.body.payload = await usercl.updatePaymentMethod(event);
        return response.success();
      } else if (fn == "deletepaymentmethod") {
        response.OK.body.payload = await usercl.deletePaymentMethod(event);
        return response.success();
      } else if (fn == "getpaymentmethods") {
        response.OK.body.payload = await usercl.getPaymentMethods(event);
        return response.success();
      } else if (fn == "getpayments") {
        response.OK.body.payload = await usercl.getUserPayments(event);
        return response.success();
      } else if (fn == "addsubscription") {
        response.OK.body.payload = await usercl.addUserSubscription(event);
        return response.success();
      } else if (fn == "listplans") {
        response.OK.body.payload = await usercl.listSubscriptionPlans(event);
        return response.success();
      } else if (fn == "cancelsubscription") {
        response.OK.body.payload = await usercl.cancelUserSubscription(event);
        return response.success();
      } else if (fn == "getsubscriptions") {
        response.OK.body.payload = await usercl.getUserSubscriptions(event);
        return response.success();
      } else if (fn == "updatesubscriptionplan") {
        response.OK.body.payload = await usercl.updateSubscriptionPlan(event);
        return response.success();
      } else if (fn == "updatesubpaymentsource") {
        response.OK.body.payload = await usercl.updateSubscriptionPaymentSource(event);
        return response.success();
      } else if (fn == "getpayeesubscription") {
        response.OK.body.payload = await usercl.getPayeeSubscription(event);
        return response.success();
      } else if (fn == "getfirebasetoken") {
        response.OK.body.payload = await usercl.getFirebaseToken(event);
        return response.success();
      } else if (fn == "addmobilesupportticket") {
        response.OK.body.payload = await usercl.addMobileSupportTicket(event);
        return response.success();
      } else if (fn == "updatemobilesupportticket") {
        response.OK.body.payload = await usercl.updateMobileSupportTicket(event);
        return response.success();
      } else if (fn == "getusersupporttickets") {
        response.OK.body.payload = await usercl.getUserSupportTickets(event);
        return response.success();
      } else if (fn == "deleteme") {   // for testing
        response.OK.body.payload = await usercl.deleteMe(event);
        return response.success();
      } else if (fn == "notifyuser") {
        response.OK.body.payload = await usercl.notifyUser(event);
        return response.success();
      } else if (fn == "sendtestpush") {   // for testing
        response.OK.body.payload = await usercl.sendTestPush(event);
        return response.success();
      } else if (fn == "tos") {
        response.OK.body.payload = await usercl.getTermsOfService(event);
        return response.success();
      } else if (fn == "pp") {
        response.OK.body.payload = await usercl.getPrivacyPolicy(event);
        return response.success();
      } else {
        return response.fail("BadRequest");
      }
    } catch (error) {
      return response.fail(error);
    }
  }

};

module.exports.BillManage = async (event) => {
  iconsole.log(event);
  const response = new responseclass();
  if (event.httpMethod === 'OPTIONS') {
    return response.options();
  } else {
    var fn = event.pathParameters.fn;
    try {
      if (fn == "post") {
        response.OK.body.payload = await billcl.postBill(event);
        return response.success();
      } else if (fn == "update") {
        response.OK.body.payload = await billcl.updateBill(event);
        return response.success();
      } else if (fn == "forceUpdate") {
        response.OK.body.payload = await billcl.forceUpdateBill(event);
        return response.success();
      } else if (fn == "pay") {
        response.OK.body.payload = await billcl.payBill(event);
        return response.success();
      } else if (fn == "getfee") {
        response.OK.body.payload = await billcl.getProcessingFee(event);
        return response.success();
      } else if (fn == "calculatefee") {
        response.OK.body.payload = await billcl.calculateProcessingFee(event);
        return response.success();
      } else if (fn == "charge") {
        response.OK.body.payload = await billcl.chargeBill(event);
        return response.success();
      } else if (fn == "retryCC") {
        response.OK.body.payload = await billcl.retryBill(event);
        return response.success();
      } else if (fn == "refresh") {
        response.OK.body.payload = await billcl.refreshBill(event);
        return response.success();
      } else if (fn == "forcerefresh") {
        response.OK.body.payload = await billcl.forceRefreshBill(event);
        return response.success();
      } else if (fn == "remove") {
        response.OK.body.payload = await billcl.removeBill(event);
        return response.success();
      } else if (fn == "killbill") {
        response.OK.body.payload = await billcl.deleteUserBill(event);
        return response.success();
      } else if (fn == "list") {
        response.OK.body.payload = await billcl.getUserBills(event);
        return response.success();
      } else if (fn == "getbill") {
        response.OK.body.payload = await billcl.getUserBill(event);
        return response.success();
      } else if (fn == "getbilltransactions") {
        response.OK.body.payload = await billcl.getUserBillTransactions(event);
        return response.success();
      } else if (fn == "getbilltransactionsbyuserid") {
        response.OK.body.payload = await billcl.getBillTransactionsByUserID(event);
        return response.success();
      } else if (fn == "getmybills") {
        response.OK.body.payload = await billcl.getMyBills(event);
        return response.success();
      } else if (fn == "viewed") {
        response.OK.body.payload = await billcl.userBillViewed(event);
        return response.success();
      } else if (fn == "createbilldeeplink") {
        response.OK.body.payload = await billcl.createDeepLink(event);
        return response.success();
      } else if (fn == "getdeeplinkbill") {
        response.OK.body.payload = await billcl.getDeepLinkBill(event);
        return response.success();
      } else if (fn == "stripewebhook") {
        response.OK.body.payload = await billcl.processStripeWebHook(event);
        return response.success();
      } else if (fn == "finobillwebhook") {
        response.OK.body.payload = await billcl.processFinoBillWebHook(event);
        return response.success();
      } else if (fn == "getrecaptchachecks") {
        response.OK.body.payload = await billcl.getRecaptchaChecks(event);
        return response.success();
      } else {
        return response.fail("BadRequest");
      }
    } catch (error) {
      return response.fail(error);
    }
  }
};


module.exports.TransactionManage = async (event) => {
  iconsole.log(event);
  const response = new responseclass();
  if (event.httpMethod === 'OPTIONS') {
    return response.options();
  } else {
    var fn = event.pathParameters.fn;
    try {
      if (fn == "list") {
        response.OK.body.payload = await transactioncl.getUserTransactions(event);
        return response.success();
      } else if (fn == "payers") {
        response.OK.body.payload = await transactioncl.getUserPayers(event);
        return response.success();
      } else {
        return response.fail("BadRequest");
      }
    } catch (error) {
      return response.fail(error);
    }
  }
};

module.exports.VendorManage = async (event) => {
  console.log(event);
  const response = new responseclass();
  if (event.httpMethod === 'OPTIONS') {
    return response.options();
  } else {
    var fn = event.pathParameters.fn;
    try {
      if (fn == "search") {
        response.OK.body.payload = await vendorcl.searchVendor(event);
        return response.success();
      } else if (fn == "filter") {
        response.OK.body.payload = await vendorcl.filterVendor(event);
        return response.success();
      } else if (fn == "filterbytype") {
        response.OK.body.payload = await vendorcl.filterVendorByType(event);
        return response.success();
      } else if (fn == "filterbybztype") {
        response.OK.body.payload = await vendorcl.filterVendorByBzType(event);
        return response.success();
      } else if (fn == "getcommonvendors") {
        response.OK.body.payload = await vendorcl.getCommonVendors(event);
        return response.success();
      } else if (fn == "get") {
        response.OK.body.payload = await vendorcl.getVendor(event);
        return response.success();
      } else if (fn == "createbranchdl") {
        response.OK.body.payload = await vendorcl.createBranchDL(event);
        return response.success();
      } else {
        return response.fail("BadRequest");
      }
    } catch (error) {
      return response.fail(error);
    }
  }
};

module.exports.IngestManage = async (event, context) => {
  if (event.httpMethod) {
    const response = new responseclass();
    if (event.httpMethod === 'OPTIONS') {
      return response.options();
    } else {
      const fn = event.pathParameters.fn;

      try {
        if (fn === 'netnewreport') {
          response.OK.body.payload = await ingestcl.getNetNewReport();
          return response.success();
        }
      } catch (error) {
        response.fail(error);
      }
    }
  } else if (event['detail-type'].toLowerCase().indexOf('scheduled') !== -1) {
    await ingestcl.scheduleIngest(event, context);
  }
};

module.exports.processTask = async (event) => {
  iconsole.log(event);
  iconsole.log(JSON.stringify(event));
  const response = new responseclass();
  var allPromises = [];
  if (event.Records) {
    event.Records.forEach((record) => {
      if (record.eventSource && record.eventName && record.dynamodb && record.dynamodb.OldImage && record.eventSource == 'aws:dynamodb' && record.eventName == 'REMOVE') {
        var task = dbcl.unmarshall(record.dynamodb.OldImage);
        if (task.status && task.status === "pending") {
          iconsole.log("processTask:", JSON.stringify(task));
          allPromises.push(taskcl.processTask(task));
        } else {
          iconsole.log("completed Scheduled task:", JSON.stringify(task));
        }
      }
    });
    let values = await Promise.all(allPromises);
    iconsole.log("module.exports.processTask Promise.all values:", values);
    return response.success();
  } else {
    return response.success();
  }
};

module.exports.processNewPay = async (event, context) => {
  try {
    if (event.Records) {
      let processedPools = []
      console.log('DynamoDB Process NewPay Event: %j', event);
      for (const record of event.Records) {
        console.log('DynamoDB Record: %j', record);
        if (record.eventName === 'INSERT') {
          const newImage = record.dynamodb.NewImage;
          const eventSource = record.eventSourceARN;
          if (eventSource.search(dbcl.chargeTable) > 0) { // triggered by new pay
            const payeeId = newImage.billUserId.S;
            const payerId = newImage.uid.S;
            const paymentAmount = newImage.amount.N
            const poolInfo = await dbPlay.getPoolOfUser(payeeId);
            if (poolInfo) {
              if (processedPools.includes(poolInfo.poolId)) {
                console.log('processCycle alreadyProcessed', poolInfo);
                // already processed pool
                continue;
              }
              processedPools.push(poolInfo.poolId);
              await dbPlay.refreshCycle(poolInfo, payeeId, payerId, {by: 'pay', paymentAmount});

            }
          }
        }
      }
    }
  } catch (e) {
    return `Error occured ${event.Records.length} records.`;
  }
  return `Successfully processed ${event.Records.length} records.`;
};

module.exports.processCycle = async (event, context) => {
  try {
    if (event.Records) {
      let processedPools = [];
      console.log('DynamoDB Record Event: %j', event);
      for (const record of event.Records) {
        console.log('DynamoDB Record: %j', record);
        if (record.eventName === 'MODIFY') {
          const newImage = record.dynamodb.NewImage;
          const oldImage = record.dynamodb.OldImage;
          const eventSource = record.eventSourceARN;
          if (eventSource.search(dbcl.userTable) > 0) { // triggered by new cc
            try {
              if (!oldImage.payment.M.hasOwnProperty('stripeId')
                && newImage.payment.M.stripeId !== null) {
                //cc is added
                console.log('Modified User added new CC');
                let viewerId = newImage.id.S;
                let userId;
                // check related uv and remove all pending state
                const {uvV, cc, bills, needUpdate} = await usercl.checkUserUVVirgin(viewerId);
                // check related uv and remove all pending state
                if ((uvV && (needUpdate === false)) || (bills > 0)) { //already verified
                  //no need to recalculate again
                  console.log('Modified User added new CC - no need to trigger - already verified');
                } else {
                  const pendingUVs = await uvcl.getPendingUVs(viewerId);
                  console.log('Modified User added new CC - no need to trigger - already verified', pendingUVs);
                  for (const _pendingUV of pendingUVs) {
                    userId = _pendingUV.userid;
                    const poolInfo = await dbPlay.getPoolOfUser(userId);

                    console.log(`UV by ${viewerId} is validated `, poolInfo);
                    const newUVV = await engagementCL.newEngagementByUVV({
                      userId: userId,
                      viewerId: viewerId,
                      poolId: poolInfo.poolId,
                      UVVType: 'newCC'
                    });

                    if (processedPools.includes(poolInfo.poolId)) {
                      console.log('processCycle alreadyProcessed', poolInfo);
                      // already processed pool
                      continue;
                    }

                    if (newUVV) {
                      const viewerInfo = await this.services.dbcl.getUser(userId);
                      viewerInfo.UVV = newUVV.id;
                      await this.services.dbcl.putUser(viewerInfo);
                    }

                    processedPools.push(poolInfo.poolId);
                    const by = 'cc'
                    await dbPlay.refreshCycle(poolInfo, userId, viewerId, {by});
                  }
                }
              }
            } catch (error) {
            }
          }
        }
        else if (record.eventName === 'INSERT') {
          const newImage = record.dynamodb.NewImage;
          const eventSource = record.eventSourceARN;
          let userId, viewerId, payerId, id;
          if (eventSource.search(dbcl.billTable) > 0) { // triggered by new bill
            payerId = newImage.uid.S;
            // check related uv and remove all pending state
            const {uvV, cc, bills, needUpdate} = await usercl.checkUserUVVirgin(payerId);
            //  const {hasCC, uvV} = await dbcl.checkUserHasCC(viewerId);
            if (uvV && needUpdate === false || cc) {
              //need to put engagement here
              console.log('Modified User added new bill - no need to trigger - already verified');
            } else {
              console.log(`Triggered by newBill userhasCC uvVirgin:${uvV} cc: ${cc} updated: ${needUpdate} bills: ${bills}`);
              if (bills === 1) {
                // new validated
                // get pending uvs of this viewer.
                const pendingUVs = await uvcl.getPendingUVs(payerId);
                for (const _pendingUV of pendingUVs) {
                  userId = _pendingUV.userid;
                  const poolInfo = await dbPlay.getPoolOfUser(userId);

                  console.log('UV is validated ', poolInfo);
                  const newUVV = await engagementCL.newEngagementByUVV({
                    userId: userId,
                    viewerId: payerId,
                    poolId: poolInfo.poolId,
                    UVVType: 'newBill'
                  });
                  const viewerInfo = await this.services.dbcl.getUser(payerId);
                  viewerInfo.UVV = newUVV.id;
                  await this.services.dbcl.putUser(viewerInfo);

                  if (processedPools.includes(poolInfo.poolId)) {
                    console.log('processCycle alreadyProcessed', poolInfo);
                    // already processed pool
                    continue;
                  }
                  processedPools.push(poolInfo.poolId);
                  const by = 'bill';
                  await dbPlay.refreshCycle(poolInfo, userId, payerId, {by});
                }
              }
            }

          } else if (eventSource.search(dbcl.uvTable) > 0) { // triggered by uv table
            userId = newImage.userid.S;
            viewerId = newImage.viewerId.S;
            id = newImage.id.S;
            //check if not unique viewer
            const isValidViewer = await uvcl.checkNewViewer(userId, viewerId);
            if (!isValidViewer) {
              continue;
            }
            const {uvV, cc, bills, needUpdate} = await usercl.checkUserUVVirgin(viewerId);
            // const {hasCC, uvV} = await dbcl.checkUserHasCC(viewerId);
            // const hasBill = await dbcl.checkUserHasBILL(viewerId);
            console.log(`New UV: ${viewerId}, now check if it is validated or not`);
            console.log(`uv:${uvV} userhasCC ${cc} userhasBill ${bills}`);
            if (uvV === true) {  //New UV and verified
              //UV is validated UVV process
              const poolInfo = await dbPlay.getPoolOfUser(userId);
              if (processedPools.includes(poolInfo.poolId)) {
                console.log('processCycle alreadyProcessed', poolInfo);
                // already processed pool
                continue;
              }
              console.log('UV is validated ', poolInfo);
              const newUVV = await engagementCL.newEngagementByUVV({
                userId: userId,
                viewerId: viewerId,
                poolId: poolInfo.poolId,
                UVVType: 'newUV'
              });

              if (newUVV) {
                const viewerInfo = await this.services.dbcl.getUser(userId);
                viewerInfo.UVV = newUVV.id;
                await this.services.dbcl.putUser(viewerInfo);
              }
              processedPools.push(poolInfo.poolId);
              const by = 'uv';
              await dbPlay.refreshCycle(poolInfo, userId, viewerId, {by});

            } else {
              // UV Unvalidated
              const poolInfo = await dbPlay.getPoolOfUser(userId);
              if (poolInfo == null) {
                console.log(`getPoolOfUser in processCycle ${userId} is NULL`);
              } else {
                processedPools.push(poolInfo.poolId);
              }

              await engagementCL.newEngagementByUVU({
                userId: userId,
                viewerId: viewerId,
                poolId: poolInfo.poolId
              });
            }
          }
        }
      }
    }
  } catch (e) {
    console.log('ProcessCycle triggered by Dynamodb error', e);
    return `Error occured ${event.Records.length} records.`;
  }
  return `Successfully processed ${event.Records.length} records.`;
};
