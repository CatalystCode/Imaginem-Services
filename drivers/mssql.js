//var mssql = require('tedious');
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
            }
};

module.exports = {
 invokeCommand(res, query, queryCallbackHandler){
     //var connection = new mssql.Connection(config);

    try{
        mssql.connect(config).then(function() {
            new mssql.Request()
                .query(query).then(function(recordset) {
                    queryCallbackHandler(recordset, res);
                }).catch(function(err) {
                    console.log('an error occured ' + err);
                });
        });
    }catch(err){
        console.log('exception ' + err);
    }
 }
};