var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var uploaderResolver = require('./resolvers/upload');
var messageQueueResolver = require('./resolvers/processImageQueue');
var recentBatchResolver = require('./resolvers/fetchRecentBatches');
var imageResolver = require('./resolvers/fetchImages');

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
    uploaderResolver.uploadImage(req, res);
});

app.post('/api/processQueue', function(req, res) {
    messageQueueResolver.pushImagesToQueue(req, res);
});

app.get('/api/fetchRecentBatches', function(req, res) {
    recentBatchResolver.fetchRecentlyUploadedBatches(req, res);
});

app.get('/api/fetchImagesFromBatchId', function(req, res) {
    imageResolver.fetchImagesFromBatchId(req, res);
});

app.post('/api/fetchRecentImages', function(req, res) {
    imageResolver.fetchRecentImages(req, res);
});

app.get('/api/fetchTagList', function(req, res) {
    imageResolver.fetchTagList(req, res);
});

app.listen(process.env.PORT || 5000);