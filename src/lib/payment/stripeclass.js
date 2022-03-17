"use strict";

const moment = require("moment");
const uuid = require("uuid");
const stripe = require("stripe")(process.env.STRIPE_API_KEY);

// Documantation: https://stripe.com/docs/api?lang=node
class stripeClass {
  constructor(args) {
    for (var parameter in args) {
      this[parameter] = args[parameter];
    }
    this.services.addService("stripecl", this);
  }

  // customer functions
  async createCustomer(data) {
    try {
      return await stripe.customers.create(data);
    } catch (error) {
      throw error;
    }
  }

  async retrieveCustomer(customerId) {
    try {
      return await stripe.customers.retrieve(customerId);
    } catch (error) {
      throw error;
    }
  }

  async listCustomers(limit = 100) {
    try {
      return await stripe.customers.list({ limit: limit });
    } catch (error) {
      throw error;
    }
  }

  // Source functions

  async createSource(customerId, source) {
    try {
      return await stripe.customers.createSource(customerId, {
        source: source,
      });
    } catch (error) {
      throw error;
    }
  }

  async updateSource(customerId, source, data) {
    try {
      return await stripe.customers.updateSource(customerId, source, data);
    } catch (error) {
      throw error;
    }
  }

  async deleteSource(customerId, source) {
    try {
      return await stripe.customers.deleteSource(customerId, source);
    } catch (error) {
      throw error;
    }
  }

  async setDefaultPaymentMethod(customerId, source) {
    try {
      return await stripe.customers.update(customerId, {
        source: source,
      });
    } catch (error) {
      throw error;
    }
  }

  async getPaymentMethods(customerId) {
    try {
      let stripeResponse = await stripe.customers.retrieve(customerId);
      let default_source = stripeResponse.default_source;
      let paymentMethods = stripeResponse.sources.data.reduce((res, item) => {
        res.push({
          id: item.id,
          brand: item.brand,
          last4: item.last4,
          default: item.id === default_source ? true : false,
        });
        return res;
      }, []);
      return {
        paymentMethods: paymentMethods,
      };
    } catch (error) {
      throw error;
    }
  }

  async calculateFees(data) {
    const adminSettings = await this.services.dbcl.getAdminSettings("common");
    const paymentSettings = adminSettings.settings.paymentSettings;
    const subscribeAmount = 1;
    const amount = Number(data.amount);

    if (amount >= Number(paymentSettings.minimumAmount)) {
      const user = await this.services.dbcl.getUser(data.uid);
      const {
        feePayerFree,
        feePayerMicro,
        feePayerRegular,
        feePayerMid,
        feePayerHigh,
        feePayeeMicro,
        feePayeeRegular,
        feeVisaStandardPercent,
        feeVisaStandardStatic,
        feeVisaMidPercent,
        feeVisaMidStatic,
        feeVisaHighPercent,
        feeVisaHighStatic,
      } = paymentSettings;
      let feePayer;
      let feePayee;
      if (user.homeless === "true" || user.veteran === "true") {
        feePayer = Number(feePayerFree);
        feePayee =
          (amount * Number(feeVisaStandardPercent)) / 100 +
          Number(feeVisaStandardStatic);
      } else {
        if (amount < 20) {
          feePayer = Number(feePayerMicro);
          feePayee = Number(feePayeeMicro);
        } else if (amount <= 50) {
          feePayer = Number(feePayerRegular);
          feePayee = Number(feePayeeRegular);
        } else if (amount <= 100) {
          feePayer = Number(feePayerMid);
          feePayee =
            (amount * Number(feeVisaMidPercent)) / 100 +
            Number(feeVisaMidStatic);
        } else {
          feePayer = Number(feePayerHigh);
          feePayee =
            (amount * Number(feeVisaHighPercent)) / 100 +
            Number(feeVisaHighStatic);
        }
      }
      feePayee = Number(feePayee.toFixed(2));
      let dataBillZeroFees = {
        amount: Number(data.amount),
        subscribe: subscribeAmount,
        feePayer: feePayer,
        feePayee: feePayee,
        total: amount + feePayer,
        payee: amount - feePayee,
      };

      return dataBillZeroFees;
    } else {
      throw (
        "The minimum charge amount is $" + Number(paymentSettings.minimumAmount)
      );
    }
  }

