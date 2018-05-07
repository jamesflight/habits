const fetch = require('node-fetch');
const R = require('ramda');
const bluebird = require('bluebird');
const url = require('url');

const probabilityMap = {
  "default": 0.05,
  "10 - 20 mins": 0.1,
  "20 - 30 mins": 0.15,
  "30 - 40 mins": 0.2,
  "40+ mins": 0.25,
}

module.exports.hello = (event, context, callback) => {
  fetch("https://api.airtable.com/v0/appvcDcxH8llgwoN7/Table%201?&view=Grid%20view&filterByFormula=NOT(Processed = 1)", { 
    headers: {
      Authorization: 'Bearer ' + process.env.AIRTABLE_KEY
    }
  }).then((response) => {
    return response.json(); 
  }).then((json) => {
    console.log(json.records);
    return R.map((record) => {
      return R.assocPath(['fields', 'Reward'], generateReward(record.fields['Time Spent']), record);
    }, R.reject((record) => ! record.fields.Habit || ! record.fields["Time Spent"], json.records));
  })
  .then((records) => {
    return bluebird.all(R.map((record) => {
      return fetch("https://api.airtable.com/v0/appvcDcxH8llgwoN7/Table%201/" + record.id, {
        headers: {
          Authorization: 'Bearer ' + process.env.AIRTABLE_KEY,
          'Content-Type': 'application/json'
        },
        method: 'PATCH',
        body: JSON.stringify({fields: {Reward: record.fields.Reward / 100, Processed: true}}),
      })
    }, records))
    .then(() => records);
  })
  .then((records) => {
    return bluebird.all(R.map((record) => {
      const formData = new url.URLSearchParams();
      formData.append('amount', record.fields.Reward);
      formData.append('destination_account_id', process.env.MONZO_ACCOUNT_ID);
      formData.append('dedupe_id', record.id);
      return fetch("https://api.monzo.com/pots/" + process.env.MONZO_POT_ID + "/withdraw", {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + process.env.MONZO_ACCESS_TOKEN
        },
        body: formData
      })
      .then((res) => record)
    }, R.reject((record) => ! record.fields.Reward || ! record.fields.Habit || ! record.fields["Time Spent"], records)));
  })
  .then((records) => {
    return bluebird.all(R.map((record) => {
      const formData = new url.URLSearchParams();
      formData.append('token', process.env.PUSHOVER_TOKEN);
      formData.append('user', process.env.PUSHOVER_USER);
      formData.append('device', process.env.PUSHOVER_DEVICE);
      formData.append('title', '\'' + record.fields.Habit + '\' -' + ' Awesome job!');
      formData.append('message', 'You get £' + (record.fields.Reward / 100).toFixed(2) + "!");
      return fetch("https://api.pushover.net/1/messages.json",
      {
        method: 'POST',
        body: formData
      })
    }, records));
  })
  .then(() => {
    callback(null, { message: 'Success' });
  });
  

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
};

const generateReward = (duration) => {
  const rand = Math.random();
  const cutoff = probabilityMap[duration] ? probabilityMap[duration] : 0.05;
  if (rand < cutoff) {
    const pence = Math.round(Math.random() * 200);
    return pence;
  }
  return 0;
}