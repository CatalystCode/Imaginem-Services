let mssqlDriver = require('../drivers/mssql');

const QUERY = "select top 40 batch_id, timestamp from (select batch_id, timestamp, count(*) as images from pipeline_output group by batch_id, timestamp) a order by timestamp desc";
const _TAGS_QUERY = "select distinct name as label, 'tag' as type from pipeline_output as a CROSS APPLY OPENJSON(a.tagsJSON, '$') WITH (name varchar(500)) AS job_output UNION select distinct name as tag, 'categories' as type from pipeline_output as a CROSS APPLY OPENJSON(a.categoriesJSON, '$') WITH (name varchar(500)) AS job_output";

function queryCallbackHandler(recordset, res) {
  res.send({batches: recordset});
}

module.exports = {
 fetchRecentlyUploadedBatches(req, res) {
     mssqlDriver.invokeCommand(res, QUERY, queryCallbackHandler);
 },
 fetchFullTagList(req, res) {
     mssqlDriver.invokeCommand(res, _TAGS_QUERY, queryCallbackHandler);
 }
}