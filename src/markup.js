const core = require('@actions/core');
const { format, utcToZonedTime } = require('date-fns-tz');
const timezone = core.getInput('timezone') || 'Etc/UTC';
const formatDistance = require('date-fns/formatDistance');

function getMarkupForJson(jsonResults, reportName) {
  return `# ${reportName}

${getBadge(jsonResults.stats.requests, 'Requests')}
${getBadge(jsonResults.stats.assertions, 'Assertions')}
${getTestTimes(jsonResults.timings)}
${getTestCounters(jsonResults)}
${getFailedAndEmptyTestResultsMarkup(jsonResults.failures, reportName)}`;
}

function getBadge(stats, name) {
  const failedCount = stats.failed;
  const totalCount = stats.total;
  const passedCount = totalCount - failedCount;

  const badgeCountText = failedCount > 0 ? `${failedCount}/${totalCount}` : `${passedCount}/${totalCount}`;
  const badgeStatusText = failedCount > 0 ? 'FAILED' : 'PASSED';
  const badgeColor = failedCount > 0 ? 'red' : 'brightgreen';

  return `![Generic badge](https://img.shields.io/badge/${name}_${badgeCountText}-${badgeStatusText}-${badgeColor}.svg)`;
}

function formatDate(dateToFormat) {
  if (timezone && timezone.length > 0) {
    let dateWithTimezone = utcToZonedTime(dateToFormat, timezone);
    return `${format(dateWithTimezone, 'yyyy-MM-dd HH:mm:ss.SSS zzz', { timeZone: timezone })}`;
  } else {
    return format(dateToFormat, 'yyyy-MM-dd HH:mm:ss.SSS zzz');
  }
}

function getRowWithTwoColumns(title, value, wrapper) {
  if (!wrapper) wrapper = 'code';
  return `<tr>
      <th>${title}</th>
      <td><${wrapper}>${value || 'N/A'}</${wrapper}></td>
    </tr>`;
}

function getRowWithThreeColumns(title, value1, value2) {
  return `<tr>
      <th>${title}</th>
      <td>${value1 || 0}</td>
      <td>${value2 || 0}</td>
    </tr>`;
}

function getTestTimes(timings) {
  const startDate = new Date(timings.started);
  const endDate = new Date(timings.completed);
  const duration = formatDistance(endDate, startDate, {
    includeSeconds: true
  });

  return `<details>
  <summary>Duration: ${duration}</summary>
  <table>
    ${getRowWithTwoColumns('Start:', formatDate(startDate))}
    ${getRowWithTwoColumns('Finish:', formatDate(endDate))}
    ${getRowWithTwoColumns('Duration:', (timings.completed - timings.started) / 1000)}
    ${getRowWithTwoColumns('Response Time Average:', timings.responseAverage)}
    ${getRowWithTwoColumns('Response Time Min:', timings.responseMin)}
    ${getRowWithTwoColumns('Response Time Max:', timings.responseMax)}
  </table>
</details>`;
}

function getTestCounters(run) {
  const outcome = run.failures.length > 0 ? 'Failed' : 'Passed';
  const stats = run.stats;

  return `<details>
  <summary>Outcome: ${outcome}</summary>
  <table>
    <tr>
      <th></th>
      <th>executed</th>
      <th>failed</th>
    </tr>
    ${getRowWithThreeColumns('iterations', stats.iterations.total, stats.iterations.failed)}
    ${getRowWithThreeColumns('requests', stats.requests.total, stats.requests.failed)}
    ${getRowWithThreeColumns('test-scripts', stats.testScripts.total, stats.testScripts.failed)}
    ${getRowWithThreeColumns('prerequest-scripts', stats.prerequestScripts.total, stats.prerequestScripts.failed)}
    ${getRowWithThreeColumns('assertions', stats.assertions.total, stats.assertions.failed)}
  </table>
</details>`;
}

function getFailedAndEmptyTestResultsMarkup(failures, reportName) {
  let resultsMarkup = '';

  if (!failures || failures.length === 0) {
    return getNoResultsMarkup(reportName);
  } else {
    failures.forEach(failure => {
      resultsMarkup += getFailureMarkup(failure);
    });
    return resultsMarkup;
  }
}

function getNoResultsMarkup(reportName) {
  const testResultIcon = ':grey_question:';
  const resultsMarkup = `
## ${testResultIcon} ${reportName}

There were no failures to report.
`;
  return resultsMarkup;
}

function getFailureMarkup(failure) {
  if (!failure || (!failure.error && !failure.source)) return;

  if (!failure.error) failure.error = {};
  if (!failure.source) failure.source = {};

  core.debug(`Processing ${failure.error.test}`);

  return `<details>
  <summary>:x: ${failure.error.test || failure.source.name}</summary>
  <table>
    ${getRowWithTwoColumns('Error Type:', failure.error.name)}
    ${getRowWithTwoColumns('Timestamp:', failure.error.timestamp)}
    ${getRowWithTwoColumns('Source name:', failure.source.name)}
    ${getRowWithTwoColumns('Path:', failure.source.request?.url?.path?.join('/'))}
    ${getRowWithTwoColumns('Stack:', failure.error.stack, 'pre')}
  </table>
</details>
`;
}

module.exports = {
  getMarkupForJson
};
