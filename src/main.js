const core = require('@actions/core');
const { readJsonResultsFromFile } = require('./utils');
const { createStatusCheck, createPrComment } = require('./github');
const { getMarkupForJson } = require('./markup');

const requiredArgOptions = {
  required: true,
  trimWhitespace: true
};

const token = core.getInput('github-token', requiredArgOptions);
const resultsFile = core.getInput('results-file', requiredArgOptions);
const ignoreTestFailures = core.getBooleanInput('ignore-test-failures');
const shouldCreateStatusCheck = core.getBooleanInput('create-status-check');
const shouldCreatePRComment = core.getBooleanInput('create-pr-comment');
const updateCommentIfOneExists = core.getBooleanInput('update-comment-if-one-exists');
const reportName = core.getInput('report-name');

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
      await createPrComment(token, markupData, updateCommentIfOneExists);
    }

    core.setOutput('test-outcome', resultsJson.outcome);
  } catch (error) {
    if (error instanceof RangeError) {
      core.info(error.message);
      core.setOutput('test-outcome', 'Failed');
      return;
    } else {
      core.setFailed(`An error occurred processing the postman results file: ${error.message}`);
      core.setOutput('test-outcome', 'Failed');
    }
  }
}

run();
