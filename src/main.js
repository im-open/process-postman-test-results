const core = require('@actions/core');
const { readJsonResultsFromFile } = require('./utils');
const { createStatusCheck, createPrComment } = require('./github');
const { getMarkupForJson } = require('./markup');

const token = core.getInput('github-token');
const resultsFile = core.getInput('results-file');
const ignoreTestFailures = core.getInput('ignore-test-failures') == 'true';
const shouldCreateStatusCheck = core.getInput('create-status-check') == 'true';
const shouldCreatePRComment = core.getInput('create-pr-comment') == 'true';
const reportName = core.getInput('report-name');

if (!resultsFile || resultsFile.length === 0) {
  core.setFailed('The results-file argument is required.');
  return;
}
if (!token || token.length === 0) {
  core.setFailed('The github-token argument is required.');
  return;
}

async function run() {
  try {
    const resultsJson = await readJsonResultsFromFile(resultsFile);
    if (!resultsJson) {
      core.setOutput('test-outcome', 'Failed');
      return;
    }

    const markupData = getMarkupForJson(resultsJson, reportName);

    let conclusion = 'success';
    if (resultsJson.hasFailures) {
      core.warning(`At least one failure was found.`);
      conclusion = ignoreTestFailures ? 'neutral' : 'failure';
    } else {
      core.info(`There are no failures.`);
    }

    if (shouldCreateStatusCheck) {
      await createStatusCheck(token, markupData, conclusion, reportName);
    }
    if (shouldCreatePRComment) {
      await createPrComment(token, markupData);
    }

    core.setOutput('test-outcome', resultsJson.outcome);
  } catch (error) {
    if (error instanceof RangeError) {
      core.info(error.message);
      core.setOutput('test-outcome', 'Failed');
      return;
    } else {
      core.setFailed(`An error occurred processing the cypress results file: ${error.message}`);
      core.setOutput('test-outcome', 'Failed');
    }
  }
}

run();
