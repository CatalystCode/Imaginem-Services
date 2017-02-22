var express = require('express');
var azure = require('azure-storage');
var app = express();
var fs = require ("fs");
var multiparty = require('multiparty');

const CONTAINER = "images";
const BLOB = "test"

function guid (){
    function _p8(s) {
        var p = (Math.random().toString(16)+"000000000").substr(2,8);
        return s ? "-" + p.substr(0,4) + "-" + p.substr(4,4) : p ;
    }
    return _p8() + _p8(true) + _p8(true) + _p8();
}

app.use(function(req, res, next) {
   res.header('Access-Control-Allow-Origin', "*");
   res.header('Access-Control-Allow-Credentials', true);
   res.header('Access-Control-Allow-Methods', 'OPTIONS,GET,POST,PUT,DELETE');
   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Cache-Control, Content-Type, Accept, Authorization");

   // intercept OPTIONS method
   if ('OPTIONS' == req.method) {
       res.sendStatus(200);
   } else {
       next();
   }
});

app.post('/upload', function (req, res) {
  var bs = azure.createBlobService();
  var form = new multiparty.Form();
  form.on('part', function(part) {
        var fileName = part.filename;
        var blobId = guid();
        var fileNameSplit = fileName.split('.');
        var ext = fileNameSplit.length > 1 ? fileNameSplit[fileNameSplit.length - 1] : '';
        var blobname = ext.length !== '' ? blobId+'.'+ext : blobId;

        bs.createBlockBlobFromStream(CONTAINER, blobname, part, req.headers['content-length'], {}, function(error){
            if(error){
                console.error('Uploading Error: ' + error);
            }else{
                console.log('Uploaded file ' + fileName + ' to blob store ' + CONTAINER);
            }

            res.send({ responseText: blobname });
     });
   });

   form.parse(req);
 });

app.listen(process.env.PORT || 5000);