var ws;
var results;

console.log('Connecting on WebSocket server...');
ws = new WebSocket('ws://' + window.location.hostname + ':5050');
ws.onopen = function (data) {
    console.log('Connected');
}

ws.onmessage = function (data) {
    data = JSON.parse(data.data);
    switch (data.type) {
        case 'searching':
            console.log('Searching for "' + data.value + '"...')
            break;
        case 'searchdone':
            console.log('Searching for "' + data.value + '" done!')
            break;
        case 'result':
            $("#spinner").css({
                "display": "none"
            });
            $("#music-list").css({
                "display": ""
            });
            results = data.results;
            for (var i in results) {
                $("#table-list").append('<tr><td class="mdl-data-table__cell--non-numeric">' + results[i].artist + '</td><td class="mdl-data-table__cell--non-numeric">' + results[i].title + '</td><td>' + results[i].duration + '</td><td class="mdl-data-table__cell--non-numeric"><button onclick="javascript:downloadById(' + results[i].id + ')" class="mdl-button mdl-js-button mdl-button--accent">Download</button></td></tr>')
            }
            break;
        case 'downloadupdate':
            document.getElementById('done').innerHTML = data.done + "% done...";
            break;
        case 'downloadsuccess':
            console.log(data);
            document.getElementById('done').innerHTML = "100% done... Redirecting...";
            window.location.href = 'http://' + window.location.host + data.url;
            break;
    }
}



function searchSongs(name) {
    ws.send(JSON.stringify({
        type: 'search',
        value: name
    }));
}

$('#submit').bind('click', function () {
    $("#input-area").css({
        "display": "none"
    });
    $("#spinner").css({
        "display": ""
    });
    searchSongs($('#search').val());
});

function downloadById(id) {
    var downItem = arraySearch(id, results);
    ws.send(JSON.stringify({
        type: 'download',
        value: id
    }));
    $("#music-list").css({
        "display": "none"
    });
    document.getElementById('downloading').innerHTML = "Downloading " + downItem.artist + " - " + downItem.title + "...";
}

function arraySearch(nameKey, myArray) {
    for (var i = 0; i < myArray.length; i++) {
        if (myArray[i].id === nameKey) {
            return myArray[i];
        }
    }
}
