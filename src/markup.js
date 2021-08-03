const core = require('@actions/core');
const { format, utcToZonedTime } = require('date-fns-tz');
const timezone = core.getInput('timezone') || 'Etc/UTC';
const formatDistance = require('date-fns/formatDistance');

function getMarkupForJson(jsonResults, reportName) {
  return `
# ${reportName}
${getBadge(jsonResults.stats.requests, 'Requests')}
${getBadge(jsonResults.stats.assertions, 'Assertions')}
${getTestTimes(jsonResults.timings)}
${getTestCounters(jsonResults)}
${getTestResultsMarkup(jsonResults.failures)}
  `;
}

function getBadge(stats, name) {
  const failedCount = stats.failed;
  const totalCount = stats.total;
  const passedCount = totalCount - failedCount;

  const badgeCountText = failedCount > 0 ? `${`${failedCount}/${totalCount}`}` : `${`${passedCount}/${totalCount}`}`;
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

function getTestTimes(timings) {
  const startDate = new Date(timings.started);
  const endDate = new Date(timings.completed);
  const duration = formatDistance(endDate, startDate, {
    includeSeconds: true
  });

  return `
<details>  
  <summary> Duration: ${duration} </summary>
  <table>
    <tr>
      <th>Start:</th>
      <td><code>${formatDate(startDate)}</code></td>
    </tr>
    <tr>
      <th>Finish:</th>
      <td><code>${formatDate(endDate)}</code></td>    
    </tr>
    <tr>
      <th>Duration:</th>
      <td><code>${(timings.completed - timings.started) / 1000}</code></td>
    </tr>
    <tr>
      <th>Response Time Average:</th>
      <td><code>${timings.responseAverage}</code></td>
    </tr>
    <tr>
      <th>Response Time Min:</th>
      <td><code>${timings.responseMin}</code></td>
    </tr>
    <tr>
      <th>Response Time Max:</th>
      <td><code>${timings.responseMax}</code></td>
    </tr>
  </table>
</details>
  `;
}

function getTestCounters(run) {
  let stats = run.stats;
  return `
<details>
  <summary> Outcome: ${run.outcome}</summary>
  <table>
    <tr>
      <th></th>
      <th>executed</th>
      <td>failed</td>
    </tr>
    <tr>
      <th>iterations</th>
      <td>${stats.iterations.total}</td>
      <td>${stats.iterations.failed}</td>
    </tr>
    <tr>
      <th>requests</th>
      <td>${stats.requests.total}</td>
      <td>${stats.requests.failed}</td>
    </tr>
    <tr>
      <th>test-scripts</th>
      <td>${stats.testScripts.total}</td>
      <td>${stats.testScripts.failed}</td>
    </tr>
    <tr>
      <th>prerequest-scripts</th>
      <td>${stats.prerequestScripts.total}</td>
      <td>${stats.prerequestScripts.failed}</td>
    </tr>
    <tr>
      <th>assertions</th>
      <td>${stats.assertions.total}</td>
      <td>${stats.assertions.failed}</td>
    </tr>
  </table>
</details>

  `;
}

function getTestResultsMarkup(failures, reportName) {
  let resultsMarkup = '';

  if (!failures || failures.length === 0) {
    return getNoResultsMarkup(reportName);
  } else {
    failures.forEach(failure => {
      resultsMarkup += getFailureMarkup(failure);
    });
    return resultsMarkup.trim();
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
  core.debug(`Processing ${failure.error.test}`);

  return `
<details>
  <summary>:x: ${failure.error.test || failure.source.name}</summary>    
  <table>
    <tr>
      <th>Error Type:</th>
      <td><code>${failure.error.name}</code></td>
    </tr>
    <tr>
      <th>Timestamp:</th>
      <td><code>${formatDate(new Date(failure.error.timestamp))}</code></td>
    </tr>
    <tr>
      <th>Source name:</th>
      <td><code>${failure.source.name}</code></td>
    </tr>
    <tr>
      <th>Path:</th>
      <td><code>/${failure.source.request.url.path.join('/')}</code></td>
    </tr>
    <tr>
      <th>Stack:</th>
      <td><pre>${failure.error.stack}</pre></td>
    </tr>
  </table>
</details>
  `.trim();
}

module.exports = {
  getMarkupForJson
};