  // Charge functions
  async calculateBillZeroFees(data, balance) {
    try {
      this.iconsole.log("data balance::", data, balance);
      var adminSettings = await this.services.dbcl.getAdminSettings("common");
      var paymentSettings = adminSettings.settings.paymentSettings;
      var subscribeAmount = 1;
      if (data.amount && balance && Number(data.amount) >= Number(balance)) {
        data.amount = Number(balance);
        let dataBillZeroFees = {
          amount: Number(data.amount) + Number(paymentSettings.feeAmountPayer),
          amountToAddBalance: Number(data.amount),
          subscribe: subscribeAmount,
          fee: Number(paymentSettings.feeAmountPayer),
          feePayee: 0,
        };

        if (data.subscribe) {
          dataBillZeroFees.amount = dataBillZeroFees.amount - subscribeAmount;
        }

        dataBillZeroFees.amount = this.services.utils.toFixedNumber(
          dataBillZeroFees.amount
        );
        dataBillZeroFees.amountToAddBalance = this.services.utils.toFixedNumber(
          dataBillZeroFees.amountToAddBalance
        );
        data.amount = dataBillZeroFees.amount;

        return dataBillZeroFees;
      } else if (
        data.amount &&
        Number(data.amount) >= Number(paymentSettings.minimumAmount)
      ) {
        if (!paymentSettings.split) {
          let dataBillZeroFees = {
            amount:
              Number(data.amount) + Number(paymentSettings.feeAmountPayer),
            amountToAddBalance: Number(data.amount),
            subscribe: subscribeAmount,
            fee: Number(paymentSettings.feeAmountPayer),
            feePayee: 0,
          };
          if (data.subscribe) {
            dataBillZeroFees.amount = dataBillZeroFees.amount - subscribeAmount;
          }

          dataBillZeroFees.amount = this.services.utils.toFixedNumber(
            dataBillZeroFees.amount
          );
          dataBillZeroFees.amountToAddBalance =
            this.services.utils.toFixedNumber(
              dataBillZeroFees.amountToAddBalance
            );
          data.amount = dataBillZeroFees.amount;
          return dataBillZeroFees;
        } else {
          let dataBillZeroFees = {
            amount:
              Number(data.amount) + Number(paymentSettings.feeAmountPayer),
            amountToAddBalance:
              Number(data.amount) - Number(paymentSettings.feeAmountPayee),
            subscribe: subscribeAmount,
            fee: Number(paymentSettings.feeAmountPayer),
            feePayee: Number(paymentSettings.feeAmountPayee),
          };

          if (data.subscribe) {
            dataBillZeroFees.amount = dataBillZeroFees.amount - subscribeAmount;
          }

          if (data.payPayeeFee) {
            dataBillZeroFees.amount =
              dataBillZeroFees.amount + Number(paymentSettings.feeAmountPayee);
            dataBillZeroFees.amountToAddBalance =
              dataBillZeroFees.amountToAddBalance +
              Number(paymentSettings.feeAmountPayee);
          }

          dataBillZeroFees.amount = this.services.utils.toFixedNumber(
            dataBillZeroFees.amount
          );
          dataBillZeroFees.amountToAddBalance =
            this.services.utils.toFixedNumber(
              dataBillZeroFees.amountToAddBalance
            );
          data.amount = dataBillZeroFees.amount;
          return dataBillZeroFees;
        }
      } else {
        throw (
          "The minimum charge amount is $" +
          Number(paymentSettings.minimumAmount)
        );
      }
    } catch (error) {
      throw error;
    }
  }

