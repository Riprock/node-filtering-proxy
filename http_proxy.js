/*
  Rules in rules.js, optional proxy in proxy.json. Just `node http_proxy.js`.
*/

/*
  Currently matching is just the URL, and filters are functions.
*/

var http = require('http'),
    net = require('net'),
    fs = require('fs');

var monitorFileForProperty = function(object, property, file, wayToEval) {
  // Use sync so property is always set after calling function
  if (fs.existsSync(file)) {
    try {
      object[property] = wayToEval(fs.readFileSync(file, 'utf8'));
    }
    catch (err) {
      object[property] = null;
    }
  }
  // Then wait for changes, fs.watch doesn't seem to work on OS X
  fs.watchFile(file, function (curr, prev) {
    if (curr.mtime > prev.mtime) {
      fs.readFile(file, function(err, data) {
        try {
          object[property] = wayToEval(data);
        }
        catch (err) {
          object[property] = null;
        }
        console.log(property + ' updated');
      });
    }
  });
};

var config = {};
monitorFileForProperty(config, 'proxy', './proxy.json', JSON.parse);
monitorFileForProperty(config, 'rules', './rules.js', eval);

//config.rules = []; // For testing.

var currentUrls = [];

var server = http.createServer(function (client_request, client_resp) {
  var host;
  var port;
  var path;
  
  currentUrls.push(client_request.url);

  client_request.url.replace(/^http:\/\/([^\/:]+)(?::(\d+))?(.*)/, function(m, h, po, pa) {
    host = h;
    port = po;
    path = pa;
  });

  var filtering = false;
  var rule;
  for (var i = 0; i < config.rules.length; i++) {
    if (config.rules[i].match.test(client_request.url)) {
      filtering = true;
      rule = i;
      break;
    }
  }

  if (filtering && config.rules[rule].replace) {
    // Useful if you know you don't want to wait
    console.log('Replacing ' + config.rules[rule].name);
    console.log(client_request.url);
    var data = config.rules[rule].filter();
    client_resp.setHeader('Content-length', data.length);
    client_resp.write(data);
    client_resp.end();
    currentUrls.splice(currentUrls.indexOf(client_request.url), 1);
    return;
  }

  path = path || '/';

  var request_headers = client_request.headers;
  if (config.proxy && config.proxy.username) {
    request_headers['Proxy-authorization'] = 'Basic '
      + (new Buffer(config.proxy.username + ':' + config.proxy.password))
      .toString('base64');
  }
  var request = http.request({
    method : client_request.method,
    hostname : (config.proxy && config.proxy.host) || host,
    port : (config.proxy && config.proxy.port) || port || 80,
    path : (config.proxy && config.proxy.host) ? client_request.url : path,
    headers : request_headers
  });
  
  // Don't know if this is needed yet
  request.on('continue', function() {
    console.log("Actually continuing - " + client_request.url);
    client_resp.writeContinue();
  });
  
  request.on('error', function(error) {
    console.log('Request error: '+ error.message, host);
    currentUrls.splice(currentUrls.indexOf(client_request.url), 1);
  });
  
  client_request.addListener("data", function (chunk) {
    request.write(chunk);
  });

  client_request.addListener("end", function () {
    request.on('response', function (foreign_response) {
      // If you want more info on responses
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
          console.log('Filtering ' + config.rules[rule].name);
          console.log(client_request.url);
          var newData = config.rules[rule].filter(data);
          //console.log(data);
          client_resp.setHeader('Content-length', newData.length);
          client_resp.write(newData);
        }
        client_resp.end();
        currentUrls.splice(currentUrls.indexOf(client_request.url), 1);
      });
    });

    request.end();
  });
});

// HTTPS
server.on('connect', function(request, socket, head) {
  var port;
  request.url.replace(
    /([^\/:]+)(?::(\d+))?(.*)/,
    function(m, h, po, pa) {
      port = po;
    }
  );
  var rsocket = net.connect(port, request.headers.host, function() {
    socket.write("HTTP/1.0 200\n");
    socket.write("\n");
  });
  rsocket.on('data', function(data) {
    socket.write(data);
  });
  socket.on('data', function(data) {
    rsocket.write(data);
  });
  rsocket.on('close', function() {
    socket.destroy();
  });
  rsocket.on('error', function(error) {
    console.log('HTTPS: ' + error + ' ' + request.url);
  });
});

server.listen(8000);
console.log('Server running at http://127.0.0.1:8000');

process.stdin.setEncoding('utf8');
process.stdin.on('data', function(chunk) {
  if (chunk == "s\n") {
    for (var i = 0; i < currentUrls.length; i++) {
      console.log(currentUrls[i]);
    }
  }
});
process.stdin.resume();

// vim: set shiftwidth=2:
// vim: set tabstop=2:
// vim: set expandtab:
