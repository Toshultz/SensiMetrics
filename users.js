var mongoose = require('mongoose');

// var db = mongoose.connect('mongodb://localhost/basicwebpage');
var db = 'mongodb://<dbuser>:<dbpassword>@ds039175.mongolab.com:39175/sensiusers';
// var db = 'mongodb://heroku_c8pv1gdm:mom56king@ds039115.mongolab.com:39115/heroku_c8pv1gdm';
mongoose.connect(db);
mongoose.connection.on('error', console.error.bind(console, 'connection error:'));

var userSchema = new mongoose.Schema({
	username: {type: String},
	password: {type: String}
});


module.exports = mongoose.model('Users', userSchema);