const core = require('@actions/core');
//const github = require('@actions/github');
const fs = require('fs')

try {
  // Get the JSON webhook payload for the event that triggered the workflow
  //const payload = JSON.stringify(github.context.payload, undefined, 2)
  //console.log(`The event payload: ${payload}`);

  await fs.readFile("system.json", 'utf8', function (err,data) {
    console.log("system.json before replace");
    console.log(data);
    let formatted = data.replace(/{{VERSION}}/g, '0.1');
    console.log("data after replace");
    console.log(formatted);

    fs.writeFile("system.json", formatted, 'utf8', function (err) {
      if (err) return console.log(err);
    });
  });

  fs.readFile("system.json", 'utf8', function (err,data) {
    console.log("system.json after replace");
    console.log(data);
  });

} catch (error) {
  core.setFailed(error.message);
}