  async createCharge(data) {
    try {
      if (data && data.amount !== undefined) {
        data.amount = parseInt(Number(data.amount) * 100);
        return await stripe.charges.create(data);
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async authorizeCharge(data) {
    try {
      if (data && data.amount !== undefined) {
        data.amount = parseInt(Number(data.amount) * 100);
        data.capture = false;
        return await stripe.charges.create(data);
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  // Uncaptured payments expire exactly 7 days after they are created.
  async captureCharge(chargeId) {
    try {
      return await stripe.charges.capture(chargeId);
    } catch (error) {
      throw error;
    }
  }

  async retrieveCharge(chargeId) {
    try {
      return await stripe.charges.retrieve(chargeId);
    } catch (error) {
      throw error;
    }
  }

  async refundCharge(chargeId) {
    try {
      return await stripe.refunds.create({ charge: chargeId });
    } catch (error) {
      throw error;
    }
  }

  async listCharges(limit = 100) {
    try {
      return await stripe.charges.list({ limit: limit });
    } catch (error) {
      throw error;
    }
  }

  // plans

  async createPlan(name, amount, interval = "month") {
    try {
      if (name && amount) {
        amount = parseInt(Number(amount) * 100);
        return await stripe.plans.create({
          id: "plan_" + name,
          amount: amount,
          interval: interval,
          product: {
            name: name,
          },
          currency: "usd",
        });
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  /*     { id: 'plan_pay30Monthly',
    object: 'plan',
    active: true,
    aggregate_usage: null,
    amount: 3000,
    billing_scheme: 'per_unit',
    created: 1562196719,
    currency: 'usd',
    interval: 'month',
    interval_count: 1,
    livemode: false,
    metadata: {},
    nickname: null,
    product: 'prod_FN1zLfVwVFu6mc',
    tiers: null,
    tiers_mode: null,
    transform_usage: null,
    trial_period_days: null,
    usage_type: 'licensed' }    */
  async retrievePlan(planId) {
    try {
      if (planId) {
        return await stripe.plans.retrieve(planId);
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async deletePlan(planId) {
    try {
      if (planId) {
        return await stripe.plans.del(planId);
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async listSubscriptionPlans() {
    try {
      let out = [];
      var result = await stripe.plans.list();
      out = out.concat(result.data);
      while (result.has_more) {
        const starting_after = result.data[result.data.length - 1].id;
        result = await stripe.plans.list({ starting_after: starting_after });
        out = out.concat(result.data);
      }

      return out;
    } catch (error) {
      throw error;
    }
  }

  // subscriptions

  async createSubscription(customer, planId, metadata = {}) {
    try {
      if (customer && planId) {
        return await stripe.subscriptions.create({
          customer: customer,
          metadata: metadata,
          items: [
            {
              plan: planId,
            },
            {
              plan: "plan_paySubscriptionFeeMonthly",
            },
          ],
        });
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async cancelSubscription(subscriptionId) {
    try {
      if (subscriptionId) {
        return await stripe.subscriptions.del(subscriptionId);
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async updateSubscriptionPaymentSource(subscriptionId, paymentSource) {
    try {
      if (subscriptionId) {
        return await stripe.subscriptions.update(subscriptionId, {
          default_source: paymentSource,
        });
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async updateSubscriptionPlan(subscriptionId, planId) {
    try {
      if (subscriptionId && planId) {
        let sub = await stripe.subscriptions.retrieve(subscriptionId);
        this.iconsole.log("subscriptions.retrieve::", sub);
        let oldSubItemId = sub.items.data[0].id;
        this.iconsole.log("oldSubItemId::", oldSubItemId);
        let createSubItemResponse = await stripe.subscriptionItems.create({
          subscription: subscriptionId,
          plan: planId,
        });
        this.iconsole.log("createSubItemResponse::", createSubItemResponse);
        let delSubItemResponse = await stripe.subscriptionItems.del(
          oldSubItemId
        );
        this.iconsole.log("delSubItemResponse::", delSubItemResponse);
        sub.metadata.planId = planId;
        sub.metadata.amount = planId.match(/\d+/g)[0];
        return await stripe.subscriptions.update(subscriptionId, {
          metadata: sub.metadata,
        });
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  async getUserSubscriptions(customerId) {
    try {
      if (customerId) {
        let customer = await this.retrieveCustomer(customerId);
        return customer.subscriptions.data;
      } else {
        throw "InvalidPayload";
      }
    } catch (error) {
      throw error;
    }
  }

  // webhooks - https://stripe.com/docs/billing/webhooks
  /*     Tracking active subscriptions
    A few days prior to renewal, your site receives an invoice.upcoming event at the webhook endpoint. You can listen for this event to add extra invoice items to a subscription draft invoice.
    Your site receives an invoice.payment_succeeded event.
    Your webhook endpoint finds the customer for whom payment was just made.
    Your webhook endpoint updates the customer’s current_period_end timestamp in your database to the appropriate date in the future (plus a day or two for leeway).    */
  // our endpoint - https://devapi.billzero.app/v1/bills/stripewebhook
  /*     
        // Request
        {
        "created": 1326853478,
        "livemode": false,
        "id": "evt_00000000000000",
        "type": "invoice.payment_succeeded",
        "object": "event",
        "request": null,
        "pending_webhooks": 1,
        "api_version": "2018-07-27",
        "data": {
          "object": {
            "id": "in_00000000000000",
            "object": "invoice",
            "account_country": "US",
            "account_name": "BillZero, Inc.",
            "amount_due": 0,
            "amount_paid": 0,
            "amount_remaining": 0,
            "application_fee": null,
            "attempt_count": 0,
            "attempted": true,
            "auto_advance": true,
            "billing": "charge_automatically",
            "billing_reason": "manual",
            "charge": "_00000000000000",
            "closed": true,
            "collection_method": "charge_automatically",
            "created": 1562203368,
            "currency": "usd",
            "custom_fields": null,
            "customer": "cus_00000000000000",
            "customer_address": null,
            "customer_email": null,
            "customer_name": null,
            "customer_phone": "+18188087449",
            "customer_shipping": null,
            "customer_tax_exempt": "none",
            "customer_tax_ids": [
            ],
            "date": 1562203368,
            "default_payment_method": null,
            "default_source": null,
            "default_tax_rates": [
            ],
            "description": null,
            "discount": null,
            "due_date": null,
            "ending_balance": null,
            "finalized_at": null,
            "footer": null,
            "forgiven": false,
            "hosted_invoice_url": null,
            "invoice_pdf": null,
            "lines": {
              "data": [
                {
                  "id": "sli_00000000000000",
                  "object": "line_item",
                  "amount": 1000,
                  "currency": "usd",
                  "description": "1 × pay10Monthly (at $10.00 / month)",
                  "discountable": true,
                  "livemode": false,
                  "metadata": {
                  },
                  "period": {
                    "end": 1564881768,
                    "start": 1562203368
                  },
                  "plan": {
                    "id": "plan_00000000000000",
                    "object": "plan",
                    "active": true,
                    "aggregate_usage": null,
                    "amount": 1000,
                    "billing_scheme": "per_unit",
                    "created": 1562189462,
                    "currency": "usd",
                    "interval": "month",
                    "interval_count": 1,
                    "livemode": false,
                    "metadata": {
                    },
                    "nickname": null,
                    "product": "prod_00000000000000",
                    "tiers": null,
                    "tiers_mode": null,
                    "transform_usage": null,
                    "trial_period_days": null,
                    "usage_type": "licensed"
                  },
                  "proration": false,
                  "quantity": 1,
                  "subscription": "sub_00000000000000",
                  "subscription_item": "si_00000000000000",
                  "tax_amounts": [
                  ],
                  "tax_rates": [
                  ],
                  "type": "subscription"
                }
              ],
              "has_more": false,
              "object": "list",
              "url": "/v1/invoices/in_1EsJeuIcjMDuBn49M7nyZe0w/lines"
            },
            "livemode": false,
            "metadata": {
            },
            "next_payment_attempt": 1562206968,
            "number": "63E2ED5F-0001",
            "paid": true,
            "payment_intent": null,
            "period_end": 1562203368,
            "period_start": 1562203368,
            "post_payment_credit_notes_amount": 0,
            "pre_payment_credit_notes_amount": 0,
            "receipt_number": null,
            "starting_balance": 0,
            "statement_descriptor": null,
            "status": "draft",
            "status_transitions": {
              "finalized_at": null,
              "marked_uncollectible_at": null,
              "paid_at": null,
              "voided_at": null
            },
            "subscription": null,
            "subtotal": 0,
            "tax": null,
            "tax_percent": null,
            "total": 0,
            "total_tax_amounts": [
            ],
            "webhooks_delivered_at": null
          }
        }
      } 
      
      // event
{ created: 1326853478,
livemode: false,
id: 'evt_00000000000000',
type: 'invoice.payment_succeeded',
object: 'event',
request: null,
pending_webhooks: 1,
api_version: '2018-07-27',
data: 
{ object: 
{ id: 'in_00000000000000',
object: 'invoice',
account_country: 'US',
account_name: 'BillZero, Inc.',
amount_due: 0,
amount_paid: 0,
amount_remaining: 0,
application_fee: null,
attempt_count: 0,
attempted: true,
auto_advance: true,
billing: 'charge_automatically',
billing_reason: 'manual',
charge: '_00000000000000',
closed: true,
collection_method: 'charge_automatically',
created: 1562204733,
currency: 'usd',
custom_fields: null,
customer: 'cus_00000000000000',
customer_address: null,
customer_email: null,
customer_name: null,
customer_phone: '+18188087449',
customer_shipping: null,
customer_tax_exempt: 'none',
customer_tax_ids: [],
date: 1562204733,
default_payment_method: null,
default_source: null,
default_tax_rates: [],
description: null,
discount: null,
due_date: null,
ending_balance: null,
finalized_at: null,
footer: null,
forgiven: false,
hosted_invoice_url: null,
invoice_pdf: null,
lines: [Object],
livemode: false,
metadata: {},
next_payment_attempt: 1562208333,
number: '63E2ED5F-0001',
paid: true,
payment_intent: null,
period_end: 1562204733,
period_start: 1562204733,
post_payment_credit_notes_amount: 0,
pre_payment_credit_notes_amount: 0,
receipt_number: null,
starting_balance: 0,
statement_descriptor: null,
status: 'draft',
status_transitions: [Object],
subscription: null,
subtotal: 0,
tax: null,
tax_percent: null,
total: 0,
total_tax_amounts: [],
webhooks_delivered_at: null } } }      
      
      */
  async processStripeWebHook(request) {
    try {
      let endpointSecret = process.env.STRIPE_WEBHOOK_SIGNING_SECRET;
      const sig = request.headers["Stripe-Signature"];
      let event = await stripe.webhooks.constructEvent(
        request.body,
        sig,
        endpointSecret
      );
      this.iconsole.log("::event::", event);
      return event;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = stripeClass;
