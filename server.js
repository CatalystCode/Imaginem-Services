var express = require('express');
var azure = require('azure-storage');
var app = express();
var fs = require ("fs");
var multiparty = require('multiparty');
var bodyParser = require('body-parser');
var asyncEachLimit = require('async/eachLimit');

const AZURE_STORAGE_RETRY_COUNT = 3;
const AZURE_STORAGE_RETRY_INTERVAL = 1000;
const TextBase64QueueMessageEncoder = azure.QueueMessageEncoder.TextBase64QueueMessageEncoder;
const ASYNC_QUEUE_LIMIT = 20;
const retryOperations = new azure.LinearRetryPolicyFilter(AZURE_STORAGE_RETRY_COUNT, AZURE_STORAGE_RETRY_INTERVAL);
const CONTAINER = "inputimages";
const PIPELINE = [ "generalclassificationinput",  "ocrinput", "facedetectioninput", "faceprintinput", "facematchinput", "pipelineoutput" ];
const MESSAGE_QUEUE = PIPELINE[0];
const connString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const storageAccount = parseStorageAccount(connString, "AccountName");
const blobHostName = "https://" + storageAccount + ".blob.core.windows.net/" + CONTAINER + "/";

function guid (){
    function _p8(s) {
        var p = (Math.random().toString(16)+"000000000").substr(2,8);
        return s ? "-" + p.substr(0,4) + "-" + p.substr(4,4) : p ;
    }
    return _p8() + _p8(true) + _p8(true) + _p8();
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

function getQueueMessage(image){
    var message = {
        job_definition: {
            id: image.batchId,
            input: {
                image_url: blobHostName + image.batchId + "/" + image.blobName,
                 image_parameters: {
                    lastModifiedDate: image.lastModifiedDate,
                    originalName: image.originalName,
                    mimeType: image.type,
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

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(function(req, res, next) {
   res.header('Access-Control-Allow-Origin', "*");
   res.header('Access-Control-Allow-Credentials', true);
   res.header('Access-Control-Allow-Methods', 'OPTIONS,GET,POST,PUT,DELETE');
   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, batchId, Cache-Control, Content-Type, Accept, Authorization");

   // intercept OPTIONS method
   if ('OPTIONS' == req.method) {
       res.sendStatus(200);
   } else {
       next();
   }
});

app.post('/api/upload', function (req, res) {
  var bs = azure.createBlobService();
  var form = new multiparty.Form();
  
  form.on('part', function(part) {
        var fileName = part.filename;
        var batchId = req.headers['batchid'];

        if(!batchId){
            let errMsg = 'Batch ID is undefined error';
            console.error(errMsg);
            return res.status(500).send({ error: errMsg })
        }

        var blobId = guid();
        var fileNameSplit = fileName.split('.');
        var ext = fileNameSplit.length > 1 ? fileNameSplit[fileNameSplit.length - 1] : '';
        var blobname = ext.length !== '' ? blobId+'.'+ext : blobId;
        var containerName = CONTAINER;
        console.log(containerName + ' - ' + blobname);

        bs.createBlockBlobFromStream(containerName, batchId + "/" + blobname, part, req.headers['content-length'], {}, function(error){
            if(error){
                console.error('Uploading Error: ' + error);
            }else{
                console.log('Uploaded file ' + fileName + ' blob: ' + blobname + ' to blob store ' + CONTAINER);
            }

            res.send({ responseText: blobname });
     });
   });

   form.parse(req);
 });

 app.post('/api/processQueue', function(req, res) {
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
});

app.listen(process.env.PORT || 5000);