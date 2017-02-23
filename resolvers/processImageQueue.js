var azure = require('azure-storage');
var asyncEachLimit = require('async/eachLimit');

const CONTAINER = "inputimages";
const AZURE_STORAGE_RETRY_COUNT = 3;
const AZURE_STORAGE_RETRY_INTERVAL = 1000;
const TextBase64QueueMessageEncoder = azure.QueueMessageEncoder.TextBase64QueueMessageEncoder;
const ASYNC_QUEUE_LIMIT = 20;
const retryOperations = new azure.LinearRetryPolicyFilter(AZURE_STORAGE_RETRY_COUNT, AZURE_STORAGE_RETRY_INTERVAL);
const PIPELINE = ["generalclassificationinput",  "ocrinput", "facedetectioninput", "facecropinput", "facematchinput", "pipelineoutput" ];
const MESSAGE_QUEUE = PIPELINE[0];
const connString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const storageAccount = parseStorageAccount(connString, "AccountName");
const blobHostName = "https://" + storageAccount + ".blob.core.windows.net/" + CONTAINER + "/";

function getQueueMessage(image){
    var message = {
        job_definition: {
            id: image.blobName,
            batch_id: image.batchId,
            input: {
                 image_url: blobHostName + image.batchId + "/" + image.blobName,
                 image_parameters: {
                    last_modified_date: image.lastModifiedDate,
                    original_name: image.originalName,
                    mime_type: image.type,
                    size: image.size,
                    width: image.width
                }
            },
            processing_pipeline: PIPELINE,
            processing_step : 0
        },
        job_output : {}
    };

    return JSON.stringify(message);
}

function publishMessage(service, image, callback){
  try{  
    service.createMessage(MESSAGE_QUEUE, getQueueMessage(image), function(error, result, response){
            if (error) {
                console.log('error occured posting to queue');
                callback(error);
            }else{
                callback();
            }
    });
  }catch(ex){
     console.log('error occured with connecting to the queue ' + MESSAGE_QUEUE + ' error: ' + ex);
     callback(ex);
  }
}

function parseStorageAccount(connectionString, key){
          let matchedPosition = connectionString.indexOf(key);

          if(matchedPosition > -1){
              matchedPosition++;
              let endPosition = connectionString.indexOf(";", matchedPosition);
              endPosition = endPosition === -1 ? connectionString.length: endPosition;
              
              return connectionString.substring(matchedPosition + key.length, endPosition); 
          }else{
              return undefined;
          }
}

function getAzureStorageQueueService(){
    let queueSvc = azure.createQueueService().withFilter(retryOperations);
        queueSvc.messageEncoder = new TextBase64QueueMessageEncoder();
        queueSvc.createQueueIfNotExists(MESSAGE_QUEUE, function(error, result, response){
            if (error) {
                console.error(new Error(`Unable to create new azure queue ${MESSAGE_QUEUE}`));
            }
        });

    return queueSvc;
}

module.exports = {
 pushImagesToQueue(req, res) {
    const inputImageQueue = req.body.inputImageQueue;
    var status = 'success';
    var statusMessage = "Submitted Job";
    var processedMessages = 0;
    const service = getAzureStorageQueueService();
    
    if(inputImageQueue && inputImageQueue.length > 0){
        asyncEachLimit(inputImageQueue, ASYNC_QUEUE_LIMIT, function(image, cb){
                publishMessage(service, image, cb);
        }, function(asyncError){
            if(asyncError){
                status = 'failure';
                statusMessage = asyncError;
            }

            return res.send({status: status, statusMessage: statusMessage});
        });
    }else{
        res.send({status: 'failure', statusMessage: 'empty inputImageQueue error.'});
    }
 }
}