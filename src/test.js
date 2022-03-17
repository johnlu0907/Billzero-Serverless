var d = new Date(1631145600000);
var offset = -8;
var utc = d.getTime() + (d.getTimezoneOffset() * 60000);  //This converts to UTC 00:00
var nd = new Date(utc + (3600000*offset));
console.log(nd.toISOString());

let nz_date_string = new Date('2021-09-09T06:42:26.490Z').toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
console.log(nz_date_string)
//
// console.log(moment().tz("America/Los_Angeles").format());
// const timestamp = new Date().toISOString();
//
// console.log(timestamp);
//
// var start = moment.tz('America/Los_Angeles').startOf('day').toISOString();
// var end = moment.tz('America/Los_Angeles').endOf('day').toISOString();
//
//
// console.log(start)
// console.log(end)
//
// start = moment.tz('utc').startOf('day').utc().toISOString();
// end = moment.tz('utc').endOf('day').utc().toISOString();
//
// console.log(start)
// console.log(end)
// const _date = new Date().setUTCHours(0, 0, 0, 0);
// console.log(_date);
// const date = new Date(0);
// date.setUTCSeconds(_date/1000);
// console.log(date);
