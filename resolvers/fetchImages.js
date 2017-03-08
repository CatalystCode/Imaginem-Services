let azureStorage = require('azure-storage');
let utils = require('../globals');
let mssqlDriver = require('../drivers/mssql');

const AZURE_TBL_BATCH_IMGS = "pipelinelogs";

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
                                general_classification_output: image.generalclassification ? JSON.parse(image.generalclassification._) : undefined,
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
         const reqBody = req.body.requestBody;
         const offset = reqBody.offset;
         const limit = reqBody.limit;
         const selectedTags = reqBody.selectedTags;
         let whereClause = '';

        if(selectedTags.length > 0){
            let groupedFilters = {tags: [], categories: []};
            let tagsCrossApply, catsCrossApply, catsValues, tagsValues;
            
            selectedTags.forEach(function(el){
                groupedFilters[el.value.type].push(el.label);
            });

            if(groupedFilters.tags.length > 0){
                tagsCrossApply = `CROSS APPLY OPENJSON(a.tagsJSON, '$') WITH (name varchar(500)) AS tags_output `;
                tagsValues = groupedFilters.tags.join("','")
            }

            if(groupedFilters.categories.length > 0){
                catsCrossApply = `CROSS APPLY OPENJSON(a.categoriesJSON, '$') WITH (name varchar(500)) AS cats_output `;
                catsValues = groupedFilters.categories.join("','")
            }

            whereClause = `, (
                            SELECT distinct id from pipeline_output as a 
                            ${catsCrossApply ? catsCrossApply : ''}  
                            ${tagsCrossApply ? tagsCrossApply : ''} 
                            WHERE ${catsCrossApply ? "cats_output.name IN('" + catsValues + "')" : ""}
                                  ${catsCrossApply && tagsCrossApply ? ' OR ' : ''}
                                  ${tagsCrossApply ? "tags_output.name IN('" + tagsValues + "')": ""}
                           ) as f
                           WHERE b.id = f.id`;
        }

        const QUERY = `select b.* from pipeline_output as b
                       ${whereClause}
                       order by timestamp desc 
                       OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
        //console.log(QUERY);

        let queryCallbackHandler = function(recordset, res) {
           res.send({batches: recordset.map(function(image){
                let jsonResponse = JSON.parse(image.job_output);

                return {
                    id: image.id,
                    batch_id: image.batch_id,
                    timestamp: image.timestamp,
                    url: image.image_url,
                    general_classification_output: jsonResponse.generalclassification,
                    facecrop_output: jsonResponse.facecrop,
                    facedetection: jsonResponse.facedetection
                };
           })});
        };

        mssqlDriver.invokeCommand(res, QUERY, queryCallbackHandler);
    },
    fetchTagList: function(req, res){
        const QUERY = `select distinct name as label, 'tags' as type from pipeline_output as a CROSS APPLY OPENJSON(a.tagsJSON, '$') WITH (name varchar(500)) AS job_output UNION select distinct name as tag, 'categories' as type from pipeline_output as a CROSS APPLY OPENJSON(a.categoriesJSON, '$') WITH (name varchar(500)) AS job_output`;
        console.log(QUERY);


        let queryCallbackHandler = function(recordset, res) {
           let response = {tags: [], categories: []};

           recordset.forEach(function(tag){
                if(response[tag.type]){
                    response[tag.type].push(tag.label);
                }
           });

           res.send({filters: response});
        };

        mssqlDriver.invokeCommand(res, QUERY, queryCallbackHandler);
    }
}
