// to run go to folder contining this file in terminal 
//(Tylers-MBP-7:~ tylershultz$ cd Desktop/SensiMetrics/)
// and run npm start
//start mongodb with sudo mongod in a separate terminal window

// to update codeon web:
// Open github desktop App, select SensiMetrics, press commit to master
// cd into this SensiMetrics folder and run >> git push heroku master
// go to http://sensimetrics.herokuapp.com/

// to test requests open postman



var express = require('express');
var bodyParser = require('body-parser'); //parses a URL request
var Result = require('./model');// gets the output from our database
var Users = require('./users');//database stores user information
var swig  = require('swig');
var path = require('path');
var multer = require('multer');
var app = express();// express is our server
var upload = multer({dest: './uploads/'});
var cookieParser = require('cookie-parser');
var session = require('express-session');
var http = require('http');
var AWS = require('aws-sdk');

var FitbitApiClient = require('fitbit-node');

var fs = require('fs');

var AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
var AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
var S3_BUCKET = process.env.S3_BUCKET;
var SESSION_SECRET = process.env.SESSION_SECRET;
var FITBIT_CLIENT_ID = process.env.CLIENT_ID;
var FITBIT_CLIENT_SECRET = process.env.CLIENT_SECRET;
var FITBIT_CALLBACK_URL = process.env.CALLBACK_URL;

var incomingFile = "";
var AWSfileName = "";
var expID_ard = "";


AWS.config.update({
	accessKeyId: AWS_ACCESS_KEY, 
	secretAccessKey: AWS_SECRET_KEY 
})

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads')
    },
    filename: function (req, file, cb) {
        cb(null, 'expID_' + file.originalname)
  }
})

var upload = multer({ storage: storage })

app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({secret: "shhhh"}));

//Sets our server to port 3000. Access page at localhost:3000
// var port = 3000;
app.set('port', (process.env.PORT || 3000));

//If a get request is followed by just '/json', report that the site was hit, and respond with our entire database
app.get('/json', function(req, res, next){ 
	
	Result.find({}, function(err ,results){
		res.json(results);
	});	
});


// If a get request is followed by '/', take to login page
app.get('/', function(req, res, next){ 
	console.log('entered login page');
	
	//so that hitting the back button back to login page does not save credentials
	res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

	req.session.regenerate(function(err){
		console.log('regenerated session:');
	})
	// res.sendFile(__dirname + '/views/login.html');
	res.sendFile(__dirname + '/index.html');

});

app.get('/forgotpassword/', function(req, res, next){
	res.send('that SUCKS');
});

// If a get request contains username and password information
app.post('/app.js/', function(req, res, next){

	if(!req.session.username){
		console.log('create new session username');
		req.session.username = req.body.username;
		req.session.password = req.body.password;

	}
	var user = req.session.username;
	var pass = req.session.password;



	Users.findOne({username : user}, function(err, currentUser){
		if(currentUser.length == 0){
			res.send("User does not exist");
		}
		else if(currentUser.password != pass){
			res.send("incorrect password");
		} 
		else{
			Result.find({user : currentUser.username}, function(err ,results){			
				res.render('template', {
		   		pagename: currentUser.username + '\'s ' + 'Health Portal',
		    	finalValues: results
				});
			});	
		}
	});
});


// Make a new username and password
app.post('/app.js/newUser/', function(req, res, next){
	var user = req.body.username;
	var pass = req.body.password;
	var rep_pass = req.body.rep_pass;

	if(pass == rep_pass){
		Users.find({username : user}, function(err, existingUser){
			console.log(existingUser);
			if(existingUser.length > 0){
				res.send("This user already exists");
			}
			else{
				Users.create(req.body, function(err, result){
					res.redirect(client.getAuthorizeUrl('activity heartrate location nutrition profile settings sleep social weight',CALLBACK_URL));
					
				});
			}
		});	
	}else{
		res.send('passwords did not match');
	}
});

// Upload csv data
app.post('/dataUpload', upload.single('dataFile'), function(req, res, next){
	var expID = req.file.originalname;
	console.log('got experiment ID');
	console.log(req);

	var s3 = new AWS.S3();
	console.log('created new AWS client');

	var stream = fs.createReadStream(req.file.path);


	var params = {
		Bucket: S3_BUCKET,
		Key: expID,
		Body: stream,
		ACL: 'public-read'
	};

	var filePathAWS = 'http://s3-us-west-2.amazonaws.com/sensiwebbucket/';
	
	filePathAWS = filePathAWS + expID;

	expID = expID.slice(0, expID.length-4);//remove extension to get expID


	s3.putObject(params, function(err, res){
		if(err){
			console.log('error uploading data');
		}else{
			console.log('data successfully uploaded to AWS S3');
		}
	})

	Result.find({experiment_id : expID}, function(err, currUser){
		console.log('searching database');
		if(currUser.length == 1){
			console.log('user found');
			currUser = currUser[0];
			currUser.dataFile = filePathAWS;
			currUser.download = "Download";
			currUser.analysis = "Analysis";
			currUser.save();
			console.log('user saved');

			res.redirect(307, 'back');
		}		
		else if(currUser.length > 1){
			res.send("multiple experiments matched this experiment ID");
		}
		else{
			res.send("could not find matching experiment ID");
		}
	});
});

// Upload csv data
app.post('/dataUploadFromArduino', upload.single('file'), function(req, res, next){
	incomingFile += req.body.fileContent;
	console.log(req.body.fileContent);
	res.json("data received"); 
 
});

