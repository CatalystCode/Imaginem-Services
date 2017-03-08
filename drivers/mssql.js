var mssql = require('mssql');
var utils = require('../globals');
const SQL_SERVER_CONNECTION_STRING = process.env.SQL_SERVER_CONNECTION_STRING;

let config = {  
            user: utils.parseStorageAccount(SQL_SERVER_CONNECTION_STRING, "User ID"),
            password: utils.parseStorageAccount(SQL_SERVER_CONNECTION_STRING, "Password"),
            server: utils.parseStorageAccount(SQL_SERVER_CONNECTION_STRING, "Server"),
            database: utils.parseStorageAccount(SQL_SERVER_CONNECTION_STRING, "Initial Catalog"),
            options: {
                encrypt: true
            },
            pool: {
                max: 50,
                min: 2
            }
};

const cp = new mssql.Connection(config);

cp.on('error', function(err) {
      console.error('connection pool exception ' + err);
});

cp.connect().then(function() {
      console.log('Connection pool open for duty');
}).catch(function(err) {
      console.error('exception ' + err);
});

module.exports = {
 invokeCommand(res, query, queryCallbackHandler){
        new mssql.Request(cp)
            .query(query).then(function(recordset) {
                    queryCallbackHandler(recordset, res);
            }).catch(function(err) {
                    console.error('an error occured ' + err);
            });
        }
};