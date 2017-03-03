var azure = require('azure-storage');
var multiparty = require('multiparty');

const CONTAINER = "inputimages";

function guid (){
    function _p8(s) {
        var p = (Math.random().toString(16)+"000000000").substr(2,8);
        return s ? "-" + p.substr(0,4) + "-" + p.substr(4,4) : p ;
    }
    return _p8() + _p8(true) + _p8(true) + _p8();
}

module.exports = {
    uploadImage(req, res){
        var bs = azure.createBlobService();
        var form = new multiparty.Form();
        
        form.on('part', function(part) {
                var fileName = part.filename;
                var batchId = req.headers['batchid'];

                if(!batchId){
                    let errMsg = 'Batch ID is undefined error';
                    console.error(errMsg);
                    return res.status(500).send({ error: errMsg });
                }

                var blobId = guid();
                var fileNameSplit = fileName.split('.');
                var ext = fileNameSplit.length > 1 ? fileNameSplit[fileNameSplit.length - 1] : '';
                var blobname = ext.length !== '' ? blobId+'.'+ext : blobId;
                var containerName = CONTAINER;
                console.log(containerName + ' - ' + blobname);
                bs.createContainerIfNotExists(containerName, { publicAccessLevel: 'container' }, function (error, result, response) {
                    if (!error) {
                        bs.createBlockBlobFromStream(containerName, batchId + "/" + blobname, part, req.headers['content-length'], {}, function (error) {
                            if (error) {
                                console.error('Uploading Error: ' + error);
                            } else {
                                console.log('Uploaded file ' + fileName + ' blob: ' + blobname + ' to blob store ' + CONTAINER);
                            }
                            res.send({ responseText: blobname });
                        });
                    }
                });
      });

      form.parse(req);
  }
}