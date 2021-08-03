const core = require('@actions/core');
const fs = require('fs');

async function readJsonResultsFromFile(resultsFile) {
  core.info('Reading results from postman results file....');
  if (fs.existsSync(resultsFile)) {
    const rawJson = fs.readFileSync(resultsFile, 'utf8');
    if (!rawJson) {
      core.info(
        `The results file '${resultsFile}' does not contain any data.  No status check or PR comment will be created.`
      );
      return;
    }
    let parsedJson = JSON.parse(rawJson);
    if (!parsedJson || !parsedJson.run || !parsedJson.run.stats || !parsedJson.run.timings || !parsedJson.run.failures) {
      core.setFailed(
        `The results file '${resultsFile} does not appear to be in the correct format.  No status check or PR comment will be created.`
      );
      return;
    } else {
      return {
        stats: parsedJson.run.stats,
        timings: parsedJson.run.timings,
        failures: parsedJson.run.failures,
        hasFailures: parsedJson.run.failures.length > 0,
        outcome: parsedJson.run.failures.length > 0 ? 'Failed' : 'Passed'
      };
    }
  } else {
    core.setFailed(`The results file '${resultsFile}' does not exist.  No status check or PR comment will be created.`);
    return;
  }
}

module.exports = {
  readJsonResultsFromFile
};
