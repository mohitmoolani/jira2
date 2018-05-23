var express = require('express');
var session = require('express-session');
var OAuth = require('oauth').OAuth;
var fs = require('fs');

var app = express();

app.use(session({ secret: 'red', saveUninitialized: true, resave: true }));

app.get('/', function(req, res) {
    res.send("Hello World!");
});

var base_url = "https://resourcevisibility.atlassian.net"; //example https://test.atlassian.net

app.get('/jira', function(req, res) {
    
    var oa = new OAuth(base_url + "/plugins/servlet/oauth/token", //request token
        base_url + "/plugins/servlet/oauth/accesstoken", //access token
        "mykey", //consumer key 
        fs.readFileSync('jira.pem', 'utf8'), //consumer secret, eg. fs.readFileSync('jira.pem', 'utf8')
        '1.0', //OAuth version
        "http://localhost:1337/jira/callback", //callback url
        "RSA-SHA1");
    oa.getOAuthRequestToken(function(error, oauthToken, oauthTokenSecret) {
        if (error) {
            console.log('Error:', error);
            console.log(oauthToken);
            console.log(oauthTokenSecret);
            res.send('STEP 1: Error requesting OAuth access token');
        } else {
            req.session.oa = oa;
            req.session.oauth_token = oauthToken;
            req.session.oauth_token_secret = oauthTokenSecret;
            return res.redirect(base_url + "/plugins/servlet/oauth/authorize?oauth_token=" + oauthToken);
        }
    });
});

app.get('/jira/callback', function(req, res) {
    if (req.query.oauth_verifier === 'denied') {
      console.log('Error:', {'oauth_verifier': 'denied'})
      return res.send('STEP 2: Error authorizing OAuth access token')
    }
    var oa = new OAuth(req.session.oa._requestUrl,
        req.session.oa._accessUrl,
        req.session.oa._consumerKey,
        fs.readFileSync('jira.pem', 'utf8'), //consumer secret, eg. fs.readFileSync('jira.pem', 'utf8')
        req.session.oa._version,
        req.session.oa._authorize_callback,
        req.session.oa._signatureMethod);
    console.log(oa);

    oa.getOAuthAccessToken(
        req.session.oauth_token,
        req.session.oauth_token_secret,
        req.query.oauth_verifier,
        function(error, oauth_access_token, oauth_access_token_secret, results2) {
            if (error) {
                console.log('Error:', error);
                res.send('STEP 3: Error accessing OAuth access token');
            } else {
                // store the access token in the session
                req.session.oauth_access_token = oauth_access_token;
                req.session.oauth_access_token_secret = oauth_access_token_secret;

                res.send({
                    message: "successfully authenticated.",
                    access_token: oauth_access_token,
                    secret: oauth_access_token_secret
                });

            }
        });
});

app.get('/projects', function(req, res) {
    var consumer = new OAuth(
        base_url+"/plugins/servlet/oauth/token",
        base_url+"/plugins/servlet/oauth/accesstoken",
        "mykey",
        fs.readFileSync('jira.pem', 'utf8'), //consumer secret, eg. fs.readFileSync('jira.pem', 'utf8')
        '1.0',
        "http://localhost:1337/jira/callback",
        "RSA-SHA1"
    );

    function callback(error, data, resp) {
        //console.log(data);
        //data = JSON.parse(data);
        console.log("data,", data, "error,", error);
        return res.send(data);
    }
    consumer.get(base_url+"/rest/api/2/project",
        "OAUTH_TOKEN", //authtoken
        "TOKEN_SECRET", //oauth secret
        callback);

});

app.listen(process.env.PORT || 5000, function() {
    console.log('Example app listening on port 1337!');
});
