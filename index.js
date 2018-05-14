var handler = require("./handler");

var isRunning = false;

process.env.AIRTABLE_KEY = "keyhbcvvQIT6NC7iZ";
process.env.MONZO_ACCESS_TOKEN = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJlYiI6IkVSVmVUZ0hYdXhlaXhtM2VGOVY2IiwianRpIjoiYWNjdG9rXzAwMDA5V013SzFMTTVMNEtKVEZkWW4iLCJ0eXAiOiJhdCIsInYiOiI1In0.Zohx_Lkgl7D9PFuLcoaRWvYHVP4DLWjiLJlBqE_S4aq93r87XCZX1C0Lxq0b-YiS0OK-hITN5Qmm14DddW9yow";
process.env.MONZO_POT_ID = "pot_00009WMwS3jh4cRM3AT6dV";
process.env.MONZO_ACCOUNT_ID = "acc_00009TpT6FZ50nhiitZVwX";
process.env.MONZO_CLIENT_ID = "oauth2client_00009WZc8MjBHSgC3la6Yz";
process.env.MONZO_CLIENT_SECRET = "mnzconf.n44Bo+He2bE1KsU3EbLqthJSAcH8rvjPc5ZDBsR8yYmX1gDA/jdFvACm/62dx8W8JcfcVFX1apeF8gTEhUF0";
process.env.PUSHOVER_TOKEN = "a72nyvga1h2q4tf4pr1dfz12r7qjo9";
process.env.PUSHOVER_USER = "u2snmzbc3u6fkszekrjnftrqk1pwch";
process.env.PUSHOVER_DEVICE = "sm-g900f";

setInterval(() => {
    if (isRunning === false) {
        isRunning = true;
        handler.hello({}, {}, () => {
            isRunning = false;
        });
    } else {
        console.log("skipped");
    }
}, 1000);