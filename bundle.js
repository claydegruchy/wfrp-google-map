(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var params = Object.fromEntries(
  new URLSearchParams(window.location.search)
);

// var body = document.querySelector("body")
// console.log(body);
// body.setAttribute('filter', 'url(#blur-and-invert)')


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
// params









window.initMap = async function() {

  var allowEdits = false
  if (params.e == "drcjkhvltklkjlgcindtlluvnbjeurvg") {
    allowEdits = true
  }


  function drawCircle(point, radius, dir) {
    var d2r = Math.PI / 180; // degrees to radians
    var r2d = 180 / Math.PI; // radians to degrees
    var earthsradius = 3963; // 3963 is the radius of the earth in miles
    var points = 32;

    // find the raidus in lat/lon
    var rlat = (radius / earthsradius) * r2d;
    var rlng = rlat / Math.cos(point.lat() * d2r);

    var extp = new Array();
    if (dir == 1) {
      var start = 0;
      var end = points + 1
    } // one extra here makes sure we connect the
    else {
      var start = points + 1;
      var end = 0
    }
    for (var i = start;
      (dir == 1 ? i < end : i > end); i = i + dir) {
      var theta = Math.PI * (i / (points / 2));
      ey = point.lng() + (rlng * Math.cos(theta)); // center a + radius x * cos(theta)
      ex = point.lat() + (rlat * Math.sin(theta)); // center b + radius y * sin(theta)
      extp.push(new google.maps.LatLng(ex, ey));
    }
    return extp;
  }


  class DeleteMenu extends google.maps.OverlayView {
    constructor() {
      super();
      this.div_ = document.createElement("div");
      this.div_.className = "delete-menu";
      this.div_.innerHTML = "Delete";
      const menu = this;
      google.maps.event.addDomListener(this.div_, "click", () => {
        menu.removeVertex();
      });
    }
    onAdd() {
      const deleteMenu = this;
      const map = this.getMap();
      this.getPanes().floatPane.appendChild(this.div_);
      // mousedown anywhere on the map except on the menu div will close the
      // menu.
      this.divListener_ = google.maps.event.addDomListener(
        map.getDiv(),
        "mousedown",
        (e) => {
          if (e.target != deleteMenu.div_) {
            deleteMenu.close();
          }
        },
        true
      );
    }
    onRemove() {
      if (this.divListener_) {
        google.maps.event.removeListener(this.divListener_);
      }
      this.div_.parentNode.removeChild(this.div_);
      // clean up
      this.set("position", null);
      this.set("path", null);
      this.set("vertex", null);
    }
    close() {
      this.setMap(null);
    }
    draw() {
      const position = this.get("position");
      const projection = this.getProjection();

      if (!position || !projection) {
        return;
      }
      const point = projection.fromLatLngToDivPixel(position);
      this.div_.style.top = point.y + "px";
      this.div_.style.left = point.x + "px";
    }
    /**
     * Opens the menu at a vertex of a given path.
     */
    open(map, path, vertex) {
      this.set("position", path.getAt(vertex));
      this.set("path", path);
      this.set("vertex", vertex);
      this.setMap(map);
      this.removeVertex();
    }
    /**
     * Deletes the vertex from the path.
     */
    removeVertex() {
      const path = this.get("path");
      const vertex = this.get("vertex");

      if (!path || vertex == undefined) {
        this.close();
        return;
      }
      path.removeAt(vertex);
      this.close();
    }
  }

  class USGSOverlay extends google.maps.OverlayView {
    constructor(bounds, image) {
      super();
      // Initialize all properties.
      this.bounds_ = bounds;
      this.image_ = image;
      // Define a property to hold the image's div. We'll
      // actually create this div upon receipt of the onAdd()
      // method so we'll leave it null for now.
      this.div_ = null;
    }
    updateBounds(bounds) {
      this.bounds_ = bounds
      this.draw()
    }
    /**
     * onAdd is called when the map's panes are ready and the overlay has been
     * added to the map.
     */
    onAdd() {
      this.div_ = document.createElement("div");
      this.div_.style.borderStyle = "none";
      this.div_.style.borderWidth = "0px";
      this.div_.style.position = "absolute";
      // Create the img element and attach it to the div.
      const img = document.createElement("img");
      img.src = this.image_;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.position = "absolute";
      img.style.opacity = 0.5;


      this.div_.appendChild(img);
      // Add the element to the "overlayLayer" pane.
      const panes = this.getPanes();
      panes.overlayLayer.appendChild(this.div_);
    }
    draw() {
      // We use the south-west and north-east
      // coordinates of the overlay to peg it to the correct position and size.
      // To do this, we need to retrieve the projection from the overlay.
      const overlayProjection = this.getProjection();
      // Retrieve the south-west and north-east coordinates of this overlay
      // in LatLngs and convert them to pixel coordinates.
      // We'll use these coordinates to resize the div.
      const sw = overlayProjection.fromLatLngToDivPixel(
        this.bounds_.getSouthWest()
      );
      const ne = overlayProjection.fromLatLngToDivPixel(
        this.bounds_.getNorthEast()
      );

      // Resize the image's div to fit the indicated dimensions.
      if (this.div_) {
        this.div_.style.left = sw.x + "px";
        this.div_.style.top = ne.y + "px";
        this.div_.style.width = ne.x - sw.x + "px";
        this.div_.style.height = sw.y - ne.y + "px";
      }
    }
    /**
     * The onRemove() method will be called automatically from the API if
     * we ever set the overlay's map property to 'null'.
     */
    onRemove() {
      if (this.div_) {
        this.div_.parentNode.removeChild(this.div_);
        this.div_ = null;
      }
    }
  }

  var states = await fetch("./data/states.json")
    .then(r => r.json())

  var heatmaps = await fetch("./data/heatmaps.json")
    .then(r => r.json())


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
        // `${params.tileURL}/tiles/${zoom}_${normalizedCoord.x}_${(normalizedCoord.y)}.jpg`
        // `http://${params.tileURL}/tiles/${zoom}_${normalizedCoord.x}_${(normalizedCoord.y)}.jpg`

        `./map/${zoom}/${zoom}_${normalizedCoord.x}_${(normalizedCoord.y)}.jpg`

      );
    },
    tileSize: new google.maps.Size(256, 256),
    maxZoom: 7,
    minZoom: 3,
    radius: 10000,
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
        localStorage.setItem('zoom', map.getZoom())
        // console.log(name(), map.getZoom(), JSON.stringify(map.getCenter().toJSON()))
        // console.log(name(),)

      },
      loadView: function(map) {
        // console.log(name())
        var center = localStorage.getItem('center');
        var zoom = localStorage.getItem('zoom');
        // console.log(center, zoom);
        // map.setCenter(JSON.parse(center));
        // map.setZoom(Number(zoom));
      },
    },


    markers: {
      markers: [],
      deselectAll: function() {
        console.log(name());
        return this.markers
          .filter(m => m.deselect)
          .map(m => m.deselect())
      },
      clearMarkers: function() {
        console.log(name(), map.length)
        this.markers.map(r => r.setMap(null))
        this.markers = []
        this.saveMarkersToMemory()
      },
      deleteMarker: function(marker) {
        this.markers = this.markers.filter(m => m != marker)
        marker.setMap(null)
        this.saveMarkersToMemory()
      },
      loadMarkers: function() {
        console.log(name());
        var data = JSON.parse(localStorage.getItem('geoPoints') || []);
        // map.data.addGeoJson(data);
        if (data) data.map(marker => this.placeMarker({
          ...marker,
          imported: true
        }))
      },

      saveMarkersToMemory: function() {
        console.log(name());
        localStorage.setItem('geoPoints', JSON.stringify(this.markers
          // .filter(m => m.setEditable)
          .map(m => m.export())))
      },

      placeMarker: function(info) {
        //
        console.log(name());
        //if no position, fuck it
        if (!info.position) return

        // make marker
        var marker = new google.maps.Marker({
          ...info,
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

        console.log("placing marker at ", info.position.toString());


        if (!marker.data.noInput) {

          //#########  make the inside fo the popup box
          var inputContainer = document.customCreateElement('form', {})
          inputContainer.onsubmit = (e) => {
            !allowEdits && e.preventDefault()
          }
          var textField = document.customCreateElement('input', {
            type: "text",
            size: "31",
            maxlength: "31",
            tabindex: "-1",
            value: marker.data.inputContent || ""

          }, inputContainer)
          if (allowEdits) {
            var saveButton = document.customCreateElement('button', {
              innerText: "Submit",
              onclick: (e) => {
                console.log("Saved marker", marker);
                marker.data.inputContent = textField.value
                marker.save()
                e.preventDefault()
              }
            }, inputContainer)

            var deleteButton = document.customCreateElement('button', {
              innerText: "Delete",
              onclick: (e) => {
                console.log("Delete marker", marker);
                this.deleteMarker(marker)
                e.preventDefault()
              }
            }, inputContainer)
          }

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

          if (allowEdits) {
            google.maps.event.addListener(marker, 'click', function() {
              marker.select()
            });
          } else {
            google.maps.event.addListener(marker, 'mouseover', function() {
              marker.select()
            });
          }


        }


        this.markers.push(marker)

        marker.save()
      }

    }
  }


  document.onkeydown = function(evt) {
    if (evt.key === "Escape" || evt.key === "Esc") mapFunctions.markers.deselectAll()
  };







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


  mapFunctions.markers.loadMarkers(map);
  mapFunctions.view.loadView(map);






  function exportData(data, name = 'data') {


    function downloadObjectAsJson(exportObj, exportName) {
      var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
      var downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", exportName + ".json");
      document.body.appendChild(downloadAnchorNode); // required for firefox
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }

    downloadObjectAsJson(data, "WFRP-map-" + name)
  }


  function importData(data) {
    for (var [key, value] of Object.entries(data)) {
      console.log("imported", key);
      localStorage.setItem(key, JSON.stringify(value))
    }
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

  map.controls[google.maps.ControlPosition.LEFT].push(centerControlDiv);
  console.log("ControlPosition", google.maps.ControlPosition)


  //map.data.setControls(['Point']);


  bindViewListeners(map);






  console.log("loading heatmap");
  var heatmaps = {
    heatmaps: heatmaps,
    activeMaps: [],
    activate: function() {
      Object.keys(this.heatmaps).map(heatmapName => {
        console.log("making heatmap for", heatmapName);
        var heatmap = new google.maps.visualization.HeatmapLayer({
          data: this.heatmaps[heatmapName].data.map((l, i) =>
            ({
              location: new google.maps.LatLng({
                ...l,
              }),
              weight: l.weight || 1
            })


          ),
          radius: 35,
          // dissipating:false
          gradient: this.heatmaps[heatmapName].gradient
        });
        // if (heatmaps[heatmapName].gradient.length>1) heatmap.set("gradient", heatmaps[heatmapName].gradient);
        // heatmap.set("gradient", heatmaps[heatmapName].gradient);

        heatmap.setMap(map);
        this.activeMaps.push(heatmap)
      })
    }

  }
  console.log("loading heatmap", "done");






  console.log("loading states");

  var states = {
    states: states,
    active: [],
    activate: function(specificState) {
      console.log("acctivating states", this.states);
      Object.entries(this.states).map(stateItem => {
        console.log("making state for", stateItem[0]);
        const state = new google.maps.Polygon({
          paths: stateItem[1].coords,
          strokeColor: stateItem[1].colour,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: stateItem[1].colour,
          fillOpacity: 0.35,
        });

        state.setMap(map);
        this.active.push(state)
      })
    },

  }


  console.log("loading states", "done");




  var generaticTools = {
    config: {
      setDraggable: false,
      setEditable: false,
    },
    items: [],
    memory: {
      save: function(data) {
        return localStorage.setItem('geoLines', JSON.stringify(data))
      },
      load: function() {
        var l
        try {
          l = JSON.parse(localStorage.getItem('geoLines'));
        } catch (e) {
          l = []
        }
        return l
      }
    },

    saveItems: function() {
      console.log("saving lines");
      if (!allowEdits) return
      var tt = this.items.map(l => l.getPath()
        .getArray()
        // .map(p => )
      )
      // console.log(JSON.stringify(tt));
      this.memory.save(tt)
    },
    loadItems: function() {
      var mem = this.memory.load()
      console.log("loading lines", mem);
      mem.map(linePath => {
        const line = new google.maps.Polyline({
          path: linePath,
        });
        line.setMap(map)
        this.updateLine(line)

        // line .dispatchEvent(e);

      })
    },
    clearItems: function() {
      this.memory.save([])
      this.items.map(l => l.setMap(null))
      this.items = []
    },
    updateLine: function(line) {

      line.setDraggable(this.config.setDraggable)
      line.setEditable(this.config.setEditable)
      line.setOptions({
        strokeColor: 'red',
        strokeOpacity: 0,

        icons: [{
          icon: {
            path: "M 0,-1 0,1",
            strokeOpacity: 1,
            scale: 4,
          },
          offset: "0",
          repeat: "20px",
        }, ]
      });
      this.addDeleteContext(line)
      this.items.push(line)
      this.saveItems()

      var updateEventAction = () => {
        console.log('Bounds changed.');
        this.saveItems()
      }


      line.addListener('dragend', updateEventAction)
      line.addListener('dragstart', updateEventAction)
      line.addListener('mouseout', updateEventAction)
      line.addListener('mouseup', updateEventAction)




    },

    addDeleteContext: function(ob) {
      google.maps.event.addListener(ob, "contextmenu", (e) => {
        const deleteMenu = new DeleteMenu();

        // Check if click was on a vertex control point
        if (e.vertex == undefined) {
          return;
        }
        deleteMenu.open(map, ob.getPath(), e.vertex);
        this.saveItems()
      })
    },

    draw: function() {

      const drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: true,
        drawingControlOptions: {
          position: google.maps.ControlPosition.TOP_CENTER,
          drawingModes: [
            google.maps.drawing.OverlayType.MARKER,
            // google.maps.drawing.OverlayType.CIRCLE,
            google.maps.drawing.OverlayType.POLYGON,
            google.maps.drawing.OverlayType.POLYLINE,
            google.maps.drawing.OverlayType.RECTANGLE,
          ],
        },
        markerOptions: {
          icon: "https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png",
        },
        circleOptions: {
          fillColor: "#ffff00",
          fillOpacity: 1,
          strokeWeight: 5,
          clickable: false,
          editable: true,
          zIndex: 1,
        },
      });


      drawingManager.setMap(map);



      google.maps.event.addListener(drawingManager, 'markercomplete', (marker) => {
        console.log(marker);
        mapFunctions.markers.placeMarker({
          position: marker.position,
        });
        marker.setMap(null)
      });


      google.maps.event.addListener(drawingManager, 'polylinecomplete', (line) => {
        console.log("line compelte", line);
        this.updateLine(line)
        const coords = line.getPath().getArray().map(coord => {
          return {
            lat: coord.lat(),
            lng: coord.lng()
          }
        });
      });

      google.maps.event.addListener(drawingManager, 'polygoncomplete', (polygon) => {
        const coords = polygon.getPath().getArray().map(coord => {
          return {
            lat: coord.lat(),
            lng: coord.lng()
          }
        });
        this.addDeleteContext(polygon)
        exportData(coords, 'stateShape')
      });

      google.maps.event.addListener(drawingManager, 'rectanglecomplete', (rectangle) => {
        // rectangle.draggable
        // editable: true
        rectangle.setDraggable(this.config.setDraggable)
        rectangle.setEditable(this.config.setEditable)
        console.log(rectangle.getBounds());
        overlay = new USGSOverlay(rectangle.getBounds(), "/data/statemap.jpg", map);
        overlay.setMap(map);


        google.maps.event.addListener(rectangle, 'bounds_changed', () => {
          console.log('Bounds changed.');
          overlay.updateBounds(rectangle.getBounds(rectangle))
        });


      });

    }
  }




  console.log("loading overlay");
  var overlay = {
    items: {},
    active: [],
    activate: async function() {
      console.log("acctivating", this.items);




      const imageBounds = {
        north: 6.35895743768598,
        south: -6.05198343189395,
        east: -2.5711641173381707,
        west: 6.35895743768598,
      };
      historicalOverlay = new google.maps.GroundOverlay(
        "/statemap.jpg",
        imageBounds
      );
      historicalOverlay.setMap(map);
      // Object.entries(this.items).map(item => {

      // })
    }
  }
  console.log("loading overlay", "done");



  async function runImport() {
    const {
      value: file
    } = await Swal.fire({
      title: 'Select image',
      input: 'file',
      inputAttributes: {
        'accept': 'application/json',
        'aria-label': 'Upload your profile picture'
      }
    })

    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        importData(JSON.parse(e.target.result))
        Swal.fire({
            title: 'Data imported!',
            text: 'The page will now reload to import data'
          })
          .then(() => window.location.reload(false))
      }
      reader.readAsText(file)
      //

    }
  }

  // overlay.activate()


  // TEMPLATE
  console.log("loading fogOfWar");
  var fogOfWar = {
    active: true,
    toggle: () => {},
    activate: function() {
      console.log(name());
      console.log(mapFunctions.markers.markers, generaticTools.items)


      const Flatten = require('@flatten-js/core');





      // console.log(name(), map.getBounds(),);
      const {
        polygon
      } = Flatten;
      const {
        unify
      } = Flatten.BooleanOperations;



      var outerbounds = [ // covers the (mercator projection) world
        new google.maps.LatLng(85, 180),
        new google.maps.LatLng(85, 90),
        new google.maps.LatLng(85, 0),
        new google.maps.LatLng(85, -90),
        new google.maps.LatLng(85, -180),
        new google.maps.LatLng(0, -180),
        new google.maps.LatLng(-85, -180),
        new google.maps.LatLng(-85, -90),
        new google.maps.LatLng(-85, 0),
        new google.maps.LatLng(-85, 90),
        new google.maps.LatLng(-85, 180),
        new google.maps.LatLng(0, 180),
        new google.maps.LatLng(85, 180)
      ];

      var allPoints = [
        ...mapFunctions.markers.markers.map(m => m.position),
        ...generaticTools.items.map(l => l.getPath().getArray()).flat()
      ]
      // .reverse()
      // .slice(14, 16)

      var revealRange = 100

      if (allPoints.length < 1) {
        return
      }

      var jsts = require('jsts')

      var googleMaps2JSTS = function(boundaries) {
        var coordinates = [];
        for (var i = 0; i < boundaries.getLength(); i++) {
          coordinates.push(new jsts.geom.Coordinate(
            boundaries.getAt(i).lat(), boundaries.getAt(i).lng()));
        }
        return coordinates;
      };

      var jsts2googleMaps = function(geometry) {
        var coordArray = geometry.getCoordinates();
        GMcoords = [];
        for (var i = 0; i < coordArray.length; i++) {
          GMcoords.push(new google.maps.LatLng(coordArray[i].x, coordArray[i].y));
        }
        return GMcoords;
      }


      var geometryFactory = new jsts.geom.GeometryFactory();
      // var JSTSpoly1 = ;
      // JSTSpoly1.normalize();
      // var JSTSpoly2 = geometryFactory.createPolygon(geometryFactory.createLinearRing(googleMaps2JSTS(poly2.getPath())));
      // JSTSpoly2.normalize();


      // var JSTSpolyUnion = JSTSpoly1.union(JSTSpoly2);
      // var outputPath = jsts2googleMaps(JSTSpolyUnion);


      // var circles =
      var polyCircles = allPoints.map(pos => drawCircle(pos, revealRange, -1))
        .map(circle => new google.maps.Polygon({
          paths: circle
        }))
        .map(circle => {
          var c = geometryFactory.createPolygon(geometryFactory.createLinearRing(googleMaps2JSTS(circle.getPath())))
          c.normalize()
          return c
        })

      // .forEach(c=>c.setMap(map))

      var unifiedShape = [...polyCircles]
      console.log("polyCircles", polyCircles);
      var unifiedShape = polyCircles
      .reduce((accumulator, currentValue) => currentValue.union(accumulator))
      //   .vertices.map(p => new google.maps.LatLng(p.x, p.y), )
      // console.log(unifiedShape);
      unifiedShape = jsts2googleMaps(unifiedShape)

      // [p.toJSON().lat(), p.toJSON().lng()]
      // console.log("circles", circles.map(circle => circle.map(p => console.log(p.lat()))))
      // console.log("circles",circles.map(circle=>circle.map(p=>[p.toJSON().lat(),p.toJSON().lng()])));

      // var simplePoints = allPoints




      // var circles = allPoints.map(pos => drawCircle(pos, revealRange, -1))
      // Construct the polygon, including both paths.
      const bermudaTriangle = new google.maps.Polygon({
        // paths: [outerCoords, innerCoords],
        paths: [outerbounds, unifiedShape],
        strokeColor: "gray",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "black",
        fillOpacity: 0.80,
      });
      bermudaTriangle.setMap(map);

      console.log("bermudaTriangle.getPath() ", bermudaTriangle.getPath());





      // console.log(temp);





      // console.log(allPoints);
      //make a curcle around each
      //cut those curcles out of the overlay shape


      // Object.entries(this.items).map(item => {
      //
      // })
    }
  }
  console.log("loading fogOfWar", "done");

  /*
  // TEMPLATE
    console.log("loading template");
    var template = {
      items: {},
      active: [],
      activate: function() {
        console.log("acctivating", this.items);

        Object.entries(this.items).map(item => {

        })
      }
    }
    console.log("loading template", "done");

  */


  var setDefaults = async () => {
    console.log("logging defaultl story ");
    var story = await fetch("./story.json")
      .then(r => r.json())

    return await importData(story)
  }



  makeControl("Export memory", () => {
    var x = {};
    [
      "center",
      "zoom",
      "geoPoints",
      "geoLines",
    ].forEach(v => x[v] = JSON.parse(localStorage.getItem(v)));
    exportData(x);
  }, centerControlDiv, map);

  makeControl("Import memory", async () => runImport(), centerControlDiv, map);

  if (allowEdits) {
    makeControl("Clear markers", () => mapFunctions.markers.clearMarkers(), centerControlDiv, map);
    makeControl("Clear lines", () => generaticTools.clearItems(), centerControlDiv, map);
    heatmaps.activate()
    states.activate()

  }


  var tools = generaticTools
  tools.config = {
    setDraggable: allowEdits,
    setEditable: allowEdits,
    // show
  }
  allowEdits && tools.draw();

  if (params.story == "true") {
    await setDefaults()
  }

  // setDefaults



  tools.loadItems()
  //load saved data

  fogOfWar.activate()


  var overlay = document.querySelector('#overlay')
  console.log(overlay);
  // overlay.style.webkitFilter = `sepia(50%) `

}


// add the google key
document.customCreateElement('script', {
  src: `https://maps.googleapis.com/maps/api/js?key=${params.key}&callback=initMap&libraries=visualization,drawing&v=weekly`,
  defer: true,
  async: true,
}, document.querySelector('head'))

},{"@flatten-js/core":2,"jsts":3}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * Global constant CCW defines counter clockwise direction of arc
 * @type {boolean}
 */
const CCW = true;

/**
 * Global constant CW defines clockwise direction of arc
 * @type {boolean}
 */
const CW = false;

/**
 * Defines orientation for face of the polygon: clockwise, counter clockwise
 * or not orientable in the case of self-intersection
 * @type {{CW: number, CCW: number, NOT_ORIENTABLE: number}}
 */
const ORIENTATION = {CCW:-1, CW:1, NOT_ORIENTABLE: 0};

const PIx2 = 2 * Math.PI;

const INSIDE = 1;
const OUTSIDE = 0;
const BOUNDARY = 2;
const CONTAINS = 3;
const INTERLACE = 4;

const OVERLAP_SAME = 1;
const OVERLAP_OPPOSITE = 2;

var Constants = /*#__PURE__*/Object.freeze({
    CCW: CCW,
    CW: CW,
    ORIENTATION: ORIENTATION,
    PIx2: PIx2,
    INSIDE: INSIDE,
    OUTSIDE: OUTSIDE,
    BOUNDARY: BOUNDARY,
    CONTAINS: CONTAINS,
    INTERLACE: INTERLACE,
    OVERLAP_SAME: OVERLAP_SAME,
    OVERLAP_OPPOSITE: OVERLAP_OPPOSITE
});

/**
 * Created by Alex Bol on 2/18/2017.
 */

/**
 * Floating point comparison tolerance.
 * Default value is 0.000001 (10e-6)
 * @type {number}
 */
let DP_TOL = 0.000001;

/**
 * Set new floating point comparison tolerance
 * @param {number} tolerance
 */
function setTolerance(tolerance) {DP_TOL = tolerance;}

/**
 * Get floating point comparison tolerance
 * @returns {number}
 */
function getTolerance() {return DP_TOL;}

const DECIMALS = 3;

/**
 * Returns *true* if value comparable to zero
 * @param {number} x
 * @param {number} y
 * @return {boolean}
 */
function EQ_0(x) {
    return (x < DP_TOL && x > -DP_TOL);
}

/**
 * Returns *true* if two values are equal up to DP_TOL
 * @param {number} x
 * @param {number} y
 * @return {boolean}
 */
function EQ(x, y) {
    return (x - y < DP_TOL && x - y > -DP_TOL);
}

/**
 * Returns *true* if first argument greater than second argument up to DP_TOL
 * @param {number} x
 * @param {number} y
 * @return {boolean}
 */
function GT(x, y) {
    return (x - y > DP_TOL);
}

/**
 * Returns *true* if first argument greater than or equal to second argument up to DP_TOL
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
function GE(x, y) {
    return (x - y > -DP_TOL);
}

/**
 * Returns *true* if first argument less than second argument up to DP_TOL
 * @param {number} x
 * @param {number} y
 * @return {boolean}
 */
function LT(x, y) {
    return (x - y < -DP_TOL)
}

/**
 * Returns *true* if first argument less than or equal to second argument up to DP_TOL
 * @param {number} x
 * @param {number} y
 * @return {boolean}
 */
function LE(x, y) {
    return (x - y < DP_TOL);
}

var Utils = /*#__PURE__*/Object.freeze({
    setTolerance: setTolerance,
    getTolerance: getTolerance,
    DECIMALS: DECIMALS,
    EQ_0: EQ_0,
    EQ: EQ,
    GT: GT,
    GE: GE,
    LT: LT,
    LE: LE
});

/**
 * Created by Alex Bol on 2/19/2017.
 */

/**
 * Class of system errors
 */
class Errors {
    /**
     * Throw error ILLEGAL_PARAMETERS when cannot instantiate from given parameter
     * @returns {ReferenceError}
     */
    static get ILLEGAL_PARAMETERS() {
        return new ReferenceError('Illegal Parameters');
    }

    /**
     * Throw error ZERO_DIVISION to catch situation of zero division
     * @returns {Error}
     */
    static get ZERO_DIVISION() {
        return new Error('Zero division');
    }

    /**
     * Error to throw from BooleanOperations module in case when fixBoundaryConflicts not capable to fix it
     * @returns {Error}
     */
    static get UNRESOLVED_BOUNDARY_CONFLICT() {
        return new Error('Unresolved boundary conflict in boolean operation');
    }

    /**
     * Error to throw from LinkedList:testInfiniteLoop static method
     * in case when circular loop detected in linked list
     * @returns {Error}
     */
    static get INFINITE_LOOP() {
        return new Error('Infinite loop');
    }
}

var errors = /*#__PURE__*/Object.freeze({
    default: Errors
});

let Flatten = {
    Utils: Utils,
    Errors: Errors,
    Matrix: undefined,
    Planar_set: undefined,
    Point: undefined,
    Vector: undefined,
    Line: undefined,
    Circle: undefined,
    Segment: undefined,
    Arc: undefined,
    Box: undefined,
    Edge: undefined,
    Face: undefined,
    Ray: undefined,
    Ray_shooting: undefined,
    Multiline: undefined,
    Polygon: undefined,
    Distance: undefined,
};

for (let c in Constants) {Flatten[c] = Constants[c];}

Object.defineProperty(Flatten, 'DP_TOL', {
    get:function(){return getTolerance()}, 
    set:function(value){setTolerance(value);}
});

/**
 * Class implements bidirectional non-circular linked list. <br/>
 * LinkedListElement - object of any type that has properties next and prev.
 */
class LinkedList {
    constructor(first, last) {
        this.first = first;
        this.last = last || this.first;
    }

    /**
     * Throw an error if circular loop detected in the linked list
     * @param {LinkedListElement} first element to start iteration
     * @throws {Flatten.Errors.INFINITE_LOOP}
     */
    static testInfiniteLoop(first) {
        let edge = first;
        let controlEdge = first;
        do {
            if (edge != first && edge === controlEdge) {
                throw Flatten.Errors.INFINITE_LOOP;  // new Error("Infinite loop")
            }
            edge = edge.next;
            controlEdge = controlEdge.next.next;
        } while (edge != first)
    }

    /**
     * Return number of elements in the list
     * @returns {number}
     */
    get size() {
        let counter = 0;
        for (let edge of this) {
            counter++;
        }
        return counter;
    }

    /**
     * Return array of elements from start to end,
     * If start or end not defined, take first as start, last as end
     * @returns {Array}
     */
    toArray(start=undefined, end=undefined) {
        let elements = [];
        let from = start || this.first;
        let to = end || this.last;
        let element = from;
        if (element === undefined) return elements;
        do {
            elements.push(element);
            element = element.next;
        } while (element !== to.next);
        return elements;
    }


    /**
     * Append new element to the end of the list
     * @param {LinkedListElement} element
     * @returns {LinkedList}
     */
    append(element) {
        if (this.isEmpty()) {
            this.first = element;
        } else {
            element.prev = this.last;
            this.last.next = element;
        }

        // update edge to be last
        this.last = element;

        // nullify non-circular links
        this.last.next = undefined;
        this.first.prev = undefined;
        return this;
    }

    /**
     * Insert new element to the list after elementBefore
     * @param {LinkedListElement} newElement
     * @param {LinkedListElement} elementBefore
     * @returns {LinkedList}
     */
    insert(newElement, elementBefore) {
        if (this.isEmpty()) {
            this.first = newElement;
            this.last = newElement;
        }
        else if (elementBefore === null || elementBefore === undefined) {
            newElement.next = this.first;
            this.first.prev = newElement;
            this.first = newElement;
        }
        else {
            /* set links to new element */
            let elementAfter = elementBefore.next;
            elementBefore.next = newElement;
            if (elementAfter) elementAfter.prev = newElement;

            /* set links from new element */
            newElement.prev = elementBefore;
            newElement.next = elementAfter;

            /* extend list if new element added after the last element */
            if (this.last === elementBefore)
                this.last = newElement;
        }
        // nullify non-circular links
        this.last.next = undefined;
        this.first.prev = undefined;
        return this;
    }

    /**
     * Remove element from the list
     * @param {LinkedListElement} element
     * @returns {LinkedList}
     */
    remove(element) {
        // special case if last edge removed
        if (element === this.first && element === this.last) {
            this.first = undefined;
            this.last = undefined;
        } else {
            // update linked list
            if (element.prev) element.prev.next = element.next;
            if (element.next) element.next.prev = element.prev;
            // update first if need
            if (element === this.first) {
                this.first = element.next;
            }
            // update last if need
            if (element === this.last) {
                this.last = element.prev;
            }
        }
        return this;
    }

    /**
     * Return true if list is empty
     * @returns {boolean}
     */
    isEmpty() {
        return this.first === undefined;
    }

    [Symbol.iterator]() {
        let value = undefined;
        return {
            next: () => {
                value = value ? value.next : this.first;
                return {value: value, done: value === undefined};
            }
        };
    };
}

/**
 * Created by Alex Bol on 12/02/2018.
 */

let {INSIDE: INSIDE$1, OUTSIDE: OUTSIDE$1, BOUNDARY: BOUNDARY$1, OVERLAP_SAME: OVERLAP_SAME$1, OVERLAP_OPPOSITE: OVERLAP_OPPOSITE$1} = Flatten;

const NOT_VERTEX = 0;
const START_VERTEX = 1;
const END_VERTEX = 2;

const BOOLEAN_UNION = 1;
const BOOLEAN_INTERSECT = 2;
const BOOLEAN_SUBTRACT = 3;


/**
 * Unify two polygons polygons and returns new polygon. <br/>
 * Point belongs to the resulted polygon if it belongs to the first OR to the second polygon
 * @param {Polygon} polygon1 - first operand
 * @param {Polygon} polygon2 - second operand
 * @returns {Polygon}
 */
function unify(polygon1, polygon2) {
    let [res_poly, wrk_poly] = booleanOpBinary(polygon1, polygon2, BOOLEAN_UNION, true);
    return res_poly;
}

/**
 * Subtract second polygon from the first and returns new polygon
 * Point belongs to the resulted polygon if it belongs to the first polygon AND NOT to the second polygon
 * @param {Polygon} polygon1 - first operand
 * @param {Polygon} polygon2 - second operand
 * @returns {Polygon}
 */
function subtract(polygon1, polygon2) {
    let polygon2_tmp = polygon2.clone();
    let polygon2_reversed = polygon2_tmp.reverse();
    let [res_poly, wrk_poly] = booleanOpBinary(polygon1, polygon2_reversed, BOOLEAN_SUBTRACT, true);
    return res_poly;
}

/**
 * Intersect two polygons and returns new polygon
 * Point belongs to the resultes polygon is it belongs to the first AND to the second polygon
 * @param {Polygon} polygon1 - first operand
 * @param {Polygon} polygon2 - second operand
 * @returns {Polygon}
 */
function intersect(polygon1, polygon2) {
    let [res_poly, wrk_poly] = booleanOpBinary(polygon1, polygon2, BOOLEAN_INTERSECT, true);
    return res_poly;
}

/**
 * Returns boundary of intersection between two polygons as two arrays of shapes (Segments/Arcs) <br/>
 * The first array are shapes from the first polygon, the second array are shapes from the second
 * @param {Polygon} polygon1 - first operand
 * @param {Polygon} polygon2 - second operand
 * @returns {Shape[][]}
 */
function innerClip(polygon1, polygon2) {
    let [res_poly, wrk_poly] = booleanOpBinary(polygon1, polygon2, BOOLEAN_INTERSECT, false);

    let clip_shapes1 = [];
    for (let face of res_poly.faces) {
        clip_shapes1 = [...clip_shapes1, ...[...face.edges].map(edge => edge.shape)];
    }
    let clip_shapes2 = [];
    for (let face of wrk_poly.faces) {
        clip_shapes2 = [...clip_shapes2, ...[...face.edges].map(edge => edge.shape)];
    }
    return [clip_shapes1, clip_shapes2];
}

/**
 * Returns boundary of subtraction of the second polygon from first polygon as array of shapes
 * @param {Polygon} polygon1 - first operand
 * @param {Polygon} polygon2 - second operand
 * @returns {Shape[]}
 */
function outerClip(polygon1, polygon2) {
    let [res_poly, wrk_poly] = booleanOpBinary(polygon1, polygon2, BOOLEAN_SUBTRACT, false);

    let clip_shapes1 = [];
    for (let face of res_poly.faces) {
        clip_shapes1 = [...clip_shapes1, ...[...face.edges].map(edge => edge.shape)];
    }

    return clip_shapes1;
}

/**
 * Returns intersection points between boundaries of two polygons as two array of points <br/>
 * Points in the first array belong to first polygon, points from the second - to the second.
 * Points in each array are ordered according to the direction of the correspondent polygon
 * @param {Polygon} polygon1 - first operand
 * @param {Polygon} polygon2 - second operand
 * @returns {Point[][]}
 */
function calculateIntersections(polygon1, polygon2) {
    let res_poly = polygon1.clone();
    let wrk_poly = polygon2.clone();

    // get intersection points
    let intersections = getIntersections(res_poly, wrk_poly);

    // sort intersection points
    sortIntersections(intersections);

    // split by intersection points
    splitByIntersections(res_poly, intersections.int_points1_sorted);
    splitByIntersections(wrk_poly, intersections.int_points2_sorted);

    // filter duplicated intersection points
    filterDuplicatedIntersections(intersections);

    let ip_sorted1 = intersections.int_points1_sorted.map( int_point => int_point.pt);
    let ip_sorted2 = intersections.int_points2_sorted.map( int_point => int_point.pt);
    return [ip_sorted1, ip_sorted2];
}

function filterNotRelevantEdges(res_poly, wrk_poly, intersections, op) {
    // keep not intersected faces for further remove and merge
    let notIntersectedFacesRes = getNotIntersectedFaces(res_poly, intersections.int_points1);
    let notIntersectedFacesWrk = getNotIntersectedFaces(wrk_poly, intersections.int_points2);

    // calculate inclusion flag for not intersected faces
    calcInclusionForNotIntersectedFaces(notIntersectedFacesRes, wrk_poly);
    calcInclusionForNotIntersectedFaces(notIntersectedFacesWrk, res_poly);

    // initialize inclusion flags for edges incident to intersections
    initializeInclusionFlags(intersections.int_points1);
    initializeInclusionFlags(intersections.int_points2);

    // calculate inclusion flags only for edges incident to intersections
    calculateInclusionFlags(intersections.int_points1, wrk_poly);
    calculateInclusionFlags(intersections.int_points2, res_poly);

    // fix boundary conflicts
    while (fixBoundaryConflicts(res_poly, wrk_poly, intersections.int_points1, intersections.int_points1_sorted, intersections.int_points2, intersections));
    // while (fixBoundaryConflicts(wrk_poly, res_poly, intersections.int_points2, intersections.int_points2_sorted, intersections.int_points1, intersections));

    // Set overlapping flags for boundary chains: SAME or OPPOSITE
    setOverlappingFlags(intersections);

    // remove not relevant chains between intersection points
    removeNotRelevantChains(res_poly, op, intersections.int_points1_sorted, true);
    removeNotRelevantChains(wrk_poly, op, intersections.int_points2_sorted, false);

    // remove not relevant not intersected faces from res_polygon and wrk_polygon
    // if op == UNION, remove faces that are included in wrk_polygon without intersection
    // if op == INTERSECT, remove faces that are not included into wrk_polygon
    removeNotRelevantNotIntersectedFaces(res_poly, notIntersectedFacesRes, op, true);
    removeNotRelevantNotIntersectedFaces(wrk_poly, notIntersectedFacesWrk, op, false);
}

function swapLinksAndRestore(res_poly, wrk_poly, intersections, op) {

    // add edges of wrk_poly into the edge container of res_poly
    copyWrkToRes(res_poly, wrk_poly, op, intersections.int_points2);

    // swap links from res_poly to wrk_poly and vice versa
    swapLinks(res_poly, wrk_poly, intersections);

    // remove old faces
    removeOldFaces(res_poly, intersections.int_points1);
    removeOldFaces(wrk_poly, intersections.int_points2);

    // restore faces
    restoreFaces(res_poly, intersections.int_points1, intersections.int_points2);
    restoreFaces(res_poly, intersections.int_points2, intersections.int_points1);

    // merge relevant not intersected faces from wrk_polygon to res_polygon
    // mergeRelevantNotIntersectedFaces(res_poly, wrk_poly);
}


function booleanOpBinary(polygon1, polygon2, op, restore)
{
    let res_poly = polygon1.clone();
    let wrk_poly = polygon2.clone();

    // get intersection points
    let intersections = getIntersections(res_poly, wrk_poly);

    // sort intersection points
    sortIntersections(intersections);

    // split by intersection points
    splitByIntersections(res_poly, intersections.int_points1_sorted);
    splitByIntersections(wrk_poly, intersections.int_points2_sorted);

    // filter duplicated intersection points
    filterDuplicatedIntersections(intersections);

    // calculate inclusion and remove not relevant edges
    filterNotRelevantEdges(res_poly, wrk_poly, intersections, op);

    if (restore) {
        swapLinksAndRestore(res_poly, wrk_poly, intersections, op);
    }

    return [res_poly, wrk_poly];
}

function getIntersections(polygon1, polygon2)
{
    let intersections = {
        int_points1: [],
        int_points2: []
    };

    // calculate intersections
    for (let edge1 of polygon1.edges) {

        // request edges of polygon2 in the box of edge1
        let resp = polygon2.edges.search(edge1.box);

        // for each edge2 in response
        for (let edge2 of resp) {

            // calculate intersections between edge1 and edge2
            let ip = edge1.shape.intersect(edge2.shape);

            // for each intersection point
            for (let pt of ip) {
                addToIntPoints(edge1, pt, intersections.int_points1);
                addToIntPoints(edge2, pt, intersections.int_points2);
            }
        }
    }
    return intersections;
}

function addToIntPoints(edge, pt, int_points)
{
    let id = int_points.length;
    let shapes = edge.shape.split(pt);

    // if (shapes.length < 2) return;
    if (shapes.length === 0) return;     // Point does not belong to edge ?

    let len = 0;
    if (shapes[0] === null) {   // point incident to edge start vertex
        len = 0;
    }
    else if (shapes[1] === null) {   // point incident to edge end vertex
        len = edge.shape.length;
    }
    else {                             // Edge was split into to edges
        len = shapes[0].length;
    }

    let is_vertex = NOT_VERTEX;
    if (EQ(len, 0)) {
        is_vertex |= START_VERTEX;
    }
    if (EQ(len, edge.shape.length)) {
        is_vertex |= END_VERTEX;
    }
    // Fix intersection point which is end point of the last edge
    let arc_length = (is_vertex & END_VERTEX) && edge.next.arc_length === 0 ? 0 : edge.arc_length + len;

    int_points.push({
        id: id,
        pt: pt,
        arc_length: arc_length,
        edge_before: edge,
        edge_after: undefined,
        face: edge.face,
        is_vertex: is_vertex
    });
}

function sortIntersections(intersections)
{
    // if (intersections.int_points1.length === 0) return;

    // augment intersections with new sorted arrays
    // intersections.int_points1_sorted = intersections.int_points1.slice().sort(compareFn);
    // intersections.int_points2_sorted = intersections.int_points2.slice().sort(compareFn);
    intersections.int_points1_sorted = getSortedArray(intersections.int_points1);
    intersections.int_points2_sorted = getSortedArray(intersections.int_points2);
}

function getSortedArray(int_points)
{
    let faceMap = new Map;
    let id = 0;
    // Create integer id's for faces
    for (let ip of int_points) {
        if (!faceMap.has(ip.face)) {
            faceMap.set(ip.face, id);
            id++;
        }
    }
    // Augment intersection points with face id's
    for (let ip of int_points) {
        ip.faceId = faceMap.get(ip.face);
    }
    // Clone and sort
    let int_points_sorted = int_points.slice().sort(compareFn);
    return int_points_sorted;
}

function compareFn(ip1, ip2)
{
    // compare face id's
    if (ip1.faceId < ip2.faceId) {
        return -1;
    }
    if (ip1.faceId > ip2.faceId) {
        return 1;
    }
    // same face - compare arc_length
    if (ip1.arc_length < ip2.arc_length) {
        return -1;
    }
    if (ip1.arc_length > ip2.arc_length) {
        return 1;
    }
    return 0;
}

function splitByIntersections(polygon, int_points)
{
    if (!int_points) return;
    for (let int_point of int_points) {
        let edge = int_point.edge_before;

        // recalculate vertex flag: it may be changed after previous split
        int_point.is_vertex = NOT_VERTEX;
        if (edge.shape.start.equalTo(int_point.pt)) {
            int_point.is_vertex |= START_VERTEX;
        }
        if (edge.shape.end.equalTo(int_point.pt)) {
            int_point.is_vertex |= END_VERTEX;
        }

        if (int_point.is_vertex & START_VERTEX) {  // nothing to split
            int_point.edge_before = edge.prev;
            int_point.is_vertex = END_VERTEX;
            continue;
        }
        if (int_point.is_vertex & END_VERTEX) {    // nothing to split
            continue;
        }

        let newEdge = polygon.addVertex(int_point.pt, edge);
        int_point.edge_before = newEdge;
    }

    for (let int_point of int_points) {
        int_point.edge_after = int_point.edge_before.next;
    }
}

function filterDuplicatedIntersections(intersections)
{
    if (intersections.int_points1.length < 2) return;

    let do_squeeze = false;

    let int_point_ref1;
    let int_point_ref2;
    let int_point_cur1;
    let int_point_cur2;
    for (let i = 0; i < intersections.int_points1_sorted.length; i++) {

        if (intersections.int_points1_sorted[i].id === -1)
            continue;

        int_point_ref1 = intersections.int_points1_sorted[i];
        int_point_ref2 = intersections.int_points2[int_point_ref1.id];

        for (let j=i+1; j < intersections.int_points1_sorted.length; j++) {
            int_point_cur1 = intersections.int_points1_sorted[j];
            if (!EQ(int_point_cur1.arc_length, int_point_ref1.arc_length)) {
                break;
            }
            if (int_point_cur1.id === -1)
                continue;
            int_point_cur2 = intersections.int_points2[int_point_cur1.id];
            if (int_point_cur2.id === -1)
                continue;
            if (int_point_cur1.edge_before === int_point_ref1.edge_before &&
                int_point_cur1.edge_after === int_point_ref1.edge_after &&
                int_point_cur2.edge_before === int_point_ref2.edge_before &&
                int_point_cur2.edge_after === int_point_ref2.edge_after) {
                int_point_cur1.id = -1;
                /* to be deleted */
                int_point_cur2.id = -1;
                /* to be deleted */
                do_squeeze = true;
            }
        }
    }

    int_point_ref2 = intersections.int_points2_sorted[0];
    int_point_ref1 = intersections.int_points1[int_point_ref2.id];
    for (let i = 1; i < intersections.int_points2_sorted.length; i++) {
        let int_point_cur2 = intersections.int_points2_sorted[i];

        if (int_point_cur2.id == -1) continue;
        /* already deleted */

        if (int_point_ref2.id == -1 || /* can't be reference if already deleted */
            !(EQ(int_point_cur2.arc_length, int_point_ref2.arc_length))) {
            int_point_ref2 = int_point_cur2;
            int_point_ref1 = intersections.int_points1[int_point_ref2.id];
            continue;
        }

        let int_point_cur1 = intersections.int_points1[int_point_cur2.id];
        if (int_point_cur1.edge_before === int_point_ref1.edge_before &&
            int_point_cur1.edge_after === int_point_ref1.edge_after &&
            int_point_cur2.edge_before === int_point_ref2.edge_before &&
            int_point_cur2.edge_after === int_point_ref2.edge_after) {
            int_point_cur1.id = -1;
            /* to be deleted */
            int_point_cur2.id = -1;
            /* to be deleted */
            do_squeeze = true;
        }
    }

    if (do_squeeze) {
        intersections.int_points1 = intersections.int_points1.filter((int_point) => int_point.id >= 0);
        intersections.int_points2 = intersections.int_points2.filter((int_point) => int_point.id >= 0);

        // update id's
        intersections.int_points1.forEach((int_point, index) => int_point.id = index);
        intersections.int_points2.forEach((int_point, index) => int_point.id = index);

        // re-create sorted
        intersections.int_points1_sorted = [];
        intersections.int_points2_sorted = [];
        sortIntersections(intersections);
    }
}

function getNotIntersectedFaces(poly, int_points)
{
    let notIntersected = [];
    for (let face of poly.faces) {
        if (!int_points.find((ip) => ip.face === face)) {
            notIntersected.push(face);
        }
    }
    return notIntersected;
}

function calcInclusionForNotIntersectedFaces(notIntersectedFaces, poly2)
{
    for (let face of notIntersectedFaces) {
        face.first.bv = face.first.bvStart = face.first.bvEnd = undefined;
        face.first.setInclusion(poly2);
    }
}

function initializeInclusionFlags(int_points)
{
    for (let int_point of int_points) {
        int_point.edge_before.bvStart = undefined;
        int_point.edge_before.bvEnd = undefined;
        int_point.edge_before.bv = undefined;
        int_point.edge_before.overlap = undefined;

        int_point.edge_after.bvStart = undefined;
        int_point.edge_after.bvEnd = undefined;
        int_point.edge_after.bv = undefined;
        int_point.edge_after.overlap = undefined;
    }

    for (let int_point of int_points) {
        int_point.edge_before.bvEnd = BOUNDARY$1;
        int_point.edge_after.bvStart = BOUNDARY$1;
    }
}

function calculateInclusionFlags(int_points, polygon)
{
    for (let int_point of int_points) {
        int_point.edge_before.setInclusion(polygon);
        int_point.edge_after.setInclusion(polygon);
    }
}

function fixBoundaryConflicts(poly1, poly2, int_points1, int_points1_sorted, int_points2, intersections )
{
    let cur_face;
    let first_int_point_in_face_id;
    let next_int_point1;
    let num_int_points = int_points1_sorted.length;
    let iterate_more = false;

    for (let i = 0; i < num_int_points; i++) {
        let cur_int_point1 = int_points1_sorted[i];

        // Find boundary chain in the polygon1
        if (cur_int_point1.face !== cur_face) {                               // next chain started
            first_int_point_in_face_id = i; // cur_int_point1;
            cur_face = cur_int_point1.face;
        }

        // Skip duplicated points with same <x,y> in "cur_int_point1" pool
        let int_points_cur_pool_start = i;
        let int_points_cur_pool_num = intPointsPoolCount(int_points1_sorted, i, cur_face);
        let next_int_point_id;
        if (int_points_cur_pool_start + int_points_cur_pool_num < num_int_points &&
            int_points1_sorted[int_points_cur_pool_start + int_points_cur_pool_num].face === cur_face) {
            next_int_point_id = int_points_cur_pool_start + int_points_cur_pool_num;
        } else {                                         // get first point from the same face
            next_int_point_id = first_int_point_in_face_id;
        }

        // From all points with same ,x,y. in 'next_int_point1' pool choose one that
        // has same face both in res_poly and in wrk_poly
        let int_points_next_pool_num = intPointsPoolCount(int_points1_sorted, next_int_point_id, cur_face);
        next_int_point1 = null;
        for (let j=next_int_point_id; j < next_int_point_id + int_points_next_pool_num; j++) {
            let next_int_point1_tmp = int_points1_sorted[j];
            if (next_int_point1_tmp.face === cur_face &&
                int_points2[next_int_point1_tmp.id].face === int_points2[cur_int_point1.id].face) {
                next_int_point1 = next_int_point1_tmp;
                break;
            }
        }
        if (next_int_point1 === null)
            continue;

        let edge_from1 = cur_int_point1.edge_after;
        let edge_to1 = next_int_point1.edge_before;

        // Case #1. One of the ends is not boundary - probably tiny edge wrongly marked as boundary
        if (edge_from1.bv === BOUNDARY$1 && edge_to1.bv != BOUNDARY$1) {
            edge_from1.bv = edge_to1.bv;
            continue;
        }

        if (edge_from1.bv != BOUNDARY$1 && edge_to1.bv === BOUNDARY$1) {
            edge_to1.bv = edge_from1.bv;
            continue;
        }

        // Set up all boundary values for middle edges. Need for cases 2 and 3
        if ( (edge_from1.bv === BOUNDARY$1 && edge_to1.bv === BOUNDARY$1 && edge_from1 != edge_to1) ||
        (edge_from1.bv === INSIDE$1 && edge_to1.bv === OUTSIDE$1  || edge_from1.bv === OUTSIDE$1 && edge_to1.bv === INSIDE$1 ) ) {
            let edge_tmp = edge_from1.next;
            while (edge_tmp != edge_to1) {
                edge_tmp.bvStart = undefined;
                edge_tmp.bvEnd = undefined;
                edge_tmp.bv = undefined;
                edge_tmp.setInclusion(poly2);
                edge_tmp = edge_tmp.next;
            }
        }

        // Case #2. Both of the ends boundary. Check all the edges in the middle
        // If some edges in the middle are not boundary then update bv of 'from' and 'to' edges
        if (edge_from1.bv === BOUNDARY$1 && edge_to1.bv === BOUNDARY$1 && edge_from1 != edge_to1) {
            let edge_tmp = edge_from1.next;
            let new_bv;
            while (edge_tmp != edge_to1) {
                if (edge_tmp.bv != BOUNDARY$1) {
                    if (new_bv === undefined) {        // first not boundary edge between from and to
                        new_bv = edge_tmp.bv;
                    }
                    else {                            // another not boundary edge between from and to
                        if (edge_tmp.bv != new_bv) {  // and it has different bv - can't resolve conflict
                            throw Flatten.Errors.UNRESOLVED_BOUNDARY_CONFLICT;
                        }
                    }
                }
                edge_tmp = edge_tmp.next;
            }

            if (new_bv != undefined) {
                edge_from1.bv = new_bv;
                edge_to1.bv = new_bv;
            }
            continue;         // all middle edges are boundary, proceed with this
        }

        // Case 3. One of the ends is inner, another is outer
        if (edge_from1.bv === INSIDE$1 && edge_to1.bv === OUTSIDE$1  || edge_from1.bv === OUTSIDE$1 && edge_to1.bv === INSIDE$1 ) {
            let edge_tmp = edge_from1;
            // Find missing intersection point
            while (edge_tmp != edge_to1) {
                if (edge_tmp.bvStart === edge_from1.bv && edge_tmp.bvEnd === edge_to1.bv) {
                    let [dist, segment] = edge_tmp.shape.distanceTo(poly2);
                    if (dist < 10*Flatten.DP_TOL) {  // it should be very close
                        // let pt = edge_tmp.end;
                        // add to the list of intersections of poly1
                        addToIntPoints(edge_tmp, segment.ps, int_points1);

                        // split edge_tmp in poly1 if need
                        let int_point1 = int_points1[int_points1.length-1];
                        if (int_point1.is_vertex & START_VERTEX) {        // nothing to split
                            int_point1.edge_after = edge_tmp;
                            int_point1.edge_before = edge_tmp.prev;
                            edge_tmp.bvStart = BOUNDARY$1;
                            edge_tmp.bv = undefined;
                            edge_tmp.setInclusion(poly2);
                        }
                        else if (int_point1.is_vertex & END_VERTEX) {    // nothing to split
                            int_point1.edge_after = edge_tmp.next;
                            edge_tmp.bvEnd = BOUNDARY$1;
                            edge_tmp.bv = undefined;
                            edge_tmp.setInclusion(poly2);
                        }
                        else {        // split edge here
                            let newEdge1 = poly2.addVertex(int_point1.pt, edge_tmp);
                            int_point1.edge_before = newEdge1;
                            int_point1.edge_after = newEdge1.next;

                            newEdge1.setInclusion(poly2);

                            newEdge1.next.bvStart = BOUNDARY$1;
                            newEdge1.next.bvEnd = undefined;
                            newEdge1.next.bv = undefined;
                            newEdge1.next.setInclusion(poly2);
                        }

                        // add to the list of intersections of poly2
                        let edge2 = poly2.findEdgeByPoint(segment.pe);
                        addToIntPoints(edge2, segment.pe, int_points2);
                        // split edge2 in poly2 if need
                        let int_point2 = int_points2[int_points2.length-1];
                        if (int_point2.is_vertex & START_VERTEX) {        // nothing to split
                            int_point2.edge_after = edge2;
                            int_point2.edge_before = edge2.prev;
                        }
                        else if (int_point2.is_vertex & END_VERTEX) {    // nothing to split
                            int_point2.edge_after = edge2.next;
                        }
                        else {        // split edge here
                            // first locate int_points that may refer to edge2 as edge.after
                            // let int_point2_edge_before = int_points2.find( int_point => int_point.edge_before === edge2)
                            let int_point2_edge_after = int_points2.find( int_point => int_point.edge_after === edge2 );

                            let newEdge2 = poly2.addVertex(int_point2.pt, edge2);
                            int_point2.edge_before = newEdge2;
                            int_point2.edge_after = newEdge2.next;

                            if (int_point2_edge_after)
                                int_point2_edge_after.edge_after = newEdge2;

                            newEdge2.bvStart = undefined;
                            newEdge2.bvEnd = BOUNDARY$1;
                            newEdge2.bv = undefined;
                            newEdge2.setInclusion(poly1);

                            newEdge2.next.bvStart = BOUNDARY$1;
                            newEdge2.next.bvEnd = undefined;
                            newEdge2.next.bv = undefined;
                            newEdge2.next.setInclusion(poly1);
                        }

                        sortIntersections(intersections);

                        iterate_more = true;
                        break;
                    }
                }
                edge_tmp = edge_tmp.next;
            }

            // we changed intersections inside loop, have to exit and repair again
            if (iterate_more)
                break;

            throw Flatten.Errors.UNRESOLVED_BOUNDARY_CONFLICT;
        }
    }

    return iterate_more;
}

function setOverlappingFlags(intersections)
{
    let cur_face = undefined;
    let first_int_point_in_face_id = undefined;
    let next_int_point1 = undefined;
    let num_int_points = intersections.int_points1.length;

    for (let i = 0; i < num_int_points; i++) {
        let cur_int_point1 = intersections.int_points1_sorted[i];

        // Find boundary chain in the polygon1
        if (cur_int_point1.face !== cur_face) {                               // next chain started
            first_int_point_in_face_id = i; // cur_int_point1;
            cur_face = cur_int_point1.face;
        }

        // Skip duplicated points with same <x,y> in "cur_int_point1" pool
        let int_points_cur_pool_start = i;
        let int_points_cur_pool_num = intPointsPoolCount(intersections.int_points1_sorted, i, cur_face);
        let next_int_point_id;
        if (int_points_cur_pool_start + int_points_cur_pool_num < num_int_points &&
            intersections.int_points1_sorted[int_points_cur_pool_start + int_points_cur_pool_num].face === cur_face) {
            next_int_point_id = int_points_cur_pool_start + int_points_cur_pool_num;
        } else {                                         // get first point from the same face
            next_int_point_id = first_int_point_in_face_id;
        }

        // From all points with same ,x,y. in 'next_int_point1' pool choose one that
        // has same face both in res_poly and in wrk_poly
        let int_points_next_pool_num = intPointsPoolCount(intersections.int_points1_sorted, next_int_point_id, cur_face);
        next_int_point1 = null;
        for (let j=next_int_point_id; j < next_int_point_id + int_points_next_pool_num; j++) {
            let next_int_point1_tmp = intersections.int_points1_sorted[j];
            if (next_int_point1_tmp.face === cur_face &&
                intersections.int_points2[next_int_point1_tmp.id].face === intersections.int_points2[cur_int_point1.id].face) {
                next_int_point1 = next_int_point1_tmp;
                break;
            }
        }
        if (next_int_point1 === null)
            continue;

        let edge_from1 = cur_int_point1.edge_after;
        let edge_to1 = next_int_point1.edge_before;

        if (!(edge_from1.bv === BOUNDARY$1 && edge_to1.bv === BOUNDARY$1))      // not a boundary chain - skip
            continue;

        if (edge_from1 !== edge_to1)                    //  one edge chain    TODO: support complex case
            continue;

        /* Find boundary chain in polygon2 between same intersection points */
        let cur_int_point2 = intersections.int_points2[cur_int_point1.id];
        let next_int_point2 = intersections.int_points2[next_int_point1.id];

        let edge_from2 = cur_int_point2.edge_after;
        let edge_to2 = next_int_point2.edge_before;

        /* if [edge_from2..edge_to2] is not a boundary chain, invert it */
        /* check also that chain consist of one or two edges */
        if (!(edge_from2.bv === BOUNDARY$1 && edge_to2.bv === BOUNDARY$1 && edge_from2 === edge_to2)) {
            cur_int_point2 = intersections.int_points2[next_int_point1.id];
            next_int_point2 = intersections.int_points2[cur_int_point1.id];

            edge_from2 = cur_int_point2.edge_after;
            edge_to2 = next_int_point2.edge_before;
        }

        if (!(edge_from2.bv === BOUNDARY$1 && edge_to2.bv === BOUNDARY$1 && edge_from2 === edge_to2))
            continue;                           // not an overlapping chain - skip   TODO: fix boundary conflict

        // Set overlapping flag - one-to-one case
        edge_from1.setOverlap(edge_from2);
    }
}

function removeNotRelevantChains(polygon, op, int_points, is_res_polygon)
{
    if (!int_points) return;
    let cur_face = undefined;
    let first_int_point_in_face_num = undefined;
    let int_point_current;
    let int_point_next;

    for (let i = 0; i < int_points.length; i++) {
        int_point_current = int_points[i];

        if (int_point_current.face !== cur_face) {   // next face started
            first_int_point_in_face_num = i;
            cur_face = int_point_current.face;
        }

        if (cur_face.isEmpty())                // ??
            continue;

        // Get next int point from the same face that current

        // Count how many duplicated points with same <x,y> in "points from" pool ?
        let int_points_from_pull_start = i;
        let int_points_from_pull_num = intPointsPoolCount(int_points, i, cur_face);
        let next_int_point_num;
        if (int_points_from_pull_start + int_points_from_pull_num < int_points.length &&
            int_points[int_points_from_pull_start + int_points_from_pull_num].face === int_point_current.face) {
            next_int_point_num = int_points_from_pull_start + int_points_from_pull_num;
        } else {                                         // get first point from the same face
            next_int_point_num = first_int_point_in_face_num;
        }
        int_point_next = int_points[next_int_point_num];

        /* Count how many duplicated points with same <x,y> in "points to" pull ? */
        let int_points_to_pull_start = next_int_point_num;
        let int_points_to_pull_num = intPointsPoolCount(int_points, int_points_to_pull_start, cur_face);


        let edge_from = int_point_current.edge_after;
        let edge_to = int_point_next.edge_before;

        if ((edge_from.bv === INSIDE$1 && edge_to.bv === INSIDE$1 && op === BOOLEAN_UNION) ||
            (edge_from.bv === OUTSIDE$1 && edge_to.bv === OUTSIDE$1 && op === BOOLEAN_INTERSECT) ||
            ((edge_from.bv === OUTSIDE$1 || edge_to.bv === OUTSIDE$1) && op === BOOLEAN_SUBTRACT && !is_res_polygon) ||
            ((edge_from.bv === INSIDE$1 || edge_to.bv === INSIDE$1) && op === BOOLEAN_SUBTRACT && is_res_polygon) ||
            (edge_from.bv === BOUNDARY$1 && edge_to.bv === BOUNDARY$1 && (edge_from.overlap & OVERLAP_SAME$1) && is_res_polygon) ||
            (edge_from.bv === BOUNDARY$1 && edge_to.bv === BOUNDARY$1 && (edge_from.overlap & OVERLAP_OPPOSITE$1))) {

            polygon.removeChain(cur_face, edge_from, edge_to);

            /* update all points in "points from" pull */
            for (let k = int_points_from_pull_start; k < int_points_from_pull_start + int_points_from_pull_num; k++) {
                int_points[k].edge_after = undefined;
            }

            /* update all points in "points to" pull */
            for (let k = int_points_to_pull_start; k < int_points_to_pull_start + int_points_to_pull_num; k++) {
                int_points[k].edge_before = undefined;
            }
        }

        /* skip to the last point in "points from" group */
        i += int_points_from_pull_num - 1;
    }
}
function intPointsPoolCount(int_points, cur_int_point_num, cur_face)
{
    let int_point_current;
    let int_point_next;

    let int_points_pool_num = 1;

    if (int_points.length == 1) return 1;

    int_point_current = int_points[cur_int_point_num];

    for (let i = cur_int_point_num + 1; i < int_points.length; i++) {
        if (int_point_current.face != cur_face) {      /* next face started */
            break;
        }

        int_point_next = int_points[i];

        if (!(int_point_next.pt.equalTo(int_point_current.pt) &&
            int_point_next.edge_before === int_point_current.edge_before &&
            int_point_next.edge_after === int_point_current.edge_after)) {
            break;         /* next point is different - break and exit */
        }

        int_points_pool_num++;     /* duplicated intersection point - increase counter */
    }
    return int_points_pool_num;
}

function copyWrkToRes(res_polygon, wrk_polygon, op, int_points)
{
    for (let face of wrk_polygon.faces) {
        for (let edge of face) {
            res_polygon.edges.add(edge);
        }
        // If union - add face from wrk_polygon that is not intersected with res_polygon
        if ( /*(op === BOOLEAN_UNION || op == BOOLEAN_SUBTRACT) &&*/
            int_points.find((ip) => (ip.face === face)) === undefined) {
            res_polygon.addFace(face.first, face.last);
        }
    }
}

function swapLinks(res_polygon, wrk_polygon, intersections)
{
    if (intersections.int_points1.length === 0) return;

    for (let i = 0; i < intersections.int_points1.length; i++) {
        let int_point1 = intersections.int_points1[i];
        let int_point2 = intersections.int_points2[i];

        // Simple case - find continuation on the other polygon

        // Process edge from res_polygon
        if (int_point1.edge_before !== undefined && int_point1.edge_after === undefined) {    // swap need
            if (int_point2.edge_before === undefined && int_point2.edge_after !== undefined) {  // simple case
                // Connect edges
                int_point1.edge_before.next = int_point2.edge_after;
                int_point2.edge_after.prev = int_point1.edge_before;

                // Fill in missed links in intersection points
                int_point1.edge_after = int_point2.edge_after;
                int_point2.edge_before = int_point1.edge_before;
            }
        }
        // Process edge from wrk_polygon
        if (int_point2.edge_before !== undefined && int_point2.edge_after === undefined) {    // swap need
            if (int_point1.edge_before === undefined && int_point1.edge_after !== undefined) {  // simple case
                // Connect edges
                int_point2.edge_before.next = int_point1.edge_after;
                int_point1.edge_after.prev = int_point2.edge_before;

                // Complete missed links
                int_point2.edge_after = int_point1.edge_after;
                int_point1.edge_before = int_point2.edge_before;
            }
        }

        // Continuation not found - complex case
        // Continuation will be found on the same polygon.
        // It happens when intersection point is actually touching point
        // Polygon1
        if (int_point1.edge_before !== undefined && int_point1.edge_after === undefined) {    // still swap need
            for (let int_point of intersections.int_points1_sorted) {
                if (int_point === int_point1) continue;     // skip same
                if (int_point.edge_before === undefined && int_point.edge_after !== undefined) {
                    if (int_point.pt.equalTo(int_point1.pt)) {
                        // Connect edges
                        int_point1.edge_before.next = int_point.edge_after;
                        int_point.edge_after.prev = int_point1.edge_before;

                        // Complete missed links
                        int_point1.edge_after = int_point.edge_after;
                        int_point.edge_before = int_point1.edge_before;
                    }
                }
            }
        }
        // Polygon2
        if (int_point2.edge_before !== undefined && int_point2.edge_after === undefined) {    // still swap need
            for (let int_point of intersections.int_points2_sorted) {
                if (int_point === int_point2) continue;     // skip same
                if (int_point.edge_before === undefined && int_point.edge_after !== undefined) {
                    if (int_point.pt.equalTo(int_point2.pt)) {
                        // Connect edges
                        int_point2.edge_before.next = int_point.edge_after;
                        int_point.edge_after.prev = int_point2.edge_before;

                        // Complete missed links
                        int_point2.edge_after = int_point.edge_after;
                        int_point.edge_before = int_point2.edge_before;
                    }
                }
            }
        }
    }
    // Sanity check that no dead ends left
}

function removeOldFaces(polygon, int_points)
{
    for (let int_point of int_points) {
        polygon.faces.delete(int_point.face);
        int_point.face = undefined;
        if (int_point.edge_before)
            int_point.edge_before.face = undefined;
        if (int_point.edge_after)
            int_point.edge_after.face = undefined;
    }
}

function restoreFaces(polygon, int_points, other_int_points)
{
    // For each intersection point - create new face
    for (let int_point of int_points) {
        if (int_point.edge_before === undefined || int_point.edge_after === undefined)  // completely deleted
            continue;
        if (int_point.face)            // already restored
            continue;

        if (int_point.edge_after.face || int_point.edge_before.face)        // Face already created. Possible case in duplicated intersection points
            continue;

        let first = int_point.edge_after;      // face start
        let last = int_point.edge_before;      // face end;

        LinkedList.testInfiniteLoop(first);    // check and throw error if infinite loop found

        let face = polygon.addFace(first, last);

        // Mark intersection points from the newly create face
        // to avoid multiple creation of the same face
        // Face was assigned to each edge of new face in addFace function
        for (let int_point_tmp of int_points) {
            if (int_point_tmp.edge_before && int_point_tmp.edge_after &&
                int_point_tmp.edge_before.face === face && int_point_tmp.edge_after.face === face) {
                int_point_tmp.face = face;
            }
        }
        // Mark other intersection points as well
        for (let int_point_tmp of other_int_points) {
            if (int_point_tmp.edge_before && int_point_tmp.edge_after &&
                int_point_tmp.edge_before.face === face && int_point_tmp.edge_after.face === face) {
                int_point_tmp.face = face;
            }
        }
    }
}

function removeNotRelevantNotIntersectedFaces(polygon, notIntersectedFaces, op, is_res_polygon)
{
    for (let face of notIntersectedFaces) {
        let rel = face.first.bv;
        if (op === BOOLEAN_UNION && rel === INSIDE$1 ||
            op === BOOLEAN_SUBTRACT && rel === INSIDE$1 && is_res_polygon ||
            op === BOOLEAN_SUBTRACT && rel === OUTSIDE$1 && !is_res_polygon ||
            op === BOOLEAN_INTERSECT && rel === OUTSIDE$1) {

            polygon.deleteFace(face);
        }
    }
}

var BooleanOperations = /*#__PURE__*/Object.freeze({
    BOOLEAN_UNION: BOOLEAN_UNION,
    BOOLEAN_INTERSECT: BOOLEAN_INTERSECT,
    BOOLEAN_SUBTRACT: BOOLEAN_SUBTRACT,
    unify: unify,
    subtract: subtract,
    intersect: intersect,
    innerClip: innerClip,
    outerClip: outerClip,
    calculateIntersections: calculateIntersections,
    addToIntPoints: addToIntPoints,
    getSortedArray: getSortedArray,
    splitByIntersections: splitByIntersections,
    filterDuplicatedIntersections: filterDuplicatedIntersections,
    removeNotRelevantChains: removeNotRelevantChains,
    removeOldFaces: removeOldFaces,
    restoreFaces: restoreFaces
});

/*
    Dimensionally extended 9-intersected model
    See https://en.wikipedia.org/wiki/DE-9IM for more details
 */
// const DISJOINT = RegExp('FF.FF....');
const EQUAL = RegExp('T.F..FFF.|T.F...F..');
const INTERSECT = RegExp('T........|.T.......|...T.....|....T....');
const TOUCH = RegExp('FT.......|F..T.....|F...T....');
const INSIDE$2 = RegExp('T.F..F...');
const COVERED = RegExp('T.F..F...|.TF..F...|..FT.F...|..F.TF...');

class DE9IM {
    /**
     * Create new instance of DE9IM matrix
     */
    constructor() {
        /**
         * Array representing 3x3 intersection matrix
         * @type {Shape[]}
         */
        this.m = new Array(9).fill(undefined);
    }

    /**
     * Get Interior To Interior intersection
     * @returns {Shape[] | undefined}
     */
    get I2I() {
        return this.m[0];
    }

    /**
     * Set Interior To Interior intersection
     * @param geom
     */
    set I2I(geom) {
        this.m[0] = geom;
    }

    /**
     * Get Interior To Boundary intersection
     * @returns {Shape[] | undefined}
     */
    get I2B() {
        return this.m[1];
    }

    /**
     * Set Interior to Boundary intersection
     * @param geomc
     */
    set I2B(geom) {
        this.m[1] = geom;
    }

    /**
     * Get Interior To Exterior intersection
     * @returns {Shape[] | undefined}
     */
    get I2E() {
        return this.m[2];
    }

    /**
     * Set Interior to Exterior intersection
     * @param geom
     */
    set I2E(geom) {
        this.m[2] = geom;
    }

    /**
     * Get Boundary To Interior intersection
     * @returns {Shape[] | undefined}
     */
    get B2I() {
        return this.m[3];
    }

    /**
     * Set Boundary to Interior intersection
     * @param geom
     */
    set B2I(geom) {
        this.m[3] = geom;
    }

    /**
     * Get Boundary To Boundary intersection
     * @returns {Shape[] | undefined}
     */
    get B2B() {
        return this.m[4];
    }

    /**
     * Set Boundary to Boundary intersection
     * @param geom
     */
    set B2B(geom) {
        this.m[4] = geom;
    }

    /**
     * Get Boundary To Exterior intersection
     * @returns {Shape[] | undefined}
     */
    get B2E() {
        return this.m[5];
    }

    /**
     * Set Boundary to Exterior intersection
     * @param geom
     */
    set B2E(geom) {
        this.m[5] = geom;
    }

    /**
     * Get Exterior To Interior intersection
     * @returns {Shape[] | undefined}
     */
    get E2I() {
        return this.m[6];
    }

    /**
     * Set Exterior to Interior intersection
     * @param geom
     */
    set E2I(geom) {
        this.m[6] = geom;
    }

    /**
     * Get Exterior To Boundary intersection
     * @returns {Shape[] | undefined}
     */
    get E2B() {
        return this.m[7];
    }

    /**
     * Set Exterior to Boundary intersection
     * @param geom
     */
    set E2B(geom) {
        this.m[7] = geom;
    }

    /**
     * Get Exterior to Exterior intersection
     * @returns {Shape[] | undefined}
     */
    get E2E() {
        return this.m[8];
    }

    /**
     * Set Exterior to Exterior intersection
     * @param geom
     */
    set E2E(geom) {
        this.m[8] = geom;
    }

    /**
     * Return de9im matrix as string where<br/>
     * - intersection is 'T'<br/>
     * - not intersected is 'F'<br/>
     * - not relevant is '*'<br/>
     * For example, string 'FF**FF****' means 'DISJOINT'
     * @returns {string}
     */
    toString() {
        return this.m.map( e => {
            if (e instanceof Array && e.length > 0) {
                return 'T'
            }
            else if (e instanceof Array && e.length === 0) {
                return 'F'
            }
            else {
                return '*'
            }
        }).join("")
    }

    equal() {
        return EQUAL.test(this.toString());
    }

    intersect() {
        return INTERSECT.test(this.toString());
    }

    touch() {
        return TOUCH.test(this.toString());
    }

    inside() {
        return INSIDE$2.test(this.toString());
    }

    covered() {
        return COVERED.test(this.toString());
    }
}

/**
 * Intersection
 *
 * */

function intersectLine2Line(line1, line2) {
    let ip = [];

    let [A1, B1, C1] = line1.standard;
    let [A2, B2, C2] = line2.standard;

    /* Cramer's rule */
    let det = A1 * B2 - B1 * A2;
    let detX = C1 * B2 - B1 * C2;
    let detY = A1 * C2 - C1 * A2;

    if (!Flatten.Utils.EQ_0(det)) {
        let x, y;

        if (B1 === 0) {        // vertical line x  = C1/A1, where A1 == +1 or -1
            x = C1/A1;
            y = detY / det;
        }
        else if (B2 === 0) {   // vertical line x = C2/A2, where A2 = +1 or -1
            x = C2/A2;
            y = detY / det;
        }
        else if (A1 === 0) {   // horizontal line y = C1/B1, where B1 = +1 or -1
            x = detX / det;
            y = C1/B1;
        }
        else if (A2 === 0) {   // horizontal line y = C2/B2, where B2 = +1 or -1
            x = detX / det;
            y = C2/B2;
        }
        else {
            x = detX / det;
            y = detY / det;
        }

        ip.push(new Flatten.Point(x, y));
    }

    return ip;
}

function intersectLine2Circle(line, circle) {
    let ip = [];
    let prj = circle.pc.projectionOn(line);            // projection of circle center on line
    let dist = circle.pc.distanceTo(prj)[0];           // distance from circle center to projection

    if (Flatten.Utils.EQ(dist, circle.r)) {            // line tangent to circle - return single intersection point
        ip.push(prj);
    } else if (Flatten.Utils.LT(dist, circle.r)) {       // return two intersection points
        let delta = Math.sqrt(circle.r * circle.r - dist * dist);
        let v_trans, pt;

        v_trans = line.norm.rotate90CCW().multiply(delta);
        pt = prj.translate(v_trans);
        ip.push(pt);

        v_trans = line.norm.rotate90CW().multiply(delta);
        pt = prj.translate(v_trans);
        ip.push(pt);
    }
    return ip;
}

function intersectLine2Box(line, box) {
    let ips = [];
    for (let seg of box.toSegments()) {
        let ips_tmp = intersectSegment2Line(seg, line);
        for (let pt of ips_tmp) {
            if (!ptInIntPoints(pt, ips)) {
                ips.push(pt);
            }
        }
    }
    return ips;
}

function intersectLine2Arc(line, arc) {
    let ip = [];

    if (intersectLine2Box(line, arc.box).length === 0) {
        return ip;
    }

    let circle = new Flatten.Circle(arc.pc, arc.r);
    let ip_tmp = intersectLine2Circle(line, circle);
    for (let pt of ip_tmp) {
        if (pt.on(arc)) {
            ip.push(pt);
        }
    }

    return ip;
}

function intersectSegment2Line(seg, line) {
    let ip = [];

    // Boundary cases
    if (seg.ps.on(line)) {
        ip.push(seg.ps);
    }
    // If both ends lay on line, return two intersection points
    if (seg.pe.on(line) && !seg.isZeroLength()) {
        ip.push(seg.pe);
    }

    if (ip.length > 0) {
        return ip;          // done, intersection found
    }

    // If zero-length segment and nothing found, return no intersections
    if (seg.isZeroLength()) {
        return ip;
    }

    // Not a boundary case, check if both points are on the same side and
    // hence there is no intersection
    if (seg.ps.leftTo(line) && seg.pe.leftTo(line) ||
        !seg.ps.leftTo(line) && !seg.pe.leftTo(line)) {
        return ip;
    }

    // Calculate intersection between lines
    let line1 = new Flatten.Line(seg.ps, seg.pe);
    return intersectLine2Line(line1, line);
}

function intersectSegment2Segment(seg1, seg2) {
    let ip = [];

    // quick reject
    if (seg1.box.not_intersect(seg2.box)) {
        return ip;
    }

    // Special case of seg1 zero length
    if (seg1.isZeroLength()) {
        if (seg1.ps.on(seg2)) {
            ip.push(seg1.ps);
        }
        return ip;
    }

    // Special case of seg2 zero length
    if (seg2.isZeroLength()) {
        if (seg2.ps.on(seg1)) {
            ip.push(seg2.ps);
        }
        return ip;
    }

    // Neither seg1 nor seg2 is zero length
    let line1 = new Flatten.Line(seg1.ps, seg1.pe);
    let line2 = new Flatten.Line(seg2.ps, seg2.pe);

    // Check overlapping between segments in case of incidence
    // If segments touching, add one point. If overlapping, add two points
    if (line1.incidentTo(line2)) {
        if (seg1.ps.on(seg2)) {
            ip.push(seg1.ps);
        }
        if (seg1.pe.on(seg2)) {
            ip.push(seg1.pe);
        }
        if (seg2.ps.on(seg1) && !seg2.ps.equalTo(seg1.ps) && !seg2.ps.equalTo(seg1.pe)) {
            ip.push(seg2.ps);
        }
        if (seg2.pe.on(seg1) && !seg2.pe.equalTo(seg1.ps) && !seg2.pe.equalTo(seg1.pe)) {
            ip.push(seg2.pe);
        }
    } else {                /* not incident - parallel or intersect */
        // Calculate intersection between lines
        let new_ip = intersectLine2Line(line1, line2);
        if (new_ip.length > 0 && new_ip[0].on(seg1) && new_ip[0].on(seg2)) {
            ip.push(new_ip[0]);
        }

        // Fix missing intersection
        // const tol = 10*Flatten.DP_TOL;
        // if (ip.length === 0 && new_ip.length > 0 && (new_ip[0].distanceTo(seg1)[0] < tol || new_ip[0].distanceTo(seg2)[0] < tol) ) {
        //     if (seg1.start.distanceTo(seg2)[0] < tol) {
        //         ip.push(new_ip[0]);
        //     }
        //     else if (seg1.end.distanceTo(seg2)[0] < tol) {
        //         ip.push(new_ip[0]);
        //     }
        //     else if (seg2.start.distanceTo(seg1)[0] < tol) {
        //         ip.push(new_ip[0]);
        //     }
        //     else if (seg2.end.distanceTo(seg1)[0] < tol) {
        //         ip.push(new_ip[0]);
        //     }
        // }
    }

    return ip;
}

function intersectSegment2Circle(segment, circle) {
    let ips = [];

    if (segment.box.not_intersect(circle.box)) {
        return ips;
    }

    // Special case of zero length segment
    if (segment.isZeroLength()) {
        let [dist, shortest_segment] = segment.ps.distanceTo(circle.pc);
        if (Flatten.Utils.EQ(dist, circle.r)) {
            ips.push(segment.ps);
        }
        return ips;
    }

    // Non zero-length segment
    let line = new Flatten.Line(segment.ps, segment.pe);

    let ips_tmp = intersectLine2Circle(line, circle);

    for (let ip of ips_tmp) {
        if (ip.on(segment)) {
            ips.push(ip);
        }
    }

    return ips;
}

function intersectSegment2Arc(segment, arc) {
    let ip = [];

    if (segment.box.not_intersect(arc.box)) {
        return ip;
    }

    // Special case of zero-length segment
    if (segment.isZeroLength()) {
        if (segment.ps.on(arc)) {
            ip.push(segment.ps);
        }
        return ip;
    }

    // Non-zero length segment
    let line = new Flatten.Line(segment.ps, segment.pe);
    let circle = new Flatten.Circle(arc.pc, arc.r);

    let ip_tmp = intersectLine2Circle(line, circle);

    for (let pt of ip_tmp) {
        if (pt.on(segment) && pt.on(arc)) {
            ip.push(pt);
        }
    }
    return ip;

}

function intersectSegment2Box(segment, box) {
    let ips = [];
    for (let seg of box.toSegments()) {
        let ips_tmp = intersectSegment2Segment(seg, segment);
        for (let ip of ips_tmp) {
            ips.push(ip);
        }
    }
    return ips;
}

function intersectCircle2Circle(circle1, circle2) {
    let ip = [];

    if (circle1.box.not_intersect(circle2.box)) {
        return ip;
    }

    let vec = new Flatten.Vector(circle1.pc, circle2.pc);

    let r1 = circle1.r;
    let r2 = circle2.r;

    // Degenerated circle
    if (Flatten.Utils.EQ_0(r1) || Flatten.Utils.EQ_0(r2))
        return ip;

    // In case of equal circles return one leftmost point
    if (Flatten.Utils.EQ_0(vec.x) && Flatten.Utils.EQ_0(vec.y) && Flatten.Utils.EQ(r1, r2)) {
        ip.push(circle1.pc.translate(-r1, 0));
        return ip;
    }

    let dist = circle1.pc.distanceTo(circle2.pc)[0];

    if (Flatten.Utils.GT(dist, r1 + r2))               // circles too far, no intersections
        return ip;

    if (Flatten.Utils.LT(dist, Math.abs(r1 - r2)))     // one circle is contained within another, no intersections
        return ip;

    // Normalize vector.
    vec.x /= dist;
    vec.y /= dist;

    let pt;

    // Case of touching from outside or from inside - single intersection point
    // TODO: check this specifically not sure if correct
    if (Flatten.Utils.EQ(dist, r1 + r2) || Flatten.Utils.EQ(dist, Math.abs(r1 - r2))) {
        pt = circle1.pc.translate(r1 * vec.x, r1 * vec.y);
        ip.push(pt);
        return ip;
    }

    // Case of two intersection points

    // Distance from first center to center of common chord:
    //   a = (r1^2 - r2^2 + d^2) / 2d
    // Separate for better accuracy
    let a = (r1 * r1) / (2 * dist) - (r2 * r2) / (2 * dist) + dist / 2;

    let mid_pt = circle1.pc.translate(a * vec.x, a * vec.y);
    let h = Math.sqrt(r1 * r1 - a * a);
    // let norm;

    // norm = vec.rotate90CCW().multiply(h);
    pt = mid_pt.translate(vec.rotate90CCW().multiply(h));
    ip.push(pt);

    // norm = vec.rotate90CW();
    pt = mid_pt.translate(vec.rotate90CW().multiply(h));
    ip.push(pt);

    return ip;
}

function intersectCircle2Box(circle, box) {
    let ips = [];
    for (let seg of box.toSegments()) {
        let ips_tmp = intersectSegment2Circle(seg, circle);
        for (let ip of ips_tmp) {
            ips.push(ip);
        }
    }
    return ips;
}

function intersectArc2Arc(arc1, arc2) {
    var ip = [];

    if (arc1.box.not_intersect(arc2.box)) {
        return ip;
    }

    // Special case: overlapping arcs
    // May return up to 4 intersection points
    if (arc1.pc.equalTo(arc2.pc) && Flatten.Utils.EQ(arc1.r, arc2.r)) {
        let pt;

        pt = arc1.start;
        if (pt.on(arc2))
            ip.push(pt);

        pt = arc1.end;
        if (pt.on(arc2))
            ip.push(pt);

        pt = arc2.start;
        if (pt.on(arc1)) ip.push(pt);

        pt = arc2.end;
        if (pt.on(arc1)) ip.push(pt);

        return ip;
    }

    // Common case
    let circle1 = new Flatten.Circle(arc1.pc, arc1.r);
    let circle2 = new Flatten.Circle(arc2.pc, arc2.r);
    let ip_tmp = circle1.intersect(circle2);
    for (let pt of ip_tmp) {
        if (pt.on(arc1) && pt.on(arc2)) {
            ip.push(pt);
        }
    }
    return ip;
}

function intersectArc2Circle(arc, circle) {
    let ip = [];

    if (arc.box.not_intersect(circle.box)) {
        return ip;
    }

    // Case when arc center incident to circle center
    // Return arc's end points as 2 intersection points
    if (circle.pc.equalTo(arc.pc) && Flatten.Utils.EQ(circle.r, arc.r)) {
        ip.push(arc.start);
        ip.push(arc.end);
        return ip;
    }

    // Common case
    let circle1 = circle;
    let circle2 = new Flatten.Circle(arc.pc, arc.r);
    let ip_tmp = intersectCircle2Circle(circle1, circle2);
    for (let pt of ip_tmp) {
        if (pt.on(arc)) {
            ip.push(pt);
        }
    }
    return ip;
}

function intersectArc2Box(arc, box) {
    let ips = [];
    for (let seg of box.toSegments()) {
        let ips_tmp = intersectSegment2Arc(seg, arc);
        for (let ip of ips_tmp) {
            ips.push(ip);
        }
    }
    return ips;
}

function intersectEdge2Segment(edge, segment) {
    return edge.isSegment() ? intersectSegment2Segment(edge.shape, segment) : intersectSegment2Arc(segment, edge.shape);
}

function intersectEdge2Arc(edge, arc) {
    return edge.isSegment() ? intersectSegment2Arc(edge.shape, arc) : intersectArc2Arc(edge.shape, arc);
}

function intersectEdge2Line(edge, line) {
    return edge.isSegment() ? intersectSegment2Line(edge.shape, line) : intersectLine2Arc(line, edge.shape);
}

function intersectEdge2Circle(edge, circle) {
    return edge.isSegment() ? intersectSegment2Circle(edge.shape, circle) : intersectArc2Circle(edge.shape, circle);
}

function intersectSegment2Polygon(segment, polygon) {
    let ip = [];

    for (let edge of polygon.edges) {
        for (let pt of intersectEdge2Segment(edge, segment)) {
            ip.push(pt);
        }
    }

    return ip;
}

function intersectArc2Polygon(arc, polygon) {
    let ip = [];

    for (let edge of polygon.edges) {
        for (let pt of intersectEdge2Arc(edge, arc)) {
            ip.push(pt);
        }
    }

    return ip;
}

function intersectLine2Polygon(line, polygon) {
    let ip = [];

    if (polygon.isEmpty()) {
        return ip;
    }

    for (let edge of polygon.edges) {
        for (let pt of intersectEdge2Line(edge, line)) {
            if (!ptInIntPoints(pt, ip)) {
                ip.push(pt);
            }
        }
    }

    return line.sortPoints(ip);
}

function intersectCircle2Polygon(circle, polygon) {
    let ip = [];

    if (polygon.isEmpty()) {
        return ip;
    }

    for (let edge of polygon.edges) {
        for (let pt of intersectEdge2Circle(edge, circle)) {
            ip.push(pt);
        }
    }

    return ip;
}

function intersectEdge2Edge(edge1, edge2) {
    const shape1 = edge1.shape;
    const shape2 = edge2.shape;
    return edge1.isSegment() ?
        (edge2.isSegment() ? intersectSegment2Segment(shape1, shape2) : intersectSegment2Arc(shape1, shape2)) :
        (edge2.isSegment() ? intersectSegment2Arc(shape2, shape1) : intersectArc2Arc(shape1, shape2));
}

function intersectEdge2Polygon(edge, polygon) {
    let ip = [];

    if (polygon.isEmpty() || edge.shape.box.not_intersect(polygon.box)) {
        return ip;
    }

    let resp_edges = polygon.edges.search(edge.shape.box);

    for (let resp_edge of resp_edges) {
        for (let pt of intersectEdge2Edge(edge, resp_edge)) {
            ip.push(pt);
        }
    }

    return ip;
}

function intersectPolygon2Polygon(polygon1, polygon2) {
    let ip = [];

    if (polygon1.isEmpty() || polygon2.isEmpty()) {
        return ip;
    }

    if (polygon1.box.not_intersect(polygon2.box)) {
        return ip;
    }

    for (let edge1 of polygon1.edges) {
        for (let pt of intersectEdge2Polygon(edge1, polygon2)) {
            ip.push(pt);
        }
    }

    return ip;
}

function intersectShape2Polygon(shape, polygon) {
    if (shape instanceof Flatten.Line) {
        return intersectLine2Polygon(shape, polygon);
    }
    else if (shape instanceof Flatten.Segment) {
        return intersectSegment2Polygon(shape, polygon);
    }
    else if (shape instanceof Flatten.Arc) {
        return intersectArc2Polygon(shape, polygon);
    }
    else {
        return [];
    }
}

function ptInIntPoints(new_pt, ip) {
    return ip.some( pt => pt.equalTo(new_pt) )
}

/**
 * Class Multiline represent connected path of [edges]{@link Flatten.Edge}, where each edge may be
 * [segment]{@link Flatten.Segment}, [arc]{@link Flatten.Arc}, [line]{@link Flatten.Line} or [ray]{@link Flatten.Ray}
 */
class Multiline extends LinkedList {
    constructor(...args) {
        super();

        if (args.length === 0) {
            return;
        }

        if (args.length == 1) {
            if (args[0] instanceof Array) {
                let shapes = args[0];
                if (shapes.length == 0)
                    return;

                // TODO: more strict validation:
                // there may be only one line
                // only first and last may be rays
                let validShapes = shapes.every((shape) => {
                    return shape instanceof Flatten.Segment ||
                        shape instanceof Flatten.Arc ||
                        shape instanceof Flatten.Ray ||
                        shape instanceof Flatten.Line
                });

                for (let shape of shapes) {
                    let edge = new Flatten.Edge(shape);
                    this.append(edge);
                }
            }
        }
    }

    /**
     * (Getter) Return array of edges
     * @returns {Edge[]}
     */
    get edges() {
        return [...this];
    }

    /**
     * (Getter) Return bounding box of the multiline
     * @returns {Box}
     */
    get box() {
        return this.edges.reduce( (acc,edge) => acc = acc.merge(edge.box), new Flatten.Box() );
    }

    /**
     * (Getter) Returns array of vertices
     * @returns {Point[]}
     */
    get vertices() {
        let v = this.edges.map(edge => edge.start);
        v.push(this.last.end);
        return v;
    }

    /**
     * Return new cloned instance of Multiline
     * @returns {Multiline}
     */
    clone() {
        return new Multiline(this.toShapes());
    }

    /**
     * Split edge and add new vertex, return new edge inserted
     * @param {Point} pt - point on edge that will be added as new vertex
     * @param {Edge} edge - edge to split
     * @returns {Edge}
     */
    addVertex(pt, edge) {
        let shapes = edge.shape.split(pt);
        // if (shapes.length < 2) return;

        if (shapes[0] === null)   // point incident to edge start vertex, return previous edge
           return edge.prev;

        if (shapes[1] === null)   // point incident to edge end vertex, return edge itself
           return edge;

        let newEdge = new Flatten.Edge(shapes[0]);
        let edgeBefore = edge.prev;

        /* Insert first split edge into linked list after edgeBefore */
        this.insert(newEdge, edgeBefore);     // edge.face ?

        // Update edge shape with second split edge keeping links
        edge.shape = shapes[1];

        return newEdge;
    }

    /**
     * Split edges of multiline with intersection points and return mutated multiline
     * @param {Point[]} ip - array of points to be added as new vertices
     * @returns {Multiline}
     */
    split(ip) {
        for (let pt of ip) {
            let edge = this.findEdgeByPoint(pt);
            this.addVertex(pt, edge);
        }
        return this;
    }

    /**
     * Returns edge which contains given point
     * @param {Point} pt
     * @returns {Edge}
     */
    findEdgeByPoint(pt) {
        let edgeFound;
        for (let edge of this) {
            if (edge.shape.contains(pt)) {
                edgeFound = edge;
                break;
            }
        }
        return edgeFound;
    }

    /**
     * Returns new multiline translated by vector vec
     * @param {Vector} vec
     * @returns {Multiline}
     */
    translate(vec) {
        return new Multiline(this.edges.map( edge => edge.shape.translate(vec)));
    }

    /**
     * Return new multiline rotated by given angle around given point
     * If point omitted, rotate around origin (0,0)
     * Positive value of angle defines rotation counter clockwise, negative - clockwise
     * @param {number} angle - rotation angle in radians
     * @param {Point} center - rotation center, default is (0,0)
     * @returns {Multiline} - new rotated polygon
     */
    rotate(angle = 0, center = new Flatten.Point()) {
        return new Multiline(this.edges.map( edge => edge.shape.rotate(angle, center) ));
    }

    /**
     * Return new multiline transformed using affine transformation matrix
     * Method does not support unbounded shapes
     * @param {Matrix} matrix - affine transformation matrix
     * @returns {Multiline} - new multiline
     */
    transform(matrix = new Flatten.Matrix()) {
        return new Multiline(this.edges.map( edge => edge.shape.transform(matrix)));
    }

    /**
     * Transform multiline into array of shapes
     * @returns {Shape[]}
     */
    toShapes() {
        return this.edges.map(edge => edge.shape.clone())
    }

    /**
     * This method returns an object that defines how data will be
     * serialized when called JSON.stringify() method
     * @returns {Object}
     */
    toJSON() {
        return this.edges.map(edge => edge.toJSON());
    }

    /**
     * Return string to draw multiline in svg
     * @param attrs  - an object with attributes for svg path element,
     * like "stroke", "strokeWidth", "fill", "fillRule", "fillOpacity"
     * Defaults are stroke:"black", strokeWidth:"1", fill:"lightcyan", fillRule:"evenodd", fillOpacity: "1"
     * TODO: support infinite Ray and Line
     * @returns {string}
     */
    svg(attrs = {}) {
        let {stroke, strokeWidth, fill, fillRule, fillOpacity, id, className} = attrs;
        let id_str = (id && id.length > 0) ? `id="${id}"` : "";
        let class_str = (className && className.length > 0) ? `class="${className}"` : "";

        let svgStr = `\n<path stroke="${stroke || "black"}" stroke-width="${strokeWidth || 1}" fill="${fill || "lightcyan"}" fill-rule="${fillRule || "evenodd"}" fill-opacity="${fillOpacity || 1.0}" ${id_str} ${class_str} d="`;
        svgStr += `\nM${this.first.start.x},${this.first.start.y}`;
        for (let edge of this) {
            svgStr += edge.svg();
        }
        svgStr += ` z`;
        svgStr += `" >\n</path>`;

        return svgStr;
    }
}

Flatten.Multiline = Multiline;

/**
 * Shortcut function to create multiline
 * @param args
 */
const multiline = (...args) => new Flatten.Multiline(...args);
Flatten.multiline = multiline;

/**
 * @module RayShoot
 */

/**
 * Implements ray shooting algorithm. Returns relation between point and polygon: inside, outside or boundary
 * @param {Polgon} polygon - polygon to test
 * @param {Point} point - point to test
 * @returns {Flatten.Inside|Flatten.OUTSIDE|Flatten.Boundary}
 */
function ray_shoot(polygon, point) {
    let contains = undefined;

    // 1. Quick reject
    // if (polygon.box.not_intersect(point.box)) {
    //     return Flatten.OUTSIDE;
    // }

    let ray = new Flatten.Ray(point);
    let line = new Flatten.Line(ray.pt, ray.norm);

    // 2. Locate relevant edges of the polygon
    const searchBox = new Flatten.Box(
        ray.box.xmin-Flatten.DP_TOL, ray.box.ymin-Flatten.DP_TOL,
        ray.box.xmax, ray.box.ymax+Flatten.DP_TOL
    );

    if (polygon.box.not_intersect(searchBox)) {
        return Flatten.OUTSIDE;
    }

    let resp_edges = polygon.edges.search(searchBox);

    if (resp_edges.length == 0) {
        return Flatten.OUTSIDE;
    }

    // 2.5 Check if boundary
    for (let edge of resp_edges) {
        if (edge.shape.contains(point)) {
            return Flatten.BOUNDARY;
        }
    }

    // 3. Calculate intersections
    let intersections = [];
    for (let edge of resp_edges) {
        for (let ip of ray.intersect(edge.shape)) {

            // If intersection is equal to query point then point lays on boundary
            if (ip.equalTo(point)) {
                return Flatten.BOUNDARY;
            }

            intersections.push({
                pt: ip,
                edge: edge
            });
        }
    }

    // 4. Sort intersection in x-ascending order
    intersections.sort((i1, i2) => {
        if (LT(i1.pt.x, i2.pt.x)) {
            return -1;
        }
        if (GT(i1.pt.x, i2.pt.x)) {
            return 1;
        }
        return 0;
    });

    // 5. Count real intersections, exclude touching
    let counter = 0;

    for (let i = 0; i < intersections.length; i++) {
        let intersection = intersections[i];
        if (intersection.pt.equalTo(intersection.edge.shape.start)) {
            /* skip same point between same edges if already counted */
            if (i > 0 && intersection.pt.equalTo(intersections[i - 1].pt) &&
                intersection.edge.prev === intersections[i - 1].edge) {
                continue;
            }
            let prev_edge = intersection.edge.prev;
            while (EQ_0(prev_edge.length)) {
                prev_edge = prev_edge.prev;
            }
            let prev_tangent = prev_edge.shape.tangentInEnd();
            let prev_point = intersection.pt.translate(prev_tangent);

            let cur_tangent = intersection.edge.shape.tangentInStart();
            let cur_point = intersection.pt.translate(cur_tangent);

            let prev_on_the_left = prev_point.leftTo(line);
            let cur_on_the_left = cur_point.leftTo(line);

            if ((prev_on_the_left && !cur_on_the_left) || (!prev_on_the_left && cur_on_the_left)) {
                counter++;
            }
        } else if (intersection.pt.equalTo(intersection.edge.shape.end)) {
            /* skip same point between same edges if already counted */
            if (i > 0 && intersection.pt.equalTo(intersections[i - 1].pt) &&
                intersection.edge.next === intersections[i - 1].edge) {
                continue;
            }
            let next_edge = intersection.edge.next;
            while (EQ_0(next_edge.length)) {
                next_edge = next_edge.next;
            }
            let next_tangent = next_edge.shape.tangentInStart();
            let next_point = intersection.pt.translate(next_tangent);

            let cur_tangent = intersection.edge.shape.tangentInEnd();
            let cur_point = intersection.pt.translate(cur_tangent);

            let next_on_the_left = next_point.leftTo(line);
            let cur_on_the_left = cur_point.leftTo(line);

            if ((next_on_the_left && !cur_on_the_left) || (!next_on_the_left && cur_on_the_left)) {
                counter++;
            }
        } else {        /* intersection point is not a coincident with a vertex */
            if (intersection.edge.shape instanceof Flatten.Segment) {
                counter++;
            } else {
                /* Check if ray does not touch the curve in the extremal (top or bottom) point */
                let box = intersection.edge.shape.box;
                if (!(EQ(intersection.pt.y, box.ymin) ||
                    EQ(intersection.pt.y, box.ymax))) {
                    counter++;
                }
            }
        }
    }

    // 6. Odd or even?
    contains = counter % 2 == 1 ? Flatten.INSIDE : Flatten.OUTSIDE;

    return contains;
}

/*
    Calculate relationship between two shapes and return result in the form of
    Dimensionally Extended nine-Intersection Matrix (https://en.wikipedia.org/wiki/DE-9IM)
 */

/**
 * Returns true if shapes are topologically equal:  their interiors intersect and
 * no part of the interior or boundary of one geometry intersects the exterior of the other
 * @param shape1
 * @param shape2
 * @returns {boolean}
 */
function equal(shape1, shape2) {
    return relate(shape1, shape2).equal();
}

/**
 * Returns true if shapes have at least one point in common, same as "not disjoint"
 * @param shape1
 * @param shape2
 * @returns {boolean}
 */
function intersect$1(shape1, shape2) {
    return relate(shape1, shape2).intersect();
}

/**
 * Returns true if shapes have at least one point in common, but their interiors do not intersect
 * @param shape1
 * @param shape2
 * @returns {boolean}
 */
function touch(shape1, shape2) {
    return relate(shape1, shape2).touch();
}

/**
 * Returns true if shapes have no points in common neither in interior nor in boundary
 * @param shape1
 * @param shape2
 * @returns {boolean}
 */
function disjoint(shape1, shape2) {
    return !intersect$1(shape1, shape2);
}

/**
 * Returns true shape1 lies in the interior of shape2
 * @param shape1
 * @param shape2
 * @returns {boolean}
 */
function inside(shape1, shape2) {
    return relate(shape1, shape2).inside();
}

/**
 * Returns true if every point in shape1 lies in the interior or on the boundary of shape2
 * @param shape1
 * @param shape2
 * @returns {boolean}
 */
function covered(shape1, shape2) {
    return  relate(shape1, shape2).covered();
}

/**
 * Returns true shape1's interior contains shape2 <br/>
 * Same as inside(shape2, shape1)
 * @param shape1
 * @param shape2
 * @returns {boolean}
 */
function contain(shape1, shape2) {
    return inside(shape2, shape1);
}

/**
 * Returns true shape1's cover shape2, same as shape2 covered by shape1
 * @param shape1
 * @param shape2
 * @returns {boolean}
 */
function cover(shape1, shape2) {
    return covered(shape2, shape1);
}

/**
 * Returns relation between two shapes as intersection 3x3 matrix, where each
 * element contains relevant intersection as array of shapes.
 * If there is no intersection, element contains empty array
 * If intersection is irrelevant it left undefined. (For example, intersection
 * between two exteriors is usually irrelevant)
 * @param shape1
 * @param shape2
 * @returns {DE9IM}
 */
function relate(shape1, shape2) {
    if (shape1 instanceof Flatten.Line && shape2 instanceof Flatten.Line) {
        return relateLine2Line(shape1,  shape2);
    }
    else if (shape1 instanceof Flatten.Line && shape2 instanceof Flatten.Circle) {
        return relateLine2Circle(shape1, shape2);
    }
    else if (shape1 instanceof Flatten.Line && shape2 instanceof Flatten.Box) {
        return relateLine2Box(shape1, shape2);
    }
    else if ( shape1 instanceof Flatten.Line  && shape2 instanceof Flatten.Polygon) {
        return relateLine2Polygon(shape1, shape2);
    }
    else if ( (shape1 instanceof Flatten.Segment || shape1 instanceof Flatten.Arc)  && shape2 instanceof Flatten.Polygon) {
        return relateShape2Polygon(shape1, shape2);
    }
    else if ( (shape1 instanceof Flatten.Segment || shape1 instanceof Flatten.Arc)  &&
        (shape2 instanceof Flatten.Circle || shape2 instanceof Flatten.Box) ) {
        return relateShape2Polygon(shape1, new Flatten.Polygon(shape2));
    }
    else if (shape1 instanceof Flatten.Polygon && shape2 instanceof Flatten.Polygon) {
        return relatePolygon2Polygon(shape1, shape2);
    }
    else if ((shape1 instanceof Flatten.Circle || shape1 instanceof Flatten.Box) &&
        (shape2 instanceof  Flatten.Circle || shape2 instanceof Flatten.Box)) {
        return relatePolygon2Polygon(new Flatten.Polygon(shape1), new Flatten.Polygon(shape2));
    }
    else if ((shape1 instanceof Flatten.Circle || shape1 instanceof Flatten.Box) && shape2 instanceof Flatten.Polygon) {
        return relatePolygon2Polygon(new Flatten.Polygon(shape1), shape2);
    }
    else if (shape1 instanceof Flatten.Polygon && (shape2 instanceof Flatten.Circle || shape2 instanceof Flatten.Box)) {
        return relatePolygon2Polygon(shape1, new Flatten.Polygon(shape2));
    }
}

function relateLine2Line(line1, line2) {
    let denim = new DE9IM();
    let ip = intersectLine2Line(line1, line2);
    if (ip.length === 0) {       // parallel or equal ?
        if (line1.contains(line2.pt) && line2.contains(line1.pt)) {
            denim.I2I = [line1];   // equal  'T.F...F..'  - no boundary
            denim.I2E = [];
            denim.E2I = [];
        }
        else {                     // parallel - disjoint 'FFTFF*T**'
            denim.I2I = [];
            denim.I2E = [line1];
            denim.E2I = [line2];
        }
    }
    else {                       // intersect   'T********'
        denim.I2I = ip;
        denim.I2E = line1.split(ip);
        denim.E2I = line2.split(ip);
    }
    return denim;
}

function relateLine2Circle(line,circle) {
    let denim = new DE9IM();
    let ip = intersectLine2Circle(line, circle);
    if (ip.length === 0) {
        denim.I2I = [];
        denim.I2B = [];
        denim.I2E = [line];
        denim.E2I = [circle];
    }
    else if (ip.length === 1) {
        denim.I2I = [];
        denim.I2B = ip;
        denim.I2E = line.split(ip);

        denim.E2I = [circle];
    }
    else {       // ip.length == 2
        let multiline = new Multiline([line]);
        let ip_sorted = line.sortPoints(ip);
        multiline.split(ip_sorted);
        let splitShapes = multiline.toShapes();

        denim.I2I = [splitShapes[1]];
        denim.I2B = ip_sorted;
        denim.I2E = [splitShapes[0], splitShapes[2]];

        denim.E2I = new Flatten.Polygon([circle.toArc()]).cut(multiline);
    }

    return denim;
}

function relateLine2Box(line, box) {
    let denim = new DE9IM();
    let ip = intersectLine2Box(line, box);
    if (ip.length === 0) {
        denim.I2I = [];
        denim.I2B = [];
        denim.I2E = [line];

        denim.E2I = [box];
    }
    else if (ip.length === 1) {
        denim.I2I = [];
        denim.I2B = ip;
        denim.I2E = line.split(ip);

        denim.E2I = [box];
    }
    else {                     // ip.length == 2
        let multiline = new Multiline([line]);
        let ip_sorted = line.sortPoints(ip);
        multiline.split(ip_sorted);
        let splitShapes = multiline.toShapes();

        /* Are two intersection points on the same segment of the box boundary ? */
        if (box.toSegments().some( segment => segment.contains(ip[0]) && segment.contains(ip[1]) )) {
            denim.I2I = [];                         // case of touching
            denim.I2B = [splitShapes[1]];
            denim.I2E = [splitShapes[0], splitShapes[2]];

            denim.E2I = [box];
        }
        else {                                       // case of intersection
            denim.I2I = [splitShapes[1]];            // [segment(ip[0], ip[1])];
            denim.I2B = ip_sorted;
            denim.I2E = [splitShapes[0], splitShapes[2]];

            denim.E2I = new Flatten.Polygon(box.toSegments()).cut(multiline);
        }
    }
    return denim;
}

function relateLine2Polygon(line, polygon) {
    let denim = new DE9IM();
    let ip = intersectLine2Polygon(line, polygon);
    let multiline = new Multiline([line]);
    let ip_sorted = ip.length > 0 ? ip.slice() : line.sortPoints(ip);

    multiline.split(ip_sorted);

    [...multiline].forEach(edge => edge.setInclusion(polygon));

    denim.I2I = [...multiline].filter(edge => edge.bv === Flatten.INSIDE).map(edge => edge.shape);
    denim.I2B = [...multiline].slice(1).map( (edge) => edge.bv === Flatten.BOUNDARY ? edge.shape : edge.shape.start );
    denim.I2E = [...multiline].filter(edge => edge.bv === Flatten.OUTSIDE).map(edge => edge.shape);

    denim.E2I = polygon.cut(multiline);

    return denim;
}

function relateShape2Polygon(shape, polygon) {
    let denim = new DE9IM();
    let ip = intersectShape2Polygon(shape, polygon);
    let ip_sorted = ip.length > 0 ? ip.slice() : shape.sortPoints(ip);

    let multiline = new Multiline([shape]);
    multiline.split(ip_sorted);

    [...multiline].forEach(edge => edge.setInclusion(polygon));

    denim.I2I = [...multiline].filter(edge => edge.bv === Flatten.INSIDE).map(edge => edge.shape);
    denim.I2B = [...multiline].slice(1).map( (edge) => edge.bv === Flatten.BOUNDARY ? edge.shape : edge.shape.start );
    denim.I2E = [...multiline].filter(edge => edge.bv === Flatten.OUTSIDE).map(edge => edge.shape);


    denim.B2I = [];
    denim.B2B = [];
    denim.B2E = [];
    for (let pt of [shape.start, shape.end]) {
        switch (ray_shoot(polygon, pt)) {
            case Flatten.INSIDE:
                denim.B2I.push(pt);
                break;
            case Flatten.BOUNDARY:
                denim.B2B.push(pt);
                break;
            case Flatten.OUTSIDE:
                denim.B2E.push(pt);
                break;
            default:
                break;
        }
    }

    // denim.E2I  TODO: calculate, not clear what is expected result

    return denim;
}

function relatePolygon2Polygon(polygon1, polygon2) {
    let denim = new DE9IM();

    let [ip_sorted1, ip_sorted2] = calculateIntersections(polygon1, polygon2);
    let boolean_intersection = intersect(polygon1, polygon2);
    let boolean_difference1 = subtract(polygon1, polygon2);
    let boolean_difference2 = subtract(polygon2, polygon1);
    let [inner_clip_shapes1, inner_clip_shapes2] = innerClip(polygon1, polygon2);
    let outer_clip_shapes1 = outerClip(polygon1, polygon2);
    let outer_clip_shapes2 = outerClip(polygon2, polygon1);

    denim.I2I = boolean_intersection.isEmpty() ? [] : [boolean_intersection];
    denim.I2B = inner_clip_shapes2;
    denim.I2E = boolean_difference1.isEmpty() ? [] : [boolean_difference1];

    denim.B2I = inner_clip_shapes1;
    denim.B2B = ip_sorted1;
    denim.B2E = outer_clip_shapes1;

    denim.E2I = boolean_difference2.isEmpty() ? [] : [boolean_difference2];
    denim.E2B = outer_clip_shapes2;
    // denim.E2E    not relevant meanwhile

    return denim;
}

var Relations = /*#__PURE__*/Object.freeze({
    equal: equal,
    intersect: intersect$1,
    touch: touch,
    disjoint: disjoint,
    inside: inside,
    covered: covered,
    contain: contain,
    cover: cover,
    relate: relate
});

/**
 * Class representing an affine transformation 3x3 matrix:
 * <pre>
 *      [ a  c  tx
 * A =    b  d  ty
 *        0  0  1  ]
 * </pre
 * @type {Matrix}
 */
class Matrix {
    /**
     * Construct new instance of affine transformation matrix <br/>
     * If parameters omitted, construct identity matrix a = 1, d = 1
     * @param {number} a - position(0,0)   sx*cos(alpha)
     * @param {number} b - position (0,1)  sx*sin(alpha)
     * @param {number} c - position (1,0)  -sy*sin(alpha)
     * @param {number} d - position (1,1)  sy*cos(alpha)
     * @param {number} tx - position (2,0) translation by x
     * @param {number} ty - position (2,1) translation by y
     */
    constructor(a = 1, b = 0, c = 0, d = 1, tx = 0, ty = 0) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.tx = tx;
        this.ty = ty;
    }

    /**
     * Return new cloned instance of matrix
     * @return {Matrix}
     **/
    clone() {
        return new Matrix(this.a, this.b, this.c, this.d, this.tx, this.ty);
    };

    /**
     * Transform vector [x,y] using transformation matrix. <br/>
     * Vector [x,y] is an abstract array[2] of numbers and not a FlattenJS object <br/>
     * The result is also an abstract vector [x',y'] = A * [x,y]:
     * <code>
     * [x'       [ ax + by + tx
     *  y'   =     cx + dy + ty
     *  1]                    1 ]
     * </code>
     * @param {number[]} vector - array[2] of numbers
     * @returns {number[]} transformation result - array[2] of numbers
     */
    transform(vector) {
        return [
            vector[0] * this.a + vector[1] * this.c + this.tx,
            vector[0] * this.b + vector[1] * this.d + this.ty
        ]
    };

    /**
     * Returns result of multiplication of this matrix by other matrix
     * @param {Matrix} other_matrix - matrix to multiply by
     * @returns {Matrix}
     */
    multiply(other_matrix) {
        return new Matrix(
            this.a * other_matrix.a + this.c * other_matrix.b,
            this.b * other_matrix.a + this.d * other_matrix.b,
            this.a * other_matrix.c + this.c * other_matrix.d,
            this.b * other_matrix.c + this.d * other_matrix.d,
            this.a * other_matrix.tx + this.c * other_matrix.ty + this.tx,
            this.b * other_matrix.tx + this.d * other_matrix.ty + this.ty
        )
    };

    /**
     * Return new matrix as a result of multiplication of the current matrix
     * by the matrix(1,0,0,1,tx,ty)
     * @param {number} tx - translation by x
     * @param {number} ty - translation by y
     * @returns {Matrix}
     */
    translate(...args) {
        let tx, ty;
        if (args.length == 1 && (args[0] instanceof Flatten.Vector)) {
            tx = args[0].x;
            ty = args[0].y;
        } else if (args.length == 2 && typeof (args[0]) == "number" && typeof (args[1]) == "number") {
            tx = args[0];
            ty = args[1];
        } else {
            throw Flatten.Errors.ILLEGAL_PARAMETERS;
        }
        return this.multiply(new Matrix(1, 0, 0, 1, tx, ty))
    };

    /**
     * Return new matrix as a result of multiplication of the current matrix
     * by the matrix that defines rotation by given angle (in radians) around
     * point (0,0) in counter clockwise direction
     * @param {number} angle - angle in radians
     * @returns {Matrix}
     */
    rotate(angle) {
        let cos = Math.cos(angle);
        let sin = Math.sin(angle);
        return this.multiply(new Matrix(cos, sin, -sin, cos, 0, 0));
    };

    /**
     * Return new matrix as a result of multiplication of the current matrix
     * by the matrix (sx,0,0,sy,0,0) that defines scaling
     * @param {number} sx
     * @param {number} sy
     * @returns {Matrix}
     */
    scale(sx, sy) {
        return this.multiply(new Matrix(sx, 0, 0, sy, 0, 0));
    };

    /**
     * Returns true if two matrix are equal parameter by parameter
     * @param {Matrix} matrix - other matrix
     * @returns {boolean} true if equal, false otherwise
     */
    equalTo(matrix) {
        if (!Flatten.Utils.EQ(this.tx, matrix.tx)) return false;
        if (!Flatten.Utils.EQ(this.ty, matrix.ty)) return false;
        if (!Flatten.Utils.EQ(this.a, matrix.a)) return false;
        if (!Flatten.Utils.EQ(this.b, matrix.b)) return false;
        if (!Flatten.Utils.EQ(this.c, matrix.c)) return false;
        if (!Flatten.Utils.EQ(this.d, matrix.d)) return false;
        return true;
    };
}
Flatten.Matrix = Matrix;
/**
 * Function to create matrix equivalent to "new" constructor
 * @param args
 */
const matrix = (...args) => new Flatten.Matrix(...args);
Flatten.matrix = matrix;

/**
 * Created by Alex Bol on 4/1/2017.
 */

/**
 * Interval is a pair of numbers or a pair of any comparable objects on which may be defined predicates
 * *equal*, *less* and method *max(p1, p1)* that returns maximum in a pair.
 * When interval is an object rather than pair of numbers, this object should have properties *low*, *high*, *max*
 * and implement methods *less_than(), equal_to(), intersect(), not_intersect(), clone(), output()*.
 * Two static methods *comparable_max(), comparable_less_than()* define how to compare values in pair. <br/>
 * This interface is described in typescript definition file *index.d.ts*
 *
 * Axis aligned rectangle is an example of such interval.
 * We may look at rectangle as an interval between its low left and top right corners.
 * See **Box** class in [flatten-js](https://github.com/alexbol99/flatten-js) library as the example
 * of Interval interface implementation
 * @type {Interval}
 */
const Interval = class Interval {
    /**
     * Accept two comparable values and creates new instance of interval
     * Predicate Interval.comparable_less(low, high) supposed to return true on these values
     * @param low
     * @param high
     */
    constructor(low, high) {
        this.low = low;
        this.high = high;
    }

    /**
     * Clone interval
     * @returns {Interval}
     */
    clone() {
        return new Interval(this.low, this.high);
    }

    /**
     * Propery max returns clone of this interval
     * @returns {Interval}
     */
    get max() {
        return this.clone();   // this.high;
    }

    /**
     * Predicate returns true is this interval less than other interval
     * @param other_interval
     * @returns {boolean}
     */
    less_than(other_interval) {
        return this.low < other_interval.low ||
            this.low == other_interval.low && this.high < other_interval.high;
    }

    /**
     * Predicate returns true is this interval equals to other interval
     * @param other_interval
     * @returns {boolean}
     */
    equal_to(other_interval) {
        return this.low == other_interval.low && this.high == other_interval.high;
    }

    /**
     * Predicate returns true if this interval intersects other interval
     * @param other_interval
     * @returns {boolean}
     */
    intersect(other_interval) {
        return !this.not_intersect(other_interval);
    }

    /**
     * Predicate returns true if this interval does not intersect other interval
     * @param other_interval
     * @returns {boolean}
     */
    not_intersect(other_interval) {
        return (this.high < other_interval.low || other_interval.high < this.low);
    }

    /**
     * Returns new interval merged with other interval
     * @param {Interval} interval - Other interval to merge with
     * @returns {Interval}
     */
    merge(other_interval) {
        return new Interval(
            this.low === undefined ? other_interval.low : Math.min(this.low, other_interval.low),
            this.high === undefined ? other_interval.high : Math.max(this.high, other_interval.high)
        );
    }

    /**
     * Returns how key should return
     */
    output() {
        return [this.low, this.high];
    }

    /**
     * Function returns maximum between two comparable values
     * @param interval1
     * @param interval2
     * @returns {Interval}
     */
    static comparable_max(interval1, interval2) {
        return interval1.merge(interval2);
    }

    /**
     * Predicate returns true if first value less than second value
     * @param val1
     * @param val2
     * @returns {boolean}
     */
    static comparable_less_than(val1, val2 ) {
        return val1 < val2;
    }
};

/**
 * Created by Alex Bol on 3/28/2017.
 */

// module.exports = {
//     RB_TREE_COLOR_RED: 0,
//     RB_TREE_COLOR_BLACK: 1
// };

const RB_TREE_COLOR_RED = 0;
const RB_TREE_COLOR_BLACK = 1;

/**
 * Created by Alex Bol on 4/1/2017.
 */

class Node {
    constructor(key = undefined, value = undefined,
                left = null, right = null, parent = null, color = RB_TREE_COLOR_BLACK) {
        this.left = left;                     // reference to left child node
        this.right = right;                   // reference to right child node
        this.parent = parent;                 // reference to parent node
        this.color = color;

        this.item = {key: key, value: value};   // key is supposed to be instance of Interval

        /* If not, this should by an array of two numbers */
        if (key && key instanceof Array && key.length == 2) {
            if (!Number.isNaN(key[0]) && !Number.isNaN(key[1])) {
                this.item.key = new Interval(Math.min(key[0], key[1]), Math.max(key[0], key[1]));
            }
        }

        this.max = this.item.key ? this.item.key.max : undefined;
    }

    isNil() {
        return (this.item.key === undefined && this.item.value === undefined &&
            this.left === null && this.right === null && this.color === RB_TREE_COLOR_BLACK);
    }

    less_than(other_node) {
        // if tree stores only keys
        if (this.item.value === this.item.key && other_node.item.value === other_node.item.key) {
            return this.item.key.less_than(other_node.item.key);
        }
        else {    // if tree stores keys and values
            let value_less_than = this.item.value && other_node.item.value && this.item.value.less_than ? this.item.value.less_than(other_node.item.value) :
                this.item.value < other_node.item.value;
            return this.item.key.less_than(other_node.item.key) ||
                this.item.key.equal_to((other_node.item.key)) && value_less_than;
        }

        // if (this.item.value && other_node.item.value) {
        //     let item_less_than = this.item.value.less_than ? this.item.value.less_than(other_node.item.value) :
        //         this.item.value < other_node.item.value;
        //     return this.item.key.less_than(other_node.item.key) ||
        //         this.item.key.equal_to((other_node.item.key)) && item_less_than;
        // }
        // else {
        //     return this.item.key.less_than(other_node.item.key);
        // }
    }

    equal_to(other_node) {
        // if tree stores only keys
        if (this.item.value === this.item.key && other_node.item.value === other_node.item.key) {
            return this.item.key.equal_to(other_node.item.key);
        }
        else {    // if tree stores keys and values
            let value_equal = this.item.value && other_node.item.value && this.item.value.equal_to ? this.item.value.equal_to(other_node.item.value) :
                this.item.value == other_node.item.value;
            return this.item.key.equal_to(other_node.item.key) && value_equal;
        }

        // let value_equal = true;
        // if (this.item.value && other_node.item.value) {
        //     value_equal = this.item.value.equal_to ? this.item.value.equal_to(other_node.item.value) :
        //         this.item.value == other_node.item.value;
        // }
        // return this.item.key.equal_to(other_node.item.key) && value_equal;
    }

    intersect(other_node) {
        return this.item.key.intersect(other_node.item.key);
    }

    copy_data(other_node) {
        this.item.key = other_node.item.key.clone();
        this.item.value = other_node.item.value && other_node.item.value.clone ? other_node.item.value.clone() : other_node.item.value;
    }

    update_max() {
        // use key (Interval) max property instead of key.high
        this.max = this.item.key ? this.item.key.max : undefined;
        if (this.right && this.right.max) {
            const comparable_max = this.item.key.constructor.comparable_max;  // static method
            this.max = comparable_max(this.max, this.right.max);
        }
        if (this.left && this.left.max) {
            const comparable_max = this.item.key.constructor.comparable_max;  // static method
            this.max = comparable_max(this.max, this.left.max);
        }
    }

    // Other_node does not intersect any node of left subtree, if this.left.max < other_node.item.key.low
    not_intersect_left_subtree(search_node) {
        const comparable_less_than = this.item.key.constructor.comparable_less_than;  // static method
        let high = this.left.max.high !== undefined ? this.left.max.high : this.left.max;
        return comparable_less_than(high, search_node.item.key.low);
    }

    // Other_node does not intersect right subtree if other_node.item.key.high < this.right.key.low
    not_intersect_right_subtree(search_node) {
        const comparable_less_than = this.item.key.constructor.comparable_less_than;  // static method
        let low = this.right.max.low !== undefined ? this.right.max.low : this.right.item.key.low;
        return comparable_less_than(search_node.item.key.high, low);
    }
}

/**
 * Created by Alex Bol on 3/31/2017.
 */

// const nil_node = new Node();

/**
 * Implementation of interval binary search tree <br/>
 * Interval tree stores items which are couples of {key:interval, value: value} <br/>
 * Interval is an object with high and low properties or simply pair [low,high] of numeric values <br />
 * @type {IntervalTree}
 */
class IntervalTree {
    /**
     * Construct new empty instance of IntervalTree
     */
    constructor() {
        this.root = null;
        this.nil_node = new Node();
    }

    /**
     * Returns number of items stored in the interval tree
     * @returns {number}
     */
    get size() {
        let count = 0;
        this.tree_walk(this.root, () => count++);
        return count;
    }

    /**
     * Returns array of sorted keys in the ascending order
     * @returns {Array}
     */
    get keys() {
        let res = [];
        this.tree_walk(this.root, (node) => res.push(
            node.item.key.output ? node.item.key.output() : node.item.key
        ));
        return res;
    }

    /**
     * Return array of values in the ascending keys order
     * @returns {Array}
     */
    get values() {
        let res = [];
        this.tree_walk(this.root, (node) => res.push(node.item.value));
        return res;
    }

    /**
     * Returns array of items (<key,value> pairs) in the ascended keys order
     * @returns {Array}
     */
    get items() {
        let res = [];
        this.tree_walk(this.root, (node) => res.push({
            key: node.item.key.output ? node.item.key.output() : node.item.key,
            value: node.item.value
        }));
        return res;
    }

    /**
     * Returns true if tree is empty
     * @returns {boolean}
     */
    isEmpty() {
        return (this.root == null || this.root == this.nil_node);
    }

    /**
     * Insert new item into interval tree
     * @param {Interval} key - interval object or array of two numbers [low, high]
     * @param {any} value - value representing any object (optional)
     * @returns {Node} returns reference to inserted node as an object {key:interval, value: value}
     */
    insert(key, value = key) {
        if (key === undefined) return;
        let insert_node = new Node(key, value, this.nil_node, this.nil_node, null, RB_TREE_COLOR_RED);
        this.tree_insert(insert_node);
        this.recalc_max(insert_node);
        return insert_node;
    }

    /**
     * Returns true if item {key,value} exist in the tree
     * @param {Interval} key - interval correspondent to keys stored in the tree
     * @param {any} value - value object to be checked
     * @returns {boolean} true if item {key, value} exist in the tree, false otherwise
     */
    exist(key, value = key) {
        let search_node = new Node(key, value);
        return this.tree_search(this.root, search_node) ? true : false;
    }

    /**
     * Remove entry {key, value} from the tree
     * @param {Interval} key - interval correspondent to keys stored in the tree
     * @param {any} value - value object
     * @returns {boolean} true if item {key, value} deleted, false if not found
     */
    remove(key, value = key) {
        let search_node = new Node(key, value);
        let delete_node = this.tree_search(this.root, search_node);
        if (delete_node) {
            this.tree_delete(delete_node);
        }
        return delete_node;
    }

    /**
     * Returns array of entry values which keys intersect with given interval <br/>
     * If no values stored in the tree, returns array of keys which intersect given interval
     * @param {Interval} interval - search interval, or array [low, high]
     * @param outputMapperFn(value,key) - optional function that maps (value, key) to custom output
     * @returns {Array}
     */
    search(interval, outputMapperFn = (value, key) => value === key ? key.output() : value) {
        let search_node = new Node(interval);
        let resp_nodes = [];
        this.tree_search_interval(this.root, search_node, resp_nodes);
        return resp_nodes.map(node => outputMapperFn(node.item.value, node.item.key))
    }

    /**
     * Tree visitor. For each node implement a callback function. <br/>
     * Method calls a callback function with two parameters (key, value)
     * @param visitor(key,value) - function to be called for each tree item
     */
    forEach(visitor) {
        this.tree_walk(this.root, (node) => visitor(node.item.key, node.item.value));
    }

    /** Value Mapper. Walk through every node and map node value to another value
    * @param callback(value,key) - function to be called for each tree item
    */
    map(callback) {
        const tree = new IntervalTree();
        this.tree_walk(this.root, (node) => tree.insert(node.item.key, callback(node.item.value, node.item.key)));
        return tree;
    }

    recalc_max(node) {
        let node_current = node;
        while (node_current.parent != null) {
            node_current.parent.update_max();
            node_current = node_current.parent;
        }
    }

    tree_insert(insert_node) {
        let current_node = this.root;
        let parent_node = null;

        if (this.root == null || this.root == this.nil_node) {
            this.root = insert_node;
        }
        else {
            while (current_node != this.nil_node) {
                parent_node = current_node;
                if (insert_node.less_than(current_node)) {
                    current_node = current_node.left;
                }
                else {
                    current_node = current_node.right;
                }
            }

            insert_node.parent = parent_node;

            if (insert_node.less_than(parent_node)) {
                parent_node.left = insert_node;
            }
            else {
                parent_node.right = insert_node;
            }
        }

        this.insert_fixup(insert_node);
    }

// After insertion insert_node may have red-colored parent, and this is a single possible violation
// Go upwords to the root and re-color until violation will be resolved
    insert_fixup(insert_node) {
        let current_node;
        let uncle_node;

        current_node = insert_node;
        while (current_node != this.root && current_node.parent.color == RB_TREE_COLOR_RED) {
            if (current_node.parent == current_node.parent.parent.left) {   // parent is left child of grandfather
                uncle_node = current_node.parent.parent.right;              // right brother of parent
                if (uncle_node.color == RB_TREE_COLOR_RED) {             // Case 1. Uncle is red
                    // re-color father and uncle into black
                    current_node.parent.color = RB_TREE_COLOR_BLACK;
                    uncle_node.color = RB_TREE_COLOR_BLACK;
                    current_node.parent.parent.color = RB_TREE_COLOR_RED;
                    current_node = current_node.parent.parent;
                }
                else {                                                    // Case 2 & 3. Uncle is black
                    if (current_node == current_node.parent.right) {     // Case 2. Current if right child
                        // This case is transformed into Case 3.
                        current_node = current_node.parent;
                        this.rotate_left(current_node);
                    }
                    current_node.parent.color = RB_TREE_COLOR_BLACK;    // Case 3. Current is left child.
                    // Re-color father and grandfather, rotate grandfather right
                    current_node.parent.parent.color = RB_TREE_COLOR_RED;
                    this.rotate_right(current_node.parent.parent);
                }
            }
            else {                                                         // parent is right child of grandfather
                uncle_node = current_node.parent.parent.left;              // left brother of parent
                if (uncle_node.color == RB_TREE_COLOR_RED) {             // Case 4. Uncle is red
                    // re-color father and uncle into black
                    current_node.parent.color = RB_TREE_COLOR_BLACK;
                    uncle_node.color = RB_TREE_COLOR_BLACK;
                    current_node.parent.parent.color = RB_TREE_COLOR_RED;
                    current_node = current_node.parent.parent;
                }
                else {
                    if (current_node == current_node.parent.left) {             // Case 5. Current is left child
                        // Transform into case 6
                        current_node = current_node.parent;
                        this.rotate_right(current_node);
                    }
                    current_node.parent.color = RB_TREE_COLOR_BLACK;    // Case 6. Current is right child.
                    // Re-color father and grandfather, rotate grandfather left
                    current_node.parent.parent.color = RB_TREE_COLOR_RED;
                    this.rotate_left(current_node.parent.parent);
                }
            }
        }

        this.root.color = RB_TREE_COLOR_BLACK;
    }

    tree_delete(delete_node) {
        let cut_node;   // node to be cut - either delete_node or successor_node  ("y" from 14.4)
        let fix_node;   // node to fix rb tree property   ("x" from 14.4)

        if (delete_node.left == this.nil_node || delete_node.right == this.nil_node) {  // delete_node has less then 2 children
            cut_node = delete_node;
        }
        else {                                                    // delete_node has 2 children
            cut_node = this.tree_successor(delete_node);
        }

        // fix_node if single child of cut_node
        if (cut_node.left != this.nil_node) {
            fix_node = cut_node.left;
        }
        else {
            fix_node = cut_node.right;
        }

        // remove cut_node from parent
        /*if (fix_node != this.nil_node) {*/
            fix_node.parent = cut_node.parent;
        /*}*/

        if (cut_node == this.root) {
            this.root = fix_node;
        }
        else {
            if (cut_node == cut_node.parent.left) {
                cut_node.parent.left = fix_node;
            }
            else {
                cut_node.parent.right = fix_node;
            }
            cut_node.parent.update_max();        // update max property of the parent
        }

        this.recalc_max(fix_node);              // update max property upward from fix_node to root

        // COPY DATA !!!
        // Delete_node becomes cut_node, it means that we cannot hold reference
        // to node in outer structure and we will have to delete by key, additional search need
        if (cut_node != delete_node) {
            delete_node.copy_data(cut_node);
            delete_node.update_max();           // update max property of the cut node at the new place
            this.recalc_max(delete_node);       // update max property upward from delete_node to root
        }

        if (/*fix_node != this.nil_node && */cut_node.color == RB_TREE_COLOR_BLACK) {
            this.delete_fixup(fix_node);
        }
    }

    delete_fixup(fix_node) {
        let current_node = fix_node;
        let brother_node;

        while (current_node != this.root && current_node.parent != null && current_node.color == RB_TREE_COLOR_BLACK) {
            if (current_node == current_node.parent.left) {          // fix node is left child
                brother_node = current_node.parent.right;
                if (brother_node.color == RB_TREE_COLOR_RED) {   // Case 1. Brother is red
                    brother_node.color = RB_TREE_COLOR_BLACK;         // re-color brother
                    current_node.parent.color = RB_TREE_COLOR_RED;    // re-color father
                    this.rotate_left(current_node.parent);
                    brother_node = current_node.parent.right;                      // update brother
                }
                // Derive to cases 2..4: brother is black
                if (brother_node.left.color == RB_TREE_COLOR_BLACK &&
                    brother_node.right.color == RB_TREE_COLOR_BLACK) {  // case 2: both nephews black
                    brother_node.color = RB_TREE_COLOR_RED;              // re-color brother
                    current_node = current_node.parent;                  // continue iteration
                }
                else {
                    if (brother_node.right.color == RB_TREE_COLOR_BLACK) {   // case 3: left nephew red, right nephew black
                        brother_node.color = RB_TREE_COLOR_RED;          // re-color brother
                        brother_node.left.color = RB_TREE_COLOR_BLACK;   // re-color nephew
                        this.rotate_right(brother_node);
                        brother_node = current_node.parent.right;                     // update brother
                        // Derive to case 4: left nephew black, right nephew red
                    }
                    // case 4: left nephew black, right nephew red
                    brother_node.color = current_node.parent.color;
                    current_node.parent.color = RB_TREE_COLOR_BLACK;
                    brother_node.right.color = RB_TREE_COLOR_BLACK;
                    this.rotate_left(current_node.parent);
                    current_node = this.root;                         // exit from loop
                }
            }
            else {                                             // fix node is right child
                brother_node = current_node.parent.left;
                if (brother_node.color == RB_TREE_COLOR_RED) {   // Case 1. Brother is red
                    brother_node.color = RB_TREE_COLOR_BLACK;         // re-color brother
                    current_node.parent.color = RB_TREE_COLOR_RED;    // re-color father
                    this.rotate_right(current_node.parent);
                    brother_node = current_node.parent.left;                        // update brother
                }
                // Go to cases 2..4
                if (brother_node.left.color == RB_TREE_COLOR_BLACK &&
                    brother_node.right.color == RB_TREE_COLOR_BLACK) {   // case 2
                    brother_node.color = RB_TREE_COLOR_RED;             // re-color brother
                    current_node = current_node.parent;                              // continue iteration
                }
                else {
                    if (brother_node.left.color == RB_TREE_COLOR_BLACK) {  // case 3: right nephew red, left nephew black
                        brother_node.color = RB_TREE_COLOR_RED;            // re-color brother
                        brother_node.right.color = RB_TREE_COLOR_BLACK;    // re-color nephew
                        this.rotate_left(brother_node);
                        brother_node = current_node.parent.left;                        // update brother
                        // Derive to case 4: right nephew black, left nephew red
                    }
                    // case 4: right nephew black, left nephew red
                    brother_node.color = current_node.parent.color;
                    current_node.parent.color = RB_TREE_COLOR_BLACK;
                    brother_node.left.color = RB_TREE_COLOR_BLACK;
                    this.rotate_right(current_node.parent);
                    current_node = this.root;                               // force exit from loop
                }
            }
        }

        current_node.color = RB_TREE_COLOR_BLACK;
    }

    tree_search(node, search_node) {
        if (node == null || node == this.nil_node)
            return undefined;

        if (search_node.equal_to(node)) {
            return node;
        }
        if (search_node.less_than(node)) {
            return this.tree_search(node.left, search_node);
        }
        else {
            return this.tree_search(node.right, search_node);
        }
    }

    // Original search_interval method; container res support push() insertion
    // Search all intervals intersecting given one
    tree_search_interval(node, search_node, res) {
        if (node != null && node != this.nil_node) {
            // if (node->left != this.nil_node && node->left->max >= low) {
            if (node.left != this.nil_node && !node.not_intersect_left_subtree(search_node)) {
                this.tree_search_interval(node.left, search_node, res);
            }
            // if (low <= node->high && node->low <= high) {
            if (node.intersect(search_node)) {
                res.push(node);
            }
            // if (node->right != this.nil_node && node->low <= high) {
            if (node.right != this.nil_node && !node.not_intersect_right_subtree(search_node)) {
                this.tree_search_interval(node.right, search_node, res);
            }
        }
    }

    local_minimum(node) {
        let node_min = node;
        while (node_min.left != null && node_min.left != this.nil_node) {
            node_min = node_min.left;
        }
        return node_min;
    }

    // not in use
    local_maximum(node) {
        let node_max = node;
        while (node_max.right != null && node_max.right != this.nil_node) {
            node_max = node_max.right;
        }
        return node_max;
    }

    tree_successor(node) {
        let node_successor;
        let current_node;
        let parent_node;

        if (node.right != this.nil_node) {
            node_successor = this.local_minimum(node.right);
        }
        else {
            current_node = node;
            parent_node = node.parent;
            while (parent_node != null && parent_node.right == current_node) {
                current_node = parent_node;
                parent_node = parent_node.parent;
            }
            node_successor = parent_node;
        }
        return node_successor;
    }

    //           |            right-rotate(T,y)       |
    //           y            ---------------.       x
    //          / \                                  / \
    //         x   c          left-rotate(T,x)      a   y
    //        / \             <---------------         / \
    //       a   b                                    b   c

    rotate_left(x) {
        let y = x.right;

        x.right = y.left;           // b goes to x.right

        if (y.left != this.nil_node) {
            y.left.parent = x;     // x becomes parent of b
        }
        y.parent = x.parent;       // move parent

        if (x == this.root) {
            this.root = y;           // y becomes root
        }
        else {                        // y becomes child of x.parent
            if (x == x.parent.left) {
                x.parent.left = y;
            }
            else {
                x.parent.right = y;
            }
        }
        y.left = x;                 // x becomes left child of y
        x.parent = y;               // and y becomes parent of x

        if (x != null && x != this.nil_node) {
            x.update_max();
        }

        y = x.parent;
        if (y != null && y != this.nil_node) {
            y.update_max();
        }
    }

    rotate_right(y) {
        let x = y.left;

        y.left = x.right;           // b goes to y.left

        if (x.right != this.nil_node) {
            x.right.parent = y;        // y becomes parent of b
        }
        x.parent = y.parent;          // move parent

        if (y == this.root) {        // x becomes root
            this.root = x;
        }
        else {                        // y becomes child of x.parent
            if (y == y.parent.left) {
                y.parent.left = x;
            }
            else {
                y.parent.right = x;
            }
        }
        x.right = y;                 // y becomes right child of x
        y.parent = x;               // and x becomes parent of y

        if (y != null && y != this.nil_node) {
            y.update_max();
        }

        x = y.parent;
        if (x != null && x != this.nil_node) {
            x.update_max();
        }
    }

    tree_walk(node, action) {
        if (node != null && node != this.nil_node) {
            this.tree_walk(node.left, action);
            // arr.push(node.toArray());
            action(node);
            this.tree_walk(node.right, action);
        }
    }

    /* Return true if all red nodes have exactly two black child nodes */
    testRedBlackProperty() {
        let res = true;
        this.tree_walk(this.root, function (node) {
            if (node.color == RB_TREE_COLOR_RED) {
                if (!(node.left.color == RB_TREE_COLOR_BLACK && node.right.color == RB_TREE_COLOR_BLACK)) {
                    res = false;
                }
            }
        });
        return res;
    }

    /* Throw error if not every path from root to bottom has same black height */
    testBlackHeightProperty(node) {
        let height = 0;
        let heightLeft = 0;
        let heightRight = 0;
        if (node.color == RB_TREE_COLOR_BLACK) {
            height++;
        }
        if (node.left != this.nil_node) {
            heightLeft = this.testBlackHeightProperty(node.left);
        }
        else {
            heightLeft = 1;
        }
        if (node.right != this.nil_node) {
            heightRight = this.testBlackHeightProperty(node.right);
        }
        else {
            heightRight = 1;
        }
        if (heightLeft != heightRight) {
            throw new Error('Red-black height property violated');
        }
        height += heightLeft;
        return height;
    };
}

/**
 * Created by Alex Bol on 3/12/2017.
 */

/**
 * Class representing a planar set - a generic container with ability to keep and retrieve shapes and
 * perform spatial queries. Planar set is an extension of Set container, so it supports
 * Set properties and methods
 */
class PlanarSet extends Set {
    /**
     * Create new instance of PlanarSet
     * @param shapes - array or set of geometric objects to store in planar set
     * Each object should have a <b>box</b> property
     */
    constructor(shapes) {
        super(shapes);
        this.index = new IntervalTree();
        this.forEach(shape => this.index.insert(shape));
    }

    /**
     * Add new shape to planar set and to its spatial index.<br/>
     * If shape already exist, it will not be added again.
     * This happens with no error, it is possible to use <i>size</i> property to check if
     * a shape was actually added.<br/>
     * Method returns planar set object updated and may be chained
     * @param {Shape} shape - shape to be added, should have valid <i>box</i> property
     * @returns {PlanarSet}
     */
    add(shape) {
        let size = this.size;
        super.add(shape);
        // size not changed - item not added, probably trying to add same item twice
        if (this.size > size) {
            let node = this.index.insert(shape.box, shape);
        }
        return this;         // in accordance to Set.add interface
    }

    /**
     * Delete shape from planar set. Returns true if shape was actually deleted, false otherwise
     * @param {Shape} shape - shape to be deleted
     * @returns {boolean}
     */
    delete(shape) {
        let deleted = super.delete(shape);
        if (deleted) {
            this.index.remove(shape.box, shape);
        }
        return deleted;
    }

    /**
     * Clear planar set
     */
    clear() {
        super.clear();
        this.index = new IntervalTree();
    }

    /**
     * 2d range search in planar set.<br/>
     * Returns array of all shapes in planar set which bounding box is intersected with query box
     * @param {Box} box - query box
     * @returns {Shapes[]}
     */
    search(box) {
        let resp = this.index.search(box);
        return resp;
    }

    /**
     * Point location test. Returns array of shapes which contains given point
     * @param {Point} point - query point
     * @returns {Array}
     */
    hit(point) {
        let box = new Flatten.Box(point.x - 1, point.y - 1, point.x + 1, point.y + 1);
        let resp = this.index.search(box);
        return resp.filter((shape) => point.on(shape));
    }

    /**
     * Returns svg string to draw all shapes in planar set
     * @returns {String}
     */
    svg() {
        let svgcontent = [...this].reduce((acc, shape) => acc + shape.svg(), "");
        return svgcontent;
    }
}

Flatten.PlanarSet = PlanarSet;

/**
 * Created by Alex Bol on 2/18/2017.
 */

/**
 *
 * Class representing a point
 * @type {Point}
 */
class Point {
    /**
     * Point may be constructed by two numbers, or by array of two numbers
     * @param {number} x - x-coordinate (float number)
     * @param {number} y - y-coordinate (float number)
     */
    constructor(...args) {
        /**
         * x-coordinate (float number)
         * @type {number}
         */
        this.x = 0;
        /**
         * y-coordinate (float number)
         * @type {number}
         */
        this.y = 0;

        if (args.length === 0) {
            return;
        }

        if (args.length === 1 && args[0] instanceof Array && args[0].length === 2) {
            let arr = args[0];
            if (typeof (arr[0]) == "number" && typeof (arr[1]) == "number") {
                this.x = arr[0];
                this.y = arr[1];
                return;
            }
        }

        if (args.length === 1 && args[0] instanceof Object && args[0].name === "point") {
            let {x, y} = args[0];
            this.x = x;
            this.y = y;
            return;
        }

        if (args.length === 2) {
            if (typeof (args[0]) == "number" && typeof (args[1]) == "number") {
                this.x = args[0];
                this.y = args[1];
                return;
            }
        }

        throw Flatten.Errors.ILLEGAL_PARAMETERS;

    }

    /**
     * Returns bounding box of a point
     * @returns {Box}
     */
    get box() {
        return new Flatten.Box(this.x, this.y, this.x, this.y);
    }

    /**
     * Return new cloned instance of point
     * @returns {Point}
     */
    clone() {
        return new Flatten.Point(this.x, this.y);
    }

    get vertices() {
        return [this.clone()];
    }

    /**
     * Returns true if points are equal up to [Flatten.Utils.DP_TOL]{@link DP_TOL} tolerance
     * @param {Point} pt Query point
     * @returns {boolean}
     */
    equalTo(pt) {
        return Flatten.Utils.EQ(this.x, pt.x) && Flatten.Utils.EQ(this.y, pt.y);
    }

    /**
     * Defines predicate "less than" between points. Returns true if the point is less than query points, false otherwise <br/>
     * By definition point1 < point2 if {point1.y < point2.y || point1.y == point2.y && point1.x < point2.x <br/>
     * Numeric values compared with [Flatten.Utils.DP_TOL]{@link DP_TOL} tolerance
     * @param {Point} pt Query point
     * @returns {boolean}
     */
    lessThan(pt) {
        if (Flatten.Utils.LT(this.y, pt.y))
            return true;
        if (Flatten.Utils.EQ(this.y, pt.y) && Flatten.Utils.LT(this.x, pt.x))
            return true;
        return false;
    }

    /**
     * Returns new point rotated by given angle around given center point.
     * If center point is omitted, rotates around zero point (0,0).
     * Positive value of angle defines rotation in counter clockwise direction,
     * negative angle defines rotation in clockwise clockwise direction
     * @param {number} angle - angle in radians
     * @param {Point} [center=(0,0)] center
     * @returns {Point}
     */
    rotate(angle, center = {x: 0, y: 0}) {
        var x_rot = center.x + (this.x - center.x) * Math.cos(angle) - (this.y - center.y) * Math.sin(angle);
        var y_rot = center.y + (this.x - center.x) * Math.sin(angle) + (this.y - center.y) * Math.cos(angle);

        return new Flatten.Point(x_rot, y_rot);
    }

    /**
     * Returns new point translated by given vector.
     * Translation vector may by also defined by a pair of numbers.
     * @param {Vector} vector - Translation vector defined as Flatten.Vector or
     * @param {number|number} - Translation vector defined as pair of numbers
     * @returns {Point}
     */
    translate(...args) {
        if (args.length == 1 &&
            (args[0] instanceof Flatten.Vector || !isNaN(args[0].x) && !isNaN(args[0].y))) {
            return new Flatten.Point(this.x + args[0].x, this.y + args[0].y);
        }

        if (args.length == 2 && typeof (args[0]) == "number" && typeof (args[1]) == "number") {
            return new Flatten.Point(this.x + args[0], this.y + args[1]);
        }

        throw Flatten.Errors.ILLEGAL_PARAMETERS;
    }

    /**
     * Return new point transformed by affine transformation matrix m
     * @param {Matrix} m - affine transformation matrix (a,b,c,d,tx,ty)
     * @returns {Point}
     */
    transform(m) {
        // let [x,y] = m.transform([this.x,this.y]);
        return new Flatten.Point(m.transform([this.x, this.y]))
    }

    /**
     * Returns projection point on given line
     * @param {Line} line Line this point be projected on
     * @returns {Point}
     */
    projectionOn(line) {
        if (this.equalTo(line.pt))                   // this point equal to line anchor point
            return this.clone();

        let vec = new Flatten.Vector(this, line.pt);
        if (Flatten.Utils.EQ_0(vec.cross(line.norm)))    // vector to point from anchor point collinear to normal vector
            return line.pt.clone();

        let dist = vec.dot(line.norm);             // signed distance
        let proj_vec = line.norm.multiply(dist);
        return this.translate(proj_vec);
    }

    /**
     * Returns true if point belongs to the "left" semi-plane, which means, point belongs to the same semi plane where line normal vector points to
     * Return false if point belongs to the "right" semi-plane or to the line itself
     * @param {Line} line Query line
     * @returns {boolean}
     */
    leftTo(line) {
        let vec = new Flatten.Vector(line.pt, this);
        let onLeftSemiPlane = Flatten.Utils.GT(vec.dot(line.norm), 0);
        return onLeftSemiPlane;
    }

    /**
     * Calculate distance and shortest segment from point to shape and return as array [distance, shortest segment]
     * @param {Shape} shape Shape of the one of supported types Point, Line, Circle, Segment, Arc, Polygon or Planar Set
     * @returns {number} distance from point to shape
     * @returns {Segment} shortest segment between point and shape (started at point, ended at shape)
     */
    distanceTo(shape) {
        if (shape instanceof Point) {
            let dx = shape.x - this.x;
            let dy = shape.y - this.y;
            return [Math.sqrt(dx * dx + dy * dy), new Flatten.Segment(this, shape)];
        }

        if (shape instanceof Flatten.Line) {
            return Flatten.Distance.point2line(this, shape);
        }

        if (shape instanceof Flatten.Circle) {
            return Flatten.Distance.point2circle(this, shape);
        }

        if (shape instanceof Flatten.Segment) {
            return Flatten.Distance.point2segment(this, shape);
        }

        if (shape instanceof Flatten.Arc) {
            // let [dist, ...rest] = Distance.point2arc(this, shape);
            // return dist;
            return Flatten.Distance.point2arc(this, shape);
        }

        if (shape instanceof Flatten.Polygon) {
            // let [dist, ...rest] = Distance.point2polygon(this, shape);
            // return dist;
            return Flatten.Distance.point2polygon(this, shape);
        }

        if (shape instanceof Flatten.PlanarSet) {
            return Flatten.Distance.shape2planarSet(this, shape);
        }
    }

    /**
     * Returns true if point is on a shape, false otherwise
     * @param {Shape} shape Shape of the one of supported types Point, Line, Circle, Segment, Arc, Polygon
     * @returns {boolean}
     */
    on(shape) {
        if (shape instanceof Flatten.Point) {
            return this.equalTo(shape);
        }

        if (shape instanceof Flatten.Line) {
            return shape.contains(this);
        }

        if (shape instanceof Flatten.Circle) {
            return shape.contains(this);
        }

        if (shape instanceof Flatten.Segment) {
            return shape.contains(this);
        }

        if (shape instanceof Flatten.Arc) {
            return shape.contains(this);
        }

        if (shape instanceof Flatten.Polygon) {
            return shape.contains(this);
        }
    }

    /**
     * This method returns an object that defines how data will be
     * serialized when called JSON.stringify() method
     * @returns {Object}
     */
    toJSON() {
        return Object.assign({}, this, {name: "point"});
    }

    /**
     * Return string to draw point in svg as circle with radius "r" <br/>
     * Accept any valid attributes of svg elements as svg object
     * Defaults attribues are: <br/>
     * {
     *    r:"3",
     *    stroke:"black",
     *    strokeWidth:"1",
     *    fill:"red"
     * }
     * @param {Object} attrs - Any valid attributes of svg circle element, like "r", "stroke", "strokeWidth", "fill"
     * @returns {String}
     */
    svg(attrs = {}) {
        let {r, stroke, strokeWidth, fill, id, className} = attrs;
        // let rest_str = Object.keys(rest).reduce( (acc, key) => acc += ` ${key}="${rest[key]}"`, "");
        let id_str = (id && id.length > 0) ? `id="${id}"` : "";
        let class_str = (className && className.length > 0) ? `class="${className}"` : "";
        return `\n<circle cx="${this.x}" cy="${this.y}" r="${r || 3}" stroke="${stroke || "black"}" stroke-width="${strokeWidth || 1}" fill="${fill || "red"}" ${id_str} ${class_str} />`;
    }

}
Flatten.Point = Point;
/**
 * Function to create point equivalent to "new" constructor
 * @param args
 */
const point = (...args) => new Flatten.Point(...args);
Flatten.point = point;

// export {Point};

/**
 * Created by Alex Bol on 2/19/2017.
 */

/**
 * Class representing a vector
 * @type {Vector}
 */
class Vector {
    /**
     * Vector may be constructed by two points, or by two float numbers,
     * or by array of two numbers
     * @param {Point} ps - start point
     * @param {Point} pe - end point
     */
    constructor(...args) {
        /**
         * x-coordinate of a vector (float number)
         * @type {number}
         */
        this.x = 0;
        /**
         * y-coordinate of a vector (float number)
         * @type {number}
         */
        this.y = 0;

        /* return zero vector */
        if (args.length === 0) {
            return;
        }

        if (args.length === 1 && args[0] instanceof Array && args[0].length === 2) {
            let arr = args[0];
            if (typeof (arr[0]) == "number" && typeof (arr[1]) == "number") {
                this.x = arr[0];
                this.y = arr[1];
                return;
            }
        }

        if (args.length === 1 && args[0] instanceof Object && args[0].name === "vector") {
            let {x, y} = args[0];
            this.x = x;
            this.y = y;
            return;
        }

        if (args.length === 2) {
            let a1 = args[0];
            let a2 = args[1];

            if (typeof (a1) == "number" && typeof (a2) == "number") {
                this.x = a1;
                this.y = a2;
                return;
            }

            if (a1 instanceof Flatten.Point && a2 instanceof Flatten.Point) {
                this.x = a2.x - a1.x;
                this.y = a2.y - a1.y;
                return;
            }

        }

        throw Flatten.Errors.ILLEGAL_PARAMETERS;
    }

    /**
     * Method clone returns new instance of Vector
     * @returns {Vector}
     */
    clone() {
        return new Flatten.Vector(this.x, this.y);
    }

    /**
     * Slope of the vector in radians from 0 to 2PI
     * @returns {number}
     */
    get slope() {
        let angle = Math.atan2(this.y, this.x);
        if (angle < 0) angle = 2 * Math.PI + angle;
        return angle;
    }

    /**
     * Length of vector
     * @returns {number}
     */
    get length() {
        return Math.sqrt(this.dot(this));
    }

    /**
     * Returns true if vectors are equal up to [DP_TOL]{@link http://localhost:63342/flatten-js/docs/global.html#DP_TOL}
     * tolerance
     * @param {Vector} v
     * @returns {boolean}
     */
    equalTo(v) {
        return Flatten.Utils.EQ(this.x, v.x) && Flatten.Utils.EQ(this.y, v.y);
    }

    /**
     * Returns new vector multiplied by scalar
     * @param {number} scalar
     * @returns {Vector}
     */
    multiply(scalar) {
        return (new Flatten.Vector(scalar * this.x, scalar * this.y));
    }

    /**
     * Returns scalar product (dot product) of two vectors <br/>
     * <code>dot_product = (this * v)</code>
     * @param {Vector} v Other vector
     * @returns {number}
     */
    dot(v) {
        return (this.x * v.x + this.y * v.y);
    }

    /**
     * Returns vector product (cross product) of two vectors <br/>
     * <code>cross_product = (this x v)</code>
     * @param {Vector} v Other vector
     * @returns {number}
     */
    cross(v) {
        return (this.x * v.y - this.y * v.x);
    }

    /**
     * Returns unit vector.<br/>
     * Throw error if given vector has zero length
     * @returns {Vector}
     */
    normalize() {
        if (!Flatten.Utils.EQ_0(this.length)) {
            return (new Flatten.Vector(this.x / this.length, this.y / this.length));
        }
        throw Flatten.Errors.ZERO_DIVISION;
    }

    /**
     * Returns new vector rotated by given angle,
     * positive angle defines rotation in counter clockwise direction,
     * negative - in clockwise direction
     * @param {number} angle - Angle in radians
     * @returns {Vector}
     */
    rotate(angle) {
        let point = new Flatten.Point(this.x, this.y);
        let rpoint = point.rotate(angle);
        return new Flatten.Vector(rpoint.x, rpoint.y);
    }

    /**
     * Returns vector rotated 90 degrees counter clockwise
     * @returns {Vector}
     */
    rotate90CCW() {
        return new Flatten.Vector(-this.y, this.x);
    };

    /**
     * Returns vector rotated 90 degrees clockwise
     * @returns {Vector}
     */
    rotate90CW() {
        return new Flatten.Vector(this.y, -this.x);
    };

    /**
     * Return inverted vector
     * @returns {Vector}
     */
    invert() {
        return new Flatten.Vector(-this.x, -this.y);
    }

    /**
     * Return result of addition of other vector to this vector as a new vector
     * @param {Vector} v Other vector
     * @returns {Vector}
     */
    add(v) {
        return new Flatten.Vector(this.x + v.x, this.y + v.y);
    }

    /**
     * Return result of subtraction of other vector from current vector as a new vector
     * @param {Vector} v Another vector
     * @returns {Vector}
     */
    subtract(v) {
        return new Flatten.Vector(this.x - v.x, this.y - v.y);
    }

    /**
     * Return angle between this vector and other vector. <br/>
     * Angle is measured from 0 to 2*PI in the counter clockwise direction
     * from current vector to other.
     * @param {Vector} v Another vector
     * @returns {number}
     */
    angleTo(v) {
        let norm1 = this.normalize();
        let norm2 = v.normalize();
        let angle = Math.atan2(norm1.cross(norm2), norm1.dot(norm2));
        if (angle < 0) angle += 2 * Math.PI;
        return angle;
    }

    /**
     * Return vector projection of the current vector on another vector
     * @param {Vector} v Another vector
     * @returns {Vector}
     */
    projectionOn(v) {
        let n = v.normalize();
        let d = this.dot(n);
        return n.multiply(d);
    }

    /**
     * This method returns an object that defines how data will be
     * serialized when called JSON.stringify() method
     * @returns {Object}
     */
    toJSON() {
        return Object.assign({}, this, {name: "vector"});
    }
}
Flatten.Vector = Vector;

/**
 * Function to create vector equivalent to "new" constructor
 * @param args
 */
const vector = (...args) => new Flatten.Vector(...args);
Flatten.vector = vector;

/**
 * Created by Alex Bol on 3/10/2017.
 */

/**
 * Class representing a segment
 * @type {Segment}
 */
class Segment {
    /**
     *
     * @param {Point} ps - start point
     * @param {Point} pe - end point
     */
    constructor(...args) {
        /**
         * Start point
         * @type {Point}
         */
        this.ps = new Flatten.Point();
        /**
         * End Point
         * @type {Point}
         */
        this.pe = new Flatten.Point();

        if (args.length === 0) {
            return;
        }

        if (args.length === 1 && args[0] instanceof Array && args[0].length === 4) {
            let coords = args[0];
            this.ps = new Flatten.Point(coords[0], coords[1]);
            this.pe = new Flatten.Point(coords[2], coords[3]);
            return;
        }

        if (args.length === 1 && args[0] instanceof Object && args[0].name === "segment") {
            let {ps, pe} = args[0];
            this.ps = new Flatten.Point(ps.x, ps.y);
            this.pe = new Flatten.Point(pe.x, pe.y);
            return;
        }

        if (args.length === 2 && args[0] instanceof Flatten.Point && args[1] instanceof Flatten.Point) {
            this.ps = args[0].clone();
            this.pe = args[1].clone();
            return;
        }

        if (args.length === 4) {
            this.ps = new Flatten.Point(args[0], args[1]);
            this.pe = new Flatten.Point(args[2], args[3]);
            return;
        }

        throw Flatten.Errors.ILLEGAL_PARAMETERS;
    }

    /**
     * Return new cloned instance of segment
     * @returns {Segment}
     */
    clone() {
        return new Flatten.Segment(this.start, this.end);
    }

    /**
     * Start point
     * @returns {Point}
     */
    get start() {
        return this.ps;
    }

    /**
     * End point
     * @returns {Point}
     */
    get end() {
        return this.pe;
    }


    /**
     * Returns array of start and end point
     * @returns [Point,Point]
     */
    get vertices() {
        return [this.ps.clone(), this.pe.clone()];
    }

    /**
     * Length of a segment
     * @returns {number}
     */
    get length() {
        return this.start.distanceTo(this.end)[0];
    }

    /**
     * Slope of the line - angle to axe x in radians from 0 to 2PI
     * @returns {number}
     */
    get slope() {
        let vec = new Flatten.Vector(this.start, this.end);
        return vec.slope;
    }

    /**
     * Bounding box
     * @returns {Box}
     */
    get box() {
        return new Flatten.Box(
            Math.min(this.start.x, this.end.x),
            Math.min(this.start.y, this.end.y),
            Math.max(this.start.x, this.end.x),
            Math.max(this.start.y, this.end.y)
        )
    }

    /**
     * Returns true if equals to query segment, false otherwise
     * @param {Seg} seg - query segment
     * @returns {boolean}
     */
    equalTo(seg) {
        return this.ps.equalTo(seg.ps) && this.pe.equalTo(seg.pe);
    }

    /**
     * Returns true if segment contains point
     * @param {Point} pt Query point
     * @returns {boolean}
     */
    contains(pt) {
        return Flatten.Utils.EQ_0(this.distanceToPoint(pt));
    }

    /**
     * Returns array of intersection points between segment and other shape
     * @param {Shape} shape - Shape of the one of supported types <br/>
     * @returns {Point[]}
     */
    intersect(shape) {
        if (shape instanceof Flatten.Point) {
            return this.contains(shape) ? [shape] : [];
        }

        if (shape instanceof Flatten.Line) {
            return intersectSegment2Line(this, shape);
        }

        if (shape instanceof Flatten.Segment) {
            return  intersectSegment2Segment(this, shape);
        }

        if (shape instanceof Flatten.Circle) {
            return intersectSegment2Circle(this, shape);
        }

        if (shape instanceof Flatten.Box) {
            return intersectSegment2Box(this, shape);
        }

        if (shape instanceof Flatten.Arc) {
            return intersectSegment2Arc(this, shape);
        }

        if (shape instanceof Flatten.Polygon) {
            return  intersectSegment2Polygon(this, shape);
        }
    }

    /**
     * Calculate distance and shortest segment from segment to shape and return as array [distance, shortest segment]
     * @param {Shape} shape Shape of the one of supported types Point, Line, Circle, Segment, Arc, Polygon or Planar Set
     * @returns {number} distance from segment to shape
     * @returns {Segment} shortest segment between segment and shape (started at segment, ended at shape)
     */
    distanceTo(shape) {
        if (shape instanceof Flatten.Point) {
            let [dist, shortest_segment] = Flatten.Distance.point2segment(shape, this);
            shortest_segment = shortest_segment.reverse();
            return [dist, shortest_segment];
        }

        if (shape instanceof Flatten.Circle) {
            let [dist, shortest_segment] = Flatten.Distance.segment2circle(this, shape);
            return [dist, shortest_segment];
        }

        if (shape instanceof Flatten.Line) {
            let [dist, shortest_segment] = Flatten.Distance.segment2line(this, shape);
            return [dist, shortest_segment];
        }

        if (shape instanceof Flatten.Segment) {
            let [dist, shortest_segment] = Flatten.Distance.segment2segment(this, shape);
            return [dist, shortest_segment];
        }

        if (shape instanceof Flatten.Arc) {
            let [dist, shortest_segment] = Flatten.Distance.segment2arc(this, shape);
            return [dist, shortest_segment];
        }

        if (shape instanceof Flatten.Polygon) {
            let [dist, shortest_segment] = Flatten.Distance.shape2polygon(this, shape);
            return [dist, shortest_segment];
        }

        if (shape instanceof Flatten.PlanarSet) {
            let [dist, shortest_segment] = Flatten.Distance.shape2planarSet(this, shape);
            return [dist, shortest_segment];
        }
    }

    /**
     * Returns unit vector in the direction from start to end
     * @returns {Vector}
     */
    tangentInStart() {
        let vec = new Flatten.Vector(this.start, this.end);
        return vec.normalize();
    }

    /**
     * Return unit vector in the direction from end to start
     * @returns {Vector}
     */
    tangentInEnd() {
        let vec = new Flatten.Vector(this.end, this.start);
        return vec.normalize();
    }

    /**
     * Returns new segment with swapped start and end points
     * @returns {Segment}
     */
    reverse() {
        return new Segment(this.end, this.start);
    }

    /**
     * When point belongs to segment, return array of two segments split by given point,
     * if point is inside segment. Returns clone of this segment if query point is incident
     * to start or end point of the segment. Returns empty array if point does not belong to segment
     * @param {Point} pt Query point
     * @returns {Segment[]}
     */
    split(pt) {
        if (this.start.equalTo(pt))
            return [null, this.clone()];

        if (this.end.equalTo(pt))
            return [this.clone(), null];

        return [
            new Flatten.Segment(this.start, pt),
            new Flatten.Segment(pt, this.end)
        ]
    }

    /**
     * Return middle point of the segment
     * @returns {Point}
     */
    middle() {
        return new Flatten.Point((this.start.x + this.end.x) / 2, (this.start.y + this.end.y) / 2);
    }

    distanceToPoint(pt) {
        let [dist, ...rest] = Flatten.Distance.point2segment(pt, this);
        return dist;
    };

    definiteIntegral(ymin = 0.0) {
        let dx = this.end.x - this.start.x;
        let dy1 = this.start.y - ymin;
        let dy2 = this.end.y - ymin;
        return (dx * (dy1 + dy2) / 2);
    }

    /**
     * Returns new segment translated by vector vec
     * @param {Vector} vec
     * @returns {Segment}
     */
    translate(...args) {
        return new Segment(this.ps.translate(...args), this.pe.translate(...args));
    }

    /**
     * Return new segment rotated by given angle around given point
     * If point omitted, rotate around origin (0,0)
     * Positive value of angle defines rotation counter clockwise, negative - clockwise
     * @param {number} angle - rotation angle in radians
     * @param {Point} center - center point, default is (0,0)
     * @returns {Segment}
     */
    rotate(angle = 0, center = new Flatten.Point()) {
        let m = new Flatten.Matrix();
        m = m.translate(center.x, center.y).rotate(angle).translate(-center.x, -center.y);
        return this.transform(m);
    }

    /**
     * Return new segment transformed using affine transformation matrix
     * @param {Matrix} matrix - affine transformation matrix
     * @returns {Segment} - transformed segment
     */
    transform(matrix = new Flatten.Matrix()) {
        return new Segment(this.ps.transform(matrix), this.pe.transform(matrix))
    }

    /**
     * Returns true if segment start is equal to segment end up to DP_TOL
     * @returns {boolean}
     */
    isZeroLength() {
        return this.ps.equalTo(this.pe)
    }

    /**
     * Sort given array of points from segment start to end, assuming all points lay on the segment
     * @param {Point[]} - array of points
     * @returns {Point[]} new array sorted
     */
    sortPoints(pts) {
        let line = new Flatten.Line(this.start, this.end);
        return line.sortPoints(pts);
    }

    /**
     * This method returns an object that defines how data will be
     * serialized when called JSON.stringify() method
     * @returns {Object}
     */
    toJSON() {
        return Object.assign({}, this, {name: "segment"});
    }

    /**
     * Return string to draw segment in svg
     * @param {Object} attrs - an object with attributes for svg path element,
     * like "stroke", "strokeWidth" <br/>
     * Defaults are stroke:"black", strokeWidth:"1"
     * @returns {string}
     */
    svg(attrs = {}) {
        let {stroke, strokeWidth, id, className} = attrs;
        // let rest_str = Object.keys(rest).reduce( (acc, key) => acc += ` ${key}="${rest[key]}"`, "");
        let id_str = (id && id.length > 0) ? `id="${id}"` : "";
        let class_str = (className && className.length > 0) ? `class="${className}"` : "";

        return `\n<line x1="${this.start.x}" y1="${this.start.y}" x2="${this.end.x}" y2="${this.end.y}" stroke="${stroke || "black"}" stroke-width="${strokeWidth || 1}" ${id_str} ${class_str} />`;

    }

}
Flatten.Segment = Segment;
/**
 * Shortcut method to create new segment
 */
const segment = (...args) => new Flatten.Segment(...args);
Flatten.segment = segment;

/**
 * Created by Alex Bol on 2/20/2017.
 */

let {vector: vector$1} = Flatten;

/**
 * Class representing a line
 * @type {Line}
 */
class Line {
    /**
     * Line may be constructed by point and normal vector or by two points that a line passes through
     * @param {Point} pt - point that a line passes through
     * @param {Vector|Point} norm - normal vector to a line or second point a line passes through
     */
    constructor(...args) {
        /**
         * Point a line passes through
         * @type {Point}
         */
        this.pt = new Flatten.Point();
        /**
         * Normal vector to a line <br/>
         * Vector is normalized (length == 1)<br/>
         * Direction of the vector is chosen to satisfy inequality norm * p >= 0
         * @type {Vector}
         */
        this.norm = new Flatten.Vector(0, 1);

        if (args.length == 0) {
            return;
        }

        if (args.length == 1 && args[0] instanceof Object && args[0].name === "line") {
            let {pt, norm} = args[0];
            this.pt = new Flatten.Point(pt);
            this.norm = new Flatten.Vector(norm);
            return;
        }

        if (args.length == 2) {
            let a1 = args[0];
            let a2 = args[1];

            if (a1 instanceof Flatten.Point && a2 instanceof Flatten.Point) {
                this.pt = a1;
                this.norm = Line.points2norm(a1, a2);
                if (this.norm.dot(vector$1(this.pt.x,this.pt.y)) >= 0) {
                    this.norm.invert();
                }
                return;
            }

            if (a1 instanceof Flatten.Point && a2 instanceof Flatten.Vector) {
                if (Flatten.Utils.EQ_0(a2.x) && Flatten.Utils.EQ_0(a2.y)) {
                    throw Flatten.Errors.ILLEGAL_PARAMETERS;
                }
                this.pt = a1.clone();
                this.norm = a2.clone();
                this.norm = this.norm.normalize();
                if (this.norm.dot(vector$1(this.pt.x,this.pt.y)) >= 0) {
                    this.norm.invert();
                }
                return;
            }

            if (a1 instanceof Flatten.Vector && a2 instanceof Flatten.Point) {
                if (Flatten.Utils.EQ_0(a1.x) && Flatten.Utils.EQ_0(a1.y)) {
                    throw Flatten.Errors.ILLEGAL_PARAMETERS;
                }
                this.pt = a2.clone();
                this.norm = a1.clone();
                this.norm = this.norm.normalize();
                if (this.norm.dot(vector$1(this.pt.x,this.pt.y)) >= 0) {
                    this.norm.invert();
                }
                return;
            }
        }

        throw Flatten.Errors.ILLEGAL_PARAMETERS;
    }

    /**
     * Return new cloned instance of line
     * @returns {Line}
     */
    clone() {
        return new Flatten.Line(this.pt, this.norm);
    }

    /* The following methods need for implementation of Edge interface
    /**
     * Line has no start point
     * @returns {undefined}
     */
    get start() {return undefined;}

    /**
     * Line has no end point
     */
    get end() {return undefined;}

    /**
     * Return positive infinity number as length
     * @returns {number}
     */
    get length() {return Number.POSITIVE_INFINITY;}

    /**
     * Returns infinite box
     * @returns {Box}
     */
    get box() {
        return new Flatten.Box(
            Number.NEGATIVE_INFINITY,
            Number.NEGATIVE_INFINITY,
            Number.POSITIVE_INFINITY,
            Number.POSITIVE_INFINITY
        )
    }

    /**
     * Middle point is undefined
     * @returns {undefined}
     */
    get middle() {return undefined}

    /**
     * Slope of the line - angle in radians between line and axe x from 0 to 2PI
     * @returns {number} - slope of the line
     */
    get slope() {
        let vec = new Flatten.Vector(this.norm.y, -this.norm.x);
        return vec.slope;
    }

    /**
     * Get coefficients [A,B,C] of a standard line equation in the form Ax + By = C
     * @code [A, B, C] = line.standard
     * @returns {number[]} - array of coefficients
     */
    get standard() {
        let A = this.norm.x;
        let B = this.norm.y;
        let C = this.norm.dot(this.pt);

        return [A, B, C];
    }

    /**
     * Return true if parallel or incident to other line
     * @param {Line} other_line - line to check
     * @returns {boolean}
     */
    parallelTo(other_line) {
        return Flatten.Utils.EQ_0(this.norm.cross(other_line.norm));
    }

    /**
     * Returns true if incident to other line
     * @param {Line} other_line - line to check
     * @returns {boolean}
     */
    incidentTo(other_line) {
        return this.parallelTo(other_line) && this.pt.on(other_line);
    }

    /**
     * Returns true if point belongs to line
     * @param {Point} pt Query point
     * @returns {boolean}
     */
    contains(pt) {
        if (this.pt.equalTo(pt)) {
            return true;
        }
        /* Line contains point if vector to point is orthogonal to the line normal vector */
        let vec = new Flatten.Vector(this.pt, pt);
        return Flatten.Utils.EQ_0(this.norm.dot(vec));
    }

    /**
     * Return coordinate of the point that lays on the line in the transformed
     * coordinate system where center is the projection of the point(0,0) to
     * the line and axe y is collinear to the normal vector. <br/>
     * This method assumes that point lays on the line and does not check it
     * @param {Point} pt - point on line
     * @returns {number}
     */
    coord(pt) {
        return vector$1(pt.x, pt.y).cross(this.norm);
    }

    /**
     * Returns array of intersection points
     * @param {Shape} shape - shape to intersect with
     * @returns {Point[]}
     */
    intersect(shape) {
        if (shape instanceof Flatten.Point) {
            return this.contains(shape) ? [shape] : [];
        }

        if (shape instanceof Flatten.Line) {
            return intersectLine2Line(this, shape);
        }

        if (shape instanceof Flatten.Circle) {
            return intersectLine2Circle(this, shape);
        }

        if (shape instanceof Flatten.Box) {
            return intersectLine2Box(this, shape);
        }

        if (shape instanceof Flatten.Segment) {
            return intersectSegment2Line(shape, this);
        }

        if (shape instanceof Flatten.Arc) {
            return intersectLine2Arc(this, shape);
        }

        if (shape instanceof Flatten.Polygon) {
            return  intersectLine2Polygon(this, shape);
        }

    }

    /**
     * Calculate distance and shortest segment from line to shape and returns array [distance, shortest_segment]
     * @param {Shape} shape Shape of the one of the types Point, Circle, Segment, Arc, Polygon
     * @returns {Number}
     * @returns {Segment}
     */
    distanceTo(shape) {
        if (shape instanceof Flatten.Point) {
            let [distance, shortest_segment] = Flatten.Distance.point2line(shape, this);
            shortest_segment = shortest_segment.reverse();
            return [distance, shortest_segment];
        }

        if (shape instanceof Flatten.Circle) {
            let [distance, shortest_segment] = Flatten.Distance.circle2line(shape, this);
            shortest_segment = shortest_segment.reverse();
            return [distance, shortest_segment];
        }

        if (shape instanceof Flatten.Segment) {
            let [distance, shortest_segment] = Flatten.Distance.segment2line(shape, this);
            return [distance, shortest_segment.reverse()];
        }

        if (shape instanceof Flatten.Arc) {
            let [distance, shortest_segment] = Flatten.Distance.arc2line(shape, this);
            return [distance, shortest_segment.reverse()];
        }

        if (shape instanceof Flatten.Polygon) {
            let [distance, shortest_segment] = Flatten.Distance.shape2polygon(this, shape);
            return [distance, shortest_segment];
        }
    }

    /**
     * Split line with array of points and return array of shapes
     * Assumed that all points lay on the line
     * @param {Point[]}
     * @returns {Shape[]}
     */
    split(pt) {
        if (pt instanceof Flatten.Point) {
            return [new Flatten.Ray(pt, this.norm.invert()), new Flatten.Ray(pt, this.norm)]
        }
        else {
            let multiline = new Flatten.Multiline([this]);
            let sorted_points = this.sortPoints(pt);
            multiline.split(sorted_points);
            return multiline.toShapes();
        }
    }

    /**
     * Sort given array of points that lay on line with respect to coordinate on a line
     * The method assumes that points lay on the line and does not check this
     * @param {Point[]} pts - array of points
     * @returns {Point[]} new array sorted
     */
    sortPoints(pts) {
        return pts.slice().sort( (pt1, pt2) => {
            if (this.coord(pt1) < this.coord(pt2)) {
                return -1;
            }
            if (this.coord(pt1) > this.coord(pt2)) {
                return 1;
            }
            return 0;
        })
    }

    /**
     * This method returns an object that defines how data will be
     * serialized when called JSON.stringify() method
     * @returns {Object}
     */
    toJSON() {
        return Object.assign({}, this, {name: "line"});
    }

    /**
     * Return string to draw svg segment representing line inside given box
     * @param {Box} box Box representing drawing area
     * @param {Object} attrs - an object with attributes of svg circle element
     */
    svg(box, attrs = {}) {
        let ip = intersectLine2Box(this, box);
        if (ip.length === 0)
            return "";
        let ps = ip[0];
        let pe = ip.length == 2 ? ip[1] : ip.find(pt => !pt.equalTo(ps));
        if (pe === undefined) pe = ps;
        let segment = new Flatten.Segment(ps, pe);
        return segment.svg(attrs);
    }

    static points2norm(pt1, pt2) {
        if (pt1.equalTo(pt2)) {
            throw Flatten.Errors.ILLEGAL_PARAMETERS;
        }
        let vec = new Flatten.Vector(pt1, pt2);
        let unit = vec.normalize();
        return unit.rotate90CCW();
    }
}
Flatten.Line = Line;
/**
 * Function to create line equivalent to "new" constructor
 * @param args
 */
const line = (...args) => new Flatten.Line(...args);
Flatten.line = line;

/**
 * Created by Alex Bol on 3/6/2017.
 */

/**
 * Class representing a circle
 * @type {Circle}
 */
class Circle {
    /**
     *
     * @param {Point} pc - circle center point
     * @param {number} r - circle radius
     */
    constructor(...args) {
        /**
         * Circle center
         * @type {Point}
         */
        this.pc = new Flatten.Point();
        /**
         * Circle radius
         * @type {number}
         */
        this.r = 1;

        if (args.length == 1 && args[0] instanceof Object && args[0].name === "circle") {
            let {pc, r} = args[0];
            this.pc = new Flatten.Point(pc);
            this.r = r;
            return;
        } else {
            let [pc, r] = [...args];
            if (pc && pc instanceof Flatten.Point) this.pc = pc.clone();
            if (r !== undefined) this.r = r;
            return;
        }

        throw Flatten.Errors.ILLEGAL_PARAMETERS;
    }

    /**
     * Return new cloned instance of circle
     * @returns {Circle}
     */
    clone() {
        return new Flatten.Circle(this.pc.clone(), this.r);
    }

    /**
     * Circle center
     * @returns {Point}
     */
    get center() {
        return this.pc;
    }

    /**
     * Circle bounding box
     * @returns {Box}
     */
    get box() {
        return new Flatten.Box(
            this.pc.x - this.r,
            this.pc.y - this.r,
            this.pc.x + this.r,
            this.pc.y + this.r
        );
    }

    /**
     * Return true if circle contains shape: no point of shape lies outside of the circle
     * @param {Shape} shape - test shape
     * @returns {boolean}
     */
    contains(shape) {
        if (shape instanceof Flatten.Point) {
            return Flatten.Utils.LE(shape.distanceTo(this.center)[0], this.r);
        }

        if (shape instanceof Flatten.Segment) {
            return Flatten.Utils.LE(shape.start.distanceTo(this.center)[0], this.r) &&
                Flatten.Utils.LE(shape.end.distanceTo(this.center)[0], this.r);
        }

        if (shape instanceof Flatten.Arc) {
            return this.intersect(shape).length === 0 &&
                Flatten.Utils.LE(shape.start.distanceTo(this.center)[0], this.r) &&
                Flatten.Utils.LE(shape.end.distanceTo(this.center)[0], this.r);
        }

        if (shape instanceof Flatten.Circle) {
            return this.intersect(shape).length === 0 &&
                Flatten.Utils.LE(shape.r, this.r) &&
                Flatten.Utils.LE(shape.center.distanceTo(this.center)[0], this.r);
        }

        /* TODO: box, polygon */
    }

    /**
     * Transform circle to closed arc
     * @param {boolean} counterclockwise
     * @returns {Arc}
     */
    toArc(counterclockwise = true) {
        return new Flatten.Arc(this.center, this.r, Math.PI, -Math.PI, counterclockwise);
    }

    /**
     * Returns array of intersection points between circle and other shape
     * @param {Shape} shape Shape of the one of supported types
     * @returns {Point[]}
     */
    intersect(shape) {
        if (shape instanceof Flatten.Point) {
            return this.contains(shape) ? [shape] : [];
        }
        if (shape instanceof Flatten.Line) {
            return intersectLine2Circle(shape, this);
        }

        if (shape instanceof Flatten.Segment) {
            return intersectSegment2Circle(shape, this);
        }

        if (shape instanceof Flatten.Circle) {
            return intersectCircle2Circle(shape, this);
        }

        if (shape instanceof Flatten.Box) {
            return intersectCircle2Box(this, shape);
        }

        if (shape instanceof Flatten.Arc) {
            return intersectArc2Circle(shape, this);
        }
        if (shape instanceof Flatten.Polygon) {
            return intersectCircle2Polygon(this, shape);
        }
    }

    /**
     * Calculate distance and shortest segment from circle to shape and return array [distance, shortest segment]
     * @param {Shape} shape Shape of the one of supported types Point, Line, Circle, Segment, Arc, Polygon or Planar Set
     * @returns {number} distance from circle to shape
     * @returns {Segment} shortest segment between circle and shape (started at circle, ended at shape)

     */
    distanceTo(shape) {
        if (shape instanceof Flatten.Point) {
            let [distance, shortest_segment] = Flatten.Distance.point2circle(shape, this);
            shortest_segment = shortest_segment.reverse();
            return [distance, shortest_segment];
        }

        if (shape instanceof Flatten.Circle) {
            let [distance, shortest_segment] = Flatten.Distance.circle2circle(this, shape);
            return [distance, shortest_segment];
        }

        if (shape instanceof Flatten.Line) {
            let [distance, shortest_segment] = Flatten.Distance.circle2line(this, shape);
            return [distance, shortest_segment];
        }

        if (shape instanceof Flatten.Segment) {
            let [distance, shortest_segment] = Flatten.Distance.segment2circle(shape, this);
            shortest_segment = shortest_segment.reverse();
            return [distance, shortest_segment];
        }

        if (shape instanceof Flatten.Arc) {
            let [distance, shortest_segment] = Flatten.Distance.arc2circle(shape, this);
            shortest_segment = shortest_segment.reverse();
            return [distance, shortest_segment];
        }

        if (shape instanceof Flatten.Polygon) {
            let [distance, shortest_segment] = Flatten.Distance.shape2polygon(this, shape);
            return [distance, shortest_segment];
        }

        if (shape instanceof Flatten.PlanarSet) {
            let [dist, shortest_segment] = Flatten.Distance.shape2planarSet(this, shape);
            return [dist, shortest_segment];
        }
    }

    /**
     * This method returns an object that defines how data will be
     * serialized when called JSON.stringify() method
     * @returns {Object}
     */
    toJSON() {
        return Object.assign({}, this, {name: "circle"});
    }

    /**
     * Return string to draw circle in svg
     * @param {Object} attrs - an object with attributes of svg circle element,
     * like "stroke", "strokeWidth", "fill" <br/>
     * Defaults are stroke:"black", strokeWidth:"1", fill:"none"
     * @returns {string}
     */
    svg(attrs = {}) {
        let {stroke, strokeWidth, fill, fillOpacity, id, className} = attrs;
        // let rest_str = Object.keys(rest).reduce( (acc, key) => acc += ` ${key}="${rest[key]}"`, "");
        let id_str = (id && id.length > 0) ? `id="${id}"` : "";
        let class_str = (className && className.length > 0) ? `class="${className}"` : "";

        return `\n<circle cx="${this.pc.x}" cy="${this.pc.y}" r="${this.r}" stroke="${stroke || "black"}" stroke-width="${strokeWidth || 1}" fill="${fill || "none"}" fill-opacity="${fillOpacity || 1.0}" ${id_str} ${class_str} />`;
    }

}
Flatten.Circle = Circle;
/**
 * Shortcut to create new circle
 * @param args
 */
const circle = (...args) => new Flatten.Circle(...args);
Flatten.circle = circle;

/**
 * Created by Alex Bol on 3/10/2017.
 */

/**
 * Class representing a circular arc
 * @type {Arc}
 */
class Arc {
    /**
     *
     * @param {Point} pc - arc center
     * @param {number} r - arc radius
     * @param {number} startAngle - start angle in radians from 0 to 2*PI
     * @param {number} endAngle - end angle in radians from 0 to 2*PI
     * @param {boolean} counterClockwise - arc direction, true - clockwise, false - counter clockwise
     */
    constructor(...args) {
        /**
         * Arc center
         * @type {Point}
         */
        this.pc = new Flatten.Point();
        /**
         * Arc radius
         * @type {number}
         */
        this.r = 1;
        /**
         * Arc start angle in radians
         * @type {number}
         */
        this.startAngle = 0;
        /**
         * Arc end angle in radians
         * @type {number}
         */
        this.endAngle = 2 * Math.PI;
        /**
         * Arc orientation
         * @type {boolean}
         */
        this.counterClockwise = Flatten.CCW;

        if (args.length == 0)
            return;

        if (args.length == 1 && args[0] instanceof Object && args[0].name === "arc") {
            let {pc, r, startAngle, endAngle, counterClockwise} = args[0];
            this.pc = new Flatten.Point(pc.x, pc.y);
            this.r = r;
            this.startAngle = startAngle;
            this.endAngle = endAngle;
            this.counterClockwise = counterClockwise;
            return;
        } else {
            let [pc, r, startAngle, endAngle, counterClockwise] = [...args];
            if (pc && pc instanceof Flatten.Point) this.pc = pc.clone();
            if (r !== undefined) this.r = r;
            if (startAngle !== undefined) this.startAngle = startAngle;
            if (endAngle !== undefined) this.endAngle = endAngle;
            if (counterClockwise !== undefined) this.counterClockwise = counterClockwise;
            return;
        }

        throw Flatten.Errors.ILLEGAL_PARAMETERS;
    }

    /**
     * Return new cloned instance of arc
     * @returns {Arc}
     */
    clone() {
        return new Flatten.Arc(this.pc.clone(), this.r, this.startAngle, this.endAngle, this.counterClockwise);
    }

    /**
     * Get sweep angle in radians. Sweep angle is non-negative number from 0 to 2*PI
     * @returns {number}
     */
    get sweep() {
        if (Flatten.Utils.EQ(this.startAngle, this.endAngle))
            return 0.0;
        if (Flatten.Utils.EQ(Math.abs(this.startAngle - this.endAngle), Flatten.PIx2)) {
            return Flatten.PIx2;
        }
        let sweep;
        if (this.counterClockwise) {
            sweep = Flatten.Utils.GT(this.endAngle, this.startAngle) ?
                this.endAngle - this.startAngle : this.endAngle - this.startAngle + Flatten.PIx2;
        } else {
            sweep = Flatten.Utils.GT(this.startAngle, this.endAngle) ?
                this.startAngle - this.endAngle : this.startAngle - this.endAngle + Flatten.PIx2;
        }

        if (Flatten.Utils.GT(sweep, Flatten.PIx2)) {
            sweep -= Flatten.PIx2;
        }
        if (Flatten.Utils.LT(sweep, 0)) {
            sweep += Flatten.PIx2;
        }
        return sweep;
    }

    /**
     * Get start point of arc
     * @returns {Point}
     */
    get start() {
        let p0 = new Flatten.Point(this.pc.x + this.r, this.pc.y);
        return p0.rotate(this.startAngle, this.pc);
    }

    /**
     * Get end point of arc
     * @returns {Point}
     */
    get end() {
        let p0 = new Flatten.Point(this.pc.x + this.r, this.pc.y);
        return p0.rotate(this.endAngle, this.pc);
    }

    /**
     * Get center of arc
     * @returns {Point}
     */
    get center() {
        return this.pc.clone();
    }

    get vertices() {
        return [this.start.clone(), this.end.clone()];
    }

    /**
     * Get arc length
     * @returns {number}
     */
    get length() {
        return Math.abs(this.sweep * this.r);
    }

    /**
     * Get bounding box of the arc
     * @returns {Box}
     */
    get box() {
        let func_arcs = this.breakToFunctional();
        let box = func_arcs.reduce((acc, arc) => acc.merge(arc.start.box), new Flatten.Box());
        box = box.merge(this.end.box);
        return box;
    }

    /**
     * Returns true if arc contains point, false otherwise
     * @param {Point} pt - point to test
     * @returns {boolean}
     */
    contains(pt) {
        // first check if  point on circle (pc,r)
        if (!Flatten.Utils.EQ(this.pc.distanceTo(pt)[0], this.r))
            return false;

        // point on circle

        if (pt.equalTo(this.start))
            return true;

        let angle = new Flatten.Vector(this.pc, pt).slope;
        let test_arc = new Flatten.Arc(this.pc, this.r, this.startAngle, angle, this.counterClockwise);
        return Flatten.Utils.LE(test_arc.length, this.length);
    }

    /**
     * When given point belongs to arc, return array of two arcs split by this point. If points is incident
     * to start or end point of the arc, return clone of the arc. If point does not belong to the arcs, return
     * empty array.
     * @param {Point} pt Query point
     * @returns {Arc[]}
     */
    split(pt) {
        if (this.start.equalTo(pt))
            return [null, this.clone()];

        if (this.end.equalTo(pt))
            return [this.clone(), null];

        let angle = new Flatten.Vector(this.pc, pt).slope;

        return [
            new Flatten.Arc(this.pc, this.r, this.startAngle, angle, this.counterClockwise),
            new Flatten.Arc(this.pc, this.r, angle, this.endAngle, this.counterClockwise)
        ]
    }

    /**
     * Return middle point of the arc
     * @returns {Point}
     */
    middle() {
        let endAngle = this.counterClockwise ? this.startAngle + this.sweep / 2 : this.startAngle - this.sweep / 2;
        let arc = new Flatten.Arc(this.pc, this.r, this.startAngle, endAngle, this.counterClockwise);
        return arc.end;
    }

    /**
     * Returns chord height ("sagitta") of the arc
     * @returns {number}
     */
    chordHeight() {
        return (1.0 - Math.cos(Math.abs(this.sweep / 2.0))) * this.r;
    }

    /**
     * Returns array of intersection points between arc and other shape
     * @param {Shape} shape Shape of the one of supported types <br/>
     * @returns {Points[]}
     */
    intersect(shape) {
        if (shape instanceof Flatten.Point) {
            return this.contains(shape) ? [shape] : [];
        }
        if (shape instanceof Flatten.Line) {
            return intersectLine2Arc(shape, this);
        }
        if (shape instanceof Flatten.Circle) {
            return intersectArc2Circle(this, shape);
        }
        if (shape instanceof Flatten.Segment) {
            return intersectSegment2Arc(shape, this);
        }
        if (shape instanceof Flatten.Box) {
            return intersectArc2Box(this, shape);
        }
        if (shape instanceof Flatten.Arc) {
            return intersectArc2Arc(this, shape);
        }
        if (shape instanceof Flatten.Polygon) {
            return intersectArc2Polygon(this, shape);
        }
    }

    /**
     * Calculate distance and shortest segment from arc to shape and return array [distance, shortest segment]
     * @param {Shape} shape Shape of the one of supported types Point, Line, Circle, Segment, Arc, Polygon or Planar Set
     * @returns {number} distance from arc to shape
     * @returns {Segment} shortest segment between arc and shape (started at arc, ended at shape)

     */
    distanceTo(shape) {
        if (shape instanceof Flatten.Point) {
            let [dist, shortest_segment] = Flatten.Distance.point2arc(shape, this);
            shortest_segment = shortest_segment.reverse();
            return [dist, shortest_segment];
        }

        if (shape instanceof Flatten.Circle) {
            let [dist, shortest_segment] = Flatten.Distance.arc2circle(this, shape);
            return [dist, shortest_segment];
        }

        if (shape instanceof Flatten.Line) {
            let [dist, shortest_segment] = Flatten.Distance.arc2line(this, shape);
            return [dist, shortest_segment];
        }

        if (shape instanceof Flatten.Segment) {
            let [dist, shortest_segment] = Flatten.Distance.segment2arc(shape, this);
            shortest_segment = shortest_segment.reverse();
            return [dist, shortest_segment];
        }

        if (shape instanceof Flatten.Arc) {
            let [dist, shortest_segment] = Flatten.Distance.arc2arc(this, shape);
            return [dist, shortest_segment];
        }

        if (shape instanceof Flatten.Polygon) {
            let [dist, shortest_segment] = Flatten.Distance.shape2polygon(this, shape);
            return [dist, shortest_segment];
        }

        if (shape instanceof Flatten.PlanarSet) {
            let [dist, shortest_segment] = Flatten.Distance.shape2planarSet(this, shape);
            return [dist, shortest_segment];
        }
    }

    /**
     * Breaks arc in extreme point 0, pi/2, pi, 3*pi/2 and returns array of sub-arcs
     * @returns {Arcs[]}
     */
    breakToFunctional() {
        let func_arcs_array = [];
        let angles = [0, Math.PI / 2, 2 * Math.PI / 2, 3 * Math.PI / 2];
        let pts = [
            this.pc.translate(this.r, 0),
            this.pc.translate(0, this.r),
            this.pc.translate(-this.r, 0),
            this.pc.translate(0, -this.r)
        ];

        // If arc contains extreme point,
        // create test arc started at start point and ended at this extreme point
        let test_arcs = [];
        for (let i = 0; i < 4; i++) {
            if (pts[i].on(this)) {
                test_arcs.push(new Flatten.Arc(this.pc, this.r, this.startAngle, angles[i], this.counterClockwise));
            }
        }

        if (test_arcs.length == 0) {                  // arc does contain any extreme point
            func_arcs_array.push(this.clone());
        } else {                                        // arc passes extreme point
            // sort these arcs by length
            test_arcs.sort((arc1, arc2) => arc1.length - arc2.length);

            for (let i = 0; i < test_arcs.length; i++) {
                let prev_arc = func_arcs_array.length > 0 ? func_arcs_array[func_arcs_array.length - 1] : undefined;
                let new_arc;
                if (prev_arc) {
                    new_arc = new Flatten.Arc(this.pc, this.r, prev_arc.endAngle, test_arcs[i].endAngle, this.counterClockwise);
                } else {
                    new_arc = new Flatten.Arc(this.pc, this.r, this.startAngle, test_arcs[i].endAngle, this.counterClockwise);
                }
                if (!Flatten.Utils.EQ_0(new_arc.length)) {
                    func_arcs_array.push(new_arc.clone());
                }
            }

            // add last sub arc
            let prev_arc = func_arcs_array.length > 0 ? func_arcs_array[func_arcs_array.length - 1] : undefined;
            let new_arc;
            if (prev_arc) {
                new_arc = new Flatten.Arc(this.pc, this.r, prev_arc.endAngle, this.endAngle, this.counterClockwise);
            } else {
                new_arc = new Flatten.Arc(this.pc, this.r, this.startAngle, this.endAngle, this.counterClockwise);
            }
            // It could be 2*PI when occasionally start = 0 and end = 2*PI but this is not valid for breakToFunctional
            if (!Flatten.Utils.EQ_0(new_arc.length) && !Flatten.Utils.EQ(new_arc.sweep, 2*Math.PI)) {
                func_arcs_array.push(new_arc.clone());
            }
        }
        return func_arcs_array;
    }

    /**
     * Return tangent unit vector in the start point in the direction from start to end
     * @returns {Vector}
     */
    tangentInStart() {
        let vec = new Flatten.Vector(this.pc, this.start);
        let angle = this.counterClockwise ? Math.PI / 2. : -Math.PI / 2.;
        let tangent = vec.rotate(angle).normalize();
        return tangent;
    }

    /**
     * Return tangent unit vector in the end point in the direction from end to start
     * @returns {Vector}
     */
    tangentInEnd() {
        let vec = new Flatten.Vector(this.pc, this.end);
        let angle = this.counterClockwise ? -Math.PI / 2. : Math.PI / 2.;
        let tangent = vec.rotate(angle).normalize();
        return tangent;
    }

    /**
     * Returns new arc with swapped start and end angles and reversed direction
     * @returns {Arc}
     */
    reverse() {
        return new Flatten.Arc(this.pc, this.r, this.endAngle, this.startAngle, !this.counterClockwise);
    }

    /**
     * Returns new arc translated by vector vec
     * @param {Vector} vec
     * @returns {Segment}
     */
    translate(...args) {
        let arc = this.clone();
        arc.pc = this.pc.translate(...args);
        return arc;
    }

    /**
     * Return new segment rotated by given angle around given point
     * If point omitted, rotate around origin (0,0)
     * Positive value of angle defines rotation counter clockwise, negative - clockwise
     * @param {number} angle - rotation angle in radians
     * @param {Point} center - center point, default is (0,0)
     * @returns {Arc}
     */
    rotate(angle = 0, center = new Flatten.Point()) {
        let m = new Flatten.Matrix();
        m = m.translate(center.x, center.y).rotate(angle).translate(-center.x, -center.y);
        return this.transform(m);
    }

    /**
     * Return new arc transformed using affine transformation matrix <br/>
     * Note, that non-equal scaling by x and y (matrix[0] != matrix[3]) produce illegal result
     * TODO: support non-equal scaling arc to ellipse or throw exception ?
     * @param {Matrix} matrix - affine transformation matrix
     * @returns {Arc}
     */
    transform(matrix = new Flatten.Matrix()) {
        let newStart = this.start.transform(matrix);
        let newEnd = this.end.transform(matrix);
        let newCenter = this.pc.transform(matrix);
        let arc = Flatten.Arc.arcSE(newCenter, newStart, newEnd, this.counterClockwise);
        return arc;
    }

    static arcSE(center, start, end, counterClockwise) {
        let {vector} = Flatten;
        let startAngle = vector(center, start).slope;
        let endAngle = vector(center, end).slope;
        if (Flatten.Utils.EQ(startAngle, endAngle)) {
            endAngle += 2 * Math.PI;
            counterClockwise = true;
        }
        let r = vector(center, start).length;

        return new Flatten.Arc(center, r, startAngle, endAngle, counterClockwise);
    }

    definiteIntegral(ymin = 0) {
        let f_arcs = this.breakToFunctional();
        let area = f_arcs.reduce((acc, arc) => acc + arc.circularSegmentDefiniteIntegral(ymin), 0.0);
        return area;
    }

    circularSegmentDefiniteIntegral(ymin) {
        let line = new Flatten.Line(this.start, this.end);
        let onLeftSide = this.pc.leftTo(line);
        let segment = new Flatten.Segment(this.start, this.end);
        let areaTrapez = segment.definiteIntegral(ymin);
        let areaCircularSegment = this.circularSegmentArea();
        let area = onLeftSide ? areaTrapez - areaCircularSegment : areaTrapez + areaCircularSegment;
        return area;
    }

    circularSegmentArea() {
        return (0.5 * this.r * this.r * (this.sweep - Math.sin(this.sweep)))
    }

    /**
     * Sort given array of points from arc start to end, assuming all points lay on the arc
     * @param {Point[]} array of points
     * @returns {Point[]} new array sorted
     */
    sortPoints(pts) {
        let {vector} = Flatten;
        return pts.slice().sort( (pt1, pt2) => {
            let slope1 = vector(this.pc, pt1).slope;
            let slope2 = vector(this.pc, pt2).slope;
            if (slope1 < slope2) {
                return -1;
            }
            if (slope1 > slope2) {
                return 1;
            }
            return 0;
        })
    }

    /**
     * This method returns an object that defines how data will be
     * serialized when called JSON.stringify() method
     * @returns {Object}
     */
    toJSON() {
        return Object.assign({}, this, {name: "arc"});
    }

    /**
     * Return string to draw arc in svg
     * @param {Object} attrs - an object with attributes of svg path element,
     * like "stroke", "strokeWidth", "fill" <br/>
     * Defaults are stroke:"black", strokeWidth:"1", fill:"none"
     * @returns {string}
     */
    svg(attrs = {}) {
        let largeArcFlag = this.sweep <= Math.PI ? "0" : "1";
        let sweepFlag = this.counterClockwise ? "1" : "0";
        let {stroke, strokeWidth, fill, id, className} = attrs;
        // let rest_str = Object.keys(rest).reduce( (acc, key) => acc += ` ${key}="${rest[key]}"`, "");
        let id_str = (id && id.length > 0) ? `id="${id}"` : "";
        let class_str = (className && className.length > 0) ? `class="${className}"` : "";

        if (Flatten.Utils.EQ(this.sweep, 2 * Math.PI)) {
            let circle = new Flatten.Circle(this.pc, this.r);
            return circle.svg(attrs);
        } else {
            return `\n<path d="M${this.start.x},${this.start.y}
                             A${this.r},${this.r} 0 ${largeArcFlag},${sweepFlag} ${this.end.x},${this.end.y}"
                    stroke="${stroke || "black"}" stroke-width="${strokeWidth || 1}" fill="${fill || "none"}" ${id_str} ${class_str} />`
        }
    }

}
Flatten.Arc = Arc;
/**
 * Function to create arc equivalent to "new" constructor
 * @param args
 */
const arc = (...args) => new Flatten.Arc(...args);
Flatten.arc = arc;

/**
 * Created by Alex Bol on 3/7/2017.
 */

/**
 * Class Box represent bounding box of the shape
 * @type {Box}
 */
class Box {
    /**
     *
     * @param {number} xmin - minimal x coordinate
     * @param {number} ymin - minimal y coordinate
     * @param {number} xmax - maximal x coordinate
     * @param {number} ymax - maximal y coordinate
     */
    constructor(xmin = undefined, ymin = undefined, xmax = undefined, ymax = undefined) {
        /**
         * Minimal x coordinate
         * @type {number}
         */
        this.xmin = xmin;
        /**
         * Minimal y coordinate
         * @type {number}
         */
        this.ymin = ymin;
        /**
         * Maximal x coordinate
         * @type {number}
         */
        this.xmax = xmax;
        /**
         * Maximal y coordinate
         * @type {number}
         */
        this.ymax = ymax;
    }

    /**
     * Return new cloned instance of box
     * @returns {Box}
     */
    clone() {
        return new Box(this.xmin, this.ymin, this.xmax, this.ymax);
    }

    /**
     * Property low need for interval tree interface
     * @returns {Point}
     */
    get low() {
        return new Flatten.Point(this.xmin, this.ymin);
    }

    /**
     * Property high need for interval tree interface
     * @returns {Point}
     */
    get high() {
        return new Flatten.Point(this.xmax, this.ymax);
    }

    /**
     * Property max returns the box itself !
     * @returns {Box}
     */
    get max() {
        return this.clone();
    }

    /**
     * Return center of the box
     * @returns {Point}
     */
    get center() {
        return new Flatten.Point((this.xmin + this.xmax) / 2, (this.ymin + this.ymax) / 2);
    }

    /**
     * Return property box like all other shapes
     * @returns {Box}
     */
    get box() {
        return this.clone();
    }

    /**
     * Returns true if not intersected with other box
     * @param {Box} other_box - other box to test
     * @returns {boolean}
     */
    not_intersect(other_box) {
        return (
            this.xmax < other_box.xmin ||
            this.xmin > other_box.xmax ||
            this.ymax < other_box.ymin ||
            this.ymin > other_box.ymax
        );
    }

    /**
     * Returns true if intersected with other box
     * @param {Box} other_box - Query box
     * @returns {boolean}
     */
    intersect(other_box) {
        return !this.not_intersect(other_box);
    }

    /**
     * Returns new box merged with other box
     * @param {Box} other_box - Other box to merge with
     * @returns {Box}
     */
    merge(other_box) {
        return new Box(
            this.xmin === undefined ? other_box.xmin : Math.min(this.xmin, other_box.xmin),
            this.ymin === undefined ? other_box.ymin : Math.min(this.ymin, other_box.ymin),
            this.xmax === undefined ? other_box.xmax : Math.max(this.xmax, other_box.xmax),
            this.ymax === undefined ? other_box.ymax : Math.max(this.ymax, other_box.ymax)
        );
    }

    /**
     * Defines predicate "less than" between two boxes. Need for interval index
     * @param {Box} other_box - other box
     * @returns {boolean} - true if this box less than other box, false otherwise
     */
    less_than(other_box) {
        if (this.low.lessThan(other_box.low))
            return true;
        if (this.low.equalTo(other_box.low) && this.high.lessThan(other_box.high))
            return true;
        return false;
    }

    /**
     * Returns true if this box is equal to other box, false otherwise
     * @param {Box} other_box - query box
     * @returns {boolean}
     */
    equal_to(other_box) {
        return (this.low.equalTo(other_box.low) && this.high.equalTo(other_box.high));
    }

    output() {
        return this.clone();
    }

    static comparable_max(box1, box2) {
        // return pt1.lessThan(pt2) ? pt2.clone() : pt1.clone();
        return box1.merge(box2);
    }

    static comparable_less_than(pt1, pt2) {
        return pt1.lessThan(pt2);
    }

    /**
     * Set new values to the box object
     * @param {number} xmin - miminal x coordinate
     * @param {number} ymin - minimal y coordinate
     * @param {number} xmax - maximal x coordinate
     * @param {number} ymax - maximal y coordinate
     */
    set(xmin, ymin, xmax, ymax) {
        this.xmin = xmin;
        this.ymin = ymin;
        this.xmax = xmax;
        this.ymax = ymax;
    }

    /**
     * Transform box into array of points from low left corner in counter clockwise
     * @returns {Point[]}
     */
    toPoints() {
        return [
            new Flatten.Point(this.xmin, this.ymin),
            new Flatten.Point(this.xmax, this.ymin),
            new Flatten.Point(this.xmax, this.ymax),
            new Flatten.Point(this.xmin, this.ymax)
        ];
    }

    /**
     * Transform box into array of segments from low left corner in counter clockwise
     * @returns {Segment[]}
     */
    toSegments() {
        let pts = this.toPoints();
        return [
            new Flatten.Segment(pts[0], pts[1]),
            new Flatten.Segment(pts[1], pts[2]),
            new Flatten.Segment(pts[2], pts[3]),
            new Flatten.Segment(pts[3], pts[0])
        ];
    }

    /**
     * Return string to draw circle in svg
     * @param {Object} attrs - an object with attributes of svg rectangle element,
     * like "stroke", "strokeWidth", "fill" <br/>
     * Defaults are stroke:"black", strokeWidth:"1", fill:"none"
     * @returns {string}
     */
    svg(attrs = {}) {
        let {stroke, strokeWidth, fill, id, className} = attrs;
        // let rest_str = Object.keys(rest).reduce( (acc, key) => acc += ` ${key}="${rest[key]}"`, "");
        let id_str = (id && id.length > 0) ? `id="${id}"` : "";
        let class_str = (className && className.length > 0) ? `class="${className}"` : "";
        let width = this.xmax - this.xmin;
        let height = this.ymax - this.ymin;

        return `\n<rect x="${this.xmin}" y="${this.ymin}" width=${width} height=${height} stroke="${stroke || "black"}" stroke-width="${strokeWidth || 1}" fill="${fill || "none"}" ${id_str} ${class_str} />`;
    };
}
Flatten.Box = Box;
/**
 * Shortcut to create new circle
 * @param args
 * @returns {Box}
 */
const box = (...args) => new Flatten.Box(...args);
Flatten.box = box;

/**
 * Created by Alex Bol on 3/17/2017.
 */

/**
 * Class representing an edge of polygon. Edge shape may be Segment or Arc.
 * Each edge contains references to the next and previous edges in the face of the polygon.
 *
 * @type {Edge}
 */
class Edge {
    /**
     * Construct new instance of edge
     * @param {Shape} shape Shape of type Segment or Arc
     */
    constructor(shape) {
        /**
         * Shape of the edge: Segment or Arc
         * @type {Segment|Arc}
         */
        this.shape = shape;
        /**
         * Pointer to the next edge in the face
         * @type {Edge}
         */
        this.next = undefined;
        /**
         * Pointer to the previous edge in the face
         * @type {Edge}
         */
        this.prev = undefined;
        /**
         * Pointer to the face containing this edge
         * @type {Face}
         */
        this.face = undefined;
        /**
         * "Arc distance" from the face start
         * @type {number}
         */
        this.arc_length = 0;
        /**
         * Start inclusion flag (inside/outside/boundary)
         * @type {*}
         */
        this.bvStart = undefined;
        /**
         * End inclusion flag (inside/outside/boundary)
         * @type {*}
         */
        this.bvEnd = undefined;
        /**
         * Edge inclusion flag (Flatten.INSIDE, Flatten.OUTSIDE, Flatten.BOUNDARY)
         * @type {*}
         */
        this.bv = undefined;
        /**
         * Overlap flag for boundary edge (Flatten.OVERLAP_SAME/Flatten.OVERLAP_OPPOSITE)
         * @type {*}
         */
        this.overlap = undefined;
    }

    /**
     * Get edge start point
     */
    get start() {
        return this.shape.start;
    }

    /**
     * Get edge end point
     */
    get end() {
        return this.shape.end;
    }

    /**
     * Get edge length
     */
    get length() {
        return this.shape.length;
    }

    /**
     * Get bounding box of the edge
     * @returns {Box}
     */
    get box() {
        return this.shape.box;
    }

    isSegment() {
        return this.shape instanceof Flatten.Segment;
    }

    isArc() {
        return this.shape instanceof Flatten.Arc;
    }

    /**
     * Get middle point of the edge
     * @returns {Point}
     */
    middle() {
        return this.shape.middle();
    }

    /**
     * Returns true if point belongs to the edge, false otherwise
     * @param {Point} pt - test point
     */
    contains(pt) {
        return this.shape.contains(pt);
    }

    /**
     * Set inclusion flag of the edge with respect to another polygon
     * Inclusion flag is one of Flatten.INSIDE, Flatten.OUTSIDE, Flatten.BOUNDARY
     * @param polygon
     */
    setInclusion(polygon) {
        if (this.bv !== undefined) return this.bv;

        if (this.shape instanceof Flatten.Line || this.shape instanceof Flatten.Ray) {
            this.bv = Flatten.OUTSIDE;
            return this.bv;
        }

        if (this.bvStart === undefined) {
            this.bvStart = ray_shoot(polygon, this.start);
        }
        if (this.bvEnd === undefined) {
            this.bvEnd = ray_shoot(polygon, this.end);
        }
        /* At least one end outside - the whole edge outside */
        if (this.bvStart === Flatten.OUTSIDE || this.bvEnd == Flatten.OUTSIDE) {
            this.bv = Flatten.OUTSIDE;
        }
        /* At least one end inside - the whole edge inside */
        else if (this.bvStart === Flatten.INSIDE || this.bvEnd == Flatten.INSIDE) {
            this.bv = Flatten.INSIDE;
        }
        /* Both are boundary - check the middle point */
        else {
            let bvMiddle = ray_shoot(polygon, this.middle());
            // let boundary = this.middle().distanceTo(polygon)[0] < 10*Flatten.DP_TOL;
            // let bvMiddle = boundary ? Flatten.BOUNDARY : ray_shoot(polygon, this.middle());
            this.bv = bvMiddle;
        }
        return this.bv;
    }

    /**
     * Set overlapping between two coincident boundary edges
     * Overlapping flag is one of Flatten.OVERLAP_SAME or Flatten.OVERLAP_OPPOSITE
     * @param edge
     */
    setOverlap(edge) {
        let flag = undefined;
        let shape1 = this.shape;
        let shape2 = edge.shape;

        if (shape1 instanceof Flatten.Segment && shape2 instanceof Flatten.Segment) {
            if (shape1.start.equalTo(shape2.start) && shape1.end.equalTo(shape2.end)) {
                flag = Flatten.OVERLAP_SAME;
            } else if (shape1.start.equalTo(shape2.end) && shape1.end.equalTo(shape2.start)) {
                flag = Flatten.OVERLAP_OPPOSITE;
            }
        } else if (shape1 instanceof Flatten.Arc && shape2 instanceof Flatten.Arc) {
            if (shape1.start.equalTo(shape2.start) && shape1.end.equalTo(shape2.end) && /*shape1.counterClockwise === shape2.counterClockwise &&*/
                shape1.middle().equalTo(shape2.middle())) {
                flag = Flatten.OVERLAP_SAME;
            } else if (shape1.start.equalTo(shape2.end) && shape1.end.equalTo(shape2.start) && /*shape1.counterClockwise !== shape2.counterClockwise &&*/
                shape1.middle().equalTo(shape2.middle())) {
                flag = Flatten.OVERLAP_OPPOSITE;
            }
        } else if (shape1 instanceof Flatten.Segment && shape2 instanceof Flatten.Arc ||
            shape1 instanceof Flatten.Arc && shape2 instanceof Flatten.Segment) {
            if (shape1.start.equalTo(shape2.start) && shape1.end.equalTo(shape2.end) && shape1.middle().equalTo(shape2.middle())) {
                flag = Flatten.OVERLAP_SAME;
            } else if (shape1.start.equalTo(shape2.end) && shape1.end.equalTo(shape2.start) && shape1.middle().equalTo(shape2.middle())) {
                flag = Flatten.OVERLAP_OPPOSITE;
            }
        }

        /* Do not update overlap flag if already set on previous chain */
        if (this.overlap === undefined) this.overlap = flag;
        if (edge.overlap === undefined) edge.overlap = flag;
    }

    svg() {
        if (this.shape instanceof Flatten.Segment) {
            return ` L${this.shape.end.x},${this.shape.end.y}`;
        } else if (this.shape instanceof Flatten.Arc) {
            let arc = this.shape;
            let largeArcFlag;
            let sweepFlag = arc.counterClockwise ? "1" : "0";

            // Draw full circe arc as special case: split it into two half-circles
            if (Flatten.Utils.EQ(arc.sweep, 2 * Math.PI)) {
                let sign = arc.counterClockwise ? 1 : -1;
                let halfArc1 = new Flatten.Arc(arc.pc, arc.r, arc.startAngle, arc.startAngle + sign * Math.PI, arc.counterClockwise);
                let halfArc2 = new Flatten.Arc(arc.pc, arc.r, arc.startAngle + sign * Math.PI, arc.endAngle, arc.counterClockwise);

                largeArcFlag = "0";

                return ` A${halfArc1.r},${halfArc1.r} 0 ${largeArcFlag},${sweepFlag} ${halfArc1.end.x},${halfArc1.end.y}
                    A${halfArc2.r},${halfArc2.r} 0 ${largeArcFlag},${sweepFlag} ${halfArc2.end.x},${halfArc2.end.y}`
            } else {
                largeArcFlag = arc.sweep <= Math.PI ? "0" : "1";

                return ` A${arc.r},${arc.r} 0 ${largeArcFlag},${sweepFlag} ${arc.end.x},${arc.end.y}`;
            }
        }
    }

    toJSON() {
        return this.shape.toJSON();
    }
}
Flatten.Edge = Edge;

/**
 * Class implements circular bidirectional linked list <br/>
 * LinkedListElement - object of any type that has properties next and prev.
 */
class CircularLinkedList extends LinkedList {
    constructor(first, last) {
        super(first, last);
        this.setCircularLinks();
    }

    setCircularLinks() {
        if (this.isEmpty()) return;
        this.last.next = this.first;
        this.first.prev = this.last;
    }

    [Symbol.iterator]() {
        let element = undefined;
        return {
            next: () => {
                let value = element ? element : this.first;
                let done = this.first ? (element ? element === this.first : false) : true;
                element = value ? value.next : undefined;
                return {value: value, done: done};
            }
        };
    };

    /**
     * Append new element to the end of the list
     * @param {LinkedListElement} element - new element to be appended
     * @returns {CircularLinkedList}
     */
    append(element) {
        super.append(element);
        this.setCircularLinks();
        return this;
    }

    /**
     * Insert new element to the list after elementBefore
     * @param {LinkedListElement} newElement - new element to be inserted
     * @param {LinkedListElement} elementBefore - element in the list to insert after it
     * @returns {CircularLinkedList}
     */
    insert(newElement, elementBefore) {
        super.insert(newElement, elementBefore);
        this.setCircularLinks();
        return this;
    }

    /**
     * Remove element from the list
     * @param {LinkedListElement} element - element to be removed from the list
     * @returns {CircularLinkedList}
     */
    remove(element) {
        super.remove(element);
        // this.setCircularLinks();
        return this;
    }
}

/**
 * Created by Alex Bol on 3/17/2017.
 */

/**
 * Class representing a face (closed loop) in a [polygon]{@link Flatten.Polygon} object.
 * Face is a circular bidirectional linked list of [edges]{@link Flatten.Edge}.
 * Face object cannot be instantiated with a constructor.
 * Instead, use [polygon.addFace()]{@link Flatten.Polygon#addFace} method.
 * <br/>
 * Note, that face only set entry point to the linked list of edges but does not contain edges by itself.
 * Container of edges is a property of the polygon object. <br/>
 *
 * @example
 * // Face implements "next" iterator which enables to iterate edges in for loop:
 * for (let edge of face) {
 *      console.log(edge.shape.length)     // do something
 * }
 *
 * // Instead, it is possible to iterate edges as linked list, starting from face.first:
 * let edge = face.first;
 * do {
 *   console.log(edge.shape.length);   // do something
 *   edge = edge.next;
 * } while (edge != face.first)
 */
class Face extends CircularLinkedList {
    constructor(polygon, ...args) {
        super();            // construct empty list of edges
        /**
         * Reference to the first edge in face
         */
        // this.first;
        /**
         * Reference to the last edge in face
         */
        // this.last;

        this._box = undefined;  // new Box();
        this._orientation = undefined;

        if (args.length == 0) {
            return;
        }

        /* If passed an array it supposed to be:
         1) array of shapes that performs close loop or
         2) array of points that performs set of vertices
         */
        if (args.length == 1) {
            if (args[0] instanceof Array) {
                // let argsArray = args[0];
                let shapes = args[0];  // argsArray[0];
                if (shapes.length == 0)
                    return;

                /* array of Flatten.Points */
                if (shapes.every((shape) => {return shape instanceof Flatten.Point})) {
                    let segments = Face.points2segments(shapes);
                    this.shapes2face(polygon.edges, segments);
                }
                /* array of points as pairs of numbers */
                else if (shapes.every((shape) => {return shape instanceof Array && shape.length === 2})) {
                    let points = shapes.map((shape) => new Flatten.Point(shape[0],shape[1]));
                    let segments = Face.points2segments(points);
                    this.shapes2face(polygon.edges, segments);
                }
                /* array of segments ot arcs */
                else if (shapes.every((shape) => {
                    return (shape instanceof Flatten.Segment || shape instanceof Flatten.Arc)
                })) {
                    this.shapes2face(polygon.edges, shapes);
                }
                // this is from JSON.parse object
                else if (shapes.every((shape) => {
                    return (shape.name === "segment" || shape.name === "arc")
                })) {
                    let flattenShapes = [];
                    for (let shape of shapes) {
                        let flattenShape;
                        if (shape.name === "segment") {
                            flattenShape = new Flatten.Segment(shape);
                        } else {
                            flattenShape = new Flatten.Arc(shape);
                        }
                        flattenShapes.push(flattenShape);
                    }
                    this.shapes2face(polygon.edges, flattenShapes);
                }
            }
            /* Create new face and copy edges into polygon.edges set */
            else if (args[0] instanceof Face) {
                let face = args[0];
                this.first = face.first;
                this.last = face.last;
                for (let edge of face) {
                    polygon.edges.add(edge);
                }
            }
            /* Instantiate face from a circle in CCW orientation */
            else if (args[0] instanceof Flatten.Circle) {
                this.shapes2face(polygon.edges, [args[0].toArc(Flatten.CCW)]);
            }
            /* Instantiate face from a box in CCW orientation */
            else if (args[0] instanceof Flatten.Box) {
                let box = args[0];
                this.shapes2face(polygon.edges, [
                    new Flatten.Segment(new Flatten.Point(box.xmin, box.ymin), new Flatten.Point(box.xmax, box.ymin)),
                    new Flatten.Segment(new Flatten.Point(box.xmax, box.ymin), new Flatten.Point(box.xmax, box.ymax)),
                    new Flatten.Segment(new Flatten.Point(box.xmax, box.ymax), new Flatten.Point(box.xmin, box.ymax)),
                    new Flatten.Segment(new Flatten.Point(box.xmin, box.ymax), new Flatten.Point(box.xmin, box.ymin))
                ]);
            }
        }
        /* If passed two edges, consider them as start and end of the face loop */
        /* THIS METHOD WILL BE USED BY BOOLEAN OPERATIONS */
        /* Assume that edges already copied to polygon.edges set in the clip algorithm !!! */
        if (args.length == 2 && args[0] instanceof Flatten.Edge && args[1] instanceof Flatten.Edge) {
            this.first = args[0];                          // first edge in face or undefined
            this.last = args[1];                           // last edge in face or undefined
            this.last.next = this.first;
            this.first.prev = this.last;

            // set arc length
            this.setArcLength();

            // this.box = this.getBox();
            // this.orientation = this.getOrientation();      // face direction cw or ccw
        }
    }

    /**
     * Return array of edges from first to last
     * @returns {Array}
     */
    get edges() {
        return this.toArray();
    }

    /**
     * Return array of shapes which comprise face
     * @returns {Array}
     */
    get shapes() {
        return this.edges.map(edge => edge.shape.clone());
    }

    /**
     * Return bounding box of the face
     * @returns {Box}
     */
    get box() {
        if (this._box === undefined) {
            let box = new Flatten.Box();
            for (let edge of this) {
                box = box.merge(edge.box);
            }
            this._box = box;
        }
        return this._box;
    }

    static points2segments(points) {
        let segments = [];
        for (let i = 0; i < points.length; i++) {
            // skip zero length segment
            if (points[i].equalTo(points[(i + 1) % points.length]))
                continue;
            segments.push(new Flatten.Segment(points[i], points[(i + 1) % points.length]));
        }
        return segments;
    }

    shapes2face(edges, shapes) {
        for (let shape of shapes) {
            let edge = new Flatten.Edge(shape);
            this.append(edge);
            // this.box = this.box.merge(shape.box);
            edges.add(edge);
        }
        // this.orientation = this.getOrientation();              // face direction cw or ccw
    }

    /**
     * Append edge after the last edge of the face (and before the first edge). <br/>
     * @param {Edge} edge - Edge to be appended to the linked list
     * @returns {Face}
     */
    append(edge) {
        super.append(edge);
        // set arc length
        this.setOneEdgeArcLength(edge);
        edge.face = this;
        // edges.add(edge);      // Add new edges into edges container
        return this;
    }

    /**
     * Insert edge newEdge into the linked list after the edge edgeBefore <br/>
     * @param {Edge} newEdge - Edge to be inserted into linked list
     * @param {Edge} edgeBefore - Edge to insert newEdge after it
     * @returns {Face}
     */
    insert(newEdge, edgeBefore) {
        super.insert(newEdge, edgeBefore);
        // set arc length
        this.setOneEdgeArcLength(newEdge);
        newEdge.face = this;
        return this;
    }

    /**
     * Remove the given edge from the linked list of the face <br/>
     * @param {Edge} edge - Edge to be removed
     * @returns {Face}
     */
    remove(edge) {
        super.remove(edge);
        // Recalculate arc length
        this.setArcLength();
        return this;
    }

    /**
     * Reverse orientation of the face: first edge become last and vice a verse,
     * all edges starts and ends swapped, direction of arcs inverted. If face was oriented
     * clockwise, it becomes counter clockwise and vice versa
     */
    reverse() {
        // collect edges in revert order with reverted shapes
        let edges = [];
        let edge_tmp = this.last;
        do {
            // reverse shape
            edge_tmp.shape = edge_tmp.shape.reverse();
            edges.push(edge_tmp);
            edge_tmp = edge_tmp.prev;
        } while (edge_tmp !== this.last);

        // restore linked list
        this.first = undefined;
        this.last = undefined;
        for (let edge of edges) {
            if (this.first === undefined) {
                edge.prev = edge;
                edge.next = edge;
                this.first = edge;
                this.last = edge;
            } else {
                // append to end
                edge.prev = this.last;
                this.last.next = edge;

                // update edge to be last
                this.last = edge;

                // restore circular links
                this.last.next = this.first;
                this.first.prev = this.last;

            }
            // set arc length
            this.setOneEdgeArcLength(edge);
        }

        // Recalculate orientation, if set
        if (this._orientation !== undefined) {
            this._orientation = undefined;
            this._orientation = this.orientation();
        }
    }


    /**
     * Set arc_length property for each of the edges in the face.
     * Arc_length of the edge it the arc length from the first edge of the face
     */
    setArcLength() {
        for (let edge of this) {
            this.setOneEdgeArcLength(edge);
            edge.face = this;
        }
    }

    setOneEdgeArcLength(edge) {
        if (edge === this.first) {
            edge.arc_length = 0.0;
        } else {
            edge.arc_length = edge.prev.arc_length + edge.prev.length;
        }
    }

    /**
     * Returns the absolute value of the area of the face
     * @returns {number}
     */
    area() {
        return Math.abs(this.signedArea());
    }

    /**
     * Returns signed area of the simple face.
     * Face is simple if it has no self intersections that change its orientation.
     * Then the area will be positive if the orientation of the face is clockwise,
     * and negative if orientation is counterclockwise.
     * It may be zero if polygon is degenerated.
     * @returns {number}
     */
    signedArea() {
        let sArea = 0;
        let ymin = this.box.ymin;
        for (let edge of this) {
            sArea += edge.shape.definiteIntegral(ymin);
        }
        return sArea;
    }

    /**
     * Return face orientation: one of Flatten.ORIENTATION.CCW, Flatten.ORIENTATION.CW, Flatten.ORIENTATION.NOT_ORIENTABLE <br/>
     * According to Green theorem the area of a closed curve may be calculated as double integral,
     * and the sign of the integral will be defined by the direction of the curve.
     * When the integral ("signed area") will be negative, direction is counter clockwise,
     * when positive - clockwise and when it is zero, polygon is not orientable.
     * See {@link https://mathinsight.org/greens_theorem_find_area}
     * @returns {number}
     */
    orientation() {
        if (this._orientation === undefined) {
            let area = this.signedArea();
            if (Flatten.Utils.EQ_0(area)) {
                this._orientation = Flatten.ORIENTATION.NOT_ORIENTABLE;
            } else if (Flatten.Utils.LT(area, 0)) {
                this._orientation = Flatten.ORIENTATION.CCW;
            } else {
                this._orientation = Flatten.ORIENTATION.CW;
            }
        }
        return this._orientation;
    }

    /**
     * Returns true if face of the polygon is simple (no self-intersection points found)
     * NOTE: this method is incomplete because it does not exclude touching points.
     * Self intersection test should check if polygon change orientation in the test point.
     * @param {Edges} edges - reference to polygon.edges to provide search index
     * @returns {boolean}
     */
    isSimple(edges) {
        let ip = Face.getSelfIntersections(this, edges, true);
        return ip.length == 0;
    }

    static getSelfIntersections(face, edges, exitOnFirst = false) {
        let int_points = [];

        // calculate intersections
        for (let edge1 of face) {

            // request edges of polygon in the box of edge1
            let resp = edges.search(edge1.box);

            // for each edge2 in response
            for (let edge2 of resp) {

                // Skip itself
                if (edge1 === edge2)
                    continue;

                // Skip is edge2 belongs to another face
                if (edge2.face !== face)
                    continue;

                // Skip next and previous edge if both are segment (if one of them arc - calc intersection)
                if (edge1.shape instanceof Flatten.Segment && edge2.shape instanceof Flatten.Segment &&
                    (edge1.next === edge2 || edge1.prev === edge2))
                    continue;

                // calculate intersections between edge1 and edge2
                let ip = edge1.shape.intersect(edge2.shape);

                // for each intersection point
                for (let pt of ip) {

                    // skip start-end connections
                    if (pt.equalTo(edge1.start) && pt.equalTo(edge2.end) && edge2 === edge1.prev)
                        continue;
                    if (pt.equalTo(edge1.end) && pt.equalTo(edge2.start) && edge2 === edge1.next)
                        continue;

                    int_points.push(pt);

                    if (exitOnFirst)
                        break;
                }

                if (int_points.length > 0 && exitOnFirst)
                    break;
            }

            if (int_points.length > 0 && exitOnFirst)
                break;

        }
        return int_points;
    }

    /**
     * Returns edge which contains given point
     * @param {Point} pt - test point
     * @returns {Edge}
     */
    findEdgeByPoint(pt) {
        let edgeFound;
        for (let edge of this) {
            if (edge.shape.contains(pt)) {
                edgeFound = edge;
                break;
            }
        }
        return edgeFound;
    }

    /**
     * Returns new polygon created from one face
     * @returns {Polygon}
     */
    toPolygon() {
        return new Flatten.Polygon(this.shapes);
    }

    toJSON() {
        return this.edges.map(edge => edge.toJSON());
    }

    /**
     * Returns string to be assigned to "d" attribute inside defined "path"
     * @returns {string}
     */
    svg() {
        let svgStr = `\nM${this.first.start.x},${this.first.start.y}`;
        for (let edge of this) {
            svgStr += edge.svg();
        }
        svgStr += ` z`;
        return svgStr;
    }

}
Flatten.Face = Face;

/**
 * Class representing a ray (a half-infinite line).
 * @type {Ray}
 */
class Ray {
    /**
     * Ray may be constructed by setting an <b>origin</b> point and a <b>normal</b> vector, so that any point <b>x</b>
     * on a ray fit an equation: <br />
     *  (<b>x</b> - <b>origin</b>) * <b>vector</b> = 0 <br />
     * Ray defined by constructor is a right semi-infinite line with respect to the normal vector <br/>
     * If normal vector is omitted ray is considered horizontal (normal vector is (0,1)). <br/>
     * Don't be confused: direction of the normal vector is orthogonal to the ray <br/>
     * @param {Point} pt - start point
     * @param {Vector} norm - normal vector
     */
    constructor(...args) {
        this.pt = new Flatten.Point();
        this.norm = new Flatten.Vector(0,1);

        if (args.length == 0) {
            return;
        }

        if (args.length >= 1 && args[0] instanceof Flatten.Point) {
            this.pt = args[0].clone();
        }

        if (args.length === 1) {
            return;
        }

        if (args.length === 2 && args[1] instanceof Flatten.Vector) {
            this.norm = args[1].clone();
            return;
        }

        // if (args.length == 2 && typeof (args[0]) == "number" && typeof (args[1]) == "number") {
        //     this.pt = new Flatten.Point(args[0], args[1]);
        //     return;
        // }

        throw Flatten.Errors.ILLEGAL_PARAMETERS;
    }

    /**
     * Return new cloned instance of ray
     * @returns {Ray}
     */
    clone() {
        return new Ray(this.pt, this.norm);
    }

    /**
     * Slope of the ray - angle in radians between ray and axe x from 0 to 2PI
     * @returns {number} - slope of the line
     */
    get slope() {
        let vec = new Flatten.Vector(this.norm.y, -this.norm.x);
        return vec.slope;
    }

    /**
     * Returns half-infinite bounding box of the ray
     * @returns {Box} - bounding box
     */
    get box() {
        let slope = this.slope;
        return new Flatten.Box(
            slope > Math.PI/2 && slope < 3*Math.PI/2 ? Number.NEGATIVE_INFINITY : this.pt.x,
            slope >= 0 && slope <= Math.PI ? this.pt.y : Number.NEGATIVE_INFINITY,
            slope >= Math.PI/2 && slope <= 3*Math.PI/2 ? this.pt.x : Number.POSITIVE_INFINITY,
            slope >= Math.PI && slope <= 2*Math.PI || slope == 0 ? this.pt.y : Number.POSITIVE_INFINITY
        )
    }

    /**
     * Return ray start point
     * @returns {Point} - ray start point
     */
    get start() {
        return this.pt;
    }

    /**
     * Ray has no end point?
     * @returns {undefined}
     */
    get end() {return undefined;}

    /**
     * Return positive infinity number as length
     * @returns {number}
     */
    get length() {return Number.POSITIVE_INFINITY;}

    /**
     * Returns true if point belongs to ray
     * @param {Point} pt Query point
     * @returns {boolean}
     */
    contains(pt) {
        if (this.pt.equalTo(pt)) {
            return true;
        }
        /* Ray contains point if vector to point is orthogonal to the ray normal vector
            and cross product from vector to point is positive */
        let vec = new Flatten.Vector(this.pt, pt);
        return Flatten.Utils.EQ_0(this.norm.dot(vec)) && Flatten.Utils.GE(vec.cross(this.norm),0);
    }

    /**
     * Split ray with point and return array of segment and new ray
     * @param {Point} pt
     * @returns [Segment,Ray]
     */
    split(pt) {
        if (!this.contains(pt))
            return [];

        if (this.pt.equalTo(pt)) {
            return [this]
        }

        return [
            new Flatten.Segment(this.pt, pt),
            new Flatten.Ray(pt, this.norm)
        ]
    }

    /**
     * Returns array of intersection points between ray and segment or arc
     * @param {Segment|Arc} - Shape to intersect with ray
     * @returns {Array} array of intersection points
     */
    intersect(shape) {
        if (shape instanceof Flatten.Segment) {
            return this.intersectRay2Segment(this, shape);
        }

        if (shape instanceof Flatten.Arc) {
            return this.intersectRay2Arc(this, shape);
        }
    }

    intersectRay2Segment(ray, segment) {
        let ip = [];

        if (ray.box.not_intersect(segment.box)) {
            return ip;
        }

        let line = new Flatten.Line(ray.start, ray.norm);
        let ip_tmp = line.intersect(segment);

        for (let pt of ip_tmp) {
            // if (Flatten.Utils.GE(pt.x, ray.start.x)) {
            if (ray.contains(pt)) {
                ip.push(pt);
            }
        }

        /* If there were two intersection points between line and ray,
        and now there is exactly one left, it means ray starts between these points
        and there is another intersection point - start of the ray */
        if (ip_tmp.length == 2 && ip.length == 1 && ray.start.on(line)) {
            ip.push(ray.start);
        }

        return ip;
    }

    intersectRay2Arc(ray, arc) {
        let ip = [];

        if (ray.box.not_intersect(arc.box)) {
            return ip;
        }

        let line = new Flatten.Line(ray.start, ray.norm);
        let ip_tmp = line.intersect(arc);

        for (let pt of ip_tmp) {
            // if (Flatten.Utils.GE(pt.x, ray.start.x)) {
            if (ray.contains(pt)) {
                ip.push(pt);
            }
        }
        return ip;
    }

    /**
     * Return string to draw svg segment representing ray inside given box
     * @param {Box} box Box representing drawing area
     * @param {Object} attrs - an object with attributes of svg segment element
     */
    svg(box, attrs = {}) {
        let line = new Flatten.Line(this.pt, this.norm);
        let ip = intersectLine2Box(line, box);
        ip = ip.filter( pt => this.contains(pt) );
        if (ip.length === 0 || ip.length === 2)
            return "";
        let segment = new Flatten.Segment(this.pt, ip[0]);
        return segment.svg(attrs);
    }

}
Flatten.Ray = Ray;

const ray = (...args) => new Flatten.Ray(...args);
Flatten.ray = ray;

/**
 * Created by Alex Bol on 3/15/2017.
 */

/**
 * Class representing a polygon.<br/>
 * Polygon in FlattenJS is a multipolygon comprised from a set of [faces]{@link Flatten.Face}. <br/>
 * Face, in turn, is a closed loop of [edges]{@link Flatten.Edge}, where edge may be segment or circular arc<br/>
 * @type {Polygon}
 */
class Polygon {
    /**
     * Constructor creates new instance of polygon. With no arguments new polygon is empty.<br/>
     * Constructor accepts as argument array that define loop of shapes
     * or array of arrays in case of multi polygon <br/>
     * Loop may be defined in different ways: <br/>
     * - array of shapes of type Segment or Arc <br/>
     * - array of points (Flatten.Point) <br/>
     * - array of numeric pairs which represent points <br/>
     * - box or circle object <br/>
     * Alternatively, it is possible to use polygon.addFace method
     * @param {args} - array of shapes or array of arrays
     */
    constructor() {
        /**
         * Container of faces (closed loops), may be empty
         * @type {PlanarSet}
         */
        this.faces = new Flatten.PlanarSet();
        /**
         * Container of edges
         * @type {PlanarSet}
         */
        this.edges = new Flatten.PlanarSet();

        /* It may be array of something that may represent one loop (face) or
         array of arrays that represent multiple loops
         */
        let args = [...arguments];
        if (args.length === 1 &&
            ((args[0] instanceof Array && args[0].length > 0) ||
                args[0] instanceof Flatten.Circle || args[0] instanceof Flatten.Box)) {
            let argsArray = args[0];
            if (args[0] instanceof Array && args[0].every((loop) => {return loop instanceof Array})) {
                if  (argsArray.every( el => {return el instanceof Array && el.length === 2 && typeof(el[0]) === "number" && typeof(el[1]) === "number"} )) {
                    this.faces.add(new Flatten.Face(this, argsArray));    // one-loop polygon as array of pairs of numbers
                }
                else {
                    for (let loop of argsArray) {   // multi-loop polygon
                        /* Check extra level of nesting for GeoJSON-style multi polygons */
                        if (loop instanceof Array && loop[0] instanceof Array &&
                            loop[0].every( el => {return el instanceof Array && el.length === 2 && typeof(el[0]) === "number" && typeof(el[1]) === "number"} )) {
                            for (let loop1 of loop) {
                                this.faces.add(new Flatten.Face(this, loop1));
                            }
                        }
                        else {
                            this.faces.add(new Flatten.Face(this, loop));
                        }
                    }
                }
            }
            else {
                this.faces.add(new Flatten.Face(this, argsArray));    // one-loop polygon
            }
        }
    }

    /**
     * (Getter) Returns bounding box of the polygon
     * @returns {Box}
     */
    get box() {
        return [...this.faces].reduce((acc, face) => acc.merge(face.box), new Flatten.Box());
    }

    /**
     * (Getter) Returns array of vertices
     * @returns {Array}
     */
    get vertices() {
        return [...this.edges].map(edge => edge.start);
    }

    /**
     * Create new cloned instance of the polygon
     * @returns {Polygon}
     */
    clone() {
        let polygon = new Polygon();
        for (let face of this.faces) {
            polygon.addFace(face.shapes);
        }
        return polygon;
    }

    /**
     * Return true is polygon has no edges
     * @returns {boolean}
     */
    isEmpty() {
        return this.edges.size === 0;
    }

    /**
     * Return true if polygon is valid for boolean operations
     * Polygon is valid if <br/>
     * 1. All faces are simple polygons (there are no self-intersected polygons) <br/>
     * 2. All faces are orientable and there is no island inside island or hole inside hole - TODO <br/>
     * 3. There is no intersections between faces (excluding touching) - TODO <br/>
     * @returns {boolean}
     */
    isValid() {
        let valid = true;
        // 1. Polygon is invalid if at least one face is not simple
        for (let face of this.faces) {
            if (!face.isSimple(this.edges)) {
                valid = false;
                break;
            }
        }
        // 2. TODO: check if no island inside island and no hole inside hole
        // 3. TODO: check the there is no intersection between faces
        return valid;
    }

    /**
     * Returns area of the polygon. Area of an island will be added, area of a hole will be subtracted
     * @returns {number}
     */
    area() {
        let signedArea = [...this.faces].reduce((acc, face) => acc + face.signedArea(), 0);
        return Math.abs(signedArea);
    }

    /**
     * Add new face to polygon. Returns added face
     * @param {Points[]|Segments[]|Arcs[]|Circle|Box} args -  new face may be create with one of the following ways: <br/>
     * 1) array of points that describe closed path (edges are segments) <br/>
     * 2) array of shapes (segments and arcs) which describe closed path <br/>
     * 3) circle - will be added as counterclockwise arc <br/>
     * 4) box - will be added as counterclockwise rectangle <br/>
     * You can chain method face.reverse() is you need to change direction of the creates face
     * @returns {Face}
     */
    addFace(...args) {
        let face = new Flatten.Face(this, ...args);
        this.faces.add(face);
        return face;
    }

    /**
     * Delete existing face from polygon
     * @param {Face} face Face to be deleted
     * @returns {boolean}
     */
    deleteFace(face) {
        for (let edge of face) {
            let deleted = this.edges.delete(edge);
        }
        let deleted = this.faces.delete(face);
        return deleted;
    }

    /**
     * Delete chain of edges from the face.
     * @param {Face} face Face to remove chain
     * @param {Edge} edgeFrom Start of the chain of edges to be removed
     * @param {Edge} edgeTo End of the chain of edges to be removed
     */
    removeChain(face, edgeFrom, edgeTo) {
        // Special case: all edges removed
        if (edgeTo.next === edgeFrom) {
            this.deleteFace(face);
            return;
        }
        for (let edge = edgeFrom; edge !== edgeTo.next; edge = edge.next) {
            face.remove(edge);
            this.edges.delete(edge);      // delete from PlanarSet of edges and update index
            if (face.isEmpty()) {
                this.deleteFace(face);    // delete from PlanarSet of faces and update index
                break;
            }
        }
    }

    /**
     * Add point as a new vertex and split edge. Point supposed to belong to an edge.
     * When edge is split, new edge created from the start of the edge to the new vertex
     * and inserted before current edge.
     * Current edge is trimmed and updated.
     * Method returns new edge added. If no edge added, it returns edge before vertex
     * @param {Point} pt Point to be added as a new vertex
     * @param {Edge} edge Edge to be split with new vertex and then trimmed from start
     * @returns {Edge}
     */
    addVertex(pt, edge) {
        let shapes = edge.shape.split(pt);
        // if (shapes.length < 2) return;

        if (shapes[0] === null)   // point incident to edge start vertex, return previous edge
            return edge.prev;

        if (shapes[1] === null)   // point incident to edge end vertex, return edge itself
            return edge;

        let newEdge = new Flatten.Edge(shapes[0]);
        let edgeBefore = edge.prev;

        /* Insert first split edge into linked list after edgeBefore */
        edge.face.insert(newEdge, edgeBefore);

        // Remove old edge from edges container and 2d index
        this.edges.delete(edge);

        // Insert new edge to the edges container and 2d index
        this.edges.add(newEdge);

        // Update edge shape with second split edge keeping links
        edge.shape = shapes[1];

        // Add updated edge to the edges container and 2d index
        this.edges.add(edge);

        return newEdge;
    }

    /**
     * Cut polygon with multiline and return array of new polygons
     * Multiline should be constructed from a line with intersection point, see notebook:
     * https://next.observablehq.com/@alexbol99/cut-polygon-with-line
     * @param {Multiline} multiline
     * @returns {Polygon[]}
     */
    cut(multiline) {
        let cutPolygons = [this.clone()];
        for (let edge of multiline) {
            if (edge.setInclusion(this) !== Flatten.INSIDE)
                continue;

            let cut_edge_start = edge.shape.start;
            let cut_edge_end = edge.shape.end;

            let newCutPolygons = [];
            for (let polygon of cutPolygons) {
                if (polygon.findEdgeByPoint(cut_edge_start) === undefined) {
                    newCutPolygons.push(polygon);
                }
                else {
                    let [cutPoly1, cutPoly2] = polygon.cutFace(cut_edge_start, cut_edge_end);
                    newCutPolygons.push(cutPoly1, cutPoly2);
                }
            }
            cutPolygons = newCutPolygons;
        }
        return cutPolygons;
    }

    /**
     * Cut face of polygon with a segment between two points and create two new polygons
     * Supposed that a segments between points does not intersect any other edge
     * @param {Point} pt1
     * @param {Point} pt2
     * @returns {Polygon[]}
     */
    cutFace(pt1, pt2) {
        let edge1 = this.findEdgeByPoint(pt1);
        let edge2 = this.findEdgeByPoint(pt2);
        if (edge1.face != edge2.face) return;

        // Cut face into two and create new polygon with two faces
        let edgeBefore1 = this.addVertex(pt1, edge1);
        edge2 = this.findEdgeByPoint(pt2);
        let edgeBefore2 = this.addVertex(pt2, edge2);

        let face = edgeBefore1.face;
        let newEdge1 = new Flatten.Edge(
            new Flatten.Segment(edgeBefore1.end, edgeBefore2.end)
        );
        let newEdge2 = new Flatten.Edge(
            new Flatten.Segment(edgeBefore2.end, edgeBefore1.end)
        );

        // Swap links
        edgeBefore1.next.prev = newEdge2;
        newEdge2.next = edgeBefore1.next;

        edgeBefore1.next = newEdge1;
        newEdge1.prev = edgeBefore1;

        edgeBefore2.next.prev = newEdge1;
        newEdge1.next = edgeBefore2.next;

        edgeBefore2.next = newEdge2;
        newEdge2.prev = edgeBefore2;

        // Insert new edge to the edges container and 2d index
        this.edges.add(newEdge1);
        this.edges.add(newEdge2);

        // Add two new faces
        let face1 = this.addFace(newEdge1, edgeBefore1);
        let face2 = this.addFace(newEdge2, edgeBefore2);

        // Remove old face
        this.faces.delete(face);

        return [face1.toPolygon(), face2.toPolygon()];
    }

    /**
     * Returns the first founded edge of polygon that contains given point
     * @param {Point} pt
     * @returns {Edge}
     */
    findEdgeByPoint(pt) {
        let edge;
        for (let face of this.faces) {
            edge = face.findEdgeByPoint(pt);
            if (edge != undefined)
                break;
        }
        return edge;
    }

    /**
     * Split polygon into array of polygons, where each polygon is an island with all
     * hole that it contains
     * @returns {Flatten.Polygon[]}
     */
    splitToIslands() {
        let polygons = this.toArray();      // split into array of one-loop polygons
        /* Sort polygons by area in descending order */
        polygons.sort( (polygon1, polygon2) => polygon2.area() - polygon1.area() );
        /* define orientation of the island by orientation of the first polygon in array */
        let orientation = [...polygons[0].faces][0].orientation();
        /* Create output array from polygons with same orientation as a first polygon (array of islands) */
        let newPolygons = polygons.filter( polygon => [...polygon.faces][0].orientation() === orientation);
        for (let polygon of polygons) {
            let face = [...polygon.faces][0];
            if (face.orientation() === orientation) continue;  // skip same orientation
            /* Proceed with opposite orientation */
            /* Look if any of island polygons contains tested polygon as a hole */
            for (let islandPolygon of newPolygons) {
                if (face.shapes.every(shape => islandPolygon.contains(shape))) {
                    islandPolygon.addFace(face.shapes);      // add polygon as a hole in islandPolygon
                    break;
                }
            }
        }
        // TODO: assert if not all polygons added into output
        return newPolygons;
    }

    /**
     * Reverse orientation of all faces to opposite
     * @returns {Polygon}
     */
    reverse() {
        for (let face of this.faces) {
            face.reverse();
        }
        return this;
    }

    /**
     * Returns true if polygon contains shape: no point of shape lay outside of the polygon,
     * false otherwise
     * @param {Shape} shape - test shape
     * @returns {boolean}
     */
    contains(shape) {
        if (shape instanceof Flatten.Point) {
            let rel = ray_shoot(this, shape);
            return rel === Flatten.INSIDE || rel === Flatten.BOUNDARY;
        }
        else {
            return cover(this, shape);
        }
    }

    /**
     * Return distance and shortest segment between polygon and other shape as array [distance, shortest_segment]
     * @param {Shape} shape Shape of one of the types Point, Circle, Line, Segment, Arc or Polygon
     * @returns {Number | Segment}
     */
    distanceTo(shape) {
        // let {Distance} = Flatten;

        if (shape instanceof Flatten.Point) {
            let [dist, shortest_segment] = Flatten.Distance.point2polygon(shape, this);
            shortest_segment = shortest_segment.reverse();
            return [dist, shortest_segment];
        }

        if (shape instanceof Flatten.Circle ||
            shape instanceof Flatten.Line ||
            shape instanceof Flatten.Segment ||
            shape instanceof Flatten.Arc) {
            let [dist, shortest_segment] = Flatten.Distance.shape2polygon(shape, this);
            shortest_segment = shortest_segment.reverse();
            return [dist, shortest_segment];
        }

        /* this method is bit faster */
        if (shape instanceof Flatten.Polygon) {
            let min_dist_and_segment = [Number.POSITIVE_INFINITY, new Flatten.Segment()];
            let dist, shortest_segment;

            for (let edge of this.edges) {
                // let [dist, shortest_segment] = Distance.shape2polygon(edge.shape, shape);
                let min_stop = min_dist_and_segment[0];
                [dist, shortest_segment] = Flatten.Distance.shape2planarSet(edge.shape, shape.edges, min_stop);
                if (Flatten.Utils.LT(dist, min_stop)) {
                    min_dist_and_segment = [dist, shortest_segment];
                }
            }
            return min_dist_and_segment;
        }
    }

    /**
     * Return array of intersection points between polygon and other shape
     * @param shape Shape of the one of supported types <br/>
     * @returns {Point[]}
     */
    intersect(shape) {
        if (shape instanceof Flatten.Point) {
            return this.contains(shape) ? [shape] : [];
        }

        if (shape instanceof Flatten.Line) {
            return intersectLine2Polygon(shape, this);
        }

        if (shape instanceof Flatten.Circle) {
            return intersectCircle2Polygon(shape, this);
        }

        if (shape instanceof Flatten.Segment) {
            return intersectSegment2Polygon(shape, this);
        }

        if (shape instanceof Flatten.Arc) {
            return intersectArc2Polygon(shape, this);
        }

        if (shape instanceof Flatten.Polygon) {
            return intersectPolygon2Polygon(shape, this);
        }
    }

    /**
     * Returns new polygon translated by vector vec
     * @param {Vector} vec
     * @returns {Polygon}
     */
    translate(vec) {
        let newPolygon = new Polygon();
        for (let face of this.faces) {
            newPolygon.addFace(face.shapes.map( shape => shape.translate(vec)));
        }
        return newPolygon;
    }

    /**
     * Return new polygon rotated by given angle around given point
     * If point omitted, rotate around origin (0,0)
     * Positive value of angle defines rotation counter clockwise, negative - clockwise
     * @param {number} angle - rotation angle in radians
     * @param {Point} center - rotation center, default is (0,0)
     * @returns {Polygon} - new rotated polygon
     */
    rotate(angle = 0, center = new Flatten.Point()) {
        let newPolygon = new Polygon();
        for (let face of this.faces) {
            newPolygon.addFace(face.shapes.map( shape => shape.rotate(angle, center)));
        }
        return newPolygon;
    }

    /**
     * Return new polygon transformed using affine transformation matrix
     * @param {Matrix} matrix - affine transformation matrix
     * @returns {Polygon} - new polygon
     */
    transform(matrix = new Flatten.Matrix()) {
        let newPolygon = new Polygon();
        for (let face of this.faces) {
            newPolygon.addFace(face.shapes.map( shape => shape.transform(matrix)));
        }
        return newPolygon;
    }

    /**
     * This method returns an object that defines how data will be
     * serialized when called JSON.stringify() method
     * @returns {Object}
     */
    toJSON() {
        return [...this.faces].map(face => face.toJSON());
    }

    /**
     * Transform all faces into array of polygons
     * @returns {Flatten.Polygon[]}
     */
    toArray() {
        return [...this.faces].map(face => face.toPolygon());
    }

    /**
     * Return string to draw polygon in svg
     * @param attrs  - an object with attributes for svg path element,
     * like "stroke", "strokeWidth", "fill", "fillRule", "fillOpacity"
     * Defaults are stroke:"black", strokeWidth:"1", fill:"lightcyan", fillRule:"evenodd", fillOpacity: "1"
     * @returns {string}
     */
    svg(attrs = {}) {
        let {stroke, strokeWidth, fill, fillRule, fillOpacity, id, className} = attrs;
        // let restStr = Object.keys(rest).reduce( (acc, key) => acc += ` ${key}="${rest[key]}"`, "");
        let id_str = (id && id.length > 0) ? `id="${id}"` : "";
        let class_str = (className && className.length > 0) ? `class="${className}"` : "";

        let svgStr = `\n<path stroke="${stroke || "black"}" stroke-width="${strokeWidth || 1}" fill="${fill || "lightcyan"}" fill-rule="${fillRule || "evenodd"}" fill-opacity="${fillOpacity || 1.0}" ${id_str} ${class_str} d="`;
        for (let face of this.faces) {
            svgStr += face.svg();
        }
        svgStr += `" >\n</path>`;
        return svgStr;
    }
}

Flatten.Polygon = Polygon;

/**
 * Shortcut method to create new polygon
 */
const polygon = (...args) => new Flatten.Polygon(...args);
Flatten.polygon = polygon;

class Distance {
    /**
     * Calculate distance and shortest segment between points
     * @param pt1
     * @param pt2
     * @returns {Number | Segment} - distance and shortest segment
     */
    static point2point(pt1, pt2) {
        return pt1.distanceTo(pt2);
    }

    /**
     * Calculate distance and shortest segment between point and line
     * @param pt
     * @param line
     * @returns {Number | Segment} - distance and shortest segment
     */
    static point2line(pt, line) {
        let closest_point = pt.projectionOn(line);
        let vec = new Flatten.Vector(pt, closest_point);
        return [vec.length, new Flatten.Segment(pt, closest_point)];
    }

    /**
     * Calculate distance and shortest segment between point and circle
     * @param pt
     * @param circle
     * @returns {Number | Segment} - distance and shortest segment
     */
    static point2circle(pt, circle) {
        let [dist2center, shortest_dist] = pt.distanceTo(circle.center);
        if (Flatten.Utils.EQ_0(dist2center)) {
            return [circle.r, new Flatten.Segment(pt, circle.toArc().start)];
        } else {
            let dist = Math.abs(dist2center - circle.r);
            let v = new Flatten.Vector(circle.pc, pt).normalize().multiply(circle.r);
            let closest_point = circle.pc.translate(v);
            return [dist, new Flatten.Segment(pt, closest_point)];
        }
    }

    /**
     * Calculate distance and shortest segment between point and segment
     * @param pt
     * @param segment
     * @returns {Number | Segment} - distance and shortest segment
     */
    static point2segment(pt, segment) {
        /* Degenerated case of zero-length segment */
        if (segment.start.equalTo(segment.end)) {
            return Distance.point2point(pt, segment.start);
        }

        let v_seg = new Flatten.Vector(segment.start, segment.end);
        let v_ps2pt = new Flatten.Vector(segment.start, pt);
        let v_pe2pt = new Flatten.Vector(segment.end, pt);
        let start_sp = v_seg.dot(v_ps2pt);
        /* dot product v_seg * v_ps2pt */
        let end_sp = -v_seg.dot(v_pe2pt);
        /* minus dot product v_seg * v_pe2pt */

        let dist;
        let closest_point;
        if (Flatten.Utils.GE(start_sp, 0) && Flatten.Utils.GE(end_sp, 0)) {    /* point inside segment scope */
            let v_unit = segment.tangentInStart(); // new Flatten.Vector(v_seg.x / this.length, v_seg.y / this.length);
            /* unit vector ||v_unit|| = 1 */
            dist = Math.abs(v_unit.cross(v_ps2pt));
            /* dist = abs(v_unit x v_ps2pt) */
            closest_point = segment.start.translate(v_unit.multiply(v_unit.dot(v_ps2pt)));
            return [dist, new Flatten.Segment(pt, closest_point)];
        } else if (start_sp < 0) {                             /* point is out of scope closer to ps */
            return pt.distanceTo(segment.start);
        } else {                                               /* point is out of scope closer to pe */
            return pt.distanceTo(segment.end);
        }
    };

    /**
     * Calculate distance and shortest segment between point and arc
     * @param pt
     * @param arc
     * @returns {Number | Segment} - distance and shortest segment
     */
    static point2arc(pt, arc) {
        let circle = new Flatten.Circle(arc.pc, arc.r);
        let dist_and_segment = [];
        let dist, shortest_segment;
        [dist, shortest_segment] = Distance.point2circle(pt, circle);
        if (shortest_segment.end.on(arc)) {
            dist_and_segment.push(Distance.point2circle(pt, circle));
        }
        dist_and_segment.push(Distance.point2point(pt, arc.start));
        dist_and_segment.push(Distance.point2point(pt, arc.end));

        Distance.sort(dist_and_segment);

        return dist_and_segment[0];
    }

    /**
     * Calculate distance and shortest segment between segment and line
     * @param seg
     * @param line
     * @returns {Number | Segment}
     */
    static segment2line(seg, line) {
        let ip = seg.intersect(line);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];   // distance = 0, closest point is the first point
        }
        let dist_and_segment = [];
        dist_and_segment.push(Distance.point2line(seg.start, line));
        dist_and_segment.push(Distance.point2line(seg.end, line));

        Distance.sort(dist_and_segment);
        return dist_and_segment[0];

    }

    /**
     * Calculate distance and shortest segment between two segments
     * @param seg1
     * @param seg2
     * @returns {Number | Segment} - distance and shortest segment
     */
    static segment2segment(seg1, seg2) {
        let ip = intersectSegment2Segment(seg1, seg2);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];   // distance = 0, closest point is the first point
        }

        // Seg1 and seg2 not intersected
        let dist_and_segment = [];
        let dist_tmp, shortest_segment_tmp;
        [dist_tmp, shortest_segment_tmp] = Distance.point2segment(seg2.start, seg1);
        dist_and_segment.push([dist_tmp, shortest_segment_tmp.reverse()]);
        [dist_tmp, shortest_segment_tmp] = Distance.point2segment(seg2.end, seg1);
        dist_and_segment.push([dist_tmp, shortest_segment_tmp.reverse()]);
        dist_and_segment.push(Distance.point2segment(seg1.start, seg2));
        dist_and_segment.push(Distance.point2segment(seg1.end, seg2));

        Distance.sort(dist_and_segment);
        return dist_and_segment[0];
    }

    /**
     * Calculate distance and shortest segment between segment and circle
     * @param seg
     * @param circle
     * @returns {Number | Segment} - distance and shortest segment
     */
    static segment2circle(seg, circle) {
        /* Case 1 Segment and circle intersected. Return the first point and zero distance */
        let ip = seg.intersect(circle);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];
        }

        // No intersection between segment and circle

        /* Case 2. Distance to projection of center point to line bigger than radius
         * And projection point belong to segment
          * Then measure again distance from projection to circle and return it */
        let line = new Flatten.Line(seg.ps, seg.pe);
        let [dist, shortest_segment] = Distance.point2line(circle.center, line);
        if (Flatten.Utils.GE(dist, circle.r) && shortest_segment.end.on(seg)) {
            return Distance.point2circle(shortest_segment.end, circle);
        }
        /* Case 3. Otherwise closest point is one of the end points of the segment */
        else {
            let [dist_from_start, shortest_segment_from_start] = Distance.point2circle(seg.start, circle);
            let [dist_from_end, shortest_segment_from_end] = Distance.point2circle(seg.end, circle);
            return Flatten.Utils.LT(dist_from_start, dist_from_end) ?
                [dist_from_start, shortest_segment_from_start] :
                [dist_from_end, shortest_segment_from_end];
        }
    }

    /**
     * Calculate distance and shortest segment between segment and arc
     * @param seg
     * @param arc
     * @returns {Number | Segment} - distance and shortest segment
     */
    static segment2arc(seg, arc) {
        /* Case 1 Segment and arc intersected. Return the first point and zero distance */
        let ip = seg.intersect(arc);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];
        }

        // No intersection between segment and arc
        let line = new Flatten.Line(seg.ps, seg.pe);
        let circle = new Flatten.Circle(arc.pc, arc.r);

        /* Case 2. Distance to projection of center point to line bigger than radius AND
         * projection point belongs to segment AND
           * distance from projection point to circle belongs to arc  =>
           * return this distance from projection to circle */
        let [dist_from_center, shortest_segment_from_center] = Distance.point2line(circle.center, line);
        if (Flatten.Utils.GE(dist_from_center, circle.r) && shortest_segment_from_center.end.on(seg)) {
            let [dist_from_projection, shortest_segment_from_projection] =
                Distance.point2circle(shortest_segment_from_center.end, circle);
            if (shortest_segment_from_projection.end.on(arc)) {
                return [dist_from_projection, shortest_segment_from_projection];
            }
        }
        /* Case 3. Otherwise closest point is one of the end points of the segment */
        let dist_and_segment = [];
        dist_and_segment.push(Distance.point2arc(seg.start, arc));
        dist_and_segment.push(Distance.point2arc(seg.end, arc));

        let dist_tmp, segment_tmp;
        [dist_tmp, segment_tmp] = Distance.point2segment(arc.start, seg);
        dist_and_segment.push([dist_tmp, segment_tmp.reverse()]);

        [dist_tmp, segment_tmp] = Distance.point2segment(arc.end, seg);
        dist_and_segment.push([dist_tmp, segment_tmp.reverse()]);

        Distance.sort(dist_and_segment);
        return dist_and_segment[0];
    }

    /**
     * Calculate distance and shortest segment between two circles
     * @param circle1
     * @param circle2
     * @returns {Number | Segment} - distance and shortest segment
     */
    static circle2circle(circle1, circle2) {
        let ip = circle1.intersect(circle2);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];
        }

        // Case 1. Concentric circles. Convert to arcs and take distance between two arc starts
        if (circle1.center.equalTo(circle2.center)) {
            let arc1 = circle1.toArc();
            let arc2 = circle2.toArc();
            return Distance.point2point(arc1.start, arc2.start);
        } else {
            // Case 2. Not concentric circles
            let line = new Flatten.Line(circle1.center, circle2.center);
            let ip1 = line.intersect(circle1);
            let ip2 = line.intersect(circle2);

            let dist_and_segment = [];

            dist_and_segment.push(Distance.point2point(ip1[0], ip2[0]));
            dist_and_segment.push(Distance.point2point(ip1[0], ip2[1]));
            dist_and_segment.push(Distance.point2point(ip1[1], ip2[0]));
            dist_and_segment.push(Distance.point2point(ip1[1], ip2[1]));

            Distance.sort(dist_and_segment);
            return dist_and_segment[0];
        }
    }

    /**
     * Calculate distance and shortest segment between two circles
     * @param circle
     * @param line
     * @returns {Number | Segment} - distance and shortest segment
     */
    static circle2line(circle, line) {
        let ip = circle.intersect(line);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];
        }

        let [dist_from_center, shortest_segment_from_center] = Distance.point2line(circle.center, line);
        let [dist, shortest_segment] = Distance.point2circle(shortest_segment_from_center.end, circle);
        shortest_segment = shortest_segment.reverse();
        return [dist, shortest_segment];
    }

    /**
     * Calculate distance and shortest segment between arc and line
     * @param arc
     * @param line
     * @returns {Number | Segment} - distance and shortest segment
     */
    static arc2line(arc, line) {
        /* Case 1 Line and arc intersected. Return the first point and zero distance */
        let ip = line.intersect(arc);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];
        }

        let circle = new Flatten.Circle(arc.center, arc.r);

        /* Case 2. Distance to projection of center point to line bigger than radius AND
         * projection point belongs to segment AND
           * distance from projection point to circle belongs to arc  =>
           * return this distance from projection to circle */
        let [dist_from_center, shortest_segment_from_center] = Distance.point2line(circle.center, line);
        if (Flatten.Utils.GE(dist_from_center, circle.r)) {
            let [dist_from_projection, shortest_segment_from_projection] =
                Distance.point2circle(shortest_segment_from_center.end, circle);
            if (shortest_segment_from_projection.end.on(arc)) {
                return [dist_from_projection, shortest_segment_from_projection];
            }
        } else {
            let dist_and_segment = [];
            dist_and_segment.push(Distance.point2line(arc.start, line));
            dist_and_segment.push(Distance.point2line(arc.end, line));

            Distance.sort(dist_and_segment);
            return dist_and_segment[0];
        }
    }

    /**
     * Calculate distance and shortest segment between arc and circle
     * @param arc
     * @param circle2
     * @returns {Number | Segment} - distance and shortest segment
     */
    static arc2circle(arc, circle2) {
        let ip = arc.intersect(circle2);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];
        }

        let circle1 = new Flatten.Circle(arc.center, arc.r);

        let [dist, shortest_segment] = Distance.circle2circle(circle1, circle2);
        if (shortest_segment.start.on(arc)) {
            return [dist, shortest_segment];
        } else {
            let dist_and_segment = [];

            dist_and_segment.push(Distance.point2circle(arc.start, circle2));
            dist_and_segment.push(Distance.point2circle(arc.end, circle2));

            Distance.sort(dist_and_segment);

            return dist_and_segment[0];
        }
    }

    /**
     * Calculate distance and shortest segment between two arcs
     * @param arc1
     * @param arc2
     * @returns {Number | Segment} - distance and shortest segment
     */
    static arc2arc(arc1, arc2) {
        let ip = arc1.intersect(arc2);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];
        }

        let circle1 = new Flatten.Circle(arc1.center, arc1.r);
        let circle2 = new Flatten.Circle(arc2.center, arc2.r);

        let [dist, shortest_segment] = Distance.circle2circle(circle1, circle2);
        if (shortest_segment.start.on(arc1) && shortest_segment.end.on(arc2)) {
            return [dist, shortest_segment];
        } else {
            let dist_and_segment = [];

            let dist_tmp, segment_tmp;

            [dist_tmp, segment_tmp] = Distance.point2arc(arc1.start, arc2);
            if (segment_tmp.end.on(arc2)) {
                dist_and_segment.push([dist_tmp, segment_tmp]);
            }

            [dist_tmp, segment_tmp] = Distance.point2arc(arc1.end, arc2);
            if (segment_tmp.end.on(arc2)) {
                dist_and_segment.push([dist_tmp, segment_tmp]);
            }

            [dist_tmp, segment_tmp] = Distance.point2arc(arc2.start, arc1);
            if (segment_tmp.end.on(arc1)) {
                dist_and_segment.push([dist_tmp, segment_tmp.reverse()]);
            }

            [dist_tmp, segment_tmp] = Distance.point2arc(arc2.end, arc1);
            if (segment_tmp.end.on(arc1)) {
                dist_and_segment.push([dist_tmp, segment_tmp.reverse()]);
            }

            [dist_tmp, segment_tmp] = Distance.point2point(arc1.start, arc2.start);
            dist_and_segment.push([dist_tmp, segment_tmp]);

            [dist_tmp, segment_tmp] = Distance.point2point(arc1.start, arc2.end);
            dist_and_segment.push([dist_tmp, segment_tmp]);

            [dist_tmp, segment_tmp] = Distance.point2point(arc1.end, arc2.start);
            dist_and_segment.push([dist_tmp, segment_tmp]);

            [dist_tmp, segment_tmp] = Distance.point2point(arc1.end, arc2.end);
            dist_and_segment.push([dist_tmp, segment_tmp]);

            Distance.sort(dist_and_segment);

            return dist_and_segment[0];
        }
    }

    /**
     * Calculate distance and shortest segment between point and polygon
     * @param point
     * @param polygon
     * @returns {Number | Segment} - distance and shortest segment
     */
    static point2polygon(point, polygon) {
        let min_dist_and_segment = [Number.POSITIVE_INFINITY, new Flatten.Segment()];
        for (let edge of polygon.edges) {
            let [dist, shortest_segment] = (edge.shape instanceof Flatten.Segment) ?
                Distance.point2segment(point, edge.shape) : Distance.point2arc(point, edge.shape);
            if (Flatten.Utils.LT(dist, min_dist_and_segment[0])) {
                min_dist_and_segment = [dist, shortest_segment];
            }
        }
        return min_dist_and_segment;
    }

    static shape2polygon(shape, polygon) {
        let min_dist_and_segment = [Number.POSITIVE_INFINITY, new Flatten.Segment()];
        for (let edge of polygon.edges) {
            let [dist, shortest_segment] = shape.distanceTo(edge.shape);
            if (Flatten.Utils.LT(dist, min_dist_and_segment[0])) {
                min_dist_and_segment = [dist, shortest_segment];
            }
        }
        return min_dist_and_segment;
    }

    /**
     * Calculate distance and shortest segment between two polygons
     * @param polygon1
     * @param polygon2
     * @returns {Number | Segment} - distance and shortest segment
     */
    static polygon2polygon(polygon1, polygon2) {
        let min_dist_and_segment = [Number.POSITIVE_INFINITY, new Flatten.Segment()];
        for (let edge1 of polygon1.edges) {
            for (let edge2 of polygon2.edges) {
                let [dist, shortest_segment] = edge1.shape.distanceTo(edge2.shape);
                if (Flatten.Utils.LT(dist, min_dist_and_segment[0])) {
                    min_dist_and_segment = [dist, shortest_segment];
                }
            }
        }
        return min_dist_and_segment;
    }

    /**
     * Returns [mindist, maxdist] array of squared minimal and maximal distance between boxes
     * Minimal distance by x is
     *    (box2.xmin - box1.xmax), if box1 is left to box2
     *    (box1.xmin - box2.xmax), if box2 is left to box1
     *    0,                       if box1 and box2 are intersected by x
     * Minimal distance by y is defined in the same way
     *
     * Maximal distance is estimated as a sum of squared dimensions of the merged box
     *
     * @param box1
     * @param box2
     * @returns {Number | Number} - minimal and maximal distance
     */
    static box2box_minmax(box1, box2) {
        let mindist_x = Math.max(Math.max(box1.xmin - box2.xmax, 0), Math.max(box2.xmin - box1.xmax, 0));
        let mindist_y = Math.max(Math.max(box1.ymin - box2.ymax, 0), Math.max(box2.ymin - box1.ymax, 0));
        let mindist = mindist_x * mindist_x + mindist_y * mindist_y;

        let box = box1.merge(box2);
        let dx = box.xmax - box.xmin;
        let dy = box.ymax - box.ymin;
        let maxdist = dx * dx + dy * dy;

        return [mindist, maxdist];
    }

    static minmax_tree_process_level(shape, level, min_stop, tree) {
        // Calculate minmax distance to each shape in current level
        // Insert result into the interval tree for further processing
        // update min_stop with maxdist, it will be the new stop distance
        let mindist, maxdist;
        for (let node of level) {

            // [mindist, maxdist] = Distance.box2box_minmax(shape.box, node.max);
            // if (Flatten.Utils.GT(mindist, min_stop))
            //     continue;

            // Estimate min-max dist to the shape stored in the node.item, using node.item.key which is shape's box
            [mindist, maxdist] = Distance.box2box_minmax(shape.box, node.item.key);
            if (node.item.value instanceof Flatten.Edge) {
                tree.insert([mindist, maxdist], node.item.value.shape);
            } else {
                tree.insert([mindist, maxdist], node.item.value);
            }
            if (Flatten.Utils.LT(maxdist, min_stop)) {
                min_stop = maxdist;                       // this will be the new distance estimation
            }
        }

        if (level.length === 0)
            return min_stop;

        // Calculate new level from left and right children of the current
        let new_level_left = level.map(node => node.left.isNil() ? undefined : node.left).filter(node => node !== undefined);
        let new_level_right = level.map(node => node.right.isNil() ? undefined : node.right).filter(node => node !== undefined);
        // Merge left and right subtrees and leave only relevant subtrees
        let new_level = [...new_level_left, ...new_level_right].filter(node => {
            // Node subtree quick reject, node.max is a subtree box
            let [mindist, maxdist] = Distance.box2box_minmax(shape.box, node.max);
            return (Flatten.Utils.LE(mindist, min_stop));
        });

        min_stop = Distance.minmax_tree_process_level(shape, new_level, min_stop, tree);
        return min_stop;
    }

    /**
     * Calculates sorted tree of [mindist, maxdist] intervals between query shape
     * and shapes of the planar set.
     * @param shape
     * @param set
     */
    static minmax_tree(shape, set, min_stop) {
        let tree = new IntervalTree();
        let level = [set.index.root];
        let squared_min_stop = min_stop < Number.POSITIVE_INFINITY ? min_stop * min_stop : Number.POSITIVE_INFINITY;
        squared_min_stop = Distance.minmax_tree_process_level(shape, level, squared_min_stop, tree);
        return tree;
    }

    static minmax_tree_calc_distance(shape, node, min_dist_and_segment) {
        let min_dist_and_segment_new, stop;
        if (node != null && !node.isNil()) {
            [min_dist_and_segment_new, stop] = Distance.minmax_tree_calc_distance(shape, node.left, min_dist_and_segment);

            if (stop) {
                return [min_dist_and_segment_new, stop];
            }

            if (Flatten.Utils.LT(min_dist_and_segment_new[0], Math.sqrt(node.item.key.low))) {
                return [min_dist_and_segment_new, true];   // stop condition
            }

            let [dist, shortest_segment] = Distance.distance(shape, node.item.value);
            // console.log(dist)
            if (Flatten.Utils.LT(dist, min_dist_and_segment_new[0])) {
                min_dist_and_segment_new = [dist, shortest_segment];
            }

            [min_dist_and_segment_new, stop] = Distance.minmax_tree_calc_distance(shape, node.right, min_dist_and_segment_new);

            return [min_dist_and_segment_new, stop];
        }

        return [min_dist_and_segment, false];
    }

    /**
     * Calculates distance between shape and Planar Set of shapes
     * @param shape
     * @param {PlanarSet} set
     * @param {Number} min_stop
     * @returns {*}
     */
    static shape2planarSet(shape, set, min_stop = Number.POSITIVE_INFINITY) {
        let min_dist_and_segment = [min_stop, new Flatten.Segment()];
        let stop = false;
        if (set instanceof Flatten.PlanarSet) {
            let tree = Distance.minmax_tree(shape, set, min_stop);
            [min_dist_and_segment, stop] = Distance.minmax_tree_calc_distance(shape, tree.root, min_dist_and_segment);
        }
        return min_dist_and_segment;
    }

    static sort(dist_and_segment) {
        dist_and_segment.sort((d1, d2) => {
            if (Flatten.Utils.LT(d1[0], d2[0])) {
                return -1;
            }
            if (Flatten.Utils.GT(d1[0], d2[0])) {
                return 1;
            }
            return 0;
        });
    }

    static distance(shape1, shape2) {
        return shape1.distanceTo(shape2);
    }
}

Flatten.Distance = Distance;

/**
 * Created by Alex Bol on 3/7/2017.
 */

/**
 * Inversion is a transformation of the Euclidean plane that maps generalized circles
 * (where line is considered as a circle with infinite radius) into generalized circles
 * See also https://en.wikipedia.org/wiki/Inversive_geometry and
 * http://mathworld.wolfram.com/Inversion.html <br/>
 * Inversion also may be considered as a reflection of the point in the plane with respect
 * to inversion circle so that R^2 = OP * OP',
 * where <br/>
 * O - center of inversion circle <br/>
 * R - radius of inversion circle <br/>
 * P - point of plane <br/>
 * P' - inversion of the point P
 *
 * @param {Line | Circle} shape - shape to be transformed
 * @param {Circle} inversion_circle - inversion circle
 * @returns {Line | Circle} - result of transformation
 */
function inverse(shape, inversion_circle) {
    let dist, shortest_segment;
    let dx, dy;
    let s;
    let v;
    let r;
    let d;
    let pt;

    if (shape instanceof Flatten.Line) {
        [dist, shortest_segment] = inversion_circle.pc.distanceTo(shape);
        if (EQ_0(dist)) {            // Line passing through inversion center, is mapping to itself
            return shape.clone();
        } else {                           // Line not passing through inversion center is mapping into circle
            r = inversion_circle.r * inversion_circle.r / (2 * dist);
            v = new Flatten.Vector(inversion_circle.pc, shortest_segment.end);
            v = v.multiply(r / dist);
            return new Flatten.Circle(inversion_circle.pc.translate(v), r);
        }
    } else if (shape instanceof Flatten.Circle) {
        [dist, shortest_segment] = inversion_circle.pc.distanceTo(shape.pc);
        if (EQ(dist, shape.r)) {     // Circle passing through inversion center mapped into line
            d = inversion_circle.r * inversion_circle.r / (2 * shape.r);
            v = new Flatten.Vector(shape.pc, inversion_circle.pc);
            v = v.normalize();
            pt = inversion_circle.pc.translate(v.multiply(d));
            return new Flatten.Line(pt, v);
        } else {                           // Circle not passing through inversion center - map into another circle */
            /* Taken from http://mathworld.wolfram.com */

            dx = shape.pc.x - inversion_circle.pc.x;
            dy = shape.pc.y - inversion_circle.pc.y;

            s = inversion_circle.r * inversion_circle.r / (dx * dx + dy * dy - shape.r * shape.r);

            let pc = new Flatten.Point(inversion_circle.pc.x + s * dx, inversion_circle.pc.y + s * dy);

            return new Flatten.Circle(pc, Math.abs(s) * shape.r);
        }
    }
}

/**
 * Created by Alex Bol on 2/18/2017.
 */

Flatten.BooleanOperations = BooleanOperations;
Flatten.Relations = Relations;

exports.Arc = Arc;
exports.BOUNDARY = BOUNDARY;
exports.BooleanOperations = BooleanOperations;
exports.Box = Box;
exports.CCW = CCW;
exports.CW = CW;
exports.Circle = Circle;
exports.Distance = Distance;
exports.Edge = Edge;
exports.Errors = errors;
exports.Face = Face;
exports.INSIDE = INSIDE;
exports.Line = Line;
exports.Matrix = Matrix;
exports.Multiline = Multiline;
exports.ORIENTATION = ORIENTATION;
exports.OUTSIDE = OUTSIDE;
exports.PlanarSet = PlanarSet;
exports.Point = Point;
exports.Polygon = Polygon;
exports.Ray = Ray;
exports.Relations = Relations;
exports.Segment = Segment;
exports.Utils = Utils;
exports.Vector = Vector;
exports.arc = arc;
exports.box = box;
exports.circle = circle;
exports.default = Flatten;
exports.inverse = inverse;
exports.line = line;
exports.matrix = matrix;
exports.multiline = multiline;
exports.point = point;
exports.polygon = polygon;
exports.ray = ray;
exports.ray_shoot = ray_shoot;
exports.segment = segment;
exports.vector = vector;

},{}],3:[function(require,module,exports){
/**
 * JSTS. See https://github.com/bjornharrtell/jsts
 * https://github.com/bjornharrtell/jsts/blob/master/LICENSE_EDLv1.txt
 * https://github.com/bjornharrtell/jsts/blob/master/LICENSE_EPLv1.txt
 * @license
 */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof define&&define.amd?define(["exports"],e):e((t="undefined"!=typeof globalThis?globalThis:t||self).jsts={})}(this,(function(t){"use strict";class e{static equalsWithTolerance(t,e,n){return Math.abs(t-e)<=n}}class n extends Error{constructor(t){super(t),this.name=Object.keys({Exception:n})[0]}toString(){return this.message}}class s extends n{constructor(t){super(t),this.name=Object.keys({IllegalArgumentException:s})[0]}}class i{constructor(t,e){this.low=e||0,this.high=t||0}static toBinaryString(t){let e,n="";for(e=2147483648;e>0;e>>>=1)n+=(t.high&e)===e?"1":"0";for(e=2147483648;e>0;e>>>=1)n+=(t.low&e)===e?"1":"0";return n}}function r(){}function o(){}function l(){}function a(){}function c(){}r.NaN=NaN,r.isNaN=t=>Number.isNaN(t),r.isInfinite=t=>!Number.isFinite(t),r.MAX_VALUE=Number.MAX_VALUE,"function"==typeof Float64Array&&"function"==typeof Int32Array?function(){const t=2146435072,e=new Float64Array(1),n=new Int32Array(e.buffer);r.doubleToLongBits=function(s){e[0]=s;let r=0|n[0],o=0|n[1];return(o&t)===t&&0!=(1048575&o)&&0!==r&&(r=0,o=2146959360),new i(o,r)},r.longBitsToDouble=function(t){return n[0]=t.low,n[1]=t.high,e[0]}}():function(){const t=1023,e=Math.log2,n=Math.floor,s=Math.pow,o=function(){for(let t=53;t>0;t--){const i=s(2,t)-1;if(n(e(i))+1===t)return i}return 0}();r.doubleToLongBits=function(r){let l,a,c,h,u,g,d,_,p;if(r<0||1/r===Number.NEGATIVE_INFINITY?(g=1<<31,r=-r):g=0,0===r)return p=0,_=g,new i(_,p);if(r===1/0)return p=0,_=2146435072|g,new i(_,p);if(r!=r)return p=0,_=2146959360,new i(_,p);if(h=0,p=0,l=n(r),l>1)if(l<=o)h=n(e(l)),h<=20?(p=0,_=l<<20-h&1048575):(c=h-20,a=s(2,c),p=l%a<<32-c,_=l/a&1048575);else for(c=l,p=0;a=c/2,c=n(a),0!==c;)h++,p>>>=1,p|=(1&_)<<31,_>>>=1,a!==c&&(_|=524288);if(d=h+t,u=0===l,l=r-l,h<52&&0!==l)for(c=0;;){if(a=2*l,a>=1?(l=a-1,u?(d--,u=!1):(c<<=1,c|=1,h++)):(l=a,u?0==--d&&(h++,u=!1):(c<<=1,h++)),20===h)_|=c,c=0;else if(52===h){p|=c;break}if(1===a){h<20?_|=c<<20-h:h<52&&(p|=c<<52-h);break}}return _|=d<<20,_|=g,new i(_,p)},r.longBitsToDouble=function(e){let n,i,r,o;const l=e.high,a=e.low,c=l&1<<31?-1:1;for(r=((2146435072&l)>>20)-t,o=0,i=1<<19,n=1;n<=20;n++)l&i&&(o+=s(2,-n)),i>>>=1;for(i=1<<31,n=21;n<=52;n++)a&i&&(o+=s(2,-n)),i>>>=1;if(-1023===r){if(0===o)return 0*c;r=-1022}else{if(1024===r)return 0===o?c/0:NaN;o+=1}return c*o*s(2,r)}}();class h extends n{constructor(t){super(t),this.name=Object.keys({RuntimeException:h})[0]}}class u extends h{constructor(){super(),u.constructor_.apply(this,arguments)}static constructor_(){if(0===arguments.length)h.constructor_.call(this);else if(1===arguments.length){const t=arguments[0];h.constructor_.call(this,t)}}}class g{static shouldNeverReachHere(){if(0===arguments.length)g.shouldNeverReachHere(null);else if(1===arguments.length){const t=arguments[0];throw new u("Should never reach here"+(null!==t?": "+t:""))}}static isTrue(){if(1===arguments.length){const t=arguments[0];g.isTrue(t,null)}else if(2===arguments.length){const t=arguments[1];if(!arguments[0])throw null===t?new u:new u(t)}}static equals(){if(2===arguments.length){const t=arguments[0],e=arguments[1];g.equals(t,e,null)}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];if(!e.equals(t))throw new u("Expected "+t+" but encountered "+e+(null!==n?": "+n:""))}}}const d=new ArrayBuffer(8),_=new Float64Array(d),p=new Int32Array(d);class m{constructor(){m.constructor_.apply(this,arguments)}static constructor_(){if(this.x=null,this.y=null,this.z=null,0===arguments.length)m.constructor_.call(this,0,0);else if(1===arguments.length){const t=arguments[0];m.constructor_.call(this,t.x,t.y,t.getZ())}else if(2===arguments.length){const t=arguments[0],e=arguments[1];m.constructor_.call(this,t,e,m.NULL_ORDINATE)}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];this.x=t,this.y=e,this.z=n}}static hashCode(t){return _[0]=t,p[0]^p[1]}getM(){return r.NaN}setOrdinate(t,e){switch(t){case m.X:this.x=e;break;case m.Y:this.y=e;break;case m.Z:this.setZ(e);break;default:throw new s("Invalid ordinate index: "+t)}}equals2D(){if(1===arguments.length){const t=arguments[0];return this.x===t.x&&this.y===t.y}if(2===arguments.length){const t=arguments[0],n=arguments[1];return!!e.equalsWithTolerance(this.x,t.x,n)&&!!e.equalsWithTolerance(this.y,t.y,n)}}setM(t){throw new s("Invalid ordinate index: "+m.M)}getZ(){return this.z}getOrdinate(t){switch(t){case m.X:return this.x;case m.Y:return this.y;case m.Z:return this.getZ()}throw new s("Invalid ordinate index: "+t)}equals3D(t){return this.x===t.x&&this.y===t.y&&(this.getZ()===t.getZ()||r.isNaN(this.getZ())&&r.isNaN(t.getZ()))}equals(t){return t instanceof m&&this.equals2D(t)}equalInZ(t,n){return e.equalsWithTolerance(this.getZ(),t.getZ(),n)}setX(t){this.x=t}compareTo(t){const e=t;return this.x<e.x?-1:this.x>e.x?1:this.y<e.y?-1:this.y>e.y?1:0}getX(){return this.x}setZ(t){this.z=t}clone(){try{return null}catch(t){if(t instanceof CloneNotSupportedException)return g.shouldNeverReachHere("this shouldn't happen because this class is Cloneable"),null;throw t}}copy(){return new m(this)}toString(){return"("+this.x+", "+this.y+", "+this.getZ()+")"}distance3D(t){const e=this.x-t.x,n=this.y-t.y,s=this.getZ()-t.getZ();return Math.sqrt(e*e+n*n+s*s)}getY(){return this.y}setY(t){this.y=t}distance(t){const e=this.x-t.x,n=this.y-t.y;return Math.sqrt(e*e+n*n)}hashCode(){let t=17;return t=37*t+m.hashCode(this.x),t=37*t+m.hashCode(this.y),t}setCoordinate(t){this.x=t.x,this.y=t.y,this.z=t.getZ()}get interfaces_(){return[o,l,c]}}class f{constructor(){f.constructor_.apply(this,arguments)}static constructor_(){if(this._dimensionsToTest=2,0===arguments.length)f.constructor_.call(this,2);else if(1===arguments.length){const t=arguments[0];if(2!==t&&3!==t)throw new s("only 2 or 3 dimensions may be specified");this._dimensionsToTest=t}}static compare(t,e){return t<e?-1:t>e?1:r.isNaN(t)?r.isNaN(e)?0:-1:r.isNaN(e)?1:0}compare(t,e){const n=f.compare(t.x,e.x);if(0!==n)return n;const s=f.compare(t.y,e.y);if(0!==s)return s;if(this._dimensionsToTest<=2)return 0;return f.compare(t.getZ(),e.getZ())}get interfaces_(){return[a]}}m.DimensionalComparator=f,m.NULL_ORDINATE=r.NaN,m.X=0,m.Y=1,m.Z=2,m.M=3;class y extends m{constructor(){super(),y.constructor_.apply(this,arguments)}static constructor_(){if(0===arguments.length)m.constructor_.call(this);else if(1===arguments.length){if(arguments[0]instanceof y){const t=arguments[0];m.constructor_.call(this,t.x,t.y)}else if(arguments[0]instanceof m){const t=arguments[0];m.constructor_.call(this,t.x,t.y)}}else if(2===arguments.length){const t=arguments[0],e=arguments[1];m.constructor_.call(this,t,e,m.NULL_ORDINATE)}}setOrdinate(t,e){switch(t){case y.X:this.x=e;break;case y.Y:this.y=e;break;default:throw new s("Invalid ordinate index: "+t)}}getZ(){return m.NULL_ORDINATE}getOrdinate(t){switch(t){case y.X:return this.x;case y.Y:return this.y}throw new s("Invalid ordinate index: "+t)}setZ(t){throw new s("CoordinateXY dimension 2 does not support z-ordinate")}copy(){return new y(this)}toString(){return"("+this.x+", "+this.y+")"}setCoordinate(t){this.x=t.x,this.y=t.y,this.z=t.getZ()}}y.X=0,y.Y=1,y.Z=-1,y.M=-1;class x extends m{constructor(){super(),x.constructor_.apply(this,arguments)}static constructor_(){if(this._m=null,0===arguments.length)m.constructor_.call(this),this._m=0;else if(1===arguments.length){if(arguments[0]instanceof x){const t=arguments[0];m.constructor_.call(this,t.x,t.y),this._m=t._m}else if(arguments[0]instanceof m){const t=arguments[0];m.constructor_.call(this,t.x,t.y),this._m=this.getM()}}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];m.constructor_.call(this,t,e,m.NULL_ORDINATE),this._m=n}}getM(){return this._m}setOrdinate(t,e){switch(t){case x.X:this.x=e;break;case x.Y:this.y=e;break;case x.M:this._m=e;break;default:throw new s("Invalid ordinate index: "+t)}}setM(t){this._m=t}getZ(){return m.NULL_ORDINATE}getOrdinate(t){switch(t){case x.X:return this.x;case x.Y:return this.y;case x.M:return this._m}throw new s("Invalid ordinate index: "+t)}setZ(t){throw new s("CoordinateXY dimension 2 does not support z-ordinate")}copy(){return new x(this)}toString(){return"("+this.x+", "+this.y+" m="+this.getM()+")"}setCoordinate(t){this.x=t.x,this.y=t.y,this.z=t.getZ(),this._m=t.getM()}}x.X=0,x.Y=1,x.Z=-1,x.M=2;class E extends m{constructor(){super(),E.constructor_.apply(this,arguments)}static constructor_(){if(this._m=null,0===arguments.length)m.constructor_.call(this),this._m=0;else if(1===arguments.length){if(arguments[0]instanceof E){const t=arguments[0];m.constructor_.call(this,t),this._m=t._m}else if(arguments[0]instanceof m){const t=arguments[0];m.constructor_.call(this,t),this._m=this.getM()}}else if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];m.constructor_.call(this,t,e,n),this._m=s}}getM(){return this._m}setOrdinate(t,e){switch(t){case m.X:this.x=e;break;case m.Y:this.y=e;break;case m.Z:this.z=e;break;case m.M:this._m=e;break;default:throw new s("Invalid ordinate index: "+t)}}setM(t){this._m=t}getOrdinate(t){switch(t){case m.X:return this.x;case m.Y:return this.y;case m.Z:return this.getZ();case m.M:return this.getM()}throw new s("Invalid ordinate index: "+t)}copy(){return new E(this)}toString(){return"("+this.x+", "+this.y+", "+this.getZ()+" m="+this.getM()+")"}setCoordinate(t){this.x=t.x,this.y=t.y,this.z=t.getZ(),this._m=t.getM()}}function I(t,e){return t.interfaces_&&t.interfaces_.indexOf(e)>-1}class N{add(){}addAll(){}isEmpty(){}iterator(){}size(){}toArray(){}remove(){}}class S extends n{constructor(t){super(t),this.name=Object.keys({IndexOutOfBoundsException:S})[0]}}class w extends N{get(){}set(){}isEmpty(){}}class C extends n{constructor(t){super(t),this.name=Object.keys({NoSuchElementException:C})[0]}}class L extends w{constructor(t){super(),this.array=[],t instanceof N&&this.addAll(t)}get interfaces_(){return[w,N]}ensureCapacity(){}add(t){return 1===arguments.length?this.array.push(t):this.array.splice(arguments[0],0,arguments[1]),!0}clear(){this.array=[]}addAll(t){for(const e of t)this.array.push(e)}set(t,e){const n=this.array[t];return this.array[t]=e,n}iterator(){return new T(this)}get(t){if(t<0||t>=this.size())throw new S;return this.array[t]}isEmpty(){return 0===this.array.length}sort(t){t?this.array.sort(((e,n)=>t.compare(e,n))):this.array.sort()}size(){return this.array.length}toArray(){return this.array.slice()}remove(t){for(let e=0,n=this.array.length;e<n;e++)if(this.array[e]===t)return!!this.array.splice(e,1);return!1}[Symbol.iterator](){return this.array.values()}}class T{constructor(t){this.arrayList=t,this.position=0}next(){if(this.position===this.arrayList.size())throw new C;return this.arrayList.get(this.position++)}hasNext(){return this.position<this.arrayList.size()}set(t){return this.arrayList.set(this.position-1,t)}remove(){this.arrayList.remove(this.arrayList.get(this.position))}}class R extends L{constructor(){super(),R.constructor_.apply(this,arguments)}static constructor_(){if(0===arguments.length);else if(1===arguments.length){const t=arguments[0];this.ensureCapacity(t.length),this.add(t,!0)}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this.ensureCapacity(t.length),this.add(t,e)}}getCoordinate(t){return this.get(t)}addAll(){if(2===arguments.length&&"boolean"==typeof arguments[1]&&I(arguments[0],N)){const t=arguments[1];let e=!1;for(let n=arguments[0].iterator();n.hasNext();)this.add(n.next(),t),e=!0;return e}return super.addAll.apply(this,arguments)}clone(){const t=super.clone.call(this);for(let e=0;e<this.size();e++)t.add(e,this.get(e).clone());return t}toCoordinateArray(){if(0===arguments.length)return this.toArray(R.coordArrayType);if(1===arguments.length){if(arguments[0])return this.toArray(R.coordArrayType);const t=this.size(),e=new Array(t).fill(null);for(let n=0;n<t;n++)e[n]=this.get(t-n-1);return e}}add(){if(1===arguments.length){const t=arguments[0];return super.add.call(this,t)}if(2===arguments.length){if(arguments[0]instanceof Array&&"boolean"==typeof arguments[1]){const t=arguments[0],e=arguments[1];return this.add(t,e,!0),!0}if(arguments[0]instanceof m&&"boolean"==typeof arguments[1]){const t=arguments[0];if(!arguments[1]&&this.size()>=1){if(this.get(this.size()-1).equals2D(t))return null}super.add.call(this,t)}else if(arguments[0]instanceof Object&&"boolean"==typeof arguments[1]){const t=arguments[0],e=arguments[1];return this.add(t,e),!0}}else if(3===arguments.length){if("boolean"==typeof arguments[2]&&arguments[0]instanceof Array&&"boolean"==typeof arguments[1]){const t=arguments[0],e=arguments[1];if(arguments[2])for(let n=0;n<t.length;n++)this.add(t[n],e);else for(let n=t.length-1;n>=0;n--)this.add(t[n],e);return!0}if("boolean"==typeof arguments[2]&&Number.isInteger(arguments[0])&&arguments[1]instanceof m){const t=arguments[0],e=arguments[1];if(!arguments[2]){const n=this.size();if(n>0){if(t>0){if(this.get(t-1).equals2D(e))return null}if(t<n){if(this.get(t).equals2D(e))return null}}}super.add.call(this,t,e)}}else if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];let i=1;n>s&&(i=-1);for(let r=n;r!==s;r+=i)this.add(t[r],e);return!0}}closeRing(){if(this.size()>0){const t=this.get(0).copy();this.add(t,!1)}}}R.coordArrayType=new Array(0).fill(null);class P{filter(t,e){}isDone(){}isGeometryChanged(){}}class O{constructor(){O.constructor_.apply(this,arguments)}static constructor_(){if(this._minx=null,this._maxx=null,this._miny=null,this._maxy=null,0===arguments.length)this.init();else if(1===arguments.length){if(arguments[0]instanceof m){const t=arguments[0];this.init(t.x,t.x,t.y,t.y)}else if(arguments[0]instanceof O){const t=arguments[0];this.init(t)}}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this.init(t.x,e.x,t.y,e.y)}else if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];this.init(t,e,n,s)}}static intersects(){if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];return n.x>=(t.x<e.x?t.x:e.x)&&n.x<=(t.x>e.x?t.x:e.x)&&n.y>=(t.y<e.y?t.y:e.y)&&n.y<=(t.y>e.y?t.y:e.y)}if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];let i=Math.min(n.x,s.x),r=Math.max(n.x,s.x),o=Math.min(t.x,e.x),l=Math.max(t.x,e.x);return!(o>r)&&(!(l<i)&&(i=Math.min(n.y,s.y),r=Math.max(n.y,s.y),o=Math.min(t.y,e.y),l=Math.max(t.y,e.y),!(o>r)&&!(l<i)))}}getArea(){return this.getWidth()*this.getHeight()}equals(t){if(!(t instanceof O))return!1;const e=t;return this.isNull()?e.isNull():this._maxx===e.getMaxX()&&this._maxy===e.getMaxY()&&this._minx===e.getMinX()&&this._miny===e.getMinY()}intersection(t){if(this.isNull()||t.isNull()||!this.intersects(t))return new O;const e=this._minx>t._minx?this._minx:t._minx,n=this._miny>t._miny?this._miny:t._miny,s=this._maxx<t._maxx?this._maxx:t._maxx,i=this._maxy<t._maxy?this._maxy:t._maxy;return new O(e,s,n,i)}isNull(){return this._maxx<this._minx}getMaxX(){return this._maxx}covers(){if(1===arguments.length){if(arguments[0]instanceof m){const t=arguments[0];return this.covers(t.x,t.y)}if(arguments[0]instanceof O){const t=arguments[0];return!this.isNull()&&!t.isNull()&&(t.getMinX()>=this._minx&&t.getMaxX()<=this._maxx&&t.getMinY()>=this._miny&&t.getMaxY()<=this._maxy)}}else if(2===arguments.length){const t=arguments[0],e=arguments[1];return!this.isNull()&&(t>=this._minx&&t<=this._maxx&&e>=this._miny&&e<=this._maxy)}}intersects(){if(1===arguments.length){if(arguments[0]instanceof O){const t=arguments[0];return!this.isNull()&&!t.isNull()&&!(t._minx>this._maxx||t._maxx<this._minx||t._miny>this._maxy||t._maxy<this._miny)}if(arguments[0]instanceof m){const t=arguments[0];return this.intersects(t.x,t.y)}}else if(2===arguments.length){if(arguments[0]instanceof m&&arguments[1]instanceof m){const t=arguments[0],e=arguments[1];if(this.isNull())return!1;if((t.x<e.x?t.x:e.x)>this._maxx)return!1;if((t.x>e.x?t.x:e.x)<this._minx)return!1;if((t.y<e.y?t.y:e.y)>this._maxy)return!1;return!((t.y>e.y?t.y:e.y)<this._miny)}if("number"==typeof arguments[0]&&"number"==typeof arguments[1]){const t=arguments[0],e=arguments[1];return!this.isNull()&&!(t>this._maxx||t<this._minx||e>this._maxy||e<this._miny)}}}getMinY(){return this._miny}getDiameter(){if(this.isNull())return 0;const t=this.getWidth(),e=this.getHeight();return Math.sqrt(t*t+e*e)}getMinX(){return this._minx}expandToInclude(){if(1===arguments.length){if(arguments[0]instanceof m){const t=arguments[0];this.expandToInclude(t.x,t.y)}else if(arguments[0]instanceof O){const t=arguments[0];if(t.isNull())return null;this.isNull()?(this._minx=t.getMinX(),this._maxx=t.getMaxX(),this._miny=t.getMinY(),this._maxy=t.getMaxY()):(t._minx<this._minx&&(this._minx=t._minx),t._maxx>this._maxx&&(this._maxx=t._maxx),t._miny<this._miny&&(this._miny=t._miny),t._maxy>this._maxy&&(this._maxy=t._maxy))}}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this.isNull()?(this._minx=t,this._maxx=t,this._miny=e,this._maxy=e):(t<this._minx&&(this._minx=t),t>this._maxx&&(this._maxx=t),e<this._miny&&(this._miny=e),e>this._maxy&&(this._maxy=e))}}minExtent(){if(this.isNull())return 0;const t=this.getWidth(),e=this.getHeight();return t<e?t:e}getWidth(){return this.isNull()?0:this._maxx-this._minx}compareTo(t){const e=t;return this.isNull()?e.isNull()?0:-1:e.isNull()?1:this._minx<e._minx?-1:this._minx>e._minx?1:this._miny<e._miny?-1:this._miny>e._miny?1:this._maxx<e._maxx?-1:this._maxx>e._maxx?1:this._maxy<e._maxy?-1:this._maxy>e._maxy?1:0}translate(t,e){if(this.isNull())return null;this.init(this.getMinX()+t,this.getMaxX()+t,this.getMinY()+e,this.getMaxY()+e)}copy(){return new O(this)}toString(){return"Env["+this._minx+" : "+this._maxx+", "+this._miny+" : "+this._maxy+"]"}setToNull(){this._minx=0,this._maxx=-1,this._miny=0,this._maxy=-1}disjoint(t){return!(!this.isNull()&&!t.isNull())||(t._minx>this._maxx||t._maxx<this._minx||t._miny>this._maxy||t._maxy<this._miny)}getHeight(){return this.isNull()?0:this._maxy-this._miny}maxExtent(){if(this.isNull())return 0;const t=this.getWidth(),e=this.getHeight();return t>e?t:e}expandBy(){if(1===arguments.length){const t=arguments[0];this.expandBy(t,t)}else if(2===arguments.length){const t=arguments[0],e=arguments[1];if(this.isNull())return null;this._minx-=t,this._maxx+=t,this._miny-=e,this._maxy+=e,(this._minx>this._maxx||this._miny>this._maxy)&&this.setToNull()}}contains(){if(1===arguments.length){if(arguments[0]instanceof O){const t=arguments[0];return this.covers(t)}if(arguments[0]instanceof m){const t=arguments[0];return this.covers(t)}}else if(2===arguments.length){const t=arguments[0],e=arguments[1];return this.covers(t,e)}}centre(){return this.isNull()?null:new m((this.getMinX()+this.getMaxX())/2,(this.getMinY()+this.getMaxY())/2)}init(){if(0===arguments.length)this.setToNull();else if(1===arguments.length){if(arguments[0]instanceof m){const t=arguments[0];this.init(t.x,t.x,t.y,t.y)}else if(arguments[0]instanceof O){const t=arguments[0];this._minx=t._minx,this._maxx=t._maxx,this._miny=t._miny,this._maxy=t._maxy}}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this.init(t.x,e.x,t.y,e.y)}else if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];t<e?(this._minx=t,this._maxx=e):(this._minx=e,this._maxx=t),n<s?(this._miny=n,this._maxy=s):(this._miny=s,this._maxy=n)}}getMaxY(){return this._maxy}distance(t){if(this.intersects(t))return 0;let e=0;this._maxx<t._minx?e=t._minx-this._maxx:this._minx>t._maxx&&(e=this._minx-t._maxx);let n=0;return this._maxy<t._miny?n=t._miny-this._maxy:this._miny>t._maxy&&(n=this._miny-t._maxy),0===e?n:0===n?e:Math.sqrt(e*e+n*n)}hashCode(){let t=17;return t=37*t+m.hashCode(this._minx),t=37*t+m.hashCode(this._maxx),t=37*t+m.hashCode(this._miny),t=37*t+m.hashCode(this._maxy),t}get interfaces_(){return[o,c]}}class v{constructor(t){this.str=t}append(t){this.str+=t}setCharAt(t,e){this.str=this.str.substr(0,t)+e+this.str.substr(t+1)}toString(){return this.str}}class M{constructor(t){this.value=t}intValue(){return this.value}compareTo(t){return this.value<t?-1:this.value>t?1:0}static compare(t,e){return t<e?-1:t>e?1:0}static isNan(t){return Number.isNaN(t)}static valueOf(t){return new M(t)}}class b{static isWhitespace(t){return t<=32&&t>=0||127===t}static toUpperCase(t){return t.toUpperCase()}}class D{constructor(){D.constructor_.apply(this,arguments)}static constructor_(){if(this._hi=0,this._lo=0,0===arguments.length)this.init(0);else if(1===arguments.length){if("number"==typeof arguments[0]){const t=arguments[0];this.init(t)}else if(arguments[0]instanceof D){const t=arguments[0];this.init(t)}else if("string"==typeof arguments[0]){const t=arguments[0];D.constructor_.call(this,D.parse(t))}}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this.init(t,e)}}static determinant(){if("number"==typeof arguments[3]&&"number"==typeof arguments[2]&&"number"==typeof arguments[0]&&"number"==typeof arguments[1]){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];return D.determinant(D.valueOf(t),D.valueOf(e),D.valueOf(n),D.valueOf(s))}if(arguments[3]instanceof D&&arguments[2]instanceof D&&arguments[0]instanceof D&&arguments[1]instanceof D){const t=arguments[1],e=arguments[2],n=arguments[3];return arguments[0].multiply(n).selfSubtract(t.multiply(e))}}static sqr(t){return D.valueOf(t).selfMultiply(t)}static valueOf(){if("string"==typeof arguments[0]){const t=arguments[0];return D.parse(t)}if("number"==typeof arguments[0]){return new D(arguments[0])}}static sqrt(t){return D.valueOf(t).sqrt()}static parse(t){let e=0;const n=t.length;for(;b.isWhitespace(t.charAt(e));)e++;let s=!1;if(e<n){const n=t.charAt(e);"-"!==n&&"+"!==n||(e++,"-"===n&&(s=!0))}const i=new D;let r=0,o=0,l=0,a=!1;for(;!(e>=n);){const n=t.charAt(e);if(e++,b.isDigit(n)){const t=n-"0";i.selfMultiply(D.TEN),i.selfAdd(t),r++}else{if("."!==n){if("e"===n||"E"===n){const n=t.substring(e);try{l=M.parseInt(n)}catch(e){throw e instanceof NumberFormatException?new NumberFormatException("Invalid exponent "+n+" in string "+t):e}break}throw new NumberFormatException("Unexpected character '"+n+"' at position "+e+" in string "+t)}o=r,a=!0}}let c=i;a||(o=r);const h=r-o-l;if(0===h)c=i;else if(h>0){const t=D.TEN.pow(h);c=i.divide(t)}else if(h<0){const t=D.TEN.pow(-h);c=i.multiply(t)}return s?c.negate():c}static createNaN(){return new D(r.NaN,r.NaN)}static copy(t){return new D(t)}static magnitude(t){const e=Math.abs(t),n=Math.log(e)/Math.log(10);let s=Math.trunc(Math.floor(n));return 10*Math.pow(10,s)<=e&&(s+=1),s}static stringOfChar(t,e){const n=new v;for(let s=0;s<e;s++)n.append(t);return n.toString()}le(t){return this._hi<t._hi||this._hi===t._hi&&this._lo<=t._lo}extractSignificantDigits(t,e){let n=this.abs(),s=D.magnitude(n._hi);const i=D.TEN.pow(s);n=n.divide(i),n.gt(D.TEN)?(n=n.divide(D.TEN),s+=1):n.lt(D.ONE)&&(n=n.multiply(D.TEN),s-=1);const r=s+1,o=new v,l=D.MAX_PRINT_DIGITS-1;for(let e=0;e<=l;e++){t&&e===r&&o.append(".");const s=Math.trunc(n._hi);if(s<0)break;let i=!1,a=0;s>9?(i=!0,a="9"):a="0"+s,o.append(a),n=n.subtract(D.valueOf(s)).multiply(D.TEN),i&&n.selfAdd(D.TEN);let c=!0;const h=D.magnitude(n._hi);if(h<0&&Math.abs(h)>=l-e&&(c=!1),!c)break}return e[0]=s,o.toString()}sqr(){return this.multiply(this)}doubleValue(){return this._hi+this._lo}subtract(){if(arguments[0]instanceof D){const t=arguments[0];return this.add(t.negate())}if("number"==typeof arguments[0]){const t=arguments[0];return this.add(-t)}}equals(){if(1===arguments.length&&arguments[0]instanceof D){const t=arguments[0];return this._hi===t._hi&&this._lo===t._lo}}isZero(){return 0===this._hi&&0===this._lo}selfSubtract(){if(arguments[0]instanceof D){const t=arguments[0];return this.isNaN()?this:this.selfAdd(-t._hi,-t._lo)}if("number"==typeof arguments[0]){const t=arguments[0];return this.isNaN()?this:this.selfAdd(-t,0)}}getSpecialNumberString(){return this.isZero()?"0.0":this.isNaN()?"NaN ":null}min(t){return this.le(t)?this:t}selfDivide(){if(1===arguments.length){if(arguments[0]instanceof D){const t=arguments[0];return this.selfDivide(t._hi,t._lo)}if("number"==typeof arguments[0]){const t=arguments[0];return this.selfDivide(t,0)}}else if(2===arguments.length){const t=arguments[0],e=arguments[1];let n=null,s=null,i=null,r=null,o=null,l=null,a=null,c=null;return o=this._hi/t,l=D.SPLIT*o,n=l-o,c=D.SPLIT*t,n=l-n,s=o-n,i=c-t,a=o*t,i=c-i,r=t-i,c=n*i-a+n*r+s*i+s*r,l=(this._hi-a-c+this._lo-o*e)/t,c=o+l,this._hi=c,this._lo=o-c+l,this}}dump(){return"DD<"+this._hi+", "+this._lo+">"}divide(){if(arguments[0]instanceof D){const t=arguments[0];let e=null,n=null,s=null,i=null,r=null,o=null,l=null,a=null;r=this._hi/t._hi,o=D.SPLIT*r,e=o-r,a=D.SPLIT*t._hi,e=o-e,n=r-e,s=a-t._hi,l=r*t._hi,s=a-s,i=t._hi-s,a=e*s-l+e*i+n*s+n*i,o=(this._hi-l-a+this._lo-r*t._lo)/t._hi,a=r+o;return new D(a,r-a+o)}if("number"==typeof arguments[0]){const t=arguments[0];return r.isNaN(t)?D.createNaN():D.copy(this).selfDivide(t,0)}}ge(t){return this._hi>t._hi||this._hi===t._hi&&this._lo>=t._lo}pow(t){if(0===t)return D.valueOf(1);let e=new D(this),n=D.valueOf(1),s=Math.abs(t);if(s>1)for(;s>0;)s%2==1&&n.selfMultiply(e),s/=2,s>0&&(e=e.sqr());else n=e;return t<0?n.reciprocal():n}ceil(){if(this.isNaN())return D.NaN;const t=Math.ceil(this._hi);let e=0;return t===this._hi&&(e=Math.ceil(this._lo)),new D(t,e)}compareTo(t){const e=t;return this._hi<e._hi?-1:this._hi>e._hi?1:this._lo<e._lo?-1:this._lo>e._lo?1:0}rint(){if(this.isNaN())return this;return this.add(.5).floor()}setValue(){if(arguments[0]instanceof D){const t=arguments[0];return this.init(t),this}if("number"==typeof arguments[0]){const t=arguments[0];return this.init(t),this}}max(t){return this.ge(t)?this:t}sqrt(){if(this.isZero())return D.valueOf(0);if(this.isNegative())return D.NaN;const t=1/Math.sqrt(this._hi),e=this._hi*t,n=D.valueOf(e),s=this.subtract(n.sqr())._hi*(.5*t);return n.add(s)}selfAdd(){if(1===arguments.length){if(arguments[0]instanceof D){const t=arguments[0];return this.selfAdd(t._hi,t._lo)}if("number"==typeof arguments[0]){const t=arguments[0];let e=null,n=null,s=null,i=null,r=null,o=null;return s=this._hi+t,r=s-this._hi,i=s-r,i=t-r+(this._hi-i),o=i+this._lo,e=s+o,n=o+(s-e),this._hi=e+n,this._lo=n+(e-this._hi),this}}else if(2===arguments.length){const t=arguments[0],e=arguments[1];let n=null,s=null,i=null,r=null,o=null,l=null,a=null,c=null;o=this._hi+t,i=this._lo+e,a=o-this._hi,c=i-this._lo,l=o-a,r=i-c,l=t-a+(this._hi-l),r=e-c+(this._lo-r),a=l+i,n=o+a,s=a+(o-n),a=r+s;const h=n+a,u=a+(n-h);return this._hi=h,this._lo=u,this}}selfMultiply(){if(1===arguments.length){if(arguments[0]instanceof D){const t=arguments[0];return this.selfMultiply(t._hi,t._lo)}if("number"==typeof arguments[0]){const t=arguments[0];return this.selfMultiply(t,0)}}else if(2===arguments.length){const t=arguments[0],e=arguments[1];let n=null,s=null,i=null,r=null,o=null,l=null;o=D.SPLIT*this._hi,n=o-this._hi,l=D.SPLIT*t,n=o-n,s=this._hi-n,i=l-t,o=this._hi*t,i=l-i,r=t-i,l=n*i-o+n*r+s*i+s*r+(this._hi*e+this._lo*t);const a=o+l;n=o-a;const c=l+n;return this._hi=a,this._lo=c,this}}selfSqr(){return this.selfMultiply(this)}floor(){if(this.isNaN())return D.NaN;const t=Math.floor(this._hi);let e=0;return t===this._hi&&(e=Math.floor(this._lo)),new D(t,e)}negate(){return this.isNaN()?this:new D(-this._hi,-this._lo)}clone(){try{return null}catch(t){if(t instanceof CloneNotSupportedException)return null;throw t}}multiply(){if(arguments[0]instanceof D){const t=arguments[0];return t.isNaN()?D.createNaN():D.copy(this).selfMultiply(t)}if("number"==typeof arguments[0]){const t=arguments[0];return r.isNaN(t)?D.createNaN():D.copy(this).selfMultiply(t,0)}}isNaN(){return r.isNaN(this._hi)}intValue(){return Math.trunc(this._hi)}toString(){const t=D.magnitude(this._hi);return t>=-3&&t<=20?this.toStandardNotation():this.toSciNotation()}toStandardNotation(){const t=this.getSpecialNumberString();if(null!==t)return t;const e=new Array(1).fill(null),n=this.extractSignificantDigits(!0,e),s=e[0]+1;let i=n;if("."===n.charAt(0))i="0"+n;else if(s<0)i="0."+D.stringOfChar("0",-s)+n;else if(-1===n.indexOf(".")){const t=s-n.length;i=n+D.stringOfChar("0",t)+".0"}return this.isNegative()?"-"+i:i}reciprocal(){let t=null,e=null,n=null,s=null,i=null,r=null,o=null,l=null;i=1/this._hi,r=D.SPLIT*i,t=r-i,l=D.SPLIT*this._hi,t=r-t,e=i-t,n=l-this._hi,o=i*this._hi,n=l-n,s=this._hi-n,l=t*n-o+t*s+e*n+e*s,r=(1-o-l-i*this._lo)/this._hi;const a=i+r;return new D(a,i-a+r)}toSciNotation(){if(this.isZero())return D.SCI_NOT_ZERO;const t=this.getSpecialNumberString();if(null!==t)return t;const e=new Array(1).fill(null),n=this.extractSignificantDigits(!1,e),s=D.SCI_NOT_EXPONENT_CHAR+e[0];if("0"===n.charAt(0))throw new IllegalStateException("Found leading zero: "+n);let i="";n.length>1&&(i=n.substring(1));const r=n.charAt(0)+"."+i;return this.isNegative()?"-"+r+s:r+s}abs(){return this.isNaN()?D.NaN:this.isNegative()?this.negate():new D(this)}isPositive(){return this._hi>0||0===this._hi&&this._lo>0}lt(t){return this._hi<t._hi||this._hi===t._hi&&this._lo<t._lo}add(){if(arguments[0]instanceof D){const t=arguments[0];return D.copy(this).selfAdd(t)}if("number"==typeof arguments[0]){const t=arguments[0];return D.copy(this).selfAdd(t)}}init(){if(1===arguments.length){if("number"==typeof arguments[0]){const t=arguments[0];this._hi=t,this._lo=0}else if(arguments[0]instanceof D){const t=arguments[0];this._hi=t._hi,this._lo=t._lo}}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this._hi=t,this._lo=e}}gt(t){return this._hi>t._hi||this._hi===t._hi&&this._lo>t._lo}isNegative(){return this._hi<0||0===this._hi&&this._lo<0}trunc(){return this.isNaN()?D.NaN:this.isPositive()?this.floor():this.ceil()}signum(){return this._hi>0?1:this._hi<0?-1:this._lo>0?1:this._lo<0?-1:0}get interfaces_(){return[c,o,l]}}D.PI=new D(3.141592653589793,12246467991473532e-32),D.TWO_PI=new D(6.283185307179586,24492935982947064e-32),D.PI_2=new D(1.5707963267948966,6123233995736766e-32),D.E=new D(2.718281828459045,14456468917292502e-32),D.NaN=new D(r.NaN,r.NaN),D.EPS=123259516440783e-46,D.SPLIT=134217729,D.MAX_PRINT_DIGITS=32,D.TEN=D.valueOf(10),D.ONE=D.valueOf(1),D.SCI_NOT_EXPONENT_CHAR="E",D.SCI_NOT_ZERO="0.0E0";class A{static orientationIndex(t,e,n){const s=A.orientationIndexFilter(t,e,n);if(s<=1)return s;const i=D.valueOf(e.x).selfAdd(-t.x),r=D.valueOf(e.y).selfAdd(-t.y),o=D.valueOf(n.x).selfAdd(-e.x),l=D.valueOf(n.y).selfAdd(-e.y);return i.selfMultiply(l).selfSubtract(r.selfMultiply(o)).signum()}static signOfDet2x2(){if(arguments[3]instanceof D&&arguments[2]instanceof D&&arguments[0]instanceof D&&arguments[1]instanceof D){const t=arguments[1],e=arguments[2],n=arguments[3];return arguments[0].multiply(n).selfSubtract(t.multiply(e)).signum()}if("number"==typeof arguments[3]&&"number"==typeof arguments[2]&&"number"==typeof arguments[0]&&"number"==typeof arguments[1]){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3],i=D.valueOf(t),r=D.valueOf(e),o=D.valueOf(n),l=D.valueOf(s);return i.multiply(l).selfSubtract(r.multiply(o)).signum()}}static intersection(t,e,n,s){const i=new D(t.y).selfSubtract(e.y),o=new D(e.x).selfSubtract(t.x),l=new D(t.x).selfMultiply(e.y).selfSubtract(new D(e.x).selfMultiply(t.y)),a=new D(n.y).selfSubtract(s.y),c=new D(s.x).selfSubtract(n.x),h=new D(n.x).selfMultiply(s.y).selfSubtract(new D(s.x).selfMultiply(n.y)),u=o.multiply(h).selfSubtract(c.multiply(l)),g=a.multiply(l).selfSubtract(i.multiply(h)),d=i.multiply(c).selfSubtract(a.multiply(o)),_=u.selfDivide(d).doubleValue(),p=g.selfDivide(d).doubleValue();return r.isNaN(_)||r.isInfinite(_)||r.isNaN(p)||r.isInfinite(p)?null:new m(_,p)}static orientationIndexFilter(t,e,n){let s=null;const i=(t.x-n.x)*(e.y-n.y),r=(t.y-n.y)*(e.x-n.x),o=i-r;if(i>0){if(r<=0)return A.signum(o);s=i+r}else{if(!(i<0))return A.signum(o);if(r>=0)return A.signum(o);s=-i-r}const l=A.DP_SAFE_EPSILON*s;return o>=l||-o>=l?A.signum(o):2}static signum(t){return t>0?1:t<0?-1:0}}A.DP_SAFE_EPSILON=1e-15;class F{getM(t){if(this.hasM()){const e=this.getDimension()-this.getMeasures();return this.getOrdinate(t,e)}return r.NaN}setOrdinate(t,e,n){}getZ(t){return this.hasZ()?this.getOrdinate(t,2):r.NaN}size(){}getOrdinate(t,e){}getCoordinate(){}getCoordinateCopy(t){}createCoordinate(){}getDimension(){}hasM(){return this.getMeasures()>0}getX(t){}hasZ(){return this.getDimension()-this.getMeasures()>2}getMeasures(){return 0}expandEnvelope(t){}copy(){}getY(t){}toCoordinateArray(){}get interfaces_(){return[l]}}F.X=0,F.Y=1,F.Z=2,F.M=3;class G{static index(t,e,n){return A.orientationIndex(t,e,n)}static isCCW(){if(arguments[0]instanceof Array){const t=arguments[0],e=t.length-1;if(e<3)throw new s("Ring has fewer than 4 points, so orientation cannot be determined");let n=t[0],i=0;for(let s=1;s<=e;s++){const e=t[s];e.y>n.y&&(n=e,i=s)}let r=i;do{r-=1,r<0&&(r=e)}while(t[r].equals2D(n)&&r!==i);let o=i;do{o=(o+1)%e}while(t[o].equals2D(n)&&o!==i);const l=t[r],a=t[o];if(l.equals2D(n)||a.equals2D(n)||l.equals2D(a))return!1;const c=G.index(l,n,a);let h=null;return h=0===c?l.x>a.x:c>0,h}if(I(arguments[0],F)){const t=arguments[0],e=t.size()-1;if(e<3)throw new s("Ring has fewer than 4 points, so orientation cannot be determined");let n=t.getCoordinate(0),i=0;for(let s=1;s<=e;s++){const e=t.getCoordinate(s);e.y>n.y&&(n=e,i=s)}let r=null,o=i;do{o-=1,o<0&&(o=e),r=t.getCoordinate(o)}while(r.equals2D(n)&&o!==i);let l=null,a=i;do{a=(a+1)%e,l=t.getCoordinate(a)}while(l.equals2D(n)&&a!==i);if(r.equals2D(n)||l.equals2D(n)||r.equals2D(l))return!1;const c=G.index(r,n,l);let h=null;return h=0===c?r.x>l.x:c>0,h}}}G.CLOCKWISE=-1,G.RIGHT=G.CLOCKWISE,G.COUNTERCLOCKWISE=1,G.LEFT=G.COUNTERCLOCKWISE,G.COLLINEAR=0,G.STRAIGHT=G.COLLINEAR;class q{static intersection(t,e,n,s){const i=t.x<e.x?t.x:e.x,o=t.y<e.y?t.y:e.y,l=t.x>e.x?t.x:e.x,a=t.y>e.y?t.y:e.y,c=n.x<s.x?n.x:s.x,h=n.y<s.y?n.y:s.y,u=n.x>s.x?n.x:s.x,g=n.y>s.y?n.y:s.y,d=((i>c?i:c)+(l<u?l:u))/2,_=((o>h?o:h)+(a<g?a:g))/2,p=t.x-d,f=t.y-_,y=e.x-d,x=e.y-_,E=n.x-d,I=n.y-_,N=s.x-d,S=s.y-_,w=f-x,C=y-p,L=p*x-y*f,T=I-S,R=N-E,P=E*S-N*I,O=w*R-T*C,v=(C*P-R*L)/O,M=(T*L-w*P)/O;return r.isNaN(v)||r.isInfinite(v)||r.isNaN(M)||r.isInfinite(M)?null:new m(v+d,M+_)}}class B{static arraycopy(t,e,n,s,i){let r=0;for(let o=e;o<e+i;o++)n[s+r]=t[o],r++}static getProperty(t){return{"line.separator":"\n"}[t]}}class Y{static log10(t){const e=Math.log(t);return r.isInfinite(e)||r.isNaN(e)?e:e/Y.LOG_10}static min(t,e,n,s){let i=t;return e<i&&(i=e),n<i&&(i=n),s<i&&(i=s),i}static clamp(){if("number"==typeof arguments[2]&&"number"==typeof arguments[0]&&"number"==typeof arguments[1]){const t=arguments[0],e=arguments[1],n=arguments[2];return t<e?e:t>n?n:t}if(Number.isInteger(arguments[2])&&Number.isInteger(arguments[0])&&Number.isInteger(arguments[1])){const t=arguments[0],e=arguments[1],n=arguments[2];return t<e?e:t>n?n:t}}static wrap(t,e){return t<0?e- -t%e:t%e}static max(){if(3===arguments.length){const t=arguments[1],e=arguments[2];let n=arguments[0];return t>n&&(n=t),e>n&&(n=e),n}if(4===arguments.length){const t=arguments[1],e=arguments[2],n=arguments[3];let s=arguments[0];return t>s&&(s=t),e>s&&(s=e),n>s&&(s=n),s}}static average(t,e){return(t+e)/2}}Y.LOG_10=Math.log(10);class V{static segmentToSegment(t,e,n,s){if(t.equals(e))return V.pointToSegment(t,n,s);if(n.equals(s))return V.pointToSegment(s,t,e);let i=!1;if(O.intersects(t,e,n,s)){const r=(e.x-t.x)*(s.y-n.y)-(e.y-t.y)*(s.x-n.x);if(0===r)i=!0;else{const o=(t.y-n.y)*(s.x-n.x)-(t.x-n.x)*(s.y-n.y),l=((t.y-n.y)*(e.x-t.x)-(t.x-n.x)*(e.y-t.y))/r,a=o/r;(a<0||a>1||l<0||l>1)&&(i=!0)}}else i=!0;return i?Y.min(V.pointToSegment(t,n,s),V.pointToSegment(e,n,s),V.pointToSegment(n,t,e),V.pointToSegment(s,t,e)):0}static pointToSegment(t,e,n){if(e.x===n.x&&e.y===n.y)return t.distance(e);const s=(n.x-e.x)*(n.x-e.x)+(n.y-e.y)*(n.y-e.y),i=((t.x-e.x)*(n.x-e.x)+(t.y-e.y)*(n.y-e.y))/s;if(i<=0)return t.distance(e);if(i>=1)return t.distance(n);const r=((e.y-t.y)*(n.x-e.x)-(e.x-t.x)*(n.y-e.y))/s;return Math.abs(r)*Math.sqrt(s)}static pointToLinePerpendicular(t,e,n){const s=(n.x-e.x)*(n.x-e.x)+(n.y-e.y)*(n.y-e.y),i=((e.y-t.y)*(n.x-e.x)-(e.x-t.x)*(n.y-e.y))/s;return Math.abs(i)*Math.sqrt(s)}static pointToSegmentString(t,e){if(0===e.length)throw new s("Line array must contain at least one vertex");let n=t.distance(e[0]);for(let s=0;s<e.length-1;s++){const i=V.pointToSegment(t,e[s],e[s+1]);i<n&&(n=i)}return n}}class z{create(){if(1===arguments.length)arguments[0]instanceof Array||I(arguments[0],F);else if(2===arguments.length);else if(3===arguments.length){const t=arguments[0],e=arguments[1];return this.create(t,e)}}}class k{filter(t){}}class X{constructor(){X.constructor_.apply(this,arguments)}isGeometryCollection(){return this.getTypeCode()===X.TYPECODE_GEOMETRYCOLLECTION}getFactory(){return this._factory}getGeometryN(t){return this}getArea(){return 0}isRectangle(){return!1}equalsExact(t){return this===t||this.equalsExact(t,0)}geometryChanged(){this.apply(X.geometryChangedFilter)}geometryChangedAction(){this._envelope=null}equalsNorm(t){return null!==t&&this.norm().equalsExact(t.norm())}getLength(){return 0}getNumGeometries(){return 1}compareTo(){let t;if(1===arguments.length){const e=arguments[0];return t=e,this.getTypeCode()!==t.getTypeCode()?this.getTypeCode()-t.getTypeCode():this.isEmpty()&&t.isEmpty()?0:this.isEmpty()?-1:t.isEmpty()?1:this.compareToSameClass(e)}if(2===arguments.length){const e=arguments[0],n=arguments[1];return t=e,this.getTypeCode()!==t.getTypeCode()?this.getTypeCode()-t.getTypeCode():this.isEmpty()&&t.isEmpty()?0:this.isEmpty()?-1:t.isEmpty()?1:this.compareToSameClass(e,n)}}getUserData(){return this._userData}getSRID(){return this._SRID}getEnvelope(){return this.getFactory().toGeometry(this.getEnvelopeInternal())}checkNotGeometryCollection(t){if(t.getTypeCode()===X.TYPECODE_GEOMETRYCOLLECTION)throw new s("This method does not support GeometryCollection arguments")}equal(t,e,n){return 0===n?t.equals(e):t.distance(e)<=n}norm(){const t=this.copy();return t.normalize(),t}reverse(){const t=this.reverseInternal();return null!=this.envelope&&(t.envelope=this.envelope.copy()),t.setSRID(this.getSRID()),t}copy(){const t=this.copyInternal();return t.envelope=null==this._envelope?null:this._envelope.copy(),t._SRID=this._SRID,t._userData=this._userData,t}getPrecisionModel(){return this._factory.getPrecisionModel()}getEnvelopeInternal(){return null===this._envelope&&(this._envelope=this.computeEnvelopeInternal()),new O(this._envelope)}setSRID(t){this._SRID=t}setUserData(t){this._userData=t}compare(t,e){const n=t.iterator(),s=e.iterator();for(;n.hasNext()&&s.hasNext();){const t=n.next(),e=s.next(),i=t.compareTo(e);if(0!==i)return i}return n.hasNext()?1:s.hasNext()?-1:0}hashCode(){return this.getEnvelopeInternal().hashCode()}isEquivalentClass(t){return this.getClass()===t.getClass()}isGeometryCollectionOrDerived(){return this.getTypeCode()===X.TYPECODE_GEOMETRYCOLLECTION||this.getTypeCode()===X.TYPECODE_MULTIPOINT||this.getTypeCode()===X.TYPECODE_MULTILINESTRING||this.getTypeCode()===X.TYPECODE_MULTIPOLYGON}get interfaces_(){return[l,o,c]}getClass(){return X}static hasNonEmptyElements(t){for(let e=0;e<t.length;e++)if(!t[e].isEmpty())return!0;return!1}static hasNullElements(t){for(let e=0;e<t.length;e++)if(null===t[e])return!0;return!1}}X.constructor_=function(t){t&&(this._envelope=null,this._userData=null,this._factory=t,this._SRID=t.getSRID())},X.TYPECODE_POINT=0,X.TYPECODE_MULTIPOINT=1,X.TYPECODE_LINESTRING=2,X.TYPECODE_LINEARRING=3,X.TYPECODE_MULTILINESTRING=4,X.TYPECODE_POLYGON=5,X.TYPECODE_MULTIPOLYGON=6,X.TYPECODE_GEOMETRYCOLLECTION=7,X.TYPENAME_POINT="Point",X.TYPENAME_MULTIPOINT="MultiPoint",X.TYPENAME_LINESTRING="LineString",X.TYPENAME_LINEARRING="LinearRing",X.TYPENAME_MULTILINESTRING="MultiLineString",X.TYPENAME_POLYGON="Polygon",X.TYPENAME_MULTIPOLYGON="MultiPolygon",X.TYPENAME_GEOMETRYCOLLECTION="GeometryCollection",X.geometryChangedFilter={get interfaces_(){return[k]},filter(t){t.geometryChangedAction()}};class U{filter(t){}}class H{static ofLine(t){const e=t.size();if(e<=1)return 0;let n=0;const s=new m;t.getCoordinate(0,s);let i=s.x,r=s.y;for(let o=1;o<e;o++){t.getCoordinate(o,s);const e=s.x,l=s.y,a=e-i,c=l-r;n+=Math.sqrt(a*a+c*c),i=e,r=l}return n}}class W{}class Z{static copyCoord(t,e,n,s){const i=Math.min(t.getDimension(),n.getDimension());for(let r=0;r<i;r++)n.setOrdinate(s,r,t.getOrdinate(e,r))}static isRing(t){const e=t.size();return 0===e||!(e<=3)&&(t.getOrdinate(0,F.X)===t.getOrdinate(e-1,F.X)&&t.getOrdinate(0,F.Y)===t.getOrdinate(e-1,F.Y))}static scroll(){if(2===arguments.length){if(I(arguments[0],F)&&Number.isInteger(arguments[1])){const t=arguments[0],e=arguments[1];Z.scroll(t,e,Z.isRing(t))}else if(I(arguments[0],F)&&arguments[1]instanceof m){const t=arguments[0],e=arguments[1],n=Z.indexOf(e,t);if(n<=0)return null;Z.scroll(t,n)}}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];if(e<=0)return null;const s=t.copy(),i=n?t.size()-1:t.size();for(let n=0;n<i;n++)for(let r=0;r<t.getDimension();r++)t.setOrdinate(n,r,s.getOrdinate((e+n)%i,r));if(n)for(let e=0;e<t.getDimension();e++)t.setOrdinate(i,e,t.getOrdinate(0,e))}}static isEqual(t,e){const n=t.size();if(n!==e.size())return!1;const s=Math.min(t.getDimension(),e.getDimension());for(let i=0;i<n;i++)for(let n=0;n<s;n++){const s=t.getOrdinate(i,n),o=e.getOrdinate(i,n);if(t.getOrdinate(i,n)!==e.getOrdinate(i,n)&&(!r.isNaN(s)||!r.isNaN(o)))return!1}return!0}static minCoordinateIndex(){if(1===arguments.length){const t=arguments[0];return Z.minCoordinateIndex(t,0,t.size()-1)}if(3===arguments.length){const t=arguments[0],e=arguments[2];let n=-1,s=null;for(let i=arguments[1];i<=e;i++){const e=t.getCoordinate(i);(null===s||s.compareTo(e)>0)&&(s=e,n=i)}return n}}static extend(t,e,n){const s=t.create(n,e.getDimension()),i=e.size();if(Z.copy(e,0,s,0,i),i>0)for(let t=i;t<n;t++)Z.copy(e,i-1,s,t,1);return s}static reverse(t){const e=t.size()-1,n=Math.trunc(e/2);for(let s=0;s<=n;s++)Z.swap(t,s,e-s)}static swap(t,e,n){if(e===n)return null;for(let s=0;s<t.getDimension();s++){const i=t.getOrdinate(e,s);t.setOrdinate(e,s,t.getOrdinate(n,s)),t.setOrdinate(n,s,i)}}static copy(t,e,n,s,i){for(let r=0;r<i;r++)Z.copyCoord(t,e+r,n,s+r)}static ensureValidRing(t,e){const n=e.size();if(0===n)return e;if(n<=3)return Z.createClosedRing(t,e,4);return e.getOrdinate(0,F.X)===e.getOrdinate(n-1,F.X)&&e.getOrdinate(0,F.Y)===e.getOrdinate(n-1,F.Y)?e:Z.createClosedRing(t,e,n+1)}static indexOf(t,e){for(let n=0;n<e.size();n++)if(t.x===e.getOrdinate(n,F.X)&&t.y===e.getOrdinate(n,F.Y))return n;return-1}static createClosedRing(t,e,n){const s=t.create(n,e.getDimension()),i=e.size();Z.copy(e,0,s,0,i);for(let t=i;t<n;t++)Z.copy(e,0,s,t,1);return s}static minCoordinate(t){let e=null;for(let n=0;n<t.size();n++){const s=t.getCoordinate(n);(null===e||e.compareTo(s)>0)&&(e=s)}return e}}class j extends n{constructor(t){super(t),this.name=Object.keys({UnsupportedOperationException:j})[0]}}class K{static toDimensionSymbol(t){switch(t){case K.FALSE:return K.SYM_FALSE;case K.TRUE:return K.SYM_TRUE;case K.DONTCARE:return K.SYM_DONTCARE;case K.P:return K.SYM_P;case K.L:return K.SYM_L;case K.A:return K.SYM_A}throw new s("Unknown dimension value: "+t)}static toDimensionValue(t){switch(b.toUpperCase(t)){case K.SYM_FALSE:return K.FALSE;case K.SYM_TRUE:return K.TRUE;case K.SYM_DONTCARE:return K.DONTCARE;case K.SYM_P:return K.P;case K.SYM_L:return K.L;case K.SYM_A:return K.A}throw new s("Unknown dimension symbol: "+t)}}K.P=0,K.L=1,K.A=2,K.FALSE=-1,K.TRUE=-2,K.DONTCARE=-3,K.SYM_FALSE="F",K.SYM_TRUE="T",K.SYM_DONTCARE="*",K.SYM_P="0",K.SYM_L="1",K.SYM_A="2";class Q{filter(t){}}class J extends X{constructor(){super(),J.constructor_.apply(this,arguments)}static constructor_(){if(this._points=null,0===arguments.length);else if(2===arguments.length){const t=arguments[0],e=arguments[1];X.constructor_.call(this,e),this.init(t)}}computeEnvelopeInternal(){return this.isEmpty()?new O:this._points.expandEnvelope(new O)}isRing(){return this.isClosed()&&this.isSimple()}getCoordinates(){return this._points.toCoordinateArray()}copyInternal(){return new J(this._points.copy(),this._factory)}equalsExact(){if(2===arguments.length&&"number"==typeof arguments[1]&&arguments[0]instanceof X){const t=arguments[0],e=arguments[1];if(!this.isEquivalentClass(t))return!1;const n=t;if(this._points.size()!==n._points.size())return!1;for(let t=0;t<this._points.size();t++)if(!this.equal(this._points.getCoordinate(t),n._points.getCoordinate(t),e))return!1;return!0}return super.equalsExact.apply(this,arguments)}normalize(){for(let t=0;t<Math.trunc(this._points.size()/2);t++){const e=this._points.size()-1-t;if(!this._points.getCoordinate(t).equals(this._points.getCoordinate(e))){if(this._points.getCoordinate(t).compareTo(this._points.getCoordinate(e))>0){const t=this._points.copy();Z.reverse(t),this._points=t}return null}}}getCoordinate(){return this.isEmpty()?null:this._points.getCoordinate(0)}getBoundaryDimension(){return this.isClosed()?K.FALSE:0}isClosed(){return!this.isEmpty()&&this.getCoordinateN(0).equals2D(this.getCoordinateN(this.getNumPoints()-1))}reverseInternal(){const t=this._points.copy();return Z.reverse(t),this.getFactory().createLineString(t)}getEndPoint(){return this.isEmpty()?null:this.getPointN(this.getNumPoints()-1)}getTypeCode(){return X.TYPECODE_LINESTRING}getDimension(){return 1}getLength(){return H.ofLine(this._points)}getNumPoints(){return this._points.size()}compareToSameClass(){if(1===arguments.length){const t=arguments[0];let e=0,n=0;for(;e<this._points.size()&&n<t._points.size();){const s=this._points.getCoordinate(e).compareTo(t._points.getCoordinate(n));if(0!==s)return s;e++,n++}return e<this._points.size()?1:n<t._points.size()?-1:0}if(2===arguments.length){const t=arguments[0];return arguments[1].compare(this._points,t._points)}}apply(){if(I(arguments[0],U)){const t=arguments[0];for(let e=0;e<this._points.size();e++)t.filter(this._points.getCoordinate(e))}else if(I(arguments[0],P)){const t=arguments[0];if(0===this._points.size())return null;for(let e=0;e<this._points.size()&&(t.filter(this._points,e),!t.isDone());e++);t.isGeometryChanged()&&this.geometryChanged()}else if(I(arguments[0],Q)){arguments[0].filter(this)}else if(I(arguments[0],k)){arguments[0].filter(this)}}getBoundary(){throw new j}isEquivalentClass(t){return t instanceof J}getCoordinateN(t){return this._points.getCoordinate(t)}getGeometryType(){return X.TYPENAME_LINESTRING}getCoordinateSequence(){return this._points}isEmpty(){return 0===this._points.size()}init(t){if(null===t&&(t=this.getFactory().getCoordinateSequenceFactory().create([])),1===t.size())throw new s("Invalid number of points in LineString (found "+t.size()+" - must be 0 or >= 2)");this._points=t}isCoordinate(t){for(let e=0;e<this._points.size();e++)if(this._points.getCoordinate(e).equals(t))return!0;return!1}getStartPoint(){return this.isEmpty()?null:this.getPointN(0)}getPointN(t){return this.getFactory().createPoint(this._points.getCoordinate(t))}get interfaces_(){return[W]}}class ${}class tt extends X{constructor(){super(),tt.constructor_.apply(this,arguments)}static constructor_(){this._coordinates=null;const t=arguments[0],e=arguments[1];X.constructor_.call(this,e),this.init(t)}computeEnvelopeInternal(){if(this.isEmpty())return new O;const t=new O;return t.expandToInclude(this._coordinates.getX(0),this._coordinates.getY(0)),t}getCoordinates(){return this.isEmpty()?[]:[this.getCoordinate()]}copyInternal(){return new tt(this._coordinates.copy(),this._factory)}equalsExact(){if(2===arguments.length&&"number"==typeof arguments[1]&&arguments[0]instanceof X){const t=arguments[0],e=arguments[1];return!!this.isEquivalentClass(t)&&(!(!this.isEmpty()||!t.isEmpty())||this.isEmpty()===t.isEmpty()&&this.equal(t.getCoordinate(),this.getCoordinate(),e))}return super.equalsExact.apply(this,arguments)}normalize(){}getCoordinate(){return 0!==this._coordinates.size()?this._coordinates.getCoordinate(0):null}getBoundaryDimension(){return K.FALSE}reverseInternal(){return this.getFactory().createPoint(this._coordinates.copy())}getTypeCode(){return X.TYPECODE_POINT}getDimension(){return 0}getNumPoints(){return this.isEmpty()?0:1}getX(){if(null===this.getCoordinate())throw new IllegalStateException("getX called on empty Point");return this.getCoordinate().x}compareToSameClass(){if(1===arguments.length){const t=arguments[0];return this.getCoordinate().compareTo(t.getCoordinate())}if(2===arguments.length){const t=arguments[0];return arguments[1].compare(this._coordinates,t._coordinates)}}apply(){if(I(arguments[0],U)){const t=arguments[0];if(this.isEmpty())return null;t.filter(this.getCoordinate())}else if(I(arguments[0],P)){const t=arguments[0];if(this.isEmpty())return null;t.filter(this._coordinates,0),t.isGeometryChanged()&&this.geometryChanged()}else if(I(arguments[0],Q)){arguments[0].filter(this)}else if(I(arguments[0],k)){arguments[0].filter(this)}}getBoundary(){return this.getFactory().createGeometryCollection()}getGeometryType(){return X.TYPENAME_POINT}getCoordinateSequence(){return this._coordinates}getY(){if(null===this.getCoordinate())throw new IllegalStateException("getY called on empty Point");return this.getCoordinate().y}isEmpty(){return 0===this._coordinates.size()}init(t){null===t&&(t=this.getFactory().getCoordinateSequenceFactory().create([])),g.isTrue(t.size()<=1),this._coordinates=t}isSimple(){return!0}get interfaces_(){return[$]}}class et{static ofRing(){if(arguments[0]instanceof Array){const t=arguments[0];return Math.abs(et.ofRingSigned(t))}if(I(arguments[0],F)){const t=arguments[0];return Math.abs(et.ofRingSigned(t))}}static ofRingSigned(){if(arguments[0]instanceof Array){const t=arguments[0];if(t.length<3)return 0;let e=0;const n=t[0].x;for(let s=1;s<t.length-1;s++){const i=t[s].x-n,r=t[s+1].y;e+=i*(t[s-1].y-r)}return e/2}if(I(arguments[0],F)){const t=arguments[0],e=t.size();if(e<3)return 0;const n=new m,s=new m,i=new m;t.getCoordinate(0,s),t.getCoordinate(1,i);const r=s.x;i.x-=r;let o=0;for(let l=1;l<e-1;l++)n.y=s.y,s.x=i.x,s.y=i.y,t.getCoordinate(l+1,i),i.x-=r,o+=s.x*(n.y-i.y);return o/2}}}class nt{static sort(){const t=arguments[0];if(1===arguments.length)t.sort(((t,e)=>t.compareTo(e)));else if(2===arguments.length)t.sort(((t,e)=>arguments[1].compare(t,e)));else if(3===arguments.length){const e=t.slice(arguments[1],arguments[2]);e.sort();const n=t.slice(0,arguments[1]).concat(e,t.slice(arguments[2],t.length));t.splice(0,t.length);for(const e of n)t.push(e)}else if(4===arguments.length){const e=t.slice(arguments[1],arguments[2]);e.sort(((t,e)=>arguments[3].compare(t,e)));const n=t.slice(0,arguments[1]).concat(e,t.slice(arguments[2],t.length));t.splice(0,t.length);for(const e of n)t.push(e)}}static asList(t){const e=new L;for(const n of t)e.add(n);return e}static copyOf(t,e){return t.slice(0,e)}}class st{}class it extends X{constructor(){super(),it.constructor_.apply(this,arguments)}static constructor_(){this._shell=null,this._holes=null;let t=arguments[0],e=arguments[1],n=arguments[2];if(X.constructor_.call(this,n),null===t&&(t=this.getFactory().createLinearRing()),null===e&&(e=[]),X.hasNullElements(e))throw new s("holes must not contain null elements");if(t.isEmpty()&&X.hasNonEmptyElements(e))throw new s("shell is empty but holes are not");this._shell=t,this._holes=e}computeEnvelopeInternal(){return this._shell.getEnvelopeInternal()}getCoordinates(){if(this.isEmpty())return[];const t=new Array(this.getNumPoints()).fill(null);let e=-1;const n=this._shell.getCoordinates();for(let s=0;s<n.length;s++)e++,t[e]=n[s];for(let n=0;n<this._holes.length;n++){const s=this._holes[n].getCoordinates();for(let n=0;n<s.length;n++)e++,t[e]=s[n]}return t}getArea(){let t=0;t+=et.ofRing(this._shell.getCoordinateSequence());for(let e=0;e<this._holes.length;e++)t-=et.ofRing(this._holes[e].getCoordinateSequence());return t}copyInternal(){const t=this._shell.copy(),e=new Array(this._holes.length).fill(null);for(let t=0;t<this._holes.length;t++)e[t]=this._holes[t].copy();return new it(t,e,this._factory)}isRectangle(){if(0!==this.getNumInteriorRing())return!1;if(null===this._shell)return!1;if(5!==this._shell.getNumPoints())return!1;const t=this._shell.getCoordinateSequence(),e=this.getEnvelopeInternal();for(let n=0;n<5;n++){const s=t.getX(n);if(s!==e.getMinX()&&s!==e.getMaxX())return!1;const i=t.getY(n);if(i!==e.getMinY()&&i!==e.getMaxY())return!1}let n=t.getX(0),s=t.getY(0);for(let e=1;e<=4;e++){const i=t.getX(e),r=t.getY(e);if(i!==n===(r!==s))return!1;n=i,s=r}return!0}equalsExact(){if(2===arguments.length&&"number"==typeof arguments[1]&&arguments[0]instanceof X){const t=arguments[0],e=arguments[1];if(!this.isEquivalentClass(t))return!1;const n=t,s=this._shell,i=n._shell;if(!s.equalsExact(i,e))return!1;if(this._holes.length!==n._holes.length)return!1;for(let t=0;t<this._holes.length;t++)if(!this._holes[t].equalsExact(n._holes[t],e))return!1;return!0}return super.equalsExact.apply(this,arguments)}normalize(){if(0===arguments.length){this._shell=this.normalized(this._shell,!0);for(let t=0;t<this._holes.length;t++)this._holes[t]=this.normalized(this._holes[t],!1);nt.sort(this._holes)}else if(2===arguments.length){const t=arguments[0],e=arguments[1];if(t.isEmpty())return null;const n=t.getCoordinateSequence(),s=Z.minCoordinateIndex(n,0,n.size()-2);Z.scroll(n,s,!0),G.isCCW(n)===e&&Z.reverse(n)}}getCoordinate(){return this._shell.getCoordinate()}getNumInteriorRing(){return this._holes.length}getBoundaryDimension(){return 1}reverseInternal(){const t=this.getExteriorRing().reverse(),e=new Array(this.getNumInteriorRing()).fill(null);for(let t=0;t<e.length;t++)e[t]=this.getInteriorRingN(t).reverse();return this.getFactory().createPolygon(t,e)}getTypeCode(){return X.TYPECODE_POLYGON}getDimension(){return 2}getLength(){let t=0;t+=this._shell.getLength();for(let e=0;e<this._holes.length;e++)t+=this._holes[e].getLength();return t}getNumPoints(){let t=this._shell.getNumPoints();for(let e=0;e<this._holes.length;e++)t+=this._holes[e].getNumPoints();return t}convexHull(){return this.getExteriorRing().convexHull()}normalized(t,e){const n=t.copy();return this.normalize(n,e),n}compareToSameClass(){if(1===arguments.length){const t=arguments[0],e=this._shell,n=t._shell;return e.compareToSameClass(n)}if(2===arguments.length){const t=arguments[1],e=arguments[0],n=this._shell,s=e._shell,i=n.compareToSameClass(s,t);if(0!==i)return i;const r=this.getNumInteriorRing(),o=e.getNumInteriorRing();let l=0;for(;l<r&&l<o;){const n=this.getInteriorRingN(l),s=e.getInteriorRingN(l),i=n.compareToSameClass(s,t);if(0!==i)return i;l++}return l<r?1:l<o?-1:0}}apply(){if(I(arguments[0],U)){const t=arguments[0];this._shell.apply(t);for(let e=0;e<this._holes.length;e++)this._holes[e].apply(t)}else if(I(arguments[0],P)){const t=arguments[0];if(this._shell.apply(t),!t.isDone())for(let e=0;e<this._holes.length&&(this._holes[e].apply(t),!t.isDone());e++);t.isGeometryChanged()&&this.geometryChanged()}else if(I(arguments[0],Q)){arguments[0].filter(this)}else if(I(arguments[0],k)){const t=arguments[0];t.filter(this),this._shell.apply(t);for(let e=0;e<this._holes.length;e++)this._holes[e].apply(t)}}getBoundary(){if(this.isEmpty())return this.getFactory().createMultiLineString();const t=new Array(this._holes.length+1).fill(null);t[0]=this._shell;for(let e=0;e<this._holes.length;e++)t[e+1]=this._holes[e];return t.length<=1?this.getFactory().createLinearRing(t[0].getCoordinateSequence()):this.getFactory().createMultiLineString(t)}getGeometryType(){return X.TYPENAME_POLYGON}getExteriorRing(){return this._shell}isEmpty(){return this._shell.isEmpty()}getInteriorRingN(t){return this._holes[t]}get interfaces_(){return[st]}}class rt extends N{contains(){}}class ot extends rt{}class lt extends ot{constructor(t){super(),this.array=[],t instanceof N&&this.addAll(t)}contains(t){for(const e of this.array)if(0===e.compareTo(t))return!0;return!1}add(t){if(this.contains(t))return!1;for(let e=0,n=this.array.length;e<n;e++){if(1===this.array[e].compareTo(t))return!!this.array.splice(e,0,t)}return this.array.push(t),!0}addAll(t){for(const e of t)this.add(e);return!0}remove(){throw new j}size(){return this.array.length}isEmpty(){return 0===this.array.length}toArray(){return this.array.slice()}iterator(){return new at(this.array)}}class at{constructor(t){this.array=t,this.position=0}next(){if(this.position===this.array.length)throw new C;return this.array[this.position++]}hasNext(){return this.position<this.array.length}remove(){throw new j}}class ct extends X{constructor(){super(),ct.constructor_.apply(this,arguments)}static constructor_(){if(this._geometries=null,0===arguments.length);else if(2===arguments.length){let t=arguments[0],e=arguments[1];if(X.constructor_.call(this,e),null===t&&(t=[]),X.hasNullElements(t))throw new s("geometries must not contain null elements");this._geometries=t}}computeEnvelopeInternal(){const t=new O;for(let e=0;e<this._geometries.length;e++)t.expandToInclude(this._geometries[e].getEnvelopeInternal());return t}getGeometryN(t){return this._geometries[t]}getCoordinates(){const t=new Array(this.getNumPoints()).fill(null);let e=-1;for(let n=0;n<this._geometries.length;n++){const s=this._geometries[n].getCoordinates();for(let n=0;n<s.length;n++)e++,t[e]=s[n]}return t}getArea(){let t=0;for(let e=0;e<this._geometries.length;e++)t+=this._geometries[e].getArea();return t}copyInternal(){const t=new Array(this._geometries.length).fill(null);for(let e=0;e<t.length;e++)t[e]=this._geometries[e].copy();return new ct(t,this._factory)}equalsExact(){if(2===arguments.length&&"number"==typeof arguments[1]&&arguments[0]instanceof X){const t=arguments[0],e=arguments[1];if(!this.isEquivalentClass(t))return!1;const n=t;if(this._geometries.length!==n._geometries.length)return!1;for(let t=0;t<this._geometries.length;t++)if(!this._geometries[t].equalsExact(n._geometries[t],e))return!1;return!0}return super.equalsExact.apply(this,arguments)}normalize(){for(let t=0;t<this._geometries.length;t++)this._geometries[t].normalize();nt.sort(this._geometries)}getCoordinate(){return this.isEmpty()?null:this._geometries[0].getCoordinate()}getBoundaryDimension(){let t=K.FALSE;for(let e=0;e<this._geometries.length;e++)t=Math.max(t,this._geometries[e].getBoundaryDimension());return t}reverseInternal(){const t=this._geometries.length,e=new L(t);for(let n=0;n<t;n++)e.add(this._geometries[n].reverse());return this.getFactory().buildGeometry(e)}getTypeCode(){return X.TYPECODE_GEOMETRYCOLLECTION}getDimension(){let t=K.FALSE;for(let e=0;e<this._geometries.length;e++)t=Math.max(t,this._geometries[e].getDimension());return t}getLength(){let t=0;for(let e=0;e<this._geometries.length;e++)t+=this._geometries[e].getLength();return t}getNumPoints(){let t=0;for(let e=0;e<this._geometries.length;e++)t+=this._geometries[e].getNumPoints();return t}getNumGeometries(){return this._geometries.length}compareToSameClass(){if(1===arguments.length){const t=arguments[0],e=new lt(nt.asList(this._geometries)),n=new lt(nt.asList(t._geometries));return this.compare(e,n)}if(2===arguments.length){const t=arguments[1],e=arguments[0],n=this.getNumGeometries(),s=e.getNumGeometries();let i=0;for(;i<n&&i<s;){const n=this.getGeometryN(i),s=e.getGeometryN(i),r=n.compareToSameClass(s,t);if(0!==r)return r;i++}return i<n?1:i<s?-1:0}}apply(){if(I(arguments[0],U)){const t=arguments[0];for(let e=0;e<this._geometries.length;e++)this._geometries[e].apply(t)}else if(I(arguments[0],P)){const t=arguments[0];if(0===this._geometries.length)return null;for(let e=0;e<this._geometries.length&&(this._geometries[e].apply(t),!t.isDone());e++);t.isGeometryChanged()&&this.geometryChanged()}else if(I(arguments[0],Q)){const t=arguments[0];t.filter(this);for(let e=0;e<this._geometries.length;e++)this._geometries[e].apply(t)}else if(I(arguments[0],k)){const t=arguments[0];t.filter(this);for(let e=0;e<this._geometries.length;e++)this._geometries[e].apply(t)}}getBoundary(){return X.checkNotGeometryCollection(this),g.shouldNeverReachHere(),null}getGeometryType(){return X.TYPENAME_GEOMETRYCOLLECTION}isEmpty(){for(let t=0;t<this._geometries.length;t++)if(!this._geometries[t].isEmpty())return!1;return!0}}class ht extends ct{constructor(){super(),ht.constructor_.apply(this,arguments)}static constructor_(){const t=arguments[0],e=arguments[1];ct.constructor_.call(this,t,e)}copyInternal(){const t=new Array(this._geometries.length).fill(null);for(let e=0;e<t.length;e++)t[e]=this._geometries[e].copy();return new ht(t,this._factory)}isValid(){return!0}equalsExact(){if(2===arguments.length&&"number"==typeof arguments[1]&&arguments[0]instanceof X){const t=arguments[0],e=arguments[1];return!!this.isEquivalentClass(t)&&super.equalsExact.call(this,t,e)}return super.equalsExact.apply(this,arguments)}getCoordinate(){if(1===arguments.length&&Number.isInteger(arguments[0])){const t=arguments[0];return this._geometries[t].getCoordinate()}return super.getCoordinate.apply(this,arguments)}getBoundaryDimension(){return K.FALSE}getTypeCode(){return X.TYPECODE_MULTIPOINT}getDimension(){return 0}getBoundary(){return this.getFactory().createGeometryCollection()}getGeometryType(){return X.TYPENAME_MULTIPOINT}get interfaces_(){return[$]}}class ut extends J{constructor(){super(),ut.constructor_.apply(this,arguments)}static constructor_(){const t=arguments[0],e=arguments[1];J.constructor_.call(this,t,e),this.validateConstruction()}copyInternal(){return new ut(this._points.copy(),this._factory)}getBoundaryDimension(){return K.FALSE}isClosed(){return!!this.isEmpty()||super.isClosed.call(this)}reverseInternal(){const t=this._points.copy();return Z.reverse(t),this.getFactory().createLinearRing(t)}getTypeCode(){return X.TYPECODE_LINEARRING}validateConstruction(){if(!this.isEmpty()&&!super.isClosed.call(this))throw new s("Points of LinearRing do not form a closed linestring");if(this.getCoordinateSequence().size()>=1&&this.getCoordinateSequence().size()<ut.MINIMUM_VALID_SIZE)throw new s("Invalid number of points in LinearRing (found "+this.getCoordinateSequence().size()+" - must be 0 or >= 4)")}getGeometryType(){return X.TYPENAME_LINEARRING}}ut.MINIMUM_VALID_SIZE=4;class gt{static measures(t){return t instanceof y?0:t instanceof x||t instanceof E?1:0}static dimension(t){return t instanceof y?2:t instanceof x?3:t instanceof E?4:3}static create(){if(1===arguments.length){const t=arguments[0];return gt.create(t,0)}if(2===arguments.length){const t=arguments[0],e=arguments[1];return 2===t?new y:3===t&&0===e?new m:3===t&&1===e?new x:4===t&&1===e?new E:new m}}}class dt{static isRing(t){return!(t.length<4)&&!!t[0].equals2D(t[t.length-1])}static ptNotInList(t,e){for(let n=0;n<t.length;n++){const s=t[n];if(dt.indexOf(s,e)<0)return s}return null}static scroll(t,e){const n=dt.indexOf(e,t);if(n<0)return null;const s=new Array(t.length).fill(null);B.arraycopy(t,n,s,0,t.length-n),B.arraycopy(t,0,s,t.length-n,n),B.arraycopy(s,0,t,0,t.length)}static equals(){if(2===arguments.length){const t=arguments[0],e=arguments[1];if(t===e)return!0;if(null===t||null===e)return!1;if(t.length!==e.length)return!1;for(let n=0;n<t.length;n++)if(!t[n].equals(e[n]))return!1;return!0}if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];if(t===e)return!0;if(null===t||null===e)return!1;if(t.length!==e.length)return!1;for(let s=0;s<t.length;s++)if(0!==n.compare(t[s],e[s]))return!1;return!0}}static intersection(t,e){const n=new R;for(let s=0;s<t.length;s++)e.intersects(t[s])&&n.add(t[s],!0);return n.toCoordinateArray()}static measures(t){if(null===t||0===t.length)return 0;let e=0;for(const n of t)e=Math.max(e,gt.measures(n));return e}static hasRepeatedPoints(t){for(let e=1;e<t.length;e++)if(t[e-1].equals(t[e]))return!0;return!1}static removeRepeatedPoints(t){if(!dt.hasRepeatedPoints(t))return t;return new R(t,!1).toCoordinateArray()}static reverse(t){const e=t.length-1,n=Math.trunc(e/2);for(let s=0;s<=n;s++){const n=t[s];t[s]=t[e-s],t[e-s]=n}}static removeNull(t){let e=0;for(let n=0;n<t.length;n++)null!==t[n]&&e++;const n=new Array(e).fill(null);if(0===e)return n;let s=0;for(let e=0;e<t.length;e++)null!==t[e]&&(n[s++]=t[e]);return n}static copyDeep(){if(1===arguments.length){const t=arguments[0],e=new Array(t.length).fill(null);for(let n=0;n<t.length;n++)e[n]=t[n].copy();return e}if(5===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3],i=arguments[4];for(let r=0;r<i;r++)n[s+r]=t[e+r].copy()}}static isEqualReversed(t,e){for(let n=0;n<t.length;n++){const s=t[n],i=e[t.length-n-1];if(0!==s.compareTo(i))return!1}return!0}static envelope(t){const e=new O;for(let n=0;n<t.length;n++)e.expandToInclude(t[n]);return e}static toCoordinateArray(t){return t.toArray(dt.coordArrayType)}static dimension(t){if(null===t||0===t.length)return 3;let e=0;for(const n of t)e=Math.max(e,gt.dimension(n));return e}static atLeastNCoordinatesOrNothing(t,e){return e.length>=t?e:[]}static indexOf(t,e){for(let n=0;n<e.length;n++)if(t.equals(e[n]))return n;return-1}static increasingDirection(t){for(let e=0;e<Math.trunc(t.length/2);e++){const n=t.length-1-e,s=t[e].compareTo(t[n]);if(0!==s)return s}return 1}static compare(t,e){let n=0;for(;n<t.length&&n<e.length;){const s=t[n].compareTo(e[n]);if(0!==s)return s;n++}return n<e.length?-1:n<t.length?1:0}static minCoordinate(t){let e=null;for(let n=0;n<t.length;n++)(null===e||e.compareTo(t[n])>0)&&(e=t[n]);return e}static extract(t,e,n){e=Y.clamp(e,0,t.length);let s=(n=Y.clamp(n,-1,t.length))-e+1;n<0&&(s=0),e>=t.length&&(s=0),n<e&&(s=0);const i=new Array(s).fill(null);if(0===s)return i;let r=0;for(let s=e;s<=n;s++)i[r++]=t[s];return i}}dt.ForwardComparator=class{compare(t,e){const n=t,s=e;return dt.compare(n,s)}get interfaces_(){return[a]}},dt.BidirectionalComparator=class{compare(t,e){const n=t,s=e;if(n.length<s.length)return-1;if(n.length>s.length)return 1;if(0===n.length)return 0;const i=dt.compare(n,s);return dt.isEqualReversed(n,s)?0:i}OLDcompare(t,e){const n=t,s=e;if(n.length<s.length)return-1;if(n.length>s.length)return 1;if(0===n.length)return 0;const i=dt.increasingDirection(n),r=dt.increasingDirection(s);let o=i>0?0:n.length-1,l=r>0?0:n.length-1;for(let t=0;t<n.length;t++){const t=n[o].compareTo(s[l]);if(0!==t)return t;o+=i,l+=r}return 0}get interfaces_(){return[a]}},dt.coordArrayType=new Array(0).fill(null);class _t{constructor(t){this.str=t}append(t){this.str+=t}setCharAt(t,e){this.str=this.str.substr(0,t)+e+this.str.substr(t+1)}toString(){return this.str}}class pt{constructor(){pt.constructor_.apply(this,arguments)}static constructor_(){if(this._dimension=3,this._measures=0,this._coordinates=null,1===arguments.length){if(arguments[0]instanceof Array){const t=arguments[0];pt.constructor_.call(this,t,dt.dimension(t),dt.measures(t))}else if(Number.isInteger(arguments[0])){const t=arguments[0];this._coordinates=new Array(t).fill(null);for(let e=0;e<t;e++)this._coordinates[e]=new m}else if(I(arguments[0],F)){const t=arguments[0];if(null===t)return this._coordinates=new Array(0).fill(null),null;this._dimension=t.getDimension(),this._measures=t.getMeasures(),this._coordinates=new Array(t.size()).fill(null);for(let e=0;e<this._coordinates.length;e++)this._coordinates[e]=t.getCoordinateCopy(e)}}else if(2===arguments.length){if(arguments[0]instanceof Array&&Number.isInteger(arguments[1])){const t=arguments[0],e=arguments[1];pt.constructor_.call(this,t,e,dt.measures(t))}else if(Number.isInteger(arguments[0])&&Number.isInteger(arguments[1])){const t=arguments[0],e=arguments[1];this._coordinates=new Array(t).fill(null),this._dimension=e;for(let n=0;n<t;n++)this._coordinates[n]=gt.create(e)}}else if(3===arguments.length)if(Number.isInteger(arguments[2])&&arguments[0]instanceof Array&&Number.isInteger(arguments[1])){const t=arguments[0],e=arguments[1],n=arguments[2];this._dimension=e,this._measures=n,this._coordinates=null===t?new Array(0).fill(null):t}else if(Number.isInteger(arguments[2])&&Number.isInteger(arguments[0])&&Number.isInteger(arguments[1])){const t=arguments[0],e=arguments[1],n=arguments[2];this._coordinates=new Array(t).fill(null),this._dimension=e,this._measures=n;for(let e=0;e<t;e++)this._coordinates[e]=this.createCoordinate()}}getM(t){return this.hasM()?this._coordinates[t].getM():r.NaN}setOrdinate(t,e,n){switch(e){case F.X:this._coordinates[t].x=n;break;case F.Y:this._coordinates[t].y=n;break;default:this._coordinates[t].setOrdinate(e,n)}}getZ(t){return this.hasZ()?this._coordinates[t].getZ():r.NaN}size(){return this._coordinates.length}getOrdinate(t,e){switch(e){case F.X:return this._coordinates[t].x;case F.Y:return this._coordinates[t].y;default:return this._coordinates[t].getOrdinate(e)}}getCoordinate(){if(1===arguments.length){const t=arguments[0];return this._coordinates[t]}if(2===arguments.length){const t=arguments[0];arguments[1].setCoordinate(this._coordinates[t])}}getCoordinateCopy(t){const e=this.createCoordinate();return e.setCoordinate(this._coordinates[t]),e}createCoordinate(){return gt.create(this.getDimension(),this.getMeasures())}getDimension(){return this._dimension}getX(t){return this._coordinates[t].x}getMeasures(){return this._measures}expandEnvelope(t){for(let e=0;e<this._coordinates.length;e++)t.expandToInclude(this._coordinates[e]);return t}copy(){const t=new Array(this.size()).fill(null);for(let e=0;e<this._coordinates.length;e++){const n=this.createCoordinate();n.setCoordinate(this._coordinates[e]),t[e]=n}return new pt(t,this._dimension,this._measures)}toString(){if(this._coordinates.length>0){const t=new _t(17*this._coordinates.length);t.append("("),t.append(this._coordinates[0]);for(let e=1;e<this._coordinates.length;e++)t.append(", "),t.append(this._coordinates[e]);return t.append(")"),t.toString()}return"()"}getY(t){return this._coordinates[t].y}toCoordinateArray(){return this._coordinates}get interfaces_(){return[F,c]}}class mt{static instance(){return mt.instanceObject}readResolve(){return mt.instance()}create(){if(1===arguments.length){if(arguments[0]instanceof Array){return new pt(arguments[0])}if(I(arguments[0],F)){return new pt(arguments[0])}}else{if(2===arguments.length){let t=arguments[1];return t>3&&(t=3),t<2&&(t=2),new pt(arguments[0],t)}if(3===arguments.length){let t=arguments[2],e=arguments[1]-t;return t>1&&(t=1),e>3&&(e=3),e<2&&(e=2),new pt(arguments[0],e+t,t)}}}get interfaces_(){return[z,c]}}mt.instanceObject=new mt;class ft extends ct{constructor(){super(),ft.constructor_.apply(this,arguments)}static constructor_(){const t=arguments[0],e=arguments[1];ct.constructor_.call(this,t,e)}copyInternal(){const t=new Array(this._geometries.length).fill(null);for(let e=0;e<t.length;e++)t[e]=this._geometries[e].copy();return new ft(t,this._factory)}equalsExact(){if(2===arguments.length&&"number"==typeof arguments[1]&&arguments[0]instanceof X){const t=arguments[0],e=arguments[1];return!!this.isEquivalentClass(t)&&super.equalsExact.call(this,t,e)}return super.equalsExact.apply(this,arguments)}getBoundaryDimension(){return 1}getTypeCode(){return X.TYPECODE_MULTIPOLYGON}getDimension(){return 2}getBoundary(){if(this.isEmpty())return this.getFactory().createMultiLineString();const t=new L;for(let e=0;e<this._geometries.length;e++){const n=this._geometries[e].getBoundary();for(let e=0;e<n.getNumGeometries();e++)t.add(n.getGeometryN(e))}const e=new Array(t.size()).fill(null);return this.getFactory().createMultiLineString(t.toArray(e))}getGeometryType(){return X.TYPENAME_MULTIPOLYGON}get interfaces_(){return[st]}}class yt{get(){}put(){}size(){}values(){}entrySet(){}}class xt extends rt{constructor(t){super(),this.map=new Map,t instanceof N&&this.addAll(t)}contains(t){const e=t.hashCode?t.hashCode():t;return!!this.map.has(e)}add(t){const e=t.hashCode?t.hashCode():t;return!this.map.has(e)&&!!this.map.set(e,t)}addAll(t){for(const e of t)this.add(e);return!0}remove(){throw new j}size(){return this.map.size}isEmpty(){return 0===this.map.size}toArray(){return Array.from(this.map.values())}iterator(){return new Et(this.map)}[Symbol.iterator](){return this.map}}class Et{constructor(t){this.iterator=t.values();const{done:e,value:n}=this.iterator.next();this.done=e,this.value=n}next(){if(this.done)throw new C;const t=this.value,{done:e,value:n}=this.iterator.next();return this.done=e,this.value=n,t}hasNext(){return!this.done}remove(){throw new j}}class It extends yt{constructor(){super(),this.map=new Map}get(t){return this.map.get(t)||null}put(t,e){return this.map.set(t,e),e}values(){const t=new L,e=this.map.values();let n=e.next();for(;!n.done;)t.add(n.value),n=e.next();return t}entrySet(){const t=new xt;return this.map.entries().forEach((e=>t.add(e))),t}size(){return this.map.size()}}class Nt{constructor(){Nt.constructor_.apply(this,arguments)}static constructor_(){if(this._modelType=null,this._scale=null,0===arguments.length)this._modelType=Nt.FLOATING;else if(1===arguments.length)if(arguments[0]instanceof St){const t=arguments[0];this._modelType=t,t===Nt.FIXED&&this.setScale(1)}else if("number"==typeof arguments[0]){const t=arguments[0];this._modelType=Nt.FIXED,this.setScale(t)}else if(arguments[0]instanceof Nt){const t=arguments[0];this._modelType=t._modelType,this._scale=t._scale}}static mostPrecise(t,e){return t.compareTo(e)>=0?t:e}equals(t){if(!(t instanceof Nt))return!1;const e=t;return this._modelType===e._modelType&&this._scale===e._scale}compareTo(t){const e=t,n=this.getMaximumSignificantDigits(),s=e.getMaximumSignificantDigits();return M.compare(n,s)}getScale(){return this._scale}isFloating(){return this._modelType===Nt.FLOATING||this._modelType===Nt.FLOATING_SINGLE}getType(){return this._modelType}toString(){let t="UNKNOWN";return this._modelType===Nt.FLOATING?t="Floating":this._modelType===Nt.FLOATING_SINGLE?t="Floating-Single":this._modelType===Nt.FIXED&&(t="Fixed (Scale="+this.getScale()+")"),t}makePrecise(){if("number"==typeof arguments[0]){const t=arguments[0];if(r.isNaN(t))return t;if(this._modelType===Nt.FLOATING_SINGLE){return t}return this._modelType===Nt.FIXED?Math.round(t*this._scale)/this._scale:t}if(arguments[0]instanceof m){const t=arguments[0];if(this._modelType===Nt.FLOATING)return null;t.x=this.makePrecise(t.x),t.y=this.makePrecise(t.y)}}getMaximumSignificantDigits(){let t=16;return this._modelType===Nt.FLOATING?t=16:this._modelType===Nt.FLOATING_SINGLE?t=6:this._modelType===Nt.FIXED&&(t=1+Math.trunc(Math.ceil(Math.log(this.getScale())/Math.log(10)))),t}setScale(t){this._scale=Math.abs(t)}get interfaces_(){return[c,o]}}class St{constructor(){St.constructor_.apply(this,arguments)}static constructor_(){this._name=null;const t=arguments[0];this._name=t,St.nameToTypeMap.put(t,this)}readResolve(){return St.nameToTypeMap.get(this._name)}toString(){return this._name}get interfaces_(){return[c]}}St.nameToTypeMap=new It,Nt.Type=St,Nt.FIXED=new St("FIXED"),Nt.FLOATING=new St("FLOATING"),Nt.FLOATING_SINGLE=new St("FLOATING SINGLE"),Nt.maximumPreciseValue=9007199254740992;class wt extends ct{constructor(){super(),wt.constructor_.apply(this,arguments)}static constructor_(){const t=arguments[0],e=arguments[1];ct.constructor_.call(this,t,e)}copyInternal(){const t=new Array(this._geometries.length).fill(null);for(let e=0;e<t.length;e++)t[e]=this._geometries[e].copy();return new wt(t,this._factory)}equalsExact(){if(2===arguments.length&&"number"==typeof arguments[1]&&arguments[0]instanceof X){const t=arguments[0],e=arguments[1];return!!this.isEquivalentClass(t)&&super.equalsExact.call(this,t,e)}return super.equalsExact.apply(this,arguments)}getBoundaryDimension(){return this.isClosed()?K.FALSE:0}isClosed(){if(this.isEmpty())return!1;for(let t=0;t<this._geometries.length;t++)if(!this._geometries[t].isClosed())return!1;return!0}getTypeCode(){return X.TYPECODE_MULTILINESTRING}getDimension(){return 1}getBoundary(){throw new j}getGeometryType(){return X.TYPENAME_MULTILINESTRING}get interfaces_(){return[W]}}class Ct{constructor(){Ct.constructor_.apply(this,arguments)}static constructor_(){if(this._precisionModel=null,this._coordinateSequenceFactory=null,this._SRID=null,0===arguments.length)Ct.constructor_.call(this,new Nt,0);else if(1===arguments.length){if(I(arguments[0],z)){const t=arguments[0];Ct.constructor_.call(this,new Nt,0,t)}else if(arguments[0]instanceof Nt){const t=arguments[0];Ct.constructor_.call(this,t,0,Ct.getDefaultCoordinateSequenceFactory())}}else if(2===arguments.length){const t=arguments[0],e=arguments[1];Ct.constructor_.call(this,t,e,Ct.getDefaultCoordinateSequenceFactory())}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];this._precisionModel=t,this._coordinateSequenceFactory=n,this._SRID=e}}static toMultiPolygonArray(t){const e=new Array(t.size()).fill(null);return t.toArray(e)}static toGeometryArray(t){if(null===t)return null;const e=new Array(t.size()).fill(null);return t.toArray(e)}static getDefaultCoordinateSequenceFactory(){return mt.instance()}static toMultiLineStringArray(t){const e=new Array(t.size()).fill(null);return t.toArray(e)}static toLineStringArray(t){const e=new Array(t.size()).fill(null);return t.toArray(e)}static toMultiPointArray(t){const e=new Array(t.size()).fill(null);return t.toArray(e)}static toLinearRingArray(t){const e=new Array(t.size()).fill(null);return t.toArray(e)}static toPointArray(t){const e=new Array(t.size()).fill(null);return t.toArray(e)}static toPolygonArray(t){const e=new Array(t.size()).fill(null);return t.toArray(e)}static createPointFromInternalCoord(t,e){return e.getPrecisionModel().makePrecise(t),e.getFactory().createPoint(t)}createEmpty(t){switch(t){case-1:return this.createGeometryCollection();case 0:return this.createPoint();case 1:return this.createLineString();case 2:return this.createPolygon();default:throw new s("Invalid dimension: "+t)}}toGeometry(t){return t.isNull()?this.createPoint():t.getMinX()===t.getMaxX()&&t.getMinY()===t.getMaxY()?this.createPoint(new m(t.getMinX(),t.getMinY())):t.getMinX()===t.getMaxX()||t.getMinY()===t.getMaxY()?this.createLineString([new m(t.getMinX(),t.getMinY()),new m(t.getMaxX(),t.getMaxY())]):this.createPolygon(this.createLinearRing([new m(t.getMinX(),t.getMinY()),new m(t.getMinX(),t.getMaxY()),new m(t.getMaxX(),t.getMaxY()),new m(t.getMaxX(),t.getMinY()),new m(t.getMinX(),t.getMinY())]),null)}createLineString(){if(0===arguments.length)return this.createLineString(this.getCoordinateSequenceFactory().create([]));if(1===arguments.length){if(arguments[0]instanceof Array){const t=arguments[0];return this.createLineString(null!==t?this.getCoordinateSequenceFactory().create(t):null)}if(I(arguments[0],F)){return new J(arguments[0],this)}}}createMultiLineString(){if(0===arguments.length)return new wt(null,this);if(1===arguments.length){return new wt(arguments[0],this)}}buildGeometry(t){let e=null,n=!1,s=!1;for(let i=t.iterator();i.hasNext();){const t=i.next(),r=t.getTypeCode();null===e&&(e=r),r!==e&&(n=!0),t instanceof ct&&(s=!0)}if(null===e)return this.createGeometryCollection();if(n||s)return this.createGeometryCollection(Ct.toGeometryArray(t));const i=t.iterator().next();if(t.size()>1){if(i instanceof it)return this.createMultiPolygon(Ct.toPolygonArray(t));if(i instanceof J)return this.createMultiLineString(Ct.toLineStringArray(t));if(i instanceof tt)return this.createMultiPoint(Ct.toPointArray(t));g.shouldNeverReachHere("Unhandled geometry type: "+i.getGeometryType())}return i}createMultiPointFromCoords(t){return this.createMultiPoint(null!==t?this.getCoordinateSequenceFactory().create(t):null)}createPoint(){if(0===arguments.length)return this.createPoint(this.getCoordinateSequenceFactory().create([]));if(1===arguments.length){if(arguments[0]instanceof m){const t=arguments[0];return this.createPoint(null!==t?this.getCoordinateSequenceFactory().create([t]):null)}if(I(arguments[0],F)){return new tt(arguments[0],this)}}}getCoordinateSequenceFactory(){return this._coordinateSequenceFactory}createPolygon(){if(0===arguments.length)return this.createPolygon(null,null);if(1===arguments.length){if(I(arguments[0],F)){const t=arguments[0];return this.createPolygon(this.createLinearRing(t))}if(arguments[0]instanceof Array){const t=arguments[0];return this.createPolygon(this.createLinearRing(t))}if(arguments[0]instanceof ut){const t=arguments[0];return this.createPolygon(t,null)}}else if(2===arguments.length){return new it(arguments[0],arguments[1],this)}}getSRID(){return this._SRID}createGeometryCollection(){if(0===arguments.length)return new ct(null,this);if(1===arguments.length){return new ct(arguments[0],this)}}getPrecisionModel(){return this._precisionModel}createLinearRing(){if(0===arguments.length)return this.createLinearRing(this.getCoordinateSequenceFactory().create([]));if(1===arguments.length){if(arguments[0]instanceof Array){const t=arguments[0];return this.createLinearRing(null!==t?this.getCoordinateSequenceFactory().create(t):null)}if(I(arguments[0],F)){return new ut(arguments[0],this)}}}createMultiPolygon(){if(0===arguments.length)return new ft(null,this);if(1===arguments.length){return new ft(arguments[0],this)}}createMultiPoint(){if(0===arguments.length)return new ht(null,this);if(1===arguments.length){if(arguments[0]instanceof Array){return new ht(arguments[0],this)}if(I(arguments[0],F)){const t=arguments[0];if(null===t)return this.createMultiPoint(new Array(0).fill(null));const e=new Array(t.size()).fill(null);for(let n=0;n<t.size();n++){const s=this.getCoordinateSequenceFactory().create(1,t.getDimension(),t.getMeasures());Z.copy(t,n,s,0,1),e[n]=this.createPoint(s)}return this.createMultiPoint(e)}}}get interfaces_(){return[c]}}const Lt="XY",Tt="XYZ",Rt="XYM",Pt="XYZM",Ot={POINT:"Point",LINE_STRING:"LineString",LINEAR_RING:"LinearRing",POLYGON:"Polygon",MULTI_POINT:"MultiPoint",MULTI_LINE_STRING:"MultiLineString",MULTI_POLYGON:"MultiPolygon",GEOMETRY_COLLECTION:"GeometryCollection",CIRCLE:"Circle"},vt="EMPTY",Mt=1,bt=2,Dt=3,At=4,Ft=5,Gt=6,qt={};for(const t in Ot)qt[t]=Ot[t].toUpperCase();class Bt{constructor(t){this.wkt=t,this.index_=-1}isAlpha_(t){return t>="a"&&t<="z"||t>="A"&&t<="Z"}isNumeric_(t,e){return t>="0"&&t<="9"||"."==t&&!(void 0!==e&&e)}isWhiteSpace_(t){return" "==t||"\t"==t||"\r"==t||"\n"==t}nextChar_(){return this.wkt.charAt(++this.index_)}nextToken(){const t=this.nextChar_(),e=this.index_;let n,s=t;if("("==t)n=bt;else if(","==t)n=Ft;else if(")"==t)n=Dt;else if(this.isNumeric_(t)||"-"==t)n=At,s=this.readNumber_();else if(this.isAlpha_(t))n=Mt,s=this.readText_();else{if(this.isWhiteSpace_(t))return this.nextToken();if(""!==t)throw new Error("Unexpected character: "+t);n=Gt}return{position:e,value:s,type:n}}readNumber_(){let t;const e=this.index_;let n=!1,s=!1;do{"."==t?n=!0:"e"!=t&&"E"!=t||(s=!0),t=this.nextChar_()}while(this.isNumeric_(t,n)||!s&&("e"==t||"E"==t)||s&&("-"==t||"+"==t));return parseFloat(this.wkt.substring(e,this.index_--))}readText_(){let t;const e=this.index_;do{t=this.nextChar_()}while(this.isAlpha_(t));return this.wkt.substring(e,this.index_--).toUpperCase()}}class Yt{constructor(t,e){this.lexer_=t,this.token_,this.layout_=Lt,this.factory=e}consume_(){this.token_=this.lexer_.nextToken()}isTokenType(t){return this.token_.type==t}match(t){const e=this.isTokenType(t);return e&&this.consume_(),e}parse(){this.consume_();return this.parseGeometry_()}parseGeometryLayout_(){let t=Lt;const e=this.token_;if(this.isTokenType(Mt)){const n=e.value;"Z"===n?t=Tt:"M"===n?t=Rt:"ZM"===n&&(t=Pt),t!==Lt&&this.consume_()}return t}parseGeometryCollectionText_(){if(this.match(bt)){const t=[];do{t.push(this.parseGeometry_())}while(this.match(Ft));if(this.match(Dt))return t}else if(this.isEmptyGeometry_())return[];throw new Error(this.formatErrorMessage_())}parsePointText_(){if(this.match(bt)){const t=this.parsePoint_();if(this.match(Dt))return t}else if(this.isEmptyGeometry_())return null;throw new Error(this.formatErrorMessage_())}parseLineStringText_(){if(this.match(bt)){const t=this.parsePointList_();if(this.match(Dt))return t}else if(this.isEmptyGeometry_())return[];throw new Error(this.formatErrorMessage_())}parsePolygonText_(){if(this.match(bt)){const t=this.parseLineStringTextList_();if(this.match(Dt))return t}else if(this.isEmptyGeometry_())return[];throw new Error(this.formatErrorMessage_())}parseMultiPointText_(){if(this.match(bt)){let t;if(t=this.token_.type==bt?this.parsePointTextList_():this.parsePointList_(),this.match(Dt))return t}else if(this.isEmptyGeometry_())return[];throw new Error(this.formatErrorMessage_())}parseMultiLineStringText_(){if(this.match(bt)){const t=this.parseLineStringTextList_();if(this.match(Dt))return t}else if(this.isEmptyGeometry_())return[];throw new Error(this.formatErrorMessage_())}parseMultiPolygonText_(){if(this.match(bt)){const t=this.parsePolygonTextList_();if(this.match(Dt))return t}else if(this.isEmptyGeometry_())return[];throw new Error(this.formatErrorMessage_())}parsePoint_(){const t=[],e=this.layout_.length;for(let n=0;n<e;++n){const e=this.token_;if(!this.match(At))break;t.push(e.value)}if(t.length==e)return t;throw new Error(this.formatErrorMessage_())}parsePointList_(){const t=[this.parsePoint_()];for(;this.match(Ft);)t.push(this.parsePoint_());return t}parsePointTextList_(){const t=[this.parsePointText_()];for(;this.match(Ft);)t.push(this.parsePointText_());return t}parseLineStringTextList_(){const t=[this.parseLineStringText_()];for(;this.match(Ft);)t.push(this.parseLineStringText_());return t}parsePolygonTextList_(){const t=[this.parsePolygonText_()];for(;this.match(Ft);)t.push(this.parsePolygonText_());return t}isEmptyGeometry_(){const t=this.isTokenType(Mt)&&this.token_.value==vt;return t&&this.consume_(),t}formatErrorMessage_(){return"Unexpected `"+this.token_.value+"` at position "+this.token_.position+" in `"+this.lexer_.wkt+"`"}parseGeometry_(){const t=this.factory,e=t=>new m(...t),n=n=>{const s=n.map((n=>t.createLinearRing(n.map(e))));return s.length>1?t.createPolygon(s[0],s.slice(1)):t.createPolygon(s[0])},s=this.token_;if(this.match(Mt)){const i=s.value;if(this.layout_=this.parseGeometryLayout_(),"GEOMETRYCOLLECTION"==i){const e=this.parseGeometryCollectionText_();return t.createGeometryCollection(e)}switch(i){case"POINT":{const e=this.parsePointText_();return e?t.createPoint(new m(...e)):t.createPoint()}case"LINESTRING":{const n=this.parseLineStringText_().map(e);return t.createLineString(n)}case"LINEARRING":{const n=this.parseLineStringText_().map(e);return t.createLinearRing(n)}case"POLYGON":{const e=this.parsePolygonText_();return e&&0!==e.length?n(e):t.createPolygon()}case"MULTIPOINT":{const n=this.parseMultiPointText_();if(!n||0===n.length)return t.createMultiPoint();const s=n.map(e).map((e=>t.createPoint(e)));return t.createMultiPoint(s)}case"MULTILINESTRING":{const n=this.parseMultiLineStringText_().map((n=>t.createLineString(n.map(e))));return t.createMultiLineString(n)}case"MULTIPOLYGON":{const e=this.parseMultiPolygonText_();if(!e||0===e.length)return t.createMultiPolygon();const s=e.map(n);return t.createMultiPolygon(s)}default:throw new Error("Invalid geometry type: "+i)}}throw new Error(this.formatErrorMessage_())}}function Vt(t){if(t.isEmpty())return"";const e=t.getCoordinate(),n=[e.x,e.y];return e.z&&n.push(e.z),e.m&&n.push(e.m),n.join(" ")}function zt(t){const e=t.getCoordinates().map((t=>[t.x,t.y])),n=[];for(let t=0,s=e.length;t<s;++t)n.push(e[t].join(" "));return n.join(", ")}function kt(t){const e=[];e.push("("+zt(t.getExteriorRing())+")");for(let n=0,s=t.getNumInteriorRing();n<s;++n)e.push("("+zt(t.getInteriorRingN(n))+")");return e.join(", ")}const Xt={Point:Vt,LineString:zt,LinearRing:zt,Polygon:kt,MultiPoint:function(t){const e=[];for(let n=0,s=t.getNumGeometries();n<s;++n)e.push("("+Vt(t.getGeometryN(n))+")");return e.join(", ")},MultiLineString:function(t){const e=[];for(let n=0,s=t.getNumGeometries();n<s;++n)e.push("("+zt(t.getGeometryN(n))+")");return e.join(", ")},MultiPolygon:function(t){const e=[];for(let n=0,s=t.getNumGeometries();n<s;++n)e.push("("+kt(t.getGeometryN(n))+")");return e.join(", ")},GeometryCollection:function(t){const e=[];for(let n=0,s=t.getNumGeometries();n<s;++n)e.push(Ut(t.getGeometryN(n)));return e.join(", ")}};function Ut(t){let e=t.getGeometryType();const n=Xt[e];e=e.toUpperCase();const s=function(t){let e="";if(t.isEmpty())return e;const n=t.getCoordinate();return n.z&&(e+="Z"),n.m&&(e+="M"),e}(t);if(s.length>0&&(e+=" "+s),t.isEmpty())return e+" "+vt;return e+" ("+n(t)+")"}class Ht{constructor(t){this.geometryFactory=t||new Ct,this.precisionModel=this.geometryFactory.getPrecisionModel()}read(t){const e=new Bt(t);return new Yt(e,this.geometryFactory).parse()}write(t){return Ut(t)}}class Wt{constructor(t){this.parser=new Ht(t)}write(t){return this.parser.write(t)}static toLineString(t,e){if(2!==arguments.length)throw new Error("Not implemented");return"LINESTRING ( "+t.x+" "+t.y+", "+e.x+" "+e.y+" )"}}class Zt{constructor(){Zt.constructor_.apply(this,arguments)}static constructor_(){this._result=null,this._inputLines=Array(2).fill().map((()=>Array(2))),this._intPt=new Array(2).fill(null),this._intLineIndex=null,this._isProper=null,this._pa=null,this._pb=null,this._precisionModel=null,this._intPt[0]=new m,this._intPt[1]=new m,this._pa=this._intPt[0],this._pb=this._intPt[1],this._result=0}static computeEdgeDistance(t,e,n){const s=Math.abs(n.x-e.x),i=Math.abs(n.y-e.y);let r=-1;if(t.equals(e))r=0;else if(t.equals(n))r=s>i?s:i;else{const n=Math.abs(t.x-e.x),o=Math.abs(t.y-e.y);r=s>i?n:o,0!==r||t.equals(e)||(r=Math.max(n,o))}return g.isTrue(!(0===r&&!t.equals(e)),"Bad distance calculation"),r}static nonRobustComputeEdgeDistance(t,e,n){const s=t.x-e.x,i=t.y-e.y,r=Math.sqrt(s*s+i*i);return g.isTrue(!(0===r&&!t.equals(e)),"Invalid distance calculation"),r}getIndexAlongSegment(t,e){return this.computeIntLineIndex(),this._intLineIndex[t][e]}getTopologySummary(){const t=new _t;return this.isEndPoint()&&t.append(" endpoint"),this._isProper&&t.append(" proper"),this.isCollinear()&&t.append(" collinear"),t.toString()}computeIntersection(t,e,n,s){this._inputLines[0][0]=t,this._inputLines[0][1]=e,this._inputLines[1][0]=n,this._inputLines[1][1]=s,this._result=this.computeIntersect(t,e,n,s)}getIntersectionNum(){return this._result}computeIntLineIndex(){if(0===arguments.length)null===this._intLineIndex&&(this._intLineIndex=Array(2).fill().map((()=>Array(2))),this.computeIntLineIndex(0),this.computeIntLineIndex(1));else if(1===arguments.length){const t=arguments[0];this.getEdgeDistance(t,0)>this.getEdgeDistance(t,1)?(this._intLineIndex[t][0]=0,this._intLineIndex[t][1]=1):(this._intLineIndex[t][0]=1,this._intLineIndex[t][1]=0)}}isProper(){return this.hasIntersection()&&this._isProper}setPrecisionModel(t){this._precisionModel=t}isInteriorIntersection(){if(0===arguments.length)return!!this.isInteriorIntersection(0)||!!this.isInteriorIntersection(1);if(1===arguments.length){const t=arguments[0];for(let e=0;e<this._result;e++)if(!this._intPt[e].equals2D(this._inputLines[t][0])&&!this._intPt[e].equals2D(this._inputLines[t][1]))return!0;return!1}}getIntersection(t){return this._intPt[t]}isEndPoint(){return this.hasIntersection()&&!this._isProper}hasIntersection(){return this._result!==Zt.NO_INTERSECTION}getEdgeDistance(t,e){return Zt.computeEdgeDistance(this._intPt[e],this._inputLines[t][0],this._inputLines[t][1])}isCollinear(){return this._result===Zt.COLLINEAR_INTERSECTION}toString(){return Wt.toLineString(this._inputLines[0][0],this._inputLines[0][1])+" - "+Wt.toLineString(this._inputLines[1][0],this._inputLines[1][1])+this.getTopologySummary()}getEndpoint(t,e){return this._inputLines[t][e]}isIntersection(t){for(let e=0;e<this._result;e++)if(this._intPt[e].equals2D(t))return!0;return!1}getIntersectionAlongSegment(t,e){return this.computeIntLineIndex(),this._intPt[this._intLineIndex[t][e]]}}Zt.DONT_INTERSECT=0,Zt.DO_INTERSECT=1,Zt.COLLINEAR=2,Zt.NO_INTERSECTION=0,Zt.POINT_INTERSECTION=1,Zt.COLLINEAR_INTERSECTION=2;class jt extends Zt{constructor(){super()}static nearestEndpoint(t,e,n,s){let i=t,r=V.pointToSegment(t,n,s),o=V.pointToSegment(e,n,s);return o<r&&(r=o,i=e),o=V.pointToSegment(n,t,e),o<r&&(r=o,i=n),o=V.pointToSegment(s,t,e),o<r&&(r=o,i=s),i}isInSegmentEnvelopes(t){const e=new O(this._inputLines[0][0],this._inputLines[0][1]),n=new O(this._inputLines[1][0],this._inputLines[1][1]);return e.contains(t)&&n.contains(t)}computeIntersection(){if(3!==arguments.length)return super.computeIntersection.apply(this,arguments);{const t=arguments[0],e=arguments[1],n=arguments[2];if(this._isProper=!1,O.intersects(e,n,t)&&0===G.index(e,n,t)&&0===G.index(n,e,t))return this._isProper=!0,(t.equals(e)||t.equals(n))&&(this._isProper=!1),this._result=Zt.POINT_INTERSECTION,null;this._result=Zt.NO_INTERSECTION}}intersection(t,e,n,s){let i=this.intersectionSafe(t,e,n,s);return this.isInSegmentEnvelopes(i)||(i=new m(jt.nearestEndpoint(t,e,n,s))),null!==this._precisionModel&&this._precisionModel.makePrecise(i),i}checkDD(t,e,n,s,i){const r=A.intersection(t,e,n,s),o=this.isInSegmentEnvelopes(r);B.out.println("DD in env = "+o+"  --------------------- "+r),i.distance(r)>1e-4&&B.out.println("Distance = "+i.distance(r))}intersectionSafe(t,e,n,s){let i=q.intersection(t,e,n,s);return null===i&&(i=jt.nearestEndpoint(t,e,n,s)),i}computeCollinearIntersection(t,e,n,s){const i=O.intersects(t,e,n),r=O.intersects(t,e,s),o=O.intersects(n,s,t),l=O.intersects(n,s,e);return i&&r?(this._intPt[0]=n,this._intPt[1]=s,Zt.COLLINEAR_INTERSECTION):o&&l?(this._intPt[0]=t,this._intPt[1]=e,Zt.COLLINEAR_INTERSECTION):i&&o?(this._intPt[0]=n,this._intPt[1]=t,!n.equals(t)||r||l?Zt.COLLINEAR_INTERSECTION:Zt.POINT_INTERSECTION):i&&l?(this._intPt[0]=n,this._intPt[1]=e,!n.equals(e)||r||o?Zt.COLLINEAR_INTERSECTION:Zt.POINT_INTERSECTION):r&&o?(this._intPt[0]=s,this._intPt[1]=t,!s.equals(t)||i||l?Zt.COLLINEAR_INTERSECTION:Zt.POINT_INTERSECTION):r&&l?(this._intPt[0]=s,this._intPt[1]=e,!s.equals(e)||i||o?Zt.COLLINEAR_INTERSECTION:Zt.POINT_INTERSECTION):Zt.NO_INTERSECTION}computeIntersect(t,e,n,s){if(this._isProper=!1,!O.intersects(t,e,n,s))return Zt.NO_INTERSECTION;const i=G.index(t,e,n),r=G.index(t,e,s);if(i>0&&r>0||i<0&&r<0)return Zt.NO_INTERSECTION;const o=G.index(n,s,t),l=G.index(n,s,e);if(o>0&&l>0||o<0&&l<0)return Zt.NO_INTERSECTION;return 0===i&&0===r&&0===o&&0===l?this.computeCollinearIntersection(t,e,n,s):(0===i||0===r||0===o||0===l?(this._isProper=!1,t.equals2D(n)||t.equals2D(s)?this._intPt[0]=t:e.equals2D(n)||e.equals2D(s)?this._intPt[0]=e:0===i?this._intPt[0]=new m(n):0===r?this._intPt[0]=new m(s):0===o?this._intPt[0]=new m(t):0===l&&(this._intPt[0]=new m(e))):(this._isProper=!0,this._intPt[0]=this.intersection(t,e,n,s)),Zt.POINT_INTERSECTION)}}class Kt{constructor(){Kt.constructor_.apply(this,arguments)}static constructor_(){if(this.p0=null,this.p1=null,0===arguments.length)Kt.constructor_.call(this,new m,new m);else if(1===arguments.length){const t=arguments[0];Kt.constructor_.call(this,t.p0,t.p1)}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this.p0=t,this.p1=e}else if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];Kt.constructor_.call(this,new m(t,e),new m(n,s))}}static midPoint(t,e){return new m((t.x+e.x)/2,(t.y+e.y)/2)}minX(){return Math.min(this.p0.x,this.p1.x)}orientationIndex(){if(arguments[0]instanceof Kt){const t=arguments[0],e=G.index(this.p0,this.p1,t.p0),n=G.index(this.p0,this.p1,t.p1);return e>=0&&n>=0||e<=0&&n<=0?Math.max(e,n):0}if(arguments[0]instanceof m){const t=arguments[0];return G.index(this.p0,this.p1,t)}}toGeometry(t){return t.createLineString([this.p0,this.p1])}isVertical(){return this.p0.x===this.p1.x}equals(t){if(!(t instanceof Kt))return!1;const e=t;return this.p0.equals(e.p0)&&this.p1.equals(e.p1)}intersection(t){const e=new jt;return e.computeIntersection(this.p0,this.p1,t.p0,t.p1),e.hasIntersection()?e.getIntersection(0):null}project(){if(arguments[0]instanceof m){const t=arguments[0];if(t.equals(this.p0)||t.equals(this.p1))return new m(t);const e=this.projectionFactor(t),n=new m;return n.x=this.p0.x+e*(this.p1.x-this.p0.x),n.y=this.p0.y+e*(this.p1.y-this.p0.y),n}if(arguments[0]instanceof Kt){const t=arguments[0],e=this.projectionFactor(t.p0),n=this.projectionFactor(t.p1);if(e>=1&&n>=1)return null;if(e<=0&&n<=0)return null;let s=this.project(t.p0);e<0&&(s=this.p0),e>1&&(s=this.p1);let i=this.project(t.p1);return n<0&&(i=this.p0),n>1&&(i=this.p1),new Kt(s,i)}}normalize(){this.p1.compareTo(this.p0)<0&&this.reverse()}angle(){return Math.atan2(this.p1.y-this.p0.y,this.p1.x-this.p0.x)}getCoordinate(t){return 0===t?this.p0:this.p1}distancePerpendicular(t){return V.pointToLinePerpendicular(t,this.p0,this.p1)}minY(){return Math.min(this.p0.y,this.p1.y)}midPoint(){return Kt.midPoint(this.p0,this.p1)}projectionFactor(t){if(t.equals(this.p0))return 0;if(t.equals(this.p1))return 1;const e=this.p1.x-this.p0.x,n=this.p1.y-this.p0.y,s=e*e+n*n;if(s<=0)return r.NaN;return((t.x-this.p0.x)*e+(t.y-this.p0.y)*n)/s}closestPoints(t){const e=this.intersection(t);if(null!==e)return[e,e];const n=new Array(2).fill(null);let s=r.MAX_VALUE,i=null;const o=this.closestPoint(t.p0);s=o.distance(t.p0),n[0]=o,n[1]=t.p0;const l=this.closestPoint(t.p1);i=l.distance(t.p1),i<s&&(s=i,n[0]=l,n[1]=t.p1);const a=t.closestPoint(this.p0);i=a.distance(this.p0),i<s&&(s=i,n[0]=this.p0,n[1]=a);const c=t.closestPoint(this.p1);return i=c.distance(this.p1),i<s&&(s=i,n[0]=this.p1,n[1]=c),n}closestPoint(t){const e=this.projectionFactor(t);if(e>0&&e<1)return this.project(t);return this.p0.distance(t)<this.p1.distance(t)?this.p0:this.p1}maxX(){return Math.max(this.p0.x,this.p1.x)}getLength(){return this.p0.distance(this.p1)}compareTo(t){const e=t,n=this.p0.compareTo(e.p0);return 0!==n?n:this.p1.compareTo(e.p1)}reverse(){const t=this.p0;this.p0=this.p1,this.p1=t}equalsTopo(t){return this.p0.equals(t.p0)&&this.p1.equals(t.p1)||this.p0.equals(t.p1)&&this.p1.equals(t.p0)}lineIntersection(t){return q.intersection(this.p0,this.p1,t.p0,t.p1)}maxY(){return Math.max(this.p0.y,this.p1.y)}pointAlongOffset(t,e){const n=this.p0.x+t*(this.p1.x-this.p0.x),s=this.p0.y+t*(this.p1.y-this.p0.y),i=this.p1.x-this.p0.x,r=this.p1.y-this.p0.y,o=Math.sqrt(i*i+r*r);let l=0,a=0;if(0!==e){if(o<=0)throw new IllegalStateException("Cannot compute offset from zero-length line segment");l=e*i/o,a=e*r/o}return new m(n-a,s+l)}setCoordinates(){if(1===arguments.length){const t=arguments[0];this.setCoordinates(t.p0,t.p1)}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this.p0.x=t.x,this.p0.y=t.y,this.p1.x=e.x,this.p1.y=e.y}}segmentFraction(t){let e=this.projectionFactor(t);return e<0?e=0:(e>1||r.isNaN(e))&&(e=1),e}toString(){return"LINESTRING( "+this.p0.x+" "+this.p0.y+", "+this.p1.x+" "+this.p1.y+")"}isHorizontal(){return this.p0.y===this.p1.y}reflect(t){const e=this.p1.getY()-this.p0.getY(),n=this.p0.getX()-this.p1.getX(),s=this.p0.getY()*(this.p1.getX()-this.p0.getX())-this.p0.getX()*(this.p1.getY()-this.p0.getY()),i=e*e+n*n,r=e*e-n*n,o=t.getX(),l=t.getY();return new m((-r*o-2*e*n*l-2*e*s)/i,(r*l-2*e*n*o-2*n*s)/i)}distance(){if(arguments[0]instanceof Kt){const t=arguments[0];return V.segmentToSegment(this.p0,this.p1,t.p0,t.p1)}if(arguments[0]instanceof m){const t=arguments[0];return V.pointToSegment(t,this.p0,this.p1)}}pointAlong(t){const e=new m;return e.x=this.p0.x+t*(this.p1.x-this.p0.x),e.y=this.p0.y+t*(this.p1.y-this.p0.y),e}hashCode(){let t=r.doubleToLongBits(this.p0.x);t^=31*r.doubleToLongBits(this.p0.y);const e=Math.trunc(t)^Math.trunc(t>>32);let n=r.doubleToLongBits(this.p1.x);n^=31*r.doubleToLongBits(this.p1.y);return e^(Math.trunc(n)^Math.trunc(n>>32))}get interfaces_(){return[o,c]}}class Qt{static toLocationSymbol(t){switch(t){case Qt.EXTERIOR:return"e";case Qt.BOUNDARY:return"b";case Qt.INTERIOR:return"i";case Qt.NONE:return"-"}throw new s("Unknown location value: "+t)}}Qt.INTERIOR=0,Qt.BOUNDARY=1,Qt.EXTERIOR=2,Qt.NONE=-1;class Jt{constructor(){Jt.constructor_.apply(this,arguments)}static constructor_(){if(this._matrix=null,0===arguments.length)this._matrix=Array(3).fill().map((()=>Array(3))),this.setAll(K.FALSE);else if(1===arguments.length)if("string"==typeof arguments[0]){const t=arguments[0];Jt.constructor_.call(this),this.set(t)}else if(arguments[0]instanceof Jt){const t=arguments[0];Jt.constructor_.call(this),this._matrix[Qt.INTERIOR][Qt.INTERIOR]=t._matrix[Qt.INTERIOR][Qt.INTERIOR],this._matrix[Qt.INTERIOR][Qt.BOUNDARY]=t._matrix[Qt.INTERIOR][Qt.BOUNDARY],this._matrix[Qt.INTERIOR][Qt.EXTERIOR]=t._matrix[Qt.INTERIOR][Qt.EXTERIOR],this._matrix[Qt.BOUNDARY][Qt.INTERIOR]=t._matrix[Qt.BOUNDARY][Qt.INTERIOR],this._matrix[Qt.BOUNDARY][Qt.BOUNDARY]=t._matrix[Qt.BOUNDARY][Qt.BOUNDARY],this._matrix[Qt.BOUNDARY][Qt.EXTERIOR]=t._matrix[Qt.BOUNDARY][Qt.EXTERIOR],this._matrix[Qt.EXTERIOR][Qt.INTERIOR]=t._matrix[Qt.EXTERIOR][Qt.INTERIOR],this._matrix[Qt.EXTERIOR][Qt.BOUNDARY]=t._matrix[Qt.EXTERIOR][Qt.BOUNDARY],this._matrix[Qt.EXTERIOR][Qt.EXTERIOR]=t._matrix[Qt.EXTERIOR][Qt.EXTERIOR]}}static matches(){if(Number.isInteger(arguments[0])&&"string"==typeof arguments[1]){const t=arguments[0],e=arguments[1];return e===K.SYM_DONTCARE||(e===K.SYM_TRUE&&(t>=0||t===K.TRUE)||(e===K.SYM_FALSE&&t===K.FALSE||(e===K.SYM_P&&t===K.P||(e===K.SYM_L&&t===K.L||e===K.SYM_A&&t===K.A))))}if("string"==typeof arguments[0]&&"string"==typeof arguments[1]){const t=arguments[1];return new Jt(arguments[0]).matches(t)}}static isTrue(t){return t>=0||t===K.TRUE}isIntersects(){return!this.isDisjoint()}isCovers(){return(Jt.isTrue(this._matrix[Qt.INTERIOR][Qt.INTERIOR])||Jt.isTrue(this._matrix[Qt.INTERIOR][Qt.BOUNDARY])||Jt.isTrue(this._matrix[Qt.BOUNDARY][Qt.INTERIOR])||Jt.isTrue(this._matrix[Qt.BOUNDARY][Qt.BOUNDARY]))&&this._matrix[Qt.EXTERIOR][Qt.INTERIOR]===K.FALSE&&this._matrix[Qt.EXTERIOR][Qt.BOUNDARY]===K.FALSE}isCoveredBy(){return(Jt.isTrue(this._matrix[Qt.INTERIOR][Qt.INTERIOR])||Jt.isTrue(this._matrix[Qt.INTERIOR][Qt.BOUNDARY])||Jt.isTrue(this._matrix[Qt.BOUNDARY][Qt.INTERIOR])||Jt.isTrue(this._matrix[Qt.BOUNDARY][Qt.BOUNDARY]))&&this._matrix[Qt.INTERIOR][Qt.EXTERIOR]===K.FALSE&&this._matrix[Qt.BOUNDARY][Qt.EXTERIOR]===K.FALSE}set(){if(1===arguments.length){const t=arguments[0];for(let e=0;e<t.length;e++){const n=Math.trunc(e/3),s=e%3;this._matrix[n][s]=K.toDimensionValue(t.charAt(e))}}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];this._matrix[t][e]=n}}isContains(){return Jt.isTrue(this._matrix[Qt.INTERIOR][Qt.INTERIOR])&&this._matrix[Qt.EXTERIOR][Qt.INTERIOR]===K.FALSE&&this._matrix[Qt.EXTERIOR][Qt.BOUNDARY]===K.FALSE}setAtLeast(){if(1===arguments.length){const t=arguments[0];for(let e=0;e<t.length;e++){const n=Math.trunc(e/3),s=e%3;this.setAtLeast(n,s,K.toDimensionValue(t.charAt(e)))}}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];this._matrix[t][e]<n&&(this._matrix[t][e]=n)}}setAtLeastIfValid(t,e,n){t>=0&&e>=0&&this.setAtLeast(t,e,n)}isWithin(){return Jt.isTrue(this._matrix[Qt.INTERIOR][Qt.INTERIOR])&&this._matrix[Qt.INTERIOR][Qt.EXTERIOR]===K.FALSE&&this._matrix[Qt.BOUNDARY][Qt.EXTERIOR]===K.FALSE}isTouches(t,e){return t>e?this.isTouches(e,t):(t===K.A&&e===K.A||t===K.L&&e===K.L||t===K.L&&e===K.A||t===K.P&&e===K.A||t===K.P&&e===K.L)&&(this._matrix[Qt.INTERIOR][Qt.INTERIOR]===K.FALSE&&(Jt.isTrue(this._matrix[Qt.INTERIOR][Qt.BOUNDARY])||Jt.isTrue(this._matrix[Qt.BOUNDARY][Qt.INTERIOR])||Jt.isTrue(this._matrix[Qt.BOUNDARY][Qt.BOUNDARY])))}isOverlaps(t,e){return t===K.P&&e===K.P||t===K.A&&e===K.A?Jt.isTrue(this._matrix[Qt.INTERIOR][Qt.INTERIOR])&&Jt.isTrue(this._matrix[Qt.INTERIOR][Qt.EXTERIOR])&&Jt.isTrue(this._matrix[Qt.EXTERIOR][Qt.INTERIOR]):t===K.L&&e===K.L&&(1===this._matrix[Qt.INTERIOR][Qt.INTERIOR]&&Jt.isTrue(this._matrix[Qt.INTERIOR][Qt.EXTERIOR])&&Jt.isTrue(this._matrix[Qt.EXTERIOR][Qt.INTERIOR]))}isEquals(t,e){return t===e&&(Jt.isTrue(this._matrix[Qt.INTERIOR][Qt.INTERIOR])&&this._matrix[Qt.INTERIOR][Qt.EXTERIOR]===K.FALSE&&this._matrix[Qt.BOUNDARY][Qt.EXTERIOR]===K.FALSE&&this._matrix[Qt.EXTERIOR][Qt.INTERIOR]===K.FALSE&&this._matrix[Qt.EXTERIOR][Qt.BOUNDARY]===K.FALSE)}toString(){const t=new _t("123456789");for(let e=0;e<3;e++)for(let n=0;n<3;n++)t.setCharAt(3*e+n,K.toDimensionSymbol(this._matrix[e][n]));return t.toString()}setAll(t){for(let e=0;e<3;e++)for(let n=0;n<3;n++)this._matrix[e][n]=t}get(t,e){return this._matrix[t][e]}transpose(){let t=this._matrix[1][0];return this._matrix[1][0]=this._matrix[0][1],this._matrix[0][1]=t,t=this._matrix[2][0],this._matrix[2][0]=this._matrix[0][2],this._matrix[0][2]=t,t=this._matrix[2][1],this._matrix[2][1]=this._matrix[1][2],this._matrix[1][2]=t,this}matches(t){if(9!==t.length)throw new s("Should be length 9: "+t);for(let e=0;e<3;e++)for(let n=0;n<3;n++)if(!Jt.matches(this._matrix[e][n],t.charAt(3*e+n)))return!1;return!0}add(t){for(let e=0;e<3;e++)for(let n=0;n<3;n++)this.setAtLeast(e,n,t.get(e,n))}isDisjoint(){return this._matrix[Qt.INTERIOR][Qt.INTERIOR]===K.FALSE&&this._matrix[Qt.INTERIOR][Qt.BOUNDARY]===K.FALSE&&this._matrix[Qt.BOUNDARY][Qt.INTERIOR]===K.FALSE&&this._matrix[Qt.BOUNDARY][Qt.BOUNDARY]===K.FALSE}isCrosses(t,e){return t===K.P&&e===K.L||t===K.P&&e===K.A||t===K.L&&e===K.A?Jt.isTrue(this._matrix[Qt.INTERIOR][Qt.INTERIOR])&&Jt.isTrue(this._matrix[Qt.INTERIOR][Qt.EXTERIOR]):t===K.L&&e===K.P||t===K.A&&e===K.P||t===K.A&&e===K.L?Jt.isTrue(this._matrix[Qt.INTERIOR][Qt.INTERIOR])&&Jt.isTrue(this._matrix[Qt.EXTERIOR][Qt.INTERIOR]):t===K.L&&e===K.L&&0===this._matrix[Qt.INTERIOR][Qt.INTERIOR]}get interfaces_(){return[l]}}class $t{static toDegrees(t){return 180*t/Math.PI}static normalize(t){for(;t>Math.PI;)t-=$t.PI_TIMES_2;for(;t<=-Math.PI;)t+=$t.PI_TIMES_2;return t}static angle(){if(1===arguments.length){const t=arguments[0];return Math.atan2(t.y,t.x)}if(2===arguments.length){const t=arguments[0],e=arguments[1],n=e.x-t.x,s=e.y-t.y;return Math.atan2(s,n)}}static isAcute(t,e,n){const s=t.x-e.x,i=t.y-e.y;return s*(n.x-e.x)+i*(n.y-e.y)>0}static isObtuse(t,e,n){const s=t.x-e.x,i=t.y-e.y;return s*(n.x-e.x)+i*(n.y-e.y)<0}static interiorAngle(t,e,n){const s=$t.angle(e,t),i=$t.angle(e,n);return Math.abs(i-s)}static normalizePositive(t){if(t<0){for(;t<0;)t+=$t.PI_TIMES_2;t>=$t.PI_TIMES_2&&(t=0)}else{for(;t>=$t.PI_TIMES_2;)t-=$t.PI_TIMES_2;t<0&&(t=0)}return t}static angleBetween(t,e,n){const s=$t.angle(e,t),i=$t.angle(e,n);return $t.diff(s,i)}static diff(t,e){let n=null;return n=t<e?e-t:t-e,n>Math.PI&&(n=2*Math.PI-n),n}static toRadians(t){return t*Math.PI/180}static getTurn(t,e){const n=Math.sin(e-t);return n>0?$t.COUNTERCLOCKWISE:n<0?$t.CLOCKWISE:$t.NONE}static angleBetweenOriented(t,e,n){const s=$t.angle(e,t),i=$t.angle(e,n)-s;return i<=-Math.PI?i+$t.PI_TIMES_2:i>Math.PI?i-$t.PI_TIMES_2:i}}$t.PI_TIMES_2=2*Math.PI,$t.PI_OVER_2=Math.PI/2,$t.PI_OVER_4=Math.PI/4,$t.COUNTERCLOCKWISE=G.COUNTERCLOCKWISE,$t.CLOCKWISE=G.CLOCKWISE,$t.NONE=G.COLLINEAR;class te extends n{constructor(){super(),te.constructor_.apply(this,arguments)}static constructor_(){n.constructor_.call(this,"Projective point not representable on the Cartesian plane.")}}class ee{constructor(){ee.constructor_.apply(this,arguments)}static constructor_(){if(this.x=null,this.y=null,this.w=null,0===arguments.length)this.x=0,this.y=0,this.w=1;else if(1===arguments.length){const t=arguments[0];this.x=t.x,this.y=t.y,this.w=1}else if(2===arguments.length){if("number"==typeof arguments[0]&&"number"==typeof arguments[1]){const t=arguments[0],e=arguments[1];this.x=t,this.y=e,this.w=1}else if(arguments[0]instanceof ee&&arguments[1]instanceof ee){const t=arguments[0],e=arguments[1];this.x=t.y*e.w-e.y*t.w,this.y=e.x*t.w-t.x*e.w,this.w=t.x*e.y-e.x*t.y}else if(arguments[0]instanceof m&&arguments[1]instanceof m){const t=arguments[0],e=arguments[1];this.x=t.y-e.y,this.y=e.x-t.x,this.w=t.x*e.y-e.x*t.y}}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];this.x=t,this.y=e,this.w=n}else if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3],i=t.y-e.y,r=e.x-t.x,o=t.x*e.y-e.x*t.y,l=n.y-s.y,a=s.x-n.x,c=n.x*s.y-s.x*n.y;this.x=r*c-a*o,this.y=l*o-i*c,this.w=i*a-l*r}}getY(){const t=this.y/this.w;if(r.isNaN(t)||r.isInfinite(t))throw new te;return t}getX(){const t=this.x/this.w;if(r.isNaN(t)||r.isInfinite(t))throw new te;return t}getCoordinate(){const t=new m;return t.x=this.getX(),t.y=this.getY(),t}}class ne{constructor(){ne.constructor_.apply(this,arguments)}static constructor_(){this.p0=null,this.p1=null,this.p2=null;const t=arguments[0],e=arguments[1],n=arguments[2];this.p0=t,this.p1=e,this.p2=n}static area(t,e,n){return Math.abs(((n.x-t.x)*(e.y-t.y)-(e.x-t.x)*(n.y-t.y))/2)}static signedArea(t,e,n){return((n.x-t.x)*(e.y-t.y)-(e.x-t.x)*(n.y-t.y))/2}static det(t,e,n,s){return t*s-e*n}static interpolateZ(t,e,n,s){const i=e.x,r=e.y,o=n.x-i,l=s.x-i,a=n.y-r,c=s.y-r,h=o*c-l*a,u=t.x-i,g=t.y-r,d=(c*u-l*g)/h,_=(-a*u+o*g)/h;return e.getZ()+d*(n.getZ()-e.getZ())+_*(s.getZ()-e.getZ())}static longestSideLength(t,e,n){const s=t.distance(e),i=e.distance(n),r=n.distance(t);let o=s;return i>o&&(o=i),r>o&&(o=r),o}static circumcentreDD(t,e,n){const s=D.valueOf(t.x).subtract(n.x),i=D.valueOf(t.y).subtract(n.y),r=D.valueOf(e.x).subtract(n.x),o=D.valueOf(e.y).subtract(n.y),l=D.determinant(s,i,r,o).multiply(2),a=s.sqr().add(i.sqr()),c=r.sqr().add(o.sqr()),h=D.determinant(i,a,o,c),u=D.determinant(s,a,r,c),g=D.valueOf(n.x).subtract(h.divide(l)).doubleValue(),d=D.valueOf(n.y).add(u.divide(l)).doubleValue();return new m(g,d)}static isAcute(t,e,n){return!!$t.isAcute(t,e,n)&&(!!$t.isAcute(e,n,t)&&!!$t.isAcute(n,t,e))}static circumcentre(t,e,n){const s=n.x,i=n.y,r=t.x-s,o=t.y-i,l=e.x-s,a=e.y-i,c=2*ne.det(r,o,l,a),h=ne.det(o,r*r+o*o,a,l*l+a*a),u=ne.det(r,r*r+o*o,l,l*l+a*a);return new m(s-h/c,i+u/c)}static perpendicularBisector(t,e){const n=e.x-t.x,s=e.y-t.y,i=new ee(t.x+n/2,t.y+s/2,1),r=new ee(t.x-s+n/2,t.y+n+s/2,1);return new ee(i,r)}static angleBisector(t,e,n){const s=e.distance(t),i=s/(s+e.distance(n)),r=n.x-t.x,o=n.y-t.y;return new m(t.x+i*r,t.y+i*o)}static area3D(t,e,n){const s=e.x-t.x,i=e.y-t.y,r=e.getZ()-t.getZ(),o=n.x-t.x,l=n.y-t.y,a=n.getZ()-t.getZ(),c=i*a-r*l,h=r*o-s*a,u=s*l-i*o,g=c*c+h*h+u*u;return Math.sqrt(g)/2}static centroid(t,e,n){const s=(t.x+e.x+n.x)/3,i=(t.y+e.y+n.y)/3;return new m(s,i)}static inCentre(t,e,n){const s=e.distance(n),i=t.distance(n),r=t.distance(e),o=s+i+r,l=(s*t.x+i*e.x+r*n.x)/o,a=(s*t.y+i*e.y+r*n.y)/o;return new m(l,a)}area(){return ne.area(this.p0,this.p1,this.p2)}signedArea(){return ne.signedArea(this.p0,this.p1,this.p2)}interpolateZ(t){if(null===t)throw new s("Supplied point is null.");return ne.interpolateZ(t,this.p0,this.p1,this.p2)}longestSideLength(){return ne.longestSideLength(this.p0,this.p1,this.p2)}isAcute(){return ne.isAcute(this.p0,this.p1,this.p2)}circumcentre(){return ne.circumcentre(this.p0,this.p1,this.p2)}area3D(){return ne.area3D(this.p0,this.p1,this.p2)}centroid(){return ne.centroid(this.p0,this.p1,this.p2)}inCentre(){return ne.inCentre(this.p0,this.p1,this.p2)}}class se extends n{constructor(){super(),se.constructor_.apply(this,arguments)}static constructor_(){if(0===arguments.length)n.constructor_.call(this);else if(1===arguments.length){const t=arguments[0];n.constructor_.call(this,t)}}}class ie{constructor(){ie.constructor_.apply(this,arguments)}static constructor_(){if(this._m00=null,this._m01=null,this._m02=null,this._m10=null,this._m11=null,this._m12=null,0===arguments.length)this.setToIdentity();else if(1===arguments.length){if(arguments[0]instanceof Array){const t=arguments[0];this._m00=t[0],this._m01=t[1],this._m02=t[2],this._m10=t[3],this._m11=t[4],this._m12=t[5]}else if(arguments[0]instanceof ie){const t=arguments[0];this.setTransformation(t)}}else if(6===arguments.length&&"number"==typeof arguments[5]&&"number"==typeof arguments[4]&&"number"==typeof arguments[3]&&"number"==typeof arguments[2]&&"number"==typeof arguments[0]&&"number"==typeof arguments[1]){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3],i=arguments[4],r=arguments[5];this.setTransformation(t,e,n,s,i,r)}}static translationInstance(t,e){const n=new ie;return n.setToTranslation(t,e),n}static shearInstance(t,e){const n=new ie;return n.setToShear(t,e),n}static reflectionInstance(){if(2===arguments.length){const t=arguments[0],e=arguments[1],n=new ie;return n.setToReflection(t,e),n}if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3],i=new ie;return i.setToReflection(t,e,n,s),i}}static rotationInstance(){if(1===arguments.length){const t=arguments[0];return ie.rotationInstance(Math.sin(t),Math.cos(t))}if(2===arguments.length){const t=arguments[0],e=arguments[1],n=new ie;return n.setToRotation(t,e),n}if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];return ie.rotationInstance(Math.sin(t),Math.cos(t),e,n)}if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3],i=new ie;return i.setToRotation(t,e,n,s),i}}static scaleInstance(){if(2===arguments.length){const t=arguments[0],e=arguments[1],n=new ie;return n.setToScale(t,e),n}if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3],i=new ie;return i.translate(-n,-s),i.scale(t,e),i.translate(n,s),i}}setToReflectionBasic(t,e,n,i){if(t===n&&e===i)throw new s("Reflection line points must be distinct");const r=n-t,o=i-e,l=Math.sqrt(r*r+o*o),a=o/l,c=r/l,h=2*a*c,u=c*c-a*a;return this._m00=u,this._m01=h,this._m02=0,this._m10=h,this._m11=-u,this._m12=0,this}getInverse(){const t=this.getDeterminant();if(0===t)throw new se("Transformation is non-invertible");const e=this._m11/t,n=-this._m10/t,s=-this._m01/t,i=this._m00/t,r=(this._m01*this._m12-this._m02*this._m11)/t,o=(-this._m00*this._m12+this._m10*this._m02)/t;return new ie(e,s,r,n,i,o)}compose(t){const e=t._m00*this._m00+t._m01*this._m10,n=t._m00*this._m01+t._m01*this._m11,s=t._m00*this._m02+t._m01*this._m12+t._m02,i=t._m10*this._m00+t._m11*this._m10,r=t._m10*this._m01+t._m11*this._m11,o=t._m10*this._m02+t._m11*this._m12+t._m12;return this._m00=e,this._m01=n,this._m02=s,this._m10=i,this._m11=r,this._m12=o,this}equals(t){if(null===t)return!1;if(!(t instanceof ie))return!1;const e=t;return this._m00===e._m00&&this._m01===e._m01&&this._m02===e._m02&&this._m10===e._m10&&this._m11===e._m11&&this._m12===e._m12}setToScale(t,e){return this._m00=t,this._m01=0,this._m02=0,this._m10=0,this._m11=e,this._m12=0,this}isIdentity(){return 1===this._m00&&0===this._m01&&0===this._m02&&0===this._m10&&1===this._m11&&0===this._m12}scale(t,e){return this.compose(ie.scaleInstance(t,e)),this}setToIdentity(){return this._m00=1,this._m01=0,this._m02=0,this._m10=0,this._m11=1,this._m12=0,this}isGeometryChanged(){return!0}setTransformation(){if(1===arguments.length){const t=arguments[0];return this._m00=t._m00,this._m01=t._m01,this._m02=t._m02,this._m10=t._m10,this._m11=t._m11,this._m12=t._m12,this}if(6===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3],i=arguments[4],r=arguments[5];return this._m00=t,this._m01=e,this._m02=n,this._m10=s,this._m11=i,this._m12=r,this}}setToRotation(){if(1===arguments.length){const t=arguments[0];return this.setToRotation(Math.sin(t),Math.cos(t)),this}if(2===arguments.length){const t=arguments[0],e=arguments[1];return this._m00=e,this._m01=-t,this._m02=0,this._m10=t,this._m11=e,this._m12=0,this}if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];return this.setToRotation(Math.sin(t),Math.cos(t),e,n),this}if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];return this._m00=e,this._m01=-t,this._m02=n-n*e+s*t,this._m10=t,this._m11=e,this._m12=s-n*t-s*e,this}}getMatrixEntries(){return[this._m00,this._m01,this._m02,this._m10,this._m11,this._m12]}filter(t,e){this.transform(t,e)}rotate(){if(1===arguments.length){const t=arguments[0];return this.compose(ie.rotationInstance(t)),this}if(2===arguments.length){const t=arguments[0],e=arguments[1];return this.compose(ie.rotationInstance(t,e)),this}if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];return this.compose(ie.rotationInstance(t,e,n)),this}if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];return this.compose(ie.rotationInstance(t,e,n,s)),this}}getDeterminant(){return this._m00*this._m11-this._m01*this._m10}composeBefore(t){const e=this._m00*t._m00+this._m01*t._m10,n=this._m00*t._m01+this._m01*t._m11,s=this._m00*t._m02+this._m01*t._m12+this._m02,i=this._m10*t._m00+this._m11*t._m10,r=this._m10*t._m01+this._m11*t._m11,o=this._m10*t._m02+this._m11*t._m12+this._m12;return this._m00=e,this._m01=n,this._m02=s,this._m10=i,this._m11=r,this._m12=o,this}setToShear(t,e){return this._m00=1,this._m01=t,this._m02=0,this._m10=e,this._m11=1,this._m12=0,this}isDone(){return!1}clone(){try{return null}catch(t){if(!(t instanceof n))throw t;g.shouldNeverReachHere()}return null}translate(t,e){return this.compose(ie.translationInstance(t,e)),this}setToReflection(){if(2===arguments.length){const t=arguments[0],e=arguments[1];if(0===t&&0===e)throw new s("Reflection vector must be non-zero");if(t===e)return this._m00=0,this._m01=1,this._m02=0,this._m10=1,this._m11=0,this._m12=0,this;const n=Math.sqrt(t*t+e*e),i=e/n,r=t/n;return this.rotate(-i,r),this.scale(1,-1),this.rotate(i,r),this}if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],i=arguments[3];if(t===n&&e===i)throw new s("Reflection line points must be distinct");this.setToTranslation(-t,-e);const r=n-t,o=i-e,l=Math.sqrt(r*r+o*o),a=o/l,c=r/l;return this.rotate(-a,c),this.scale(1,-1),this.rotate(a,c),this.translate(t,e),this}}toString(){return"AffineTransformation[["+this._m00+", "+this._m01+", "+this._m02+"], ["+this._m10+", "+this._m11+", "+this._m12+"]]"}setToTranslation(t,e){return this._m00=1,this._m01=0,this._m02=t,this._m10=0,this._m11=1,this._m12=e,this}shear(t,e){return this.compose(ie.shearInstance(t,e)),this}transform(){if(1===arguments.length){const t=arguments[0].copy();return t.apply(this),t}if(2===arguments.length){if(arguments[0]instanceof m&&arguments[1]instanceof m){const t=arguments[0],e=arguments[1],n=this._m00*t.x+this._m01*t.y+this._m02,s=this._m10*t.x+this._m11*t.y+this._m12;return e.x=n,e.y=s,e}if(I(arguments[0],F)&&Number.isInteger(arguments[1])){const t=arguments[0],e=arguments[1],n=this._m00*t.getOrdinate(e,0)+this._m01*t.getOrdinate(e,1)+this._m02,s=this._m10*t.getOrdinate(e,0)+this._m11*t.getOrdinate(e,1)+this._m12;t.setOrdinate(e,0,n),t.setOrdinate(e,1,s)}}}reflect(){if(2===arguments.length){const t=arguments[0],e=arguments[1];return this.compose(ie.reflectionInstance(t,e)),this}if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];return this.compose(ie.reflectionInstance(t,e,n,s)),this}}get interfaces_(){return[l,P]}}class re{static solve(t,e){const n=e.length;if(t.length!==n||t[0].length!==n)throw new s("Matrix A is incorrectly sized");for(let s=0;s<n;s++){let i=s;for(let e=s+1;e<n;e++)Math.abs(t[e][s])>Math.abs(t[i][s])&&(i=e);if(0===t[i][s])return null;re.swapRows(t,s,i),re.swapRows(e,s,i);for(let i=s+1;i<n;i++){const r=t[i][s]/t[s][s];for(let e=n-1;e>=s;e--)t[i][e]-=t[s][e]*r;e[i]-=e[s]*r}}const i=new Array(n).fill(null);for(let s=n-1;s>=0;s--){let r=0;for(let e=s+1;e<n;e++)r+=t[s][e]*i[e];i[s]=(e[s]-r)/t[s][s]}return i}static swapRows(){if(Number.isInteger(arguments[2])&&arguments[0]instanceof Array&&Number.isInteger(arguments[1])){const t=arguments[0],e=arguments[1],n=arguments[2];if(e===n)return null;for(let s=0;s<t[0].length;s++){const i=t[e][s];t[e][s]=t[n][s],t[n][s]=i}}else if(Number.isInteger(arguments[2])&&arguments[0]instanceof Array&&Number.isInteger(arguments[1])){const t=arguments[0],e=arguments[1],n=arguments[2];if(e===n)return null;const s=t[e];t[e]=t[n],t[n]=s}}}class oe{constructor(){oe.constructor_.apply(this,arguments)}static constructor_(){this._src0=null,this._src1=null,this._src2=null,this._dest0=null,this._dest1=null,this._dest2=null,this._m00=null,this._m01=null,this._m02=null,this._m10=null,this._m11=null,this._m12=null;const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3],i=arguments[4],r=arguments[5];this._src0=t,this._src1=e,this._src2=n,this._dest0=s,this._dest1=i,this._dest2=r}solve(t){const e=[[this._src0.x,this._src0.y,1],[this._src1.x,this._src1.y,1],[this._src2.x,this._src2.y,1]];return re.solve(e,t)}compute(){const t=[this._dest0.x,this._dest1.x,this._dest2.x],e=this.solve(t);if(null===e)return!1;this._m00=e[0],this._m01=e[1],this._m02=e[2];const n=[this._dest0.y,this._dest1.y,this._dest2.y],s=this.solve(n);return null!==s&&(this._m10=s[0],this._m11=s[1],this._m12=s[2],!0)}getTransformation(){return this.compute()?new ie(this._m00,this._m01,this._m02,this._m10,this._m11,this._m12):null}}class le{static createFromBaseLines(t,e,n,s){const i=new m(t.x+s.x-n.x,t.y+s.y-n.y),r=$t.angleBetweenOriented(e,t,i),o=e.distance(t),l=s.distance(n);if(0===o)return new ie;const a=l/o,c=ie.translationInstance(-t.x,-t.y);return c.rotate(r),c.scale(a,a),c.translate(n.x,n.y),c}static createFromControlVectors(){if(2===arguments.length){if(arguments[0]instanceof m&&arguments[1]instanceof m){const t=arguments[0],e=arguments[1],n=e.x-t.x,s=e.y-t.y;return ie.translationInstance(n,s)}if(arguments[0]instanceof Array&&arguments[1]instanceof Array){const t=arguments[0],e=arguments[1];if(t.length!==e.length)throw new s("Src and Dest arrays are not the same length");if(t.length<=0)throw new s("Too few control points");if(t.length>3)throw new s("Too many control points");return 1===t.length?le.createFromControlVectors(t[0],e[0]):2===t.length?le.createFromControlVectors(t[0],t[1],e[0],e[1]):le.createFromControlVectors(t[0],t[1],t[2],e[0],e[1],e[2])}}else{if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3],i=new m(s.x-n.x,s.y-n.y),r=$t.angleBetweenOriented(e,t,i),o=e.distance(t),l=s.distance(n);if(0===o)return null;const a=l/o,c=ie.translationInstance(-t.x,-t.y);return c.rotate(r),c.scale(a,a),c.translate(n.x,n.y),c}if(6===arguments.length){return new oe(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4],arguments[5]).getTransformation()}}}}class ae{constructor(){ae.constructor_.apply(this,arguments)}static constructor_(){this._coords=null;const t=arguments[0];this._coords=t}static getCoordinates(t){const e=new L;return t.apply(new ae(e)),e}filter(t){(t instanceof J||t instanceof tt)&&this._coords.add(t.getCoordinate())}get interfaces_(){return[k]}}class ce{constructor(){ce.constructor_.apply(this,arguments)}static constructor_(){this._mapOp=null;const t=arguments[0];this._mapOp=t}static map(t,e){return new ce(e).map(t)}map(t){const e=new L;for(let n=0;n<t.getNumGeometries();n++){const s=this._mapOp.map(t.getGeometryN(n));s.isEmpty()||e.add(s)}return t.getFactory().createGeometryCollection(Ct.toGeometryArray(e))}}class he{constructor(){he.constructor_.apply(this,arguments)}static constructor_(){this._geomFactory=null,this._skipEmpty=!1,this._inputGeoms=null;const t=arguments[0];this._geomFactory=he.extractFactory(t),this._inputGeoms=t}static combine(){if(1===arguments.length){return new he(arguments[0]).combine()}if(2===arguments.length){const t=arguments[0],e=arguments[1];return new he(he.createList(t,e)).combine()}if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];return new he(he.createList(t,e,n)).combine()}}static extractFactory(t){return t.isEmpty()?null:t.iterator().next().getFactory()}static createList(){if(2===arguments.length){const t=arguments[0],e=arguments[1],n=new L;return n.add(t),n.add(e),n}if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=new L;return s.add(t),s.add(e),s.add(n),s}}extractElements(t,e){if(null===t)return null;for(let n=0;n<t.getNumGeometries();n++){const s=t.getGeometryN(n);this._skipEmpty&&s.isEmpty()||e.add(s)}}combine(){const t=new L;for(let e=this._inputGeoms.iterator();e.hasNext();){const n=e.next();this.extractElements(n,t)}return 0===t.size()?null!==this._geomFactory?this._geomFactory.createGeometryCollection():null:this._geomFactory.buildGeometry(t)}}class ue{constructor(){ue.constructor_.apply(this,arguments)}static constructor_(){if(this._factory=null,this._isUserDataCopied=!1,0===arguments.length);else if(1===arguments.length){const t=arguments[0];this._factory=t}}setCopyUserData(t){this._isUserDataCopied=t}edit(t,e){if(null===t)return null;const n=this.editInternal(t,e);return this._isUserDataCopied&&n.setUserData(t.getUserData()),n}editInternal(t,e){return null===this._factory&&(this._factory=t.getFactory()),t instanceof ct?this.editGeometryCollection(t,e):t instanceof it?this.editPolygon(t,e):t instanceof tt||t instanceof J?e.edit(t,this._factory):(g.shouldNeverReachHere("Unsupported Geometry type: "+t.getGeometryType()),null)}editGeometryCollection(t,e){const n=e.edit(t,this._factory),s=new L;for(let t=0;t<n.getNumGeometries();t++){const i=this.edit(n.getGeometryN(t),e);null===i||i.isEmpty()||s.add(i)}return n.getGeometryType()===X.TYPENAME_MULTIPOINT?this._factory.createMultiPoint(s.toArray([])):n.getGeometryType()===X.TYPENAME_MULTILINESTRING?this._factory.createMultiLineString(s.toArray([])):n.getGeometryType()===X.TYPENAME_MULTIPOLYGON?this._factory.createMultiPolygon(s.toArray([])):this._factory.createGeometryCollection(s.toArray([]))}editPolygon(t,e){let n=e.edit(t,this._factory);if(null===n&&(n=this._factory.createPolygon()),n.isEmpty())return n;const s=this.edit(n.getExteriorRing(),e);if(null===s||s.isEmpty())return this._factory.createPolygon();const i=new L;for(let t=0;t<n.getNumInteriorRing();t++){const s=this.edit(n.getInteriorRingN(t),e);null===s||s.isEmpty()||i.add(s)}return this._factory.createPolygon(s,i.toArray([]))}}function ge(){}ue.GeometryEditorOperation=ge;ue.NoOpGeometryOperation=class{edit(t,e){return t}get interfaces_(){return[ge]}},ue.CoordinateOperation=class{edit(t,e){const n=this.edit(t.getCoordinates(),t);return t instanceof ut?null===n?e.createLinearRing():e.createLinearRing(n):t instanceof J?null===n?e.createLineString():e.createLineString(n):t instanceof tt?null===n||0===n.length?e.createPoint():e.createPoint(n[0]):t}get interfaces_(){return[ge]}},ue.CoordinateSequenceOperation=class{edit(t,e){return t instanceof ut?e.createLinearRing(this.edit(t.getCoordinateSequence(),t)):t instanceof J?e.createLineString(this.edit(t.getCoordinateSequence(),t)):t instanceof tt?e.createPoint(this.edit(t.getCoordinateSequence(),t)):t}get interfaces_(){return[ge]}};class de{constructor(){de.constructor_.apply(this,arguments)}static constructor_(){this._geometryType=null,this._comps=null;const t=arguments[0],e=arguments[1];this._geometryType=t,this._comps=e}static isOfType(t,e){return t.getGeometryType()===e||e===X.TYPENAME_LINESTRING&&t.getGeometryType()===X.TYPENAME_LINEARRING}static extract(){if(2===arguments.length){const t=arguments[0],e=arguments[1];return de.extract(t,e,new L)}if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];return t.getGeometryType()===e?n.add(t):t instanceof ct&&t.apply(new de(e,n)),n}}filter(t){(null===this._geometryType||de.isOfType(t,this._geometryType))&&this._comps.add(t)}get interfaces_(){return[Q]}}class _e{static map(){if(arguments[0]instanceof X&&I(arguments[1],pe)){const t=arguments[0],e=arguments[1],n=new L;for(let s=0;s<t.getNumGeometries();s++){const i=e.map(t.getGeometryN(s));null!==i&&n.add(i)}return t.getFactory().buildGeometry(n)}if(I(arguments[0],N)&&I(arguments[1],pe)){const t=arguments[0],e=arguments[1],n=new L;for(let s=t.iterator();s.hasNext();){const t=s.next(),i=e.map(t);null!==i&&n.add(i)}return n}}}function pe(){}_e.MapOp=pe;class me{constructor(){me.constructor_.apply(this,arguments)}static constructor_(){this._inputGeom=null,this._factory=null,this._pruneEmptyGeometry=!0,this._preserveGeometryCollectionType=!0,this._preserveCollections=!1,this._preserveType=!1}transformPoint(t,e){return this._factory.createPoint(this.transformCoordinates(t.getCoordinateSequence(),t))}transformPolygon(t,e){let n=!0;const s=this.transformLinearRing(t.getExteriorRing(),t);null!==s&&s instanceof ut&&!s.isEmpty()||(n=!1);const i=new L;for(let e=0;e<t.getNumInteriorRing();e++){const s=this.transformLinearRing(t.getInteriorRingN(e),t);null===s||s.isEmpty()||(s instanceof ut||(n=!1),i.add(s))}if(n)return this._factory.createPolygon(s,i.toArray([]));{const t=new L;return null!==s&&t.add(s),t.addAll(i),this._factory.buildGeometry(t)}}createCoordinateSequence(t){return this._factory.getCoordinateSequenceFactory().create(t)}getInputGeometry(){return this._inputGeom}transformMultiLineString(t,e){const n=new L;for(let e=0;e<t.getNumGeometries();e++){const s=this.transformLineString(t.getGeometryN(e),t);null!==s&&(s.isEmpty()||n.add(s))}return this._factory.buildGeometry(n)}transformCoordinates(t,e){return this.copy(t)}transformLineString(t,e){return this._factory.createLineString(this.transformCoordinates(t.getCoordinateSequence(),t))}transformMultiPoint(t,e){const n=new L;for(let e=0;e<t.getNumGeometries();e++){const s=this.transformPoint(t.getGeometryN(e),t);null!==s&&(s.isEmpty()||n.add(s))}return this._factory.buildGeometry(n)}transformMultiPolygon(t,e){const n=new L;for(let e=0;e<t.getNumGeometries();e++){const s=this.transformPolygon(t.getGeometryN(e),t);null!==s&&(s.isEmpty()||n.add(s))}return this._factory.buildGeometry(n)}copy(t){return t.copy()}transformGeometryCollection(t,e){const n=new L;for(let e=0;e<t.getNumGeometries();e++){const s=this.transform(t.getGeometryN(e));null!==s&&(this._pruneEmptyGeometry&&s.isEmpty()||n.add(s))}return this._preserveGeometryCollectionType?this._factory.createGeometryCollection(Ct.toGeometryArray(n)):this._factory.buildGeometry(n)}transform(t){if(this._inputGeom=t,this._factory=t.getFactory(),t instanceof tt)return this.transformPoint(t,null);if(t instanceof ht)return this.transformMultiPoint(t,null);if(t instanceof ut)return this.transformLinearRing(t,null);if(t instanceof J)return this.transformLineString(t,null);if(t instanceof wt)return this.transformMultiLineString(t,null);if(t instanceof it)return this.transformPolygon(t,null);if(t instanceof ft)return this.transformMultiPolygon(t,null);if(t instanceof ct)return this.transformGeometryCollection(t,null);throw new s("Unknown Geometry subtype: "+t.getGeometryType())}transformLinearRing(t,e){const n=this.transformCoordinates(t.getCoordinateSequence(),t);if(null===n)return this._factory.createLinearRing(null);const s=n.size();return s>0&&s<4&&!this._preserveType?this._factory.createLineString(n):this._factory.createLinearRing(n)}}class fe{constructor(){fe.constructor_.apply(this,arguments)}static constructor_(){this._comps=null;const t=arguments[0];this._comps=t}static getGeometry(t){return t.getFactory().buildGeometry(fe.getLines(t))}static getLines(){if(1===arguments.length){const t=arguments[0];return fe.getLines(t,new L)}if(2===arguments.length){const t=arguments[0],e=arguments[1];return t instanceof J?e.add(t):t instanceof ct&&t.apply(new fe(e)),e}}filter(t){t instanceof J&&this._comps.add(t)}get interfaces_(){return[Q]}}class ye{constructor(){ye.constructor_.apply(this,arguments)}static constructor_(){if(this._lines=null,this._isForcedToLineString=!1,1===arguments.length){const t=arguments[0];this._lines=t}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this._lines=t,this._isForcedToLineString=e}}static getGeometry(){if(1===arguments.length){const t=arguments[0];return t.getFactory().buildGeometry(ye.getLines(t))}if(2===arguments.length){const t=arguments[0],e=arguments[1];return t.getFactory().buildGeometry(ye.getLines(t,e))}}static getLines(){if(1===arguments.length){const t=arguments[0];return ye.getLines(t,!1)}if(2===arguments.length){if(I(arguments[0],N)&&I(arguments[1],N)){const t=arguments[1];for(let e=arguments[0].iterator();e.hasNext();){const n=e.next();ye.getLines(n,t)}return t}if(arguments[0]instanceof X&&"boolean"==typeof arguments[1]){const t=arguments[0],e=arguments[1],n=new L;return t.apply(new ye(n,e)),n}if(arguments[0]instanceof X&&I(arguments[1],N)){const t=arguments[0],e=arguments[1];return t instanceof J?e.add(t):t.apply(new ye(e)),e}}else if(3===arguments.length){if("boolean"==typeof arguments[2]&&I(arguments[0],N)&&I(arguments[1],N)){const t=arguments[1],e=arguments[2];for(let n=arguments[0].iterator();n.hasNext();){const s=n.next();ye.getLines(s,t,e)}return t}if("boolean"==typeof arguments[2]&&arguments[0]instanceof X&&I(arguments[1],N)){const t=arguments[1],e=arguments[2];return arguments[0].apply(new ye(t,e)),t}}}filter(t){if(this._isForcedToLineString&&t instanceof ut){const e=t.getFactory().createLineString(t.getCoordinateSequence());return this._lines.add(e),null}t instanceof J&&this._lines.add(t)}setForceToLineString(t){this._isForcedToLineString=t}get interfaces_(){return[k]}}const xe={reverseOrder:function(){return{compare:(t,e)=>e.compareTo(t)}},min:function(t){return xe.sort(t),t.get(0)},sort:function(t,e){const n=t.toArray();e?nt.sort(n,e):nt.sort(n);const s=t.iterator();for(let t=0,e=n.length;t<e;t++)s.next(),s.set(n[t])},singletonList:function(t){const e=new L;return e.add(t),e}};class Ee{constructor(){Ee.constructor_.apply(this,arguments)}static constructor_(){this._pts=null;const t=arguments[0];this._pts=t}static getPoints(){if(1===arguments.length){const t=arguments[0];return t instanceof tt?xe.singletonList(t):Ee.getPoints(t,new L)}if(2===arguments.length){const t=arguments[0],e=arguments[1];return t instanceof tt?e.add(t):t instanceof ct&&t.apply(new Ee(e)),e}}filter(t){t instanceof tt&&this._pts.add(t)}get interfaces_(){return[Q]}}class Ie{constructor(){Ie.constructor_.apply(this,arguments)}static constructor_(){this._comps=null;const t=arguments[0];this._comps=t}static getPolygons(){if(1===arguments.length){const t=arguments[0];return Ie.getPolygons(t,new L)}if(2===arguments.length){const t=arguments[0],e=arguments[1];return t instanceof it?e.add(t):t instanceof ct&&t.apply(new Ie(e)),e}}filter(t){t instanceof it&&this._comps.add(t)}get interfaces_(){return[Q]}}class Ne{constructor(){Ne.constructor_.apply(this,arguments)}static constructor_(){this._isDone=!1}applyTo(t){for(let e=0;e<t.getNumGeometries()&&!this._isDone;e++){const n=t.getGeometryN(e);if(n instanceof ct)this.applyTo(n);else if(this.visit(n),this.isDone())return this._isDone=!0,null}}}class Se{constructor(){Se.constructor_.apply(this,arguments)}static constructor_(){if(this._geomFact=null,this._precModel=null,this._dim=new we,this._nPts=100,this._rotationAngle=0,0===arguments.length)Se.constructor_.call(this,new Ct);else if(1===arguments.length){const t=arguments[0];this._geomFact=t,this._precModel=t.getPrecisionModel()}}createSupercircle(t){const e=1/t,n=this._dim.getMinSize()/2,s=this._dim.getCentre(),i=Math.pow(n,t),r=n,o=Math.pow(i/2,e),l=Math.trunc(this._nPts/8),a=new Array(8*l+1).fill(null),c=o/l;for(let n=0;n<=l;n++){let o=0,h=r;if(0!==n){o=c*n;const s=Math.pow(o,t);h=Math.pow(i-s,e)}a[n]=this.coordTrans(o,h,s),a[2*l-n]=this.coordTrans(h,o,s),a[2*l+n]=this.coordTrans(h,-o,s),a[4*l-n]=this.coordTrans(o,-h,s),a[4*l+n]=this.coordTrans(-o,-h,s),a[6*l-n]=this.coordTrans(-h,-o,s),a[6*l+n]=this.coordTrans(-h,o,s),a[8*l-n]=this.coordTrans(-o,h,s)}a[a.length-1]=new m(a[0]);const h=this._geomFact.createLinearRing(a),u=this._geomFact.createPolygon(h);return this.rotate(u)}setNumPoints(t){this._nPts=t}setBase(t){this._dim.setBase(t)}setRotation(t){this._rotationAngle=t}setWidth(t){this._dim.setWidth(t)}createEllipse(){const t=this._dim.getEnvelope(),e=t.getWidth()/2,n=t.getHeight()/2,s=t.getMinX()+e,i=t.getMinY()+n,r=new Array(this._nPts+1).fill(null);let o=0;for(let t=0;t<this._nPts;t++){const l=t*(2*Math.PI/this._nPts),a=e*Math.cos(l)+s,c=n*Math.sin(l)+i;r[o++]=this.coord(a,c)}r[o]=new m(r[0]);const l=this._geomFact.createLinearRing(r),a=this._geomFact.createPolygon(l);return this.rotate(a)}coordTrans(t,e,n){return this.coord(t+n.x,e+n.y)}createSquircle(){return this.createSupercircle(4)}setEnvelope(t){this._dim.setEnvelope(t)}setCentre(t){this._dim.setCentre(t)}createArc(t,e){const n=this._dim.getEnvelope(),s=n.getWidth()/2,i=n.getHeight()/2,r=n.getMinX()+s,o=n.getMinY()+i;let l=e;(l<=0||l>2*Math.PI)&&(l=2*Math.PI);const a=l/(this._nPts-1),c=new Array(this._nPts).fill(null);let h=0;for(let e=0;e<this._nPts;e++){const n=t+e*a,l=s*Math.cos(n)+r,u=i*Math.sin(n)+o;c[h++]=this.coord(l,u)}const u=this._geomFact.createLineString(c);return this.rotate(u)}rotate(t){if(0!==this._rotationAngle){const e=ie.rotationInstance(this._rotationAngle,this._dim.getCentre().x,this._dim.getCentre().y);t.apply(e)}return t}coord(t,e){const n=new m(t,e);return this._precModel.makePrecise(n),n}createArcPolygon(t,e){const n=this._dim.getEnvelope(),s=n.getWidth()/2,i=n.getHeight()/2,r=n.getMinX()+s,o=n.getMinY()+i;let l=e;(l<=0||l>2*Math.PI)&&(l=2*Math.PI);const a=l/(this._nPts-1),c=new Array(this._nPts+2).fill(null);let h=0;c[h++]=this.coord(r,o);for(let e=0;e<this._nPts;e++){const n=t+a*e,l=s*Math.cos(n)+r,u=i*Math.sin(n)+o;c[h++]=this.coord(l,u)}c[h++]=this.coord(r,o);const u=this._geomFact.createLinearRing(c),g=this._geomFact.createPolygon(u);return this.rotate(g)}createRectangle(){let t=null,e=0,n=Math.trunc(this._nPts/4);n<1&&(n=1);const s=this._dim.getEnvelope().getWidth()/n,i=this._dim.getEnvelope().getHeight()/n,r=new Array(4*n+1).fill(null),o=this._dim.getEnvelope();for(t=0;t<n;t++){const n=o.getMinX()+t*s,i=o.getMinY();r[e++]=this.coord(n,i)}for(t=0;t<n;t++){const n=o.getMaxX(),s=o.getMinY()+t*i;r[e++]=this.coord(n,s)}for(t=0;t<n;t++){const n=o.getMaxX()-t*s,i=o.getMaxY();r[e++]=this.coord(n,i)}for(t=0;t<n;t++){const n=o.getMinX(),s=o.getMaxY()-t*i;r[e++]=this.coord(n,s)}r[e++]=new m(r[0]);const l=this._geomFact.createLinearRing(r),a=this._geomFact.createPolygon(l);return this.rotate(a)}createCircle(){return this.createEllipse()}setHeight(t){this._dim.setHeight(t)}setSize(t){this._dim.setSize(t)}}class we{constructor(){we.constructor_.apply(this,arguments)}static constructor_(){this.base=null,this.centre=null,this.width=null,this.height=null}setBase(t){this.base=t}setWidth(t){this.width=t}getBase(){return this.base}getWidth(){return this.width}setEnvelope(t){this.width=t.getWidth(),this.height=t.getHeight(),this.base=new m(t.getMinX(),t.getMinY()),this.centre=new m(t.centre())}setCentre(t){this.centre=t}getMinSize(){return Math.min(this.width,this.height)}getEnvelope(){return null!==this.base?new O(this.base.x,this.base.x+this.width,this.base.y,this.base.y+this.height):null!==this.centre?new O(this.centre.x-this.width/2,this.centre.x+this.width/2,this.centre.y-this.height/2,this.centre.y+this.height/2):new O(0,this.width,0,this.height)}getCentre(){return null===this.centre&&(this.centre=new m(this.base.x+this.width/2,this.base.y+this.height/2)),this.centre}getHeight(){return this.height}setHeight(t){this.height=t}setSize(t){this.height=t,this.width=t}}Se.Dimensions=we;class Ce extends Se{constructor(){super(),Ce.constructor_.apply(this,arguments)}static constructor_(){if(this._numArms=8,this._armLengthRatio=.5,0===arguments.length)Se.constructor_.call(this);else if(1===arguments.length){const t=arguments[0];Se.constructor_.call(this,t)}}static create(t,e,n,s,i){const r=new Ce;r.setCentre(t),r.setSize(e),r.setNumPoints(n),r.setArmLengthRatio(i),r.setNumArms(s);return r.createSineStar()}setNumArms(t){this._numArms=t}setArmLengthRatio(t){this._armLengthRatio=t}createSineStar(){const t=this._dim.getEnvelope(),e=t.getWidth()/2;let n=this._armLengthRatio;n<0&&(n=0),n>1&&(n=1);const s=n*e,i=(1-n)*e,r=t.getMinX()+e,o=t.getMinY()+e,l=new Array(this._nPts+1).fill(null);let a=0;for(let t=0;t<this._nPts;t++){const e=t/this._nPts*this._numArms,n=e-Math.floor(e),c=2*Math.PI*n,h=i+s*((Math.cos(c)+1)/2),u=t*(2*Math.PI/this._nPts),g=h*Math.cos(u)+r,d=h*Math.sin(u)+o;l[a++]=this.coord(g,d)}l[a]=new m(l[0]);const c=this._geomFact.createLinearRing(l);return this._geomFact.createPolygon(c)}}var Le=Object.freeze({__proto__:null,AffineTransformation:ie,AffineTransformationBuilder:oe,AffineTransformationFactory:le,ComponentCoordinateExtracter:ae,GeometryCollectionMapper:ce,GeometryCombiner:he,GeometryEditor:ue,GeometryExtracter:de,GeometryMapper:_e,GeometryTransformer:me,LineStringExtracter:fe,LinearComponentExtracter:ye,PointExtracter:Ee,PolygonExtracter:Ie,ShortCircuitedGeometryVisitor:Ne,SineStarFactory:Ce}),Te=Object.freeze({__proto__:null,Coordinate:m,CoordinateXY:y,CoordinateXYM:x,CoordinateXYZM:E,CoordinateList:R,CoordinateSequenceFilter:P,Envelope:O,LineSegment:Kt,GeometryFactory:Ct,Geometry:X,Point:tt,LineString:J,LinearRing:ut,Polygon:it,GeometryCollection:ct,MultiPoint:ht,MultiLineString:wt,MultiPolygon:ft,Dimension:K,IntersectionMatrix:Jt,PrecisionModel:Nt,Location:Qt,Triangle:ne,util:Le});class Re{constructor(){Re.constructor_.apply(this,arguments)}static constructor_(){this._pt=[new m,new m],this._distance=r.NaN,this._isNull=!0}getCoordinates(){return this._pt}getCoordinate(t){return this._pt[t]}setMinimum(){if(1===arguments.length){const t=arguments[0];this.setMinimum(t._pt[0],t._pt[1])}else if(2===arguments.length){const t=arguments[0],e=arguments[1];if(this._isNull)return this.initialize(t,e),null;const n=t.distance(e);n<this._distance&&this.initialize(t,e,n)}}initialize(){if(0===arguments.length)this._isNull=!0;else if(2===arguments.length){const t=arguments[0],e=arguments[1];this._pt[0].setCoordinate(t),this._pt[1].setCoordinate(e),this._distance=t.distance(e),this._isNull=!1}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];this._pt[0].setCoordinate(t),this._pt[1].setCoordinate(e),this._distance=n,this._isNull=!1}}toString(){return Wt.toLineString(this._pt[0],this._pt[1])}getDistance(){return this._distance}setMaximum(){if(1===arguments.length){const t=arguments[0];this.setMaximum(t._pt[0],t._pt[1])}else if(2===arguments.length){const t=arguments[0],e=arguments[1];if(this._isNull)return this.initialize(t,e),null;const n=t.distance(e);n>this._distance&&this.initialize(t,e,n)}}}class Pe{static computeDistance(){if(arguments[2]instanceof Re&&arguments[0]instanceof J&&arguments[1]instanceof m){const t=arguments[0],e=arguments[1],n=arguments[2],s=new Kt,i=t.getCoordinates();for(let t=0;t<i.length-1;t++){s.setCoordinates(i[t],i[t+1]);const r=s.closestPoint(e);n.setMinimum(r,e)}}else if(arguments[2]instanceof Re&&arguments[0]instanceof it&&arguments[1]instanceof m){const t=arguments[0],e=arguments[1],n=arguments[2];Pe.computeDistance(t.getExteriorRing(),e,n);for(let s=0;s<t.getNumInteriorRing();s++)Pe.computeDistance(t.getInteriorRingN(s),e,n)}else if(arguments[2]instanceof Re&&arguments[0]instanceof X&&arguments[1]instanceof m){const t=arguments[0],e=arguments[1],n=arguments[2];if(t instanceof J)Pe.computeDistance(t,e,n);else if(t instanceof it)Pe.computeDistance(t,e,n);else if(t instanceof ct){const s=t;for(let t=0;t<s.getNumGeometries();t++){const i=s.getGeometryN(t);Pe.computeDistance(i,e,n)}}else n.setMinimum(t.getCoordinate(),e)}else if(arguments[2]instanceof Re&&arguments[0]instanceof Kt&&arguments[1]instanceof m){const t=arguments[1],e=arguments[2],n=arguments[0].closestPoint(t);e.setMinimum(n,t)}}}class Oe{constructor(){Oe.constructor_.apply(this,arguments)}static constructor_(){this._g0=null,this._g1=null,this._ptDist=new Re,this._densifyFrac=0;const t=arguments[0],e=arguments[1];this._g0=t,this._g1=e}static distance(){if(2===arguments.length){return new Oe(arguments[0],arguments[1]).distance()}if(3===arguments.length){const t=arguments[2],e=new Oe(arguments[0],arguments[1]);return e.setDensifyFraction(t),e.distance()}}getCoordinates(){return this._ptDist.getCoordinates()}setDensifyFraction(t){if(t>1||t<=0)throw new s("Fraction is not in range (0.0 - 1.0]");this._densifyFrac=t}compute(t,e){this.computeOrientedDistance(t,e,this._ptDist),this.computeOrientedDistance(e,t,this._ptDist)}distance(){return this.compute(this._g0,this._g1),this._ptDist.getDistance()}computeOrientedDistance(t,e,n){const s=new ve(e);if(t.apply(s),n.setMaximum(s.getMaxPointDistance()),this._densifyFrac>0){const s=new Me(e,this._densifyFrac);t.apply(s),n.setMaximum(s.getMaxPointDistance())}}orientedDistance(){return this.computeOrientedDistance(this._g0,this._g1,this._ptDist),this._ptDist.getDistance()}}class ve{constructor(){ve.constructor_.apply(this,arguments)}static constructor_(){this._maxPtDist=new Re,this._minPtDist=new Re,this._euclideanDist=new Pe,this._geom=null;const t=arguments[0];this._geom=t}filter(t){this._minPtDist.initialize(),Pe.computeDistance(this._geom,t,this._minPtDist),this._maxPtDist.setMaximum(this._minPtDist)}getMaxPointDistance(){return this._maxPtDist}get interfaces_(){return[U]}}class Me{constructor(){Me.constructor_.apply(this,arguments)}static constructor_(){this._maxPtDist=new Re,this._minPtDist=new Re,this._geom=null,this._numSubSegs=0;const t=arguments[0],e=arguments[1];this._geom=t,this._numSubSegs=Math.trunc(Math.round(1/e))}filter(t,e){if(0===e)return null;const n=t.getCoordinate(e-1),s=t.getCoordinate(e),i=(s.x-n.x)/this._numSubSegs,r=(s.y-n.y)/this._numSubSegs;for(let t=0;t<this._numSubSegs;t++){const e=n.x+t*i,s=n.y+t*r,o=new m(e,s);this._minPtDist.initialize(),Pe.computeDistance(this._geom,o,this._minPtDist),this._maxPtDist.setMaximum(this._minPtDist)}}isDone(){return!1}isGeometryChanged(){return!1}getMaxPointDistance(){return this._maxPtDist}get interfaces_(){return[P]}}Oe.MaxPointDistanceFilter=ve,Oe.MaxDensifiedByFractionDistanceFilter=Me;var be=Object.freeze({__proto__:null,DiscreteHausdorffDistance:Oe,DistanceToPoint:Pe,PointPairDistance:Re});class De{visitItem(t){}}class Ae{locate(t){}}class Fe{constructor(){Fe.constructor_.apply(this,arguments)}static constructor_(){this._min=r.POSITIVE_INFINITY,this._max=r.NEGATIVE_INFINITY}getMin(){return this._min}intersects(t,e){return!(this._min>e||this._max<t)}getMax(){return this._max}toString(){return Wt.toLineString(new m(this._min,0),new m(this._max,0))}}Fe.NodeComparator=class{compare(t,e){const n=t,s=e,i=(n._min+n._max)/2,r=(s._min+s._max)/2;return i<r?-1:i>r?1:0}get interfaces_(){return[a]}};class Ge extends Fe{constructor(){super(),Ge.constructor_.apply(this,arguments)}static constructor_(){this._item=null;const t=arguments[0],e=arguments[1],n=arguments[2];this._min=t,this._max=e,this._item=n}query(t,e,n){if(!this.intersects(t,e))return null;n.visitItem(this._item)}}class qe extends Fe{constructor(){super(),qe.constructor_.apply(this,arguments)}static constructor_(){this._node1=null,this._node2=null;const t=arguments[0],e=arguments[1];this._node1=t,this._node2=e,this.buildExtent(this._node1,this._node2)}buildExtent(t,e){this._min=Math.min(t._min,e._min),this._max=Math.max(t._max,e._max)}query(t,e,n){if(!this.intersects(t,e))return null;null!==this._node1&&this._node1.query(t,e,n),null!==this._node2&&this._node2.query(t,e,n)}}class Be{constructor(){Be.constructor_.apply(this,arguments)}static constructor_(){this._leaves=new L,this._root=null,this._level=0}buildTree(){xe.sort(this._leaves,new Fe.NodeComparator);let t=this._leaves,e=null,n=new L;for(;;){if(this.buildLevel(t,n),1===n.size())return n.get(0);e=t,t=n,n=e}}insert(t,e,n){if(null!==this._root)throw new IllegalStateException("Index cannot be added to once it has been queried");this._leaves.add(new Ge(t,e,n))}query(t,e,n){if(this.init(),null===this._root)return null;this._root.query(t,e,n)}buildRoot(){if(null!==this._root)return null;this._root=this.buildTree()}printNode(t){B.out.println(Wt.toLineString(new m(t._min,this._level),new m(t._max,this._level)))}init(){return null!==this._root||0===this._leaves.size()?null:void this.buildRoot()}buildLevel(t,e){this._level++,e.clear();for(let n=0;n<t.size();n+=2){const s=t.get(n);if(null===(n+1<t.size()?t.get(n):null))e.add(s);else{const s=new qe(t.get(n),t.get(n+1));e.add(s)}}}}class Ye{constructor(){Ye.constructor_.apply(this,arguments)}static constructor_(){this._items=new L}visitItem(t){this._items.add(t)}getItems(){return this._items}get interfaces_(){return[De]}}class Ve{constructor(){Ve.constructor_.apply(this,arguments)}static constructor_(){this._p=null,this._crossingCount=0,this._isPointOnSegment=!1;const t=arguments[0];this._p=t}static locatePointInRing(){if(arguments[0]instanceof m&&I(arguments[1],F)){const t=arguments[1],e=new Ve(arguments[0]),n=new m,s=new m;for(let i=1;i<t.size();i++)if(t.getCoordinate(i,n),t.getCoordinate(i-1,s),e.countSegment(n,s),e.isOnSegment())return e.getLocation();return e.getLocation()}if(arguments[0]instanceof m&&arguments[1]instanceof Array){const t=arguments[1],e=new Ve(arguments[0]);for(let n=1;n<t.length;n++){const s=t[n],i=t[n-1];if(e.countSegment(s,i),e.isOnSegment())return e.getLocation()}return e.getLocation()}}countSegment(t,e){if(t.x<this._p.x&&e.x<this._p.x)return null;if(this._p.x===e.x&&this._p.y===e.y)return this._isPointOnSegment=!0,null;if(t.y===this._p.y&&e.y===this._p.y){let n=t.x,s=e.x;return n>s&&(n=e.x,s=t.x),this._p.x>=n&&this._p.x<=s&&(this._isPointOnSegment=!0),null}if(t.y>this._p.y&&e.y<=this._p.y||e.y>this._p.y&&t.y<=this._p.y){let n=G.index(t,e,this._p);if(n===G.COLLINEAR)return this._isPointOnSegment=!0,null;e.y<t.y&&(n=-n),n===G.LEFT&&this._crossingCount++}}isPointInPolygon(){return this.getLocation()!==Qt.EXTERIOR}getLocation(){return this._isPointOnSegment?Qt.BOUNDARY:this._crossingCount%2==1?Qt.INTERIOR:Qt.EXTERIOR}isOnSegment(){return this._isPointOnSegment}}class ze{constructor(){ze.constructor_.apply(this,arguments)}static constructor_(){this._geom=null,this._index=null;const t=arguments[0];if(!(I(t,st)||t instanceof ut))throw new s("Argument must be Polygonal or LinearRing");this._geom=t}locate(t){null===this._index&&(this._index=new Xe(this._geom),this._geom=null);const e=new Ve(t),n=new ke(e);return this._index.query(t.y,t.y,n),e.getLocation()}get interfaces_(){return[Ae]}}class ke{constructor(){ke.constructor_.apply(this,arguments)}static constructor_(){this._counter=null;const t=arguments[0];this._counter=t}visitItem(t){const e=t;this._counter.countSegment(e.getCoordinate(0),e.getCoordinate(1))}get interfaces_(){return[De]}}class Xe{constructor(){Xe.constructor_.apply(this,arguments)}static constructor_(){this._isEmpty=!1,this._index=new Be;const t=arguments[0];t.isEmpty()?this._isEmpty=!0:this.init(t)}init(t){for(let e=ye.getLines(t).iterator();e.hasNext();){const t=e.next().getCoordinates();this.addLine(t)}}addLine(t){for(let e=1;e<t.length;e++){const n=new Kt(t[e-1],t[e]),s=Math.min(n.p0.y,n.p1.y),i=Math.max(n.p0.y,n.p1.y);this._index.insert(s,i,n)}}query(){if(2===arguments.length){const t=arguments[0],e=arguments[1];if(this._isEmpty)return new L;const n=new Ye;return this._index.query(t,e,n),n.getItems()}if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];if(this._isEmpty)return null;this._index.query(t,e,n)}}}ze.SegmentVisitor=ke,ze.IntervalIndexedGeometry=Xe;class Ue{static isOnLine(){if(arguments[0]instanceof m&&I(arguments[1],F)){const t=arguments[0],e=arguments[1],n=new jt,s=new m,i=new m,r=e.size();for(let o=1;o<r;o++)if(e.getCoordinate(o-1,s),e.getCoordinate(o,i),n.computeIntersection(t,s,i),n.hasIntersection())return!0;return!1}if(arguments[0]instanceof m&&arguments[1]instanceof Array){const t=arguments[0],e=arguments[1],n=new jt;for(let s=1;s<e.length;s++){const i=e[s-1],r=e[s];if(n.computeIntersection(t,i,r),n.hasIntersection())return!0}return!1}}static locateInRing(t,e){return Ve.locatePointInRing(t,e)}static isInRing(t,e){return Ue.locateInRing(t,e)!==Qt.EXTERIOR}}class He{hasNext(){}next(){}remove(){}}class We{constructor(){We.constructor_.apply(this,arguments)}static constructor_(){this._parent=null,this._atStart=null,this._max=null,this._index=null,this._subcollectionIterator=null;const t=arguments[0];this._parent=t,this._atStart=!0,this._index=0,this._max=t.getNumGeometries()}static isAtomic(t){return!(t instanceof ct)}next(){if(this._atStart)return this._atStart=!1,We.isAtomic(this._parent)&&this._index++,this._parent;if(null!==this._subcollectionIterator){if(this._subcollectionIterator.hasNext())return this._subcollectionIterator.next();this._subcollectionIterator=null}if(this._index>=this._max)throw new C;const t=this._parent.getGeometryN(this._index++);return t instanceof ct?(this._subcollectionIterator=new We(t),this._subcollectionIterator.next()):t}remove(){throw new j(this.getClass().getName())}hasNext(){if(this._atStart)return!0;if(null!==this._subcollectionIterator){if(this._subcollectionIterator.hasNext())return!0;this._subcollectionIterator=null}return!(this._index>=this._max)}get interfaces_(){return[He]}}class Ze{constructor(){Ze.constructor_.apply(this,arguments)}static constructor_(){this._geom=null;const t=arguments[0];this._geom=t}static locatePointInPolygon(t,e){if(e.isEmpty())return Qt.EXTERIOR;const n=e.getExteriorRing(),s=Ze.locatePointInRing(t,n);if(s!==Qt.INTERIOR)return s;for(let n=0;n<e.getNumInteriorRing();n++){const s=e.getInteriorRingN(n),i=Ze.locatePointInRing(t,s);if(i===Qt.BOUNDARY)return Qt.BOUNDARY;if(i===Qt.INTERIOR)return Qt.EXTERIOR}return Qt.INTERIOR}static locatePointInRing(t,e){return e.getEnvelopeInternal().intersects(t)?Ue.locateInRing(t,e.getCoordinates()):Qt.EXTERIOR}static containsPointInPolygon(t,e){return Qt.EXTERIOR!==Ze.locatePointInPolygon(t,e)}static locateInGeometry(t,e){if(e instanceof it)return Ze.locatePointInPolygon(t,e);if(e instanceof ct){const n=new We(e);for(;n.hasNext();){const s=n.next();if(s!==e){const e=Ze.locateInGeometry(t,s);if(e!==Qt.EXTERIOR)return e}}}return Qt.EXTERIOR}static isContained(t,e){return Qt.EXTERIOR!==Ze.locate(t,e)}static locate(t,e){return e.isEmpty()?Qt.EXTERIOR:e.getEnvelopeInternal().intersects(t)?Ze.locateInGeometry(t,e):Qt.EXTERIOR}locate(t){return Ze.locate(t,this._geom)}get interfaces_(){return[Ae]}}var je=Object.freeze({__proto__:null,IndexedPointInAreaLocator:ze,PointOnGeometryLocator:Ae,SimplePointInAreaLocator:Ze});class Ke{measure(t,e){}}class Qe{static diagonalSize(t){if(t.isNull())return 0;const e=t.getWidth(),n=t.getHeight();return Math.sqrt(e*e+n*n)}measure(t,e){const n=Oe.distance(t,e,Qe.DENSIFY_FRACTION),s=new O(t.getEnvelopeInternal());s.expandToInclude(e.getEnvelopeInternal());return 1-n/Qe.diagonalSize(s)}get interfaces_(){return[Ke]}}Qe.DENSIFY_FRACTION=.25;var Je=Object.freeze({__proto__:null,AreaSimilarityMeasure:class{measure(t,e){return t.intersection(e).getArea()/t.union(e).getArea()}get interfaces_(){return[Ke]}},HausdorffSimilarityMeasure:Qe,SimilarityMeasure:Ke,SimilarityMeasureCombiner:class{static combine(t,e){return Math.min(t,e)}}});class $e{constructor(){$e.constructor_.apply(this,arguments)}static constructor_(){this._areaBasePt=null,this._triangleCent3=new m,this._areasum2=0,this._cg3=new m,this._lineCentSum=new m,this._totalLength=0,this._ptCount=0,this._ptCentSum=new m;const t=arguments[0];this._areaBasePt=null,this.add(t)}static area2(t,e,n){return(e.x-t.x)*(n.y-t.y)-(n.x-t.x)*(e.y-t.y)}static centroid3(t,e,n,s){return s.x=t.x+e.x+n.x,s.y=t.y+e.y+n.y,null}static getCentroid(t){return new $e(t).getCentroid()}setAreaBasePoint(t){this._areaBasePt=t}addPoint(t){this._ptCount+=1,this._ptCentSum.x+=t.x,this._ptCentSum.y+=t.y}addLineSegments(t){let e=0;for(let n=0;n<t.length-1;n++){const s=t[n].distance(t[n+1]);if(0===s)continue;e+=s;const i=(t[n].x+t[n+1].x)/2;this._lineCentSum.x+=s*i;const r=(t[n].y+t[n+1].y)/2;this._lineCentSum.y+=s*r}this._totalLength+=e,0===e&&t.length>0&&this.addPoint(t[0])}addHole(t){const e=G.isCCW(t);for(let n=0;n<t.length-1;n++)this.addTriangle(this._areaBasePt,t[n],t[n+1],e);this.addLineSegments(t)}getCentroid(){const t=new m;if(Math.abs(this._areasum2)>0)t.x=this._cg3.x/3/this._areasum2,t.y=this._cg3.y/3/this._areasum2;else if(this._totalLength>0)t.x=this._lineCentSum.x/this._totalLength,t.y=this._lineCentSum.y/this._totalLength;else{if(!(this._ptCount>0))return null;t.x=this._ptCentSum.x/this._ptCount,t.y=this._ptCentSum.y/this._ptCount}return t}addShell(t){t.length>0&&this.setAreaBasePoint(t[0]);const e=!G.isCCW(t);for(let n=0;n<t.length-1;n++)this.addTriangle(this._areaBasePt,t[n],t[n+1],e);this.addLineSegments(t)}addTriangle(t,e,n,s){const i=s?1:-1;$e.centroid3(t,e,n,this._triangleCent3);const r=$e.area2(t,e,n);this._cg3.x+=i*r*this._triangleCent3.x,this._cg3.y+=i*r*this._triangleCent3.y,this._areasum2+=i*r}add(){if(arguments[0]instanceof it){const t=arguments[0];this.addShell(t.getExteriorRing().getCoordinates());for(let e=0;e<t.getNumInteriorRing();e++)this.addHole(t.getInteriorRingN(e).getCoordinates())}else if(arguments[0]instanceof X){const t=arguments[0];if(t.isEmpty())return null;if(t instanceof tt)this.addPoint(t.getCoordinate());else if(t instanceof J)this.addLineSegments(t.getCoordinates());else if(t instanceof it){const e=t;this.add(e)}else if(t instanceof ct){const e=t;for(let t=0;t<e.getNumGeometries();t++)this.add(e.getGeometryN(t))}}}}class tn extends n{constructor(t){super(t),this.name=Object.keys({EmptyStackException:tn})[0]}}class en extends w{constructor(){super(),this.array=[]}add(t){return this.array.push(t),!0}get(t){if(t<0||t>=this.size())throw new S;return this.array[t]}push(t){return this.array.push(t),t}pop(){if(0===this.array.length)throw new tn;return this.array.pop()}peek(){if(0===this.array.length)throw new tn;return this.array[this.array.length-1]}empty(){return 0===this.array.length}isEmpty(){return this.empty()}search(t){return this.array.indexOf(t)}size(){return this.array.length}toArray(){return this.array.slice()}}class nn{constructor(){nn.constructor_.apply(this,arguments)}static constructor_(){this._coordSet=new xt,this._list=new L}static filterCoordinates(t){const e=new nn;for(let n=0;n<t.length;n++)e.filter(t[n]);return e.getCoordinates()}filter(t){this._coordSet.add(t)&&this._list.add(t)}getCoordinates(){const t=new Array(this._list.size()).fill(null);return this._list.toArray(t)}get interfaces_(){return[U]}}class sn{constructor(){sn.constructor_.apply(this,arguments)}static constructor_(){if(this._geomFactory=null,this._inputPts=null,1===arguments.length){const t=arguments[0];sn.constructor_.call(this,sn.extractCoordinates(t),t.getFactory())}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this._inputPts=nn.filterCoordinates(t),this._geomFactory=e}}static extractCoordinates(t){const e=new nn;return t.apply(e),e.getCoordinates()}preSort(t){let e=null;for(let n=1;n<t.length;n++)(t[n].y<t[0].y||t[n].y===t[0].y&&t[n].x<t[0].x)&&(e=t[0],t[0]=t[n],t[n]=e);return nt.sort(t,1,t.length,new rn(t[0])),t}computeOctRing(t){const e=this.computeOctPts(t),n=new R;return n.add(e,!1),n.size()<3?null:(n.closeRing(),n.toCoordinateArray())}lineOrPolygon(t){if(3===(t=this.cleanRing(t)).length)return this._geomFactory.createLineString([t[0],t[1]]);const e=this._geomFactory.createLinearRing(t);return this._geomFactory.createPolygon(e)}cleanRing(t){g.equals(t[0],t[t.length-1]);const e=new L;let n=null;for(let s=0;s<=t.length-2;s++){const i=t[s],r=t[s+1];i.equals(r)||(null!==n&&this.isBetween(n,i,r)||(e.add(i),n=i))}e.add(t[t.length-1]);const s=new Array(e.size()).fill(null);return e.toArray(s)}isBetween(t,e,n){if(0!==G.index(t,e,n))return!1;if(t.x!==n.x){if(t.x<=e.x&&e.x<=n.x)return!0;if(n.x<=e.x&&e.x<=t.x)return!0}if(t.y!==n.y){if(t.y<=e.y&&e.y<=n.y)return!0;if(n.y<=e.y&&e.y<=t.y)return!0}return!1}reduce(t){const e=this.computeOctRing(t);if(null===e)return t;const n=new lt;for(let t=0;t<e.length;t++)n.add(e[t]);for(let s=0;s<t.length;s++)Ue.isInRing(t[s],e)||n.add(t[s]);const s=dt.toCoordinateArray(n);return s.length<3?this.padArray3(s):s}getConvexHull(){if(0===this._inputPts.length)return this._geomFactory.createGeometryCollection();if(1===this._inputPts.length)return this._geomFactory.createPoint(this._inputPts[0]);if(2===this._inputPts.length)return this._geomFactory.createLineString(this._inputPts);let t=this._inputPts;this._inputPts.length>50&&(t=this.reduce(this._inputPts));const e=this.preSort(t),n=this.grahamScan(e),s=this.toCoordinateArray(n);return this.lineOrPolygon(s)}padArray3(t){const e=new Array(3).fill(null);for(let n=0;n<e.length;n++)n<t.length?e[n]=t[n]:e[n]=t[0];return e}computeOctPts(t){const e=new Array(8).fill(null);for(let n=0;n<e.length;n++)e[n]=t[0];for(let n=1;n<t.length;n++)t[n].x<e[0].x&&(e[0]=t[n]),t[n].x-t[n].y<e[1].x-e[1].y&&(e[1]=t[n]),t[n].y>e[2].y&&(e[2]=t[n]),t[n].x+t[n].y>e[3].x+e[3].y&&(e[3]=t[n]),t[n].x>e[4].x&&(e[4]=t[n]),t[n].x-t[n].y>e[5].x-e[5].y&&(e[5]=t[n]),t[n].y<e[6].y&&(e[6]=t[n]),t[n].x+t[n].y<e[7].x+e[7].y&&(e[7]=t[n]);return e}toCoordinateArray(t){const e=new Array(t.size()).fill(null);for(let n=0;n<t.size();n++){const s=t.get(n);e[n]=s}return e}grahamScan(t){let e=null;const n=new en;n.push(t[0]),n.push(t[1]),n.push(t[2]);for(let s=3;s<t.length;s++){for(e=n.pop();!n.empty()&&G.index(n.peek(),e,t[s])>0;)e=n.pop();n.push(e),n.push(t[s])}return n.push(t[0]),n}}class rn{constructor(){rn.constructor_.apply(this,arguments)}static constructor_(){this._origin=null;const t=arguments[0];this._origin=t}static polarCompare(t,e,n){const s=e.x-t.x,i=e.y-t.y,r=n.x-t.x,o=n.y-t.y,l=G.index(t,e,n);if(l===G.COUNTERCLOCKWISE)return 1;if(l===G.CLOCKWISE)return-1;const a=s*s+i*i,c=r*r+o*o;return a<c?-1:a>c?1:0}compare(t,e){const n=t,s=e;return rn.polarCompare(this._origin,n,s)}get interfaces_(){return[a]}}sn.RadialComparator=rn;class on{constructor(){on.constructor_.apply(this,arguments)}static constructor_(){this._interiorPoint=null,this._maxWidth=-1;const t=arguments[0];this.process(t)}static getInteriorPoint(t){return new on(t).getInteriorPoint()}static avg(t,e){return(t+e)/2}getInteriorPoint(){return this._interiorPoint}process(t){if(t.isEmpty())return null;if(t instanceof it)this.processPolygon(t);else if(t instanceof ct){const e=t;for(let t=0;t<e.getNumGeometries();t++)this.process(e.getGeometryN(t))}}processPolygon(t){const e=new ln(t);e.process();const n=e.getWidth();n>this._maxWidth&&(this._maxWidth=n,this._interiorPoint=e.getInteriorPoint())}}class ln{constructor(){ln.constructor_.apply(this,arguments)}static constructor_(){this._polygon=null,this._interiorPointY=null,this._interiorSectionWidth=0,this._interiorPoint=null;const t=arguments[0];this._polygon=t,this._interiorPointY=cn.getScanLineY(t)}static isEdgeCrossingCounted(t,e,n){const s=t.getY(),i=e.getY();return s!==i&&(!(s===n&&i<n)&&!(i===n&&s<n))}static intersectsHorizontalLine(){if(2===arguments.length){const t=arguments[0],e=arguments[1];return!(e<t.getMinY())&&!(e>t.getMaxY())}if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];return!(t.getY()>n&&e.getY()>n)&&!(t.getY()<n&&e.getY()<n)}}static intersection(t,e,n){const s=t.getX(),i=e.getX();if(s===i)return s;const r=i-s,o=(e.getY()-t.getY())/r;return s+(n-t.getY())/o}findBestMidpoint(t){if(0===t.size())return null;g.isTrue(0==t.size()%2,"Interior Point robustness failure: odd number of scanline crossings"),t.sort(new an);for(let e=0;e<t.size();e+=2){const n=t.get(e),s=t.get(e+1),i=s-n;if(i>this._interiorSectionWidth){this._interiorSectionWidth=i;const t=on.avg(n,s);this._interiorPoint=new m(t,this._interiorPointY)}}}process(){if(this._polygon.isEmpty())return null;this._interiorPoint=new m(this._polygon.getCoordinate());const t=new L;this.scanRing(this._polygon.getExteriorRing(),t);for(let e=0;e<this._polygon.getNumInteriorRing();e++)this.scanRing(this._polygon.getInteriorRingN(e),t);this.findBestMidpoint(t)}scanRing(t,e){if(!ln.intersectsHorizontalLine(t.getEnvelopeInternal(),this._interiorPointY))return null;const n=t.getCoordinateSequence();for(let t=1;t<n.size();t++){const s=n.getCoordinate(t-1),i=n.getCoordinate(t);this.addEdgeCrossing(s,i,this._interiorPointY,e)}}getWidth(){return this._interiorSectionWidth}getInteriorPoint(){return this._interiorPoint}addEdgeCrossing(t,e,n,s){if(!ln.intersectsHorizontalLine(t,e,n))return null;if(!ln.isEdgeCrossingCounted(t,e,n))return null;const i=ln.intersection(t,e,n);s.add(i)}}class an{compare(t,e){return t<e?-1:t>e?1:0}get interfaces_(){return[a]}}ln.DoubleComparator=an;class cn{constructor(){cn.constructor_.apply(this,arguments)}static constructor_(){this._poly=null,this._centreY=null,this._hiY=r.MAX_VALUE,this._loY=-r.MAX_VALUE;const t=arguments[0];this._poly=t,this._hiY=t.getEnvelopeInternal().getMaxY(),this._loY=t.getEnvelopeInternal().getMinY(),this._centreY=on.avg(this._loY,this._hiY)}static getScanLineY(t){return new cn(t).getScanLineY()}updateInterval(t){t<=this._centreY?t>this._loY&&(this._loY=t):t>this._centreY&&t<this._hiY&&(this._hiY=t)}getScanLineY(){this.process(this._poly.getExteriorRing());for(let t=0;t<this._poly.getNumInteriorRing();t++)this.process(this._poly.getInteriorRingN(t));return on.avg(this._hiY,this._loY)}process(t){const e=t.getCoordinateSequence();for(let t=0;t<e.size();t++){const n=e.getY(t);this.updateInterval(n)}}}on.InteriorPointPolygon=ln,on.ScanLineYOrdinateFinder=cn;class hn{constructor(){hn.constructor_.apply(this,arguments)}static constructor_(){this._centroid=null,this._minDistance=r.MAX_VALUE,this._interiorPoint=null;const t=arguments[0];t.isEmpty()?this._centroid=null:(this._centroid=$e.getCentroid(t),t.getPrecisionModel().makePrecise(this._centroid)),this.addInterior(t),null===this._interiorPoint&&this.addEndpoints(t)}static getInteriorPoint(t){return new hn(t).getInteriorPoint()}addEndpoints(){if(arguments[0]instanceof X){const t=arguments[0];if(t instanceof J)this.addEndpoints(t.getCoordinates());else if(t instanceof ct){const e=t;for(let t=0;t<e.getNumGeometries();t++)this.addEndpoints(e.getGeometryN(t))}}else if(arguments[0]instanceof Array){const t=arguments[0];this.add(t[0]),this.add(t[t.length-1])}}getInteriorPoint(){return this._interiorPoint}addInterior(){if(arguments[0]instanceof X){const t=arguments[0];if(t instanceof J)this.addInterior(t.getCoordinates());else if(t instanceof ct){const e=t;for(let t=0;t<e.getNumGeometries();t++)this.addInterior(e.getGeometryN(t))}}else if(arguments[0]instanceof Array){const t=arguments[0];for(let e=1;e<t.length-1;e++)this.add(t[e])}}add(t){const e=t.distance(this._centroid);e<this._minDistance&&(this._interiorPoint=new m(t),this._minDistance=e)}}class un{constructor(){un.constructor_.apply(this,arguments)}static constructor_(){this._centroid=null,this._minDistance=r.MAX_VALUE,this._interiorPoint=null;const t=arguments[0];this._centroid=$e.getCentroid(t),this.add(t)}static getInteriorPoint(t){return new un(t).getInteriorPoint()}getInteriorPoint(){return this._interiorPoint}add(){if(arguments[0]instanceof X){const t=arguments[0];if(t instanceof tt)this.add(t.getCoordinate());else if(t instanceof ct){const e=t;for(let t=0;t<e.getNumGeometries();t++)this.add(e.getGeometryN(t))}}else if(arguments[0]instanceof m){const t=arguments[0],e=t.distance(this._centroid);e<this._minDistance&&(this._interiorPoint=new m(t),this._minDistance=e)}}}class gn{isInBoundary(t){}}class dn{isInBoundary(t){return t%2==1}get interfaces_(){return[gn]}}class _n{isInBoundary(t){return t>0}get interfaces_(){return[gn]}}class pn{isInBoundary(t){return t>1}get interfaces_(){return[gn]}}class mn{isInBoundary(t){return 1===t}get interfaces_(){return[gn]}}gn.Mod2BoundaryNodeRule=dn,gn.EndPointBoundaryNodeRule=_n,gn.MultiValentEndPointBoundaryNodeRule=pn,gn.MonoValentEndPointBoundaryNodeRule=mn,gn.MOD2_BOUNDARY_RULE=new dn,gn.ENDPOINT_BOUNDARY_RULE=new _n,gn.MULTIVALENT_ENDPOINT_BOUNDARY_RULE=new pn,gn.MONOVALENT_ENDPOINT_BOUNDARY_RULE=new mn,gn.OGC_SFS_BOUNDARY_RULE=gn.MOD2_BOUNDARY_RULE;class fn{constructor(){fn.constructor_.apply(this,arguments)}static constructor_(){if(this._boundaryRule=gn.OGC_SFS_BOUNDARY_RULE,this._isIn=null,this._numBoundaries=null,0===arguments.length);else if(1===arguments.length){const t=arguments[0];if(null===t)throw new s("Rule must be non-null");this._boundaryRule=t}}locateInPolygonRing(t,e){return e.getEnvelopeInternal().intersects(t)?Ue.locateInRing(t,e.getCoordinates()):Qt.EXTERIOR}intersects(t,e){return this.locate(t,e)!==Qt.EXTERIOR}updateLocationInfo(t){t===Qt.INTERIOR&&(this._isIn=!0),t===Qt.BOUNDARY&&this._numBoundaries++}computeLocation(t,e){if(e instanceof tt&&this.updateLocationInfo(this.locateOnPoint(t,e)),e instanceof J)this.updateLocationInfo(this.locateOnLineString(t,e));else if(e instanceof it)this.updateLocationInfo(this.locateInPolygon(t,e));else if(e instanceof wt){const n=e;for(let e=0;e<n.getNumGeometries();e++){const s=n.getGeometryN(e);this.updateLocationInfo(this.locateOnLineString(t,s))}}else if(e instanceof ft){const n=e;for(let e=0;e<n.getNumGeometries();e++){const s=n.getGeometryN(e);this.updateLocationInfo(this.locateInPolygon(t,s))}}else if(e instanceof ct){const n=new We(e);for(;n.hasNext();){const s=n.next();s!==e&&this.computeLocation(t,s)}}}locateOnPoint(t,e){return e.getCoordinate().equals2D(t)?Qt.INTERIOR:Qt.EXTERIOR}locateOnLineString(t,e){if(!e.getEnvelopeInternal().intersects(t))return Qt.EXTERIOR;const n=e.getCoordinateSequence();return e.isClosed()||!t.equals(n.getCoordinate(0))&&!t.equals(n.getCoordinate(n.size()-1))?Ue.isOnLine(t,n)?Qt.INTERIOR:Qt.EXTERIOR:Qt.BOUNDARY}locateInPolygon(t,e){if(e.isEmpty())return Qt.EXTERIOR;const n=e.getExteriorRing(),s=this.locateInPolygonRing(t,n);if(s===Qt.EXTERIOR)return Qt.EXTERIOR;if(s===Qt.BOUNDARY)return Qt.BOUNDARY;for(let n=0;n<e.getNumInteriorRing();n++){const s=e.getInteriorRingN(n),i=this.locateInPolygonRing(t,s);if(i===Qt.INTERIOR)return Qt.EXTERIOR;if(i===Qt.BOUNDARY)return Qt.BOUNDARY}return Qt.INTERIOR}locate(t,e){return e.isEmpty()?Qt.EXTERIOR:e instanceof J?this.locateOnLineString(t,e):e instanceof it?this.locateInPolygon(t,e):(this._isIn=!1,this._numBoundaries=0,this.computeLocation(t,e),this._boundaryRule.isInBoundary(this._numBoundaries)?Qt.BOUNDARY:this._numBoundaries>0||this._isIn?Qt.INTERIOR:Qt.EXTERIOR)}}class yn{constructor(){yn.constructor_.apply(this,arguments)}static constructor_(){this._input=null,this._extremalPts=null,this._centre=null,this._radius=0;const t=arguments[0];this._input=t}static farthestPoints(t){const e=t[0].distance(t[1]),n=t[1].distance(t[2]),s=t[2].distance(t[0]);return e>=n&&e>=s?[t[0],t[1]]:n>=e&&n>=s?[t[1],t[2]]:[t[2],t[0]]}static pointWitMinAngleWithX(t,e){let n=r.MAX_VALUE,s=null;for(let i=0;i<t.length;i++){const r=t[i];if(r===e)continue;const o=r.x-e.x;let l=r.y-e.y;l<0&&(l=-l);const a=l/Math.sqrt(o*o+l*l);a<n&&(n=a,s=r)}return s}static lowestPoint(t){let e=t[0];for(let n=1;n<t.length;n++)t[n].y<e.y&&(e=t[n]);return e}static pointWithMinAngleWithSegment(t,e,n){let s=r.MAX_VALUE,i=null;for(let r=0;r<t.length;r++){const o=t[r];if(o===e)continue;if(o===n)continue;const l=$t.angleBetween(e,o,n);l<s&&(s=l,i=o)}return i}getRadius(){return this.compute(),this._radius}getDiameter(){switch(this.compute(),this._extremalPts.length){case 0:return this._input.getFactory().createLineString();case 1:return this._input.getFactory().createPoint(this._centre)}const t=this._extremalPts[0],e=this._extremalPts[1];return this._input.getFactory().createLineString([t,e])}getExtremalPoints(){return this.compute(),this._extremalPts}computeCirclePoints(){if(this._input.isEmpty())return this._extremalPts=new Array(0).fill(null),null;if(1===this._input.getNumPoints()){const t=this._input.getCoordinates();return this._extremalPts=[new m(t[0])],null}const t=this._input.convexHull().getCoordinates();let e=t;if(t[0].equals2D(t[t.length-1])&&(e=new Array(t.length-1).fill(null),dt.copyDeep(t,0,e,0,t.length-1)),e.length<=2)return this._extremalPts=dt.copyDeep(e),null;let n=yn.lowestPoint(e),s=yn.pointWitMinAngleWithX(e,n);for(let t=0;t<e.length;t++){const t=yn.pointWithMinAngleWithSegment(e,n,s);if($t.isObtuse(n,t,s))return this._extremalPts=[new m(n),new m(s)],null;if($t.isObtuse(t,n,s))n=t;else{if(!$t.isObtuse(t,s,n))return this._extremalPts=[new m(n),new m(s),new m(t)],null;s=t}}g.shouldNeverReachHere("Logic failure in Minimum Bounding Circle algorithm!")}compute(){if(null!==this._extremalPts)return null;this.computeCirclePoints(),this.computeCentre(),null!==this._centre&&(this._radius=this._centre.distance(this._extremalPts[0]))}getCircle(){if(this.compute(),null===this._centre)return this._input.getFactory().createPolygon();const t=this._input.getFactory().createPoint(this._centre);return 0===this._radius?t:t.buffer(this._radius)}getCentre(){return this.compute(),this._centre}getMaximumDiameter(){switch(this.compute(),this._extremalPts.length){case 0:return this._input.getFactory().createLineString();case 1:return this._input.getFactory().createPoint(this._centre);case 2:return this._input.getFactory().createLineString([this._extremalPts[0],this._extremalPts[1]]);default:const t=yn.farthestPoints(this._extremalPts);return this._input.getFactory().createLineString(t)}}computeCentre(){switch(this._extremalPts.length){case 0:this._centre=null;break;case 1:this._centre=this._extremalPts[0];break;case 2:this._centre=new m((this._extremalPts[0].x+this._extremalPts[1].x)/2,(this._extremalPts[0].y+this._extremalPts[1].y)/2);break;case 3:this._centre=ne.circumcentre(this._extremalPts[0],this._extremalPts[1],this._extremalPts[2])}}}class xn{constructor(){xn.constructor_.apply(this,arguments)}static constructor_(){if(this._inputGeom=null,this._isConvex=null,this._convexHullPts=null,this._minBaseSeg=new Kt,this._minWidthPt=null,this._minPtIndex=null,this._minWidth=0,1===arguments.length){const t=arguments[0];xn.constructor_.call(this,t,!1)}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this._inputGeom=t,this._isConvex=e}}static nextIndex(t,e){return++e>=t.length&&(e=0),e}static computeC(t,e,n){return t*n.y-e*n.x}static getMinimumDiameter(t){return new xn(t).getDiameter()}static getMinimumRectangle(t){return new xn(t).getMinimumRectangle()}static computeSegmentForLine(t,e,n){let s=null,i=null;return Math.abs(e)>Math.abs(t)?(s=new m(0,n/e),i=new m(1,n/e-t/e)):(s=new m(n/t,0),i=new m(n/t-e/t,1)),new Kt(s,i)}getWidthCoordinate(){return this.computeMinimumDiameter(),this._minWidthPt}getSupportingSegment(){return this.computeMinimumDiameter(),this._inputGeom.getFactory().createLineString([this._minBaseSeg.p0,this._minBaseSeg.p1])}getDiameter(){if(this.computeMinimumDiameter(),null===this._minWidthPt)return this._inputGeom.getFactory().createLineString();const t=this._minBaseSeg.project(this._minWidthPt);return this._inputGeom.getFactory().createLineString([t,this._minWidthPt])}computeWidthConvex(t){this._convexHullPts=t instanceof it?t.getExteriorRing().getCoordinates():t.getCoordinates(),0===this._convexHullPts.length?(this._minWidth=0,this._minWidthPt=null,this._minBaseSeg=null):1===this._convexHullPts.length?(this._minWidth=0,this._minWidthPt=this._convexHullPts[0],this._minBaseSeg.p0=this._convexHullPts[0],this._minBaseSeg.p1=this._convexHullPts[0]):2===this._convexHullPts.length||3===this._convexHullPts.length?(this._minWidth=0,this._minWidthPt=this._convexHullPts[0],this._minBaseSeg.p0=this._convexHullPts[0],this._minBaseSeg.p1=this._convexHullPts[1]):this.computeConvexRingMinDiameter(this._convexHullPts)}computeConvexRingMinDiameter(t){this._minWidth=r.MAX_VALUE;let e=1;const n=new Kt;for(let s=0;s<t.length-1;s++)n.p0=t[s],n.p1=t[s+1],e=this.findMaxPerpDistance(t,n,e)}computeMinimumDiameter(){if(null!==this._minWidthPt)return null;if(this._isConvex)this.computeWidthConvex(this._inputGeom);else{const t=new sn(this._inputGeom).getConvexHull();this.computeWidthConvex(t)}}getLength(){return this.computeMinimumDiameter(),this._minWidth}findMaxPerpDistance(t,e,n){let s=e.distancePerpendicular(t[n]),i=s,r=n,o=r;for(;i>=s;)s=i,r=o,o=xn.nextIndex(t,r),i=e.distancePerpendicular(t[o]);return s<this._minWidth&&(this._minPtIndex=r,this._minWidth=s,this._minWidthPt=t[this._minPtIndex],this._minBaseSeg=new Kt(e)),r}getMinimumRectangle(){if(this.computeMinimumDiameter(),0===this._minWidth)return this._minBaseSeg.p0.equals2D(this._minBaseSeg.p1)?this._inputGeom.getFactory().createPoint(this._minBaseSeg.p0):this._minBaseSeg.toGeometry(this._inputGeom.getFactory());const t=this._minBaseSeg.p1.x-this._minBaseSeg.p0.x,e=this._minBaseSeg.p1.y-this._minBaseSeg.p0.y;let n=r.MAX_VALUE,s=-r.MAX_VALUE,i=r.MAX_VALUE,o=-r.MAX_VALUE;for(let r=0;r<this._convexHullPts.length;r++){const l=xn.computeC(t,e,this._convexHullPts[r]);l>s&&(s=l),l<n&&(n=l);const a=xn.computeC(-e,t,this._convexHullPts[r]);a>o&&(o=a),a<i&&(i=a)}const l=xn.computeSegmentForLine(-t,-e,o),a=xn.computeSegmentForLine(-t,-e,i),c=xn.computeSegmentForLine(-e,t,s),h=xn.computeSegmentForLine(-e,t,n),u=c.lineIntersection(l),g=h.lineIntersection(l),d=h.lineIntersection(a),_=c.lineIntersection(a),p=this._inputGeom.getFactory().createLinearRing([u,g,d,_,u]);return this._inputGeom.getFactory().createPolygon(p)}}var En=Object.freeze({__proto__:null,distance:be,locate:je,match:Je,Angle:$t,Area:et,Centroid:$e,ConvexHull:sn,Distance:V,InteriorPointArea:on,InteriorPointLine:hn,InteriorPointPoint:un,Length:H,Orientation:G,PointLocation:Ue,PointLocator:fn,RobustLineIntersector:jt,MinimumBoundingCircle:yn,MinimumDiameter:xn});class In{constructor(){In.constructor_.apply(this,arguments)}static constructor_(){this._inputGeom=null,this._distanceTolerance=null;const t=arguments[0];this._inputGeom=t}static densifyPoints(t,e,n){const s=new Kt,i=new R;for(let r=0;r<t.length-1;r++){s.p0=t[r],s.p1=t[r+1],i.add(s.p0,!1);const o=s.getLength(),l=Math.trunc(o/e)+1;if(l>1){const t=o/l;for(let e=1;e<l;e++){const r=e*t/o,l=s.pointAlong(r);n.makePrecise(l),i.add(l,!1)}}}return i.add(t[t.length-1],!1),i.toCoordinateArray()}static densify(t,e){const n=new In(t);return n.setDistanceTolerance(e),n.getResultGeometry()}getResultGeometry(){return new Nn(this._distanceTolerance).transform(this._inputGeom)}setDistanceTolerance(t){if(t<=0)throw new s("Tolerance must be positive");this._distanceTolerance=t}}class Nn extends me{constructor(){super(),Nn.constructor_.apply(this,arguments)}static constructor_(){this.distanceTolerance=null;const t=arguments[0];this.distanceTolerance=t}transformMultiPolygon(t,e){const n=super.transformMultiPolygon.call(this,t,e);return this.createValidArea(n)}transformPolygon(t,e){const n=super.transformPolygon.call(this,t,e);return e instanceof ft?n:this.createValidArea(n)}transformCoordinates(t,e){const n=t.toCoordinateArray();let s=In.densifyPoints(n,this.distanceTolerance,e.getPrecisionModel());return e instanceof J&&1===s.length&&(s=new Array(0).fill(null)),this._factory.getCoordinateSequenceFactory().create(s)}createValidArea(t){return t.buffer(0)}}In.DensifyTransformer=Nn;var Sn=Object.freeze({__proto__:null,Densifier:In});class wn{static isNorthern(t){return t===wn.NE||t===wn.NW}static isOpposite(t,e){if(t===e)return!1;return 2===(t-e+4)%4}static commonHalfPlane(t,e){if(t===e)return t;if(2===(t-e+4)%4)return-1;const n=t<e?t:e;return 0===n&&3===(t>e?t:e)?3:n}static isInHalfPlane(t,e){return e===wn.SE?t===wn.SE||t===wn.SW:t===e||t===e+1}static quadrant(){if("number"==typeof arguments[0]&&"number"==typeof arguments[1]){const t=arguments[0],e=arguments[1];if(0===t&&0===e)throw new s("Cannot compute the quadrant for point ( "+t+", "+e+" )");return t>=0?e>=0?wn.NE:wn.SE:e>=0?wn.NW:wn.SW}if(arguments[0]instanceof m&&arguments[1]instanceof m){const t=arguments[0],e=arguments[1];if(e.x===t.x&&e.y===t.y)throw new s("Cannot compute the quadrant for two identical points "+t);return e.x>=t.x?e.y>=t.y?wn.NE:wn.SE:e.y>=t.y?wn.NW:wn.SW}}}wn.NE=0,wn.NW=1,wn.SW=2,wn.SE=3;class Cn{constructor(){Cn.constructor_.apply(this,arguments)}static constructor_(){this._orig=null,this._sym=null,this._next=null;const t=arguments[0];this._orig=t}static create(t,e){const n=new Cn(t),s=new Cn(e);return n.link(s),n}find(t){let e=this;do{if(null===e)return null;if(e.dest().equals2D(t))return e;e=e.oNext()}while(e!==this);return null}dest(){return this._sym._orig}isEdgesSorted(){const t=this.findLowest();let e=t;do{const n=e.oNext();if(n===t)break;if(!(n.compareTo(e)>0))return!1;e=n}while(e!==t);return!0}oNext(){return this._sym._next}directionY(){return this.directionPt().getY()-this._orig.getY()}insert(t){if(this.oNext()===this)return this.insertAfter(t),null;this.insertionEdge(t).insertAfter(t)}insertAfter(t){g.equals(this._orig,t.orig());const e=this.oNext();this._sym.setNext(t),t.sym().setNext(e)}degree(){let t=0,e=this;do{t++,e=e.oNext()}while(e!==this);return t}equals(){if(2===arguments.length&&arguments[1]instanceof m&&arguments[0]instanceof m){const t=arguments[0],e=arguments[1];return this._orig.equals2D(t)&&this._sym._orig.equals(e)}}findLowest(){let t=this,e=this.oNext();do{e.compareTo(t)<0&&(t=e),e=e.oNext()}while(e!==this);return t}directionPt(){return this.dest()}sym(){return this._sym}prev(){return this._sym.next()._sym}compareAngularDirection(t){const e=this.directionX(),n=this.directionY(),s=t.directionX(),i=t.directionY();if(e===s&&n===i)return 0;const r=wn.quadrant(e,n),o=wn.quadrant(s,i);if(r>o)return 1;if(r<o)return-1;const l=this.directionPt(),a=t.directionPt();return G.index(t._orig,a,l)}prevNode(){let t=this;for(;2===t.degree();)if(t=t.prev(),t===this)return null;return t}directionX(){return this.directionPt().getX()-this._orig.getX()}insertionEdge(t){let e=this;do{const n=e.oNext();if(n.compareTo(e)>0&&t.compareTo(e)>=0&&t.compareTo(n)<=0)return e;if(n.compareTo(e)<=0&&(t.compareTo(n)<=0||t.compareTo(e)>=0))return e;e=n}while(e!==this);return g.shouldNeverReachHere(),null}compareTo(t){const e=t;return this.compareAngularDirection(e)}toStringNode(){const t=this.orig(),e=(this.dest(),new _t);e.append("Node( "+Wt.format(t)+" )\n");let n=this;do{e.append("  -> "+n),e.append("\n"),n=n.oNext()}while(n!==this);return e.toString()}link(t){this.setSym(t),t.setSym(this),this.setNext(t),t.setNext(this)}next(){return this._next}setSym(t){this._sym=t}orig(){return this._orig}toString(){return"HE("+this._orig.x+" "+this._orig.y+", "+this._sym._orig.x+" "+this._sym._orig.y+")"}toStringNodeEdge(){return"  -> ("+Wt.format(this.dest())}setNext(t){this._next=t}}class Ln extends Cn{constructor(){super(),Ln.constructor_.apply(this,arguments)}static constructor_(){this._isMarked=!1;const t=arguments[0];Cn.constructor_.call(this,t)}static setMarkBoth(t,e){t.setMark(e),t.sym().setMark(e)}static isMarked(t){return t.isMarked()}static setMark(t,e){t.setMark(e)}static markBoth(t){t.mark(),t.sym().mark()}static mark(t){t.mark()}mark(){this._isMarked=!0}setMark(t){this._isMarked=t}isMarked(){return this._isMarked}}class Tn{constructor(){Tn.constructor_.apply(this,arguments)}static constructor_(){this._vertexMap=new It}static isValidEdge(t,e){return 0!==e.compareTo(t)}insert(t,e,n){const s=this.create(t,e);null!==n?n.insert(s):this._vertexMap.put(t,s);const i=this._vertexMap.get(e);return null!==i?i.insert(s.sym()):this._vertexMap.put(e,s.sym()),s}create(t,e){const n=this.createEdge(t),s=this.createEdge(e);return n.link(s),n}createEdge(t){return new Cn(t)}addEdge(t,e){if(!Tn.isValidEdge(t,e))return null;const n=this._vertexMap.get(t);let s=null;if(null!==n&&(s=n.find(e)),null!==s)return s;return this.insert(t,e,n)}getVertexEdges(){return this._vertexMap.values()}findEdge(t,e){const n=this._vertexMap.get(t);return null===n?null:n.find(e)}}class Rn extends Ln{constructor(){super(),Rn.constructor_.apply(this,arguments)}static constructor_(){this._isStart=!1;const t=arguments[0];Ln.constructor_.call(this,t)}setStart(){this._isStart=!0}isStart(){return this._isStart}}class Pn extends Tn{constructor(){super()}createEdge(t){return new Rn(t)}}class On{constructor(){On.constructor_.apply(this,arguments)}static constructor_(){this._result=null,this._factory=null,this._graph=null,this._lines=new L,this._nodeEdgeStack=new en,this._ringStartEdge=null,this._graph=new Pn}static dissolve(t){const e=new On;return e.add(t),e.getResult()}addLine(t){this._lines.add(this._factory.createLineString(t.toCoordinateArray()))}updateRingStartEdge(t){return t.isStart()||(t=t.sym()).isStart()?null===this._ringStartEdge?(this._ringStartEdge=t,null):void(t.orig().compareTo(this._ringStartEdge.orig())<0&&(this._ringStartEdge=t)):null}getResult(){return null===this._result&&this.computeResult(),this._result}process(t){let e=t.prevNode();null===e&&(e=t),this.stackEdges(e),this.buildLines()}buildRing(t){const e=new R;let n=t;for(e.add(n.orig().copy(),!1);2===n.sym().degree();){const s=n.next();if(s===t)break;e.add(s.orig().copy(),!1),n=s}e.add(n.dest().copy(),!1),this.addLine(e)}buildLine(t){const e=new R;let n=t;for(this._ringStartEdge=null,Ln.markBoth(n),e.add(n.orig().copy(),!1);2===n.sym().degree();){this.updateRingStartEdge(n);const s=n.next();if(s===t)return this.buildRing(this._ringStartEdge),null;e.add(s.orig().copy(),!1),n=s,Ln.markBoth(n)}e.add(n.dest().clone(),!1),this.stackEdges(n.sym()),this.addLine(e)}stackEdges(t){let e=t;do{Ln.isMarked(e)||this._nodeEdgeStack.add(e),e=e.oNext()}while(e!==t)}computeResult(){for(let t=this._graph.getVertexEdges().iterator();t.hasNext();){const e=t.next();Ln.isMarked(e)||this.process(e)}this._result=this._factory.buildGeometry(this._lines)}buildLines(){for(;!this._nodeEdgeStack.empty();){const t=this._nodeEdgeStack.pop();Ln.isMarked(t)||this.buildLine(t)}}add(){if(arguments[0]instanceof X){arguments[0].apply(new class{get interfaces_(){return[k]}filter(t){t instanceof J&&this.add(t)}})}else if(I(arguments[0],N)){for(let t=arguments[0].iterator();t.hasNext();){const e=t.next();this.add(e)}}else if(arguments[0]instanceof J){const t=arguments[0];null===this._factory&&(this._factory=t.getFactory());const e=t.getCoordinateSequence();let n=!1;for(let t=1;t<e.size();t++){const s=this._graph.addEdge(e.getCoordinate(t-1),e.getCoordinate(t));null!==s&&(n||(s.setStart(),n=!0))}}}}var vn=Object.freeze({__proto__:null,LineDissolver:On});class Mn{static opposite(t){return t===Mn.LEFT?Mn.RIGHT:t===Mn.RIGHT?Mn.LEFT:t}}Mn.ON=0,Mn.LEFT=1,Mn.RIGHT=2;class bn{constructor(){bn.constructor_.apply(this,arguments)}static constructor_(){this.mce=null,this.chainIndex=null;const t=arguments[0],e=arguments[1];this.mce=t,this.chainIndex=e}computeIntersections(t,e){this.mce.computeIntersectsForChain(this.chainIndex,t.mce,t.chainIndex,e)}}class Dn{constructor(){Dn.constructor_.apply(this,arguments)}static constructor_(){if(this._label=null,this._xValue=null,this._eventType=null,this._insertEvent=null,this._deleteEventIndex=null,this._obj=null,2===arguments.length){const t=arguments[0],e=arguments[1];this._eventType=Dn.DELETE,this._xValue=t,this._insertEvent=e}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];this._eventType=Dn.INSERT,this._label=t,this._xValue=e,this._obj=n}}isDelete(){return this._eventType===Dn.DELETE}setDeleteEventIndex(t){this._deleteEventIndex=t}getObject(){return this._obj}compareTo(t){const e=t;return this._xValue<e._xValue?-1:this._xValue>e._xValue?1:this._eventType<e._eventType?-1:this._eventType>e._eventType?1:0}getInsertEvent(){return this._insertEvent}isInsert(){return this._eventType===Dn.INSERT}isSameLabel(t){return null!==this._label&&this._label===t._label}getDeleteEventIndex(){return this._deleteEventIndex}get interfaces_(){return[o]}}Dn.INSERT=1,Dn.DELETE=2;class An{constructor(){An.constructor_.apply(this,arguments)}static constructor_(){this._hasIntersection=!1,this._hasProper=!1,this._hasProperInterior=!1,this._properIntersectionPoint=null,this._li=null,this._includeProper=null,this._recordIsolated=null,this._isSelfIntersection=null,this._numIntersections=0,this.numTests=0,this._bdyNodes=null,this._isDone=!1,this._isDoneWhenProperInt=!1;const t=arguments[0],e=arguments[1],n=arguments[2];this._li=t,this._includeProper=e,this._recordIsolated=n}static isAdjacentSegments(t,e){return 1===Math.abs(t-e)}isTrivialIntersection(t,e,n,s){if(t===n&&1===this._li.getIntersectionNum()){if(An.isAdjacentSegments(e,s))return!0;if(t.isClosed()){const n=t.getNumPoints()-1;if(0===e&&s===n||0===s&&e===n)return!0}}return!1}getProperIntersectionPoint(){return this._properIntersectionPoint}setIsDoneIfProperInt(t){this._isDoneWhenProperInt=t}hasProperInteriorIntersection(){return this._hasProperInterior}isBoundaryPointInternal(t,e){for(let n=e.iterator();n.hasNext();){const e=n.next().getCoordinate();if(t.isIntersection(e))return!0}return!1}hasProperIntersection(){return this._hasProper}hasIntersection(){return this._hasIntersection}isDone(){return this._isDone}isBoundaryPoint(t,e){return null!==e&&(!!this.isBoundaryPointInternal(t,e[0])||!!this.isBoundaryPointInternal(t,e[1]))}setBoundaryNodes(t,e){this._bdyNodes=new Array(2).fill(null),this._bdyNodes[0]=t,this._bdyNodes[1]=e}addIntersections(t,e,n,s){if(t===n&&e===s)return null;this.numTests++;const i=t.getCoordinates()[e],r=t.getCoordinates()[e+1],o=n.getCoordinates()[s],l=n.getCoordinates()[s+1];this._li.computeIntersection(i,r,o,l),this._li.hasIntersection()&&(this._recordIsolated&&(t.setIsolated(!1),n.setIsolated(!1)),this._numIntersections++,this.isTrivialIntersection(t,e,n,s)||(this._hasIntersection=!0,!this._includeProper&&this._li.isProper()||(t.addIntersections(this._li,e,0),n.addIntersections(this._li,s,1)),this._li.isProper()&&(this._properIntersectionPoint=this._li.getIntersection(0).copy(),this._hasProper=!0,this._isDoneWhenProperInt&&(this._isDone=!0),this.isBoundaryPoint(this._li,this._bdyNodes)||(this._hasProperInterior=!0))))}}class Fn extends class{}{constructor(){super(),Fn.constructor_.apply(this,arguments)}static constructor_(){this.events=new L,this.nOverlaps=null}prepareEvents(){xe.sort(this.events);for(let t=0;t<this.events.size();t++){const e=this.events.get(t);e.isDelete()&&e.getInsertEvent().setDeleteEventIndex(t)}}computeIntersections(){if(1===arguments.length){const t=arguments[0];this.nOverlaps=0,this.prepareEvents();for(let e=0;e<this.events.size();e++){const n=this.events.get(e);if(n.isInsert()&&this.processOverlaps(e,n.getDeleteEventIndex(),n,t),t.isDone())break}}else if(3===arguments.length)if(arguments[2]instanceof An&&I(arguments[0],w)&&I(arguments[1],w)){const t=arguments[0],e=arguments[1],n=arguments[2];this.addEdges(t,t),this.addEdges(e,e),this.computeIntersections(n)}else if("boolean"==typeof arguments[2]&&I(arguments[0],w)&&arguments[1]instanceof An){const t=arguments[0],e=arguments[1];arguments[2]?this.addEdges(t,null):this.addEdges(t),this.computeIntersections(e)}}addEdge(t,e){const n=t.getMonotoneChainEdge(),s=n.getStartIndexes();for(let t=0;t<s.length-1;t++){const s=new bn(n,t),i=new Dn(e,n.getMinX(t),s);this.events.add(i),this.events.add(new Dn(n.getMaxX(t),i))}}processOverlaps(t,e,n,s){const i=n.getObject();for(let r=t;r<e;r++){const t=this.events.get(r);if(t.isInsert()){const e=t.getObject();n.isSameLabel(t)||(i.computeIntersections(e,s),this.nOverlaps++)}}}addEdges(){if(1===arguments.length){for(let t=arguments[0].iterator();t.hasNext();){const e=t.next();this.addEdge(e,e)}}else if(2===arguments.length){const t=arguments[1];for(let e=arguments[0].iterator();e.hasNext();){const n=e.next();this.addEdge(n,t)}}}}class Gn{constructor(){Gn.constructor_.apply(this,arguments)}static constructor_(){if(this.location=null,1===arguments.length){if(arguments[0]instanceof Array){const t=arguments[0];this.init(t.length)}else if(Number.isInteger(arguments[0])){const t=arguments[0];this.init(1),this.location[Mn.ON]=t}else if(arguments[0]instanceof Gn){const t=arguments[0];if(this.init(t.location.length),null!==t)for(let e=0;e<this.location.length;e++)this.location[e]=t.location[e]}}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];this.init(3),this.location[Mn.ON]=t,this.location[Mn.LEFT]=e,this.location[Mn.RIGHT]=n}}setAllLocations(t){for(let e=0;e<this.location.length;e++)this.location[e]=t}isNull(){for(let t=0;t<this.location.length;t++)if(this.location[t]!==Qt.NONE)return!1;return!0}setAllLocationsIfNull(t){for(let e=0;e<this.location.length;e++)this.location[e]===Qt.NONE&&(this.location[e]=t)}isLine(){return 1===this.location.length}merge(t){if(t.location.length>this.location.length){const t=new Array(3).fill(null);t[Mn.ON]=this.location[Mn.ON],t[Mn.LEFT]=Qt.NONE,t[Mn.RIGHT]=Qt.NONE,this.location=t}for(let e=0;e<this.location.length;e++)this.location[e]===Qt.NONE&&e<t.location.length&&(this.location[e]=t.location[e])}getLocations(){return this.location}flip(){if(this.location.length<=1)return null;const t=this.location[Mn.LEFT];this.location[Mn.LEFT]=this.location[Mn.RIGHT],this.location[Mn.RIGHT]=t}toString(){const t=new v;return this.location.length>1&&t.append(Qt.toLocationSymbol(this.location[Mn.LEFT])),t.append(Qt.toLocationSymbol(this.location[Mn.ON])),this.location.length>1&&t.append(Qt.toLocationSymbol(this.location[Mn.RIGHT])),t.toString()}setLocations(t,e,n){this.location[Mn.ON]=t,this.location[Mn.LEFT]=e,this.location[Mn.RIGHT]=n}get(t){return t<this.location.length?this.location[t]:Qt.NONE}isArea(){return this.location.length>1}isAnyNull(){for(let t=0;t<this.location.length;t++)if(this.location[t]===Qt.NONE)return!0;return!1}setLocation(){if(1===arguments.length){const t=arguments[0];this.setLocation(Mn.ON,t)}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this.location[t]=e}}init(t){this.location=new Array(t).fill(null),this.setAllLocations(Qt.NONE)}isEqualOnSide(t,e){return this.location[e]===t.location[e]}allPositionsEqual(t){for(let e=0;e<this.location.length;e++)if(this.location[e]!==t)return!1;return!0}}class qn{constructor(){qn.constructor_.apply(this,arguments)}static constructor_(){if(this.elt=new Array(2).fill(null),1===arguments.length){if(Number.isInteger(arguments[0])){const t=arguments[0];this.elt[0]=new Gn(t),this.elt[1]=new Gn(t)}else if(arguments[0]instanceof qn){const t=arguments[0];this.elt[0]=new Gn(t.elt[0]),this.elt[1]=new Gn(t.elt[1])}}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this.elt[0]=new Gn(Qt.NONE),this.elt[1]=new Gn(Qt.NONE),this.elt[t].setLocation(e)}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];this.elt[0]=new Gn(t,e,n),this.elt[1]=new Gn(t,e,n)}else if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];this.elt[0]=new Gn(Qt.NONE,Qt.NONE,Qt.NONE),this.elt[1]=new Gn(Qt.NONE,Qt.NONE,Qt.NONE),this.elt[t].setLocations(e,n,s)}}static toLineLabel(t){const e=new qn(Qt.NONE);for(let n=0;n<2;n++)e.setLocation(n,t.getLocation(n));return e}getGeometryCount(){let t=0;return this.elt[0].isNull()||t++,this.elt[1].isNull()||t++,t}setAllLocations(t,e){this.elt[t].setAllLocations(e)}isNull(t){return this.elt[t].isNull()}setAllLocationsIfNull(){if(1===arguments.length){const t=arguments[0];this.setAllLocationsIfNull(0,t),this.setAllLocationsIfNull(1,t)}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this.elt[t].setAllLocationsIfNull(e)}}isLine(t){return this.elt[t].isLine()}merge(t){for(let e=0;e<2;e++)null===this.elt[e]&&null!==t.elt[e]?this.elt[e]=new Gn(t.elt[e]):this.elt[e].merge(t.elt[e])}flip(){this.elt[0].flip(),this.elt[1].flip()}getLocation(){if(1===arguments.length){const t=arguments[0];return this.elt[t].get(Mn.ON)}if(2===arguments.length){const t=arguments[0],e=arguments[1];return this.elt[t].get(e)}}toString(){const t=new v;return null!==this.elt[0]&&(t.append("A:"),t.append(this.elt[0].toString())),null!==this.elt[1]&&(t.append(" B:"),t.append(this.elt[1].toString())),t.toString()}isArea(){if(0===arguments.length)return this.elt[0].isArea()||this.elt[1].isArea();if(1===arguments.length){const t=arguments[0];return this.elt[t].isArea()}}isAnyNull(t){return this.elt[t].isAnyNull()}setLocation(){if(2===arguments.length){const t=arguments[0],e=arguments[1];this.elt[t].setLocation(Mn.ON,e)}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];this.elt[t].setLocation(e,n)}}isEqualOnSide(t,e){return this.elt[0].isEqualOnSide(t.elt[0],e)&&this.elt[1].isEqualOnSide(t.elt[1],e)}allPositionsEqual(t,e){return this.elt[t].allPositionsEqual(e)}toLine(t){this.elt[t].isArea()&&(this.elt[t]=new Gn(this.elt[t].location[0]))}}class Bn{constructor(){Bn.constructor_.apply(this,arguments)}static constructor_(){this.coord=null,this.segmentIndex=null,this.dist=null;const t=arguments[0],e=arguments[1],n=arguments[2];this.coord=new m(t),this.segmentIndex=e,this.dist=n}getSegmentIndex(){return this.segmentIndex}getCoordinate(){return this.coord}print(t){t.print(this.coord),t.print(" seg # = "+this.segmentIndex),t.println(" dist = "+this.dist)}compareTo(t){const e=t;return this.compare(e.segmentIndex,e.dist)}isEndPoint(t){return 0===this.segmentIndex&&0===this.dist||this.segmentIndex===t}toString(){return this.coord+" seg # = "+this.segmentIndex+" dist = "+this.dist}getDistance(){return this.dist}compare(t,e){return this.segmentIndex<t?-1:this.segmentIndex>t?1:this.dist<e?-1:this.dist>e?1:0}get interfaces_(){return[o]}}class Yn extends yt{}function Vn(t){return null==t?0:t.color}function zn(t){return null==t?null:t.parent}function kn(t,e){null!==t&&(t.color=e)}function Xn(t){return null==t?null:t.left}function Un(t){return null==t?null:t.right}class Hn extends Yn{constructor(){super(),this.root_=null,this.size_=0}get(t){let e=this.root_;for(;null!==e;){const n=t.compareTo(e.key);if(n<0)e=e.left;else{if(!(n>0))return e.value;e=e.right}}return null}put(t,e){if(null===this.root_)return this.root_={key:t,value:e,left:null,right:null,parent:null,color:0,getValue(){return this.value},getKey(){return this.key}},this.size_=1,null;let n,s,i=this.root_;do{if(n=i,s=t.compareTo(i.key),s<0)i=i.left;else{if(!(s>0)){const t=i.value;return i.value=e,t}i=i.right}}while(null!==i);const r={key:t,left:null,right:null,value:e,parent:n,color:0,getValue(){return this.value},getKey(){return this.key}};return s<0?n.left=r:n.right=r,this.fixAfterInsertion(r),this.size_++,null}fixAfterInsertion(t){let e;for(t.color=1;null!=t&&t!==this.root_&&1===t.parent.color;)zn(t)===Xn(zn(zn(t)))?(e=Un(zn(zn(t))),1===Vn(e)?(kn(zn(t),0),kn(e,0),kn(zn(zn(t)),1),t=zn(zn(t))):(t===Un(zn(t))&&(t=zn(t),this.rotateLeft(t)),kn(zn(t),0),kn(zn(zn(t)),1),this.rotateRight(zn(zn(t))))):(e=Xn(zn(zn(t))),1===Vn(e)?(kn(zn(t),0),kn(e,0),kn(zn(zn(t)),1),t=zn(zn(t))):(t===Xn(zn(t))&&(t=zn(t),this.rotateRight(t)),kn(zn(t),0),kn(zn(zn(t)),1),this.rotateLeft(zn(zn(t)))));this.root_.color=0}values(){const t=new L;let e=this.getFirstEntry();if(null!==e)for(t.add(e.value);null!==(e=Hn.successor(e));)t.add(e.value);return t}entrySet(){const t=new xt;let e=this.getFirstEntry();if(null!==e)for(t.add(e);null!==(e=Hn.successor(e));)t.add(e);return t}rotateLeft(t){if(null!=t){const e=t.right;t.right=e.left,null!=e.left&&(e.left.parent=t),e.parent=t.parent,null==t.parent?this.root_=e:t.parent.left===t?t.parent.left=e:t.parent.right=e,e.left=t,t.parent=e}}rotateRight(t){if(null!=t){const e=t.left;t.left=e.right,null!=e.right&&(e.right.parent=t),e.parent=t.parent,null==t.parent?this.root_=e:t.parent.right===t?t.parent.right=e:t.parent.left=e,e.right=t,t.parent=e}}getFirstEntry(){let t=this.root_;if(null!=t)for(;null!=t.left;)t=t.left;return t}static successor(t){let e;if(null===t)return null;if(null!==t.right){for(e=t.right;null!==e.left;)e=e.left;return e}{e=t.parent;let n=t;for(;null!==e&&n===e.right;)n=e,e=e.parent;return e}}size(){return this.size_}containsKey(t){let e=this.root_;for(;null!==e;){const n=t.compareTo(e.key);if(n<0)e=e.left;else{if(!(n>0))return!0;e=e.right}}return!1}}class Wn{constructor(){Wn.constructor_.apply(this,arguments)}static constructor_(){this._nodeMap=new Hn,this.edge=null;const t=arguments[0];this.edge=t}print(t){t.println("Intersections:");for(let e=this.iterator();e.hasNext();){e.next().print(t)}}iterator(){return this._nodeMap.values().iterator()}addSplitEdges(t){this.addEndpoints();const e=this.iterator();let n=e.next();for(;e.hasNext();){const s=e.next(),i=this.createSplitEdge(n,s);t.add(i),n=s}}addEndpoints(){const t=this.edge.pts.length-1;this.add(this.edge.pts[0],0,0),this.add(this.edge.pts[t],t,0)}createSplitEdge(t,e){let n=e.segmentIndex-t.segmentIndex+2;const s=this.edge.pts[e.segmentIndex],i=e.dist>0||!e.coord.equals2D(s);i||n--;const r=new Array(n).fill(null);let o=0;r[o++]=new m(t.coord);for(let n=t.segmentIndex+1;n<=e.segmentIndex;n++)r[o++]=this.edge.pts[n];return i&&(r[o]=e.coord),new $n(r,new qn(this.edge._label))}add(t,e,n){const s=new Bn(t,e,n),i=this._nodeMap.get(s);return null!==i?i:(this._nodeMap.put(s,s),s)}isIntersection(t){for(let e=this.iterator();e.hasNext();){if(e.next().coord.equals(t))return!0}return!1}}class Zn{constructor(){Zn.constructor_.apply(this,arguments)}static constructor_(){if(this._data=null,this._size=0,0===arguments.length)Zn.constructor_.call(this,10);else if(1===arguments.length){const t=arguments[0];this._data=new Array(t).fill(null)}}size(){return this._size}addAll(t){return null===t||0===t.length?null:(this.ensureCapacity(this._size+t.length),B.arraycopy(t,0,this._data,this._size,t.length),void(this._size+=t.length))}ensureCapacity(t){if(t<=this._data.length)return null;const e=Math.max(t,2*this._data.length);this._data=nt.copyOf(this._data,e)}toArray(){const t=new Array(this._size).fill(null);return B.arraycopy(this._data,0,t,0,this._size),t}add(t){this.ensureCapacity(this._size+1),this._data[this._size]=t,++this._size}}class jn{static toIntArray(t){const e=new Array(t.size()).fill(null);for(let n=0;n<e.length;n++)e[n]=t.get(n).intValue();return e}getChainStartIndices(t){let e=0;const n=new Zn(Math.trunc(t.length/2));n.add(e);do{const s=this.findChainEnd(t,e);n.add(s),e=s}while(e<t.length-1);return n.toArray()}findChainEnd(t,e){const n=wn.quadrant(t[e],t[e+1]);let s=e+1;for(;s<t.length;){if(wn.quadrant(t[s-1],t[s])!==n)break;s++}return s-1}OLDgetChainStartIndices(t){let e=0;const n=new L;n.add(e);do{const s=this.findChainEnd(t,e);n.add(s),e=s}while(e<t.length-1);return jn.toIntArray(n)}}class Kn{constructor(){Kn.constructor_.apply(this,arguments)}static constructor_(){this.e=null,this.pts=null,this.startIndex=null;const t=arguments[0];this.e=t,this.pts=t.getCoordinates();const e=new jn;this.startIndex=e.getChainStartIndices(this.pts)}getCoordinates(){return this.pts}getMaxX(t){const e=this.pts[this.startIndex[t]].x,n=this.pts[this.startIndex[t+1]].x;return e>n?e:n}getMinX(t){const e=this.pts[this.startIndex[t]].x,n=this.pts[this.startIndex[t+1]].x;return e<n?e:n}computeIntersectsForChain(){if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];this.computeIntersectsForChain(this.startIndex[t],this.startIndex[t+1],e,e.startIndex[n],e.startIndex[n+1],s)}else if(6===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3],i=arguments[4],r=arguments[5];if(e-t==1&&i-s==1)return r.addIntersections(this.e,t,n.e,s),null;if(!this.overlaps(t,e,n,s,i))return null;const o=Math.trunc((t+e)/2),l=Math.trunc((s+i)/2);t<o&&(s<l&&this.computeIntersectsForChain(t,o,n,s,l,r),l<i&&this.computeIntersectsForChain(t,o,n,l,i,r)),o<e&&(s<l&&this.computeIntersectsForChain(o,e,n,s,l,r),l<i&&this.computeIntersectsForChain(o,e,n,l,i,r))}}overlaps(t,e,n,s,i){return O.intersects(this.pts[t],this.pts[e],n.pts[s],n.pts[i])}getStartIndexes(){return this.startIndex}computeIntersects(t,e){for(let n=0;n<this.startIndex.length-1;n++)for(let s=0;s<t.startIndex.length-1;s++)this.computeIntersectsForChain(n,t,s,e)}}class Qn{constructor(){Qn.constructor_.apply(this,arguments)}static constructor_(){this._depth=Array(2).fill().map((()=>Array(3)));for(let t=0;t<2;t++)for(let e=0;e<3;e++)this._depth[t][e]=Qn.NULL_VALUE}static depthAtLocation(t){return t===Qt.EXTERIOR?0:t===Qt.INTERIOR?1:Qn.NULL_VALUE}getDepth(t,e){return this._depth[t][e]}setDepth(t,e,n){this._depth[t][e]=n}isNull(){if(0===arguments.length){for(let t=0;t<2;t++)for(let e=0;e<3;e++)if(this._depth[t][e]!==Qn.NULL_VALUE)return!1;return!0}if(1===arguments.length){const t=arguments[0];return this._depth[t][1]===Qn.NULL_VALUE}if(2===arguments.length){const t=arguments[0],e=arguments[1];return this._depth[t][e]===Qn.NULL_VALUE}}normalize(){for(let t=0;t<2;t++)if(!this.isNull(t)){let e=this._depth[t][1];this._depth[t][2]<e&&(e=this._depth[t][2]),e<0&&(e=0);for(let n=1;n<3;n++){let s=0;this._depth[t][n]>e&&(s=1),this._depth[t][n]=s}}}getDelta(t){return this._depth[t][Mn.RIGHT]-this._depth[t][Mn.LEFT]}getLocation(t,e){return this._depth[t][e]<=0?Qt.EXTERIOR:Qt.INTERIOR}toString(){return"A: "+this._depth[0][1]+","+this._depth[0][2]+" B: "+this._depth[1][1]+","+this._depth[1][2]}add(){if(1===arguments.length){const t=arguments[0];for(let e=0;e<2;e++)for(let n=1;n<3;n++){const s=t.getLocation(e,n);s!==Qt.EXTERIOR&&s!==Qt.INTERIOR||(this.isNull(e,n)?this._depth[e][n]=Qn.depthAtLocation(s):this._depth[e][n]+=Qn.depthAtLocation(s))}}else if(3===arguments.length){const t=arguments[0],e=arguments[1];arguments[2]===Qt.INTERIOR&&this._depth[t][e]++}}}Qn.NULL_VALUE=-1;class Jn{constructor(){Jn.constructor_.apply(this,arguments)}static constructor_(){if(this._label=null,this._isInResult=!1,this._isCovered=!1,this._isCoveredSet=!1,this._isVisited=!1,0===arguments.length);else if(1===arguments.length){const t=arguments[0];this._label=t}}setVisited(t){this._isVisited=t}setInResult(t){this._isInResult=t}isCovered(){return this._isCovered}isCoveredSet(){return this._isCoveredSet}setLabel(t){this._label=t}getLabel(){return this._label}setCovered(t){this._isCovered=t,this._isCoveredSet=!0}updateIM(t){g.isTrue(this._label.getGeometryCount()>=2,"found partial label"),this.computeIM(t)}isInResult(){return this._isInResult}isVisited(){return this._isVisited}}class $n extends Jn{constructor(){super(),$n.constructor_.apply(this,arguments)}static constructor_(){if(this.pts=null,this._env=null,this.eiList=new Wn(this),this._name=null,this._mce=null,this._isIsolated=!0,this._depth=new Qn,this._depthDelta=0,1===arguments.length){const t=arguments[0];$n.constructor_.call(this,t,null)}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this.pts=t,this._label=e}}static updateIM(){if(!(2===arguments.length&&arguments[1]instanceof Jt&&arguments[0]instanceof qn))return super.updateIM.apply(this,arguments);{const t=arguments[0],e=arguments[1];e.setAtLeastIfValid(t.getLocation(0,Mn.ON),t.getLocation(1,Mn.ON),1),t.isArea()&&(e.setAtLeastIfValid(t.getLocation(0,Mn.LEFT),t.getLocation(1,Mn.LEFT),2),e.setAtLeastIfValid(t.getLocation(0,Mn.RIGHT),t.getLocation(1,Mn.RIGHT),2))}}getDepth(){return this._depth}getCollapsedEdge(){const t=new Array(2).fill(null);t[0]=this.pts[0],t[1]=this.pts[1];return new $n(t,qn.toLineLabel(this._label))}isIsolated(){return this._isIsolated}getCoordinates(){return this.pts}setIsolated(t){this._isIsolated=t}setName(t){this._name=t}equals(t){if(!(t instanceof $n))return!1;const e=t;if(this.pts.length!==e.pts.length)return!1;let n=!0,s=!0,i=this.pts.length;for(let t=0;t<this.pts.length;t++)if(this.pts[t].equals2D(e.pts[t])||(n=!1),this.pts[t].equals2D(e.pts[--i])||(s=!1),!n&&!s)return!1;return!0}getCoordinate(){if(0===arguments.length)return this.pts.length>0?this.pts[0]:null;if(1===arguments.length){const t=arguments[0];return this.pts[t]}}print(t){t.print("edge "+this._name+": "),t.print("LINESTRING (");for(let e=0;e<this.pts.length;e++)e>0&&t.print(","),t.print(this.pts[e].x+" "+this.pts[e].y);t.print(")  "+this._label+" "+this._depthDelta)}computeIM(t){$n.updateIM(this._label,t)}isCollapsed(){return!!this._label.isArea()&&(3===this.pts.length&&!!this.pts[0].equals(this.pts[2]))}isClosed(){return this.pts[0].equals(this.pts[this.pts.length-1])}getMaximumSegmentIndex(){return this.pts.length-1}getDepthDelta(){return this._depthDelta}getNumPoints(){return this.pts.length}printReverse(t){t.print("edge "+this._name+": ");for(let e=this.pts.length-1;e>=0;e--)t.print(this.pts[e]+" ");t.println("")}getMonotoneChainEdge(){return null===this._mce&&(this._mce=new Kn(this)),this._mce}getEnvelope(){if(null===this._env){this._env=new O;for(let t=0;t<this.pts.length;t++)this._env.expandToInclude(this.pts[t])}return this._env}addIntersection(t,e,n,s){const i=new m(t.getIntersection(s));let r=e,o=t.getEdgeDistance(n,s);const l=r+1;if(l<this.pts.length){const t=this.pts[l];i.equals2D(t)&&(r=l,o=0)}this.eiList.add(i,r,o)}toString(){const t=new _t;t.append("edge "+this._name+": "),t.append("LINESTRING (");for(let e=0;e<this.pts.length;e++)e>0&&t.append(","),t.append(this.pts[e].x+" "+this.pts[e].y);return t.append(")  "+this._label+" "+this._depthDelta),t.toString()}isPointwiseEqual(t){if(this.pts.length!==t.pts.length)return!1;for(let e=0;e<this.pts.length;e++)if(!this.pts[e].equals2D(t.pts[e]))return!1;return!0}setDepthDelta(t){this._depthDelta=t}getEdgeIntersectionList(){return this.eiList}addIntersections(t,e,n){for(let s=0;s<t.getIntersectionNum();s++)this.addIntersection(t,e,n,s)}}class ts extends Jn{constructor(){super(),ts.constructor_.apply(this,arguments)}static constructor_(){this._coord=null,this._edges=null;const t=arguments[0],e=arguments[1];this._coord=t,this._edges=e,this._label=new qn(0,Qt.NONE)}isIncidentEdgeInResult(){for(let t=this.getEdges().getEdges().iterator();t.hasNext();){if(t.next().getEdge().isInResult())return!0}return!1}isIsolated(){return 1===this._label.getGeometryCount()}getCoordinate(){return this._coord}print(t){t.println("node "+this._coord+" lbl: "+this._label)}computeIM(t){}computeMergedLocation(t,e){let n=Qt.NONE;if(n=this._label.getLocation(e),!t.isNull(e)){const s=t.getLocation(e);n!==Qt.BOUNDARY&&(n=s)}return n}setLabel(){if(2!==arguments.length||!Number.isInteger(arguments[1])||!Number.isInteger(arguments[0]))return super.setLabel.apply(this,arguments);{const t=arguments[0],e=arguments[1];null===this._label?this._label=new qn(t,e):this._label.setLocation(t,e)}}getEdges(){return this._edges}mergeLabel(){if(arguments[0]instanceof ts){const t=arguments[0];this.mergeLabel(t._label)}else if(arguments[0]instanceof qn){const t=arguments[0];for(let e=0;e<2;e++){const n=this.computeMergedLocation(t,e);this._label.getLocation(e)===Qt.NONE&&this._label.setLocation(e,n)}}}add(t){this._edges.insert(t),t.setNode(this)}setLabelBoundary(t){if(null===this._label)return null;let e=Qt.NONE;null!==this._label&&(e=this._label.getLocation(t));let n=null;switch(e){case Qt.BOUNDARY:n=Qt.INTERIOR;break;case Qt.INTERIOR:default:n=Qt.BOUNDARY}this._label.setLocation(t,n)}}class es{constructor(){es.constructor_.apply(this,arguments)}static constructor_(){this.nodeMap=new Hn,this.nodeFact=null;const t=arguments[0];this.nodeFact=t}find(t){return this.nodeMap.get(t)}addNode(){if(arguments[0]instanceof m){const t=arguments[0];let e=this.nodeMap.get(t);return null===e&&(e=this.nodeFact.createNode(t),this.nodeMap.put(t,e)),e}if(arguments[0]instanceof ts){const t=arguments[0],e=this.nodeMap.get(t.getCoordinate());return null===e?(this.nodeMap.put(t.getCoordinate(),t),t):(e.mergeLabel(t),e)}}print(t){for(let e=this.iterator();e.hasNext();){e.next().print(t)}}iterator(){return this.nodeMap.values().iterator()}values(){return this.nodeMap.values()}getBoundaryNodes(t){const e=new L;for(let n=this.iterator();n.hasNext();){const s=n.next();s.getLabel().getLocation(t)===Qt.BOUNDARY&&e.add(s)}return e}add(t){const e=t.getCoordinate();this.addNode(e).add(t)}}class ns{constructor(){ns.constructor_.apply(this,arguments)}static constructor_(){if(this._edge=null,this._label=null,this._node=null,this._p0=null,this._p1=null,this._dx=null,this._dy=null,this._quadrant=null,1===arguments.length){const t=arguments[0];this._edge=t}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];ns.constructor_.call(this,t,e,n,null)}else if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];ns.constructor_.call(this,t),this.init(e,n),this._label=s}}compareDirection(t){return this._dx===t._dx&&this._dy===t._dy?0:this._quadrant>t._quadrant?1:this._quadrant<t._quadrant?-1:G.index(t._p0,t._p1,this._p1)}getDy(){return this._dy}getCoordinate(){return this._p0}setNode(t){this._node=t}print(t){const e=Math.atan2(this._dy,this._dx),n=this.getClass().getName(),s=n.lastIndexOf("."),i=n.substring(s+1);t.print("  "+i+": "+this._p0+" - "+this._p1+" "+this._quadrant+":"+e+"   "+this._label)}compareTo(t){const e=t;return this.compareDirection(e)}getDirectedCoordinate(){return this._p1}getDx(){return this._dx}getLabel(){return this._label}getEdge(){return this._edge}getQuadrant(){return this._quadrant}getNode(){return this._node}toString(){const t=Math.atan2(this._dy,this._dx),e=this.getClass().getName(),n=e.lastIndexOf(".");return"  "+e.substring(n+1)+": "+this._p0+" - "+this._p1+" "+this._quadrant+":"+t+"   "+this._label}computeLabel(t){}init(t,e){this._p0=t,this._p1=e,this._dx=e.x-t.x,this._dy=e.y-t.y,this._quadrant=wn.quadrant(this._dx,this._dy),g.isTrue(!(0===this._dx&&0===this._dy),"EdgeEnd with identical endpoints found")}get interfaces_(){return[o]}}class ss extends h{constructor(t,e){super(e?t+" [ "+e+" ]":t),this.pt=e?new m(e):void 0,this.name=Object.keys({TopologyException:ss})[0]}getCoordinate(){return this.pt}}class is extends ns{constructor(){super(),is.constructor_.apply(this,arguments)}static constructor_(){this._isForward=null,this._isInResult=!1,this._isVisited=!1,this._sym=null,this._next=null,this._nextMin=null,this._edgeRing=null,this._minEdgeRing=null,this._depth=[0,-999,-999];const t=arguments[0],e=arguments[1];if(ns.constructor_.call(this,t),this._isForward=e,e)this.init(t.getCoordinate(0),t.getCoordinate(1));else{const e=t.getNumPoints()-1;this.init(t.getCoordinate(e),t.getCoordinate(e-1))}this.computeDirectedLabel()}static depthFactor(t,e){return t===Qt.EXTERIOR&&e===Qt.INTERIOR?1:t===Qt.INTERIOR&&e===Qt.EXTERIOR?-1:0}getNextMin(){return this._nextMin}getDepth(t){return this._depth[t]}setVisited(t){this._isVisited=t}computeDirectedLabel(){this._label=new qn(this._edge.getLabel()),this._isForward||this._label.flip()}getNext(){return this._next}setDepth(t,e){if(-999!==this._depth[t]&&this._depth[t]!==e)throw new ss("assigned depths do not match",this.getCoordinate());this._depth[t]=e}isInteriorAreaEdge(){let t=!0;for(let e=0;e<2;e++)this._label.isArea(e)&&this._label.getLocation(e,Mn.LEFT)===Qt.INTERIOR&&this._label.getLocation(e,Mn.RIGHT)===Qt.INTERIOR||(t=!1);return t}setNextMin(t){this._nextMin=t}print(t){super.print.call(this,t),t.print(" "+this._depth[Mn.LEFT]+"/"+this._depth[Mn.RIGHT]),t.print(" ("+this.getDepthDelta()+")"),this._isInResult&&t.print(" inResult")}setMinEdgeRing(t){this._minEdgeRing=t}isLineEdge(){const t=this._label.isLine(0)||this._label.isLine(1),e=!this._label.isArea(0)||this._label.allPositionsEqual(0,Qt.EXTERIOR),n=!this._label.isArea(1)||this._label.allPositionsEqual(1,Qt.EXTERIOR);return t&&e&&n}setEdgeRing(t){this._edgeRing=t}getMinEdgeRing(){return this._minEdgeRing}getDepthDelta(){let t=this._edge.getDepthDelta();return this._isForward||(t=-t),t}setInResult(t){this._isInResult=t}getSym(){return this._sym}isForward(){return this._isForward}getEdge(){return this._edge}printEdge(t){this.print(t),t.print(" "),this._isForward?this._edge.print(t):this._edge.printReverse(t)}setSym(t){this._sym=t}setVisitedEdge(t){this.setVisited(t),this._sym.setVisited(t)}setEdgeDepths(t,e){let n=this.getEdge().getDepthDelta();this._isForward||(n=-n);let s=1;t===Mn.LEFT&&(s=-1);const i=Mn.opposite(t),r=e+n*s;this.setDepth(t,e),this.setDepth(i,r)}getEdgeRing(){return this._edgeRing}isInResult(){return this._isInResult}setNext(t){this._next=t}isVisited(){return this._isVisited}}class rs{createNode(t){return new ts(t,null)}}class os{constructor(){os.constructor_.apply(this,arguments)}static constructor_(){if(this._edges=new L,this._nodes=null,this._edgeEndList=new L,0===arguments.length)this._nodes=new es(new rs);else if(1===arguments.length){const t=arguments[0];this._nodes=new es(t)}}static linkResultDirectedEdges(t){for(let e=t.iterator();e.hasNext();){e.next().getEdges().linkResultDirectedEdges()}}printEdges(t){t.println("Edges:");for(let e=0;e<this._edges.size();e++){t.println("edge "+e+":");const n=this._edges.get(e);n.print(t),n.eiList.print(t)}}find(t){return this._nodes.find(t)}addNode(){if(arguments[0]instanceof ts){const t=arguments[0];return this._nodes.addNode(t)}if(arguments[0]instanceof m){const t=arguments[0];return this._nodes.addNode(t)}}getNodeIterator(){return this._nodes.iterator()}linkResultDirectedEdges(){for(let t=this._nodes.iterator();t.hasNext();){t.next().getEdges().linkResultDirectedEdges()}}debugPrintln(t){B.out.println(t)}isBoundaryNode(t,e){const n=this._nodes.find(e);if(null===n)return!1;const s=n.getLabel();return null!==s&&s.getLocation(t)===Qt.BOUNDARY}linkAllDirectedEdges(){for(let t=this._nodes.iterator();t.hasNext();){t.next().getEdges().linkAllDirectedEdges()}}matchInSameDirection(t,e,n,s){return!!t.equals(n)&&(G.index(t,e,s)===G.COLLINEAR&&wn.quadrant(t,e)===wn.quadrant(n,s))}getEdgeEnds(){return this._edgeEndList}debugPrint(t){B.out.print(t)}getEdgeIterator(){return this._edges.iterator()}findEdgeInSameDirection(t,e){for(let n=0;n<this._edges.size();n++){const s=this._edges.get(n),i=s.getCoordinates();if(this.matchInSameDirection(t,e,i[0],i[1]))return s;if(this.matchInSameDirection(t,e,i[i.length-1],i[i.length-2]))return s}return null}insertEdge(t){this._edges.add(t)}findEdgeEnd(t){for(let e=this.getEdgeEnds().iterator();e.hasNext();){const n=e.next();if(n.getEdge()===t)return n}return null}addEdges(t){for(let e=t.iterator();e.hasNext();){const t=e.next();this._edges.add(t);const n=new is(t,!0),s=new is(t,!1);n.setSym(s),s.setSym(n),this.add(n),this.add(s)}}add(t){this._nodes.add(t),this._edgeEndList.add(t)}getNodes(){return this._nodes.values()}findEdge(t,e){for(let n=0;n<this._edges.size();n++){const s=this._edges.get(n),i=s.getCoordinates();if(t.equals(i[0])&&e.equals(i[1]))return s}return null}}class ls extends os{constructor(){super(),ls.constructor_.apply(this,arguments)}static constructor_(){if(this._parentGeom=null,this._lineEdgeMap=new It,this._boundaryNodeRule=null,this._useBoundaryDeterminationRule=!0,this._argIndex=null,this._boundaryNodes=null,this._hasTooFewPoints=!1,this._invalidPoint=null,this._areaPtLocator=null,this._ptLocator=new fn,2===arguments.length){const t=arguments[0],e=arguments[1];ls.constructor_.call(this,t,e,gn.OGC_SFS_BOUNDARY_RULE)}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];this._argIndex=t,this._parentGeom=e,this._boundaryNodeRule=n,null!==e&&this.add(e)}}static determineBoundary(t,e){return t.isInBoundary(e)?Qt.BOUNDARY:Qt.INTERIOR}insertBoundaryPoint(t,e){const n=this._nodes.addNode(e).getLabel();let s=1,i=Qt.NONE;i=n.getLocation(t,Mn.ON),i===Qt.BOUNDARY&&s++;const r=ls.determineBoundary(this._boundaryNodeRule,s);n.setLocation(t,r)}computeSelfNodes(){if(2===arguments.length){const t=arguments[0],e=arguments[1];return this.computeSelfNodes(t,e,!1)}if(3===arguments.length){const t=arguments[1],e=arguments[2],n=new An(arguments[0],!0,!1);n.setIsDoneIfProperInt(e);const s=this.createEdgeSetIntersector(),i=this._parentGeom instanceof ut||this._parentGeom instanceof it||this._parentGeom instanceof ft,r=t||!i;return s.computeIntersections(this._edges,n,r),this.addSelfIntersectionNodes(this._argIndex),n}}computeSplitEdges(t){for(let e=this._edges.iterator();e.hasNext();){e.next().eiList.addSplitEdges(t)}}computeEdgeIntersections(t,e,n){const s=new An(e,n,!0);s.setBoundaryNodes(this.getBoundaryNodes(),t.getBoundaryNodes());return this.createEdgeSetIntersector().computeIntersections(this._edges,t._edges,s),s}getGeometry(){return this._parentGeom}getBoundaryNodeRule(){return this._boundaryNodeRule}hasTooFewPoints(){return this._hasTooFewPoints}addPoint(){if(arguments[0]instanceof tt){const t=arguments[0].getCoordinate();this.insertPoint(this._argIndex,t,Qt.INTERIOR)}else if(arguments[0]instanceof m){const t=arguments[0];this.insertPoint(this._argIndex,t,Qt.INTERIOR)}}addPolygon(t){this.addPolygonRing(t.getExteriorRing(),Qt.EXTERIOR,Qt.INTERIOR);for(let e=0;e<t.getNumInteriorRing();e++){const n=t.getInteriorRingN(e);this.addPolygonRing(n,Qt.INTERIOR,Qt.EXTERIOR)}}addEdge(t){this.insertEdge(t);const e=t.getCoordinates();this.insertPoint(this._argIndex,e[0],Qt.BOUNDARY),this.insertPoint(this._argIndex,e[e.length-1],Qt.BOUNDARY)}addLineString(t){const e=dt.removeRepeatedPoints(t.getCoordinates());if(e.length<2)return this._hasTooFewPoints=!0,this._invalidPoint=e[0],null;const n=new $n(e,new qn(this._argIndex,Qt.INTERIOR));this._lineEdgeMap.put(t,n),this.insertEdge(n),g.isTrue(e.length>=2,"found LineString with single point"),this.insertBoundaryPoint(this._argIndex,e[0]),this.insertBoundaryPoint(this._argIndex,e[e.length-1])}getInvalidPoint(){return this._invalidPoint}getBoundaryPoints(){const t=this.getBoundaryNodes(),e=new Array(t.size()).fill(null);let n=0;for(let s=t.iterator();s.hasNext();){const t=s.next();e[n++]=t.getCoordinate().copy()}return e}getBoundaryNodes(){return null===this._boundaryNodes&&(this._boundaryNodes=this._nodes.getBoundaryNodes(this._argIndex)),this._boundaryNodes}addSelfIntersectionNode(t,e,n){if(this.isBoundaryNode(t,e))return null;n===Qt.BOUNDARY&&this._useBoundaryDeterminationRule?this.insertBoundaryPoint(t,e):this.insertPoint(t,e,n)}addPolygonRing(t,e,n){if(t.isEmpty())return null;const s=dt.removeRepeatedPoints(t.getCoordinates());if(s.length<4)return this._hasTooFewPoints=!0,this._invalidPoint=s[0],null;let i=e,r=n;G.isCCW(s)&&(i=n,r=e);const o=new $n(s,new qn(this._argIndex,Qt.BOUNDARY,i,r));this._lineEdgeMap.put(t,o),this.insertEdge(o),this.insertPoint(this._argIndex,s[0],Qt.BOUNDARY)}insertPoint(t,e,n){const s=this._nodes.addNode(e),i=s.getLabel();null===i?s._label=new qn(t,n):i.setLocation(t,n)}createEdgeSetIntersector(){return new Fn}addSelfIntersectionNodes(t){for(let e=this._edges.iterator();e.hasNext();){const n=e.next(),s=n.getLabel().getLocation(t);for(let e=n.eiList.iterator();e.hasNext();){const n=e.next();this.addSelfIntersectionNode(t,n.coord,s)}}}add(){if(!(1===arguments.length&&arguments[0]instanceof X))return super.add.apply(this,arguments);{const t=arguments[0];if(t.isEmpty())return null;if(t instanceof ft&&(this._useBoundaryDeterminationRule=!1),t instanceof it)this.addPolygon(t);else if(t instanceof J)this.addLineString(t);else if(t instanceof tt)this.addPoint(t);else if(t instanceof ht)this.addCollection(t);else if(t instanceof wt)this.addCollection(t);else if(t instanceof ft)this.addCollection(t);else{if(!(t instanceof ct))throw new j(t.getGeometryType());this.addCollection(t)}}}addCollection(t){for(let e=0;e<t.getNumGeometries();e++){const n=t.getGeometryN(e);this.add(n)}}locate(t){return I(this._parentGeom,st)&&this._parentGeom.getNumGeometries()>50?(null===this._areaPtLocator&&(this._areaPtLocator=new ze(this._parentGeom)),this._areaPtLocator.locate(t)):this._ptLocator.locate(t,this._parentGeom)}findEdge(){if(1===arguments.length&&arguments[0]instanceof J){const t=arguments[0];return this._lineEdgeMap.get(t)}return super.findEdge.apply(this,arguments)}}var as=Object.freeze({__proto__:null,GeometryGraph:ls});class cs{visit(t){}}class hs{constructor(){hs.constructor_.apply(this,arguments)}static constructor_(){if(this._p=null,this._data=null,this._left=null,this._right=null,this._count=null,2===arguments.length){const t=arguments[0],e=arguments[1];this._p=new m(t),this._left=null,this._right=null,this._count=1,this._data=e}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];this._p=new m(t,e),this._left=null,this._right=null,this._count=1,this._data=n}}isRepeated(){return this._count>1}getRight(){return this._right}getCoordinate(){return this._p}setLeft(t){this._left=t}getX(){return this._p.x}getData(){return this._data}getCount(){return this._count}getLeft(){return this._left}getY(){return this._p.y}increment(){this._count=this._count+1}setRight(t){this._right=t}}class us{constructor(){us.constructor_.apply(this,arguments)}static constructor_(){if(this._root=null,this._numberOfNodes=null,this._tolerance=null,0===arguments.length)us.constructor_.call(this,0);else if(1===arguments.length){const t=arguments[0];this._tolerance=t}}static toCoordinates(){if(1===arguments.length){const t=arguments[0];return us.toCoordinates(t,!1)}if(2===arguments.length){const t=arguments[0],e=arguments[1],n=new R;for(let s=t.iterator();s.hasNext();){const t=s.next(),i=e?t.getCount():1;for(let e=0;e<i;e++)n.add(t.getCoordinate(),!0)}return n.toCoordinateArray()}}insert(){if(1===arguments.length){const t=arguments[0];return this.insert(t,null)}if(2===arguments.length){const t=arguments[0],e=arguments[1];if(null===this._root)return this._root=new hs(t,e),this._root;if(this._tolerance>0){const e=this.findBestMatchNode(t);if(null!==e)return e.increment(),e}return this.insertExact(t,e)}}query(){if(1===arguments.length){const t=arguments[0],e=new L;return this.query(t,e),e}if(2===arguments.length)if(arguments[0]instanceof O&&I(arguments[1],w)){const t=arguments[0],e=arguments[1];this.queryNode(this._root,t,!0,new class{get interfaces_(){return[cs]}visit(t){e.add(t)}})}else if(arguments[0]instanceof O&&I(arguments[1],cs)){const t=arguments[0],e=arguments[1];this.queryNode(this._root,t,!0,e)}}queryNode(t,e,n,s){if(null===t)return null;let i=null,r=null,o=null;n?(i=e.getMinX(),r=e.getMaxX(),o=t.getX()):(i=e.getMinY(),r=e.getMaxY(),o=t.getY());const l=o<=r;i<o&&this.queryNode(t.getLeft(),e,!n,s),e.contains(t.getCoordinate())&&s.visit(t),l&&this.queryNode(t.getRight(),e,!n,s)}findBestMatchNode(t){const e=new gs(t,this._tolerance);return this.query(e.queryEnvelope(),e),e.getNode()}isEmpty(){return null===this._root}insertExact(t,e){let n=this._root,s=this._root,i=!0,r=!0;for(;null!==n;){if(null!==n){if(t.distance(n.getCoordinate())<=this._tolerance)return n.increment(),n}r=i?t.x<n.getX():t.y<n.getY(),s=n,n=r?n.getLeft():n.getRight(),i=!i}this._numberOfNodes=this._numberOfNodes+1;const o=new hs(t,e);return r?s.setLeft(o):s.setRight(o),o}}class gs{constructor(){gs.constructor_.apply(this,arguments)}static constructor_(){this._tolerance=null,this._matchNode=null,this._matchDist=0,this._p=null;const t=arguments[0],e=arguments[1];this._p=t,this._tolerance=e}visit(t){const e=this._p.distance(t.getCoordinate());if(!(e<=this._tolerance))return null;let n=!1;(null===this._matchNode||e<this._matchDist||null!==this._matchNode&&e===this._matchDist&&t.getCoordinate().compareTo(this._matchNode.getCoordinate())<1)&&(n=!0),n&&(this._matchNode=t,this._matchDist=e)}queryEnvelope(){const t=new O(this._p);return t.expandBy(this._tolerance),t}getNode(){return this._matchNode}get interfaces_(){return[cs]}}us.BestMatchVisitor=gs;var ds=Object.freeze({__proto__:null,KdTree:us});class _s{constructor(){_s.constructor_.apply(this,arguments)}static constructor_(){this._items=new L,this._subnode=new Array(4).fill(null)}static getSubnodeIndex(t,e,n){let s=-1;return t.getMinX()>=e&&(t.getMinY()>=n&&(s=3),t.getMaxY()<=n&&(s=1)),t.getMaxX()<=e&&(t.getMinY()>=n&&(s=2),t.getMaxY()<=n&&(s=0)),s}hasChildren(){for(let t=0;t<4;t++)if(null!==this._subnode[t])return!0;return!1}isPrunable(){return!(this.hasChildren()||this.hasItems())}addAllItems(t){t.addAll(this._items);for(let e=0;e<4;e++)null!==this._subnode[e]&&this._subnode[e].addAllItems(t);return t}getNodeCount(){let t=0;for(let e=0;e<4;e++)null!==this._subnode[e]&&(t+=this._subnode[e].size());return t+1}size(){let t=0;for(let e=0;e<4;e++)null!==this._subnode[e]&&(t+=this._subnode[e].size());return t+this._items.size()}addAllItemsFromOverlapping(t,e){if(!this.isSearchMatch(t))return null;e.addAll(this._items);for(let n=0;n<4;n++)null!==this._subnode[n]&&this._subnode[n].addAllItemsFromOverlapping(t,e)}visitItems(t,e){for(let t=this._items.iterator();t.hasNext();)e.visitItem(t.next())}hasItems(){return!this._items.isEmpty()}remove(t,e){if(!this.isSearchMatch(t))return!1;let n=!1;for(let s=0;s<4;s++)if(null!==this._subnode[s]&&(n=this._subnode[s].remove(t,e),n)){this._subnode[s].isPrunable()&&(this._subnode[s]=null);break}return n||(n=this._items.remove(e),n)}visit(t,e){if(!this.isSearchMatch(t))return null;this.visitItems(t,e);for(let n=0;n<4;n++)null!==this._subnode[n]&&this._subnode[n].visit(t,e)}getItems(){return this._items}depth(){let t=0;for(let e=0;e<4;e++)if(null!==this._subnode[e]){const n=this._subnode[e].depth();n>t&&(t=n)}return t+1}isEmpty(){let t=!0;if(this._items.isEmpty()){for(let e=0;e<4;e++)if(null!==this._subnode[e]&&!this._subnode[e].isEmpty()){t=!1;break}}else t=!1;return t}add(t){this._items.add(t)}get interfaces_(){return[c]}}function ps(){}ps.exponent=function(t){return function(t,e){let n,s,i,r;const o={32:{d:127,c:128,b:0,a:0},64:{d:32752,c:0,b:0,a:0}},l={32:8,64:11}[t];r||(n=e<0||1/e<0,isFinite(e)||(r=o[t],n&&(r.d+=1<<t/4-1),s=Math.pow(2,l)-1,i=0));if(!r){for(s={32:127,64:1023}[t],i=Math.abs(e);i>=2;)s++,i/=2;for(;i<1&&s>0;)s--,i*=2;s<=0&&(i/=2),32===t&&s>254&&(r={d:n?255:127,c:128,b:0,a:0},s=Math.pow(2,l)-1,i=0)}return s}(64,t)-1023},ps.powerOf2=function(t){return Math.pow(2,t)};class ms{constructor(){ms.constructor_.apply(this,arguments)}static constructor_(){this._pt=new m,this._level=0,this._env=null;const t=arguments[0];this.computeKey(t)}static computeQuadLevel(t){const e=t.getWidth(),n=t.getHeight(),s=e>n?e:n;return ps.exponent(s)+1}getLevel(){return this._level}computeKey(){if(1===arguments.length){const t=arguments[0];for(this._level=ms.computeQuadLevel(t),this._env=new O,this.computeKey(this._level,t);!this._env.contains(t);)this._level+=1,this.computeKey(this._level,t)}else if(2===arguments.length){const t=arguments[0],e=arguments[1],n=ps.powerOf2(t);this._pt.x=Math.floor(e.getMinX()/n)*n,this._pt.y=Math.floor(e.getMinY()/n)*n,this._env.init(this._pt.x,this._pt.x+n,this._pt.y,this._pt.y+n)}}getEnvelope(){return this._env}getCentre(){return new m((this._env.getMinX()+this._env.getMaxX())/2,(this._env.getMinY()+this._env.getMaxY())/2)}getPoint(){return this._pt}}class fs extends _s{constructor(){super(),fs.constructor_.apply(this,arguments)}static constructor_(){this._env=null,this._centrex=null,this._centrey=null,this._level=null;const t=arguments[0],e=arguments[1];this._env=t,this._level=e,this._centrex=(t.getMinX()+t.getMaxX())/2,this._centrey=(t.getMinY()+t.getMaxY())/2}static createNode(t){const e=new ms(t);return new fs(e.getEnvelope(),e.getLevel())}static createExpanded(t,e){const n=new O(e);null!==t&&n.expandToInclude(t._env);const s=fs.createNode(n);return null!==t&&s.insertNode(t),s}find(t){const e=_s.getSubnodeIndex(t,this._centrex,this._centrey);if(-1===e)return this;if(null!==this._subnode[e]){return this._subnode[e].find(t)}return this}isSearchMatch(t){return null!==t&&this._env.intersects(t)}getSubnode(t){return null===this._subnode[t]&&(this._subnode[t]=this.createSubnode(t)),this._subnode[t]}getEnvelope(){return this._env}getNode(t){const e=_s.getSubnodeIndex(t,this._centrex,this._centrey);if(-1!==e){return this.getSubnode(e).getNode(t)}return this}createSubnode(t){let e=0,n=0,s=0,i=0;switch(t){case 0:e=this._env.getMinX(),n=this._centrex,s=this._env.getMinY(),i=this._centrey;break;case 1:e=this._centrex,n=this._env.getMaxX(),s=this._env.getMinY(),i=this._centrey;break;case 2:e=this._env.getMinX(),n=this._centrex,s=this._centrey,i=this._env.getMaxY();break;case 3:e=this._centrex,n=this._env.getMaxX(),s=this._centrey,i=this._env.getMaxY()}const r=new O(e,n,s,i);return new fs(r,this._level-1)}insertNode(t){g.isTrue(null===this._env||this._env.contains(t._env));const e=_s.getSubnodeIndex(t._env,this._centrex,this._centrey);if(t._level===this._level-1)this._subnode[e]=t;else{const n=this.createSubnode(e);n.insertNode(t),this._subnode[e]=n}}}class ys{static isZeroWidth(t,e){const n=e-t;if(0===n)return!0;const s=n/Math.max(Math.abs(t),Math.abs(e));return ps.exponent(s)<=ys.MIN_BINARY_EXPONENT}}ys.MIN_BINARY_EXPONENT=-50;class xs extends _s{constructor(){super()}insert(t,e){const n=_s.getSubnodeIndex(t,xs.origin.x,xs.origin.y);if(-1===n)return this.add(e),null;const s=this._subnode[n];if(null===s||!s.getEnvelope().contains(t)){const e=fs.createExpanded(s,t);this._subnode[n]=e}this.insertContained(this._subnode[n],t,e)}isSearchMatch(t){return!0}insertContained(t,e,n){g.isTrue(t.getEnvelope().contains(e));const s=ys.isZeroWidth(e.getMinX(),e.getMaxX()),i=ys.isZeroWidth(e.getMinY(),e.getMaxY());let r=null;r=s||i?t.find(e):t.getNode(e),r.add(n)}}xs.origin=new m(0,0);class Es{insert(t,e){}remove(t,e){}query(){}}class Is{constructor(){Is.constructor_.apply(this,arguments)}static constructor_(){this._root=null,this._minExtent=1,this._root=new xs}static ensureExtent(t,e){let n=t.getMinX(),s=t.getMaxX(),i=t.getMinY(),r=t.getMaxY();return n!==s&&i!==r?t:(n===s&&(n-=e/2,s+=e/2),i===r&&(i-=e/2,r+=e/2),new O(n,s,i,r))}size(){return null!==this._root?this._root.size():0}insert(t,e){this.collectStats(t);const n=Is.ensureExtent(t,this._minExtent);this._root.insert(n,e)}query(){if(1===arguments.length){const t=arguments[0],e=new Ye;return this.query(t,e),e.getItems()}if(2===arguments.length){const t=arguments[0],e=arguments[1];this._root.visit(t,e)}}queryAll(){const t=new L;return this._root.addAllItems(t),t}remove(t,e){const n=Is.ensureExtent(t,this._minExtent);return this._root.remove(n,e)}collectStats(t){const e=t.getWidth();e<this._minExtent&&e>0&&(this._minExtent=e);const n=t.getHeight();n<this._minExtent&&n>0&&(this._minExtent=n)}depth(){return null!==this._root?this._root.depth():0}isEmpty(){return null===this._root||this._root.isEmpty()}get interfaces_(){return[Es,c]}}var Ns=Object.freeze({__proto__:null,Quadtree:Is});class Ss{getBounds(){}}class ws{constructor(){ws.constructor_.apply(this,arguments)}static constructor_(){this._bounds=null,this._item=null;const t=arguments[0],e=arguments[1];this._bounds=t,this._item=e}getItem(){return this._item}getBounds(){return this._bounds}get interfaces_(){return[Ss,c]}}class Cs{constructor(){Cs.constructor_.apply(this,arguments)}static constructor_(){this._size=null,this._items=null,this._size=0,this._items=new L,this._items.add(null)}poll(){if(this.isEmpty())return null;const t=this._items.get(1);return this._items.set(1,this._items.get(this._size)),this._size-=1,this.reorder(1),t}size(){return this._size}reorder(t){let e=null;const n=this._items.get(t);for(;2*t<=this._size&&(e=2*t,e!==this._size&&this._items.get(e+1).compareTo(this._items.get(e))<0&&e++,this._items.get(e).compareTo(n)<0);t=e)this._items.set(t,this._items.get(e));this._items.set(t,n)}clear(){this._size=0,this._items.clear()}peek(){if(this.isEmpty())return null;return this._items.get(1)}isEmpty(){return 0===this._size}add(t){this._items.add(null),this._size+=1;let e=this._size;for(this._items.set(0,t);t.compareTo(this._items.get(Math.trunc(e/2)))<0;e/=2)this._items.set(e,this._items.get(Math.trunc(e/2)));this._items.set(e,t)}}class Ls{constructor(){Ls.constructor_.apply(this,arguments)}static constructor_(){if(this._childBoundables=new L,this._bounds=null,this._level=null,0===arguments.length);else if(1===arguments.length){const t=arguments[0];this._level=t}}getLevel(){return this._level}size(){return this._childBoundables.size()}getChildBoundables(){return this._childBoundables}addChildBoundable(t){g.isTrue(null===this._bounds),this._childBoundables.add(t)}isEmpty(){return this._childBoundables.isEmpty()}getBounds(){return null===this._bounds&&(this._bounds=this.computeBounds()),this._bounds}get interfaces_(){return[Ss,c]}}class Ts{static maxDistance(t,e,n,s,i,r,o,l){let a=Ts.distance(t,e,i,r);return a=Math.max(a,Ts.distance(t,e,o,l)),a=Math.max(a,Ts.distance(n,s,i,r)),a=Math.max(a,Ts.distance(n,s,o,l)),a}static distance(t,e,n,s){const i=n-t,r=s-e;return Math.sqrt(i*i+r*r)}static maximumDistance(t,e){const n=Math.min(t.getMinX(),e.getMinX()),s=Math.min(t.getMinY(),e.getMinY()),i=Math.max(t.getMaxX(),e.getMaxX()),r=Math.max(t.getMaxY(),e.getMaxY());return Ts.distance(n,s,i,r)}static minMaxDistance(t,e){const n=t.getMinX(),s=t.getMinY(),i=t.getMaxX(),r=t.getMaxY(),o=e.getMinX(),l=e.getMinY(),a=e.getMaxX(),c=e.getMaxY();let h=Ts.maxDistance(n,s,n,r,o,l,o,c);return h=Math.min(h,Ts.maxDistance(n,s,n,r,o,l,a,l)),h=Math.min(h,Ts.maxDistance(n,s,n,r,a,c,o,c)),h=Math.min(h,Ts.maxDistance(n,s,n,r,a,c,a,l)),h=Math.min(h,Ts.maxDistance(n,s,i,s,o,l,o,c)),h=Math.min(h,Ts.maxDistance(n,s,i,s,o,l,a,l)),h=Math.min(h,Ts.maxDistance(n,s,i,s,a,c,o,c)),h=Math.min(h,Ts.maxDistance(n,s,i,s,a,c,a,l)),h=Math.min(h,Ts.maxDistance(i,r,n,r,o,l,o,c)),h=Math.min(h,Ts.maxDistance(i,r,n,r,o,l,a,l)),h=Math.min(h,Ts.maxDistance(i,r,n,r,a,c,o,c)),h=Math.min(h,Ts.maxDistance(i,r,n,r,a,c,a,l)),h=Math.min(h,Ts.maxDistance(i,r,i,s,o,l,o,c)),h=Math.min(h,Ts.maxDistance(i,r,i,s,o,l,a,l)),h=Math.min(h,Ts.maxDistance(i,r,i,s,a,c,o,c)),h=Math.min(h,Ts.maxDistance(i,r,i,s,a,c,a,l)),h}}class Rs{constructor(){Rs.constructor_.apply(this,arguments)}static constructor_(){this._boundable1=null,this._boundable2=null,this._distance=null,this._itemDistance=null;const t=arguments[0],e=arguments[1],n=arguments[2];this._boundable1=t,this._boundable2=e,this._itemDistance=n,this._distance=this.distance()}static area(t){return t.getBounds().getArea()}static isComposite(t){return t instanceof Ls}maximumDistance(){return Ts.maximumDistance(this._boundable1.getBounds(),this._boundable2.getBounds())}expandToQueue(t,e){const n=Rs.isComposite(this._boundable1),i=Rs.isComposite(this._boundable2);if(n&&i)return Rs.area(this._boundable1)>Rs.area(this._boundable2)?(this.expand(this._boundable1,this._boundable2,!1,t,e),null):(this.expand(this._boundable2,this._boundable1,!0,t,e),null);if(n)return this.expand(this._boundable1,this._boundable2,!1,t,e),null;if(i)return this.expand(this._boundable2,this._boundable1,!0,t,e),null;throw new s("neither boundable is composite")}isLeaves(){return!(Rs.isComposite(this._boundable1)||Rs.isComposite(this._boundable2))}compareTo(t){const e=t;return this._distance<e._distance?-1:this._distance>e._distance?1:0}expand(t,e,n,s,i){for(let r=t.getChildBoundables().iterator();r.hasNext();){const t=r.next();let o=null;o=n?new Rs(e,t,this._itemDistance):new Rs(t,e,this._itemDistance),o.getDistance()<i&&s.add(o)}}getBoundable(t){return 0===t?this._boundable1:this._boundable2}getDistance(){return this._distance}distance(){return this.isLeaves()?this._itemDistance.distance(this._boundable1,this._boundable2):this._boundable1.getBounds().distance(this._boundable2.getBounds())}get interfaces_(){return[o]}}class Ps{constructor(){Ps.constructor_.apply(this,arguments)}static constructor_(){if(this._root=null,this._built=!1,this._itemBoundables=new L,this._nodeCapacity=null,0===arguments.length)Ps.constructor_.call(this,Ps.DEFAULT_NODE_CAPACITY);else if(1===arguments.length){const t=arguments[0];g.isTrue(t>1,"Node capacity must be greater than 1"),this._nodeCapacity=t}}static compareDoubles(t,e){return t>e?1:t<e?-1:0}queryInternal(){if(I(arguments[2],De)&&arguments[0]instanceof Object&&arguments[1]instanceof Ls){const t=arguments[0],e=arguments[2],n=arguments[1].getChildBoundables();for(let s=0;s<n.size();s++){const i=n.get(s);this.getIntersectsOp().intersects(i.getBounds(),t)&&(i instanceof Ls?this.queryInternal(t,i,e):i instanceof ws?e.visitItem(i.getItem()):g.shouldNeverReachHere())}}else if(I(arguments[2],w)&&arguments[0]instanceof Object&&arguments[1]instanceof Ls){const t=arguments[0],e=arguments[2],n=arguments[1].getChildBoundables();for(let s=0;s<n.size();s++){const i=n.get(s);this.getIntersectsOp().intersects(i.getBounds(),t)&&(i instanceof Ls?this.queryInternal(t,i,e):i instanceof ws?e.add(i.getItem()):g.shouldNeverReachHere())}}}getNodeCapacity(){return this._nodeCapacity}lastNode(t){return t.get(t.size()-1)}size(){if(0===arguments.length)return this.isEmpty()?0:(this.build(),this.size(this._root));if(1===arguments.length){let t=0;for(let e=arguments[0].getChildBoundables().iterator();e.hasNext();){const n=e.next();n instanceof Ls?t+=this.size(n):n instanceof ws&&(t+=1)}return t}}removeItem(t,e){let n=null;for(let s=t.getChildBoundables().iterator();s.hasNext();){const t=s.next();t instanceof ws&&t.getItem()===e&&(n=t)}return null!==n&&(t.getChildBoundables().remove(n),!0)}itemsTree(){if(0===arguments.length){this.build();const t=this.itemsTree(this._root);return null===t?new L:t}if(1===arguments.length){const t=arguments[0],e=new L;for(let n=t.getChildBoundables().iterator();n.hasNext();){const t=n.next();if(t instanceof Ls){const n=this.itemsTree(t);null!==n&&e.add(n)}else t instanceof ws?e.add(t.getItem()):g.shouldNeverReachHere()}return e.size()<=0?null:e}}insert(t,e){g.isTrue(!this._built,"Cannot insert items into an STR packed R-tree after it has been built."),this._itemBoundables.add(new ws(t,e))}boundablesAtLevel(){if(1===arguments.length){const t=arguments[0],e=new L;return this.boundablesAtLevel(t,this._root,e),e}if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];if(g.isTrue(t>-2),e.getLevel()===t)return n.add(e),null;for(let s=e.getChildBoundables().iterator();s.hasNext();){const e=s.next();e instanceof Ls?this.boundablesAtLevel(t,e,n):(g.isTrue(e instanceof ws),-1===t&&n.add(e))}return null}}query(){if(1===arguments.length){const t=arguments[0];this.build();const e=new L;return this.isEmpty()||this.getIntersectsOp().intersects(this._root.getBounds(),t)&&this.queryInternal(t,this._root,e),e}if(2===arguments.length){const t=arguments[0],e=arguments[1];if(this.build(),this.isEmpty())return null;this.getIntersectsOp().intersects(this._root.getBounds(),t)&&this.queryInternal(t,this._root,e)}}build(){if(this._built)return null;this._root=this._itemBoundables.isEmpty()?this.createNode(0):this.createHigherLevels(this._itemBoundables,-1),this._itemBoundables=null,this._built=!0}getRoot(){return this.build(),this._root}remove(){if(2===arguments.length){const t=arguments[0],e=arguments[1];return this.build(),!!this.getIntersectsOp().intersects(this._root.getBounds(),t)&&this.remove(t,this._root,e)}if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];let s=this.removeItem(e,n);if(s)return!0;let i=null;for(let r=e.getChildBoundables().iterator();r.hasNext();){const e=r.next();if(this.getIntersectsOp().intersects(e.getBounds(),t)&&(e instanceof Ls&&(s=this.remove(t,e,n),s))){i=e;break}}return null!==i&&i.getChildBoundables().isEmpty()&&e.getChildBoundables().remove(i),s}}createHigherLevels(t,e){g.isTrue(!t.isEmpty());const n=this.createParentBoundables(t,e+1);return 1===n.size()?n.get(0):this.createHigherLevels(n,e+1)}depth(){if(0===arguments.length)return this.isEmpty()?0:(this.build(),this.depth(this._root));if(1===arguments.length){let t=0;for(let e=arguments[0].getChildBoundables().iterator();e.hasNext();){const n=e.next();if(n instanceof Ls){const e=this.depth(n);e>t&&(t=e)}}return t+1}}createParentBoundables(t,e){g.isTrue(!t.isEmpty());const n=new L;n.add(this.createNode(e));const s=new L(t);xe.sort(s,this.getComparator());for(let t=s.iterator();t.hasNext();){const s=t.next();this.lastNode(n).getChildBoundables().size()===this.getNodeCapacity()&&n.add(this.createNode(e)),this.lastNode(n).addChildBoundable(s)}return n}isEmpty(){return this._built?this._root.isEmpty():this._itemBoundables.isEmpty()}get interfaces_(){return[c]}}Ps.IntersectsOp=function(){},Ps.DEFAULT_NODE_CAPACITY=10;class Os{distance(t,e){}}class vs extends Ps{constructor(){super(),vs.constructor_.apply(this,arguments)}static constructor_(){if(0===arguments.length)vs.constructor_.call(this,vs.DEFAULT_NODE_CAPACITY);else if(1===arguments.length){const t=arguments[0];Ps.constructor_.call(this,t)}}static centreX(t){return vs.avg(t.getMinX(),t.getMaxX())}static avg(t,e){return(t+e)/2}static getItems(t){const e=new Array(t.size()).fill(null);let n=0;for(;!t.isEmpty();){const s=t.poll();e[n]=s.getBoundable(0).getItem(),n++}return e}static centreY(t){return vs.avg(t.getMinY(),t.getMaxY())}createParentBoundablesFromVerticalSlices(t,e){g.isTrue(t.length>0);const n=new L;for(let s=0;s<t.length;s++)n.addAll(this.createParentBoundablesFromVerticalSlice(t[s],e));return n}nearestNeighbourK(){if(2===arguments.length){const t=arguments[0],e=arguments[1];return this.nearestNeighbourK(t,r.POSITIVE_INFINITY,e)}if(3===arguments.length){const t=arguments[0],e=arguments[2];let n=arguments[1];const s=new Cs;s.add(t);const i=new Cs;for(;!s.isEmpty()&&n>=0;){const t=s.poll(),r=t.getDistance();if(r>=n)break;if(t.isLeaves())if(i.size()<e)i.add(t);else{i.peek().getDistance()>r&&(i.poll(),i.add(t));n=i.peek().getDistance()}else t.expandToQueue(s,n)}return vs.getItems(i)}}createNode(t){return new Ms(t)}size(){return 0===arguments.length?super.size.call(this):super.size.apply(this,arguments)}insert(){if(!(2===arguments.length&&arguments[1]instanceof Object&&arguments[0]instanceof O))return super.insert.apply(this,arguments);{const t=arguments[0],e=arguments[1];if(t.isNull())return null;super.insert.call(this,t,e)}}getIntersectsOp(){return vs.intersectsOp}verticalSlices(t,e){const n=Math.trunc(Math.ceil(t.size()/e)),s=new Array(e).fill(null),i=t.iterator();for(let t=0;t<e;t++){s[t]=new L;let e=0;for(;i.hasNext()&&e<n;){const n=i.next();s[t].add(n),e++}}return s}query(){if(1===arguments.length){const t=arguments[0];return super.query.call(this,t)}if(2===arguments.length){const t=arguments[0],e=arguments[1];super.query.call(this,t,e)}}getComparator(){return vs.yComparator}createParentBoundablesFromVerticalSlice(t,e){return super.createParentBoundables.call(this,t,e)}remove(){if(2===arguments.length&&arguments[1]instanceof Object&&arguments[0]instanceof O){const t=arguments[0],e=arguments[1];return super.remove.call(this,t,e)}return super.remove.apply(this,arguments)}depth(){return 0===arguments.length?super.depth.call(this):super.depth.apply(this,arguments)}createParentBoundables(t,e){g.isTrue(!t.isEmpty());const n=Math.trunc(Math.ceil(t.size()/this.getNodeCapacity())),s=new L(t);xe.sort(s,vs.xComparator);const i=this.verticalSlices(s,Math.trunc(Math.ceil(Math.sqrt(n))));return this.createParentBoundablesFromVerticalSlices(i,e)}nearestNeighbour(){if(1===arguments.length){if(I(arguments[0],Os)){const t=arguments[0];if(this.isEmpty())return null;const e=new Rs(this.getRoot(),this.getRoot(),t);return this.nearestNeighbour(e)}if(arguments[0]instanceof Rs){const t=arguments[0];let e=r.POSITIVE_INFINITY,n=null;const s=new Cs;for(s.add(t);!s.isEmpty()&&e>0;){const t=s.poll(),i=t.getDistance();if(i>=e)break;t.isLeaves()?(e=i,n=t):t.expandToQueue(s,e)}return null===n?null:[n.getBoundable(0).getItem(),n.getBoundable(1).getItem()]}}else{if(2===arguments.length){const t=arguments[0],e=arguments[1];if(this.isEmpty()||t.isEmpty())return null;const n=new Rs(this.getRoot(),t.getRoot(),e);return this.nearestNeighbour(n)}if(3===arguments.length){const t=arguments[2],e=new ws(arguments[0],arguments[1]),n=new Rs(this.getRoot(),e,t);return this.nearestNeighbour(n)[0]}if(4===arguments.length){const t=arguments[2],e=arguments[3],n=new ws(arguments[0],arguments[1]),s=new Rs(this.getRoot(),n,t);return this.nearestNeighbourK(s,e)}}}isWithinDistance(){if(2===arguments.length){const t=arguments[0],e=arguments[1];let n=r.POSITIVE_INFINITY;const s=new Cs;for(s.add(t);!s.isEmpty();){const t=s.poll(),i=t.getDistance();if(i>e)return!1;if(t.maximumDistance()<=e)return!0;if(t.isLeaves()){if(n=i,n<=e)return!0}else t.expandToQueue(s,n)}return!1}if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=new Rs(this.getRoot(),t.getRoot(),e);return this.isWithinDistance(s,n)}}get interfaces_(){return[Es,c]}}class Ms extends Ls{constructor(){super(),Ms.constructor_.apply(this,arguments)}static constructor_(){const t=arguments[0];Ls.constructor_.call(this,t)}computeBounds(){let t=null;for(let e=this.getChildBoundables().iterator();e.hasNext();){const n=e.next();null===t?t=new O(n.getBounds()):t.expandToInclude(n.getBounds())}return t}}vs.STRtreeNode=Ms,vs.xComparator=new class{get interfaces_(){return[a]}compare(t,e){return Ps.compareDoubles(vs.centreX(t.getBounds()),vs.centreX(e.getBounds()))}},vs.yComparator=new class{get interfaces_(){return[a]}compare(t,e){return Ps.compareDoubles(vs.centreY(t.getBounds()),vs.centreY(e.getBounds()))}},vs.intersectsOp=new class{get interfaces_(){return[IntersectsOp]}intersects(t,e){return t.intersects(e)}},vs.DEFAULT_NODE_CAPACITY=10;var bs=Object.freeze({__proto__:null,STRtree:vs}),Ds=Object.freeze({__proto__:null,kdtree:ds,quadtree:Ns,strtree:bs});const As=["Point","MultiPoint","LineString","MultiLineString","Polygon","MultiPolygon"];class Fs{constructor(t){this.geometryFactory=t||new Ct}read(t){let e;e="string"==typeof t?JSON.parse(t):t;const n=e.type;if(!Gs[n])throw new Error("Unknown GeoJSON type: "+e.type);return-1!==As.indexOf(n)?Gs[n].call(this,e.coordinates):"GeometryCollection"===n?Gs[n].call(this,e.geometries):Gs[n].call(this,e)}write(t){const e=t.getGeometryType();if(!qs[e])throw new Error("Geometry is not supported");return qs[e].call(this,t)}}const Gs={Feature:function(t){const e={};for(const n in t)e[n]=t[n];if(t.geometry){const n=t.geometry.type;if(!Gs[n])throw new Error("Unknown GeoJSON type: "+t.type);e.geometry=this.read(t.geometry)}return t.bbox&&(e.bbox=Gs.bbox.call(this,t.bbox)),e},FeatureCollection:function(t){const e={};if(t.features){e.features=[];for(let n=0;n<t.features.length;++n)e.features.push(this.read(t.features[n]))}return t.bbox&&(e.bbox=this.parse.bbox.call(this,t.bbox)),e},coordinates:function(t){const e=[];for(let n=0;n<t.length;++n){const s=t[n];e.push(new m(s[0],s[1]))}return e},bbox:function(t){return this.geometryFactory.createLinearRing([new m(t[0],t[1]),new m(t[2],t[1]),new m(t[2],t[3]),new m(t[0],t[3]),new m(t[0],t[1])])},Point:function(t){const e=new m(...t);return this.geometryFactory.createPoint(e)},MultiPoint:function(t){const e=[];for(let n=0;n<t.length;++n)e.push(Gs.Point.call(this,t[n]));return this.geometryFactory.createMultiPoint(e)},LineString:function(t){const e=Gs.coordinates.call(this,t);return this.geometryFactory.createLineString(e)},MultiLineString:function(t){const e=[];for(let n=0;n<t.length;++n)e.push(Gs.LineString.call(this,t[n]));return this.geometryFactory.createMultiLineString(e)},Polygon:function(t){const e=Gs.coordinates.call(this,t[0]),n=this.geometryFactory.createLinearRing(e),s=[];for(let e=1;e<t.length;++e){const n=t[e],i=Gs.coordinates.call(this,n),r=this.geometryFactory.createLinearRing(i);s.push(r)}return this.geometryFactory.createPolygon(n,s)},MultiPolygon:function(t){const e=[];for(let n=0;n<t.length;++n){const s=t[n];e.push(Gs.Polygon.call(this,s))}return this.geometryFactory.createMultiPolygon(e)},GeometryCollection:function(t){const e=[];for(let n=0;n<t.length;++n){const s=t[n];e.push(this.read(s))}return this.geometryFactory.createGeometryCollection(e)}},qs={coordinate:function(t){const e=[t.x,t.y];return t.z&&e.push(t.z),t.m&&e.push(t.m),e},Point:function(t){return{type:"Point",coordinates:qs.coordinate.call(this,t.getCoordinate())}},MultiPoint:function(t){const e=[];for(let n=0;n<t._geometries.length;++n){const s=t._geometries[n],i=qs.Point.call(this,s);e.push(i.coordinates)}return{type:"MultiPoint",coordinates:e}},LineString:function(t){const e=[],n=t.getCoordinates();for(let t=0;t<n.length;++t){const s=n[t];e.push(qs.coordinate.call(this,s))}return{type:"LineString",coordinates:e}},MultiLineString:function(t){const e=[];for(let n=0;n<t._geometries.length;++n){const s=t._geometries[n],i=qs.LineString.call(this,s);e.push(i.coordinates)}return{type:"MultiLineString",coordinates:e}},Polygon:function(t){const e=[],n=qs.LineString.call(this,t._shell);e.push(n.coordinates);for(let n=0;n<t._holes.length;++n){const s=t._holes[n],i=qs.LineString.call(this,s);e.push(i.coordinates)}return{type:"Polygon",coordinates:e}},MultiPolygon:function(t){const e=[];for(let n=0;n<t._geometries.length;++n){const s=t._geometries[n],i=qs.Polygon.call(this,s);e.push(i.coordinates)}return{type:"MultiPolygon",coordinates:e}},GeometryCollection:function(t){const e=[];for(let n=0;n<t._geometries.length;++n){const s=t._geometries[n],i=s.getGeometryType();e.push(qs[i].call(this,s))}return{type:"GeometryCollection",geometries:e}}};function Bs(t){return[t.x,t.y]}var Ys=Object.freeze({__proto__:null,GeoJSONReader:class{constructor(t){this.parser=new Fs(t||new Ct)}read(t){return this.parser.read(t)}},GeoJSONWriter:class{constructor(){this.parser=new Fs(this.geometryFactory)}write(t){return this.parser.write(t)}},OL3Parser:class{constructor(t,e){this.geometryFactory=t||new Ct,this.ol=e||"undefined"!=typeof ol&&ol}inject(t,e,n,s,i,r,o,l){this.ol={geom:{Point:t,LineString:e,LinearRing:n,Polygon:s,MultiPoint:i,MultiLineString:r,MultiPolygon:o,GeometryCollection:l}}}read(t){const e=this.ol;return t instanceof e.geom.Point?this.convertFromPoint(t):t instanceof e.geom.LineString?this.convertFromLineString(t):t instanceof e.geom.LinearRing?this.convertFromLinearRing(t):t instanceof e.geom.Polygon?this.convertFromPolygon(t):t instanceof e.geom.MultiPoint?this.convertFromMultiPoint(t):t instanceof e.geom.MultiLineString?this.convertFromMultiLineString(t):t instanceof e.geom.MultiPolygon?this.convertFromMultiPolygon(t):t instanceof e.geom.GeometryCollection?this.convertFromCollection(t):void 0}convertFromPoint(t){const e=t.getCoordinates();return this.geometryFactory.createPoint(new m(e[0],e[1]))}convertFromLineString(t){return this.geometryFactory.createLineString(t.getCoordinates().map((function(t){return new m(t[0],t[1])})))}convertFromLinearRing(t){return this.geometryFactory.createLinearRing(t.getCoordinates().map((function(t){return new m(t[0],t[1])})))}convertFromPolygon(t){const e=t.getLinearRings();let n=null;const s=[];for(let t=0;t<e.length;t++){const i=this.convertFromLinearRing(e[t]);0===t?n=i:s.push(i)}return this.geometryFactory.createPolygon(n,s)}convertFromMultiPoint(t){const e=t.getPoints().map((function(t){return this.convertFromPoint(t)}),this);return this.geometryFactory.createMultiPoint(e)}convertFromMultiLineString(t){const e=t.getLineStrings().map((function(t){return this.convertFromLineString(t)}),this);return this.geometryFactory.createMultiLineString(e)}convertFromMultiPolygon(t){const e=t.getPolygons().map((function(t){return this.convertFromPolygon(t)}),this);return this.geometryFactory.createMultiPolygon(e)}convertFromCollection(t){const e=t.getGeometries().map((function(t){return this.read(t)}),this);return this.geometryFactory.createGeometryCollection(e)}write(t){return"Point"===t.getGeometryType()?this.convertToPoint(t.getCoordinate()):"LineString"===t.getGeometryType()?this.convertToLineString(t):"LinearRing"===t.getGeometryType()?this.convertToLinearRing(t):"Polygon"===t.getGeometryType()?this.convertToPolygon(t):"MultiPoint"===t.getGeometryType()?this.convertToMultiPoint(t):"MultiLineString"===t.getGeometryType()?this.convertToMultiLineString(t):"MultiPolygon"===t.getGeometryType()?this.convertToMultiPolygon(t):"GeometryCollection"===t.getGeometryType()?this.convertToCollection(t):void 0}convertToPoint(t){return new this.ol.geom.Point([t.x,t.y])}convertToLineString(t){const e=t._points._coordinates.map(Bs);return new this.ol.geom.LineString(e)}convertToLinearRing(t){const e=t._points._coordinates.map(Bs);return new this.ol.geom.LinearRing(e)}convertToPolygon(t){const e=[t._shell._points._coordinates.map(Bs)];for(let n=0;n<t._holes.length;n++)e.push(t._holes[n]._points._coordinates.map(Bs));return new this.ol.geom.Polygon(e)}convertToMultiPoint(t){return new this.ol.geom.MultiPoint(t.getCoordinates().map(Bs))}convertToMultiLineString(t){const e=[];for(let n=0;n<t._geometries.length;n++)e.push(this.convertToLineString(t._geometries[n]).getCoordinates());return new this.ol.geom.MultiLineString(e)}convertToMultiPolygon(t){const e=[];for(let n=0;n<t._geometries.length;n++)e.push(this.convertToPolygon(t._geometries[n]).getCoordinates());return new this.ol.geom.MultiPolygon(e)}convertToCollection(t){const e=[];for(let n=0;n<t._geometries.length;n++){const s=t._geometries[n];e.push(this.write(s))}return new this.ol.geom.GeometryCollection(e)}},WKTReader:class{constructor(t){this.parser=new Ht(t||new Ct)}read(t){return this.parser.read(t)}},WKTWriter:Wt});class Vs{static relativeSign(t,e){return t<e?-1:t>e?1:0}static compare(t,e,n){if(e.equals2D(n))return 0;const s=Vs.relativeSign(e.x,n.x),i=Vs.relativeSign(e.y,n.y);switch(t){case 0:return Vs.compareValue(s,i);case 1:return Vs.compareValue(i,s);case 2:return Vs.compareValue(i,-s);case 3:return Vs.compareValue(-s,i);case 4:return Vs.compareValue(-s,-i);case 5:return Vs.compareValue(-i,-s);case 6:return Vs.compareValue(-i,s);case 7:return Vs.compareValue(s,-i)}return g.shouldNeverReachHere("invalid octant value"),0}static compareValue(t,e){return t<0?-1:t>0?1:e<0?-1:e>0?1:0}}class zs{constructor(){zs.constructor_.apply(this,arguments)}static constructor_(){this._segString=null,this.coord=null,this.segmentIndex=null,this._segmentOctant=null,this._isInterior=null;const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];this._segString=t,this.coord=new m(e),this.segmentIndex=n,this._segmentOctant=s,this._isInterior=!e.equals2D(t.getCoordinate(n))}getCoordinate(){return this.coord}print(t){t.print(this.coord),t.print(" seg # = "+this.segmentIndex)}compareTo(t){const e=t;return this.segmentIndex<e.segmentIndex?-1:this.segmentIndex>e.segmentIndex?1:this.coord.equals2D(e.coord)?0:this._isInterior?e._isInterior?Vs.compare(this._segmentOctant,this.coord,e.coord):1:-1}isEndPoint(t){return 0===this.segmentIndex&&!this._isInterior||this.segmentIndex===t}toString(){return this.segmentIndex+":"+this.coord.toString()}isInterior(){return this._isInterior}get interfaces_(){return[o]}}class ks{constructor(){ks.constructor_.apply(this,arguments)}static constructor_(){this._nodeMap=new Hn,this._edge=null;const t=arguments[0];this._edge=t}getSplitCoordinates(){const t=new R;this.addEndpoints();const e=this.iterator();let n=e.next();for(;e.hasNext();){const s=e.next();this.addEdgeCoordinates(n,s,t),n=s}return t.toCoordinateArray()}addCollapsedNodes(){const t=new L;this.findCollapsesFromInsertedNodes(t),this.findCollapsesFromExistingVertices(t);for(let e=t.iterator();e.hasNext();){const t=e.next().intValue();this.add(this._edge.getCoordinate(t),t)}}createSplitEdgePts(t,e){let n=e.segmentIndex-t.segmentIndex+2;if(2===n)return[new m(t.coord),new m(e.coord)];const s=this._edge.getCoordinate(e.segmentIndex),i=e.isInterior()||!e.coord.equals2D(s);i||n--;const r=new Array(n).fill(null);let o=0;r[o++]=new m(t.coord);for(let n=t.segmentIndex+1;n<=e.segmentIndex;n++)r[o++]=this._edge.getCoordinate(n);return i&&(r[o]=new m(e.coord)),r}print(t){t.println("Intersections:");for(let e=this.iterator();e.hasNext();){e.next().print(t)}}findCollapsesFromExistingVertices(t){for(let e=0;e<this._edge.size()-2;e++){const n=this._edge.getCoordinate(e),s=(this._edge.getCoordinate(e+1),this._edge.getCoordinate(e+2));n.equals2D(s)&&t.add(M.valueOf(e+1))}}addEdgeCoordinates(t,e,n){const s=this.createSplitEdgePts(t,e);n.add(s,!1)}iterator(){return this._nodeMap.values().iterator()}addSplitEdges(t){this.addEndpoints(),this.addCollapsedNodes();const e=this.iterator();let n=e.next();for(;e.hasNext();){const s=e.next(),i=this.createSplitEdge(n,s);t.add(i),n=s}}findCollapseIndex(t,e,n){if(!t.coord.equals2D(e.coord))return!1;let s=e.segmentIndex-t.segmentIndex;return e.isInterior()||s--,1===s&&(n[0]=t.segmentIndex+1,!0)}findCollapsesFromInsertedNodes(t){const e=new Array(1).fill(null),n=this.iterator();let s=n.next();for(;n.hasNext();){const i=n.next();this.findCollapseIndex(s,i,e)&&t.add(M.valueOf(e[0])),s=i}}getEdge(){return this._edge}addEndpoints(){const t=this._edge.size()-1;this.add(this._edge.getCoordinate(0),0),this.add(this._edge.getCoordinate(t),t)}createSplitEdge(t,e){const n=this.createSplitEdgePts(t,e);return new Ws(n,this._edge.getData())}add(t,e){const n=new zs(this._edge,t,e,this._edge.getSegmentOctant(e)),s=this._nodeMap.get(n);return null!==s?(g.isTrue(s.coord.equals2D(t),"Found equal nodes with different coordinates"),s):(this._nodeMap.put(n,n),n)}checkSplitEdgesCorrectness(t){const e=this._edge.getCoordinates(),n=t.get(0).getCoordinate(0);if(!n.equals2D(e[0]))throw new h("bad split edge start point at "+n);const s=t.get(t.size()-1).getCoordinates(),i=s[s.length-1];if(!i.equals2D(e[e.length-1]))throw new h("bad split edge end point at "+i)}}class Xs{static octant(){if("number"==typeof arguments[0]&&"number"==typeof arguments[1]){const t=arguments[0],e=arguments[1];if(0===t&&0===e)throw new s("Cannot compute the octant for point ( "+t+", "+e+" )");const n=Math.abs(t),i=Math.abs(e);return t>=0?e>=0?n>=i?0:1:n>=i?7:6:e>=0?n>=i?3:2:n>=i?4:5}if(arguments[0]instanceof m&&arguments[1]instanceof m){const t=arguments[0],e=arguments[1],n=e.x-t.x,i=e.y-t.y;if(0===n&&0===i)throw new s("Cannot compute the octant for two identical points "+t);return Xs.octant(n,i)}}}class Us{getCoordinates(){}size(){}getCoordinate(t){}isClosed(){}setData(t){}getData(){}}class Hs{addIntersection(t,e){}get interfaces_(){return[Us]}}class Ws{constructor(){Ws.constructor_.apply(this,arguments)}static constructor_(){this._nodeList=new ks(this),this._pts=null,this._data=null;const t=arguments[0],e=arguments[1];this._pts=t,this._data=e}static getNodedSubstrings(){if(1===arguments.length){const t=arguments[0],e=new L;return Ws.getNodedSubstrings(t,e),e}if(2===arguments.length){const t=arguments[1];for(let e=arguments[0].iterator();e.hasNext();){e.next().getNodeList().addSplitEdges(t)}}}getCoordinates(){return this._pts}size(){return this._pts.length}getCoordinate(t){return this._pts[t]}isClosed(){return this._pts[0].equals(this._pts[this._pts.length-1])}getSegmentOctant(t){return t===this._pts.length-1?-1:this.safeOctant(this.getCoordinate(t),this.getCoordinate(t+1))}setData(t){this._data=t}safeOctant(t,e){return t.equals2D(e)?0:Xs.octant(t,e)}getData(){return this._data}addIntersection(){if(2===arguments.length){const t=arguments[0],e=arguments[1];this.addIntersectionNode(t,e)}else if(4===arguments.length){const t=arguments[1],e=arguments[3],n=new m(arguments[0].getIntersection(e));this.addIntersection(n,t)}}toString(){return Wt.toLineString(new pt(this._pts))}getNodeList(){return this._nodeList}addIntersectionNode(t,e){let n=e;const s=n+1;if(s<this._pts.length){const e=this._pts[s];t.equals2D(e)&&(n=s)}return this._nodeList.add(t,n)}addIntersections(t,e,n){for(let s=0;s<t.getIntersectionNum();s++)this.addIntersection(t,e,n,s)}get interfaces_(){return[Hs]}}class Zs{constructor(){Zs.constructor_.apply(this,arguments)}static constructor_(){this._overlapSeg1=new Kt,this._overlapSeg2=new Kt}overlap(){if(2===arguments.length);else if(4===arguments.length){const t=arguments[1],e=arguments[2],n=arguments[3];arguments[0].getLineSegment(t,this._overlapSeg1),e.getLineSegment(n,this._overlapSeg2),this.overlap(this._overlapSeg1,this._overlapSeg2)}}}class js{constructor(){js.constructor_.apply(this,arguments)}static constructor_(){this._pts=null,this._start=null,this._end=null,this._env=null,this._context=null,this._id=null;const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];this._pts=t,this._start=e,this._end=n,this._context=s}getLineSegment(t,e){e.p0=this._pts[t],e.p1=this._pts[t+1]}computeSelect(t,e,n,s){const i=this._pts[e],r=this._pts[n];if(n-e==1)return s.select(this,e),null;if(!t.intersects(i,r))return null;const o=Math.trunc((e+n)/2);e<o&&this.computeSelect(t,e,o,s),o<n&&this.computeSelect(t,o,n,s)}getCoordinates(){const t=new Array(this._end-this._start+1).fill(null);let e=0;for(let n=this._start;n<=this._end;n++)t[e++]=this._pts[n];return t}computeOverlaps(){if(2===arguments.length){const t=arguments[0],e=arguments[1];this.computeOverlaps(this._start,this._end,t,t._start,t._end,e)}else if(6===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3],i=arguments[4],r=arguments[5];if(e-t==1&&i-s==1)return r.overlap(this,t,n,s),null;if(!this.overlaps(t,e,n,s,i))return null;const o=Math.trunc((t+e)/2),l=Math.trunc((s+i)/2);t<o&&(s<l&&this.computeOverlaps(t,o,n,s,l,r),l<i&&this.computeOverlaps(t,o,n,l,i,r)),o<e&&(s<l&&this.computeOverlaps(o,e,n,s,l,r),l<i&&this.computeOverlaps(o,e,n,l,i,r))}}setId(t){this._id=t}select(t,e){this.computeSelect(t,this._start,this._end,e)}getEnvelope(){if(null===this._env){const t=this._pts[this._start],e=this._pts[this._end];this._env=new O(t,e)}return this._env}overlaps(t,e,n,s,i){return O.intersects(this._pts[t],this._pts[e],n._pts[s],n._pts[i])}getEndIndex(){return this._end}getStartIndex(){return this._start}getContext(){return this._context}getId(){return this._id}}class Ks{static findChainEnd(t,e){let n=e;for(;n<t.length-1&&t[n].equals2D(t[n+1]);)n++;if(n>=t.length-1)return t.length-1;const s=wn.quadrant(t[n],t[n+1]);let i=e+1;for(;i<t.length;){if(!t[i-1].equals2D(t[i])){if(wn.quadrant(t[i-1],t[i])!==s)break}i++}return i-1}static getChains(){if(1===arguments.length){const t=arguments[0];return Ks.getChains(t,null)}if(2===arguments.length){const t=arguments[0],e=arguments[1],n=new L;let s=0;do{const i=Ks.findChainEnd(t,s),r=new js(t,s,i,e);n.add(r),s=i}while(s<t.length-1);return n}}}class Qs{computeNodes(t){}getNodedSubstrings(){}}class Js{constructor(){Js.constructor_.apply(this,arguments)}static constructor_(){if(this._segInt=null,0===arguments.length);else if(1===arguments.length){const t=arguments[0];this.setSegmentIntersector(t)}}setSegmentIntersector(t){this._segInt=t}get interfaces_(){return[Qs]}}class $s extends Js{constructor(){super(),$s.constructor_.apply(this,arguments)}static constructor_(){if(this._monoChains=new L,this._index=new vs,this._idCounter=0,this._nodedSegStrings=null,this._nOverlaps=0,0===arguments.length);else if(1===arguments.length){const t=arguments[0];Js.constructor_.call(this,t)}}getMonotoneChains(){return this._monoChains}getNodedSubstrings(){return Ws.getNodedSubstrings(this._nodedSegStrings)}getIndex(){return this._index}add(t){for(let e=Ks.getChains(t.getCoordinates(),t).iterator();e.hasNext();){const t=e.next();t.setId(this._idCounter++),this._index.insert(t.getEnvelope(),t),this._monoChains.add(t)}}computeNodes(t){this._nodedSegStrings=t;for(let e=t.iterator();e.hasNext();)this.add(e.next());this.intersectChains()}intersectChains(){const t=new ti(this._segInt);for(let e=this._monoChains.iterator();e.hasNext();){const n=e.next();for(let e=this._index.query(n.getEnvelope()).iterator();e.hasNext();){const s=e.next();if(s.getId()>n.getId()&&(n.computeOverlaps(s,t),this._nOverlaps++),this._segInt.isDone())return null}}}}class ti extends Zs{constructor(){super(),ti.constructor_.apply(this,arguments)}static constructor_(){this._si=null;const t=arguments[0];this._si=t}overlap(){if(4!==arguments.length)return super.overlap.apply(this,arguments);{const t=arguments[1],e=arguments[2],n=arguments[3],s=arguments[0].getContext(),i=e.getContext();this._si.processIntersections(s,t,i,n)}}}$s.SegmentOverlapAction=ti;class ei{constructor(){ei.constructor_.apply(this,arguments)}static constructor_(){if(this._noder=null,this._scaleFactor=null,this._offsetX=null,this._offsetY=null,this._isScaled=!1,2===arguments.length){const t=arguments[0],e=arguments[1];ei.constructor_.call(this,t,e,0,0)}else if(4===arguments.length){const t=arguments[0],e=arguments[1];this._noder=t,this._scaleFactor=e,this._isScaled=!this.isIntegerPrecision()}}rescale(){if(I(arguments[0],N)){for(let t=arguments[0].iterator();t.hasNext();){const e=t.next();this.rescale(e.getCoordinates())}}else if(arguments[0]instanceof Array){const t=arguments[0];for(let e=0;e<t.length;e++)t[e].x=t[e].x/this._scaleFactor+this._offsetX,t[e].y=t[e].y/this._scaleFactor+this._offsetY;2===t.length&&t[0].equals2D(t[1])&&B.out.println(t)}}scale(){if(I(arguments[0],N)){const t=arguments[0],e=new L(t.size());for(let n=t.iterator();n.hasNext();){const t=n.next();e.add(new Ws(this.scale(t.getCoordinates()),t.getData()))}return e}if(arguments[0]instanceof Array){const t=arguments[0],e=new Array(t.length).fill(null);for(let n=0;n<t.length;n++)e[n]=new m(Math.round((t[n].x-this._offsetX)*this._scaleFactor),Math.round((t[n].y-this._offsetY)*this._scaleFactor),t[n].getZ());return dt.removeRepeatedPoints(e)}}isIntegerPrecision(){return 1===this._scaleFactor}getNodedSubstrings(){const t=this._noder.getNodedSubstrings();return this._isScaled&&this.rescale(t),t}computeNodes(t){let e=t;this._isScaled&&(e=this.scale(t)),this._noder.computeNodes(e)}get interfaces_(){return[Qs]}}var ni=Object.freeze({__proto__:null,MCIndexNoder:$s,ScaledNoder:ei,SegmentString:Us});class si{constructor(){si.constructor_.apply(this,arguments)}static constructor_(){if(this._geom=null,this._geomFact=null,this._bnRule=null,this._endpointMap=null,1===arguments.length){const t=arguments[0];si.constructor_.call(this,t,gn.MOD2_BOUNDARY_RULE)}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this._geom=t,this._geomFact=t.getFactory(),this._bnRule=e}}static getBoundary(){if(1===arguments.length){return new si(arguments[0]).getBoundary()}if(2===arguments.length){return new si(arguments[0],arguments[1]).getBoundary()}}boundaryMultiLineString(t){if(this._geom.isEmpty())return this.getEmptyMultiPoint();const e=this.computeBoundaryCoordinates(t);return 1===e.length?this._geomFact.createPoint(e[0]):this._geomFact.createMultiPointFromCoords(e)}getBoundary(){return this._geom instanceof J?this.boundaryLineString(this._geom):this._geom instanceof wt?this.boundaryMultiLineString(this._geom):this._geom.getBoundary()}boundaryLineString(t){if(this._geom.isEmpty())return this.getEmptyMultiPoint();if(t.isClosed()){return this._bnRule.isInBoundary(2)?t.getStartPoint():this._geomFact.createMultiPoint()}return this._geomFact.createMultiPoint([t.getStartPoint(),t.getEndPoint()])}getEmptyMultiPoint(){return this._geomFact.createMultiPoint()}computeBoundaryCoordinates(t){const e=new L;this._endpointMap=new Hn;for(let e=0;e<t.getNumGeometries();e++){const n=t.getGeometryN(e);0!==n.getNumPoints()&&(this.addEndpoint(n.getCoordinateN(0)),this.addEndpoint(n.getCoordinateN(n.getNumPoints()-1)))}for(let t=this._endpointMap.entrySet().iterator();t.hasNext();){const n=t.next(),s=n.getValue().count;this._bnRule.isInBoundary(s)&&e.add(n.getKey())}return dt.toCoordinateArray(e)}addEndpoint(t){let e=this._endpointMap.get(t);null===e&&(e=new ii,this._endpointMap.put(t,e)),e.count++}}class ii{constructor(){ii.constructor_.apply(this,arguments)}static constructor_(){this.count=null}}class ri{constructor(){ri.constructor_.apply(this,arguments)}static constructor_(){if(this._inputGeom=null,this._isClosedEndpointsInInterior=!0,this._nonSimpleLocation=null,1===arguments.length){const t=arguments[0];this._inputGeom=t}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this._inputGeom=t,this._isClosedEndpointsInInterior=!e.isInBoundary(2)}}static isSimple(){if(1===arguments.length){return new ri(arguments[0]).isSimple()}if(2===arguments.length){return new ri(arguments[0],arguments[1]).isSimple()}}isSimpleMultiPoint(t){if(t.isEmpty())return!0;const e=new lt;for(let n=0;n<t.getNumGeometries();n++){const s=t.getGeometryN(n).getCoordinate();if(e.contains(s))return this._nonSimpleLocation=s,!1;e.add(s)}return!0}isSimplePolygonal(t){for(let e=ye.getLines(t).iterator();e.hasNext();){const t=e.next();if(!this.isSimpleLinearGeometry(t))return!1}return!0}hasClosedEndpointIntersection(t){const e=new Hn;for(let n=t.getEdgeIterator();n.hasNext();){const t=n.next(),s=t.isClosed(),i=t.getCoordinate(0);this.addEndpoint(e,i,s);const r=t.getCoordinate(t.getNumPoints()-1);this.addEndpoint(e,r,s)}for(let t=e.values().iterator();t.hasNext();){const e=t.next();if(e.isClosed&&2!==e.degree)return this._nonSimpleLocation=e.getCoordinate(),!0}return!1}getNonSimpleLocation(){return this._nonSimpleLocation}isSimpleLinearGeometry(t){if(t.isEmpty())return!0;const e=new ls(0,t),n=new jt,s=e.computeSelfNodes(n,!0);return!s.hasIntersection()||(s.hasProperIntersection()?(this._nonSimpleLocation=s.getProperIntersectionPoint(),!1):!this.hasNonEndpointIntersection(e)&&(!this._isClosedEndpointsInInterior||!this.hasClosedEndpointIntersection(e)))}hasNonEndpointIntersection(t){for(let e=t.getEdgeIterator();e.hasNext();){const t=e.next(),n=t.getMaximumSegmentIndex();for(let e=t.getEdgeIntersectionList().iterator();e.hasNext();){const t=e.next();if(!t.isEndPoint(n))return this._nonSimpleLocation=t.getCoordinate(),!0}}return!1}addEndpoint(t,e,n){let s=t.get(e);null===s&&(s=new oi(e),t.put(e,s)),s.addEndpoint(n)}computeSimple(t){return this._nonSimpleLocation=null,!!t.isEmpty()||(t instanceof J||t instanceof wt?this.isSimpleLinearGeometry(t):t instanceof ht?this.isSimpleMultiPoint(t):I(t,st)?this.isSimplePolygonal(t):!(t instanceof ct)||this.isSimpleGeometryCollection(t))}isSimple(){return this._nonSimpleLocation=null,this.computeSimple(this._inputGeom)}isSimpleGeometryCollection(t){for(let e=0;e<t.getNumGeometries();e++){const n=t.getGeometryN(e);if(!this.computeSimple(n))return!1}return!0}}class oi{constructor(){oi.constructor_.apply(this,arguments)}static constructor_(){this.pt=null,this.isClosed=null,this.degree=null;const t=arguments[0];this.pt=t,this.isClosed=!1,this.degree=0}addEndpoint(t){this.degree++,this.isClosed|=t}getCoordinate(){return this.pt}}ri.EndpointInfo=oi;class li{constructor(){li.constructor_.apply(this,arguments)}static constructor_(){if(this._quadrantSegments=li.DEFAULT_QUADRANT_SEGMENTS,this._endCapStyle=li.CAP_ROUND,this._joinStyle=li.JOIN_ROUND,this._mitreLimit=li.DEFAULT_MITRE_LIMIT,this._isSingleSided=!1,this._simplifyFactor=li.DEFAULT_SIMPLIFY_FACTOR,0===arguments.length);else if(1===arguments.length){const t=arguments[0];this.setQuadrantSegments(t)}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this.setQuadrantSegments(t),this.setEndCapStyle(e)}else if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];this.setQuadrantSegments(t),this.setEndCapStyle(e),this.setJoinStyle(n),this.setMitreLimit(s)}}static bufferDistanceError(t){const e=Math.PI/2/t;return 1-Math.cos(e/2)}getEndCapStyle(){return this._endCapStyle}isSingleSided(){return this._isSingleSided}setQuadrantSegments(t){this._quadrantSegments=t,0===this._quadrantSegments&&(this._joinStyle=li.JOIN_BEVEL),this._quadrantSegments<0&&(this._joinStyle=li.JOIN_MITRE,this._mitreLimit=Math.abs(this._quadrantSegments)),t<=0&&(this._quadrantSegments=1),this._joinStyle!==li.JOIN_ROUND&&(this._quadrantSegments=li.DEFAULT_QUADRANT_SEGMENTS)}getJoinStyle(){return this._joinStyle}setJoinStyle(t){this._joinStyle=t}setSimplifyFactor(t){this._simplifyFactor=t<0?0:t}getSimplifyFactor(){return this._simplifyFactor}getQuadrantSegments(){return this._quadrantSegments}setEndCapStyle(t){this._endCapStyle=t}getMitreLimit(){return this._mitreLimit}setMitreLimit(t){this._mitreLimit=t}setSingleSided(t){this._isSingleSided=t}}li.CAP_ROUND=1,li.CAP_FLAT=2,li.CAP_SQUARE=3,li.JOIN_ROUND=1,li.JOIN_MITRE=2,li.JOIN_BEVEL=3,li.DEFAULT_QUADRANT_SEGMENTS=8,li.DEFAULT_MITRE_LIMIT=5,li.DEFAULT_SIMPLIFY_FACTOR=.01;class ai{constructor(){ai.constructor_.apply(this,arguments)}static constructor_(){this._minIndex=-1,this._minCoord=null,this._minDe=null,this._orientedDe=null}getCoordinate(){return this._minCoord}getRightmostSide(t,e){let n=this.getRightmostSideOfSegment(t,e);return n<0&&(n=this.getRightmostSideOfSegment(t,e-1)),n<0&&(this._minCoord=null,this.checkForRightmostCoordinate(t)),n}findRightmostEdgeAtVertex(){const t=this._minDe.getEdge().getCoordinates();g.isTrue(this._minIndex>0&&this._minIndex<t.length,"rightmost point expected to be interior vertex of edge");const e=t[this._minIndex-1],n=t[this._minIndex+1],s=G.index(this._minCoord,n,e);let i=!1;(e.y<this._minCoord.y&&n.y<this._minCoord.y&&s===G.COUNTERCLOCKWISE||e.y>this._minCoord.y&&n.y>this._minCoord.y&&s===G.CLOCKWISE)&&(i=!0),i&&(this._minIndex=this._minIndex-1)}getRightmostSideOfSegment(t,e){const n=t.getEdge().getCoordinates();if(e<0||e+1>=n.length)return-1;if(n[e].y===n[e+1].y)return-1;let s=Mn.LEFT;return n[e].y<n[e+1].y&&(s=Mn.RIGHT),s}getEdge(){return this._orientedDe}checkForRightmostCoordinate(t){const e=t.getEdge().getCoordinates();for(let n=0;n<e.length-1;n++)(null===this._minCoord||e[n].x>this._minCoord.x)&&(this._minDe=t,this._minIndex=n,this._minCoord=e[n])}findRightmostEdgeAtNode(){const t=this._minDe.getNode().getEdges();this._minDe=t.getRightmostEdge(),this._minDe.isForward()||(this._minDe=this._minDe.getSym(),this._minIndex=this._minDe.getEdge().getCoordinates().length-1)}findEdge(t){for(let e=t.iterator();e.hasNext();){const t=e.next();t.isForward()&&this.checkForRightmostCoordinate(t)}g.isTrue(0!==this._minIndex||this._minCoord.equals(this._minDe.getCoordinate()),"inconsistency in rightmost processing"),0===this._minIndex?this.findRightmostEdgeAtNode():this.findRightmostEdgeAtVertex(),this._orientedDe=this._minDe;this.getRightmostSide(this._minDe,this._minIndex)===Mn.LEFT&&(this._orientedDe=this._minDe.getSym())}}class ci{constructor(){this.array=[]}addLast(t){this.array.push(t)}removeFirst(){return this.array.shift()}isEmpty(){return 0===this.array.length}}class hi{constructor(){hi.constructor_.apply(this,arguments)}static constructor_(){this._finder=null,this._dirEdgeList=new L,this._nodes=new L,this._rightMostCoord=null,this._env=null,this._finder=new ai}clearVisitedEdges(){for(let t=this._dirEdgeList.iterator();t.hasNext();){t.next().setVisited(!1)}}getRightmostCoordinate(){return this._rightMostCoord}computeNodeDepth(t){let e=null;for(let n=t.getEdges().iterator();n.hasNext();){const t=n.next();if(t.isVisited()||t.getSym().isVisited()){e=t;break}}if(null===e)throw new ss("unable to find edge to compute depths at "+t.getCoordinate());t.getEdges().computeDepths(e);for(let e=t.getEdges().iterator();e.hasNext();){const t=e.next();t.setVisited(!0),this.copySymDepths(t)}}computeDepth(t){this.clearVisitedEdges();const e=this._finder.getEdge();e.getNode(),e.getLabel();e.setEdgeDepths(Mn.RIGHT,t),this.copySymDepths(e),this.computeDepths(e)}create(t){this.addReachable(t),this._finder.findEdge(this._dirEdgeList),this._rightMostCoord=this._finder.getCoordinate()}findResultEdges(){for(let t=this._dirEdgeList.iterator();t.hasNext();){const e=t.next();e.getDepth(Mn.RIGHT)>=1&&e.getDepth(Mn.LEFT)<=0&&!e.isInteriorAreaEdge()&&e.setInResult(!0)}}computeDepths(t){const e=new xt,n=new ci,s=t.getNode();for(n.addLast(s),e.add(s),t.setVisited(!0);!n.isEmpty();){const t=n.removeFirst();e.add(t),this.computeNodeDepth(t);for(let s=t.getEdges().iterator();s.hasNext();){const t=s.next().getSym();if(t.isVisited())continue;const i=t.getNode();e.contains(i)||(n.addLast(i),e.add(i))}}}compareTo(t){const e=t;return this._rightMostCoord.x<e._rightMostCoord.x?-1:this._rightMostCoord.x>e._rightMostCoord.x?1:0}getEnvelope(){if(null===this._env){const t=new O;for(let e=this._dirEdgeList.iterator();e.hasNext();){const n=e.next().getEdge().getCoordinates();for(let e=0;e<n.length-1;e++)t.expandToInclude(n[e])}this._env=t}return this._env}addReachable(t){const e=new en;for(e.add(t);!e.empty();){const t=e.pop();this.add(t,e)}}copySymDepths(t){const e=t.getSym();e.setDepth(Mn.LEFT,t.getDepth(Mn.RIGHT)),e.setDepth(Mn.RIGHT,t.getDepth(Mn.LEFT))}add(t,e){t.setVisited(!0),this._nodes.add(t);for(let n=t.getEdges().iterator();n.hasNext();){const t=n.next();this._dirEdgeList.add(t);const s=t.getSym().getNode();s.isVisited()||e.push(s)}}getNodes(){return this._nodes}getDirectedEdges(){return this._dirEdgeList}get interfaces_(){return[o]}}class ui{constructor(){ui.constructor_.apply(this,arguments)}static constructor_(){if(this._startDe=null,this._maxNodeDegree=-1,this._edges=new L,this._pts=new L,this._label=new qn(Qt.NONE),this._ring=null,this._isHole=null,this._shell=null,this._holes=new L,this._geometryFactory=null,0===arguments.length);else if(2===arguments.length){const t=arguments[0],e=arguments[1];this._geometryFactory=e,this.computePoints(t),this.computeRing()}}computeRing(){if(null!==this._ring)return null;const t=new Array(this._pts.size()).fill(null);for(let e=0;e<this._pts.size();e++)t[e]=this._pts.get(e);this._ring=this._geometryFactory.createLinearRing(t),this._isHole=G.isCCW(this._ring.getCoordinates())}isIsolated(){return 1===this._label.getGeometryCount()}computePoints(t){this._startDe=t;let e=t,n=!0;do{if(null===e)throw new ss("Found null DirectedEdge");if(e.getEdgeRing()===this)throw new ss("Directed Edge visited twice during ring-building at "+e.getCoordinate());this._edges.add(e);const t=e.getLabel();g.isTrue(t.isArea()),this.mergeLabel(t),this.addPoints(e.getEdge(),e.isForward(),n),n=!1,this.setEdgeRing(e,this),e=this.getNext(e)}while(e!==this._startDe)}getLinearRing(){return this._ring}getCoordinate(t){return this._pts.get(t)}computeMaxNodeDegree(){this._maxNodeDegree=0;let t=this._startDe;do{const e=t.getNode().getEdges().getOutgoingDegree(this);e>this._maxNodeDegree&&(this._maxNodeDegree=e),t=this.getNext(t)}while(t!==this._startDe);this._maxNodeDegree*=2}addPoints(t,e,n){const s=t.getCoordinates();if(e){let t=1;n&&(t=0);for(let e=t;e<s.length;e++)this._pts.add(s[e])}else{let t=s.length-2;n&&(t=s.length-1);for(let e=t;e>=0;e--)this._pts.add(s[e])}}isHole(){return this._isHole}setInResult(){let t=this._startDe;do{t.getEdge().setInResult(!0),t=t.getNext()}while(t!==this._startDe)}containsPoint(t){const e=this.getLinearRing();if(!e.getEnvelopeInternal().contains(t))return!1;if(!Ue.isInRing(t,e.getCoordinates()))return!1;for(let e=this._holes.iterator();e.hasNext();){if(e.next().containsPoint(t))return!1}return!0}addHole(t){this._holes.add(t)}isShell(){return null===this._shell}getLabel(){return this._label}getEdges(){return this._edges}getMaxNodeDegree(){return this._maxNodeDegree<0&&this.computeMaxNodeDegree(),this._maxNodeDegree}getShell(){return this._shell}mergeLabel(){if(1===arguments.length){const t=arguments[0];this.mergeLabel(t,0),this.mergeLabel(t,1)}else if(2===arguments.length){const t=arguments[1],e=arguments[0].getLocation(t,Mn.RIGHT);if(e===Qt.NONE)return null;if(this._label.getLocation(t)===Qt.NONE)return this._label.setLocation(t,e),null}}setShell(t){this._shell=t,null!==t&&t.addHole(this)}toPolygon(t){const e=new Array(this._holes.size()).fill(null);for(let t=0;t<this._holes.size();t++)e[t]=this._holes.get(t).getLinearRing();return t.createPolygon(this.getLinearRing(),e)}}class gi extends ui{constructor(){super(),gi.constructor_.apply(this,arguments)}static constructor_(){const t=arguments[0],e=arguments[1];ui.constructor_.call(this,t,e)}setEdgeRing(t,e){t.setMinEdgeRing(e)}getNext(t){return t.getNextMin()}}class di extends ui{constructor(){super(),di.constructor_.apply(this,arguments)}static constructor_(){const t=arguments[0],e=arguments[1];ui.constructor_.call(this,t,e)}buildMinimalRings(){const t=new L;let e=this._startDe;do{if(null===e.getMinEdgeRing()){const n=new gi(e,this._geometryFactory);t.add(n)}e=e.getNext()}while(e!==this._startDe);return t}setEdgeRing(t,e){t.setEdgeRing(e)}linkDirectedEdgesForMinimalEdgeRings(){let t=this._startDe;do{t.getNode().getEdges().linkMinimalDirectedEdges(this),t=t.getNext()}while(t!==this._startDe)}getNext(t){return t.getNext()}}class _i{constructor(){_i.constructor_.apply(this,arguments)}static constructor_(){this._geometryFactory=null,this._shellList=new L;const t=arguments[0];this._geometryFactory=t}static findEdgeRingContaining(t,e){const n=t.getLinearRing(),s=n.getEnvelopeInternal();let i=n.getCoordinateN(0),r=null,o=null;for(let t=e.iterator();t.hasNext();){const e=t.next(),l=e.getLinearRing(),a=l.getEnvelopeInternal();if(a.equals(s))continue;if(!a.contains(s))continue;i=dt.ptNotInList(n.getCoordinates(),l.getCoordinates());let c=!1;Ue.isInRing(i,l.getCoordinates())&&(c=!0),c&&(null===r||o.contains(a))&&(r=e,o=r.getLinearRing().getEnvelopeInternal())}return r}sortShellsAndHoles(t,e,n){for(let s=t.iterator();s.hasNext();){const t=s.next();t.isHole()?n.add(t):e.add(t)}}computePolygons(t){const e=new L;for(let n=t.iterator();n.hasNext();){const t=n.next().toPolygon(this._geometryFactory);e.add(t)}return e}placeFreeHoles(t,e){for(let n=e.iterator();n.hasNext();){const e=n.next();if(null===e.getShell()){const n=_i.findEdgeRingContaining(e,t);if(null===n)throw new ss("unable to assign hole to a shell",e.getCoordinate(0));e.setShell(n)}}}buildMinimalEdgeRings(t,e,n){const s=new L;for(let i=t.iterator();i.hasNext();){const t=i.next();if(t.getMaxNodeDegree()>2){t.linkDirectedEdgesForMinimalEdgeRings();const s=t.buildMinimalRings(),i=this.findShell(s);null!==i?(this.placePolygonHoles(i,s),e.add(i)):n.addAll(s)}else s.add(t)}return s}buildMaximalEdgeRings(t){const e=new L;for(let n=t.iterator();n.hasNext();){const t=n.next();if(t.isInResult()&&t.getLabel().isArea()&&null===t.getEdgeRing()){const n=new di(t,this._geometryFactory);e.add(n),n.setInResult()}}return e}placePolygonHoles(t,e){for(let n=e.iterator();n.hasNext();){const e=n.next();e.isHole()&&e.setShell(t)}}getPolygons(){return this.computePolygons(this._shellList)}findShell(t){let e=0,n=null;for(let s=t.iterator();s.hasNext();){const t=s.next();t.isHole()||(n=t,e++)}return g.isTrue(e<=1,"found two shells in MinimalEdgeRing list"),n}add(){if(1===arguments.length){const t=arguments[0];this.add(t.getEdgeEnds(),t.getNodes())}else if(2===arguments.length){const t=arguments[0],e=arguments[1];os.linkResultDirectedEdges(e);const n=this.buildMaximalEdgeRings(t),s=new L,i=this.buildMinimalEdgeRings(n,this._shellList,s);this.sortShellsAndHoles(i,this._shellList,s),this.placeFreeHoles(this._shellList,s)}}}class pi{constructor(){pi.constructor_.apply(this,arguments)}static constructor_(){this._inputLine=null,this._distanceTol=null,this._isDeleted=null,this._angleOrientation=G.COUNTERCLOCKWISE;const t=arguments[0];this._inputLine=t}static simplify(t,e){return new pi(t).simplify(e)}isDeletable(t,e,n,s){const i=this._inputLine[t],r=this._inputLine[e],o=this._inputLine[n];return!!this.isConcave(i,r,o)&&(!!this.isShallow(i,r,o,s)&&this.isShallowSampled(i,r,t,n,s))}deleteShallowConcavities(){let t=1,e=this.findNextNonDeletedIndex(t),n=this.findNextNonDeletedIndex(e),s=!1;for(;n<this._inputLine.length;){let i=!1;this.isDeletable(t,e,n,this._distanceTol)&&(this._isDeleted[e]=pi.DELETE,i=!0,s=!0),t=i?n:e,e=this.findNextNonDeletedIndex(t),n=this.findNextNonDeletedIndex(e)}return s}isShallowConcavity(t,e,n,s){if(!(G.index(t,e,n)===this._angleOrientation))return!1;return V.pointToSegment(e,t,n)<s}isShallowSampled(t,e,n,s,i){let r=Math.trunc((s-n)/pi.NUM_PTS_TO_CHECK);r<=0&&(r=1);for(let o=n;o<s;o+=r)if(!this.isShallow(t,e,this._inputLine[o],i))return!1;return!0}isConcave(t,e,n){return G.index(t,e,n)===this._angleOrientation}simplify(t){this._distanceTol=Math.abs(t),t<0&&(this._angleOrientation=G.CLOCKWISE),this._isDeleted=new Array(this._inputLine.length).fill(null);let e=!1;do{e=this.deleteShallowConcavities()}while(e);return this.collapseLine()}findNextNonDeletedIndex(t){let e=t+1;for(;e<this._inputLine.length&&this._isDeleted[e]===pi.DELETE;)e++;return e}isShallow(t,e,n,s){return V.pointToSegment(e,t,n)<s}collapseLine(){const t=new R;for(let e=0;e<this._inputLine.length;e++)this._isDeleted[e]!==pi.DELETE&&t.add(this._inputLine[e]);return t.toCoordinateArray()}}pi.INIT=0,pi.DELETE=1,pi.KEEP=1,pi.NUM_PTS_TO_CHECK=10;class mi{constructor(){mi.constructor_.apply(this,arguments)}static constructor_(){this._ptList=null,this._precisionModel=null,this._minimimVertexDistance=0,this._ptList=new L}getCoordinates(){return this._ptList.toArray(mi.COORDINATE_ARRAY_TYPE)}setPrecisionModel(t){this._precisionModel=t}addPt(t){const e=new m(t);if(this._precisionModel.makePrecise(e),this.isRedundant(e))return null;this._ptList.add(e)}reverse(){}addPts(t,e){if(e)for(let e=0;e<t.length;e++)this.addPt(t[e]);else for(let e=t.length-1;e>=0;e--)this.addPt(t[e])}isRedundant(t){if(this._ptList.size()<1)return!1;const e=this._ptList.get(this._ptList.size()-1);return t.distance(e)<this._minimimVertexDistance}toString(){return(new Ct).createLineString(this.getCoordinates()).toString()}closeRing(){if(this._ptList.size()<1)return null;const t=new m(this._ptList.get(0)),e=this._ptList.get(this._ptList.size()-1);if(t.equals(e))return null;this._ptList.add(t)}setMinimumVertexDistance(t){this._minimimVertexDistance=t}}mi.COORDINATE_ARRAY_TYPE=new Array(0).fill(null);class fi{constructor(){fi.constructor_.apply(this,arguments)}static constructor_(){this._maxCurveSegmentError=0,this._filletAngleQuantum=null,this._closingSegLengthFactor=1,this._segList=null,this._distance=0,this._precisionModel=null,this._bufParams=null,this._li=null,this._s0=null,this._s1=null,this._s2=null,this._seg0=new Kt,this._seg1=new Kt,this._offset0=new Kt,this._offset1=new Kt,this._side=0,this._hasNarrowConcaveAngle=!1;const t=arguments[0],e=arguments[1],n=arguments[2];this._precisionModel=t,this._bufParams=e,this._li=new jt,this._filletAngleQuantum=Math.PI/2/e.getQuadrantSegments(),e.getQuadrantSegments()>=8&&e.getJoinStyle()===li.JOIN_ROUND&&(this._closingSegLengthFactor=fi.MAX_CLOSING_SEG_LEN_FACTOR),this.init(n)}addNextSegment(t,e){if(this._s0=this._s1,this._s1=this._s2,this._s2=t,this._seg0.setCoordinates(this._s0,this._s1),this.computeOffsetSegment(this._seg0,this._side,this._distance,this._offset0),this._seg1.setCoordinates(this._s1,this._s2),this.computeOffsetSegment(this._seg1,this._side,this._distance,this._offset1),this._s1.equals(this._s2))return null;const n=G.index(this._s0,this._s1,this._s2),s=n===G.CLOCKWISE&&this._side===Mn.LEFT||n===G.COUNTERCLOCKWISE&&this._side===Mn.RIGHT;0===n?this.addCollinear(e):s?this.addOutsideTurn(n,e):this.addInsideTurn(n,e)}addLineEndCap(t,e){const n=new Kt(t,e),s=new Kt;this.computeOffsetSegment(n,Mn.LEFT,this._distance,s);const i=new Kt;this.computeOffsetSegment(n,Mn.RIGHT,this._distance,i);const r=e.x-t.x,o=e.y-t.y,l=Math.atan2(o,r);switch(this._bufParams.getEndCapStyle()){case li.CAP_ROUND:this._segList.addPt(s.p1),this.addDirectedFillet(e,l+Math.PI/2,l-Math.PI/2,G.CLOCKWISE,this._distance),this._segList.addPt(i.p1);break;case li.CAP_FLAT:this._segList.addPt(s.p1),this._segList.addPt(i.p1);break;case li.CAP_SQUARE:const t=new m;t.x=Math.abs(this._distance)*Math.cos(l),t.y=Math.abs(this._distance)*Math.sin(l);const n=new m(s.p1.x+t.x,s.p1.y+t.y),r=new m(i.p1.x+t.x,i.p1.y+t.y);this._segList.addPt(n),this._segList.addPt(r)}}getCoordinates(){return this._segList.getCoordinates()}addMitreJoin(t,e,n,s){const i=q.intersection(e.p0,e.p1,n.p0,n.p1);if(null!==i){if((s<=0?1:i.distance(t)/Math.abs(s))<=this._bufParams.getMitreLimit())return this._segList.addPt(i),null}this.addLimitedMitreJoin(e,n,s,this._bufParams.getMitreLimit())}addOutsideTurn(t,e){if(this._offset0.p1.distance(this._offset1.p0)<this._distance*fi.OFFSET_SEGMENT_SEPARATION_FACTOR)return this._segList.addPt(this._offset0.p1),null;this._bufParams.getJoinStyle()===li.JOIN_MITRE?this.addMitreJoin(this._s1,this._offset0,this._offset1,this._distance):this._bufParams.getJoinStyle()===li.JOIN_BEVEL?this.addBevelJoin(this._offset0,this._offset1):(e&&this._segList.addPt(this._offset0.p1),this.addCornerFillet(this._s1,this._offset0.p1,this._offset1.p0,t,this._distance),this._segList.addPt(this._offset1.p0))}createSquare(t){this._segList.addPt(new m(t.x+this._distance,t.y+this._distance)),this._segList.addPt(new m(t.x+this._distance,t.y-this._distance)),this._segList.addPt(new m(t.x-this._distance,t.y-this._distance)),this._segList.addPt(new m(t.x-this._distance,t.y+this._distance)),this._segList.closeRing()}addSegments(t,e){this._segList.addPts(t,e)}addFirstSegment(){this._segList.addPt(this._offset1.p0)}addCornerFillet(t,e,n,s,i){const r=e.x-t.x,o=e.y-t.y;let l=Math.atan2(o,r);const a=n.x-t.x,c=n.y-t.y,h=Math.atan2(c,a);s===G.CLOCKWISE?l<=h&&(l+=2*Math.PI):l>=h&&(l-=2*Math.PI),this._segList.addPt(e),this.addDirectedFillet(t,l,h,s,i),this._segList.addPt(n)}addLastSegment(){this._segList.addPt(this._offset1.p1)}initSideSegments(t,e,n){this._s1=t,this._s2=e,this._side=n,this._seg1.setCoordinates(t,e),this.computeOffsetSegment(this._seg1,n,this._distance,this._offset1)}addLimitedMitreJoin(t,e,n,s){const i=this._seg0.p1,r=$t.angle(i,this._seg0.p0),o=$t.angleBetweenOriented(this._seg0.p0,i,this._seg1.p1)/2,l=$t.normalize(r+o),a=$t.normalize(l+Math.PI),c=s*n,h=n-c*Math.abs(Math.sin(o)),u=i.x+c*Math.cos(a),g=i.y+c*Math.sin(a),d=new m(u,g),_=new Kt(i,d),p=_.pointAlongOffset(1,h),f=_.pointAlongOffset(1,-h);this._side===Mn.LEFT?(this._segList.addPt(p),this._segList.addPt(f)):(this._segList.addPt(f),this._segList.addPt(p))}addDirectedFillet(t,e,n,s,i){const r=s===G.CLOCKWISE?-1:1,o=Math.abs(e-n),l=Math.trunc(o/this._filletAngleQuantum+.5);if(l<1)return null;const a=o/l,c=new m;for(let n=0;n<l;n++){const s=e+r*n*a;c.x=t.x+i*Math.cos(s),c.y=t.y+i*Math.sin(s),this._segList.addPt(c)}}computeOffsetSegment(t,e,n,s){const i=e===Mn.LEFT?1:-1,r=t.p1.x-t.p0.x,o=t.p1.y-t.p0.y,l=Math.sqrt(r*r+o*o),a=i*n*r/l,c=i*n*o/l;s.p0.x=t.p0.x-c,s.p0.y=t.p0.y+a,s.p1.x=t.p1.x-c,s.p1.y=t.p1.y+a}addInsideTurn(t,e){if(this._li.computeIntersection(this._offset0.p0,this._offset0.p1,this._offset1.p0,this._offset1.p1),this._li.hasIntersection())this._segList.addPt(this._li.getIntersection(0));else if(this._hasNarrowConcaveAngle=!0,this._offset0.p1.distance(this._offset1.p0)<this._distance*fi.INSIDE_TURN_VERTEX_SNAP_DISTANCE_FACTOR)this._segList.addPt(this._offset0.p1);else{if(this._segList.addPt(this._offset0.p1),this._closingSegLengthFactor>0){const t=new m((this._closingSegLengthFactor*this._offset0.p1.x+this._s1.x)/(this._closingSegLengthFactor+1),(this._closingSegLengthFactor*this._offset0.p1.y+this._s1.y)/(this._closingSegLengthFactor+1));this._segList.addPt(t);const e=new m((this._closingSegLengthFactor*this._offset1.p0.x+this._s1.x)/(this._closingSegLengthFactor+1),(this._closingSegLengthFactor*this._offset1.p0.y+this._s1.y)/(this._closingSegLengthFactor+1));this._segList.addPt(e)}else this._segList.addPt(this._s1);this._segList.addPt(this._offset1.p0)}}createCircle(t){const e=new m(t.x+this._distance,t.y);this._segList.addPt(e),this.addDirectedFillet(t,0,2*Math.PI,-1,this._distance),this._segList.closeRing()}addBevelJoin(t,e){this._segList.addPt(t.p1),this._segList.addPt(e.p0)}init(t){this._distance=t,this._maxCurveSegmentError=t*(1-Math.cos(this._filletAngleQuantum/2)),this._segList=new mi,this._segList.setPrecisionModel(this._precisionModel),this._segList.setMinimumVertexDistance(t*fi.CURVE_VERTEX_SNAP_DISTANCE_FACTOR)}addCollinear(t){this._li.computeIntersection(this._s0,this._s1,this._s1,this._s2);this._li.getIntersectionNum()>=2&&(this._bufParams.getJoinStyle()===li.JOIN_BEVEL||this._bufParams.getJoinStyle()===li.JOIN_MITRE?(t&&this._segList.addPt(this._offset0.p1),this._segList.addPt(this._offset1.p0)):this.addCornerFillet(this._s1,this._offset0.p1,this._offset1.p0,G.CLOCKWISE,this._distance))}closeRing(){this._segList.closeRing()}hasNarrowConcaveAngle(){return this._hasNarrowConcaveAngle}}fi.OFFSET_SEGMENT_SEPARATION_FACTOR=.001,fi.INSIDE_TURN_VERTEX_SNAP_DISTANCE_FACTOR=.001,fi.CURVE_VERTEX_SNAP_DISTANCE_FACTOR=1e-6,fi.MAX_CLOSING_SEG_LEN_FACTOR=80;class yi{constructor(){yi.constructor_.apply(this,arguments)}static constructor_(){this._distance=0,this._precisionModel=null,this._bufParams=null;const t=arguments[0],e=arguments[1];this._precisionModel=t,this._bufParams=e}static copyCoordinates(t){const e=new Array(t.length).fill(null);for(let n=0;n<e.length;n++)e[n]=new m(t[n]);return e}getOffsetCurve(t,e){if(this._distance=e,0===e)return null;const n=e<0,s=Math.abs(e),i=this.getSegGen(s);t.length<=1?this.computePointCurve(t[0],i):this.computeOffsetCurve(t,n,i);const r=i.getCoordinates();return n&&dt.reverse(r),r}computeSingleSidedBufferCurve(t,e,n){const s=this.simplifyTolerance(this._distance);if(e){n.addSegments(t,!0);const e=pi.simplify(t,-s),i=e.length-1;n.initSideSegments(e[i],e[i-1],Mn.LEFT),n.addFirstSegment();for(let t=i-2;t>=0;t--)n.addNextSegment(e[t],!0)}else{n.addSegments(t,!1);const e=pi.simplify(t,s),i=e.length-1;n.initSideSegments(e[0],e[1],Mn.LEFT),n.addFirstSegment();for(let t=2;t<=i;t++)n.addNextSegment(e[t],!0)}n.addLastSegment(),n.closeRing()}computeRingBufferCurve(t,e,n){let s=this.simplifyTolerance(this._distance);e===Mn.RIGHT&&(s=-s);const i=pi.simplify(t,s),r=i.length-1;n.initSideSegments(i[r-1],i[0],e);for(let t=1;t<=r;t++){const e=1!==t;n.addNextSegment(i[t],e)}n.closeRing()}computeLineBufferCurve(t,e){const n=this.simplifyTolerance(this._distance),s=pi.simplify(t,n),i=s.length-1;e.initSideSegments(s[0],s[1],Mn.LEFT);for(let t=2;t<=i;t++)e.addNextSegment(s[t],!0);e.addLastSegment(),e.addLineEndCap(s[i-1],s[i]);const r=pi.simplify(t,-n),o=r.length-1;e.initSideSegments(r[o],r[o-1],Mn.LEFT);for(let t=o-2;t>=0;t--)e.addNextSegment(r[t],!0);e.addLastSegment(),e.addLineEndCap(r[1],r[0]),e.closeRing()}computePointCurve(t,e){switch(this._bufParams.getEndCapStyle()){case li.CAP_ROUND:e.createCircle(t);break;case li.CAP_SQUARE:e.createSquare(t)}}getLineCurve(t,e){if(this._distance=e,this.isLineOffsetEmpty(e))return null;const n=Math.abs(e),s=this.getSegGen(n);if(t.length<=1)this.computePointCurve(t[0],s);else if(this._bufParams.isSingleSided()){const n=e<0;this.computeSingleSidedBufferCurve(t,n,s)}else this.computeLineBufferCurve(t,s);return s.getCoordinates()}getBufferParameters(){return this._bufParams}simplifyTolerance(t){return t*this._bufParams.getSimplifyFactor()}getRingCurve(t,e,n){if(this._distance=n,t.length<=2)return this.getLineCurve(t,n);if(0===n)return yi.copyCoordinates(t);const s=this.getSegGen(n);return this.computeRingBufferCurve(t,e,s),s.getCoordinates()}computeOffsetCurve(t,e,n){const s=this.simplifyTolerance(this._distance);if(e){const e=pi.simplify(t,-s),i=e.length-1;n.initSideSegments(e[i],e[i-1],Mn.LEFT),n.addFirstSegment();for(let t=i-2;t>=0;t--)n.addNextSegment(e[t],!0)}else{const e=pi.simplify(t,s),i=e.length-1;n.initSideSegments(e[0],e[1],Mn.LEFT),n.addFirstSegment();for(let t=2;t<=i;t++)n.addNextSegment(e[t],!0)}n.addLastSegment()}isLineOffsetEmpty(t){return 0===t||t<0&&!this._bufParams.isSingleSided()}getSegGen(t){return new fi(this._precisionModel,this._bufParams,t)}}class xi{constructor(){xi.constructor_.apply(this,arguments)}static constructor_(){this._subgraphs=null,this._seg=new Kt;const t=arguments[0];this._subgraphs=t}findStabbedSegments(){if(1===arguments.length){const t=arguments[0],e=new L;for(let n=this._subgraphs.iterator();n.hasNext();){const s=n.next(),i=s.getEnvelope();t.y<i.getMinY()||t.y>i.getMaxY()||this.findStabbedSegments(t,s.getDirectedEdges(),e)}return e}if(3===arguments.length)if(I(arguments[2],w)&&arguments[0]instanceof m&&arguments[1]instanceof is){const t=arguments[0],e=arguments[1],n=arguments[2],s=e.getEdge().getCoordinates();for(let i=0;i<s.length-1;i++){this._seg.p0=s[i],this._seg.p1=s[i+1],this._seg.p0.y>this._seg.p1.y&&this._seg.reverse();if(Math.max(this._seg.p0.x,this._seg.p1.x)<t.x)continue;if(this._seg.isHorizontal())continue;if(t.y<this._seg.p0.y||t.y>this._seg.p1.y)continue;if(G.index(this._seg.p0,this._seg.p1,t)===G.RIGHT)continue;let r=e.getDepth(Mn.LEFT);this._seg.p0.equals(s[i])||(r=e.getDepth(Mn.RIGHT));const o=new Ei(this._seg,r);n.add(o)}}else if(I(arguments[2],w)&&arguments[0]instanceof m&&I(arguments[1],w)){const t=arguments[0],e=arguments[2];for(let n=arguments[1].iterator();n.hasNext();){const s=n.next();s.isForward()&&this.findStabbedSegments(t,s,e)}}}getDepth(t){const e=this.findStabbedSegments(t);if(0===e.size())return 0;return xe.min(e)._leftDepth}}class Ei{constructor(){Ei.constructor_.apply(this,arguments)}static constructor_(){this._upwardSeg=null,this._leftDepth=null;const t=arguments[0],e=arguments[1];this._upwardSeg=new Kt(t),this._leftDepth=e}compareTo(t){const e=t;if(this._upwardSeg.minX()>=e._upwardSeg.maxX())return 1;if(this._upwardSeg.maxX()<=e._upwardSeg.minX())return-1;let n=this._upwardSeg.orientationIndex(e._upwardSeg);return 0!==n?n:(n=-1*e._upwardSeg.orientationIndex(this._upwardSeg),0!==n?n:this._upwardSeg.compareTo(e._upwardSeg))}compareX(t,e){const n=t.p0.compareTo(e.p0);return 0!==n?n:t.p1.compareTo(e.p1)}toString(){return this._upwardSeg.toString()}get interfaces_(){return[o]}}xi.DepthSegment=Ei;class Ii{constructor(){Ii.constructor_.apply(this,arguments)}static constructor_(){this._inputGeom=null,this._distance=null,this._curveBuilder=null,this._curveList=new L;const t=arguments[0],e=arguments[1],n=arguments[2];this._inputGeom=t,this._distance=e,this._curveBuilder=n}addRingSide(t,e,n,s,i){if(0===e&&t.length<ut.MINIMUM_VALID_SIZE)return null;let r=s,o=i;t.length>=ut.MINIMUM_VALID_SIZE&&G.isCCW(t)&&(r=i,o=s,n=Mn.opposite(n));const l=this._curveBuilder.getRingCurve(t,n,e);this.addCurve(l,r,o)}addRingBothSides(t,e){this.addRingSide(t,e,Mn.LEFT,Qt.EXTERIOR,Qt.INTERIOR),this.addRingSide(t,e,Mn.RIGHT,Qt.INTERIOR,Qt.EXTERIOR)}addPoint(t){if(this._distance<=0)return null;const e=t.getCoordinates(),n=this._curveBuilder.getLineCurve(e,this._distance);this.addCurve(n,Qt.EXTERIOR,Qt.INTERIOR)}addPolygon(t){let e=this._distance,n=Mn.LEFT;this._distance<0&&(e=-this._distance,n=Mn.RIGHT);const s=t.getExteriorRing(),i=dt.removeRepeatedPoints(s.getCoordinates());if(this._distance<0&&this.isErodedCompletely(s,this._distance))return null;if(this._distance<=0&&i.length<3)return null;this.addRingSide(i,e,n,Qt.EXTERIOR,Qt.INTERIOR);for(let s=0;s<t.getNumInteriorRing();s++){const i=t.getInteriorRingN(s),r=dt.removeRepeatedPoints(i.getCoordinates());this._distance>0&&this.isErodedCompletely(i,-this._distance)||this.addRingSide(r,e,Mn.opposite(n),Qt.INTERIOR,Qt.EXTERIOR)}}isTriangleErodedCompletely(t,e){const n=new ne(t[0],t[1],t[2]),s=n.inCentre();return V.pointToSegment(s,n.p0,n.p1)<Math.abs(e)}addLineString(t){if(this._curveBuilder.isLineOffsetEmpty(this._distance))return null;const e=dt.removeRepeatedPoints(t.getCoordinates());if(dt.isRing(e)&&!this._curveBuilder.getBufferParameters().isSingleSided())this.addRingBothSides(e,this._distance);else{const t=this._curveBuilder.getLineCurve(e,this._distance);this.addCurve(t,Qt.EXTERIOR,Qt.INTERIOR)}}addCurve(t,e,n){if(null===t||t.length<2)return null;const s=new Ws(t,new qn(0,Qt.BOUNDARY,e,n));this._curveList.add(s)}getCurves(){return this.add(this._inputGeom),this._curveList}add(t){if(t.isEmpty())return null;if(t instanceof it)this.addPolygon(t);else if(t instanceof J)this.addLineString(t);else if(t instanceof tt)this.addPoint(t);else if(t instanceof ht)this.addCollection(t);else if(t instanceof wt)this.addCollection(t);else if(t instanceof ft)this.addCollection(t);else{if(!(t instanceof ct))throw new j(t.getGeometryType());this.addCollection(t)}}isErodedCompletely(t,e){const n=t.getCoordinates();if(n.length<4)return e<0;if(4===n.length)return this.isTriangleErodedCompletely(n,e);const s=t.getEnvelopeInternal(),i=Math.min(s.getHeight(),s.getWidth());return e<0&&2*Math.abs(e)>i}addCollection(t){for(let e=0;e<t.getNumGeometries();e++){const n=t.getGeometryN(e);this.add(n)}}}class Ni{constructor(){Ni.constructor_.apply(this,arguments)}static constructor_(){this._edgeMap=new Hn,this._edgeList=null,this._ptInAreaLocation=[Qt.NONE,Qt.NONE]}getNextCW(t){this.getEdges();const e=this._edgeList.indexOf(t);let n=e-1;return 0===e&&(n=this._edgeList.size()-1),this._edgeList.get(n)}propagateSideLabels(t){let e=Qt.NONE;for(let n=this.iterator();n.hasNext();){const s=n.next().getLabel();s.isArea(t)&&s.getLocation(t,Mn.LEFT)!==Qt.NONE&&(e=s.getLocation(t,Mn.LEFT))}if(e===Qt.NONE)return null;let n=e;for(let e=this.iterator();e.hasNext();){const s=e.next(),i=s.getLabel();if(i.getLocation(t,Mn.ON)===Qt.NONE&&i.setLocation(t,Mn.ON,n),i.isArea(t)){const e=i.getLocation(t,Mn.LEFT),r=i.getLocation(t,Mn.RIGHT);if(r!==Qt.NONE){if(r!==n)throw new ss("side location conflict",s.getCoordinate());e===Qt.NONE&&g.shouldNeverReachHere("found single null side (at "+s.getCoordinate()+")"),n=e}else g.isTrue(i.getLocation(t,Mn.LEFT)===Qt.NONE,"found single null side"),i.setLocation(t,Mn.RIGHT,n),i.setLocation(t,Mn.LEFT,n)}}}getCoordinate(){const t=this.iterator();if(!t.hasNext())return null;return t.next().getCoordinate()}print(t){B.out.println("EdgeEndStar:   "+this.getCoordinate());for(let e=this.iterator();e.hasNext();){e.next().print(t)}}isAreaLabelsConsistent(t){return this.computeEdgeEndLabels(t.getBoundaryNodeRule()),this.checkAreaLabelsConsistent(0)}checkAreaLabelsConsistent(t){const e=this.getEdges();if(e.size()<=0)return!0;const n=e.size()-1,s=e.get(n).getLabel().getLocation(t,Mn.LEFT);g.isTrue(s!==Qt.NONE,"Found unlabelled area edge");let i=s;for(let e=this.iterator();e.hasNext();){const n=e.next().getLabel();g.isTrue(n.isArea(t),"Found non-area edge");const s=n.getLocation(t,Mn.LEFT),r=n.getLocation(t,Mn.RIGHT);if(s===r)return!1;if(r!==i)return!1;i=s}return!0}findIndex(t){this.iterator();for(let e=0;e<this._edgeList.size();e++){if(this._edgeList.get(e)===t)return e}return-1}iterator(){return this.getEdges().iterator()}getEdges(){return null===this._edgeList&&(this._edgeList=new L(this._edgeMap.values())),this._edgeList}getLocation(t,e,n){return this._ptInAreaLocation[t]===Qt.NONE&&(this._ptInAreaLocation[t]=Ze.locate(e,n[t].getGeometry())),this._ptInAreaLocation[t]}toString(){const t=new v;t.append("EdgeEndStar:   "+this.getCoordinate()),t.append("\n");for(let e=this.iterator();e.hasNext();){const n=e.next();t.append(n),t.append("\n")}return t.toString()}computeEdgeEndLabels(t){for(let e=this.iterator();e.hasNext();){e.next().computeLabel(t)}}computeLabelling(t){this.computeEdgeEndLabels(t[0].getBoundaryNodeRule()),this.propagateSideLabels(0),this.propagateSideLabels(1);const e=[!1,!1];for(let t=this.iterator();t.hasNext();){const n=t.next().getLabel();for(let t=0;t<2;t++)n.isLine(t)&&n.getLocation(t)===Qt.BOUNDARY&&(e[t]=!0)}for(let n=this.iterator();n.hasNext();){const s=n.next(),i=s.getLabel();for(let n=0;n<2;n++)if(i.isAnyNull(n)){let r=Qt.NONE;if(e[n])r=Qt.EXTERIOR;else{const e=s.getCoordinate();r=this.getLocation(n,e,t)}i.setAllLocationsIfNull(n,r)}}}getDegree(){return this._edgeMap.size()}insertEdgeEnd(t,e){this._edgeMap.put(t,e),this._edgeList=null}}class Si extends Ni{constructor(){super(),Si.constructor_.apply(this,arguments)}static constructor_(){this._resultAreaEdgeList=null,this._label=null,this._SCANNING_FOR_INCOMING=1,this._LINKING_TO_OUTGOING=2}linkResultDirectedEdges(){this.getResultAreaEdges();let t=null,e=null,n=this._SCANNING_FOR_INCOMING;for(let s=0;s<this._resultAreaEdgeList.size();s++){const i=this._resultAreaEdgeList.get(s),r=i.getSym();if(i.getLabel().isArea())switch(null===t&&i.isInResult()&&(t=i),n){case this._SCANNING_FOR_INCOMING:if(!r.isInResult())continue;e=r,n=this._LINKING_TO_OUTGOING;break;case this._LINKING_TO_OUTGOING:if(!i.isInResult())continue;e.setNext(i),n=this._SCANNING_FOR_INCOMING}}if(n===this._LINKING_TO_OUTGOING){if(null===t)throw new ss("no outgoing dirEdge found",this.getCoordinate());g.isTrue(t.isInResult(),"unable to link last incoming dirEdge"),e.setNext(t)}}insert(t){const e=t;this.insertEdgeEnd(e,e)}getRightmostEdge(){const t=this.getEdges(),e=t.size();if(e<1)return null;const n=t.get(0);if(1===e)return n;const s=t.get(e-1),i=n.getQuadrant(),r=s.getQuadrant();return wn.isNorthern(i)&&wn.isNorthern(r)?n:wn.isNorthern(i)||wn.isNorthern(r)?0!==n.getDy()?n:0!==s.getDy()?s:(g.shouldNeverReachHere("found two horizontal edges incident on node"),null):s}print(t){B.out.println("DirectedEdgeStar: "+this.getCoordinate());for(let e=this.iterator();e.hasNext();){const n=e.next();t.print("out "),n.print(t),t.println(),t.print("in "),n.getSym().print(t),t.println()}}getResultAreaEdges(){if(null!==this._resultAreaEdgeList)return this._resultAreaEdgeList;this._resultAreaEdgeList=new L;for(let t=this.iterator();t.hasNext();){const e=t.next();(e.isInResult()||e.getSym().isInResult())&&this._resultAreaEdgeList.add(e)}return this._resultAreaEdgeList}updateLabelling(t){for(let e=this.iterator();e.hasNext();){const n=e.next().getLabel();n.setAllLocationsIfNull(0,t.getLocation(0)),n.setAllLocationsIfNull(1,t.getLocation(1))}}linkAllDirectedEdges(){this.getEdges();let t=null,e=null;for(let n=this._edgeList.size()-1;n>=0;n--){const s=this._edgeList.get(n),i=s.getSym();null===e&&(e=i),null!==t&&i.setNext(t),t=s}e.setNext(t)}computeDepths(){if(1===arguments.length){const t=arguments[0],e=this.findIndex(t),n=t.getDepth(Mn.LEFT),s=t.getDepth(Mn.RIGHT),i=this.computeDepths(e+1,this._edgeList.size(),n);if(this.computeDepths(0,e,i)!==s)throw new ss("depth mismatch at "+t.getCoordinate())}else if(3===arguments.length){const t=arguments[1];let e=arguments[2];for(let n=arguments[0];n<t;n++){const t=this._edgeList.get(n);t.setEdgeDepths(Mn.RIGHT,e),e=t.getDepth(Mn.LEFT)}return e}}mergeSymLabels(){for(let t=this.iterator();t.hasNext();){const e=t.next();e.getLabel().merge(e.getSym().getLabel())}}linkMinimalDirectedEdges(t){let e=null,n=null,s=this._SCANNING_FOR_INCOMING;for(let i=this._resultAreaEdgeList.size()-1;i>=0;i--){const r=this._resultAreaEdgeList.get(i),o=r.getSym();switch(null===e&&r.getEdgeRing()===t&&(e=r),s){case this._SCANNING_FOR_INCOMING:if(o.getEdgeRing()!==t)continue;n=o,s=this._LINKING_TO_OUTGOING;break;case this._LINKING_TO_OUTGOING:if(r.getEdgeRing()!==t)continue;n.setNextMin(r),s=this._SCANNING_FOR_INCOMING}}s===this._LINKING_TO_OUTGOING&&(g.isTrue(null!==e,"found null for first outgoing dirEdge"),g.isTrue(e.getEdgeRing()===t,"unable to link last incoming dirEdge"),n.setNextMin(e))}getOutgoingDegree(){if(0===arguments.length){let t=0;for(let e=this.iterator();e.hasNext();){e.next().isInResult()&&t++}return t}if(1===arguments.length){const t=arguments[0];let e=0;for(let n=this.iterator();n.hasNext();){n.next().getEdgeRing()===t&&e++}return e}}getLabel(){return this._label}findCoveredLineEdges(){let t=Qt.NONE;for(let e=this.iterator();e.hasNext();){const n=e.next(),s=n.getSym();if(!n.isLineEdge()){if(n.isInResult()){t=Qt.INTERIOR;break}if(s.isInResult()){t=Qt.EXTERIOR;break}}}if(t===Qt.NONE)return null;let e=t;for(let t=this.iterator();t.hasNext();){const n=t.next(),s=n.getSym();n.isLineEdge()?n.getEdge().setCovered(e===Qt.INTERIOR):(n.isInResult()&&(e=Qt.EXTERIOR),s.isInResult()&&(e=Qt.INTERIOR))}}computeLabelling(t){super.computeLabelling.call(this,t),this._label=new qn(Qt.NONE);for(let t=this.iterator();t.hasNext();){const e=t.next().getEdge().getLabel();for(let t=0;t<2;t++){const n=e.getLocation(t);n!==Qt.INTERIOR&&n!==Qt.BOUNDARY||this._label.setLocation(t,Qt.INTERIOR)}}}}class wi extends rs{constructor(){super()}createNode(t){return new ts(t,new Si)}}class Ci{constructor(){Ci.constructor_.apply(this,arguments)}static constructor_(){this._pts=null,this._orientation=null;const t=arguments[0];this._pts=t,this._orientation=Ci.orientation(t)}static orientation(t){return 1===dt.increasingDirection(t)}static compareOriented(t,e,n,s){const i=e?1:-1,r=s?1:-1,o=e?t.length:-1,l=s?n.length:-1;let a=e?0:t.length-1,c=s?0:n.length-1;for(;;){const e=t[a].compareTo(n[c]);if(0!==e)return e;a+=i,c+=r;const s=a===o,h=c===l;if(s&&!h)return-1;if(!s&&h)return 1;if(s&&h)return 0}}compareTo(t){const e=t;return Ci.compareOriented(this._pts,this._orientation,e._pts,e._orientation)}get interfaces_(){return[o]}}class Li{constructor(){Li.constructor_.apply(this,arguments)}static constructor_(){this._edges=new L,this._ocaMap=new Hn}print(t){t.print("MULTILINESTRING ( ");for(let e=0;e<this._edges.size();e++){const n=this._edges.get(e);e>0&&t.print(","),t.print("(");const s=n.getCoordinates();for(let e=0;e<s.length;e++)e>0&&t.print(","),t.print(s[e].x+" "+s[e].y);t.println(")")}t.print(")  ")}addAll(t){for(let e=t.iterator();e.hasNext();)this.add(e.next())}findEdgeIndex(t){for(let e=0;e<this._edges.size();e++)if(this._edges.get(e).equals(t))return e;return-1}iterator(){return this._edges.iterator()}getEdges(){return this._edges}get(t){return this._edges.get(t)}findEqualEdge(t){const e=new Ci(t.getCoordinates());return this._ocaMap.get(e)}add(t){this._edges.add(t);const e=new Ci(t.getCoordinates());this._ocaMap.put(e,t)}}class Ti{processIntersections(t,e,n,s){}isDone(){}}class Ri{constructor(){Ri.constructor_.apply(this,arguments)}static constructor_(){this._hasIntersection=!1,this._hasProper=!1,this._hasProperInterior=!1,this._hasInterior=!1,this._properIntersectionPoint=null,this._li=null,this._isSelfIntersection=null,this.numIntersections=0,this.numInteriorIntersections=0,this.numProperIntersections=0,this.numTests=0;const t=arguments[0];this._li=t}static isAdjacentSegments(t,e){return 1===Math.abs(t-e)}isTrivialIntersection(t,e,n,s){if(t===n&&1===this._li.getIntersectionNum()){if(Ri.isAdjacentSegments(e,s))return!0;if(t.isClosed()){const n=t.size()-1;if(0===e&&s===n||0===s&&e===n)return!0}}return!1}getProperIntersectionPoint(){return this._properIntersectionPoint}hasProperInteriorIntersection(){return this._hasProperInterior}getLineIntersector(){return this._li}hasProperIntersection(){return this._hasProper}processIntersections(t,e,n,s){if(t===n&&e===s)return null;this.numTests++;const i=t.getCoordinates()[e],r=t.getCoordinates()[e+1],o=n.getCoordinates()[s],l=n.getCoordinates()[s+1];this._li.computeIntersection(i,r,o,l),this._li.hasIntersection()&&(this.numIntersections++,this._li.isInteriorIntersection()&&(this.numInteriorIntersections++,this._hasInterior=!0),this.isTrivialIntersection(t,e,n,s)||(this._hasIntersection=!0,t.addIntersections(this._li,e,0),n.addIntersections(this._li,s,1),this._li.isProper()&&(this.numProperIntersections++,this._hasProper=!0,this._hasProperInterior=!0)))}hasIntersection(){return this._hasIntersection}isDone(){return!1}hasInteriorIntersection(){return this._hasInterior}get interfaces_(){return[Ti]}}class Pi{constructor(){Pi.constructor_.apply(this,arguments)}static constructor_(){this._bufParams=null,this._workingPrecisionModel=null,this._workingNoder=null,this._geomFact=null,this._graph=null,this._edgeList=new Li;const t=arguments[0];this._bufParams=t}static depthDelta(t){const e=t.getLocation(0,Mn.LEFT),n=t.getLocation(0,Mn.RIGHT);return e===Qt.INTERIOR&&n===Qt.EXTERIOR?1:e===Qt.EXTERIOR&&n===Qt.INTERIOR?-1:0}static convertSegStrings(t){const e=new Ct,n=new L;for(;t.hasNext();){const s=t.next(),i=e.createLineString(s.getCoordinates());n.add(i)}return e.buildGeometry(n)}setWorkingPrecisionModel(t){this._workingPrecisionModel=t}insertUniqueEdge(t){const e=this._edgeList.findEqualEdge(t);if(null!==e){const n=e.getLabel();let s=t.getLabel();e.isPointwiseEqual(t)||(s=new qn(t.getLabel()),s.flip()),n.merge(s);const i=Pi.depthDelta(s),r=e.getDepthDelta()+i;e.setDepthDelta(r)}else this._edgeList.add(t),t.setDepthDelta(Pi.depthDelta(t.getLabel()))}buildSubgraphs(t,e){const n=new L;for(let s=t.iterator();s.hasNext();){const t=s.next(),i=t.getRightmostCoordinate(),r=new xi(n).getDepth(i);t.computeDepth(r),t.findResultEdges(),n.add(t),e.add(t.getDirectedEdges(),t.getNodes())}}createSubgraphs(t){const e=new L;for(let n=t.getNodes().iterator();n.hasNext();){const t=n.next();if(!t.isVisited()){const n=new hi;n.create(t),e.add(n)}}return xe.sort(e,xe.reverseOrder()),e}createEmptyResultGeometry(){return this._geomFact.createPolygon()}getNoder(t){if(null!==this._workingNoder)return this._workingNoder;const e=new $s,n=new jt;return n.setPrecisionModel(t),e.setSegmentIntersector(new Ri(n)),e}buffer(t,e){let n=this._workingPrecisionModel;null===n&&(n=t.getPrecisionModel()),this._geomFact=t.getFactory();const s=new yi(n,this._bufParams),i=new Ii(t,e,s).getCurves();if(i.size()<=0)return this.createEmptyResultGeometry();this.computeNodedEdges(i,n),this._graph=new os(new wi),this._graph.addEdges(this._edgeList.getEdges());const r=this.createSubgraphs(this._graph),o=new _i(this._geomFact);this.buildSubgraphs(r,o);const l=o.getPolygons();if(l.size()<=0)return this.createEmptyResultGeometry();return this._geomFact.buildGeometry(l)}computeNodedEdges(t,e){const n=this.getNoder(e);n.computeNodes(t);for(let t=n.getNodedSubstrings().iterator();t.hasNext();){const e=t.next(),n=e.getCoordinates();if(2===n.length&&n[0].equals2D(n[1]))continue;const s=e.getData(),i=new $n(e.getCoordinates(),new qn(s));this.insertUniqueEdge(i)}}setNoder(t){this._workingNoder=t}}class Oi{constructor(){Oi.constructor_.apply(this,arguments)}static constructor_(){this._li=new jt,this._segStrings=null;const t=arguments[0];this._segStrings=t}checkEndPtVertexIntersections(){if(0===arguments.length)for(let t=this._segStrings.iterator();t.hasNext();){const e=t.next().getCoordinates();this.checkEndPtVertexIntersections(e[0],this._segStrings),this.checkEndPtVertexIntersections(e[e.length-1],this._segStrings)}else if(2===arguments.length){const t=arguments[0];for(let e=arguments[1].iterator();e.hasNext();){const n=e.next().getCoordinates();for(let e=1;e<n.length-1;e++)if(n[e].equals(t))throw new h("found endpt/interior pt intersection at index "+e+" :pt "+t)}}}checkInteriorIntersections(){if(0===arguments.length)for(let t=this._segStrings.iterator();t.hasNext();){const e=t.next();for(let t=this._segStrings.iterator();t.hasNext();){const n=t.next();this.checkInteriorIntersections(e,n)}}else if(2===arguments.length){const t=arguments[0],e=arguments[1],n=t.getCoordinates(),s=e.getCoordinates();for(let i=0;i<n.length-1;i++)for(let n=0;n<s.length-1;n++)this.checkInteriorIntersections(t,i,e,n)}else if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];if(t===n&&e===s)return null;const i=t.getCoordinates()[e],r=t.getCoordinates()[e+1],o=n.getCoordinates()[s],l=n.getCoordinates()[s+1];if(this._li.computeIntersection(i,r,o,l),this._li.hasIntersection()&&(this._li.isProper()||this.hasInteriorIntersection(this._li,i,r)||this.hasInteriorIntersection(this._li,o,l)))throw new h("found non-noded intersection at "+i+"-"+r+" and "+o+"-"+l)}}checkValid(){this.checkEndPtVertexIntersections(),this.checkInteriorIntersections(),this.checkCollapses()}checkCollapses(){if(0===arguments.length)for(let t=this._segStrings.iterator();t.hasNext();){const e=t.next();this.checkCollapses(e)}else if(1===arguments.length){const t=arguments[0].getCoordinates();for(let e=0;e<t.length-2;e++)this.checkCollapse(t[e],t[e+1],t[e+2])}}hasInteriorIntersection(t,e,n){for(let s=0;s<t.getIntersectionNum();s++){const i=t.getIntersection(s);if(!i.equals(e)&&!i.equals(n))return!0}return!1}checkCollapse(t,e,n){if(t.equals(n))throw new h("found non-noded collapse at "+Oi.fact.createLineString([t,e,n]))}}Oi.fact=new Ct;class vi{constructor(){vi.constructor_.apply(this,arguments)}static constructor_(){this._li=null,this._pt=null,this._originalPt=null,this._ptScaled=null,this._p0Scaled=null,this._p1Scaled=null,this._scaleFactor=null,this._minx=null,this._maxx=null,this._miny=null,this._maxy=null,this._corner=new Array(4).fill(null),this._safeEnv=null;const t=arguments[0],e=arguments[1],n=arguments[2];if(this._originalPt=t,this._pt=t,this._scaleFactor=e,this._li=n,e<=0)throw new s("Scale factor must be non-zero");1!==e&&(this._pt=new m(this.scale(t.x),this.scale(t.y)),this._p0Scaled=new m,this._p1Scaled=new m),this.initCorners(this._pt)}intersectsScaled(t,e){const n=Math.min(t.x,e.x),s=Math.max(t.x,e.x),i=Math.min(t.y,e.y),r=Math.max(t.y,e.y),o=this._maxx<n||this._minx>s||this._maxy<i||this._miny>r;if(o)return!1;const l=this.intersectsToleranceSquare(t,e);return g.isTrue(!(o&&l),"Found bad envelope test"),l}initCorners(t){const e=.5;this._minx=t.x-e,this._maxx=t.x+e,this._miny=t.y-e,this._maxy=t.y+e,this._corner[0]=new m(this._maxx,this._maxy),this._corner[1]=new m(this._minx,this._maxy),this._corner[2]=new m(this._minx,this._miny),this._corner[3]=new m(this._maxx,this._miny)}intersects(t,e){return 1===this._scaleFactor?this.intersectsScaled(t,e):(this.copyScaled(t,this._p0Scaled),this.copyScaled(e,this._p1Scaled),this.intersectsScaled(this._p0Scaled,this._p1Scaled))}scale(t){return Math.round(t*this._scaleFactor)}getCoordinate(){return this._originalPt}copyScaled(t,e){e.x=this.scale(t.x),e.y=this.scale(t.y)}getSafeEnvelope(){if(null===this._safeEnv){const t=vi.SAFE_ENV_EXPANSION_FACTOR/this._scaleFactor;this._safeEnv=new O(this._originalPt.x-t,this._originalPt.x+t,this._originalPt.y-t,this._originalPt.y+t)}return this._safeEnv}intersectsPixelClosure(t,e){return this._li.computeIntersection(t,e,this._corner[0],this._corner[1]),!!this._li.hasIntersection()||(this._li.computeIntersection(t,e,this._corner[1],this._corner[2]),!!this._li.hasIntersection()||(this._li.computeIntersection(t,e,this._corner[2],this._corner[3]),!!this._li.hasIntersection()||(this._li.computeIntersection(t,e,this._corner[3],this._corner[0]),!!this._li.hasIntersection())))}intersectsToleranceSquare(t,e){let n=!1,s=!1;return this._li.computeIntersection(t,e,this._corner[0],this._corner[1]),!!this._li.isProper()||(this._li.computeIntersection(t,e,this._corner[1],this._corner[2]),!!this._li.isProper()||(this._li.hasIntersection()&&(n=!0),this._li.computeIntersection(t,e,this._corner[2],this._corner[3]),!!this._li.isProper()||(this._li.hasIntersection()&&(s=!0),this._li.computeIntersection(t,e,this._corner[3],this._corner[0]),!!this._li.isProper()||(!(!n||!s)||(!!t.equals(this._pt)||!!e.equals(this._pt))))))}addSnappedNode(t,e){const n=t.getCoordinate(e),s=t.getCoordinate(e+1);return!!this.intersects(n,s)&&(t.addIntersection(this.getCoordinate(),e),!0)}}vi.SAFE_ENV_EXPANSION_FACTOR=.75;class Mi{constructor(){Mi.constructor_.apply(this,arguments)}static constructor_(){this.selectedSegment=new Kt}select(){if(1===arguments.length);else if(2===arguments.length){const t=arguments[1];arguments[0].getLineSegment(t,this.selectedSegment),this.select(this.selectedSegment)}}}class bi{constructor(){bi.constructor_.apply(this,arguments)}static constructor_(){this._index=null;const t=arguments[0];this._index=t}snap(){if(1===arguments.length){const t=arguments[0];return this.snap(t,null,-1)}if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=t.getSafeEnvelope(),i=new Di(t,e,n);return this._index.query(s,new class{get interfaces_(){return[De]}visitItem(t){t.select(s,i)}}),i.isNodeAdded()}}}class Di extends Mi{constructor(){super(),Di.constructor_.apply(this,arguments)}static constructor_(){this._hotPixel=null,this._parentEdge=null,this._hotPixelVertexIndex=null,this._isNodeAdded=!1;const t=arguments[0],e=arguments[1],n=arguments[2];this._hotPixel=t,this._parentEdge=e,this._hotPixelVertexIndex=n}isNodeAdded(){return this._isNodeAdded}select(){if(!(2===arguments.length&&Number.isInteger(arguments[1])&&arguments[0]instanceof js))return super.select.apply(this,arguments);{const t=arguments[1],e=arguments[0].getContext();if(this._parentEdge===e&&(t===this._hotPixelVertexIndex||t+1===this._hotPixelVertexIndex))return null;this._isNodeAdded|=this._hotPixel.addSnappedNode(e,t)}}}bi.HotPixelSnapAction=Di;class Ai{constructor(){Ai.constructor_.apply(this,arguments)}static constructor_(){this._li=null,this._interiorIntersections=null;const t=arguments[0];this._li=t,this._interiorIntersections=new L}processIntersections(t,e,n,s){if(t===n&&e===s)return null;const i=t.getCoordinates()[e],r=t.getCoordinates()[e+1],o=n.getCoordinates()[s],l=n.getCoordinates()[s+1];if(this._li.computeIntersection(i,r,o,l),this._li.hasIntersection()&&this._li.isInteriorIntersection()){for(let t=0;t<this._li.getIntersectionNum();t++)this._interiorIntersections.add(this._li.getIntersection(t));t.addIntersections(this._li,e,0),n.addIntersections(this._li,s,1)}}isDone(){return!1}getInteriorIntersections(){return this._interiorIntersections}get interfaces_(){return[Ti]}}class Fi{constructor(){Fi.constructor_.apply(this,arguments)}static constructor_(){this._pm=null,this._li=null,this._scaleFactor=null,this._noder=null,this._pointSnapper=null,this._nodedSegStrings=null;const t=arguments[0];this._pm=t,this._li=new jt,this._li.setPrecisionModel(t),this._scaleFactor=t.getScale()}checkCorrectness(t){const e=Ws.getNodedSubstrings(t),s=new Oi(e);try{s.checkValid()}catch(t){if(!(t instanceof n))throw t;t.printStackTrace()}}getNodedSubstrings(){return Ws.getNodedSubstrings(this._nodedSegStrings)}snapRound(t,e){const n=this.findInteriorIntersections(t,e);this.computeIntersectionSnaps(n),this.computeVertexSnaps(t)}findInteriorIntersections(t,e){const n=new Ai(e);return this._noder.setSegmentIntersector(n),this._noder.computeNodes(t),n.getInteriorIntersections()}computeVertexSnaps(){if(I(arguments[0],N)){for(let t=arguments[0].iterator();t.hasNext();){const e=t.next();this.computeVertexSnaps(e)}}else if(arguments[0]instanceof Ws){const t=arguments[0],e=t.getCoordinates();for(let n=0;n<e.length;n++){const s=new vi(e[n],this._scaleFactor,this._li);this._pointSnapper.snap(s,t,n)&&t.addIntersection(e[n],n)}}}computeNodes(t){this._nodedSegStrings=t,this._noder=new $s,this._pointSnapper=new bi(this._noder.getIndex()),this.snapRound(t,this._li)}computeIntersectionSnaps(t){for(let e=t.iterator();e.hasNext();){const t=e.next(),n=new vi(t,this._scaleFactor,this._li);this._pointSnapper.snap(n)}}get interfaces_(){return[Qs]}}class Gi{constructor(){Gi.constructor_.apply(this,arguments)}static constructor_(){if(this._argGeom=null,this._distance=null,this._bufParams=new li,this._resultGeometry=null,this._saveException=null,1===arguments.length){const t=arguments[0];this._argGeom=t}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this._argGeom=t,this._bufParams=e}}static bufferOp(){if(2===arguments.length){const t=arguments[1];return new Gi(arguments[0]).getResultGeometry(t)}if(3===arguments.length){if(Number.isInteger(arguments[2])&&arguments[0]instanceof X&&"number"==typeof arguments[1]){const t=arguments[1],e=arguments[2],n=new Gi(arguments[0]);n.setQuadrantSegments(e);return n.getResultGeometry(t)}if(arguments[2]instanceof li&&arguments[0]instanceof X&&"number"==typeof arguments[1]){const t=arguments[1];return new Gi(arguments[0],arguments[2]).getResultGeometry(t)}}else if(4===arguments.length){const t=arguments[1],e=arguments[2],n=arguments[3],s=new Gi(arguments[0]);s.setQuadrantSegments(e),s.setEndCapStyle(n);return s.getResultGeometry(t)}}static precisionScaleFactor(t,e,n){const s=t.getEnvelopeInternal(),i=Y.max(Math.abs(s.getMaxX()),Math.abs(s.getMaxY()),Math.abs(s.getMinX()),Math.abs(s.getMinY()))+2*(e>0?e:0),r=n-Math.trunc(Math.log(i)/Math.log(10)+1);return Math.pow(10,r)}bufferFixedPrecision(t){const e=new ei(new Fi(new Nt(1)),t.getScale()),n=new Pi(this._bufParams);n.setWorkingPrecisionModel(t),n.setNoder(e),this._resultGeometry=n.buffer(this._argGeom,this._distance)}bufferReducedPrecision(){if(0===arguments.length){for(let t=Gi.MAX_PRECISION_DIGITS;t>=0;t--){try{this.bufferReducedPrecision(t)}catch(t){if(!(t instanceof ss))throw t;this._saveException=t}if(null!==this._resultGeometry)return null}throw this._saveException}if(1===arguments.length){const t=arguments[0],e=Gi.precisionScaleFactor(this._argGeom,this._distance,t),n=new Nt(e);this.bufferFixedPrecision(n)}}computeGeometry(){if(this.bufferOriginalPrecision(),null!==this._resultGeometry)return null;const t=this._argGeom.getFactory().getPrecisionModel();t.getType()===Nt.FIXED?this.bufferFixedPrecision(t):this.bufferReducedPrecision()}setQuadrantSegments(t){this._bufParams.setQuadrantSegments(t)}bufferOriginalPrecision(){try{const t=new Pi(this._bufParams);this._resultGeometry=t.buffer(this._argGeom,this._distance)}catch(t){if(!(t instanceof h))throw t;this._saveException=t}}getResultGeometry(t){return this._distance=t,this.computeGeometry(),this._resultGeometry}setEndCapStyle(t){this._bufParams.setEndCapStyle(t)}}Gi.CAP_ROUND=li.CAP_ROUND,Gi.CAP_BUTT=li.CAP_FLAT,Gi.CAP_FLAT=li.CAP_FLAT,Gi.CAP_SQUARE=li.CAP_SQUARE,Gi.MAX_PRECISION_DIGITS=12;var qi=Object.freeze({__proto__:null,BufferOp:Gi,BufferParameters:li});class Bi{constructor(){Bi.constructor_.apply(this,arguments)}static constructor_(){if(this._component=null,this._segIndex=null,this._pt=null,2===arguments.length){const t=arguments[0],e=arguments[1];Bi.constructor_.call(this,t,Bi.INSIDE_AREA,e)}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];this._component=t,this._segIndex=e,this._pt=n}}getSegmentIndex(){return this._segIndex}getCoordinate(){return this._pt}isInsideArea(){return this._segIndex===Bi.INSIDE_AREA}toString(){return this._component.getGeometryType()+"["+this._segIndex+"]-"+Wt.toPoint(this._pt)}getGeometryComponent(){return this._component}}Bi.INSIDE_AREA=-1;class Yi{constructor(){Yi.constructor_.apply(this,arguments)}static constructor_(){this._locations=null;const t=arguments[0];this._locations=t}static getLocations(t){const e=new L;return t.apply(new Yi(e)),e}filter(t){if(t.isEmpty())return null;(t instanceof tt||t instanceof J||t instanceof it)&&this._locations.add(new Bi(t,0,t.getCoordinate()))}get interfaces_(){return[Q]}}class Vi{constructor(){Vi.constructor_.apply(this,arguments)}static constructor_(){if(this._geom=null,this._terminateDistance=0,this._ptLocator=new fn,this._minDistanceLocation=null,this._minDistance=r.MAX_VALUE,2===arguments.length){const t=arguments[0],e=arguments[1];Vi.constructor_.call(this,t,e,0)}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];this._geom=new Array(2).fill(null),this._geom[0]=t,this._geom[1]=e,this._terminateDistance=n}}static distance(t,e){return new Vi(t,e).distance()}static isWithinDistance(t,e,n){if(t.getEnvelopeInternal().distance(e.getEnvelopeInternal())>n)return!1;return new Vi(t,e,n).distance()<=n}static nearestPoints(t,e){return new Vi(t,e).nearestPoints()}computeContainmentDistance(){if(0===arguments.length){const t=new Array(2).fill(null);if(this.computeContainmentDistance(0,t),this._minDistance<=this._terminateDistance)return null;this.computeContainmentDistance(1,t)}else if(2===arguments.length){const t=arguments[0],e=arguments[1],n=this._geom[t];if(n.getDimension()<2)return null;const s=1-t,i=Ie.getPolygons(n);if(i.size()>0){const n=Yi.getLocations(this._geom[s]);if(this.computeContainmentDistance(n,i,e),this._minDistance<=this._terminateDistance)return this._minDistanceLocation[s]=e[0],this._minDistanceLocation[t]=e[1],null}}else if(3===arguments.length)if(arguments[2]instanceof Array&&I(arguments[0],w)&&I(arguments[1],w)){const t=arguments[0],e=arguments[1],n=arguments[2];for(let s=0;s<t.size();s++){const i=t.get(s);for(let t=0;t<e.size();t++)if(this.computeContainmentDistance(i,e.get(t),n),this._minDistance<=this._terminateDistance)return null}}else if(arguments[2]instanceof Array&&arguments[0]instanceof Bi&&arguments[1]instanceof it){const t=arguments[0],e=arguments[1],n=arguments[2],s=t.getCoordinate();if(Qt.EXTERIOR!==this._ptLocator.locate(s,e))return this._minDistance=0,n[0]=t,n[1]=new Bi(e,s),null}}computeMinDistanceLinesPoints(t,e,n){for(let s=0;s<t.size();s++){const i=t.get(s);for(let t=0;t<e.size();t++){const s=e.get(t);if(this.computeMinDistance(i,s,n),this._minDistance<=this._terminateDistance)return null}}}computeFacetDistance(){const t=new Array(2).fill(null),e=ye.getLines(this._geom[0]),n=ye.getLines(this._geom[1]),s=Ee.getPoints(this._geom[0]),i=Ee.getPoints(this._geom[1]);return this.computeMinDistanceLines(e,n,t),this.updateMinDistance(t,!1),this._minDistance<=this._terminateDistance?null:(t[0]=null,t[1]=null,this.computeMinDistanceLinesPoints(e,i,t),this.updateMinDistance(t,!1),this._minDistance<=this._terminateDistance?null:(t[0]=null,t[1]=null,this.computeMinDistanceLinesPoints(n,s,t),this.updateMinDistance(t,!0),this._minDistance<=this._terminateDistance?null:(t[0]=null,t[1]=null,this.computeMinDistancePoints(s,i,t),void this.updateMinDistance(t,!1))))}nearestLocations(){return this.computeMinDistance(),this._minDistanceLocation}updateMinDistance(t,e){if(null===t[0])return null;e?(this._minDistanceLocation[0]=t[1],this._minDistanceLocation[1]=t[0]):(this._minDistanceLocation[0]=t[0],this._minDistanceLocation[1]=t[1])}nearestPoints(){this.computeMinDistance();return[this._minDistanceLocation[0].getCoordinate(),this._minDistanceLocation[1].getCoordinate()]}computeMinDistance(){if(0===arguments.length){if(null!==this._minDistanceLocation)return null;if(this._minDistanceLocation=new Array(2).fill(null),this.computeContainmentDistance(),this._minDistance<=this._terminateDistance)return null;this.computeFacetDistance()}else if(3===arguments.length)if(arguments[2]instanceof Array&&arguments[0]instanceof J&&arguments[1]instanceof tt){const t=arguments[0],e=arguments[1],n=arguments[2];if(t.getEnvelopeInternal().distance(e.getEnvelopeInternal())>this._minDistance)return null;const s=t.getCoordinates(),i=e.getCoordinate();for(let r=0;r<s.length-1;r++){const o=V.pointToSegment(i,s[r],s[r+1]);if(o<this._minDistance){this._minDistance=o;const l=new Kt(s[r],s[r+1]).closestPoint(i);n[0]=new Bi(t,r,l),n[1]=new Bi(e,0,i)}if(this._minDistance<=this._terminateDistance)return null}}else if(arguments[2]instanceof Array&&arguments[0]instanceof J&&arguments[1]instanceof J){const t=arguments[0],e=arguments[1],n=arguments[2];if(t.getEnvelopeInternal().distance(e.getEnvelopeInternal())>this._minDistance)return null;const s=t.getCoordinates(),i=e.getCoordinates();for(let r=0;r<s.length-1;r++){const o=new O(s[r],s[r+1]);if(!(o.distance(e.getEnvelopeInternal())>this._minDistance))for(let l=0;l<i.length-1;l++){const a=new O(i[l],i[l+1]);if(o.distance(a)>this._minDistance)continue;const c=V.segmentToSegment(s[r],s[r+1],i[l],i[l+1]);if(c<this._minDistance){this._minDistance=c;const o=new Kt(s[r],s[r+1]),a=new Kt(i[l],i[l+1]),h=o.closestPoints(a);n[0]=new Bi(t,r,h[0]),n[1]=new Bi(e,l,h[1])}if(this._minDistance<=this._terminateDistance)return null}}}}computeMinDistancePoints(t,e,n){for(let s=0;s<t.size();s++){const i=t.get(s);for(let t=0;t<e.size();t++){const s=e.get(t),r=i.getCoordinate().distance(s.getCoordinate());if(r<this._minDistance&&(this._minDistance=r,n[0]=new Bi(i,0,i.getCoordinate()),n[1]=new Bi(s,0,s.getCoordinate())),this._minDistance<=this._terminateDistance)return null}}}distance(){if(null===this._geom[0]||null===this._geom[1])throw new s("null geometries are not supported");return this._geom[0].isEmpty()||this._geom[1].isEmpty()?0:(this.computeMinDistance(),this._minDistance)}computeMinDistanceLines(t,e,n){for(let s=0;s<t.size();s++){const i=t.get(s);for(let t=0;t<e.size();t++){const s=e.get(t);if(this.computeMinDistance(i,s,n),this._minDistance<=this._terminateDistance)return null}}}}var zi=Object.freeze({__proto__:null,DistanceOp:Vi});class ki{constructor(){ki.constructor_.apply(this,arguments)}static constructor_(){this._factory=null,this._directedEdges=new L,this._coordinates=null;const t=arguments[0];this._factory=t}getCoordinates(){if(null===this._coordinates){let t=0,e=0;const n=new R;for(let s=this._directedEdges.iterator();s.hasNext();){const i=s.next();i.getEdgeDirection()?t++:e++,n.add(i.getEdge().getLine().getCoordinates(),!1,i.getEdgeDirection())}this._coordinates=n.toCoordinateArray(),e>t&&dt.reverse(this._coordinates)}return this._coordinates}toLineString(){return this._factory.createLineString(this.getCoordinates())}add(t){this._directedEdges.add(t)}}class Xi{constructor(){Xi.constructor_.apply(this,arguments)}static constructor_(){this._isMarked=!1,this._isVisited=!1,this._data=null}static getComponentWithVisitedState(t,e){for(;t.hasNext();){const n=t.next();if(n.isVisited()===e)return n}return null}static setVisited(t,e){for(;t.hasNext();){t.next().setVisited(e)}}static setMarked(t,e){for(;t.hasNext();){t.next().setMarked(e)}}setVisited(t){this._isVisited=t}isMarked(){return this._isMarked}setData(t){this._data=t}getData(){return this._data}setMarked(t){this._isMarked=t}getContext(){return this._data}isVisited(){return this._isVisited}setContext(t){this._data=t}}class Ui extends Xi{constructor(){super(),Ui.constructor_.apply(this,arguments)}static constructor_(){if(this._parentEdge=null,this._from=null,this._to=null,this._p0=null,this._p1=null,this._sym=null,this._edgeDirection=null,this._quadrant=null,this._angle=null,0===arguments.length);else if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];this._from=t,this._to=e,this._edgeDirection=s,this._p0=t.getCoordinate(),this._p1=n;const i=this._p1.x-this._p0.x,r=this._p1.y-this._p0.y;this._quadrant=wn.quadrant(i,r),this._angle=Math.atan2(r,i)}}static toEdges(t){const e=new L;for(let n=t.iterator();n.hasNext();)e.add(n.next()._parentEdge);return e}isRemoved(){return null===this._parentEdge}compareDirection(t){return this._quadrant>t._quadrant?1:this._quadrant<t._quadrant?-1:G.index(t._p0,t._p1,this._p1)}getCoordinate(){return this._from.getCoordinate()}print(t){const e=this.getClass().getName(),n=e.lastIndexOf("."),s=e.substring(n+1);t.print("  "+s+": "+this._p0+" - "+this._p1+" "+this._quadrant+":"+this._angle)}getDirectionPt(){return this._p1}getAngle(){return this._angle}compareTo(t){const e=t;return this.compareDirection(e)}getFromNode(){return this._from}getSym(){return this._sym}setEdge(t){this._parentEdge=t}remove(){this._sym=null,this._parentEdge=null}getEdge(){return this._parentEdge}getQuadrant(){return this._quadrant}setSym(t){this._sym=t}getToNode(){return this._to}getEdgeDirection(){return this._edgeDirection}get interfaces_(){return[o]}}class Hi extends Ui{constructor(){super(),Hi.constructor_.apply(this,arguments)}static constructor_(){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];Ui.constructor_.call(this,t,e,n,s)}getNext(){return 2!==this.getToNode().getDegree()?null:this.getToNode().getOutEdges().getEdges().get(0)===this.getSym()?this.getToNode().getOutEdges().getEdges().get(1):(g.isTrue(this.getToNode().getOutEdges().getEdges().get(1)===this.getSym()),this.getToNode().getOutEdges().getEdges().get(0))}}class Wi extends Xi{constructor(){super(),Wi.constructor_.apply(this,arguments)}static constructor_(){if(this._dirEdge=null,0===arguments.length);else if(2===arguments.length){const t=arguments[0],e=arguments[1];this.setDirectedEdges(t,e)}}isRemoved(){return null===this._dirEdge}setDirectedEdges(t,e){this._dirEdge=[t,e],t.setEdge(this),e.setEdge(this),t.setSym(e),e.setSym(t),t.getFromNode().addOutEdge(t),e.getFromNode().addOutEdge(e)}getDirEdge(){if(Number.isInteger(arguments[0])){const t=arguments[0];return this._dirEdge[t]}if(arguments[0]instanceof ji){const t=arguments[0];return this._dirEdge[0].getFromNode()===t?this._dirEdge[0]:this._dirEdge[1].getFromNode()===t?this._dirEdge[1]:null}}remove(){this._dirEdge=null}getOppositeNode(t){return this._dirEdge[0].getFromNode()===t?this._dirEdge[0].getToNode():this._dirEdge[1].getFromNode()===t?this._dirEdge[1].getToNode():null}}class Zi{constructor(){Zi.constructor_.apply(this,arguments)}static constructor_(){this._outEdges=new L,this._sorted=!1}getNextEdge(t){const e=this.getIndex(t);return this._outEdges.get(this.getIndex(e+1))}getCoordinate(){const t=this.iterator();if(!t.hasNext())return null;return t.next().getCoordinate()}iterator(){return this.sortEdges(),this._outEdges.iterator()}sortEdges(){this._sorted||(xe.sort(this._outEdges),this._sorted=!0)}remove(t){this._outEdges.remove(t)}getEdges(){return this.sortEdges(),this._outEdges}getNextCWEdge(t){const e=this.getIndex(t);return this._outEdges.get(this.getIndex(e-1))}getIndex(){if(arguments[0]instanceof Wi){const t=arguments[0];this.sortEdges();for(let e=0;e<this._outEdges.size();e++){if(this._outEdges.get(e).getEdge()===t)return e}return-1}if(arguments[0]instanceof Ui){const t=arguments[0];this.sortEdges();for(let e=0;e<this._outEdges.size();e++){if(this._outEdges.get(e)===t)return e}return-1}if(Number.isInteger(arguments[0])){let t=arguments[0]%this._outEdges.size();return t<0&&(t+=this._outEdges.size()),t}}add(t){this._outEdges.add(t),this._sorted=!1}getDegree(){return this._outEdges.size()}}class ji extends Xi{constructor(){super(),ji.constructor_.apply(this,arguments)}static constructor_(){if(this._pt=null,this._deStar=null,1===arguments.length){const t=arguments[0];ji.constructor_.call(this,t,new Zi)}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this._pt=t,this._deStar=e}}static getEdgesBetween(t,e){const n=Ui.toEdges(t.getOutEdges().getEdges()),s=new xt(n),i=Ui.toEdges(e.getOutEdges().getEdges());return s.retainAll(i),s}isRemoved(){return null===this._pt}addOutEdge(t){this._deStar.add(t)}getCoordinate(){return this._pt}getOutEdges(){return this._deStar}remove(){if(0===arguments.length)this._pt=null;else if(1===arguments.length){const t=arguments[0];this._deStar.remove(t)}}getIndex(t){return this._deStar.getIndex(t)}getDegree(){return this._deStar.getDegree()}}class Ki extends Wi{constructor(){super(),Ki.constructor_.apply(this,arguments)}static constructor_(){this._line=null;const t=arguments[0];this._line=t}getLine(){return this._line}}class Qi{constructor(){Qi.constructor_.apply(this,arguments)}static constructor_(){this._nodeMap=new Hn}find(t){return this._nodeMap.get(t)}iterator(){return this._nodeMap.values().iterator()}remove(t){return this._nodeMap.remove(t)}values(){return this._nodeMap.values()}add(t){return this._nodeMap.put(t.getCoordinate(),t),t}}class Ji{constructor(){Ji.constructor_.apply(this,arguments)}static constructor_(){this._edges=new xt,this._dirEdges=new xt,this._nodeMap=new Qi}findNodesOfDegree(t){const e=new L;for(let n=this.nodeIterator();n.hasNext();){const s=n.next();s.getDegree()===t&&e.add(s)}return e}dirEdgeIterator(){return this._dirEdges.iterator()}edgeIterator(){return this._edges.iterator()}remove(){if(arguments[0]instanceof Wi){const t=arguments[0];this.remove(t.getDirEdge(0)),this.remove(t.getDirEdge(1)),this._edges.remove(t),t.remove()}else if(arguments[0]instanceof Ui){const t=arguments[0],e=t.getSym();null!==e&&e.setSym(null),t.getFromNode().remove(t),t.remove(),this._dirEdges.remove(t)}else if(arguments[0]instanceof ji){const t=arguments[0];for(let e=t.getOutEdges().getEdges().iterator();e.hasNext();){const t=e.next(),n=t.getSym();null!==n&&this.remove(n),this._dirEdges.remove(t);const s=t.getEdge();null!==s&&this._edges.remove(s)}this._nodeMap.remove(t.getCoordinate()),t.remove()}}findNode(t){return this._nodeMap.find(t)}getEdges(){return this._edges}nodeIterator(){return this._nodeMap.iterator()}contains(){if(arguments[0]instanceof Wi){const t=arguments[0];return this._edges.contains(t)}if(arguments[0]instanceof Ui){const t=arguments[0];return this._dirEdges.contains(t)}}add(){if(arguments[0]instanceof ji){const t=arguments[0];this._nodeMap.add(t)}else if(arguments[0]instanceof Wi){const t=arguments[0];this._edges.add(t),this.add(t.getDirEdge(0)),this.add(t.getDirEdge(1))}else if(arguments[0]instanceof Ui){const t=arguments[0];this._dirEdges.add(t)}}getNodes(){return this._nodeMap.values()}}class $i extends Ji{constructor(){super()}addEdge(t){if(t.isEmpty())return null;const e=dt.removeRepeatedPoints(t.getCoordinates());if(e.length<=1)return null;const n=e[0],s=e[e.length-1],i=this.getNode(n),r=this.getNode(s),o=new Hi(i,r,e[1],!0),l=new Hi(r,i,e[e.length-2],!1),a=new Ki(t);a.setDirectedEdges(o,l),this.add(a)}getNode(t){let e=this.findNode(t);return null===e&&(e=new ji(t),this.add(e)),e}}class tr{constructor(){tr.constructor_.apply(this,arguments)}static constructor_(){this._graph=new $i,this._mergedLineStrings=null,this._factory=null,this._edgeStrings=null}buildEdgeStringsForUnprocessedNodes(){for(let t=this._graph.getNodes().iterator();t.hasNext();){const e=t.next();e.isMarked()||(g.isTrue(2===e.getDegree()),this.buildEdgeStringsStartingAt(e),e.setMarked(!0))}}buildEdgeStringsForNonDegree2Nodes(){for(let t=this._graph.getNodes().iterator();t.hasNext();){const e=t.next();2!==e.getDegree()&&(this.buildEdgeStringsStartingAt(e),e.setMarked(!0))}}buildEdgeStringsForObviousStartNodes(){this.buildEdgeStringsForNonDegree2Nodes()}getMergedLineStrings(){return this.merge(),this._mergedLineStrings}buildEdgeStringsStartingAt(t){for(let e=t.getOutEdges().iterator();e.hasNext();){const t=e.next();t.getEdge().isMarked()||this._edgeStrings.add(this.buildEdgeStringStartingWith(t))}}merge(){if(null!==this._mergedLineStrings)return null;Xi.setMarked(this._graph.nodeIterator(),!1),Xi.setMarked(this._graph.edgeIterator(),!1),this._edgeStrings=new L,this.buildEdgeStringsForObviousStartNodes(),this.buildEdgeStringsForIsolatedLoops(),this._mergedLineStrings=new L;for(let t=this._edgeStrings.iterator();t.hasNext();){const e=t.next();this._mergedLineStrings.add(e.toLineString())}}addLineString(t){null===this._factory&&(this._factory=t.getFactory()),this._graph.addEdge(t)}buildEdgeStringStartingWith(t){const e=new ki(this._factory);let n=t;do{e.add(n),n.getEdge().setMarked(!0),n=n.getNext()}while(null!==n&&n!==t);return e}add(){if(arguments[0]instanceof X){const t=arguments[0];for(let e=0;e<t.getNumGeometries();e++){const n=t.getGeometryN(e);n instanceof J&&this.addLineString(n)}}else if(I(arguments[0],N)){const t=arguments[0];this._mergedLineStrings=null;for(let e=t.iterator();e.hasNext();){const t=e.next();this.add(t)}}}buildEdgeStringsForIsolatedLoops(){this.buildEdgeStringsForUnprocessedNodes()}}class er{constructor(){er.constructor_.apply(this,arguments)}static constructor_(){this._parentGraph=null,this._edges=new xt,this._dirEdges=new L,this._nodeMap=new Qi;const t=arguments[0];this._parentGraph=t}dirEdgeIterator(){return this._dirEdges.iterator()}edgeIterator(){return this._edges.iterator()}getParent(){return this._parentGraph}nodeIterator(){return this._nodeMap.iterator()}contains(t){return this._edges.contains(t)}add(t){if(this._edges.contains(t))return null;this._edges.add(t),this._dirEdges.add(t.getDirEdge(0)),this._dirEdges.add(t.getDirEdge(1)),this._nodeMap.add(t.getDirEdge(0).getFromNode()),this._nodeMap.add(t.getDirEdge(1).getFromNode())}}class nr{constructor(){nr.constructor_.apply(this,arguments)}static constructor_(){this._graph=null;const t=arguments[0];this._graph=t}addReachable(t,e){const n=new en;for(n.add(t);!n.empty();){const t=n.pop();this.addEdges(t,n,e)}}findSubgraph(t){const e=new er(this._graph);return this.addReachable(t,e),e}getConnectedSubgraphs(){const t=new L;Xi.setVisited(this._graph.nodeIterator(),!1);for(let e=this._graph.edgeIterator();e.hasNext();){const n=e.next().getDirEdge(0).getFromNode();n.isVisited()||t.add(this.findSubgraph(n))}return t}addEdges(t,e,n){t.setVisited(!0);for(let s=t.getOutEdges().iterator();s.hasNext();){const t=s.next();n.add(t.getEdge());const i=t.getToNode();i.isVisited()||e.push(i)}}}class sr{constructor(){sr.constructor_.apply(this,arguments)}static constructor_(){this._graph=new $i,this._factory=new Ct,this._lineCount=0,this._isRun=!1,this._sequencedGeometry=null,this._isSequenceable=!1}static findUnvisitedBestOrientedDE(t){let e=null,n=null;for(let s=t.getOutEdges().iterator();s.hasNext();){const t=s.next();t.getEdge().isVisited()||(n=t,t.getEdgeDirection()&&(e=t))}return null!==e?e:n}static findLowestDegreeNode(t){let e=M.MAX_VALUE,n=null;for(let s=t.nodeIterator();s.hasNext();){const t=s.next();(null===n||t.getDegree()<e)&&(e=t.getDegree(),n=t)}return n}static isSequenced(t){if(!(t instanceof wt))return!0;const e=t,n=new lt;let s=null;const i=new L;for(let t=0;t<e.getNumGeometries();t++){const r=e.getGeometryN(t),o=r.getCoordinateN(0),l=r.getCoordinateN(r.getNumPoints()-1);if(n.contains(o))return!1;if(n.contains(l))return!1;null!==s&&(o.equals(s)||(n.addAll(i),i.clear())),i.add(o),i.add(l),s=l}return!0}static reverse(t){const e=t.getCoordinates(),n=new Array(e.length).fill(null),s=e.length;for(let t=0;t<s;t++)n[s-1-t]=new m(e[t]);return t.getFactory().createLineString(n)}static sequence(t){const e=new sr;return e.add(t),e.getSequencedLineStrings()}addLine(t){null===this._factory&&(this._factory=t.getFactory()),this._graph.addEdge(t),this._lineCount++}hasSequence(t){let e=0;for(let n=t.nodeIterator();n.hasNext();){n.next().getDegree()%2==1&&e++}return e<=2}computeSequence(){if(this._isRun)return null;this._isRun=!0;const t=this.findSequences();if(null===t)return null;this._sequencedGeometry=this.buildSequencedGeometry(t),this._isSequenceable=!0;const e=this._sequencedGeometry.getNumGeometries();g.isTrue(this._lineCount===e,"Lines were missing from result"),g.isTrue(this._sequencedGeometry instanceof J||this._sequencedGeometry instanceof wt,"Result is not lineal")}findSequences(){const t=new L;for(let e=new nr(this._graph).getConnectedSubgraphs().iterator();e.hasNext();){const n=e.next();if(!this.hasSequence(n))return null;{const e=this.findSequence(n);t.add(e)}}return t}addReverseSubpath(t,e,n){const s=t.getToNode();let i=null;for(;;){e.add(t.getSym()),t.getEdge().setVisited(!0),i=t.getFromNode();const n=sr.findUnvisitedBestOrientedDE(i);if(null===n)break;t=n.getSym()}n&&g.isTrue(i===s,"path not contiguous")}findSequence(t){Xi.setVisited(t.edgeIterator(),!1);const e=sr.findLowestDegreeNode(t).getOutEdges().iterator().next().getSym(),n=new ci,s=n.listIterator();for(this.addReverseSubpath(e,s,!1);s.hasPrevious();){const t=s.previous(),e=sr.findUnvisitedBestOrientedDE(t.getFromNode());null!==e&&this.addReverseSubpath(e.getSym(),s,!0)}return this.orient(n)}reverse(t){const e=new ci;for(let n=t.iterator();n.hasNext();){const t=n.next();e.addFirst(t.getSym())}return e}orient(t){const e=t.get(0),n=t.get(t.size()-1),s=e.getFromNode(),i=n.getToNode();let r=!1;if(1===s.getDegree()||1===i.getDegree()){let t=!1;1===n.getToNode().getDegree()&&!1===n.getEdgeDirection()&&(t=!0,r=!0),1===e.getFromNode().getDegree()&&!0===e.getEdgeDirection()&&(t=!0,r=!1),t||1===e.getFromNode().getDegree()&&(r=!0)}return r?this.reverse(t):t}buildSequencedGeometry(t){const e=new L;for(let n=t.iterator();n.hasNext();){for(let t=n.next().iterator();t.hasNext();){const n=t.next(),s=n.getEdge().getLine();let i=s;n.getEdgeDirection()||s.isClosed()||(i=sr.reverse(s)),e.add(i)}}return 0===e.size()?this._factory.createMultiLineString(new Array(0).fill(null)):this._factory.buildGeometry(e)}getSequencedLineStrings(){return this.computeSequence(),this._sequencedGeometry}isSequenceable(){return this.computeSequence(),this._isSequenceable}add(){if(I(arguments[0],N)){for(let t=arguments[0].iterator();t.hasNext();){const e=t.next();this.add(e)}}else if(arguments[0]instanceof X){arguments[0].apply(new class{get interfaces_(){return[k]}filter(t){t instanceof J&&this.addLine(t)}})}}}var ir=Object.freeze({__proto__:null,LineMerger:tr,LineSequencer:sr});class rr{constructor(){rr.constructor_.apply(this,arguments)}static constructor_(){if(this._snapTolerance=0,this._srcPts=null,this._seg=new Kt,this._allowSnappingToSourceVertices=!1,this._isClosed=!1,arguments[0]instanceof J&&"number"==typeof arguments[1]){const t=arguments[0],e=arguments[1];rr.constructor_.call(this,t.getCoordinates(),e)}else if(arguments[0]instanceof Array&&"number"==typeof arguments[1]){const t=arguments[0],e=arguments[1];this._srcPts=t,this._isClosed=rr.isClosed(t),this._snapTolerance=e}}static isClosed(t){return!(t.length<=1)&&t[0].equals2D(t[t.length-1])}snapVertices(t,e){const n=this._isClosed?t.size()-1:t.size();for(let s=0;s<n;s++){const n=t.get(s),i=this.findSnapForVertex(n,e);null!==i&&(t.set(s,new m(i)),0===s&&this._isClosed&&t.set(t.size()-1,new m(i)))}}findSnapForVertex(t,e){for(let n=0;n<e.length;n++){if(t.equals2D(e[n]))return null;if(t.distance(e[n])<this._snapTolerance)return e[n]}return null}snapTo(t){const e=new R(this._srcPts);this.snapVertices(e,t),this.snapSegments(e,t);return e.toCoordinateArray()}snapSegments(t,e){if(0===e.length)return null;let n=e.length;e[0].equals2D(e[e.length-1])&&(n=e.length-1);for(let s=0;s<n;s++){const n=e[s],i=this.findSegmentIndexToSnap(n,t);i>=0&&t.add(i+1,new m(n),!1)}}findSegmentIndexToSnap(t,e){let n=r.MAX_VALUE,s=-1;for(let i=0;i<e.size()-1;i++){if(this._seg.p0=e.get(i),this._seg.p1=e.get(i+1),this._seg.p0.equals2D(t)||this._seg.p1.equals2D(t)){if(this._allowSnappingToSourceVertices)continue;return-1}const r=this._seg.distance(t);r<this._snapTolerance&&r<n&&(n=r,s=i)}return s}setAllowSnappingToSourceVertices(t){this._allowSnappingToSourceVertices=t}}class or{constructor(){or.constructor_.apply(this,arguments)}static constructor_(){this._srcGeom=null;const t=arguments[0];this._srcGeom=t}static snap(t,e,n){const s=new Array(2).fill(null),i=new or(t);s[0]=i.snapTo(e,n);const r=new or(e);return s[1]=r.snapTo(s[0],n),s}static computeOverlaySnapTolerance(){if(1===arguments.length){const t=arguments[0];let e=or.computeSizeBasedSnapTolerance(t);const n=t.getPrecisionModel();if(n.getType()===Nt.FIXED){const t=1/n.getScale()*2/1.415;t>e&&(e=t)}return e}if(2===arguments.length){const t=arguments[0],e=arguments[1];return Math.min(or.computeOverlaySnapTolerance(t),or.computeOverlaySnapTolerance(e))}}static computeSizeBasedSnapTolerance(t){const e=t.getEnvelopeInternal();return Math.min(e.getHeight(),e.getWidth())*or.SNAP_PRECISION_FACTOR}static snapToSelf(t,e,n){return new or(t).snapToSelf(e,n)}snapTo(t,e){const n=this.extractTargetCoordinates(t);return new lr(e,n).transform(this._srcGeom)}snapToSelf(t,e){const n=this.extractTargetCoordinates(this._srcGeom),s=new lr(t,n,!0).transform(this._srcGeom);let i=s;return e&&I(i,st)&&(i=s.buffer(0)),i}computeSnapTolerance(t){return this.computeMinimumSegmentLength(t)/10}extractTargetCoordinates(t){const e=new lt,n=t.getCoordinates();for(let t=0;t<n.length;t++)e.add(n[t]);return e.toArray(new Array(0).fill(null))}computeMinimumSegmentLength(t){let e=r.MAX_VALUE;for(let n=0;n<t.length-1;n++){const s=t[n].distance(t[n+1]);s<e&&(e=s)}return e}}or.SNAP_PRECISION_FACTOR=1e-9;class lr extends me{constructor(){super(),lr.constructor_.apply(this,arguments)}static constructor_(){if(this._snapTolerance=null,this._snapPts=null,this._isSelfSnap=!1,2===arguments.length){const t=arguments[0],e=arguments[1];this._snapTolerance=t,this._snapPts=e}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];this._snapTolerance=t,this._snapPts=e,this._isSelfSnap=n}}snapLine(t,e){const n=new rr(t,this._snapTolerance);return n.setAllowSnappingToSourceVertices(this._isSelfSnap),n.snapTo(e)}transformCoordinates(t,e){const n=t.toCoordinateArray(),s=this.snapLine(n,this._snapPts);return this._factory.getCoordinateSequenceFactory().create(s)}}var ar=Object.freeze({__proto__:null,GeometrySnapper:or,LineStringSnapper:rr});class cr{constructor(){cr.constructor_.apply(this,arguments)}static constructor_(){this._pts=null,this._data=null;const t=arguments[0],e=arguments[1];this._pts=t,this._data=e}getCoordinates(){return this._pts}size(){return this._pts.length}getCoordinate(t){return this._pts[t]}isClosed(){return this._pts[0].equals(this._pts[this._pts.length-1])}getSegmentOctant(t){return t===this._pts.length-1?-1:Xs.octant(this.getCoordinate(t),this.getCoordinate(t+1))}setData(t){this._data=t}getData(){return this._data}toString(){return Wt.toLineString(new pt(this._pts))}get interfaces_(){return[Us]}}class hr{constructor(){hr.constructor_.apply(this,arguments)}static constructor_(){this._findAllIntersections=!1,this._isCheckEndSegmentsOnly=!1,this._keepIntersections=!0,this._isInteriorIntersectionsOnly=!1,this._li=null,this._interiorIntersection=null,this._intSegments=null,this._intersections=new L,this._intersectionCount=0;const t=arguments[0];this._li=t,this._interiorIntersection=null}static createAllIntersectionsFinder(t){const e=new hr(t);return e.setFindAllIntersections(!0),e}static isInteriorVertexIntersection(){if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[3];return(!arguments[2]||!n)&&!!t.equals2D(e)}if(8===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3],i=arguments[4],r=arguments[5],o=arguments[6],l=arguments[7];return!!hr.isInteriorVertexIntersection(t,n,i,o)||(!!hr.isInteriorVertexIntersection(t,s,i,l)||(!!hr.isInteriorVertexIntersection(e,n,r,o)||!!hr.isInteriorVertexIntersection(e,s,r,l)))}}static createInteriorIntersectionCounter(t){const e=new hr(t);return e.setInteriorIntersectionsOnly(!0),e.setFindAllIntersections(!0),e.setKeepIntersections(!1),e}static createIntersectionCounter(t){const e=new hr(t);return e.setFindAllIntersections(!0),e.setKeepIntersections(!1),e}static isEndSegment(t,e){return 0===e||e>=t.size()-2}static createAnyIntersectionFinder(t){return new hr(t)}static createInteriorIntersectionsFinder(t){const e=new hr(t);return e.setFindAllIntersections(!0),e.setInteriorIntersectionsOnly(!0),e}setCheckEndSegmentsOnly(t){this._isCheckEndSegmentsOnly=t}getIntersectionSegments(){return this._intSegments}count(){return this._intersectionCount}getIntersections(){return this._intersections}setFindAllIntersections(t){this._findAllIntersections=t}setKeepIntersections(t){this._keepIntersections=t}getIntersection(){return this._interiorIntersection}processIntersections(t,e,n,s){if(!this._findAllIntersections&&this.hasIntersection())return null;const i=t===n;if(i&&e===s)return null;if(this._isCheckEndSegmentsOnly){if(!(hr.isEndSegment(t,e)||hr.isEndSegment(n,s)))return null}const r=t.getCoordinate(e),o=t.getCoordinate(e+1),l=n.getCoordinate(s),a=n.getCoordinate(s+1),c=0===e,h=e+2===t.size(),u=0===s,g=s+2===n.size();this._li.computeIntersection(r,o,l,a);const d=this._li.hasIntersection()&&this._li.isInteriorIntersection();let _=!1;if(!this._isInteriorIntersectionsOnly){_=!(i&&Math.abs(s-e)<=1)&&hr.isInteriorVertexIntersection(r,o,l,a,c,h,u,g)}(d||_)&&(this._intSegments=new Array(4).fill(null),this._intSegments[0]=r,this._intSegments[1]=o,this._intSegments[2]=l,this._intSegments[3]=a,this._interiorIntersection=this._li.getIntersection(0),this._keepIntersections&&this._intersections.add(this._interiorIntersection),this._intersectionCount++)}hasIntersection(){return null!==this._interiorIntersection}isDone(){return!this._findAllIntersections&&null!==this._interiorIntersection}setInteriorIntersectionsOnly(t){this._isInteriorIntersectionsOnly=t}get interfaces_(){return[Ti]}}class ur{constructor(){ur.constructor_.apply(this,arguments)}static constructor_(){this._li=new jt,this._segStrings=null,this._findAllIntersections=!1,this._segInt=null,this._isValid=!0;const t=arguments[0];this._segStrings=t}static computeIntersections(t){const e=new ur(t);return e.setFindAllIntersections(!0),e.isValid(),e.getIntersections()}execute(){if(null!==this._segInt)return null;this.checkInteriorIntersections()}getIntersections(){return this._segInt.getIntersections()}isValid(){return this.execute(),this._isValid}setFindAllIntersections(t){this._findAllIntersections=t}checkInteriorIntersections(){this._isValid=!0,this._segInt=new hr(this._li),this._segInt.setFindAllIntersections(this._findAllIntersections);const t=new $s;if(t.setSegmentIntersector(this._segInt),t.computeNodes(this._segStrings),this._segInt.hasIntersection())return this._isValid=!1,null}checkValid(){if(this.execute(),!this._isValid)throw new ss(this.getErrorMessage(),this._segInt.getIntersection())}getErrorMessage(){if(this._isValid)return"no intersections found";const t=this._segInt.getIntersectionSegments();return"found non-noded intersection between "+Wt.toLineString(t[0],t[1])+" and "+Wt.toLineString(t[2],t[3])}}class gr{constructor(){gr.constructor_.apply(this,arguments)}static constructor_(){this._nv=null;const t=arguments[0];this._nv=new ur(gr.toSegmentStrings(t))}static toSegmentStrings(t){const e=new L;for(let n=t.iterator();n.hasNext();){const t=n.next();e.add(new cr(t.getCoordinates(),t))}return e}static checkValid(t){new gr(t).checkValid()}checkValid(){this._nv.checkValid()}}class dr{constructor(){dr.constructor_.apply(this,arguments)}static constructor_(){this._op=null,this._geometryFactory=null,this._ptLocator=null,this._lineEdgesList=new L,this._resultLineList=new L;const t=arguments[0],e=arguments[1],n=arguments[2];this._op=t,this._geometryFactory=e,this._ptLocator=n}collectLines(t){for(let e=this._op.getGraph().getEdgeEnds().iterator();e.hasNext();){const n=e.next();this.collectLineEdge(n,t,this._lineEdgesList),this.collectBoundaryTouchEdge(n,t,this._lineEdgesList)}}labelIsolatedLine(t,e){const n=this._ptLocator.locate(t.getCoordinate(),this._op.getArgGeometry(e));t.getLabel().setLocation(e,n)}build(t){return this.findCoveredLineEdges(),this.collectLines(t),this.buildLines(t),this._resultLineList}collectLineEdge(t,e,n){const s=t.getLabel(),i=t.getEdge();t.isLineEdge()&&(t.isVisited()||!Nr.isResultOfOp(s,e)||i.isCovered()||(n.add(i),t.setVisitedEdge(!0)))}findCoveredLineEdges(){for(let t=this._op.getGraph().getNodes().iterator();t.hasNext();){t.next().getEdges().findCoveredLineEdges()}for(let t=this._op.getGraph().getEdgeEnds().iterator();t.hasNext();){const e=t.next(),n=e.getEdge();if(e.isLineEdge()&&!n.isCoveredSet()){const t=this._op.isCoveredByA(e.getCoordinate());n.setCovered(t)}}}labelIsolatedLines(t){for(let e=t.iterator();e.hasNext();){const t=e.next(),n=t.getLabel();t.isIsolated()&&(n.isNull(0)?this.labelIsolatedLine(t,0):this.labelIsolatedLine(t,1))}}buildLines(t){for(let t=this._lineEdgesList.iterator();t.hasNext();){const e=t.next(),n=this._geometryFactory.createLineString(e.getCoordinates());this._resultLineList.add(n),e.setInResult(!0)}}collectBoundaryTouchEdge(t,e,n){const s=t.getLabel();return t.isLineEdge()||t.isVisited()||t.isInteriorAreaEdge()||t.getEdge().isInResult()?null:(g.isTrue(!(t.isInResult()||t.getSym().isInResult())||!t.getEdge().isInResult()),void(Nr.isResultOfOp(s,e)&&e===Nr.INTERSECTION&&(n.add(t.getEdge()),t.setVisitedEdge(!0))))}}class _r{constructor(){_r.constructor_.apply(this,arguments)}static constructor_(){this._op=null,this._geometryFactory=null,this._resultPointList=new L;const t=arguments[0],e=arguments[1];this._op=t,this._geometryFactory=e}filterCoveredNodeToPoint(t){const e=t.getCoordinate();if(!this._op.isCoveredByLA(e)){const t=this._geometryFactory.createPoint(e);this._resultPointList.add(t)}}extractNonCoveredResultNodes(t){for(let e=this._op.getGraph().getNodes().iterator();e.hasNext();){const n=e.next();if(!n.isInResult()&&(!n.isIncidentEdgeInResult()&&(0===n.getEdges().getDegree()||t===Nr.INTERSECTION))){const e=n.getLabel();Nr.isResultOfOp(e,t)&&this.filterCoveredNodeToPoint(n)}}}build(t){return this.extractNonCoveredResultNodes(t),this._resultPointList}}class pr{constructor(){this._isFirst=!0,this._commonMantissaBitsCount=53,this._commonBits=new i,this._commonSignExp=null}getCommon(){return r.longBitsToDouble(this._commonBits)}add(t){const e=r.doubleToLongBits(t);if(this._isFirst)return this._commonBits=e,this._commonSignExp=pr.signExpBits(this._commonBits),this._isFirst=!1,null;if(pr.signExpBits(e)!==this._commonSignExp)return this._commonBits.high=0,this._commonBits.low=0,null;this._commonMantissaBitsCount=pr.numCommonMostSigMantissaBits(this._commonBits,e),this._commonBits=pr.zeroLowerBits(this._commonBits,64-(12+this._commonMantissaBitsCount))}toString(){if(1===arguments.length){const t=arguments[0],e=r.longBitsToDouble(t),n="0000000000000000000000000000000000000000000000000000000000000000"+i.toBinaryString(t),s=n.substring(n.length-64);return s.substring(0,1)+"  "+s.substring(1,12)+"(exp) "+s.substring(12)+" [ "+e+" ]"}}getClass(){return pr}get interfaces_(){return[]}static getBit(t,e){const n=1<<e%32;return e<32?0!=(t.low&n)?1:0:0!=(t.high&n)?1:0}static signExpBits(t){return t.high>>>20}static zeroLowerBits(t,e){let n="low";if(e>32&&(t.low=0,e%=32,n="high"),e>0){const s=e<32?~((1<<e)-1):0;t[n]&=s}return t}static numCommonMostSigMantissaBits(t,e){let n=0;for(let s=52;s>=0;s--){if(pr.getBit(t,s)!==pr.getBit(e,s))return n;n++}return 52}}class mr{constructor(){mr.constructor_.apply(this,arguments)}static constructor_(){this._commonCoord=null,this._ccFilter=new fr}addCommonBits(t){const e=new yr(this._commonCoord);t.apply(e),t.geometryChanged()}removeCommonBits(t){if(0===this._commonCoord.x&&0===this._commonCoord.y)return t;const e=new m(this._commonCoord);e.x=-e.x,e.y=-e.y;const n=new yr(e);return t.apply(n),t.geometryChanged(),t}getCommonCoordinate(){return this._commonCoord}add(t){t.apply(this._ccFilter),this._commonCoord=this._ccFilter.getCommonCoordinate()}}class fr{constructor(){fr.constructor_.apply(this,arguments)}static constructor_(){this._commonBitsX=new pr,this._commonBitsY=new pr}filter(t){this._commonBitsX.add(t.x),this._commonBitsY.add(t.y)}getCommonCoordinate(){return new m(this._commonBitsX.getCommon(),this._commonBitsY.getCommon())}get interfaces_(){return[U]}}class yr{constructor(){yr.constructor_.apply(this,arguments)}static constructor_(){this.trans=null;const t=arguments[0];this.trans=t}filter(t,e){const n=t.getOrdinate(e,0)+this.trans.x,s=t.getOrdinate(e,1)+this.trans.y;t.setOrdinate(e,0,n),t.setOrdinate(e,1,s)}isDone(){return!1}isGeometryChanged(){return!0}get interfaces_(){return[P]}}mr.CommonCoordinateFilter=fr,mr.Translater=yr;class xr{constructor(){xr.constructor_.apply(this,arguments)}static constructor_(){this._geom=new Array(2).fill(null),this._snapTolerance=null,this._cbr=null;const t=arguments[0],e=arguments[1];this._geom[0]=t,this._geom[1]=e,this.computeSnapTolerance()}static overlayOp(t,e,n){return new xr(t,e).getResultGeometry(n)}static union(t,e){return xr.overlayOp(t,e,Nr.UNION)}static intersection(t,e){return xr.overlayOp(t,e,Nr.INTERSECTION)}static symDifference(t,e){return xr.overlayOp(t,e,Nr.SYMDIFFERENCE)}static difference(t,e){return xr.overlayOp(t,e,Nr.DIFFERENCE)}selfSnap(t){return new or(t).snapTo(t,this._snapTolerance)}removeCommonBits(t){this._cbr=new mr,this._cbr.add(t[0]),this._cbr.add(t[1]);const e=new Array(2).fill(null);return e[0]=this._cbr.removeCommonBits(t[0].copy()),e[1]=this._cbr.removeCommonBits(t[1].copy()),e}prepareResult(t){return this._cbr.addCommonBits(t),t}getResultGeometry(t){const e=this.snap(this._geom),n=Nr.overlayOp(e[0],e[1],t);return this.prepareResult(n)}checkValid(t){t.isValid()||B.out.println("Snapped geometry is invalid")}computeSnapTolerance(){this._snapTolerance=or.computeOverlaySnapTolerance(this._geom[0],this._geom[1])}snap(t){const e=this.removeCommonBits(t);return or.snap(e[0],e[1],this._snapTolerance)}}class Er{constructor(){Er.constructor_.apply(this,arguments)}static constructor_(){this._geom=new Array(2).fill(null);const t=arguments[0],e=arguments[1];this._geom[0]=t,this._geom[1]=e}static overlayOp(t,e,n){return new Er(t,e).getResultGeometry(n)}static union(t,e){return Er.overlayOp(t,e,Nr.UNION)}static intersection(t,e){return Er.overlayOp(t,e,Nr.INTERSECTION)}static symDifference(t,e){return Er.overlayOp(t,e,Nr.SYMDIFFERENCE)}static difference(t,e){return Er.overlayOp(t,e,Nr.DIFFERENCE)}getResultGeometry(t){let e=null,n=!1,s=null;try{e=Nr.overlayOp(this._geom[0],this._geom[1],t);!0&&(n=!0)}catch(t){if(!(t instanceof h))throw t;s=t}if(!n)try{e=xr.overlayOp(this._geom[0],this._geom[1],t)}catch(t){throw t instanceof h?s:t}return e}}class Ir{constructor(){Ir.constructor_.apply(this,arguments)}static constructor_(){if(this._li=new jt,this._resultPrecisionModel=null,this._arg=null,1===arguments.length){const t=arguments[0];this.setComputationPrecision(t.getPrecisionModel()),this._arg=new Array(1).fill(null),this._arg[0]=new ls(0,t)}else if(2===arguments.length){const t=arguments[0],e=arguments[1];Ir.constructor_.call(this,t,e,gn.OGC_SFS_BOUNDARY_RULE)}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];t.getPrecisionModel().compareTo(e.getPrecisionModel())>=0?this.setComputationPrecision(t.getPrecisionModel()):this.setComputationPrecision(e.getPrecisionModel()),this._arg=new Array(2).fill(null),this._arg[0]=new ls(0,t,n),this._arg[1]=new ls(1,e,n)}}getArgGeometry(t){return this._arg[t].getGeometry()}setComputationPrecision(t){this._resultPrecisionModel=t,this._li.setPrecisionModel(this._resultPrecisionModel)}}class Nr extends Ir{constructor(){super(),Nr.constructor_.apply(this,arguments)}static constructor_(){this._ptLocator=new fn,this._geomFact=null,this._resultGeom=null,this._graph=null,this._edgeList=new Li,this._resultPolyList=new L,this._resultLineList=new L,this._resultPointList=new L;const t=arguments[0],e=arguments[1];Ir.constructor_.call(this,t,e),this._graph=new os(new wi),this._geomFact=t.getFactory()}static overlayOp(t,e,n){return new Nr(t,e).getResultGeometry(n)}static union(t,e){if(t.isEmpty()||e.isEmpty()){if(t.isEmpty()&&e.isEmpty())return Nr.createEmptyResult(Nr.UNION,t,e,t.getFactory());if(t.isEmpty())return e.copy();if(e.isEmpty())return t.copy()}if(t.isGeometryCollection()||e.isGeometryCollection())throw new s("This method does not support GeometryCollection arguments");return Er.overlayOp(t,e,Nr.UNION)}static intersection(t,e){if(t.isEmpty()||e.isEmpty())return Nr.createEmptyResult(Nr.INTERSECTION,t,e,t.getFactory());if(t.isGeometryCollection()){const n=e;return ce.map(t,new class{get interfaces_(){return[MapOp]}map(t){return Nr.intersection(t,n)}})}return Er.overlayOp(t,e,Nr.INTERSECTION)}static symDifference(t,e){if(t.isEmpty()||e.isEmpty()){if(t.isEmpty()&&e.isEmpty())return Nr.createEmptyResult(Nr.SYMDIFFERENCE,t,e,t.getFactory());if(t.isEmpty())return e.copy();if(e.isEmpty())return t.copy()}if(t.isGeometryCollection()||e.isGeometryCollection())throw new s("This method does not support GeometryCollection arguments");return Er.overlayOp(t,e,Nr.SYMDIFFERENCE)}static resultDimension(t,e,n){const s=e.getDimension(),i=n.getDimension();let r=-1;switch(t){case Nr.INTERSECTION:r=Math.min(s,i);break;case Nr.UNION:r=Math.max(s,i);break;case Nr.DIFFERENCE:r=s;break;case Nr.SYMDIFFERENCE:r=Math.max(s,i)}return r}static createEmptyResult(t,e,n,s){const i=Nr.resultDimension(t,e,n);return s.createEmpty(i)}static difference(t,e){if(t.isEmpty())return Nr.createEmptyResult(Nr.DIFFERENCE,t,e,t.getFactory());if(e.isEmpty())return t.copy();if(t.isGeometryCollection()||e.isGeometryCollection())throw new s("This method does not support GeometryCollection arguments");return Er.overlayOp(t,e,Nr.DIFFERENCE)}static isResultOfOp(){if(2===arguments.length){const t=arguments[0],e=arguments[1],n=t.getLocation(0),s=t.getLocation(1);return Nr.isResultOfOp(n,s,e)}if(3===arguments.length){let t=arguments[0],e=arguments[1],n=arguments[2];switch(t===Qt.BOUNDARY&&(t=Qt.INTERIOR),e===Qt.BOUNDARY&&(e=Qt.INTERIOR),n){case Nr.INTERSECTION:return t===Qt.INTERIOR&&e===Qt.INTERIOR;case Nr.UNION:return t===Qt.INTERIOR||e===Qt.INTERIOR;case Nr.DIFFERENCE:return t===Qt.INTERIOR&&e!==Qt.INTERIOR;case Nr.SYMDIFFERENCE:return t===Qt.INTERIOR&&e!==Qt.INTERIOR||t!==Qt.INTERIOR&&e===Qt.INTERIOR}return!1}}insertUniqueEdge(t){const e=this._edgeList.findEqualEdge(t);if(null!==e){const n=e.getLabel();let s=t.getLabel();e.isPointwiseEqual(t)||(s=new qn(t.getLabel()),s.flip());const i=e.getDepth();i.isNull()&&i.add(n),i.add(s),n.merge(s)}else this._edgeList.add(t)}getGraph(){return this._graph}cancelDuplicateResultEdges(){for(let t=this._graph.getEdgeEnds().iterator();t.hasNext();){const e=t.next(),n=e.getSym();e.isInResult()&&n.isInResult()&&(e.setInResult(!1),n.setInResult(!1))}}isCoveredByLA(t){return!!this.isCovered(t,this._resultLineList)||!!this.isCovered(t,this._resultPolyList)}computeGeometry(t,e,n,s){const i=new L;return i.addAll(t),i.addAll(e),i.addAll(n),i.isEmpty()?Nr.createEmptyResult(s,this._arg[0].getGeometry(),this._arg[1].getGeometry(),this._geomFact):this._geomFact.buildGeometry(i)}mergeSymLabels(){for(let t=this._graph.getNodes().iterator();t.hasNext();){t.next().getEdges().mergeSymLabels()}}isCovered(t,e){for(let n=e.iterator();n.hasNext();){const e=n.next();if(this._ptLocator.locate(t,e)!==Qt.EXTERIOR)return!0}return!1}replaceCollapsedEdges(){const t=new L;for(let e=this._edgeList.iterator();e.hasNext();){const n=e.next();n.isCollapsed()&&(e.remove(),t.add(n.getCollapsedEdge()))}this._edgeList.addAll(t)}updateNodeLabelling(){for(let t=this._graph.getNodes().iterator();t.hasNext();){const e=t.next(),n=e.getEdges().getLabel();e.getLabel().merge(n)}}getResultGeometry(t){return this.computeOverlay(t),this._resultGeom}insertUniqueEdges(t){for(let e=t.iterator();e.hasNext();){const t=e.next();this.insertUniqueEdge(t)}}computeOverlay(t){this.copyPoints(0),this.copyPoints(1),this._arg[0].computeSelfNodes(this._li,!1),this._arg[1].computeSelfNodes(this._li,!1),this._arg[0].computeEdgeIntersections(this._arg[1],this._li,!0);const e=new L;this._arg[0].computeSplitEdges(e),this._arg[1].computeSplitEdges(e),this.insertUniqueEdges(e),this.computeLabelsFromDepths(),this.replaceCollapsedEdges(),gr.checkValid(this._edgeList.getEdges()),this._graph.addEdges(this._edgeList.getEdges()),this.computeLabelling(),this.labelIncompleteNodes(),this.findResultAreaEdges(t),this.cancelDuplicateResultEdges();const n=new _i(this._geomFact);n.add(this._graph),this._resultPolyList=n.getPolygons();const s=new dr(this,this._geomFact,this._ptLocator);this._resultLineList=s.build(t);const i=new _r(this,this._geomFact,this._ptLocator);this._resultPointList=i.build(t),this._resultGeom=this.computeGeometry(this._resultPointList,this._resultLineList,this._resultPolyList,t)}labelIncompleteNode(t,e){const n=this._ptLocator.locate(t.getCoordinate(),this._arg[e].getGeometry());t.getLabel().setLocation(e,n)}copyPoints(t){for(let e=this._arg[t].getNodeIterator();e.hasNext();){const n=e.next();this._graph.addNode(n.getCoordinate()).setLabel(t,n.getLabel().getLocation(t))}}findResultAreaEdges(t){for(let e=this._graph.getEdgeEnds().iterator();e.hasNext();){const n=e.next(),s=n.getLabel();s.isArea()&&!n.isInteriorAreaEdge()&&Nr.isResultOfOp(s.getLocation(0,Mn.RIGHT),s.getLocation(1,Mn.RIGHT),t)&&n.setInResult(!0)}}computeLabelsFromDepths(){for(let t=this._edgeList.iterator();t.hasNext();){const e=t.next(),n=e.getLabel(),s=e.getDepth();if(!s.isNull()){s.normalize();for(let t=0;t<2;t++)n.isNull(t)||!n.isArea()||s.isNull(t)||(0===s.getDelta(t)?n.toLine(t):(g.isTrue(!s.isNull(t,Mn.LEFT),"depth of LEFT side has not been initialized"),n.setLocation(t,Mn.LEFT,s.getLocation(t,Mn.LEFT)),g.isTrue(!s.isNull(t,Mn.RIGHT),"depth of RIGHT side has not been initialized"),n.setLocation(t,Mn.RIGHT,s.getLocation(t,Mn.RIGHT))))}}}computeLabelling(){for(let t=this._graph.getNodes().iterator();t.hasNext();){t.next().getEdges().computeLabelling(this._arg)}this.mergeSymLabels(),this.updateNodeLabelling()}labelIncompleteNodes(){for(let t=this._graph.getNodes().iterator();t.hasNext();){const e=t.next(),n=e.getLabel();e.isIsolated()&&(n.isNull(0)?this.labelIncompleteNode(e,0):this.labelIncompleteNode(e,1)),e.getEdges().updateLabelling(n)}}isCoveredByA(t){return!!this.isCovered(t,this._resultPolyList)}}Nr.INTERSECTION=1,Nr.UNION=2,Nr.DIFFERENCE=3,Nr.SYMDIFFERENCE=4;var Sr=Object.freeze({__proto__:null,snap:ar,OverlayOp:Nr});class wr extends Ui{constructor(){super(),wr.constructor_.apply(this,arguments)}static constructor_(){this._edgeRing=null,this._next=null,this._label=-1;const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];Ui.constructor_.call(this,t,e,n,s)}getNext(){return this._next}isInRing(){return null!==this._edgeRing}setRing(t){this._edgeRing=t}setLabel(t){this._label=t}getLabel(){return this._label}setNext(t){this._next=t}getRing(){return this._edgeRing}}class Cr extends Wi{constructor(){super(),Cr.constructor_.apply(this,arguments)}static constructor_(){this._line=null;const t=arguments[0];this._line=t}getLine(){return this._line}}class Lr{constructor(){Lr.constructor_.apply(this,arguments)}static constructor_(){this._geometryFactory=new Ct,this._geomGraph=null,this._disconnectedRingcoord=null;const t=arguments[0];this._geomGraph=t}static findDifferentPoint(t,e){for(let n=0;n<t.length;n++)if(!t[n].equals(e))return t[n];return null}visitInteriorRing(t,e){if(t.isEmpty())return null;const n=t.getCoordinates(),s=n[0],i=Lr.findDifferentPoint(n,s),r=e.findEdgeInSameDirection(s,i),o=e.findEdgeEnd(r);let l=null;o.getLabel().getLocation(0,Mn.RIGHT)===Qt.INTERIOR?l=o:o.getSym().getLabel().getLocation(0,Mn.RIGHT)===Qt.INTERIOR&&(l=o.getSym()),g.isTrue(null!==l,"unable to find dirEdge with Interior on RHS"),this.visitLinkedDirectedEdges(l)}visitShellInteriors(t,e){if(t instanceof it){const n=t;this.visitInteriorRing(n.getExteriorRing(),e)}if(t instanceof ft){const n=t;for(let t=0;t<n.getNumGeometries();t++){const s=n.getGeometryN(t);this.visitInteriorRing(s.getExteriorRing(),e)}}}getCoordinate(){return this._disconnectedRingcoord}setInteriorEdgesInResult(t){for(let e=t.getEdgeEnds().iterator();e.hasNext();){const t=e.next();t.getLabel().getLocation(0,Mn.RIGHT)===Qt.INTERIOR&&t.setInResult(!0)}}visitLinkedDirectedEdges(t){const e=t;let n=t;do{g.isTrue(null!==n,"found null Directed Edge"),n.setVisited(!0),n=n.getNext()}while(n!==e)}buildEdgeRings(t){const e=new L;for(let n=t.iterator();n.hasNext();){const t=n.next();if(t.isInResult()&&null===t.getEdgeRing()){const n=new di(t,this._geometryFactory);n.linkDirectedEdgesForMinimalEdgeRings();const s=n.buildMinimalRings();e.addAll(s)}}return e}hasUnvisitedShellEdge(t){for(let e=0;e<t.size();e++){const n=t.get(e);if(n.isHole())continue;const s=n.getEdges();let i=s.get(0);if(i.getLabel().getLocation(0,Mn.RIGHT)===Qt.INTERIOR)for(let t=0;t<s.size();t++)if(i=s.get(t),!i.isVisited())return this._disconnectedRingcoord=i.getCoordinate(),!0}return!1}isInteriorsConnected(){const t=new L;this._geomGraph.computeSplitEdges(t);const e=new os(new wi);e.addEdges(t),this.setInteriorEdgesInResult(e),e.linkResultDirectedEdges();const n=this.buildEdgeRings(e.getEdgeEnds());return this.visitShellInteriors(this._geomGraph.getGeometry(),e),!this.hasUnvisitedShellEdge(n)}}class Tr{createEdgeEndForNext(t,e,n,s){const i=n.segmentIndex+1;if(i>=t.getNumPoints()&&null===s)return null;let r=t.getCoordinate(i);null!==s&&s.segmentIndex===n.segmentIndex&&(r=s.coord);const o=new ns(t,n.coord,r,new qn(t.getLabel()));e.add(o)}createEdgeEndForPrev(t,e,n,s){let i=n.segmentIndex;if(0===n.dist){if(0===i)return null;i--}let r=t.getCoordinate(i);null!==s&&s.segmentIndex>=i&&(r=s.coord);const o=new qn(t.getLabel());o.flip();const l=new ns(t,n.coord,r,o);e.add(l)}computeEdgeEnds(){if(1===arguments.length){const t=arguments[0],e=new L;for(let n=t;n.hasNext();){const t=n.next();this.computeEdgeEnds(t,e)}return e}if(2===arguments.length){const t=arguments[0],e=arguments[1],n=t.getEdgeIntersectionList();n.addEndpoints();const s=n.iterator();let i=null,r=null;if(!s.hasNext())return null;let o=s.next();do{i=r,r=o,o=null,s.hasNext()&&(o=s.next()),null!==r&&(this.createEdgeEndForPrev(t,e,r,i),this.createEdgeEndForNext(t,e,r,o))}while(null!==r)}}}class Rr extends ns{constructor(){super(),Rr.constructor_.apply(this,arguments)}static constructor_(){if(this._edgeEnds=new L,1===arguments.length){const t=arguments[0];Rr.constructor_.call(this,null,t)}else if(2===arguments.length){const t=arguments[1];ns.constructor_.call(this,t.getEdge(),t.getCoordinate(),t.getDirectedCoordinate(),new qn(t.getLabel())),this.insert(t)}}insert(t){this._edgeEnds.add(t)}print(t){t.println("EdgeEndBundle--\x3e Label: "+this._label);for(let e=this.iterator();e.hasNext();){e.next().print(t),t.println()}}iterator(){return this._edgeEnds.iterator()}getEdgeEnds(){return this._edgeEnds}computeLabelOn(t,e){let n=0,s=!1;for(let e=this.iterator();e.hasNext();){const i=e.next().getLabel().getLocation(t);i===Qt.BOUNDARY&&n++,i===Qt.INTERIOR&&(s=!0)}let i=Qt.NONE;s&&(i=Qt.INTERIOR),n>0&&(i=ls.determineBoundary(e,n)),this._label.setLocation(t,i)}computeLabelSide(t,e){for(let n=this.iterator();n.hasNext();){const s=n.next();if(s.getLabel().isArea()){const n=s.getLabel().getLocation(t,e);if(n===Qt.INTERIOR)return this._label.setLocation(t,e,Qt.INTERIOR),null;n===Qt.EXTERIOR&&this._label.setLocation(t,e,Qt.EXTERIOR)}}}getLabel(){return this._label}computeLabelSides(t){this.computeLabelSide(t,Mn.LEFT),this.computeLabelSide(t,Mn.RIGHT)}updateIM(t){$n.updateIM(this._label,t)}computeLabel(t){let e=!1;for(let t=this.iterator();t.hasNext();){t.next().getLabel().isArea()&&(e=!0)}this._label=e?new qn(Qt.NONE,Qt.NONE,Qt.NONE):new qn(Qt.NONE);for(let n=0;n<2;n++)this.computeLabelOn(n,t),e&&this.computeLabelSides(n)}}class Pr extends Ni{constructor(){super()}updateIM(t){for(let e=this.iterator();e.hasNext();){e.next().updateIM(t)}}insert(t){let e=this._edgeMap.get(t);null===e?(e=new Rr(t),this.insertEdgeEnd(t,e)):e.insert(t)}}class Or extends ts{constructor(){super(),Or.constructor_.apply(this,arguments)}static constructor_(){const t=arguments[0],e=arguments[1];ts.constructor_.call(this,t,e)}updateIMFromEdges(t){this._edges.updateIM(t)}computeIM(t){t.setAtLeastIfValid(this._label.getLocation(0),this._label.getLocation(1),0)}}class vr extends rs{constructor(){super()}createNode(t){return new Or(t,new Pr)}}class Mr{constructor(){Mr.constructor_.apply(this,arguments)}static constructor_(){this._nodes=new es(new vr)}insertEdgeEnds(t){for(let e=t.iterator();e.hasNext();){const t=e.next();this._nodes.add(t)}}getNodeIterator(){return this._nodes.iterator()}copyNodesAndLabels(t,e){for(let n=t.getNodeIterator();n.hasNext();){const t=n.next();this._nodes.addNode(t.getCoordinate()).setLabel(e,t.getLabel().getLocation(e))}}build(t){this.computeIntersectionNodes(t,0),this.copyNodesAndLabels(t,0);const e=(new Tr).computeEdgeEnds(t.getEdgeIterator());this.insertEdgeEnds(e)}computeIntersectionNodes(t,e){for(let n=t.getEdgeIterator();n.hasNext();){const t=n.next(),s=t.getLabel().getLocation(e);for(let n=t.getEdgeIntersectionList().iterator();n.hasNext();){const t=n.next(),i=this._nodes.addNode(t.coord);s===Qt.BOUNDARY?i.setLabelBoundary(e):i.getLabel().isNull(e)&&i.setLabel(e,Qt.INTERIOR)}}}}class br{constructor(){br.constructor_.apply(this,arguments)}static constructor_(){this._li=new jt,this._geomGraph=null,this._nodeGraph=new Mr,this._invalidPoint=null;const t=arguments[0];this._geomGraph=t}isNodeEdgeAreaLabelsConsistent(){for(let t=this._nodeGraph.getNodeIterator();t.hasNext();){const e=t.next();if(!e.getEdges().isAreaLabelsConsistent(this._geomGraph))return this._invalidPoint=e.getCoordinate().copy(),!1}return!0}getInvalidPoint(){return this._invalidPoint}hasDuplicateRings(){for(let t=this._nodeGraph.getNodeIterator();t.hasNext();){for(let e=t.next().getEdges().iterator();e.hasNext();){const t=e.next();if(t.getEdgeEnds().size()>1)return this._invalidPoint=t.getEdge().getCoordinate(0),!0}}return!1}isNodeConsistentArea(){const t=this._geomGraph.computeSelfNodes(this._li,!0,!0);return t.hasProperIntersection()?(this._invalidPoint=t.getProperIntersectionPoint(),!1):(this._nodeGraph.build(this._geomGraph),this.isNodeEdgeAreaLabelsConsistent())}}class Dr{constructor(){Dr.constructor_.apply(this,arguments)}static constructor_(){this._graph=null,this._rings=new L,this._totalEnv=new O,this._index=null,this._nestedPt=null;const t=arguments[0];this._graph=t}buildIndex(){this._index=new vs;for(let t=0;t<this._rings.size();t++){const e=this._rings.get(t),n=e.getEnvelopeInternal();this._index.insert(n,e)}}getNestedPoint(){return this._nestedPt}isNonNested(){this.buildIndex();for(let t=0;t<this._rings.size();t++){const e=this._rings.get(t),n=e.getCoordinates(),s=this._index.query(e.getEnvelopeInternal());for(let t=0;t<s.size();t++){const i=s.get(t),r=i.getCoordinates();if(e===i)continue;if(!e.getEnvelopeInternal().intersects(i.getEnvelopeInternal()))continue;const o=Fr.findPtNotNode(n,i,this._graph);if(null===o)continue;if(Ue.isInRing(o,r))return this._nestedPt=o,!1}}return!0}add(t){this._rings.add(t),this._totalEnv.expandToInclude(t.getEnvelopeInternal())}}class Ar{constructor(){Ar.constructor_.apply(this,arguments)}static constructor_(){if(this._errorType=null,this._pt=null,1===arguments.length){const t=arguments[0];Ar.constructor_.call(this,t,null)}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this._errorType=t,null!==e&&(this._pt=e.copy())}}getErrorType(){return this._errorType}getMessage(){return Ar.errMsg[this._errorType]}getCoordinate(){return this._pt}toString(){let t="";return null!==this._pt&&(t=" at or near point "+this._pt),this.getMessage()+t}}Ar.ERROR=0,Ar.REPEATED_POINT=1,Ar.HOLE_OUTSIDE_SHELL=2,Ar.NESTED_HOLES=3,Ar.DISCONNECTED_INTERIOR=4,Ar.SELF_INTERSECTION=5,Ar.RING_SELF_INTERSECTION=6,Ar.NESTED_SHELLS=7,Ar.DUPLICATE_RINGS=8,Ar.TOO_FEW_POINTS=9,Ar.INVALID_COORDINATE=10,Ar.RING_NOT_CLOSED=11,Ar.errMsg=["Topology Validation Error","Repeated Point","Hole lies outside shell","Holes are nested","Interior is disconnected","Self-intersection","Ring Self-intersection","Nested shells","Duplicate Rings","Too few distinct points in geometry component","Invalid Coordinate","Ring is not closed"];class Fr{constructor(){Fr.constructor_.apply(this,arguments)}static constructor_(){this._parentGeometry=null,this._isSelfTouchingRingFormingHoleValid=!1,this._validErr=null;const t=arguments[0];this._parentGeometry=t}static findPtNotNode(t,e,n){const s=n.findEdge(e).getEdgeIntersectionList();for(let e=0;e<t.length;e++){const n=t[e];if(!s.isIntersection(n))return n}return null}static isValid(){if(arguments[0]instanceof X){return new Fr(arguments[0]).isValid()}if(arguments[0]instanceof m){const t=arguments[0];return!r.isNaN(t.x)&&(!r.isInfinite(t.x)&&(!r.isNaN(t.y)&&!r.isInfinite(t.y)))}}checkInvalidCoordinates(){if(arguments[0]instanceof Array){const t=arguments[0];for(let e=0;e<t.length;e++)if(!Fr.isValid(t[e]))return this._validErr=new Ar(Ar.INVALID_COORDINATE,t[e]),null}else if(arguments[0]instanceof it){const t=arguments[0];if(this.checkInvalidCoordinates(t.getExteriorRing().getCoordinates()),null!==this._validErr)return null;for(let e=0;e<t.getNumInteriorRing();e++)if(this.checkInvalidCoordinates(t.getInteriorRingN(e).getCoordinates()),null!==this._validErr)return null}}checkHolesNotNested(t,e){if(t.getNumInteriorRing()<=0)return null;const n=new Dr(e);for(let e=0;e<t.getNumInteriorRing();e++){const s=t.getInteriorRingN(e);s.isEmpty()||n.add(s)}n.isNonNested()||(this._validErr=new Ar(Ar.NESTED_HOLES,n.getNestedPoint()))}checkConsistentArea(t){const e=new br(t);if(!e.isNodeConsistentArea())return this._validErr=new Ar(Ar.SELF_INTERSECTION,e.getInvalidPoint()),null;e.hasDuplicateRings()&&(this._validErr=new Ar(Ar.DUPLICATE_RINGS,e.getInvalidPoint()))}isValid(){return this.checkValid(this._parentGeometry),null===this._validErr}checkShellInsideHole(t,e,n){const s=t.getCoordinates(),i=e.getCoordinates(),r=Fr.findPtNotNode(s,e,n);if(null!==r){if(!Ue.isInRing(r,i))return r}const o=Fr.findPtNotNode(i,t,n);if(null!==o){return Ue.isInRing(o,s)?o:null}return g.shouldNeverReachHere("points in shell and hole appear to be equal"),null}checkNoSelfIntersectingRings(t){for(let e=t.getEdgeIterator();e.hasNext();){const t=e.next();if(this.checkNoSelfIntersectingRing(t.getEdgeIntersectionList()),null!==this._validErr)return null}}checkConnectedInteriors(t){const e=new Lr(t);e.isInteriorsConnected()||(this._validErr=new Ar(Ar.DISCONNECTED_INTERIOR,e.getCoordinate()))}checkNoSelfIntersectingRing(t){const e=new lt;let n=!0;for(let s=t.iterator();s.hasNext();){const t=s.next();if(n)n=!1;else{if(e.contains(t.coord))return this._validErr=new Ar(Ar.RING_SELF_INTERSECTION,t.coord),null;e.add(t.coord)}}}checkHolesInShell(t,e){if(t.getNumInteriorRing()<=0)return null;const n=t.getExteriorRing(),s=n.isEmpty(),i=new ze(n);for(let r=0;r<t.getNumInteriorRing();r++){const o=t.getInteriorRingN(r);let l=null;if(o.isEmpty())continue;if(l=Fr.findPtNotNode(o.getCoordinates(),n,e),null===l)return null;if(s||Qt.EXTERIOR===i.locate(l))return this._validErr=new Ar(Ar.HOLE_OUTSIDE_SHELL,l),null}}checkTooFewPoints(t){if(t.hasTooFewPoints())return this._validErr=new Ar(Ar.TOO_FEW_POINTS,t.getInvalidPoint()),null}getValidationError(){return this.checkValid(this._parentGeometry),this._validErr}checkValid(){if(arguments[0]instanceof tt){const t=arguments[0];this.checkInvalidCoordinates(t.getCoordinates())}else if(arguments[0]instanceof ht){const t=arguments[0];this.checkInvalidCoordinates(t.getCoordinates())}else if(arguments[0]instanceof ut){const t=arguments[0];if(this.checkInvalidCoordinates(t.getCoordinates()),null!==this._validErr)return null;if(this.checkClosedRing(t),null!==this._validErr)return null;const e=new ls(0,t);if(this.checkTooFewPoints(e),null!==this._validErr)return null;const n=new jt;e.computeSelfNodes(n,!0,!0),this.checkNoSelfIntersectingRings(e)}else if(arguments[0]instanceof J){const t=arguments[0];if(this.checkInvalidCoordinates(t.getCoordinates()),null!==this._validErr)return null;const e=new ls(0,t);this.checkTooFewPoints(e)}else if(arguments[0]instanceof it){const t=arguments[0];if(this.checkInvalidCoordinates(t),null!==this._validErr)return null;if(this.checkClosedRings(t),null!==this._validErr)return null;const e=new ls(0,t);if(this.checkTooFewPoints(e),null!==this._validErr)return null;if(this.checkConsistentArea(e),null!==this._validErr)return null;if(!this._isSelfTouchingRingFormingHoleValid&&(this.checkNoSelfIntersectingRings(e),null!==this._validErr))return null;if(this.checkHolesInShell(t,e),null!==this._validErr)return null;if(this.checkHolesNotNested(t,e),null!==this._validErr)return null;this.checkConnectedInteriors(e)}else if(arguments[0]instanceof ft){const t=arguments[0];for(let e=0;e<t.getNumGeometries();e++){const n=t.getGeometryN(e);if(this.checkInvalidCoordinates(n),null!==this._validErr)return null;if(this.checkClosedRings(n),null!==this._validErr)return null}const e=new ls(0,t);if(this.checkTooFewPoints(e),null!==this._validErr)return null;if(this.checkConsistentArea(e),null!==this._validErr)return null;if(!this._isSelfTouchingRingFormingHoleValid&&(this.checkNoSelfIntersectingRings(e),null!==this._validErr))return null;for(let n=0;n<t.getNumGeometries();n++){const s=t.getGeometryN(n);if(this.checkHolesInShell(s,e),null!==this._validErr)return null}for(let n=0;n<t.getNumGeometries();n++){const s=t.getGeometryN(n);if(this.checkHolesNotNested(s,e),null!==this._validErr)return null}if(this.checkShellsNotNested(t,e),null!==this._validErr)return null;this.checkConnectedInteriors(e)}else if(arguments[0]instanceof ct){const t=arguments[0];for(let e=0;e<t.getNumGeometries();e++){const n=t.getGeometryN(e);if(this.checkValid(n),null!==this._validErr)return null}}else if(arguments[0]instanceof X){const t=arguments[0];if(this._validErr=null,t.isEmpty())return null;if(t instanceof tt)this.checkValid(t);else if(t instanceof ht)this.checkValid(t);else if(t instanceof ut)this.checkValid(t);else if(t instanceof J)this.checkValid(t);else if(t instanceof it)this.checkValid(t);else if(t instanceof ft)this.checkValid(t);else{if(!(t instanceof ct))throw new j(t.getGeometryType());this.checkValid(t)}}}setSelfTouchingRingFormingHoleValid(t){this._isSelfTouchingRingFormingHoleValid=t}checkShellNotNested(t,e,n){const s=t.getCoordinates(),i=e.getExteriorRing();if(i.isEmpty())return null;const r=i.getCoordinates(),o=Fr.findPtNotNode(s,i,n);if(null===o)return null;if(!Ue.isInRing(o,r))return null;if(e.getNumInteriorRing()<=0)return this._validErr=new Ar(Ar.NESTED_SHELLS,o),null;let l=null;for(let s=0;s<e.getNumInteriorRing();s++){const i=e.getInteriorRingN(s);if(l=this.checkShellInsideHole(t,i,n),null===l)return null}this._validErr=new Ar(Ar.NESTED_SHELLS,l)}checkClosedRings(t){if(this.checkClosedRing(t.getExteriorRing()),null!==this._validErr)return null;for(let e=0;e<t.getNumInteriorRing();e++)if(this.checkClosedRing(t.getInteriorRingN(e)),null!==this._validErr)return null}checkClosedRing(t){if(t.isEmpty())return null;if(!t.isClosed()){let e=null;t.getNumPoints()>=1&&(e=t.getCoordinateN(0)),this._validErr=new Ar(Ar.RING_NOT_CLOSED,e)}}checkShellsNotNested(t,e){for(let n=0;n<t.getNumGeometries();n++){const s=t.getGeometryN(n).getExteriorRing();for(let i=0;i<t.getNumGeometries();i++){if(n===i)continue;const r=t.getGeometryN(i);if(this.checkShellNotNested(s,r,e),null!==this._validErr)return null}}}}class Gr{constructor(){Gr.constructor_.apply(this,arguments)}static constructor_(){this._factory=null,this._deList=new L,this._lowestEdge=null,this._ring=null,this._locator=null,this._ringPts=null,this._holes=null,this._shell=null,this._isHole=null,this._isProcessed=!1,this._isIncludedSet=!1,this._isIncluded=!1;const t=arguments[0];this._factory=t}static findDirEdgesInRing(t){let e=t;const n=new L;do{n.add(e),e=e.getNext(),g.isTrue(null!==e,"found null DE in ring"),g.isTrue(e===t||!e.isInRing(),"found DE already in ring")}while(e!==t);return n}static addEdge(t,e,n){if(e)for(let e=0;e<t.length;e++)n.add(t[e],!1);else for(let e=t.length-1;e>=0;e--)n.add(t[e],!1)}static findEdgeRingContaining(t,e){const n=t.getRing(),s=n.getEnvelopeInternal();let i=n.getCoordinateN(0),r=null,o=null;for(let t=e.iterator();t.hasNext();){const e=t.next(),l=e.getRing().getEnvelopeInternal();if(l.equals(s))continue;if(!l.contains(s))continue;i=dt.ptNotInList(n.getCoordinates(),e.getCoordinates());e.isInRing(i)&&(null===r||o.contains(l))&&(r=e,o=r.getRing().getEnvelopeInternal())}return r}isIncluded(){return this._isIncluded}getCoordinates(){if(null===this._ringPts){const t=new R;for(let e=this._deList.iterator();e.hasNext();){const n=e.next(),s=n.getEdge();Gr.addEdge(s.getLine().getCoordinates(),n.getEdgeDirection(),t)}this._ringPts=t.toCoordinateArray()}return this._ringPts}isIncludedSet(){return this._isIncludedSet}isValid(){return this.getCoordinates(),!(this._ringPts.length<=3)&&(this.getRing(),Fr.isValid(this._ring))}build(t){let e=t;do{this.add(e),e.setRing(this),e=e.getNext(),g.isTrue(null!==e,"found null DE in ring"),g.isTrue(e===t||!e.isInRing(),"found DE already in ring")}while(e!==t)}isInRing(t){return Qt.EXTERIOR!==this.getLocator().locate(t)}isOuterHole(){return!!this._isHole&&!this.hasShell()}getPolygon(){let t=null;if(null!==this._holes){t=new Array(this._holes.size()).fill(null);for(let e=0;e<this._holes.size();e++)t[e]=this._holes.get(e)}return this._factory.createPolygon(this._ring,t)}isHole(){return this._isHole}isProcessed(){return this._isProcessed}addHole(){if(arguments[0]instanceof ut){const t=arguments[0];null===this._holes&&(this._holes=new L),this._holes.add(t)}else if(arguments[0]instanceof Gr){const t=arguments[0];t.setShell(this);const e=t.getRing();null===this._holes&&(this._holes=new L),this._holes.add(e)}}setIncluded(t){this._isIncluded=t,this._isIncludedSet=!0}getOuterHole(){if(this.isHole())return null;for(let t=0;t<this._deList.size();t++){const e=this._deList.get(t).getSym().getRing();if(e.isOuterHole())return e}return null}computeHole(){const t=this.getRing();this._isHole=G.isCCW(t.getCoordinates())}hasShell(){return null!==this._shell}isOuterShell(){return null!==this.getOuterHole()}getLineString(){return this.getCoordinates(),this._factory.createLineString(this._ringPts)}toString(){return Wt.toLineString(new pt(this.getCoordinates()))}getLocator(){return null===this._locator&&(this._locator=new ze(this.getRing())),this._locator}getShell(){return this.isHole()?this._shell:this}add(t){this._deList.add(t)}getRing(){if(null!==this._ring)return this._ring;this.getCoordinates(),this._ringPts.length<3&&B.out.println(this._ringPts);try{this._ring=this._factory.createLinearRing(this._ringPts)}catch(t){if(!(t instanceof n))throw t;B.out.println(this._ringPts)}return this._ring}updateIncluded(){if(this.isHole())return null;for(let t=0;t<this._deList.size();t++){const e=this._deList.get(t).getSym().getRing().getShell();if(null!==e&&e.isIncludedSet())return this.setIncluded(!e.isIncluded()),null}}setShell(t){this._shell=t}setProcessed(t){this._isProcessed=t}}Gr.EnvelopeComparator=class{compare(t,e){const n=e;return t.getRing().getEnvelope().compareTo(n.getRing().getEnvelope())}get interfaces_(){return[a]}};class qr extends Ji{constructor(){super(),qr.constructor_.apply(this,arguments)}static constructor_(){this._factory=null;const t=arguments[0];this._factory=t}static findLabeledEdgeRings(t){const e=new L;let n=1;for(let s=t.iterator();s.hasNext();){const t=s.next();if(t.isMarked())continue;if(t.getLabel()>=0)continue;e.add(t);const i=Gr.findDirEdgesInRing(t);qr.label(i,n),n++}return e}static getDegreeNonDeleted(t){let e=0;for(let n=t.getOutEdges().getEdges().iterator();n.hasNext();){n.next().isMarked()||e++}return e}static deleteAllEdges(t){for(let e=t.getOutEdges().getEdges().iterator();e.hasNext();){const t=e.next();t.setMarked(!0);const n=t.getSym();null!==n&&n.setMarked(!0)}}static label(t,e){for(let n=t.iterator();n.hasNext();){n.next().setLabel(e)}}static computeNextCWEdges(t){let e=null,n=null;for(let s=t.getOutEdges().getEdges().iterator();s.hasNext();){const t=s.next();if(!t.isMarked()){if(null===e&&(e=t),null!==n){n.getSym().setNext(t)}n=t}}if(null!==n){n.getSym().setNext(e)}}static computeNextCCWEdges(t,e){let n=null,s=null;const i=t.getOutEdges().getEdges();for(let t=i.size()-1;t>=0;t--){const r=i.get(t),o=r.getSym();let l=null;r.getLabel()===e&&(l=r);let a=null;o.getLabel()===e&&(a=o),null===l&&null===a||(null!==a&&(s=a),null!==l&&(null!==s&&(s.setNext(l),s=null),null===n&&(n=l)))}null!==s&&(g.isTrue(null!==n),s.setNext(n))}static getDegree(t,e){let n=0;for(let s=t.getOutEdges().getEdges().iterator();s.hasNext();){s.next().getLabel()===e&&n++}return n}static findIntersectionNodes(t,e){let n=t,s=null;do{const i=n.getFromNode();qr.getDegree(i,e)>1&&(null===s&&(s=new L),s.add(i)),n=n.getNext(),g.isTrue(null!==n,"found null DE in ring"),g.isTrue(n===t||!n.isInRing(),"found DE already in ring")}while(n!==t);return s}findEdgeRing(t){const e=new Gr(this._factory);return e.build(t),e}computeDepthParity(){if(0===arguments.length)for(;;)return null}computeNextCWEdges(){for(let t=this.nodeIterator();t.hasNext();){const e=t.next();qr.computeNextCWEdges(e)}}addEdge(t){if(t.isEmpty())return null;const e=dt.removeRepeatedPoints(t.getCoordinates());if(e.length<2)return null;const n=e[0],s=e[e.length-1],i=this.getNode(n),r=this.getNode(s),o=new wr(i,r,e[1],!0),l=new wr(r,i,e[e.length-2],!1),a=new Cr(t);a.setDirectedEdges(o,l),this.add(a)}deleteCutEdges(){this.computeNextCWEdges(),qr.findLabeledEdgeRings(this._dirEdges);const t=new L;for(let e=this._dirEdges.iterator();e.hasNext();){const n=e.next();if(n.isMarked())continue;const s=n.getSym();if(n.getLabel()===s.getLabel()){n.setMarked(!0),s.setMarked(!0);const e=n.getEdge();t.add(e.getLine())}}return t}getEdgeRings(){this.computeNextCWEdges(),qr.label(this._dirEdges,-1);const t=qr.findLabeledEdgeRings(this._dirEdges);this.convertMaximalToMinimalEdgeRings(t);const e=new L;for(let t=this._dirEdges.iterator();t.hasNext();){const n=t.next();if(n.isMarked())continue;if(n.isInRing())continue;const s=this.findEdgeRing(n);e.add(s)}return e}getNode(t){let e=this.findNode(t);return null===e&&(e=new ji(t),this.add(e)),e}convertMaximalToMinimalEdgeRings(t){for(let e=t.iterator();e.hasNext();){const t=e.next(),n=t.getLabel(),s=qr.findIntersectionNodes(t,n);if(null!==s)for(let t=s.iterator();t.hasNext();){const e=t.next();qr.computeNextCCWEdges(e,n)}}}deleteDangles(){const t=this.findNodesOfDegree(1),e=new xt,n=new en;for(let e=t.iterator();e.hasNext();)n.push(e.next());for(;!n.isEmpty();){const t=n.pop();qr.deleteAllEdges(t);for(let s=t.getOutEdges().getEdges().iterator();s.hasNext();){const t=s.next();t.setMarked(!0);const i=t.getSym();null!==i&&i.setMarked(!0);const r=t.getEdge();e.add(r.getLine());const o=t.getToNode();1===qr.getDegreeNonDeleted(o)&&n.push(o)}}return e}}class Br{constructor(){Br.constructor_.apply(this,arguments)}static constructor_(){this._shells=null,this._shellIndex=null;const t=arguments[0];this._shells=t,this.buildIndex()}static assignHolesToShells(t,e){new Br(e).assignHolesToShells(t)}assignHolesToShells(t){for(let e=t.iterator();e.hasNext();){const t=e.next();this.assignHoleToShell(t)}}buildIndex(){this._shellIndex=new vs;for(const t of this._shells)this._shellIndex.insert(t.getRing().getEnvelopeInternal(),t)}queryOverlappingShells(t){return this._shellIndex.query(t)}findShellContaining(t){const e=t.getRing().getEnvelopeInternal(),n=this.queryOverlappingShells(e);return Gr.findEdgeRingContaining(t,n)}assignHoleToShell(t){const e=this.findShellContaining(t);null!==e&&e.addHole(t)}}class Yr{constructor(){Yr.constructor_.apply(this,arguments)}static constructor_(){if(this._lineStringAdder=new Vr(this),this._graph=null,this._dangles=new L,this._cutEdges=new L,this._invalidRingLines=new L,this._holeList=null,this._shellList=null,this._polyList=null,this._isCheckingRingsValid=!0,this._extractOnlyPolygonal=null,this._geomFactory=null,0===arguments.length)Yr.constructor_.call(this,!1);else if(1===arguments.length){const t=arguments[0];this._extractOnlyPolygonal=t}}static extractPolygons(t,e){const n=new L;for(let s=t.iterator();s.hasNext();){const t=s.next();(e||t.isIncluded())&&n.add(t.getPolygon())}return n}static findOuterShells(t){for(let e=t.iterator();e.hasNext();){const t=e.next(),n=t.getOuterHole();null===n||n.isProcessed()||(t.setIncluded(!0),n.setProcessed(!0))}}static findDisjointShells(t){Yr.findOuterShells(t);let e=null;do{e=!1;for(let n=t.iterator();n.hasNext();){const t=n.next();t.isIncludedSet()||(t.updateIncluded(),t.isIncludedSet()||(e=!0))}}while(e)}getGeometry(){return null===this._geomFactory&&(this._geomFactory=new Ct),this.polygonize(),this._extractOnlyPolygonal?this._geomFactory.buildGeometry(this._polyList):this._geomFactory.createGeometryCollection(Ct.toGeometryArray(this._polyList))}getInvalidRingLines(){return this.polygonize(),this._invalidRingLines}findValidRings(t,e,n){for(let s=t.iterator();s.hasNext();){const t=s.next();t.isValid()?e.add(t):n.add(t.getLineString())}}polygonize(){if(null!==this._polyList)return null;if(this._polyList=new L,null===this._graph)return null;this._dangles=this._graph.deleteDangles(),this._cutEdges=this._graph.deleteCutEdges();const t=this._graph.getEdgeRings();let e=new L;this._invalidRingLines=new L,this._isCheckingRingsValid?this.findValidRings(t,e,this._invalidRingLines):e=t,this.findShellsAndHoles(e),Br.assignHolesToShells(this._holeList,this._shellList),xe.sort(this._shellList,new Gr.EnvelopeComparator);let n=!0;this._extractOnlyPolygonal&&(Yr.findDisjointShells(this._shellList),n=!1),this._polyList=Yr.extractPolygons(this._shellList,n)}getDangles(){return this.polygonize(),this._dangles}getCutEdges(){return this.polygonize(),this._cutEdges}getPolygons(){return this.polygonize(),this._polyList}add(){if(I(arguments[0],N)){for(let t=arguments[0].iterator();t.hasNext();){const e=t.next();this.add(e)}}else if(arguments[0]instanceof J){const t=arguments[0];this._geomFactory=t.getFactory(),null===this._graph&&(this._graph=new qr(this._geomFactory)),this._graph.addEdge(t)}else if(arguments[0]instanceof X){arguments[0].apply(this._lineStringAdder)}}setCheckRingsValid(t){this._isCheckingRingsValid=t}findShellsAndHoles(t){this._holeList=new L,this._shellList=new L;for(let e=t.iterator();e.hasNext();){const t=e.next();t.computeHole(),t.isHole()?this._holeList.add(t):this._shellList.add(t)}}}class Vr{constructor(){Vr.constructor_.apply(this,arguments)}static constructor_(){this.p=null;const t=arguments[0];this.p=t}filter(t){t instanceof J&&this.p.add(t)}get interfaces_(){return[k]}}Yr.LineStringAdder=Vr;var zr=Object.freeze({__proto__:null,Polygonizer:Yr});class kr{constructor(){kr.constructor_.apply(this,arguments)}static constructor_(){this._li=new jt,this._ptLocator=new fn,this._arg=null,this._nodes=new es(new vr),this._im=null,this._isolatedEdges=new L,this._invalidPoint=null;const t=arguments[0];this._arg=t}insertEdgeEnds(t){for(let e=t.iterator();e.hasNext();){const t=e.next();this._nodes.add(t)}}computeProperIntersectionIM(t,e){const n=this._arg[0].getGeometry().getDimension(),s=this._arg[1].getGeometry().getDimension(),i=t.hasProperIntersection(),r=t.hasProperInteriorIntersection();2===n&&2===s?i&&e.setAtLeast("212101212"):2===n&&1===s?(i&&e.setAtLeast("FFF0FFFF2"),r&&e.setAtLeast("1FFFFF1FF")):1===n&&2===s?(i&&e.setAtLeast("F0FFFFFF2"),r&&e.setAtLeast("1F1FFFFFF")):1===n&&1===s&&r&&e.setAtLeast("0FFFFFFFF")}labelIsolatedEdges(t,e){for(let n=this._arg[t].getEdgeIterator();n.hasNext();){const t=n.next();t.isIsolated()&&(this.labelIsolatedEdge(t,e,this._arg[e].getGeometry()),this._isolatedEdges.add(t))}}labelIsolatedEdge(t,e,n){if(n.getDimension()>0){const s=this._ptLocator.locate(t.getCoordinate(),n);t.getLabel().setAllLocations(e,s)}else t.getLabel().setAllLocations(e,Qt.EXTERIOR)}computeIM(){const t=new Jt;if(t.set(Qt.EXTERIOR,Qt.EXTERIOR,2),!this._arg[0].getGeometry().getEnvelopeInternal().intersects(this._arg[1].getGeometry().getEnvelopeInternal()))return this.computeDisjointIM(t),t;this._arg[0].computeSelfNodes(this._li,!1),this._arg[1].computeSelfNodes(this._li,!1);const e=this._arg[0].computeEdgeIntersections(this._arg[1],this._li,!1);this.computeIntersectionNodes(0),this.computeIntersectionNodes(1),this.copyNodesAndLabels(0),this.copyNodesAndLabels(1),this.labelIsolatedNodes(),this.computeProperIntersectionIM(e,t);const n=new Tr,s=n.computeEdgeEnds(this._arg[0].getEdgeIterator());this.insertEdgeEnds(s);const i=n.computeEdgeEnds(this._arg[1].getEdgeIterator());return this.insertEdgeEnds(i),this.labelNodeEdges(),this.labelIsolatedEdges(0,1),this.labelIsolatedEdges(1,0),this.updateIM(t),t}labelNodeEdges(){for(let t=this._nodes.iterator();t.hasNext();){t.next().getEdges().computeLabelling(this._arg)}}copyNodesAndLabels(t){for(let e=this._arg[t].getNodeIterator();e.hasNext();){const n=e.next();this._nodes.addNode(n.getCoordinate()).setLabel(t,n.getLabel().getLocation(t))}}labelIntersectionNodes(t){for(let e=this._arg[t].getEdgeIterator();e.hasNext();){const n=e.next(),s=n.getLabel().getLocation(t);for(let e=n.getEdgeIntersectionList().iterator();e.hasNext();){const n=e.next(),i=this._nodes.find(n.coord);i.getLabel().isNull(t)&&(s===Qt.BOUNDARY?i.setLabelBoundary(t):i.setLabel(t,Qt.INTERIOR))}}}labelIsolatedNode(t,e){const n=this._ptLocator.locate(t.getCoordinate(),this._arg[e].getGeometry());t.getLabel().setAllLocations(e,n)}computeIntersectionNodes(t){for(let e=this._arg[t].getEdgeIterator();e.hasNext();){const n=e.next(),s=n.getLabel().getLocation(t);for(let e=n.getEdgeIntersectionList().iterator();e.hasNext();){const n=e.next(),i=this._nodes.addNode(n.coord);s===Qt.BOUNDARY?i.setLabelBoundary(t):i.getLabel().isNull(t)&&i.setLabel(t,Qt.INTERIOR)}}}labelIsolatedNodes(){for(let t=this._nodes.iterator();t.hasNext();){const e=t.next(),n=e.getLabel();g.isTrue(n.getGeometryCount()>0,"node with empty label found"),e.isIsolated()&&(n.isNull(0)?this.labelIsolatedNode(e,0):this.labelIsolatedNode(e,1))}}updateIM(t){for(let e=this._isolatedEdges.iterator();e.hasNext();){e.next().updateIM(t)}for(let e=this._nodes.iterator();e.hasNext();){const n=e.next();n.updateIM(t),n.updateIMFromEdges(t)}}computeDisjointIM(t){const e=this._arg[0].getGeometry();e.isEmpty()||(t.set(Qt.INTERIOR,Qt.EXTERIOR,e.getDimension()),t.set(Qt.BOUNDARY,Qt.EXTERIOR,e.getBoundaryDimension()));const n=this._arg[1].getGeometry();n.isEmpty()||(t.set(Qt.EXTERIOR,Qt.INTERIOR,n.getDimension()),t.set(Qt.EXTERIOR,Qt.BOUNDARY,n.getBoundaryDimension()))}}class Xr{constructor(){Xr.constructor_.apply(this,arguments)}static constructor_(){this._rectEnv=null;const t=arguments[0];this._rectEnv=t.getEnvelopeInternal()}static contains(t,e){return new Xr(t).contains(e)}isContainedInBoundary(t){if(t instanceof it)return!1;if(t instanceof tt)return this.isPointContainedInBoundary(t);if(t instanceof J)return this.isLineStringContainedInBoundary(t);for(let e=0;e<t.getNumGeometries();e++){const n=t.getGeometryN(e);if(!this.isContainedInBoundary(n))return!1}return!0}isLineSegmentContainedInBoundary(t,e){if(t.equals(e))return this.isPointContainedInBoundary(t);if(t.x===e.x){if(t.x===this._rectEnv.getMinX()||t.x===this._rectEnv.getMaxX())return!0}else if(t.y===e.y&&(t.y===this._rectEnv.getMinY()||t.y===this._rectEnv.getMaxY()))return!0;return!1}isLineStringContainedInBoundary(t){const e=t.getCoordinateSequence(),n=new m,s=new m;for(let t=0;t<e.size()-1;t++)if(e.getCoordinate(t,n),e.getCoordinate(t+1,s),!this.isLineSegmentContainedInBoundary(n,s))return!1;return!0}isPointContainedInBoundary(){if(arguments[0]instanceof tt){const t=arguments[0];return this.isPointContainedInBoundary(t.getCoordinate())}if(arguments[0]instanceof m){const t=arguments[0];return t.x===this._rectEnv.getMinX()||t.x===this._rectEnv.getMaxX()||t.y===this._rectEnv.getMinY()||t.y===this._rectEnv.getMaxY()}}contains(t){return!!this._rectEnv.contains(t.getEnvelopeInternal())&&!this.isContainedInBoundary(t)}}class Ur{constructor(){Ur.constructor_.apply(this,arguments)}static constructor_(){this._li=new jt,this._rectEnv=null,this._diagUp0=null,this._diagUp1=null,this._diagDown0=null,this._diagDown1=null;const t=arguments[0];this._rectEnv=t,this._diagUp0=new m(t.getMinX(),t.getMinY()),this._diagUp1=new m(t.getMaxX(),t.getMaxY()),this._diagDown0=new m(t.getMinX(),t.getMaxY()),this._diagDown1=new m(t.getMaxX(),t.getMinY())}intersects(t,e){const n=new O(t,e);if(!this._rectEnv.intersects(n))return!1;if(this._rectEnv.intersects(t))return!0;if(this._rectEnv.intersects(e))return!0;if(t.compareTo(e)>0){const n=t;t=e,e=n}let s=!1;return e.y>t.y&&(s=!0),s?this._li.computeIntersection(t,e,this._diagDown0,this._diagDown1):this._li.computeIntersection(t,e,this._diagUp0,this._diagUp1),!!this._li.hasIntersection()}}class Hr{constructor(){Hr.constructor_.apply(this,arguments)}static constructor_(){this._rectangle=null,this._rectEnv=null;const t=arguments[0];this._rectangle=t,this._rectEnv=t.getEnvelopeInternal()}static intersects(t,e){return new Hr(t).intersects(e)}intersects(t){if(!this._rectEnv.intersects(t.getEnvelopeInternal()))return!1;const e=new Wr(this._rectEnv);if(e.applyTo(t),e.intersects())return!0;const n=new Zr(this._rectangle);if(n.applyTo(t),n.containsPoint())return!0;const s=new jr(this._rectangle);return s.applyTo(t),!!s.intersects()}}class Wr extends Ne{constructor(){super(),Wr.constructor_.apply(this,arguments)}static constructor_(){this._rectEnv=null,this._intersects=!1;const t=arguments[0];this._rectEnv=t}isDone(){return!0===this._intersects}visit(t){const e=t.getEnvelopeInternal();return this._rectEnv.intersects(e)?this._rectEnv.contains(e)||e.getMinX()>=this._rectEnv.getMinX()&&e.getMaxX()<=this._rectEnv.getMaxX()||e.getMinY()>=this._rectEnv.getMinY()&&e.getMaxY()<=this._rectEnv.getMaxY()?(this._intersects=!0,null):void 0:null}intersects(){return this._intersects}}class Zr extends Ne{constructor(){super(),Zr.constructor_.apply(this,arguments)}static constructor_(){this._rectSeq=null,this._rectEnv=null,this._containsPoint=!1;const t=arguments[0];this._rectSeq=t.getExteriorRing().getCoordinateSequence(),this._rectEnv=t.getEnvelopeInternal()}isDone(){return!0===this._containsPoint}visit(t){if(!(t instanceof it))return null;const e=t.getEnvelopeInternal();if(!this._rectEnv.intersects(e))return null;const n=new m;for(let s=0;s<4;s++)if(this._rectSeq.getCoordinate(s,n),e.contains(n)&&Ze.containsPointInPolygon(n,t))return this._containsPoint=!0,null}containsPoint(){return this._containsPoint}}class jr extends Ne{constructor(){super(),jr.constructor_.apply(this,arguments)}static constructor_(){this._rectEnv=null,this._rectIntersector=null,this._hasIntersection=!1,this._p0=new m,this._p1=new m;const t=arguments[0];this._rectEnv=t.getEnvelopeInternal(),this._rectIntersector=new Ur(this._rectEnv)}intersects(){return this._hasIntersection}isDone(){return!0===this._hasIntersection}visit(t){const e=t.getEnvelopeInternal();if(!this._rectEnv.intersects(e))return null;const n=ye.getLines(t);this.checkIntersectionWithLineStrings(n)}checkIntersectionWithLineStrings(t){for(let e=t.iterator();e.hasNext();){const t=e.next();if(this.checkIntersectionWithSegments(t),this._hasIntersection)return null}}checkIntersectionWithSegments(t){const e=t.getCoordinateSequence();for(let t=1;t<e.size();t++)if(e.getCoordinate(t-1,this._p0),e.getCoordinate(t,this._p1),this._rectIntersector.intersects(this._p0,this._p1))return this._hasIntersection=!0,null}}class Kr extends Ir{constructor(){super(),Kr.constructor_.apply(this,arguments)}static constructor_(){if(this._relate=null,2===arguments.length){const t=arguments[0],e=arguments[1];Ir.constructor_.call(this,t,e),this._relate=new kr(this._arg)}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];Ir.constructor_.call(this,t,e,n),this._relate=new kr(this._arg)}}static covers(t,e){return!(2===e.getDimension()&&t.getDimension()<2)&&(!(1===e.getDimension()&&t.getDimension()<1&&e.getLength()>0)&&(!!t.getEnvelopeInternal().covers(e.getEnvelopeInternal())&&(!!t.isRectangle()||new Kr(t,e).getIntersectionMatrix().isCovers())))}static intersects(t,e){if(!t.getEnvelopeInternal().intersects(e.getEnvelopeInternal()))return!1;if(t.isRectangle())return Hr.intersects(t,e);if(e.isRectangle())return Hr.intersects(e,t);if(t.isGeometryCollection()||e.isGeometryCollection()){for(let n=0;n<t.getNumGeometries();n++)for(let s=0;s<e.getNumGeometries();s++)if(t.getGeometryN(n).intersects(e.getGeometryN(s)))return!0;return!1}return new Kr(t,e).getIntersectionMatrix().isIntersects()}static touches(t,e){return!!t.getEnvelopeInternal().intersects(e.getEnvelopeInternal())&&new Kr(t,e).getIntersectionMatrix().isTouches(t.getDimension(),e.getDimension())}static equalsTopo(t,e){return!!t.getEnvelopeInternal().equals(e.getEnvelopeInternal())&&Kr.relate(t,e).isEquals(t.getDimension(),e.getDimension())}static relate(){if(2===arguments.length){return new Kr(arguments[0],arguments[1]).getIntersectionMatrix()}if(3===arguments.length){return new Kr(arguments[0],arguments[1],arguments[2]).getIntersectionMatrix()}}static overlaps(t,e){return!!t.getEnvelopeInternal().intersects(e.getEnvelopeInternal())&&new Kr(t,e).getIntersectionMatrix().isOverlaps(t.getDimension(),e.getDimension())}static crosses(t,e){return!!t.getEnvelopeInternal().intersects(e.getEnvelopeInternal())&&new Kr(t,e).getIntersectionMatrix().isCrosses(t.getDimension(),e.getDimension())}static contains(t,e){return!(2===e.getDimension()&&t.getDimension()<2)&&(!(1===e.getDimension()&&t.getDimension()<1&&e.getLength()>0)&&(!!t.getEnvelopeInternal().contains(e.getEnvelopeInternal())&&(t.isRectangle()?Xr.contains(t,e):new Kr(t,e).getIntersectionMatrix().isContains())))}getIntersectionMatrix(){return this._relate.computeIM()}}var Qr=Object.freeze({__proto__:null,RelateOp:Kr});class Jr{constructor(){Jr.constructor_.apply(this,arguments)}static constructor_(){this._pointGeom=null,this._otherGeom=null,this._geomFact=null;const t=arguments[0],e=arguments[1];this._pointGeom=t,this._otherGeom=e,this._geomFact=e.getFactory()}static union(t,e){return new Jr(t,e).union()}union(){const t=new fn,e=new lt;for(let n=0;n<this._pointGeom.getNumGeometries();n++){const s=this._pointGeom.getGeometryN(n).getCoordinate();t.locate(s,this._otherGeom)===Qt.EXTERIOR&&e.add(s)}if(0===e.size())return this._otherGeom;let n=null;const s=dt.toCoordinateArray(e);return n=1===s.length?this._geomFact.createPoint(s[0]):this._geomFact.createMultiPointFromCoords(s),he.combine(n,this._otherGeom)}}class $r{constructor(){$r.constructor_.apply(this,arguments)}static constructor_(){this._geomFactory=null,this._polygons=new L,this._lines=new L,this._points=new L,this._dimension=K.FALSE}static extract(){if(I(arguments[0],N)){const t=arguments[0],e=new $r;return e.add(t),e}if(arguments[0]instanceof X){const t=arguments[0],e=new $r;return e.add(t),e}}getFactory(){return this._geomFactory}recordDimension(t){t>this._dimension&&(this._dimension=t)}getDimension(){return this._dimension}filter(t){return this.recordDimension(t.getDimension()),t instanceof ct||t.isEmpty()?null:t instanceof it?(this._polygons.add(t),null):t instanceof J?(this._lines.add(t),null):t instanceof tt?(this._points.add(t),null):void g.shouldNeverReachHere("Unhandled geometry type: "+t.getGeometryType())}getExtract(t){switch(t){case 0:return this._points;case 1:return this._lines;case 2:return this._polygons}return g.shouldNeverReachHere("Invalid dimension: "+t),null}isEmpty(){return this._polygons.isEmpty()&&this._lines.isEmpty()&&this._points.isEmpty()}add(){if(I(arguments[0],N)){const t=arguments[0];for(const e of t)this.add(e)}else if(arguments[0]instanceof X){const t=arguments[0];null===this._geomFactory&&(this._geomFactory=t.getFactory()),t.apply(this)}}get interfaces_(){return[Q]}}class to{constructor(){to.constructor_.apply(this,arguments)}static constructor_(){this._geomFactory=null,this._g0=null,this._g1=null,this._isUnionSafe=null;const t=arguments[0],e=arguments[1];this._g0=t,this._g1=e,this._geomFactory=t.getFactory()}static containsProperly(){if(2===arguments.length){const t=arguments[0],e=arguments[1];return!t.isNull()&&(e.getX()>t.getMinX()&&e.getX()<t.getMaxX()&&e.getY()>t.getMinY()&&e.getY()<t.getMaxY())}if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];return to.containsProperly(t,e)&&to.containsProperly(t,n)}}static union(t,e){return new to(t,e).union()}static intersects(t,e,n){return t.intersects(e)||t.intersects(n)}static overlapEnvelope(t,e){const n=t.getEnvelopeInternal(),s=e.getEnvelopeInternal();return n.intersection(s)}static extractBorderSegments(t,e,n){t.apply(new class{get interfaces_(){return[P]}filter(t,s){if(s<=0)return null;const i=t.getCoordinate(s-1),r=t.getCoordinate(s);if(to.intersects(e,i,r)&&!to.containsProperly(e,i,r)){const t=new Kt(i,r);n.add(t)}}isDone(){return!1}isGeometryChanged(){return!1}})}static unionBuffer(t,e){return t.getFactory().createGeometryCollection([t,e]).buffer(0)}isBorderSegmentsSame(t,e){const n=this.extractBorderSegments(this._g0,this._g1,e),s=new L;return to.extractBorderSegments(t,e,s),this.isEqual(n,s)}extractByEnvelope(t,e,n){const s=new L;for(let i=0;i<e.getNumGeometries();i++){const r=e.getGeometryN(i);if(r.getEnvelopeInternal().intersects(t))s.add(r);else{const t=r.copy();n.add(t)}}return this._geomFactory.buildGeometry(s)}isEqual(t,e){if(t.size()!==e.size())return!1;const n=new xt(t);for(const t of e)if(!n.contains(t))return!1;return!0}union(){const t=to.overlapEnvelope(this._g0,this._g1);if(t.isNull()){const t=this._g0.copy(),e=this._g1.copy();return he.combine(t,e)}const e=new L,n=this.extractByEnvelope(t,this._g0,e),s=this.extractByEnvelope(t,this._g1,e),i=this.unionFull(n,s);let r=null;return this._isUnionSafe=this.isBorderSegmentsSame(i,t),r=this._isUnionSafe?this.combine(i,e):this.unionFull(this._g0,this._g1),r}combine(t,e){if(e.size()<=0)return t;e.add(t);return he.combine(e)}unionFull(t,e){try{return t.union(e)}catch(n){if(n instanceof ss)return to.unionBuffer(t,e);throw n}}extractBorderSegments(t,e,n){const s=new L;return to.extractBorderSegments(t,n,s),null!==e&&to.extractBorderSegments(e,n,s),s}isUnionOptimized(){return this._isUnionSafe}}class eo{constructor(){eo.constructor_.apply(this,arguments)}static constructor_(){this._inputPolys=null,this._geomFactory=null;const t=arguments[0];this._inputPolys=t,null===this._inputPolys&&(this._inputPolys=new L)}static restrictToPolygons(t){if(I(t,st))return t;const e=Ie.getPolygons(t);return 1===e.size()?e.get(0):t.getFactory().createMultiPolygon(Ct.toPolygonArray(e))}static getGeometry(t,e){return e>=t.size()?null:t.get(e)}static union(t){return new eo(t).union()}reduceToGeometries(t){const e=new L;for(let n=t.iterator();n.hasNext();){const t=n.next();let s=null;I(t,w)?s=this.unionTree(t):t instanceof X&&(s=t),e.add(s)}return e}union(){if(null===this._inputPolys)throw new IllegalStateException("union() method cannot be called twice");if(this._inputPolys.isEmpty())return null;this._geomFactory=this._inputPolys.iterator().next().getFactory();const t=new vs(eo.STRTREE_NODE_CAPACITY);for(let e=this._inputPolys.iterator();e.hasNext();){const n=e.next();t.insert(n.getEnvelopeInternal(),n)}this._inputPolys=null;const e=t.itemsTree();return this.unionTree(e)}binaryUnion(){if(1===arguments.length){const t=arguments[0];return this.binaryUnion(t,0,t.size())}if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];if(n-e<=1){const n=eo.getGeometry(t,e);return this.unionSafe(n,null)}if(n-e==2)return this.unionSafe(eo.getGeometry(t,e),eo.getGeometry(t,e+1));{const s=Math.trunc((n+e)/2),i=this.binaryUnion(t,e,s),r=this.binaryUnion(t,s,n);return this.unionSafe(i,r)}}}repeatedUnion(t){let e=null;for(let n=t.iterator();n.hasNext();){const t=n.next();e=null===e?t.copy():e.union(t)}return e}unionSafe(t,e){return null===t&&null===e?null:null===t?e.copy():null===e?t.copy():this.unionActual(t,e)}unionActual(t,e){const n=to.union(t,e);return eo.restrictToPolygons(n)}unionTree(t){const e=this.reduceToGeometries(t);return this.binaryUnion(e)}bufferUnion(){if(1===arguments.length){const t=arguments[0];return t.get(0).getFactory().buildGeometry(t).buffer(0)}if(2===arguments.length){const t=arguments[0],e=arguments[1];return t.getFactory().createGeometryCollection([t,e]).buffer(0)}}}eo.STRTREE_NODE_CAPACITY=4;class no{constructor(){no.constructor_.apply(this,arguments)}static constructor_(){if(this._geomFact=null,this._extracter=null,1===arguments.length){if(I(arguments[0],N)){const t=arguments[0];this.extract(t)}else if(arguments[0]instanceof X){const t=arguments[0];this.extract(t)}}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this._geomFact=e,this.extract(t)}}static union(){if(1===arguments.length){if(I(arguments[0],N)){return new no(arguments[0]).union()}if(arguments[0]instanceof X){return new no(arguments[0]).union()}}else if(2===arguments.length){return new no(arguments[0],arguments[1]).union()}}unionNoOpt(t){const e=this._geomFact.createPoint();return Er.overlayOp(t,e,Nr.UNION)}unionWithNull(t,e){return null===t&&null===e?null:null===e?t:null===t?e:t.union(e)}extract(){if(I(arguments[0],N)){const t=arguments[0];this._extracter=$r.extract(t)}else if(arguments[0]instanceof X){const t=arguments[0];this._extracter=$r.extract(t)}}union(){if(null===this._geomFact&&(this._geomFact=this._extracter.getFactory()),null===this._geomFact)return null;if(this._extracter.isEmpty())return this._geomFact.createEmpty(this._extracter.getDimension());const t=this._extracter.getExtract(0),e=this._extracter.getExtract(1),n=this._extracter.getExtract(2);let s=null;if(t.size()>0){const e=this._geomFact.buildGeometry(t);s=this.unionNoOpt(e)}let i=null;if(e.size()>0){const t=this._geomFact.buildGeometry(e);i=this.unionNoOpt(t)}let r=null;n.size()>0&&(r=eo.union(n));const o=this.unionWithNull(i,r);let l=null;return l=null===s?o:null===o?s:Jr.union(s,o),null===l?this._geomFact.createGeometryCollection():l}}var so=Object.freeze({__proto__:null,UnaryUnionOp:no}),io=Object.freeze({__proto__:null,IsValidOp:Fr,ConsistentAreaTester:br}),ro=Object.freeze({__proto__:null,BoundaryOp:si,IsSimpleOp:ri,buffer:qi,distance:zi,linemerge:ir,overlay:Sr,polygonize:zr,relate:Qr,union:so,valid:io});class oo extends ue.CoordinateOperation{constructor(){super(),oo.constructor_.apply(this,arguments)}static constructor_(){this._targetPM=null,this._removeCollapsed=!0;const t=arguments[0],e=arguments[1];this._targetPM=t,this._removeCollapsed=e}edit(){if(2===arguments.length&&arguments[1]instanceof X&&arguments[0]instanceof Array){const t=arguments[0],e=arguments[1];if(0===t.length)return null;const n=new Array(t.length).fill(null);for(let e=0;e<t.length;e++){const s=new m(t[e]);this._targetPM.makePrecise(s),n[e]=s}const s=new R(n,!1).toCoordinateArray();let i=0;e instanceof J&&(i=2),e instanceof ut&&(i=4);let r=n;return this._removeCollapsed&&(r=null),s.length<i?r:s}return super.edit.apply(this,arguments)}}class lo{constructor(){lo.constructor_.apply(this,arguments)}static constructor_(){this._targetPM=null,this._removeCollapsed=!0,this._changePrecisionModel=!1,this._isPointwise=!1;const t=arguments[0];this._targetPM=t}static reduce(t,e){return new lo(e).reduce(t)}static reducePointwise(t,e){const n=new lo(e);return n.setPointwise(!0),n.reduce(t)}fixPolygonalTopology(t){let e=t;this._changePrecisionModel||(e=this.changePM(t,this._targetPM));return Gi.bufferOp(e,0)}reducePointwise(t){let e=null;if(this._changePrecisionModel){const n=this.createFactory(t.getFactory(),this._targetPM);e=new ue(n)}else e=new ue;let n=this._removeCollapsed;t.getDimension()>=2&&(n=!0);return e.edit(t,new oo(this._targetPM,n))}changePM(t,e){return this.createEditor(t.getFactory(),e).edit(t,new ue.NoOpGeometryOperation)}setRemoveCollapsedComponents(t){this._removeCollapsed=t}createFactory(t,e){return new Ct(e,t.getSRID(),t.getCoordinateSequenceFactory())}setChangePrecisionModel(t){this._changePrecisionModel=t}reduce(t){const e=this.reducePointwise(t);return this._isPointwise?e:I(e,st)?Fr.isValid(e)?e:this.fixPolygonalTopology(e):e}setPointwise(t){this._isPointwise=t}createEditor(t,e){if(t.getPrecisionModel()===e)return new ue;const n=this.createFactory(t,e);return new ue(n)}}var ao=Object.freeze({__proto__:null,GeometryPrecisionReducer:lo});class co{constructor(){co.constructor_.apply(this,arguments)}static constructor_(){this._pts=null,this._usePt=null,this._distanceTolerance=null,this._seg=new Kt;const t=arguments[0];this._pts=t}static simplify(t,e){const n=new co(t);return n.setDistanceTolerance(e),n.simplify()}simplifySection(t,e){if(t+1===e)return null;this._seg.p0=this._pts[t],this._seg.p1=this._pts[e];let n=-1,s=t;for(let i=t+1;i<e;i++){const t=this._seg.distance(this._pts[i]);t>n&&(n=t,s=i)}if(n<=this._distanceTolerance)for(let n=t+1;n<e;n++)this._usePt[n]=!1;else this.simplifySection(t,s),this.simplifySection(s,e)}setDistanceTolerance(t){this._distanceTolerance=t}simplify(){this._usePt=new Array(this._pts.length).fill(null);for(let t=0;t<this._pts.length;t++)this._usePt[t]=!0;this.simplifySection(0,this._pts.length-1);const t=new R;for(let e=0;e<this._pts.length;e++)this._usePt[e]&&t.add(new m(this._pts[e]));return t.toCoordinateArray()}}class ho{constructor(){ho.constructor_.apply(this,arguments)}static constructor_(){this._inputGeom=null,this._distanceTolerance=null,this._isEnsureValidTopology=!0;const t=arguments[0];this._inputGeom=t}static simplify(t,e){const n=new ho(t);return n.setDistanceTolerance(e),n.getResultGeometry()}setEnsureValid(t){this._isEnsureValidTopology=t}getResultGeometry(){return this._inputGeom.isEmpty()?this._inputGeom.copy():new uo(this._isEnsureValidTopology,this._distanceTolerance).transform(this._inputGeom)}setDistanceTolerance(t){if(t<0)throw new s("Tolerance must be non-negative");this._distanceTolerance=t}}class uo extends me{constructor(){super(),uo.constructor_.apply(this,arguments)}static constructor_(){this._isEnsureValidTopology=!0,this._distanceTolerance=null;const t=arguments[0],e=arguments[1];this._isEnsureValidTopology=t,this._distanceTolerance=e}transformPolygon(t,e){if(t.isEmpty())return null;const n=super.transformPolygon.call(this,t,e);return e instanceof ft?n:this.createValidArea(n)}createValidArea(t){return this._isEnsureValidTopology?t.buffer(0):t}transformCoordinates(t,e){const n=t.toCoordinateArray();let s=null;return s=0===n.length?new Array(0).fill(null):co.simplify(n,this._distanceTolerance),this._factory.getCoordinateSequenceFactory().create(s)}transformMultiPolygon(t,e){const n=super.transformMultiPolygon.call(this,t,e);return this.createValidArea(n)}transformLinearRing(t,e){const n=e instanceof it,s=super.transformLinearRing.call(this,t,e);return!n||s instanceof ut?s:null}}ho.DPTransformer=uo;class go extends Kt{constructor(){super(),go.constructor_.apply(this,arguments)}static constructor_(){if(this._parent=null,this._index=null,2===arguments.length){const t=arguments[0],e=arguments[1];go.constructor_.call(this,t,e,null,-1)}else if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];Kt.constructor_.call(this,t,e),this._parent=n,this._index=s}}getIndex(){return this._index}getParent(){return this._parent}}class _o{constructor(){_o.constructor_.apply(this,arguments)}static constructor_(){if(this._parentLine=null,this._segs=null,this._resultSegs=new L,this._minimumSize=null,1===arguments.length){const t=arguments[0];_o.constructor_.call(this,t,2)}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this._parentLine=t,this._minimumSize=e,this.init()}}static extractCoordinates(t){const e=new Array(t.size()+1).fill(null);let n=null;for(let s=0;s<t.size();s++)n=t.get(s),e[s]=n.p0;return e[e.length-1]=n.p1,e}addToResult(t){this._resultSegs.add(t)}asLineString(){return this._parentLine.getFactory().createLineString(_o.extractCoordinates(this._resultSegs))}getResultSize(){const t=this._resultSegs.size();return 0===t?0:t+1}getParent(){return this._parentLine}getSegment(t){return this._segs[t]}getParentCoordinates(){return this._parentLine.getCoordinates()}getMinimumSize(){return this._minimumSize}asLinearRing(){return this._parentLine.getFactory().createLinearRing(_o.extractCoordinates(this._resultSegs))}getSegments(){return this._segs}init(){const t=this._parentLine.getCoordinates();this._segs=new Array(t.length-1).fill(null);for(let e=0;e<t.length-1;e++){const n=new go(t[e],t[e+1],this._parentLine,e);this._segs[e]=n}}getResultCoordinates(){return _o.extractCoordinates(this._resultSegs)}}class po{constructor(){po.constructor_.apply(this,arguments)}static constructor_(){this._index=new Is}remove(t){this._index.remove(new O(t.p0,t.p1),t)}add(){if(arguments[0]instanceof _o){const t=arguments[0].getSegments();for(let e=0;e<t.length;e++){const n=t[e];this.add(n)}}else if(arguments[0]instanceof Kt){const t=arguments[0];this._index.insert(new O(t.p0,t.p1),t)}}query(t){const e=new O(t.p0,t.p1),n=new mo(t);this._index.query(e,n);return n.getItems()}}class mo{constructor(){mo.constructor_.apply(this,arguments)}static constructor_(){this._querySeg=null,this._items=new L;const t=arguments[0];this._querySeg=t}visitItem(t){const e=t;O.intersects(e.p0,e.p1,this._querySeg.p0,this._querySeg.p1)&&this._items.add(t)}getItems(){return this._items}get interfaces_(){return[De]}}class fo{constructor(){fo.constructor_.apply(this,arguments)}static constructor_(){this._li=new jt,this._inputIndex=new po,this._outputIndex=new po,this._line=null,this._linePts=null,this._distanceTolerance=0;const t=arguments[0],e=arguments[1];this._inputIndex=t,this._outputIndex=e}static isInLineSection(t,e,n){if(n.getParent()!==t.getParent())return!1;const s=n.getIndex();return s>=e[0]&&s<e[1]}flatten(t,e){const n=this._linePts[t],s=this._linePts[e],i=new Kt(n,s);return this.remove(this._line,t,e),this._outputIndex.add(i),i}hasBadIntersection(t,e,n){return!!this.hasBadOutputIntersection(n)||!!this.hasBadInputIntersection(t,e,n)}setDistanceTolerance(t){this._distanceTolerance=t}simplifySection(t,e,n){n+=1;const s=new Array(2).fill(null);if(t+1===e){const e=this._line.getSegment(t);return this._line.addToResult(e),null}let i=!0;if(this._line.getResultSize()<this._line.getMinimumSize()){n+1<this._line.getMinimumSize()&&(i=!1)}const r=new Array(1).fill(null),o=this.findFurthestPoint(this._linePts,t,e,r);r[0]>this._distanceTolerance&&(i=!1);const l=new Kt;if(l.p0=this._linePts[t],l.p1=this._linePts[e],s[0]=t,s[1]=e,this.hasBadIntersection(this._line,s,l)&&(i=!1),i){const n=this.flatten(t,e);return this._line.addToResult(n),null}this.simplifySection(t,o,n),this.simplifySection(o,e,n)}hasBadOutputIntersection(t){for(let e=this._outputIndex.query(t).iterator();e.hasNext();){const n=e.next();if(this.hasInteriorIntersection(n,t))return!0}return!1}findFurthestPoint(t,e,n,s){const i=new Kt;i.p0=t[e],i.p1=t[n];let r=-1,o=e;for(let s=e+1;s<n;s++){const e=t[s],n=i.distance(e);n>r&&(r=n,o=s)}return s[0]=r,o}simplify(t){this._line=t,this._linePts=t.getParentCoordinates(),this.simplifySection(0,this._linePts.length-1,0)}remove(t,e,n){for(let s=e;s<n;s++){const e=t.getSegment(s);this._inputIndex.remove(e)}}hasInteriorIntersection(t,e){return this._li.computeIntersection(t.p0,t.p1,e.p0,e.p1),this._li.isInteriorIntersection()}hasBadInputIntersection(t,e,n){for(let s=this._inputIndex.query(n).iterator();s.hasNext();){const i=s.next();if(this.hasInteriorIntersection(i,n)){if(fo.isInLineSection(t,e,i))continue;return!0}}return!1}}class yo{constructor(){yo.constructor_.apply(this,arguments)}static constructor_(){this._inputIndex=new po,this._outputIndex=new po,this._distanceTolerance=0}setDistanceTolerance(t){this._distanceTolerance=t}simplify(t){for(let e=t.iterator();e.hasNext();)this._inputIndex.add(e.next());for(let e=t.iterator();e.hasNext();){const t=new fo(this._inputIndex,this._outputIndex);t.setDistanceTolerance(this._distanceTolerance),t.simplify(e.next())}}}class xo{constructor(){xo.constructor_.apply(this,arguments)}static constructor_(){this._inputGeom=null,this._lineSimplifier=new yo,this._linestringMap=null;const t=arguments[0];this._inputGeom=t}static simplify(t,e){const n=new xo(t);return n.setDistanceTolerance(e),n.getResultGeometry()}getResultGeometry(){if(this._inputGeom.isEmpty())return this._inputGeom.copy();this._linestringMap=new It,this._inputGeom.apply(new Io(this)),this._lineSimplifier.simplify(this._linestringMap.values());return new Eo(this._linestringMap).transform(this._inputGeom)}setDistanceTolerance(t){if(t<0)throw new s("Tolerance must be non-negative");this._lineSimplifier.setDistanceTolerance(t)}}class Eo extends me{constructor(){super(),Eo.constructor_.apply(this,arguments)}static constructor_(){this._linestringMap=null;const t=arguments[0];this._linestringMap=t}transformCoordinates(t,e){if(0===t.size())return null;if(e instanceof J){const t=this._linestringMap.get(e);return this.createCoordinateSequence(t.getResultCoordinates())}return super.transformCoordinates.call(this,t,e)}}class Io{constructor(){Io.constructor_.apply(this,arguments)}static constructor_(){this.tps=null;const t=arguments[0];this.tps=t}filter(t){if(t instanceof J){const e=t;if(e.isEmpty())return null;const n=e.isClosed()?4:2,s=new _o(e,n);this.tps._linestringMap.put(e,s)}}get interfaces_(){return[k]}}xo.LineStringTransformer=Eo,xo.LineStringMapBuilderFilter=Io;class No{constructor(){No.constructor_.apply(this,arguments)}static constructor_(){this._pts=null,this._tolerance=null;const t=arguments[0],e=arguments[1];this._pts=t,this._tolerance=e*e}static simplify(t,e){return new No(t,e).simplify()}simplifyVertex(t){let e=t,n=e.getArea(),s=null;for(;null!==e;){const t=e.getArea();t<n&&(n=t,s=e),e=e._next}return null!==s&&n<this._tolerance&&s.remove(),t.isLive()?n:-1}simplify(){const t=So.buildLine(this._pts);let e=this._tolerance;do{e=this.simplifyVertex(t)}while(e<this._tolerance);const n=t.getCoordinates();return n.length<2?[n[0],new m(n[0])]:n}}class So{constructor(){So.constructor_.apply(this,arguments)}static constructor_(){this._pt=null,this._prev=null,this._next=null,this._area=So.MAX_AREA,this._isLive=!0;const t=arguments[0];this._pt=t}static buildLine(t){let e=null,n=null;for(let s=0;s<t.length;s++){const i=new So(t[s]);null===e&&(e=i),i.setPrev(n),null!==n&&(n.setNext(i),n.updateArea()),n=i}return e}getCoordinates(){const t=new R;let e=this;do{t.add(e._pt,!1),e=e._next}while(null!==e);return t.toCoordinateArray()}getArea(){return this._area}updateArea(){if(null===this._prev||null===this._next)return this._area=So.MAX_AREA,null;this._area=Math.abs(ne.area(this._prev._pt,this._pt,this._next._pt))}remove(){const t=this._prev,e=this._next;let n=null;return null!==this._prev&&(this._prev.setNext(e),this._prev.updateArea(),n=this._prev),null!==this._next&&(this._next.setPrev(t),this._next.updateArea(),null===n&&(n=this._next)),this._isLive=!1,n}isLive(){return this._isLive}setPrev(t){this._prev=t}setNext(t){this._next=t}}So.MAX_AREA=r.MAX_VALUE,No.VWVertex=So;class wo{constructor(){wo.constructor_.apply(this,arguments)}static constructor_(){this._inputGeom=null,this._distanceTolerance=null,this._isEnsureValidTopology=!0;const t=arguments[0];this._inputGeom=t}static simplify(t,e){const n=new wo(t);return n.setDistanceTolerance(e),n.getResultGeometry()}setEnsureValid(t){this._isEnsureValidTopology=t}getResultGeometry(){return this._inputGeom.isEmpty()?this._inputGeom.copy():new Co(this._isEnsureValidTopology,this._distanceTolerance).transform(this._inputGeom)}setDistanceTolerance(t){if(t<0)throw new s("Tolerance must be non-negative");this._distanceTolerance=t}}class Co extends me{constructor(){super(),Co.constructor_.apply(this,arguments)}static constructor_(){this._isEnsureValidTopology=!0,this._distanceTolerance=null;const t=arguments[0],e=arguments[1];this._isEnsureValidTopology=t,this._distanceTolerance=e}transformPolygon(t,e){if(t.isEmpty())return null;const n=super.transformPolygon.call(this,t,e);return e instanceof ft?n:this.createValidArea(n)}createValidArea(t){return this._isEnsureValidTopology?t.buffer(0):t}transformCoordinates(t,e){const n=t.toCoordinateArray();let s=null;return s=0===n.length?new Array(0).fill(null):No.simplify(n,this._distanceTolerance),this._factory.getCoordinateSequenceFactory().create(s)}transformMultiPolygon(t,e){const n=super.transformMultiPolygon.call(this,t,e);return this.createValidArea(n)}transformLinearRing(t,e){const n=e instanceof it,s=super.transformLinearRing.call(this,t,e);return!n||s instanceof ut?s:null}}wo.VWTransformer=Co;var Lo=Object.freeze({__proto__:null,DouglasPeuckerSimplifier:ho,TopologyPreservingSimplifier:xo,VWSimplifier:wo});class To{constructor(){To.constructor_.apply(this,arguments)}static constructor_(){this._seg=null,this._segLen=null,this._splitPt=null,this._minimumLen=0;const t=arguments[0];this._seg=t,this._segLen=t.getLength()}static pointAlongReverse(t,e){const n=new m;return n.x=t.p1.x-e*(t.p1.x-t.p0.x),n.y=t.p1.y-e*(t.p1.y-t.p0.y),n}splitAt(){if(1===arguments.length){const t=arguments[0],e=this._minimumLen/this._segLen;if(t.distance(this._seg.p0)<this._minimumLen)return this._splitPt=this._seg.pointAlong(e),null;if(t.distance(this._seg.p1)<this._minimumLen)return this._splitPt=To.pointAlongReverse(this._seg,e),null;this._splitPt=t}else if(2===arguments.length){const t=arguments[0],e=arguments[1],n=this.getConstrainedLength(t)/this._segLen;e.equals2D(this._seg.p0)?this._splitPt=this._seg.pointAlong(n):this._splitPt=To.pointAlongReverse(this._seg,n)}}setMinimumLength(t){this._minimumLen=t}getConstrainedLength(t){return t<this._minimumLen?this._minimumLen:t}getSplitPoint(){return this._splitPt}}class Ro{findSplitPoint(t,e){}}class Po{static projectedSplitPoint(t,e){return t.getLineSegment().project(e)}findSplitPoint(t,e){const n=t.getLineSegment(),s=n.getLength()/2,i=new To(n),r=Po.projectedSplitPoint(t,e);let o=2*r.distance(e)*.8;return o>s&&(o=s),i.setMinimumLength(o),i.splitAt(r),i.getSplitPoint()}get interfaces_(){return[Ro]}}class Oo{static triArea(t,e,n){return(e.x-t.x)*(n.y-t.y)-(e.y-t.y)*(n.x-t.x)}static isInCircleDDNormalized(t,e,n,s){const i=D.valueOf(t.x).selfSubtract(s.x),r=D.valueOf(t.y).selfSubtract(s.y),o=D.valueOf(e.x).selfSubtract(s.x),l=D.valueOf(e.y).selfSubtract(s.y),a=D.valueOf(n.x).selfSubtract(s.x),c=D.valueOf(n.y).selfSubtract(s.y),h=i.multiply(l).selfSubtract(o.multiply(r)),u=o.multiply(c).selfSubtract(a.multiply(l)),g=a.multiply(r).selfSubtract(i.multiply(c)),d=i.multiply(i).selfAdd(r.multiply(r)),_=o.multiply(o).selfAdd(l.multiply(l)),p=a.multiply(a).selfAdd(c.multiply(c));return d.selfMultiply(u).selfAdd(_.selfMultiply(g)).selfAdd(p.selfMultiply(h)).doubleValue()>0}static checkRobustInCircle(t,e,n,s){const i=Oo.isInCircleNonRobust(t,e,n,s),r=Oo.isInCircleDDSlow(t,e,n,s),o=Oo.isInCircleCC(t,e,n,s),l=ne.circumcentre(t,e,n);B.out.println("p radius diff a = "+Math.abs(s.distance(l)-t.distance(l))/t.distance(l)),i===r&&i===o||(B.out.println("inCircle robustness failure (double result = "+i+", DD result = "+r+", CC result = "+o+")"),B.out.println(Wt.toLineString(new pt([t,e,n,s]))),B.out.println("Circumcentre = "+Wt.toPoint(l)+" radius = "+t.distance(l)),B.out.println("p radius diff a = "+Math.abs(s.distance(l)/t.distance(l)-1)),B.out.println("p radius diff b = "+Math.abs(s.distance(l)/e.distance(l)-1)),B.out.println("p radius diff c = "+Math.abs(s.distance(l)/n.distance(l)-1)),B.out.println())}static isInCircleDDFast(t,e,n,s){const i=D.sqr(t.x).selfAdd(D.sqr(t.y)).selfMultiply(Oo.triAreaDDFast(e,n,s)),r=D.sqr(e.x).selfAdd(D.sqr(e.y)).selfMultiply(Oo.triAreaDDFast(t,n,s)),o=D.sqr(n.x).selfAdd(D.sqr(n.y)).selfMultiply(Oo.triAreaDDFast(t,e,s)),l=D.sqr(s.x).selfAdd(D.sqr(s.y)).selfMultiply(Oo.triAreaDDFast(t,e,n));return i.selfSubtract(r).selfAdd(o).selfSubtract(l).doubleValue()>0}static isInCircleCC(t,e,n,s){const i=ne.circumcentre(t,e,n),r=t.distance(i);return s.distance(i)-r<=0}static isInCircleNormalized(t,e,n,s){const i=t.x-s.x,r=t.y-s.y,o=e.x-s.x,l=e.y-s.y,a=n.x-s.x,c=n.y-s.y;return(i*i+r*r)*(o*c-a*l)+(o*o+l*l)*(a*r-i*c)+(a*a+c*c)*(i*l-o*r)>0}static isInCircleDDSlow(t,e,n,s){const i=D.valueOf(s.x),r=D.valueOf(s.y),o=D.valueOf(t.x),l=D.valueOf(t.y),a=D.valueOf(e.x),c=D.valueOf(e.y),h=D.valueOf(n.x),u=D.valueOf(n.y),g=o.multiply(o).add(l.multiply(l)).multiply(Oo.triAreaDDSlow(a,c,h,u,i,r)),d=a.multiply(a).add(c.multiply(c)).multiply(Oo.triAreaDDSlow(o,l,h,u,i,r)),_=h.multiply(h).add(u.multiply(u)).multiply(Oo.triAreaDDSlow(o,l,a,c,i,r)),p=i.multiply(i).add(r.multiply(r)).multiply(Oo.triAreaDDSlow(o,l,a,c,h,u));return g.subtract(d).add(_).subtract(p).doubleValue()>0}static isInCircleNonRobust(t,e,n,s){return(t.x*t.x+t.y*t.y)*Oo.triArea(e,n,s)-(e.x*e.x+e.y*e.y)*Oo.triArea(t,n,s)+(n.x*n.x+n.y*n.y)*Oo.triArea(t,e,s)-(s.x*s.x+s.y*s.y)*Oo.triArea(t,e,n)>0}static isInCircleRobust(t,e,n,s){return Oo.isInCircleNormalized(t,e,n,s)}static triAreaDDSlow(t,e,n,s,i,r){return n.subtract(t).multiply(r.subtract(e)).subtract(s.subtract(e).multiply(i.subtract(t)))}static triAreaDDFast(t,e,n){const s=D.valueOf(e.x).selfSubtract(t.x).selfMultiply(D.valueOf(n.y).selfSubtract(t.y)),i=D.valueOf(e.y).selfSubtract(t.y).selfMultiply(D.valueOf(n.x).selfSubtract(t.x));return s.selfSubtract(i)}}class vo{constructor(){vo.constructor_.apply(this,arguments)}static constructor_(){if(this._p=null,1===arguments.length){const t=arguments[0];this._p=new m(t)}else if(2===arguments.length){const t=arguments[0],e=arguments[1];this._p=new m(t,e)}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];this._p=new m(t,e,n)}}static interpolateZ(){if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=e.distance(n),i=t.distance(e),r=n.getZ()-e.getZ();return e.getZ()+r*(i/s)}if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3],i=e.x,r=e.y,o=n.x-i,l=s.x-i,a=n.y-r,c=s.y-r,h=o*c-l*a,u=t.x-i,g=t.y-r,d=(c*u-l*g)/h,_=(-a*u+o*g)/h;return e.getZ()+d*(n.getZ()-e.getZ())+_*(s.getZ()-e.getZ())}}circleCenter(t,e){const n=new vo(this.getX(),this.getY()),s=this.bisector(n,t),i=this.bisector(t,e),r=new ee(s,i);let o=null;try{o=new vo(r.getX(),r.getY())}catch(s){if(!(s instanceof te))throw s;B.err.println("a: "+n+"  b: "+t+"  c: "+e),B.err.println(s)}return o}dot(t){return this._p.x*t.getX()+this._p.y*t.getY()}magn(){return Math.sqrt(this._p.x*this._p.x+this._p.y*this._p.y)}getZ(){return this._p.getZ()}bisector(t,e){const n=e.getX()-t.getX(),s=e.getY()-t.getY(),i=new ee(t.getX()+n/2,t.getY()+s/2,1),r=new ee(t.getX()-s+n/2,t.getY()+n+s/2,1);return new ee(i,r)}equals(){if(1===arguments.length){const t=arguments[0];return this._p.x===t.getX()&&this._p.y===t.getY()}if(2===arguments.length){const t=arguments[0],e=arguments[1];return this._p.distance(t.getCoordinate())<e}}getCoordinate(){return this._p}isInCircle(t,e,n){return Oo.isInCircleRobust(t._p,e._p,n._p,this._p)}interpolateZValue(t,e,n){const s=t.getX(),i=t.getY(),r=e.getX()-s,o=n.getX()-s,l=e.getY()-i,a=n.getY()-i,c=r*a-o*l,h=this.getX()-s,u=this.getY()-i,g=(a*h-o*u)/c,d=(-l*h+r*u)/c;return t.getZ()+g*(e.getZ()-t.getZ())+d*(n.getZ()-t.getZ())}midPoint(t){const e=(this._p.x+t.getX())/2,n=(this._p.y+t.getY())/2,s=(this._p.getZ()+t.getZ())/2;return new vo(e,n,s)}rightOf(t){return this.isCCW(t.dest(),t.orig())}isCCW(t,e){return(t._p.x-this._p.x)*(e._p.y-this._p.y)-(t._p.y-this._p.y)*(e._p.x-this._p.x)>0}getX(){return this._p.x}crossProduct(t){return this._p.x*t.getY()-this._p.y*t.getX()}setZ(t){this._p.setZ(t)}times(t){return new vo(t*this._p.x,t*this._p.y)}cross(){return new vo(this._p.y,-this._p.x)}leftOf(t){return this.isCCW(t.orig(),t.dest())}toString(){return"POINT ("+this._p.x+" "+this._p.y+")"}sub(t){return new vo(this._p.x-t.getX(),this._p.y-t.getY())}getY(){return this._p.y}classify(t,e){const n=this,s=e.sub(t),i=n.sub(t),r=s.crossProduct(i);return r>0?vo.LEFT:r<0?vo.RIGHT:s.getX()*i.getX()<0||s.getY()*i.getY()<0?vo.BEHIND:s.magn()<i.magn()?vo.BEYOND:t.equals(n)?vo.ORIGIN:e.equals(n)?vo.DESTINATION:vo.BETWEEN}sum(t){return new vo(this._p.x+t.getX(),this._p.y+t.getY())}distance(t,e){return Math.sqrt(Math.pow(e.getX()-t.getX(),2)+Math.pow(e.getY()-t.getY(),2))}circumRadiusRatio(t,e){const n=this.circleCenter(t,e),s=this.distance(n,t);let i=this.distance(this,t),r=this.distance(t,e);return r<i&&(i=r),r=this.distance(e,this),r<i&&(i=r),s/i}}vo.LEFT=0,vo.RIGHT=1,vo.BEYOND=2,vo.BEHIND=3,vo.BETWEEN=4,vo.ORIGIN=5,vo.DESTINATION=6;class Mo extends vo{constructor(){super(),Mo.constructor_.apply(this,arguments)}static constructor_(){this._isOnConstraint=null,this._constraint=null;const t=arguments[0];vo.constructor_.call(this,t)}getConstraint(){return this._constraint}setOnConstraint(t){this._isOnConstraint=t}merge(t){t._isOnConstraint&&(this._isOnConstraint=!0,this._constraint=t._constraint)}isOnConstraint(){return this._isOnConstraint}setConstraint(t){this._isOnConstraint=!0,this._constraint=t}}class bo{constructor(){bo.constructor_.apply(this,arguments)}static constructor_(){this._rot=null,this._vertex=null,this._next=null,this._data=null}static makeEdge(t,e){const n=new bo,s=new bo,i=new bo,r=new bo;n._rot=s,s._rot=i,i._rot=r,r._rot=n,n.setNext(n),s.setNext(r),i.setNext(i),r.setNext(s);const o=n;return o.setOrig(t),o.setDest(e),o}static swap(t){const e=t.oPrev(),n=t.sym().oPrev();bo.splice(t,e),bo.splice(t.sym(),n),bo.splice(t,e.lNext()),bo.splice(t.sym(),n.lNext()),t.setOrig(e.dest()),t.setDest(n.dest())}static splice(t,e){const n=t.oNext().rot(),s=e.oNext().rot(),i=e.oNext(),r=t.oNext(),o=s.oNext(),l=n.oNext();t.setNext(i),e.setNext(r),n.setNext(o),s.setNext(l)}static connect(t,e){const n=bo.makeEdge(t.dest(),e.orig());return bo.splice(n,t.lNext()),bo.splice(n.sym(),e),n}equalsNonOriented(t){return!!this.equalsOriented(t)||!!this.equalsOriented(t.sym())}toLineSegment(){return new Kt(this._vertex.getCoordinate(),this.dest().getCoordinate())}dest(){return this.sym().orig()}oNext(){return this._next}equalsOriented(t){return!(!this.orig().getCoordinate().equals2D(t.orig().getCoordinate())||!this.dest().getCoordinate().equals2D(t.dest().getCoordinate()))}dNext(){return this.sym().oNext().sym()}lPrev(){return this._next.sym()}rPrev(){return this.sym().oNext()}rot(){return this._rot}oPrev(){return this._rot._next._rot}sym(){return this._rot._rot}setOrig(t){this._vertex=t}lNext(){return this.invRot().oNext().rot()}getLength(){return this.orig().getCoordinate().distance(this.dest().getCoordinate())}invRot(){return this._rot.sym()}setDest(t){this.sym().setOrig(t)}setData(t){this._data=t}getData(){return this._data}delete(){this._rot=null}orig(){return this._vertex}rNext(){return this._rot._next.invRot()}toString(){const t=this._vertex.getCoordinate(),e=this.dest().getCoordinate();return Wt.toLineString(t,e)}isLive(){return null!==this._rot}getPrimary(){return this.orig().getCoordinate().compareTo(this.dest().getCoordinate())<=0?this:this.sym()}dPrev(){return this.invRot().oNext().invRot()}setNext(t){this._next=t}}class Do{constructor(){Do.constructor_.apply(this,arguments)}static constructor_(){this._subdiv=null,this._isUsingTolerance=!1;const t=arguments[0];this._subdiv=t,this._isUsingTolerance=t.getTolerance()>0}insertSite(t){let e=this._subdiv.locate(t);if(this._subdiv.isVertexOfEdge(e,t))return e;this._subdiv.isOnEdge(e,t.getCoordinate())&&(e=e.oPrev(),this._subdiv.delete(e.oNext()));let n=this._subdiv.makeEdge(e.orig(),t);bo.splice(n,e);const s=n;do{n=this._subdiv.connect(e,n.sym()),e=n.oPrev()}while(e.lNext()!==s);for(;;){const i=e.oPrev();if(i.dest().rightOf(e)&&t.isInCircle(e.orig(),i.dest(),e.dest()))bo.swap(e),e=e.oPrev();else{if(e.oNext()===s)return n;e=e.oNext().lPrev()}}}insertSites(t){for(let e=t.iterator();e.hasNext();){const t=e.next();this.insertSite(t)}}}class Ao{locate(t){}}class Fo{constructor(){Fo.constructor_.apply(this,arguments)}static constructor_(){this._subdiv=null,this._lastEdge=null;const t=arguments[0];this._subdiv=t,this.init()}init(){this._lastEdge=this.findEdge()}locate(t){this._lastEdge.isLive()||this.init();const e=this._subdiv.locateFromEdge(t,this._lastEdge);return this._lastEdge=e,e}findEdge(){return this._subdiv.getEdges().iterator().next()}get interfaces_(){return[Ao]}}class Go extends h{constructor(){super(),Go.constructor_.apply(this,arguments)}static constructor_(){if(this._seg=null,1===arguments.length){if("string"==typeof arguments[0]){const t=arguments[0];h.constructor_.call(this,t)}else if(arguments[0]instanceof Kt){const t=arguments[0];h.constructor_.call(this,"Locate failed to converge (at edge: "+t+").  Possible causes include invalid Subdivision topology or very close sites"),this._seg=new Kt(t)}}else if(2===arguments.length){const t=arguments[0],e=arguments[1];h.constructor_.call(this,Go.msgWithSpatial(t,e)),this._seg=new Kt(e)}}static msgWithSpatial(t,e){return null!==e?t+" [ "+e+" ]":t}getSegment(){return this._seg}}class qo{visit(t){}}class Bo{constructor(){Bo.constructor_.apply(this,arguments)}static constructor_(){this._visitedKey=0,this._quadEdges=new L,this._startingEdge=null,this._tolerance=null,this._edgeCoincidenceTolerance=null,this._frameVertex=new Array(3).fill(null),this._frameEnv=null,this._locator=null,this._seg=new Kt,this._triEdges=new Array(3).fill(null);const t=arguments[0],e=arguments[1];this._tolerance=e,this._edgeCoincidenceTolerance=e/Bo.EDGE_COINCIDENCE_TOL_FACTOR,this.createFrame(t),this._startingEdge=this.initSubdiv(),this._locator=new Fo(this)}static getTriangleEdges(t,e){if(e[0]=t,e[1]=e[0].lNext(),e[2]=e[1].lNext(),e[2].lNext()!==e[0])throw new s("Edges do not form a triangle")}getTriangleVertices(t){const e=new zo;return this.visitTriangles(e,t),e.getTriangleVertices()}isFrameVertex(t){return!!t.equals(this._frameVertex[0])||(!!t.equals(this._frameVertex[1])||!!t.equals(this._frameVertex[2]))}isVertexOfEdge(t,e){return!(!e.equals(t.orig(),this._tolerance)&&!e.equals(t.dest(),this._tolerance))}connect(t,e){const n=bo.connect(t,e);return this._quadEdges.add(n),n}getVoronoiCellPolygon(t,e){const n=new L,s=t;do{const e=t.rot().orig().getCoordinate();n.add(e),t=t.oPrev()}while(t!==s);const i=new R;i.addAll(n,!1),i.closeRing(),i.size()<4&&(B.out.println(i),i.add(i.get(i.size()-1),!0));const r=i.toCoordinateArray(),o=e.createPolygon(e.createLinearRing(r)),l=s.orig();return o.setUserData(l.getCoordinate()),o}setLocator(t){this._locator=t}initSubdiv(){const t=this.makeEdge(this._frameVertex[0],this._frameVertex[1]),e=this.makeEdge(this._frameVertex[1],this._frameVertex[2]);bo.splice(t.sym(),e);const n=this.makeEdge(this._frameVertex[2],this._frameVertex[0]);return bo.splice(e.sym(),n),bo.splice(n.sym(),t),t}isFrameBorderEdge(t){const e=new Array(3).fill(null);Bo.getTriangleEdges(t,e);const n=new Array(3).fill(null);Bo.getTriangleEdges(t.sym(),n);const s=t.lNext().dest();if(this.isFrameVertex(s))return!0;const i=t.sym().lNext().dest();return!!this.isFrameVertex(i)}makeEdge(t,e){const n=bo.makeEdge(t,e);return this._quadEdges.add(n),n}visitTriangles(t,e){this._visitedKey++;const n=new en;n.push(this._startingEdge);const s=new xt;for(;!n.empty();){const i=n.pop();if(!s.contains(i)){const r=this.fetchTriangleToVisit(i,n,e,s);null!==r&&t.visit(r)}}}isFrameEdge(t){return!(!this.isFrameVertex(t.orig())&&!this.isFrameVertex(t.dest()))}isOnEdge(t,e){this._seg.setCoordinates(t.orig().getCoordinate(),t.dest().getCoordinate());return this._seg.distance(e)<this._edgeCoincidenceTolerance}getEnvelope(){return new O(this._frameEnv)}createFrame(t){const e=t.getWidth(),n=t.getHeight();let s=0;s=e>n?10*e:10*n,this._frameVertex[0]=new vo((t.getMaxX()+t.getMinX())/2,t.getMaxY()+s),this._frameVertex[1]=new vo(t.getMinX()-s,t.getMinY()-s),this._frameVertex[2]=new vo(t.getMaxX()+s,t.getMinY()-s),this._frameEnv=new O(this._frameVertex[0].getCoordinate(),this._frameVertex[1].getCoordinate()),this._frameEnv.expandToInclude(this._frameVertex[2].getCoordinate())}getTriangleCoordinates(t){const e=new ko;return this.visitTriangles(e,t),e.getTriangles()}getVertices(t){const e=new xt;for(let n=this._quadEdges.iterator();n.hasNext();){const s=n.next(),i=s.orig();!t&&this.isFrameVertex(i)||e.add(i);const r=s.dest();!t&&this.isFrameVertex(r)||e.add(r)}return e}fetchTriangleToVisit(t,e,n,s){let i=t,r=0,o=!1;do{this._triEdges[r]=i,this.isFrameEdge(i)&&(o=!0);const t=i.sym();s.contains(t)||e.push(t),s.add(i),r++,i=i.lNext()}while(i!==t);return o&&!n?null:this._triEdges}getEdges(){if(0===arguments.length)return this._quadEdges;if(1===arguments.length){const t=arguments[0],e=this.getPrimaryEdges(!1),n=new Array(e.size()).fill(null);let s=0;for(let i=e.iterator();i.hasNext();){const e=i.next();n[s++]=t.createLineString([e.orig().getCoordinate(),e.dest().getCoordinate()])}return t.createMultiLineString(n)}}getVertexUniqueEdges(t){const e=new L,n=new xt;for(let s=this._quadEdges.iterator();s.hasNext();){const i=s.next(),r=i.orig();n.contains(r)||(n.add(r),!t&&this.isFrameVertex(r)||e.add(i));const o=i.sym(),l=o.orig();n.contains(l)||(n.add(l),!t&&this.isFrameVertex(l)||e.add(o))}return e}getTriangleEdges(t){const e=new Vo;return this.visitTriangles(e,t),e.getTriangleEdges()}getPrimaryEdges(t){this._visitedKey++;const e=new L,n=new en;n.push(this._startingEdge);const s=new xt;for(;!n.empty();){const i=n.pop();if(!s.contains(i)){const r=i.getPrimary();!t&&this.isFrameEdge(r)||e.add(r),n.push(i.oNext()),n.push(i.sym().oNext()),s.add(i),s.add(i.sym())}}return e}delete(t){bo.splice(t,t.oPrev()),bo.splice(t.sym(),t.sym().oPrev());const e=t.sym(),n=t.rot(),s=t.rot().sym();this._quadEdges.remove(t),this._quadEdges.remove(e),this._quadEdges.remove(n),this._quadEdges.remove(s),t.delete(),e.delete(),n.delete(),s.delete()}locateFromEdge(t,e){let n=0;const s=this._quadEdges.size();let i=e;for(;;){if(n++,n>s)throw new Go(i.toLineSegment());if(t.equals(i.orig())||t.equals(i.dest()))break;if(t.rightOf(i))i=i.sym();else if(t.rightOf(i.oNext())){if(t.rightOf(i.dPrev()))break;i=i.dPrev()}else i=i.oNext()}return i}getTolerance(){return this._tolerance}getVoronoiCellPolygons(t){this.visitTriangles(new Yo,!0);const e=new L;for(let n=this.getVertexUniqueEdges(!1).iterator();n.hasNext();){const s=n.next();e.add(this.getVoronoiCellPolygon(s,t))}return e}getVoronoiDiagram(t){const e=this.getVoronoiCellPolygons(t);return t.createGeometryCollection(Ct.toGeometryArray(e))}getTriangles(t){const e=this.getTriangleCoordinates(!1),n=new Array(e.size()).fill(null);let s=0;for(let i=e.iterator();i.hasNext();){const e=i.next();n[s++]=t.createPolygon(t.createLinearRing(e))}return t.createGeometryCollection(n)}insertSite(t){let e=this.locate(t);if(t.equals(e.orig(),this._tolerance)||t.equals(e.dest(),this._tolerance))return e;let n=this.makeEdge(e.orig(),t);bo.splice(n,e);const s=n;do{n=this.connect(e,n.sym()),e=n.oPrev()}while(e.lNext()!==s);return s}locate(){if(1===arguments.length){if(arguments[0]instanceof vo){const t=arguments[0];return this._locator.locate(t)}if(arguments[0]instanceof m){const t=arguments[0];return this._locator.locate(new vo(t))}}else if(2===arguments.length){const t=arguments[0],e=arguments[1],n=this._locator.locate(new vo(t));if(null===n)return null;let s=n;n.dest().getCoordinate().equals2D(t)&&(s=n.sym());let i=s;do{if(i.dest().getCoordinate().equals2D(e))return i;i=i.oNext()}while(i!==s);return null}}}class Yo{visit(t){const e=t[0].orig().getCoordinate(),n=t[1].orig().getCoordinate(),s=t[2].orig().getCoordinate(),i=ne.circumcentreDD(e,n,s),r=new vo(i);for(let e=0;e<3;e++)t[e].rot().setOrig(r)}get interfaces_(){return[qo]}}class Vo{constructor(){Vo.constructor_.apply(this,arguments)}static constructor_(){this._triList=new L}getTriangleEdges(){return this._triList}visit(t){this._triList.add(t)}get interfaces_(){return[qo]}}class zo{constructor(){zo.constructor_.apply(this,arguments)}static constructor_(){this._triList=new L}visit(t){this._triList.add([t[0].orig(),t[1].orig(),t[2].orig()])}getTriangleVertices(){return this._triList}get interfaces_(){return[qo]}}class ko{constructor(){ko.constructor_.apply(this,arguments)}static constructor_(){this._coordList=new R,this._triCoords=new L}checkTriangleSize(t){let e="";t.length>=2?e=Wt.toLineString(t[0],t[1]):t.length>=1&&(e=Wt.toPoint(t[0]))}visit(t){this._coordList.clear();for(let e=0;e<3;e++){const n=t[e].orig();this._coordList.add(n.getCoordinate())}if(this._coordList.size()>0){this._coordList.closeRing();const t=this._coordList.toCoordinateArray();if(4!==t.length)return null;this._triCoords.add(t)}}getTriangles(){return this._triCoords}get interfaces_(){return[qo]}}Bo.TriangleCircumcentreVisitor=Yo,Bo.TriangleEdgesListVisitor=Vo,Bo.TriangleVertexListVisitor=zo,Bo.TriangleCoordinatesVisitor=ko,Bo.EDGE_COINCIDENCE_TOL_FACTOR=1e3;class Xo{constructor(){Xo.constructor_.apply(this,arguments)}static constructor_(){if(this._ls=null,this._data=null,2===arguments.length){const t=arguments[0],e=arguments[1];this._ls=new Kt(t,e)}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];this._ls=new Kt(t,e),this._data=n}else if(6===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3],i=arguments[4],r=arguments[5];Xo.constructor_.call(this,new m(t,e,n),new m(s,i,r))}else if(7===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3],i=arguments[4],r=arguments[5],o=arguments[6];Xo.constructor_.call(this,new m(t,e,n),new m(s,i,r),o)}}getLineSegment(){return this._ls}getEndZ(){return this._ls.getCoordinate(1).getZ()}getStartZ(){return this._ls.getCoordinate(0).getZ()}intersection(t){return this._ls.intersection(t.getLineSegment())}getStart(){return this._ls.getCoordinate(0)}getEnd(){return this._ls.getCoordinate(1)}getEndY(){return this._ls.getCoordinate(1).y}getStartX(){return this._ls.getCoordinate(0).x}equalsTopo(t){return this._ls.equalsTopo(t.getLineSegment())}getStartY(){return this._ls.getCoordinate(0).y}setData(t){this._data=t}getData(){return this._data}getEndX(){return this._ls.getCoordinate(1).x}toString(){return this._ls.toString()}}class Uo extends h{constructor(){super(),Uo.constructor_.apply(this,arguments)}static constructor_(){if(this._pt=null,1===arguments.length){const t=arguments[0];h.constructor_.call(this,t)}else if(2===arguments.length){const t=arguments[0],e=arguments[1];h.constructor_.call(this,Uo.msgWithCoord(t,e)),this._pt=new m(e)}}static msgWithCoord(t,e){return null!==e?t+" [ "+Wt.toPoint(e)+" ]":t}getCoordinate(){return this._pt}}class Ho{constructor(){Ho.constructor_.apply(this,arguments)}static constructor_(){this._initialVertices=null,this._segVertices=null,this._segments=new L,this._subdiv=null,this._incDel=null,this._convexHull=null,this._splitFinder=new Po,this._kdt=null,this._vertexFactory=null,this._computeAreaEnv=null,this._splitPt=null,this._tolerance=null;const t=arguments[0],e=arguments[1];this._initialVertices=new L(t),this._tolerance=e,this._kdt=new us(e)}static computeVertexEnvelope(t){const e=new O;for(let n=t.iterator();n.hasNext();){const t=n.next();e.expandToInclude(t.getCoordinate())}return e}getInitialVertices(){return this._initialVertices}getKDT(){return this._kdt}enforceConstraints(){this.addConstraintVertices();let t=0,e=0;do{e=this.enforceGabriel(this._segments),t++}while(e>0&&t<Ho.MAX_SPLIT_ITER);if(t===Ho.MAX_SPLIT_ITER)throw new Uo("Too many splitting iterations while enforcing constraints.  Last split point was at: ",this._splitPt)}insertSites(t){for(let e=t.iterator();e.hasNext();){const t=e.next();this.insertSite(t)}}getVertexFactory(){return this._vertexFactory}getPointArray(){const t=new Array(this._initialVertices.size()+this._segVertices.size()).fill(null);let e=0;for(let n=this._initialVertices.iterator();n.hasNext();){const s=n.next();t[e++]=s.getCoordinate()}for(let n=this._segVertices.iterator();n.hasNext();){const s=n.next();t[e++]=s.getCoordinate()}return t}setConstraints(t,e){this._segments=t,this._segVertices=e}computeConvexHull(){const t=new Ct,e=this.getPointArray(),n=new sn(e,t);this._convexHull=n.getConvexHull()}addConstraintVertices(){this.computeConvexHull(),this.insertSites(this._segVertices)}findNonGabrielPoint(t){const e=t.getStart(),n=t.getEnd(),s=new m((e.x+n.x)/2,(e.y+n.y)/2),i=e.distance(s),o=new O(s);o.expandBy(i);const l=this._kdt.query(o);let a=null,c=r.MAX_VALUE;for(let t=l.iterator();t.hasNext();){const r=t.next().getCoordinate();if(r.equals2D(e)||r.equals2D(n))continue;const o=s.distance(r);if(o<i){const t=o;(null===a||t<c)&&(a=r,c=t)}}return a}getConstraintSegments(){return this._segments}setSplitPointFinder(t){this._splitFinder=t}getConvexHull(){return this._convexHull}getTolerance(){return this._tolerance}enforceGabriel(t){const e=new L;let n=0;const s=new L;for(let i=t.iterator();i.hasNext();){const t=i.next(),r=this.findNonGabrielPoint(t);if(null===r)continue;this._splitPt=this._splitFinder.findSplitPoint(t,r);const o=this.createVertex(this._splitPt,t);this.insertSite(o).getCoordinate().equals2D(this._splitPt);const l=new Xo(t.getStartX(),t.getStartY(),t.getStartZ(),o.getX(),o.getY(),o.getZ(),t.getData()),a=new Xo(o.getX(),o.getY(),o.getZ(),t.getEndX(),t.getEndY(),t.getEndZ(),t.getData());e.add(l),e.add(a),s.add(t),n+=1}return t.removeAll(s),t.addAll(e),n}createVertex(){if(1===arguments.length){const t=arguments[0];let e=null;return e=null!==this._vertexFactory?this._vertexFactory.createVertex(t,null):new Mo(t),e}if(2===arguments.length){const t=arguments[0],e=arguments[1];let n=null;return n=null!==this._vertexFactory?this._vertexFactory.createVertex(t,e):new Mo(t),n.setOnConstraint(!0),n}}getSubdivision(){return this._subdiv}computeBoundingBox(){const t=Ho.computeVertexEnvelope(this._initialVertices),e=Ho.computeVertexEnvelope(this._segVertices),n=new O(t);n.expandToInclude(e);const s=.2*n.getWidth(),i=.2*n.getHeight(),r=Math.max(s,i);this._computeAreaEnv=new O(n),this._computeAreaEnv.expandBy(r)}setVertexFactory(t){this._vertexFactory=t}formInitialDelaunay(){this.computeBoundingBox(),this._subdiv=new Bo(this._computeAreaEnv,this._tolerance),this._subdiv.setLocator(new Fo(this._subdiv)),this._incDel=new Do(this._subdiv),this.insertSites(this._initialVertices)}insertSite(){if(arguments[0]instanceof Mo){const t=arguments[0],e=this._kdt.insert(t.getCoordinate(),t);if(e.isRepeated()){const n=e.getData();return n.merge(t),n}return this._incDel.insertSite(t),t}if(arguments[0]instanceof m){const t=arguments[0];this.insertSite(this.createVertex(t))}}}Ho.MAX_SPLIT_ITER=99;class Wo{constructor(){Wo.constructor_.apply(this,arguments)}static constructor_(){this._siteCoords=null,this._tolerance=0,this._subdiv=null}static extractUniqueCoordinates(t){if(null===t)return new R;const e=t.getCoordinates();return Wo.unique(e)}static envelope(t){const e=new O;for(let n=t.iterator();n.hasNext();){const t=n.next();e.expandToInclude(t)}return e}static unique(t){const e=dt.copyDeep(t);nt.sort(e);return new R(e,!1)}static toVertices(t){const e=new L;for(let n=t.iterator();n.hasNext();){const t=n.next();e.add(new vo(t))}return e}create(){if(null!==this._subdiv)return null;const t=Wo.envelope(this._siteCoords),e=Wo.toVertices(this._siteCoords);this._subdiv=new Bo(t,this._tolerance);new Do(this._subdiv).insertSites(e)}setTolerance(t){this._tolerance=t}setSites(){if(arguments[0]instanceof X){const t=arguments[0];this._siteCoords=Wo.extractUniqueCoordinates(t)}else if(I(arguments[0],N)){const t=arguments[0];this._siteCoords=Wo.unique(dt.toCoordinateArray(t))}}getEdges(t){return this.create(),this._subdiv.getEdges(t)}getSubdivision(){return this.create(),this._subdiv}getTriangles(t){return this.create(),this._subdiv.getTriangles(t)}}class Zo{constructor(){Zo.constructor_.apply(this,arguments)}static constructor_(){this._siteCoords=null,this._constraintLines=null,this._tolerance=0,this._subdiv=null,this._constraintVertexMap=new Hn}static createConstraintSegments(){if(1===arguments.length){const t=arguments[0],e=ye.getLines(t),n=new L;for(let t=e.iterator();t.hasNext();){const e=t.next();Zo.createConstraintSegments(e,n)}return n}if(2===arguments.length){const t=arguments[1],e=arguments[0].getCoordinates();for(let n=1;n<e.length;n++)t.add(new Xo(e[n-1],e[n]))}}createSiteVertices(t){const e=new L;for(let n=t.iterator();n.hasNext();){const t=n.next();this._constraintVertexMap.containsKey(t)||e.add(new Mo(t))}return e}create(){if(null!==this._subdiv)return null;const t=Wo.envelope(this._siteCoords);let e=new L;null!==this._constraintLines&&(t.expandToInclude(this._constraintLines.getEnvelopeInternal()),this.createVertices(this._constraintLines),e=Zo.createConstraintSegments(this._constraintLines));const n=this.createSiteVertices(this._siteCoords),s=new Ho(n,this._tolerance);s.setConstraints(e,new L(this._constraintVertexMap.values())),s.formInitialDelaunay(),s.enforceConstraints(),this._subdiv=s.getSubdivision()}setTolerance(t){this._tolerance=t}setConstraints(t){this._constraintLines=t}setSites(t){this._siteCoords=Wo.extractUniqueCoordinates(t)}getEdges(t){return this.create(),this._subdiv.getEdges(t)}getSubdivision(){return this.create(),this._subdiv}getTriangles(t){return this.create(),this._subdiv.getTriangles(t)}createVertices(t){const e=t.getCoordinates();for(let t=0;t<e.length;t++){const n=new Mo(e[t]);this._constraintVertexMap.put(e[t],n)}}}class jo{constructor(){jo.constructor_.apply(this,arguments)}static constructor_(){this._siteCoords=null,this._tolerance=0,this._subdiv=null,this._clipEnv=null,this._diagramEnv=null}static clipGeometryCollection(t,e){const n=t.getFactory().toGeometry(e),s=new L;for(let i=0;i<t.getNumGeometries();i++){const r=t.getGeometryN(i);let o=null;e.contains(r.getEnvelopeInternal())?o=r:e.intersects(r.getEnvelopeInternal())&&(o=Nr.intersection(n,r),o.setUserData(r.getUserData())),null===o||o.isEmpty()||s.add(o)}return t.getFactory().createGeometryCollection(Ct.toGeometryArray(s))}create(){if(null!==this._subdiv)return null;const t=Wo.envelope(this._siteCoords);if(this._diagramEnv=this._clipEnv,null===this._diagramEnv){this._diagramEnv=t;const e=this._diagramEnv.getDiameter();this._diagramEnv.expandBy(e)}const e=Wo.toVertices(this._siteCoords);this._subdiv=new Bo(t,this._tolerance);new Do(this._subdiv).insertSites(e)}getDiagram(t){this.create();const e=this._subdiv.getVoronoiDiagram(t);return jo.clipGeometryCollection(e,this._diagramEnv)}setTolerance(t){this._tolerance=t}setSites(){if(arguments[0]instanceof X){const t=arguments[0];this._siteCoords=Wo.extractUniqueCoordinates(t)}else if(I(arguments[0],N)){const t=arguments[0];this._siteCoords=Wo.unique(dt.toCoordinateArray(t))}}setClipEnvelope(t){this._clipEnv=t}getSubdivision(){return this.create(),this._subdiv}}var Ko=Object.freeze({__proto__:null,Vertex:vo}),Qo=Object.freeze({__proto__:null,ConformingDelaunayTriangulationBuilder:Zo,DelaunayTriangulationBuilder:Wo,VoronoiDiagramBuilder:jo,quadedge:Ko});class Jo{constructor(){Jo.constructor_.apply(this,arguments)}static constructor_(){if(this._linearGeom=null,this._numLines=null,this._currentLine=null,this._componentIndex=0,this._vertexIndex=0,1===arguments.length){const t=arguments[0];Jo.constructor_.call(this,t,0,0)}else if(2===arguments.length){const t=arguments[0],e=arguments[1];Jo.constructor_.call(this,t,e.getComponentIndex(),Jo.segmentEndVertexIndex(e))}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];if(!I(t,W))throw new s("Lineal geometry is required");this._linearGeom=t,this._numLines=t.getNumGeometries(),this._componentIndex=e,this._vertexIndex=n,this.loadCurrentLine()}}static segmentEndVertexIndex(t){return t.getSegmentFraction()>0?t.getSegmentIndex()+1:t.getSegmentIndex()}getComponentIndex(){return this._componentIndex}getLine(){return this._currentLine}getVertexIndex(){return this._vertexIndex}getSegmentEnd(){return this._vertexIndex<this.getLine().getNumPoints()-1?this._currentLine.getCoordinateN(this._vertexIndex+1):null}next(){if(!this.hasNext())return null;this._vertexIndex++,this._vertexIndex>=this._currentLine.getNumPoints()&&(this._componentIndex++,this.loadCurrentLine(),this._vertexIndex=0)}loadCurrentLine(){if(this._componentIndex>=this._numLines)return this._currentLine=null,null;this._currentLine=this._linearGeom.getGeometryN(this._componentIndex)}getSegmentStart(){return this._currentLine.getCoordinateN(this._vertexIndex)}isEndOfLine(){return!(this._componentIndex>=this._numLines)&&!(this._vertexIndex<this._currentLine.getNumPoints()-1)}hasNext(){return!(this._componentIndex>=this._numLines)&&!(this._componentIndex===this._numLines-1&&this._vertexIndex>=this._currentLine.getNumPoints())}}class $o{constructor(){$o.constructor_.apply(this,arguments)}static constructor_(){this._linearGeom=null;const t=arguments[0];this._linearGeom=t}static indexOf(t,e){return new $o(t).indexOf(e)}static indexOfAfter(t,e,n){return new $o(t).indexOfAfter(e,n)}indexOf(t){return this.indexOfFromStart(t,-1)}indexOfFromStart(t,e){let n=r.MAX_VALUE,s=e,i=0;const o=new Kt,l=new Jo(this._linearGeom);for(;l.hasNext();){if(!l.isEndOfLine()){o.p0=l.getSegmentStart(),o.p1=l.getSegmentEnd();const r=o.distance(t),a=this.segmentNearestMeasure(o,t,i);r<n&&a>e&&(s=a,n=r),i+=o.getLength()}l.next()}return s}indexOfAfter(t,e){if(e<0)return this.indexOf(t);const n=this._linearGeom.getLength();if(n<e)return n;const s=this.indexOfFromStart(t,e);return g.isTrue(s>=e,"computed index is before specified minimum index"),s}segmentNearestMeasure(t,e,n){const s=t.projectionFactor(e);return s<=0?n:s<=1?n+s*t.getLength():n+t.getLength()}}class tl{constructor(){tl.constructor_.apply(this,arguments)}static constructor_(){if(this._componentIndex=0,this._segmentIndex=0,this._segmentFraction=0,0===arguments.length);else if(1===arguments.length){const t=arguments[0];this._componentIndex=t._componentIndex,this._segmentIndex=t._segmentIndex,this._segmentFraction=t._segmentFraction}else if(2===arguments.length){const t=arguments[0],e=arguments[1];tl.constructor_.call(this,0,t,e)}else if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];this._componentIndex=t,this._segmentIndex=e,this._segmentFraction=n,this.normalize()}else if(4===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2],s=arguments[3];this._componentIndex=t,this._segmentIndex=e,this._segmentFraction=n,s&&this.normalize()}}static getEndLocation(t){const e=new tl;return e.setToEnd(t),e}static pointAlongSegmentByFraction(t,e,n){if(n<=0)return t;if(n>=1)return e;const s=(e.x-t.x)*n+t.x,i=(e.y-t.y)*n+t.y,r=(e.getZ()-t.getZ())*n+t.getZ();return new m(s,i,r)}static compareLocationValues(t,e,n,s,i,r){return t<s?-1:t>s?1:e<i?-1:e>i?1:n<r?-1:n>r?1:0}static numSegments(t){const e=t.getNumPoints();return e<=1?0:e-1}getSegmentIndex(){return this._segmentIndex}getComponentIndex(){return this._componentIndex}isEndpoint(t){const e=t.getGeometryN(this._componentIndex),n=tl.numSegments(e);return this._segmentIndex>=n||this._segmentIndex===n-1&&this._segmentFraction>=1}isValid(t){if(this._componentIndex<0||this._componentIndex>=t.getNumGeometries())return!1;const e=t.getGeometryN(this._componentIndex);return!(this._segmentIndex<0||this._segmentIndex>e.getNumPoints())&&((this._segmentIndex!==e.getNumPoints()||0===this._segmentFraction)&&!(this._segmentFraction<0||this._segmentFraction>1))}normalize(){this._segmentFraction<0&&(this._segmentFraction=0),this._segmentFraction>1&&(this._segmentFraction=1),this._componentIndex<0&&(this._componentIndex=0,this._segmentIndex=0,this._segmentFraction=0),this._segmentIndex<0&&(this._segmentIndex=0,this._segmentFraction=0),1===this._segmentFraction&&(this._segmentFraction=0,this._segmentIndex+=1)}toLowest(t){const e=t.getGeometryN(this._componentIndex),n=tl.numSegments(e);return this._segmentIndex<n?this:new tl(this._componentIndex,n-1,1,!1)}getCoordinate(t){const e=t.getGeometryN(this._componentIndex),n=e.getCoordinateN(this._segmentIndex);if(this._segmentIndex>=tl.numSegments(e))return n;const s=e.getCoordinateN(this._segmentIndex+1);return tl.pointAlongSegmentByFraction(n,s,this._segmentFraction)}getSegmentFraction(){return this._segmentFraction}getSegment(t){const e=t.getGeometryN(this._componentIndex),n=e.getCoordinateN(this._segmentIndex);if(this._segmentIndex>=tl.numSegments(e)){const t=e.getCoordinateN(e.getNumPoints()-2);return new Kt(t,n)}const s=e.getCoordinateN(this._segmentIndex+1);return new Kt(n,s)}clamp(t){if(this._componentIndex>=t.getNumGeometries())return this.setToEnd(t),null;if(this._segmentIndex>=t.getNumPoints()){const e=t.getGeometryN(this._componentIndex);this._segmentIndex=tl.numSegments(e),this._segmentFraction=1}}setToEnd(t){this._componentIndex=t.getNumGeometries()-1;const e=t.getGeometryN(this._componentIndex);this._segmentIndex=tl.numSegments(e),this._segmentFraction=0}compareTo(t){const e=t;return this._componentIndex<e._componentIndex?-1:this._componentIndex>e._componentIndex?1:this._segmentIndex<e._segmentIndex?-1:this._segmentIndex>e._segmentIndex?1:this._segmentFraction<e._segmentFraction?-1:this._segmentFraction>e._segmentFraction?1:0}copy(){return new tl(this._componentIndex,this._segmentIndex,this._segmentFraction)}toString(){return"LinearLoc["+this._componentIndex+", "+this._segmentIndex+", "+this._segmentFraction+"]"}isOnSameSegment(t){return this._componentIndex===t._componentIndex&&(this._segmentIndex===t._segmentIndex||(t._segmentIndex-this._segmentIndex==1&&0===t._segmentFraction||this._segmentIndex-t._segmentIndex==1&&0===this._segmentFraction))}snapToVertex(t,e){if(this._segmentFraction<=0||this._segmentFraction>=1)return null;const n=this.getSegmentLength(t),s=this._segmentFraction*n,i=n-s;s<=i&&s<e?this._segmentFraction=0:i<=s&&i<e&&(this._segmentFraction=1)}compareLocationValues(t,e,n){return this._componentIndex<t?-1:this._componentIndex>t?1:this._segmentIndex<e?-1:this._segmentIndex>e?1:this._segmentFraction<n?-1:this._segmentFraction>n?1:0}getSegmentLength(t){const e=t.getGeometryN(this._componentIndex);let n=this._segmentIndex;this._segmentIndex>=tl.numSegments(e)&&(n=e.getNumPoints()-2);const s=e.getCoordinateN(n),i=e.getCoordinateN(n+1);return s.distance(i)}isVertex(){return this._segmentFraction<=0||this._segmentFraction>=1}get interfaces_(){return[o]}}class el{constructor(){el.constructor_.apply(this,arguments)}static constructor_(){this._linearGeom=null;const t=arguments[0];this._linearGeom=t}static indexOf(t,e){return new el(t).indexOf(e)}static indexOfAfter(t,e,n){return new el(t).indexOfAfter(e,n)}indexOf(t){return this.indexOfFromStart(t,null)}indexOfFromStart(t,e){let n=r.MAX_VALUE,s=0,i=0,o=-1;const l=new Kt;for(let r=new Jo(this._linearGeom);r.hasNext();r.next())if(!r.isEndOfLine()){l.p0=r.getSegmentStart(),l.p1=r.getSegmentEnd();const a=l.distance(t),c=l.segmentFraction(t),h=r.getComponentIndex(),u=r.getVertexIndex();a<n&&(null===e||e.compareLocationValues(h,u,c)<0)&&(s=h,i=u,o=c,n=a)}if(n===r.MAX_VALUE)return new tl(e);return new tl(s,i,o)}indexOfAfter(t,e){if(null===e)return this.indexOf(t);const n=tl.getEndLocation(this._linearGeom);if(n.compareTo(e)<=0)return n;const s=this.indexOfFromStart(t,e);return g.isTrue(s.compareTo(e)>=0,"computed location is before specified minimum location"),s}}class nl{constructor(){nl.constructor_.apply(this,arguments)}static constructor_(){this._linearGeom=null;const t=arguments[0];this._linearGeom=t}static indicesOf(t,e){return new nl(t).indicesOf(e)}indicesOf(t){const e=t.getGeometryN(0).getCoordinateN(0),n=t.getGeometryN(t.getNumGeometries()-1),s=n.getCoordinateN(n.getNumPoints()-1),i=new el(this._linearGeom),r=new Array(2).fill(null);return r[0]=i.indexOf(e),0===t.getLength()?r[1]=r[0].copy():r[1]=i.indexOfAfter(s,r[0]),r}}class sl{constructor(){sl.constructor_.apply(this,arguments)}static constructor_(){this._linearGeom=null;const t=arguments[0];this._linearGeom=t}static getLength(t,e){return new sl(t).getLength(e)}static getLocation(){if(2===arguments.length){const t=arguments[1];return new sl(arguments[0]).getLocation(t)}if(3===arguments.length){const t=arguments[1],e=arguments[2];return new sl(arguments[0]).getLocation(t,e)}}getLength(t){let e=0;const n=new Jo(this._linearGeom);for(;n.hasNext();){if(!n.isEndOfLine()){const s=n.getSegmentStart(),i=n.getSegmentEnd().distance(s);if(t.getComponentIndex()===n.getComponentIndex()&&t.getSegmentIndex()===n.getVertexIndex())return e+i*t.getSegmentFraction();e+=i}n.next()}return e}resolveHigher(t){if(!t.isEndpoint(this._linearGeom))return t;let e=t.getComponentIndex();if(e>=this._linearGeom.getNumGeometries()-1)return t;do{e++}while(e<this._linearGeom.getNumGeometries()-1&&0===this._linearGeom.getGeometryN(e).getLength());return new tl(e,0,0)}getLocation(){if(1===arguments.length){const t=arguments[0];return this.getLocation(t,!0)}if(2===arguments.length){const t=arguments[0],e=arguments[1];let n=t;if(t<0){n=this._linearGeom.getLength()+t}const s=this.getLocationForward(n);return e?s:this.resolveHigher(s)}}getLocationForward(t){if(t<=0)return new tl;let e=0;const n=new Jo(this._linearGeom);for(;n.hasNext();){if(n.isEndOfLine()){if(e===t){const t=n.getComponentIndex(),e=n.getVertexIndex();return new tl(t,e,0)}}else{const s=n.getSegmentStart(),i=n.getSegmentEnd().distance(s);if(e+i>t){const s=(t-e)/i,r=n.getComponentIndex(),o=n.getVertexIndex();return new tl(r,o,s)}e+=i}n.next()}return tl.getEndLocation(this._linearGeom)}}class il{constructor(){il.constructor_.apply(this,arguments)}static constructor_(){this._geomFact=null,this._lines=new L,this._coordList=null,this._ignoreInvalidLines=!1,this._fixInvalidLines=!1,this._lastPt=null;const t=arguments[0];this._geomFact=t}getGeometry(){return this.endLine(),this._geomFact.buildGeometry(this._lines)}getLastCoordinate(){return this._lastPt}endLine(){if(null===this._coordList)return null;if(this._ignoreInvalidLines&&this._coordList.size()<2)return this._coordList=null,null;const t=this._coordList.toCoordinateArray();let e=t;this._fixInvalidLines&&(e=this.validCoordinateSequence(t)),this._coordList=null;let n=null;try{n=this._geomFact.createLineString(e)}catch(t){if(!(t instanceof s))throw t;if(!this._ignoreInvalidLines)throw t}null!==n&&this._lines.add(n)}setFixInvalidLines(t){this._fixInvalidLines=t}add(){if(1===arguments.length){const t=arguments[0];this.add(t,!0)}else if(2===arguments.length){const t=arguments[0],e=arguments[1];null===this._coordList&&(this._coordList=new R),this._coordList.add(t,e),this._lastPt=t}}setIgnoreInvalidLines(t){this._ignoreInvalidLines=t}validCoordinateSequence(t){if(t.length>=2)return t;return[t[0],t[0]]}}class rl{constructor(){rl.constructor_.apply(this,arguments)}static constructor_(){this._line=null;const t=arguments[0];this._line=t}static extract(t,e,n){return new rl(t).extract(e,n)}computeLinear(t,e){const n=new il(this._line.getFactory());n.setFixInvalidLines(!0),t.isVertex()||n.add(t.getCoordinate(this._line));for(let s=new Jo(this._line,t);s.hasNext()&&!(e.compareLocationValues(s.getComponentIndex(),s.getVertexIndex(),0)<0);s.next()){const t=s.getSegmentStart();n.add(t),s.isEndOfLine()&&n.endLine()}return e.isVertex()||n.add(e.getCoordinate(this._line)),n.getGeometry()}computeLine(t,e){const n=this._line.getCoordinates(),s=new R;let i=t.getSegmentIndex();t.getSegmentFraction()>0&&(i+=1);let r=e.getSegmentIndex();1===e.getSegmentFraction()&&(r+=1),r>=n.length&&(r=n.length-1),t.isVertex()||s.add(t.getCoordinate(this._line));for(let t=i;t<=r;t++)s.add(n[t]);e.isVertex()||s.add(e.getCoordinate(this._line)),s.size()<=0&&s.add(t.getCoordinate(this._line));let o=s.toCoordinateArray();return o.length<=1&&(o=[o[0],o[0]]),this._line.getFactory().createLineString(o)}extract(t,e){return e.compareTo(t)<0?this.reverse(this.computeLinear(e,t)):this.computeLinear(t,e)}reverse(t){return I(t,W)?t.reverse():(g.shouldNeverReachHere("non-linear geometry encountered"),null)}}class ll{constructor(){ll.constructor_.apply(this,arguments)}static constructor_(){this._linearGeom=null;const t=arguments[0];this._linearGeom=t}clampIndex(t){const e=this.positiveIndex(t),n=this.getStartIndex();if(e<n)return n;const s=this.getEndIndex();return e>s?s:e}locationOf(){if(1===arguments.length){const t=arguments[0];return sl.getLocation(this._linearGeom,t)}if(2===arguments.length){const t=arguments[0],e=arguments[1];return sl.getLocation(this._linearGeom,t,e)}}project(t){return $o.indexOf(this._linearGeom,t)}positiveIndex(t){return t>=0?t:this._linearGeom.getLength()+t}extractPoint(){if(1===arguments.length){const t=arguments[0];return sl.getLocation(this._linearGeom,t).getCoordinate(this._linearGeom)}if(2===arguments.length){const t=arguments[0],e=arguments[1],n=sl.getLocation(this._linearGeom,t).toLowest(this._linearGeom);return n.getSegment(this._linearGeom).pointAlongOffset(n.getSegmentFraction(),e)}}isValidIndex(t){return t>=this.getStartIndex()&&t<=this.getEndIndex()}getEndIndex(){return this._linearGeom.getLength()}getStartIndex(){return 0}indexOfAfter(t,e){return $o.indexOfAfter(this._linearGeom,t,e)}extractLine(t,e){const n=this.clampIndex(t),s=this.clampIndex(e),i=n===s,r=this.locationOf(n,i),o=this.locationOf(s);return rl.extract(this._linearGeom,r,o)}indexOf(t){return $o.indexOf(this._linearGeom,t)}indicesOf(t){const e=nl.indicesOf(this._linearGeom,t);return[sl.getLength(this._linearGeom,e[0]),sl.getLength(this._linearGeom,e[1])]}}class al{constructor(){al.constructor_.apply(this,arguments)}static constructor_(){this._linearGeom=null;const t=arguments[0];this._linearGeom=t,this.checkGeometryType()}clampIndex(t){const e=t.copy();return e.clamp(this._linearGeom),e}project(t){return el.indexOf(this._linearGeom,t)}checkGeometryType(){if(!(this._linearGeom instanceof J||this._linearGeom instanceof wt))throw new s("Input geometry must be linear")}extractPoint(){if(1===arguments.length){return arguments[0].getCoordinate(this._linearGeom)}if(2===arguments.length){const t=arguments[1],e=arguments[0].toLowest(this._linearGeom);return e.getSegment(this._linearGeom).pointAlongOffset(e.getSegmentFraction(),t)}}isValidIndex(t){return t.isValid(this._linearGeom)}getEndIndex(){return tl.getEndLocation(this._linearGeom)}getStartIndex(){return new tl}indexOfAfter(t,e){return el.indexOfAfter(this._linearGeom,t,e)}extractLine(t,e){return rl.extract(this._linearGeom,t,e)}indexOf(t){return el.indexOf(this._linearGeom,t)}indicesOf(t){return nl.indicesOf(this._linearGeom,t)}}var cl=Object.freeze({__proto__:null,LengthIndexedLine:ll,LengthLocationMap:sl,LinearGeometryBuilder:il,LinearIterator:Jo,LinearLocation:tl,LocationIndexedLine:al});class hl{static transform(t,e){const n=new L;for(let s=t.iterator();s.hasNext();)n.add(e.execute(s.next()));return n}static select(t,e){const n=new L;for(let s=t.iterator();s.hasNext();){const t=s.next();Boolean.TRUE.equals(e.execute(t))&&n.add(t)}return n}static apply(t,e){for(let n=t.iterator();n.hasNext();)e.execute(n.next())}}hl.Function=function(){};class ul{constructor(){ul.constructor_.apply(this,arguments)}static constructor_(){this.pts=null,this.n=0;const t=arguments[0];this.pts=new Array(t).fill(null)}filter(t){this.pts[this.n++]=t}getCoordinates(){return this.pts}get interfaces_(){return[U]}}class gl{constructor(){gl.constructor_.apply(this,arguments)}static constructor_(){this._n=0}filter(t){this._n++}getCount(){return this._n}get interfaces_(){return[U]}}class dl{constructor(){dl.constructor_.apply(this,arguments)}static constructor_(){this._counts=new It}count(t){const e=this._counts.get(t);return null===e?0:e.count()}add(t){const e=this._counts.get(t);null===e?this._counts.put(t,new _l(1)):e.increment()}}class _l{constructor(){_l.constructor_.apply(this,arguments)}static constructor_(){if(this.count=0,0===arguments.length);else if(1===arguments.length){const t=arguments[0];this.count=t}}count(){return this.count}increment(){this.count++}}function pl(){}function ml(){}function fl(){}dl.Counter=_l;class yl extends n{}function xl(){}class El{static chars(t,e){const n=new Array(e).fill(null);for(let s=0;s<e;s++)n[s]=t;return new String(n)}static getStackTrace(){if(1===arguments.length){const t=arguments[0],e=new fl,n=new pl(e);return t.printStackTrace(n),e.toString()}if(2===arguments.length){const t=arguments[0],e=arguments[1];let n="";const s=new xl(new ml(El.getStackTrace(t)));for(let t=0;t<e;t++)try{n+=s.readLine()+El.NEWLINE}catch(t){if(!(t instanceof yl))throw t;g.shouldNeverReachHere()}return n}}static spaces(t){return El.chars(" ",t)}static split(t,e){const n=e.length,s=new L;let i=""+t,r=i.indexOf(e);for(;r>=0;){const t=i.substring(0,r);s.add(t),i=i.substring(r+n),r=i.indexOf(e)}i.length>0&&s.add(i);const o=new Array(s.size()).fill(null);for(let t=0;t<o.length;t++)o[t]=s.get(t);return o}}El.NEWLINE=B.getProperty("line.separator");var Il=Object.freeze({__proto__:null,CollectionUtil:hl,CoordinateArrayFilter:ul,CoordinateCountFilter:gl,GeometricShapeFactory:Se,NumberUtil:e,ObjectCounter:dl,PriorityQueue:Cs,StringUtil:El,UniqueCoordinateArrayFilter:nn});class Nl{get interfaces_(){return[]}getClass(){return Nl}static union(t,e){if(t.isEmpty()||e.isEmpty()){if(t.isEmpty()&&e.isEmpty())return Nr.createEmptyResult(Nr.UNION,t,e,t.getFactory());if(t.isEmpty())return e.copy();if(e.isEmpty())return t.copy()}return t.checkNotGeometryCollection(t),t.checkNotGeometryCollection(e),Er.overlayOp(t,e,Nr.UNION)}}J.prototype.getBoundary=function(){return si.getBoundary(this)},wt.prototype.getBoundary=function(){return si.getBoundary(this)},X.prototype.equalsTopo=function(t){return Kr.equalsTopo(this,t)},X.prototype.equals=function(t){return null!==t&&Kr.equalsTopo(this,t)},X.prototype.union=function(){if(0===arguments.length)return no.union(this);if(1===arguments.length){const t=arguments[0];return Nl.union(this,t)}},X.prototype.isValid=function(){return Fr.isValid(this)},X.prototype.intersection=function(t){return Nr.intersection(this,t)},X.prototype.covers=function(t){return Kr.covers(this,t)},X.prototype.coveredBy=function(t){return Kr.covers(t,this)},X.prototype.touches=function(t){return Kr.touches(this,t)},X.prototype.intersects=function(t){return Kr.intersects(this,t)},X.prototype.within=function(t){return Kr.contains(t,this)},X.prototype.overlaps=function(t){return Kr.overlaps(this,t)},X.prototype.disjoint=function(t){return Kr.disjoint(this,t)},X.prototype.crosses=function(t){return Kr.crosses(this,t)},X.prototype.buffer=function(){if(1===arguments.length){const t=arguments[0];return Gi.bufferOp(this,t)}if(2===arguments.length){const t=arguments[0],e=arguments[1];return Gi.bufferOp(this,t,e)}if(3===arguments.length){const t=arguments[0],e=arguments[1],n=arguments[2];return Gi.bufferOp(this,t,e,n)}},X.prototype.convexHull=function(){return new sn(this).getConvexHull()},X.prototype.relate=function(){if(1===arguments.length){const t=arguments[0];return Kr.relate(this,t)}if(2===arguments.length){const t=arguments[0],e=arguments[1];return Kr.relate(this,t).matches(e)}},X.prototype.getCentroid=function(){if(this.isEmpty())return this._factory.createPoint();const t=$e.getCentroid(this);return this.createPointFromInternalCoord(t,this)},X.prototype.getInteriorPoint=function(){if(this.isEmpty())return this._factory.createPoint();let t=null;const e=this.getDimension();t=0===e?new un(this):1===e?new hn(this):new on(this);const n=t.getInteriorPoint();return this.createPointFromInternalCoord(n,this)},X.prototype.symDifference=function(t){return Nr.symDifference(this,t)},X.prototype.createPointFromInternalCoord=function(t,e){return e.getPrecisionModel().makePrecise(t),e.getFactory().createPoint(t)},X.prototype.toText=function(){return(new Wt).write(this)},X.prototype.toString=function(){this.toText()},X.prototype.contains=function(t){return Kr.contains(this,t)},X.prototype.difference=function(t){return Nr.difference(this,t)},X.prototype.isSimple=function(){return new ri(this).isSimple()},X.prototype.isWithinDistance=function(t,e){return!(this.getEnvelopeInternal().distance(t.getEnvelopeInternal())>e)&&Vi.isWithinDistance(this,t,e)},X.prototype.distance=function(t){return Vi.distance(this,t)};t.algorithm=En,t.densify=Sn,t.dissolve=vn,t.geom=Te,t.geomgraph=as,t.index=Ds,t.io=Ys,t.linearref=cl,t.noding=ni,t.operation=ro,t.precision=ao,t.simplify=Lo,t.triangulate=Qo,t.util=Il,t.version="2.6.1 (489d80a)",Object.defineProperty(t,"__esModule",{value:!0})}));

},{}]},{},[1]);
