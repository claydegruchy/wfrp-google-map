var rawParams = new URLSearchParams(window.location.search)
var params = Object.fromEntries(
  rawParams
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
        console.log(name())
        localStorage.setItem('center', JSON.stringify(map.getCenter().toJSON()))
        localStorage.setItem('zoom', map.getZoom())
        // console.log(name(), map.getZoom(), JSON.stringify(map.getCenter().toJSON()))
        // console.log(name(),)

      },
      loadView: function(map) {
        console.log(name())
        var center = localStorage.getItem('center');
        var zoom = localStorage.getItem('zoom');
        // console.log(center, zoom);
        map.setCenter(JSON.parse(center));
        map.setZoom(Number(zoom));
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
        var data = JSON.parse(localStorage.getItem('geoPoints'));
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



  mapFunctions.markers.loadMarkers(map);
  mapFunctions.view.loadView(map);


  function bindViewListeners(mapLayer) {
    mapLayer.addListener('zoom_changed', mapFunctions.view.saveView);
    mapLayer.addListener('center_changed', mapFunctions.view.saveView);
  }









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
      if (!mem) return
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

    active: false,
    toggle: function() {
      console.log("toggle");
      if (!this.active) {
        this.shape.setMap(map);
        //
      } else {
        this.shape.setMap(null);

      }
    },
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






      // var circles =
      var polyCircles = allPoints.map(pos => drawCircle(pos, revealRange, -1))
        .map(circle => polygon(circle.map(p => [p.lat(), p.lng()])))


      var unifiedShape = polyCircles
        .reduce((accumulator, currentValue) => unify(accumulator, currentValue))
        .vertices.map(p => new google.maps.LatLng(p.x, p.y), )
      console.log(unifiedShape);

      // [p.toJSON().lat(), p.toJSON().lng()]
      // console.log("circles", circles.map(circle => circle.map(p => console.log(p.lat()))))
      // console.log("circles",circles.map(circle=>circle.map(p=>[p.toJSON().lat(),p.toJSON().lng()])));

      // var simplePoints = allPoints




      var circles = allPoints.map(pos => drawCircle(pos, revealRange, -1))

      // Construct the polygon, including both paths.
      this.shape = new google.maps.Polygon({
        // paths: [outerCoords, innerCoords],
        paths: [outerbounds, unifiedShape],
        strokeColor: "gray",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "black",
        fillOpacity: 0.80,
      });
      // this.shape.setMap(map);



      return this



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

  var memories = [
    "center",
    "zoom",
    "geoPoints",
    "geoLines",
  ]

  makeControl("Export memory", () => {
    var x = {};
    memories.forEach(v => x[v] = JSON.parse(localStorage.getItem(v)));
    exportData(x);
  }, centerControlDiv, map);

  makeControl("Import memory", async () => runImport(), centerControlDiv, map);

  if (allowEdits) {
    makeControl("Clear markers", () => mapFunctions.markers.clearMarkers(), centerControlDiv, map);
    makeControl("Clear lines", () => generaticTools.clearItems(), centerControlDiv, map);
    heatmaps.activate()
    states.activate()

  }

  makeControl("Clear memory", () => {
    memories.forEach(v => localStorage.removeItem(v));
  }, centerControlDiv, map);


  fog = fogOfWar.activate()


  makeControl("Toggle fog of war ()", async () => runImport(), centerControlDiv, map);


  var tools = generaticTools
  tools.config = {
    setDraggable: allowEdits,
    setEditable: allowEdits,
    // show
  }
  allowEdits && tools.draw();



  if (params.story == "true") {
    await setDefaults()
    // .then(()=>window.location.reload(false))
    rawParams.delete('story')
    window.location=window.location.origin + window.location.pathname + '?'+rawParams.toString()
  }

  // setDefaults

  var overlay = document.querySelector('#overlay')


  tools.loadItems()
  //load saved data


  // overlay.style.webkitFilter = `sepia(50%) `

}


// add the google key
document.customCreateElement('script', {
  src: `https://maps.googleapis.com/maps/api/js?key=${params.key}&callback=initMap&libraries=visualization,drawing&v=weekly`,
  defer: true,
  async: true,
}, document.querySelector('head'))
