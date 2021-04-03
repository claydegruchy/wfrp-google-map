var params = Object.fromEntries(
  new URLSearchParams(window.location.search)
);


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
params

// add the google key
document.customCreateElement('script', {
  src: `https://maps.googleapis.com/maps/api/js?key=${params.key}&callback=initMap&libraries=visualization&v=weekly`,
  defer: true
}, document.querySelector('head'))





async function initMap() {
  const map = new google.maps.Map(document.getElementById("map"), {
    center: {
      lat: 0,
      lng: 0
    },
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
      // console.log(`http://www.gitzmansgallery.com/tiles/${zoom}_${normalizedCoord.x}_${(normalizedCoord.y-1)}.jpg`);
      return (
        `http://www.gitzmansgallery.com/tiles/${zoom}_${normalizedCoord.x}_${(normalizedCoord.y)}.jpg`

        // `/images/wfrp/${zoom}/tile_${normalizedCoord.x}_${(normalizedCoord.y-1)}.jpg`

      );
    },
    tileSize: new google.maps.Size(256, 256),
    maxZoom: 7,
    minZoom: 3,
    radius: 100,
    name: "WFRP",
  });
  map.mapTypes.set("WFRP", wfrpMapType);
  map.setMapTypeId("WFRP");






  function name() {
    return arguments.callee.caller.name
  }

  //view

  var mapFunctions = {
    view: {
      saveView: function() {
        // console.log(name())
        localStorage.setItem('center', JSON.stringify(map.getCenter().toJSON()))
        // console.log(JSON.stringify(map.getCenter().toJSON()))
        localStorage.setItem('zoom', map.getZoom())
        // console.log(map.getZoom())
      },
      loadView: function(map) {
        // console.log(name())
        var center = localStorage.getItem('center');
        var zoom = localStorage.getItem('zoom');
        map.setCenter(JSON.parse(center));
        map.setZoom(Number(zoom));
      },
    },


    markers: {
      markers: [],
      deselectAll: function() {
        console.log(name());
        return this.markers
          .map(m => m.deselect())
      },
      clearMarkers: function() {
        console.log(name(), map.length)
        this.markers.map(r => r.setMap(null))
        this.markers = []
        this.saveMarkersToMemory()
      },

      loadMarkers: function() {
        console.log(name());

        if (false) {
          var data = JSON.parse(fileString);
        } else {
          var data = JSON.parse(localStorage.getItem('geoData'));

        }
        console.log(data, JSON.parse(localStorage.getItem('geoData')));
        // map.data.addGeoJson(data);
        if (data) data.map(marker => this.placeMarker({
          ...marker,
          imported: true
        }))
      },

      saveMarkersToMemory: function() {
        console.log(name());
        localStorage.setItem('geoData', JSON.stringify(this.markers.map(m => m.export())))
      },

      placeMarker: function(info) {
        console.log(name());
        //if no position, fuck it
        if (!info.position) return

        // make marker
        var marker = new google.maps.Marker({
          position: info.position,
          map: map,
          data: info.data || {},
          save: () => this.saveMarkersToMemory(),
          export: function() {
            return {
              position: this.position,
              data: this.data,
            }
          },
        });



        //#########  make the inside fo the popup box
        var inputContainer = document.customCreateElement('form', {})
        var textField = document.customCreateElement('input', {
          type: "text",
          size: "31",
          maxlength: "31",
          tabindex: "-1",
          value: marker.data.inputContent || ""

        }, inputContainer)
        var saveButton = document.customCreateElement('button', {
          innerText: "Submit",
          onclick: (e) => {
            console.log("Saved marker", marker);
            marker.data.inputContent = textField.value
            marker.save()
            e.preventDefault()
          }
        }, inputContainer)

        // #########
        marker.infowindow = new google.maps.InfoWindow({
          content: inputContainer
        });

        marker.deselect = () => {
          marker.infowindow.close(map, marker)
        }
        marker.select = () => {
          this.deselectAll()
          marker.infowindow.open(map, marker)
        }


        if (!info.imported) marker.select()
        // if (!info.imported) marker.infowindow.open(map, marker)

        google.maps.event.addListener(marker, 'click', function() {
          marker.select()
        });



        this.markers.push(marker)
        marker.save()
      }

    }
  }


  document.onkeydown = function(evt) {
    if (evt.key === "Escape" || evt.key === "Esc") mapFunctions.markers.deselectAll()
  };



  google.maps.event.addListener(map, 'click', function(event) {
    mapFunctions.markers.placeMarker({
      position: event.latLng
    });
  });




  // Normalizes the coords that tiles repeat across the x axis (horizontally)
  // like the standard Google map tiles.
  function getNormalizedCoord(coord, zoom) {
    const y = coord.y;
    let x = coord.x;
    // tile range in one direction range is dependent on zoom level
    // 0 = 1 tile, 1 = 2 tiles, 2 = 4 tiles, 3 = 8 tiles, etc
    const tileRange = 1 << zoom;
    console.log(tileRange, zoom);

    // don't repeat across y-axis (vertically)
    if (y < 0 || y >= tileRange) {
      return null;
    }

    // repeat across x-axis
    if (x < 0 || x >= tileRange) {
      x = ((x % tileRange) + tileRange) % tileRange;
    }
    return {
      x: x,
      y: y
    };
  }






  function bindViewListeners(mapLayer) {
    mapLayer.addListener('zoom_changed', mapFunctions.view.saveView);
    mapLayer.addListener('center_changed', mapFunctions.view.saveView);
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
  makeControl("Clear markers", () => mapFunctions.markers.clearMarkers(), centerControlDiv, map);

  map.controls[google.maps.ControlPosition.LEFT].push(centerControlDiv);
  console.log("ControlPosition", google.maps.ControlPosition)


  //map.data.setControls(['Point']);


  bindViewListeners(map);

  //load saved data
  mapFunctions.markers.loadMarkers(map);
  mapFunctions.view.loadView(map);



  console.log("loading heatmap");
  var heatmapData = [{
      "lat": 27.694654507853507,
      "lng": 19.803145114872276,
      weight:10
    },
    {
      "lat": 27.55838182658418,
      "lng": 18.682539646122276,
      weight:10
    },
    {
      "lat": 25.434779443123798,
      "lng": 18.484785739872276,
      weight:10
    },
    {
      "lat": 26.756830886346698,
      "lng": 14.441816989872276,
      weight:10
    },
    {
      "lat": 25.77163585252392,
      "lng": 13.914473239872276,
      weight:10
    },
    {
      "lat": 24.25842095327564,
      "lng": 15.496504489872276,
      weight:10
    },
    {
      "lat": 24.758242234527263,
      "lng": 18.287031833622276
    },
    {
      "lat": 30.364758698886515,
      "lng": 14.529707614872276
    },
    {
      "lat": 28.79793001696144,
      "lng": 10.706465427372276
    },
    {
      "lat": 28.41211726304387,
      "lng": 10.640547458622276
    },
    {
      "lat": 27.38292532851722,
      "lng": 19.100020114872276
    },
    {
      "lat": 26.894087377867795,
      "lng": 18.155195896122276
    },
    {
      "lat": 25.15665868531593,
      "lng": 11.827070896122276
    },
    {
      "lat": 24.478587145032265,
      "lng": 10.552656833622276
    },
    {
      "lat": 32.2791795482641,
      "lng": -16.144120510127724
    },
    {
      "lat": 36.27212327929268,
      "lng": -0.6314251976277241
    },
    {
      "lat": 39.03139120015154,
      "lng": -29.387813504477215
    },
    {
      "lat": 43.77450743413511,
      "lng": -10.095821316977215
    },
    {
      "lat": 22.28148396837893,
      "lng": 11.17707282157669
    },
    {
      "lat": 16.50194491022607,
      "lng": 13.46222907157669
    },
    {
      "lat": 16.56513738519289,
      "lng": 10.34211188407669
    },
    {
      "lat": 21.506752783098822,
      "lng": 5.81574469657669,
    },

  ];

  var heatmap = new google.maps.visualization.HeatmapLayer({
    data: heatmapData.map((l, i) =>
      ({
        location: new google.maps.LatLng({
          ...l,
        }),
        weight: l.weight || 1
      })


    ),
    radius: 35,
    // dissipating:false
  });
  heatmap.setMap(map);

  console.log("loading heatmap", "done");



  // class CoordMapType {
  //   constructor(tileSize) {
  //     this.tileSize = tileSize;
  //   }
  //   getTile(coord, zoom, ownerDocument) {
  //     const div = ownerDocument.createElement("div");
  //     div.innerHTML = String(coord);
  //     div.style.width = this.tileSize.width + "px";
  //     div.style.height = this.tileSize.height + "px";
  //     div.style.fontSize = "10";
  //     div.style.borderStyle = "solid";
  //     div.style.borderWidth = "1px";
  //     div.style.borderColor = "#FFFFFF";
  //     return div;
  //   }
  //   releaseTile(tile) {}
  // }
  //
  // map.overlayMapTypes.insertAt(
  //   0,
  //   new CoordMapType(new google.maps.Size(256, 256))
  // );

}
