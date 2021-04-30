const core = require('@actions/core')
//const github = require('@actions/github');
const fs = require('fs')

try {
  // Get the JSON webhook payload for the event that triggered the workflow
  //const payload = JSON.stringify(github.context.payload, undefined, 2)
  //console.log(`The event payload: ${payload}`);

  data = fs.readFileSync('system.json', 'utf8')
  let formatted = data.replace(/{{VERSION}}/g, '0.1')
  fs.writeFileSync('system.json', formatted, 'utf8')

  fs.readFile('system.json', 'utf8', function (err, data) {
    console.log('system.json after replace')
    console.log(data)
  })

} catch
  (error) {
  core.setFailed(error.message)
}