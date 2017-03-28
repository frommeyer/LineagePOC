/**
 * Ping Service API by Tim Frommeyer August 23, 2016
 * with OAuth 2 provider, /authenticate
 */
var basePath = "/v1";
var retBody = [];
var express = require('express');
var app = express(); //creates server
var request = require("request"); //outbound http requests
var https = require('https');
var basicAuth = require('basic-auth'); //for OAuth

//cfenv provides access to your Cloud Foundry environment
//for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

//set root for files
var path = require('path');
var fs = require('fs');
var fsRoot = __dirname + '/public/';

//serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));
console.log('Static file location: ' + fsRoot);

//get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

var bodyParser = require('body-parser');
app.use(bodyParser.json());	// to support JSON-encoded bodies

function getTimestamp(){
	var date = new Date();
	var dateStr = date.toString();
	
	return dateStr;
}

//used to test availability
var pingCnt = 1;
function PingResult(pingMessage) {
    this.pingMessage = pingMessage;
}

app.get(basePath + '/Ping/:request_id', function(request, response){
	var requestID = request.params.request_id;
	console.log(getTimestamp() + " GET- " + basePath + "/Ping/" + requestID + " Count:" + pingCnt++);
	console.log("Inbound: " + getTimestamp() + " GET request id: " + requestID);
	pingJson = new PingResult(requestID);

	response.send(pingJson);    //returns request ID received as JSON
	console.log("Outbound: " + getTimestamp() + ":" + requestID);
});

app.get(basePath + '/PingYou/:request_id', function(request, response){
//app.get(basePath + '/Ping/:request_id?name=:name&greeting=:greeting', function(request, response){
	var requestID = request.params.request_id;
	var name = request.query.name;
	var greeting = request.query.greeting;
	var outMsg;
	
	console.log(getTimestamp() + " GET- " + basePath + "/PingYou/" + requestID + " Count:" + pingCnt++);
	console.log("Inbound: " + getTimestamp() + " GET request id: " + requestID);
	console.log("GET query Name: " + name + " GET query greeting: " + greeting);
	outMsg = greeting + ", " + name + " " + requestID;
	pingJson = new PingResult(outMsg);

	response.send(pingJson);    //returns request ID received as JSON
	console.log("Outbound: " + getTimestamp() + ":" + outMsg);
});

//serves all the other static files
app.get(basePath + '/^(.+)$/', function(request, response){
	var filename = request.params[0].substring(1);
     console.log(getTimestamp() + ' static file request : ' + filename + ' URL: ' + request.url);
     //res.sendFile( __dirname + request.params[0]); //must be in src dir
     //response.sendFile( '/projects/JavaScript/MyFirstNodeJS' + request.params[0]); //can be in html or src
     //response.sendFile(filename, options); //can be in html or src
     //response.sendFile(path.resolve('public/' + filename));
     //response.sendFile('index1.html', { root: path.join(__dirname, '../public') });
     response.sendFile(filename, { root: path.join(__dirname, './public') });
});

app.options('*', function(request, response, next) {
	console.log("in options for origin URL of " + request.originalUrl);
	response.header("Access-Control-Allow-Origin", "*");
	response.header("Access-Control-Allow-Headers", "Origin");
	response.header("Access-Control-Allow-Headers", "Accept");
	response.header("Access-Control-Allow-Headers", "X-Requested-With");
	response.header('Access-Control-Allow-Headers', 'Content-Type');
	response.header('Access-Control-Allow-Methods', 'POST, GET, DELETE, PUT, OPTIONS');
	
	next();
});
//
//start of OAuth provider
//
//User registry
var registry = '{ "users" : [' +
   '{ "name":"foo", "pass":"bar"}, ' +
   '{ "name":"nameA", "pass":"passA"} ]}';

var registryObj = JSON.parse(registry);

//Test to see if credentials are in the user registry
var lookup = function(name, pass) {
  //for (var user of registryObj.users) {
	console.log('in lookup func');
	for (var i = 0; i < registryObj.users.length; i++) {
		console.log('User- ' + registryObj.users[i].name + ":" + registryObj.users[i].pass);
		if ((name == registryObj.users[i].name) && (pass == registryObj.users[i].pass)) {
			return true;
		}
  }
  return false;
}
var auth = function (req, res, next) {
	console.log('in auth func');
  function unauthorized(res) {
	  console.log('in unauthorized func');
    res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
    return res.sendStatus(401);
  };

  var user = basicAuth(req);

  if (!user) {
    return unauthorized(res);
  };
  
  console.log('User- ' + user.name + ":" + user.pass);

//  if (user.name === 'foo' && user.pass === 'bar') {
  if (lookup(user.name, user.pass)) {
    return next();
  } else {
    return unauthorized(res);
  };
};

app.get(basePath + '/authenticate', auth, function(request, response) {
	console.log('Enter GET authenticate');
	response.sendStatus(200);
	response.end();
	console.log('Leave GET authenticate');
	return;
});
//
// end of OAuth provider
//
//start server on the specified port and binding host
app.listen(appEnv.port, appEnv.bind, function() {
	// print a message when the server starts listening
	console.log('Server started at ' + getTimestamp() + ' on ' + appEnv.url + ':' + appEnv.port + ':' + appEnv.bind);
});

var options = {
	    root: fsRoot,
	    dotfiles: 'deny',
	    headers: {
	        'x-timestamp': Date.now(),
	        'x-sent': true
	    }
};