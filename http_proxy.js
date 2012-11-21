/*
  Rules and proxying all in one. Just `node http_proxy.js`.
*/

/*
  Currently matching is just the URL, and filters are functions.
*/
var rules = [
  {
    name : '4OD ads',
    match : /^http:\/\/ais\.channel4\.com\/asset\/.+/,
    filter : function(data) {
      return data.replace(/<adverts>[\s\S]*<\/adverts>/, '');
    }
  }
];
//rules = [];

var sys = require('sys'),
    http = require('http');

var server = http.createServer(function (client_request, client_resp) {
  // sys.puts(sys.inspect(client_request.headers));

  var host;
  var port;
  var path;

  client_request.url.replace(/^http:\/\/([^\/:]+)(?::(\d+))?(.*)/, function(m, h, po, pa) {
    host = h;
    port = po;
    path = pa;
  });

  var filtering = false;
  var rule;
  for (var i = 0; i < rules.length; i++) {
    if (rules[i].match.test(client_request.url)) {
      filtering = true;
      rule = i;
      break;
    }
  }

  path = path || '/';

  // sys.puts(client_request.method + " " + host + " " + path);
  var request = http.request({
    method : client_request.method,
    hostname : host,
    port: port || 80,
    path : path,
    headers : client_request.headers
  });
  
  //Don't know if this is needed yet
  request.on('continue', function() {
    console.log("Actually continuing - " + client_request.url);
    client_resp.writeContinue();
  });
  
  request.on('error', function(error) {
    console.log('Request error: '+ error.message, host);
  });
  
  client_request.addListener("data", function (chunk) {
    request.write(chunk);
  });

  client_request.addListener("end", function () {
    request.on('response', function (foreign_response) {
      // sys.puts("STATUS: " + foreign_response.statusCode);
      // sys.puts("HEADERS: " + JSON.stringify(foreign_response.headers));
      
      //if (foreign_response.statusCode / 100 >= 4) {
      //  console.log(client_request.url + ' '
      //    + foreign_response.statusCode);
      //}
      
      client_resp.statusCode = foreign_response.statusCode;
      for (var name in foreign_response.headers) {
        client_resp.setHeader(name, foreign_response.headers[name]);
      }
      
      var data = '';
      foreign_response.addListener("data", function (chunk) {
        if (filtering) {
          data += chunk;
        }
        else {
          client_resp.write(chunk);
        }
      });
      foreign_response.on('end', function () {
        if (filtering) {
          console.log('Filtering ' + rules[rule].name);
          console.log(client_request.url);
          var newData = rules[rule].filter(data);
          //console.log(data);
          client_resp.setHeader('Content-length', newData.length);
          client_resp.write(newData);
        }
        client_resp.end();
      });
    });

    request.end();
  });
});

server.listen(8000);
sys.puts('Server running at http://127.0.0.1:8000');
