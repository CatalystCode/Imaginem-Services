let mssqlDriver = require('../drivers/mssql');

const QUERY = "select top 40 batch_id, timestamp from (select batch_id, timestamp, count(*) as images from pipeline_output group by batch_id, timestamp) a order by timestamp desc";

function queryCallbackHandler(recordset, res) {
  res.send({batches: recordset});
}

module.exports = {
 fetchRecentlyUploadedBatches(req, res) {
     mssqlDriver.invokeCommand(res, QUERY, queryCallbackHandler);
 }
}