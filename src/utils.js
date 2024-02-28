const core = require('@actions/core');
const fs = require('fs');
const path = require('path');

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
    }

    const emptyStat = {
      total: 0,
      pending: 0,
      failed: 0
    };
    if (!parsedJson.run.stats.iterations) parsedJson.run.stats.iterations = emptyStat;
    if (!parsedJson.run.stats.requests) parsedJson.run.stats.requests = emptyStat;
    if (!parsedJson.run.stats.testScripts) parsedJson.run.stats.testScripts = emptyStat;
    if (!parsedJson.run.stats.prerequestScripts) parsedJson.run.stats.prerequestScripts = emptyStat;
    if (!parsedJson.run.stats.assertions) parsedJson.run.stats.assertions = emptyStat;

    return {
      stats: parsedJson.run.stats,
      timings: parsedJson.run.timings,
      failures: parsedJson.run.failures
    };
  } else {
    core.setFailed(`The results file '${resultsFile}' does not exist.  No status check or PR comment will be created.`);
    return;
  }
}

function areThereAnyFailingTests(json) {
  core.info(`\nChecking for failing tests..`);

  if (json.failures.length > 0) {
    core.warning(`At least one failing test was found.`);
    return true;
  }

  core.info(`There are no failing tests.`);
  return false;
}

function createResultsFile(results, jobAndStep) {
  const resultsFileName = `test-results-${jobAndStep}.md`;

  core.info(`\nWriting results to ${resultsFileName}`);
  let resultsFilePath = null;

  fs.writeFile(resultsFileName, results, err => {
    if (err) {
      core.info(`Error writing results to file. Error: ${err}`);
    } else {
      core.info('Successfully created results file.');
      core.info(`File: ${resultsFileName}`);
    }
  });
  resultsFilePath = path.resolve(resultsFileName);
  return resultsFilePath;
}

module.exports = {
  readJsonResultsFromFile,
  areThereAnyFailingTests,
  createResultsFile
};
