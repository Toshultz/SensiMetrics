var mongoose = require('mongoose');
var Grid = require('gridfs-stream');

// var db = mongoose.connect('mongodb://localhost/basicwebpage');
var db = 'mongodb://toshultz:sensi@ds039175.mongolab.com:39175/sensidata';
mongoose.connect(db);
mongoose.connection.on('error', console.error.bind(console, 'connection error:'));

var resultSchema = new mongoose.Schema({
	time: {type: Date, default: Date.now},
	user: {type: String},
	experiment_id: {type: String},
	device_id: {type: Number},
	bsa: {type: Number},
	biotin: {type: Number},
	thc: {type: Number},
	ref: {type: Number},
	dataFile: {type: String, default: "noFile"}
	
});

module.exports = mongoose.model('Result', resultSchema);