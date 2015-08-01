var request = require("request");
var https = require('https');
var fs = require('fs');
var progress = require('request-progress');
var mkpath = require('mkpath');
var express = require('express');
var app = express();
var WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({
        port: 5050
    });
var runningThreads = 0;

/* SET YOUR TOKEN FROM VK */

var accessToken = "YOUR TOKEN HERE";


wss.on('connection', function connection(ws) {
    var parsedBody = [];
    ws.on('message', function incoming(data) {
        data = JSON.parse(data);
        console.log(data);
        switch (data.type) {
            case 'search':
                ws.send(JSON.stringify({
                    type: 'searching',
                    value: data.value
                }));
                var songList = [];
                var songNameEnc = encodeURIComponent(data.value);
                request({
                    url: "https://api.vk.com/method/audio.search?q=" + songNameEnc + "&access_token=" + accessToken,
                    json: true
                }, function (error, response, body) {
                    if (!error && response.statusCode === 200) {

                        for (var i = 1; i < body.response.length; i++) {
                            parsedBody[i - 1] = {
                                id: body.response[i].aid,
                                artist: body.response[i].artist,
                                title: body.response[i].title,
                                duration: body.response[i].duration,
                                url: body.response[i].url
                            }
                        };
                        for (var i = 1; i < body.response.length; i++) {
                            songList[i - 1] = {
                                id: body.response[i].aid,
                                artist: body.response[i].artist,
                                title: body.response[i].title,
                                duration: body.response[i].duration
                            }
                        };
                        ws.send(JSON.stringify({
                            type: 'result',
                            results: songList,
                            value: data.value
                        }));
                        ws.send(JSON.stringify({
                            type: 'searchdone',
                            value: data.value
                        }));
                    }
                });

                break;
            case 'download':
                var downloadItem = arraySearch(data.value, parsedBody);
                try {
                    mkpath.sync('public/musics/' + downloadItem.id, 0777);
                    ws.send(JSON.stringify({
                        type: 'downloadstarted'
                    }));
                    runningThreads++;
                    progress(request(downloadItem.url), {
                            throttle: 500,
                            delay: 0 //
                        })
                        .on('progress', function (state) {
                            try {
                                ws.send(JSON.stringify({
                                    type: 'downloadupdate',
                                    size: state.total,
                                    downloaded: state.total,
                                    done: state.percent
                                }));
                            } catch (err) {
                                console.log("[WS] Error: socket probably closed");
                            }
                            console.log('[%s][%s%] Downloading %s - %s ID: %s', runningThreads, state.percent, downloadItem.artist, downloadItem.title, downloadItem.id);
                        })
                        .on('error', function (err) {
                            // Do something with err
                        })
                        .pipe(fs.createWriteStream('public/musics/' + downloadItem.id + '/' + downloadItem.artist + ' - ' + downloadItem.title + '.mp3'))
                        .on('error', function (err) {
                            // Do something with err
                        })
                        .on('close', function (err) {
                            try {
                                ws.send(JSON.stringify({
                                    type: 'downloadsuccess',
                                    url: '/musics/' + downloadItem.id + '/' + downloadItem.artist + ' - ' + downloadItem.title + '.mp3'
                                }))
                            } catch (err) {
                                console.log("[WS]Error: socket probably closed");
                            }
                            console.log('[%s][%s%] Downloading %s - %s ID: %s', runningThreads, 100, downloadItem.artist, downloadItem.title, downloadItem.id);
                            runningThreads--;
                        });
                } catch (err) {
                    console.log(err);
                }
                break;
        }
    });
    ws.on('end', function () {

    });
    ws.on('close', function () {

    });
});


app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});
app.use(express.static('public'));

var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Express server up in http://%s:%s', host, port);
});



function arraySearch(nameKey, myArray) {
    for (var i = 0; i < myArray.length; i++) {
        if (myArray[i].id === nameKey) {
            return myArray[i];
        }
    }
}
