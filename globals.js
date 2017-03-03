 
const connString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER = "inputimages";

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

module.exports = {
    parseStorageAccount: function(connectionString, key){
        return parseStorageAccount(connectionString, key);
    },
    blobImagePath: function(batchId, blobName){
        const storageAccount = parseStorageAccount(connString, "AccountName");

        return "https://" + storageAccount + ".blob.core.windows.net/" + CONTAINER + "/" + batchId + "/" + blobName;
    }
}