let azureStorage = require('azure-storage');
let utils = require('../globals');
let mssqlDriver = require('../drivers/mssql');

const AZURE_TBL_BATCH_IMGS = "pipelinelogs";
const QUERY = "select top 20 * from pipeline_output order by timestamp desc";

module.exports = {
    fetchImagesFromBatchId: function(req, res){
       const queryString = `PartitionKey eq ?`;
       const batchId = req.query.batch_id;

       if(!batchId){
           return res.status(500).send({ error: 'batchId is not defined' });
       }

       const query = new azureStorage.TableQuery().where(queryString, batchId);
       const tableService = azureStorage.createTableService();

       tableService.createTableIfNotExists(AZURE_TBL_BATCH_IMGS, (error, result, response) => {
           if(!error){
                tableService.queryEntities(AZURE_TBL_BATCH_IMGS, query, null, (error, result, response) => {
                    if(!error){
                        let batchImages = result.entries.map(function(image){
                            return {
                                id: image.RowKey._,
                                timestamp: image.Timestamp._,
                                facecrop_output: image.facecrop_output ? JSON.parse(image.facecrop_output._) : undefined,
                                facedetection_output: image.facedetection_output ? JSON.parse(image.facedetection_output._) : undefined,
                                facematch_output: image.facematch_output ? JSON.parse(image.facematch_output._) : undefined,
                                general_classification_output: image.general_classification_output ? JSON.parse(image.general_classification_output._) : undefined,
                                ocr_output: image.ocr_output ? JSON.parse(image.ocr_output._) : undefined,
                                url: utils.blobImagePath(batchId, image.RowKey._)
                            }
                        });
                        res.send({batchImages: batchImages});
                    }else{
                        return res.status(500).send({ error: 'table query error: '+error });
                    }
                });
             }else{
                 return res.status(500).send({ error: 'table creation error: '+error });
             }
      });
    },
    fetchRecentImages: function(req, res){
        let queryCallbackHandler = function(recordset, res) {
           res.send({batches: recordset.map(function(image){
                let jsonResponse = JSON.parse(image.job_output);

                return {
                    id: image.id,
                    batch_id: image.batch_id,
                    timestamp: image.timestamp,
                    url: image.image_url,
                    general_classification_output: jsonResponse.general_classification,
                    facecrop_output: jsonResponse.facecrop,
                    facedetection: jsonResponse.facedetection
                };
           })});
        };

        mssqlDriver.invokeCommand(res, QUERY, queryCallbackHandler);
    }
}