(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// console.log("loaded", "customCreateElement")
document.__proto__.customCreateElement = (tag = 'div', attributes = {}, parent) => {
    // // console.log("customCreateElement", tag, attributes)
    var myNewElement = document.createElement(tag);
    for (var a in attributes) {
        if (myNewElement[a] == '' || typeof attributes[a] == 'function') {
            myNewElement[a] = attributes[a]
        } else {
            myNewElement.setAttribute(a, attributes[a]);

        }
    }
    if (parent) parent.appendChild(myNewElement)
    return myNewElement;
}


function initMap() {
    const map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 0, lng: 0 },
        zoom: 1,
        streetViewControl: false,
        mapTypeControlOptions: {
            mapTypeIds: ["WFRP"],
        },
        gestureHandling: 'greedy'
    });





    const wfrpMapType = new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
            const normalizedCoord = getNormalizedCoord(coord, zoom);

            if (!normalizedCoord) {
                return "";
            }
            const bound = Math.pow(2, zoom);
            return (
                `/images/wfrp/${zoom}/tile_${normalizedCoord.x}_${(normalizedCoord.y-1)}.jpg`

                // "https://mw1.google.com/mw-planetary/lunar/lunarmaps_v1/clem_bw" +
                // "/images"+
                // "/out/" +
                // zoom +
                // "/" +

                // normalizedCoord.x +
                // "/" +
                // (bound - normalizedCoord.y - 1) +
                // ".jpg"
            );
        },
        tileSize: new google.maps.Size(256, 256),
        maxZoom: 6,
        minZoom: 3,
        radius: 10000,
        name: "WFRP",
    });
    map.mapTypes.set("WFRP", wfrpMapType);
    map.setMapTypeId("WFRP");


    google.maps.event.addListener(map, 'click', function(event) {
        placeMarker(event.latLng, "loc");
        saveMarker(event);
    });


    // function placeMarker(location, html) {
    //     var newmarker = new google.maps.Marker({
    //         position: location,
    //         map: map,
    //         title: html
    //     });

    //     newmarker['infowindow'] = new google.maps.InfoWindow({
    //         content: html
    //     });

    //     google.maps.event.addListener(newmarker, 'mouseover', function() {
    //         this['infowindow'].open(map, this);
    //     });
    // }

    // Normalizes the coords that tiles repeat across the x axis (horizontally)
    // like the standard Google map tiles.
    function getNormalizedCoord(coord, zoom) {
        const y = coord.y;
        let x = coord.x;
        // tile range in one direction range is dependent on zoom level
        // 0 = 1 tile, 1 = 2 tiles, 2 = 4 tiles, 3 = 8 tiles, etc
        const tileRange = 1 << zoom;

        // don't repeat across y-axis (vertically)
        if (y < 0 || y >= tileRange) {
            return null;
        }

        // repeat across x-axis
        if (x < 0 || x >= tileRange) {
            x = ((x % tileRange) + tileRange) % tileRange;
        }
        return { x: x, y: y };
    }





    function name() {
        return arguments.callee.caller.name
    }



    function bindViewListeners(mapLayer) {
        mapLayer.addListener('zoom_changed', saveView);
        mapLayer.addListener('center_changed', saveView);
    }


    function saveView() {
        console.log(name())
        localStorage.setItem('center', JSON.stringify(map.getCenter().toJSON()))
        console.log(JSON.stringify(map.getCenter().toJSON()))
        localStorage.setItem('zoom', map.getZoom())
        console.log(map.getZoom())

    }


    function loadView(map) {
        console.log(name())
        var center = localStorage.getItem('center');
        var zoom = localStorage.getItem('zoom');
        map.setCenter(JSON.parse(center));
        map.setZoom(Number(zoom));
    }




    // Apply listeners to refresh the GeoJson display on a given data layer.
    function bindDataLayerListeners(dataLayer) {
        dataLayer.addListener('addfeature', saveMarker);
        dataLayer.addListener('removefeature', saveMarker);



        //dataLayer.addListener('setgeometry', saveMarker);
    }

    function buildInput(feature, storedValue) {
        var inputContainer = document.customCreateElement('div', {})
        var textField = document.customCreateElement('input', {
            type: "text",
            size: "31",
            maxlength: "31",
            value: storedValue||""

        }, inputContainer)
        var saveButton = document.customCreateElement('button', {
            innerText: "Submit",
            onclick: e = () => feature.j.savedContent = textField.value
        }, inputContainer)
        return inputContainer
    }

    function placeMarker(location) {
        var marker = new google.maps.Marker({
            position: location,
            map: map,
            title:"something",
        });


        var feature = map.data.add(new google.maps.Data.Feature({
            properties: {
                savedContent: false
            },
            geometry: new google.maps.Data.Point(location)
        }));


        var inputContainer = buildInput(feature)


        var infowindow = new google.maps.InfoWindow({
            content: inputContainer
        });
        infowindow.open(map, marker);
        google.maps.event.addListener(marker, 'mouseover', function() {
            console.log("this happened")
            infowindow.open(map, marker);
        });


    }


    function saveMarker() {
        console.log(name())
        map.data.toGeoJson(function(json) {
            localStorage.setItem('geoData', JSON.stringify(json));
        });
    }


    function clearMarkers() {
        console.log(name())
        map.data.forEach(function(f) {
            map.data.remove(f);
        });
    }

    function loadMarkers(map, fileString = false) {
        console.log(name())
        if (fileString) {
            var data = JSON.parse(fileString);
        } else {
            var data = JSON.parse(localStorage.getItem('geoData'));

        }
        map.data.addGeoJson(data);
    }





    function exportData() {
        var data = JSON.parse(localStorage.getItem('geoData'));

        function downloadObjectAsJson(exportObj, exportName) {
            var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
            var downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", exportName + ".json");
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        }

        downloadObjectAsJson(data, "WFRP-map-data")
    }



    function makeControl(text, fn, controlDiv, map) {
        // Set CSS for the control border.
        const controlUI = document.createElement("div");
        controlUI.style.backgroundColor = "#fff";
        controlUI.style.border = "2px solid #fff";
        controlUI.style.borderRadius = "3px";
        controlUI.style.boxShadow = "0 2px 6px rgba(0,0,0,.3)";
        controlUI.style.cursor = "pointer";
        controlUI.style.marginBottom = "22px";
        controlUI.style.textAlign = "center";
        controlUI.title = "Click to recenter the map";
        controlDiv.appendChild(controlUI);
        // Set CSS for the control interior.
        const controlText = document.createElement("div");
        controlText.style.color = "rgb(25,25,25)";
        controlText.style.fontFamily = "Roboto,Arial,sans-serif";
        controlText.style.fontSize = "16px";
        controlText.style.lineHeight = "38px";
        controlText.style.paddingLeft = "5px";
        controlText.style.paddingRight = "5px";
        controlText.innerHTML = text;
        controlUI.appendChild(controlText);
        // Setup the click event listeners: simply set the map to Chicago.
        controlUI.addEventListener("click", fn);
    }
    // add buttons
    const centerControlDiv = document.createElement("div");

    makeControl("Export memory", () => exportData(), centerControlDiv, map);
    makeControl("Load view", () => loadView(map), centerControlDiv, map);
    makeControl("Clear markers", () => clearMarkers(), centerControlDiv, map);

    map.controls[google.maps.ControlPosition.LEFT].push(centerControlDiv);
    console.log(google.maps.ControlPosition)


    //map.data.setControls(['Point']);
    bindDataLayerListeners(map.data);
    bindViewListeners(map);

    //load saved data
    loadMarkers(map);
    loadView(map);

}
},{}]},{},[1]);
