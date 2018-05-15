const fetch = require('node-fetch');
const R = require('ramda');
const bluebird = require('bluebird');
const url = require('url');
var AWS = require("aws-sdk");

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
    if (! records.length) {
      throw Error("No records");
    }
    return records;
  })
  .then((records) => {
    return new Promise((res) => {
      AWS.config.update({
        region: "us-east-1",
      });
      
      var docClient = new AWS.DynamoDB.DocumentClient();
    
      docClient.get({
          TableName: "MonzoRefreshToken",
          Key:{
              "user_id": 1,
          }
      }, function(err, data) {
          console.log("dynamo db data", err, data);
          const formData = new url.URLSearchParams();
          formData.append('grant_type', "refresh_token");
          formData.append('client_id', process.env.MONZO_CLIENT_ID);
          formData.append('client_secret', process.env.MONZO_CLIENT_SECRET);
          formData.append('refresh_token', data.Item.refresh_token);
          return fetch("https://api.monzo.com/oauth2/token", {
              method: 'POST',
              body: formData
          })
          .then((res) => res.json())
          .then((json) => {
            console.log("dynamo json", json);
            docClient.update({
                  TableName: "MonzoRefreshToken",
                  Key:{
                      "user_id": 1,
                  },
                  UpdateExpression: "set refresh_token = :t",
                  ExpressionAttributeValues:{
                      ":t": json.refresh_token,
                  },
                  ReturnValues:"UPDATED_NEW"
              }, (err, data) => {
                res(json.access_token);
              })
          });
      });
    })
    .then((token) => {
      return bluebird.all(R.map((record) => {
        const formData = new url.URLSearchParams();
        formData.append('amount', record.fields.Reward);
        formData.append('destination_account_id', process.env.MONZO_ACCOUNT_ID);
        formData.append('dedupe_id', record.id);
        return fetch("https://api.monzo.com/pots/" + process.env.MONZO_POT_ID + "/withdraw", {
          method: 'PUT',
          headers: {
            Authorization: 'Bearer ' + token
          },
          body: formData
        })
        .then((res) => {
          console.log("Monzo token", token);
          return res;
        })
        .then((res) => record)
        .catch((e) => console.log(e));
      }, R.reject((record) => ! record.fields.Reward || ! record.fields.Habit || ! record.fields["Time Spent"], records)));
    });
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
  })
  .catch((e) => {
    console.log(e);
    callback(null, { message: 'Success' });
  });
};

const generateReward = (duration) => {
  const rand = Math.random();
  const cutoff = probabilityMap[duration] ? probabilityMap[duration] : probabilityMap.default;
  if (rand < cutoff) {
    const pence = Math.round(Math.random() * 400);
    return pence;
  }
  return 0;
}