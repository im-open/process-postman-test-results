const core = require('@actions/core');
const fs = require('fs');

function camelCaseKeys(original) {
  if (!original || typeof original !== 'object' || Array.isArray(original)) return original;

  return Object.entries(original).reduce((obj, [key, value]) => {
    const camelKey = key.replace(/(([-_])|(^[A-Z]))/g, found => found.toLowerCase().replace(/[-_]/, ''));
    obj[camelKey] = camelCaseKeys(value);
    return obj;
  }, {});
}

function parseResult(rawJson) {
  const result = JSON.parse(rawJson);
  const camelResult = camelCaseKeys(result);
  return camelResult;
}

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
    let parsedJson = parseResult(rawJson);
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