app.get('/incomingFile/:lineType/:line', function(req, res, next){

	// if(req.params.lineType == "user"){
	// 	incomingFile = req.params.line;
	// 	incomingFile += ",";
	// 	res.json(incomingFile);
	// }
	if(req.params.lineType == "expID"){

		incomingFile = "";
		
		expID_ard = req.params.line;
		AWSfileName = expID_ard + ".csv";

		console.log("file name:");
		console.log(AWSfileName);

		res.json(incomingFile);

	}else if(req.params.lineType == "data"){
		incomingFile += req.params.line;
		incomingFile += "\n"

		console.log("GET REQUEST DATA");
		console.log(req.params.line);	
		// res.json("GET line accepted");
		res.json(incomingFile)
	}else if(req.params.lineType == "DONE"){
		var s3 = new AWS.S3();
		console.log('created new AWS client');

		var params = {
			Bucket: S3_BUCKET,
			Key: AWSfileName,
			Body: incomingFile,
			ACL: 'public-read'
		};

		var filePathAWS = 'http://s3-us-west-2.amazonaws.com/sensiwebbucket/';
		
		filePathAWS = filePathAWS + AWSfileName;

		s3.putObject(params, function(err, res){
			if(err){
				console.log('error uploading data');
			}else{
				console.log('data successfully uploaded to AWS S3');
			}
		})

		console.log("expID: ");
		console.log(expID_ard);
		console.log("want: '16'");
		Result.find({experiment_id : expID_ard}, function(err, currUser){
			console.log('searching database');
			if(currUser.length == 1){
				console.log('user found');
				currUser = currUser[0];
				currUser.dataFile = filePathAWS;
				currUser.download = "Download";
				currUser.analysis = "Analysis";
				currUser.save();
				console.log('user saved');

				// res.redirect(307, 'back');
				res.send("file stored")

			}		
			else if(currUser.length > 1){
				console.log("multiple experiments matched this expID");
				res.send("multiple experiments matched this experiment ID");
			}
			else{
				console.log("could not find matching expID");
				res.send("could not find matching experiment ID");
			}
		});
	}
});

// If a get request is followed by '/all', return all results
app.get('/all', function(req, res, next){ 
	
	Result.find({}, function(err ,results){			
		res.render('template', {
	   		pagename: 'All Data',
	    	finalValues: results
		});
	});		
});

app.get('/all/users', function(req, res, next){ 
	
	Users.find({}, function(err ,existingUsers){			
		res.render('listUsers', {
	   		pagename: 'All Users',
	    	usernames: existingUsers
		});
	});		
});

// If a get request is followed by '/device', display only results from that device
app.get('/device/:deviceID', function(req, res, next){ 
	var device = req.params.deviceID;
	Result.find({device_id : device}, function(err ,results){			
		res.render('template', {
	   		pagename: 'Device ID: ' + device,
	    	finalValues: results
		});
	});		
});

// localhost:300/id/563348774
app.get('/id/:id', function(req, res, next){
	var id = req.params.id;
	Result.findById(id, function(err, result){
		if (err) {
			next(err);
		} else { 
			res.json(result);
		}
	});
});

//show model of specific experiment
app.get('/expid/:expid', function(req, res, next){
	var expID = req.params.expid;
	Result.find({experiment_id : expID}, function(err, currUser){
		if(currUser.length > 0){
			res.send(currUser);
		}
		else{
			res.send("could not find matching experiment ID");
		}
	})
});



app.post('/', function(req, res, next){
	//assume req body has bsa biotin thc
	console.log("in post");
	console.log(req.body);
	if (req.body.bsa && req.body.thc && req.body.biotin){
		Result.create(req.body, function(err, result){
			res.json(result);	
		});
	}
	else {
		next();
	}
});

app.get('/incomingData/:bsa/:thc/:biotin/:ref/:user/:experiment_id/:device_id', function(req, res, next){
	//assume req body has bsa biotin thc
	console.log("into incomingData");
	console.log(req.params);
	if (req.params.bsa && req.params.thc && req.params.biotin){
		Result.create(req.params, function(err, result){
			res.json(result);	
		});
	}
	else {
		next();
	}
});

app.delete('/all', function(req, res, next){
	Result.remove({}, function(){
		res.end(); //returns nothing
	});
});

// delete all users and passwords
app.delete('/user/all', function(req, res, next){
	Users.remove({}, function(){
		res.end(); //returns nothing
	});
});

// delete specified user and password
app.delete('/user/:user', function(req, res, next){
	var user = req.params.user;
	Users.remove({username : user}, function(){
		res.end(); //returns nothing
	});
});



app.delete('/id/:id', function(req, res, next){
	var id = req.params.id;
	Result.findByIdAndRemove(id, function(err){
		if(err){
			next(err);
		} else{
			res.end();
		}
	});
});

app.delete('/files/all', function(req, res, next){
	Result.find({}, function(err, allExperiments){
		for (exp in allExperiments){
			allExperiments[exp].dataFile = 'noFile';
			allExperiments[exp].download = 'Not_Available';
			allExperiments[exp].analysis ='Not_Available';
			allExperiments[exp].save();

		}
		res.send("removed all files");
	});
});

// error handling

app.use(function (req, res, next){
	var err = new Error("Not Found");
	err.status = 404;
	next(err);
});

app.use(function(err, req, res, next){
	res.status(err.status || 500);
	console.log("an error occured");
	res.sendFile(__dirname + '/err.html');
});
	
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
