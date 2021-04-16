(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const Handlebars = require('handlebars');

// var potionTemplate = Handlebars.compile(potionTemplate);





window.initMap = async function() {

  function name() {
    return arguments.callee.caller.name
  }

  function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        func.apply(this, args);
      }, timeout);
    };
  }

  // load params
  var rawParams = new URLSearchParams(window.location.search)
  var params = Object.fromEntries(
    rawParams
  );



  const map = new google.maps.Map(document.getElementById("map"), {
    center: {
      // altdorf
      lat: 31.874268441160677,
      lng: -16.277407946030955
    },
    zoom: 6,
    streetViewControl: false,
    mapTypeControlOptions: {
      mapTypeIds: ["WFRP"],
    },
    restriction: {
      latLngBounds: {
        north: 80,
        south: -80,
        west: -300,
        east: 300,
      },
    },

    gestureHandling: 'greedy'
  });



  const mapOptions = {
    getTileUrl: function(coord, zoom) {
      const normalizedCoord = getNormalizedCoord(coord, zoom);

      if (!normalizedCoord) {
        return "";
      }
      const bound = Math.pow(2, zoom);
      // log("old",`http://www.gitzmansgallery.com/tiles/${zoom}_${normalizedCoord.x}_${(normalizedCoord.y-1)}.jpg`);
      return (
        // `${params.tileURL}/tiles/${zoom}_${normalizedCoord.x}_${(normalizedCoord.y)}.jpg`
        // `http://${params.tileURL}/tiles/${zoom}_${normalizedCoord.x}_${(normalizedCoord.y)}.jpg`

        `./map/${zoom}/${zoom}_${normalizedCoord.x}_${(normalizedCoord.y)}.jpg`

      );
    },
    tileSize: new google.maps.Size(256, 256),
    maxZoom: 7,
    minZoom: 3,
    // radius: 10000,
    name: "WFRP",
  }

  const wfrpMapType = new google.maps.ImageMapType(mapOptions);
  map.mapTypes.set("WFRP", wfrpMapType);
  map.setMapTypeId("WFRP");



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
    return {
      x: x,
      y: y
    };
  }








  /*

  control zoom
    save zoom
    load from file

  control view position
    save positon
    load from file

  markers
    place
    comment on
    delete
    load from file
    save

  path
    place
    modify
    delete
    load from file
    save

  optional extras
    layers
    states
    fow


  */


  var randomString = function() {
    var str = Math.random().toString(36).substring(7)
    return str
  }


  map.handlers = {}

  // var handlers = map.handlers
  map.handlers.defaults = {
    lineStyles: {
      strokeColor: 'blue',
      strokeOpacity: 0,

      icons: [{
        icon: {
          path: "M 0,-1 0,1",
          strokeOpacity: 1,
          scale: 4,
        },
        offset: "0",
        repeat: "20px",
      }, ],
    }
  }

  map.handlers.memory = {
    save: (name, value) => localStorage.setItem(name, value),
    load: (name) => {
      var rawMemory = localStorage.getItem(name)
      try {
        var m = JSON.parse(rawMemory);
        return m
      } catch (e) {
        return undefined
      }
    },
  }

  map.handlers.settings = map.handlers.memory.load("settings")


  map.handlers.view = {
    defaults: {
      maxViewHistory: 20,

    },
    viewHistory: [],
    init: function(map) {
      console.info("view", name());
      map.addListener('zoom_changed', () => this.updateView());
      map.addListener('center_changed', () => this.updateView());
      this.map = map
      //
      return this
    },
    setView: function(position, zoom) {
      console.info(name(), position, zoom);
      if (!position || !zoom) {
        console.warn("must supply both position and zoom", position, zoom);
        return
      }
      this.map.setCenter(position);
      this.map.setZoom(Number(zoom));
      this.updateView()
    },

    loadViewFromMemory: function() {
      console.info(name());
      var view = [this.map.handlers.memory.load("center"), this.map.handlers.memory.load("zoom")]
      this.setView(...view)
      return view

    },
    updateView: function() {
      var zoom = this.map.getZoom()
      var position = this.map.getCenter().toJSON()
      // console.info(name(), position, zoom);
      this.map.handlers.memory.save("center", JSON.stringify(position))
      this.map.handlers.memory.save("zoom", zoom)
      // update histroy
      this.viewHistory.push({
        zoom,
        position
      })
      if (this.viewHistory.length > this.defaults.maxViewHistory) {
        this.viewHistory = this.viewHistory.slice(-this.defaults.maxViewHistory)
      }
    },
  }

  var view = map.handlers.view.init(map)
  view.loadViewFromMemory()





  map.handlers.markers = {
    markers: [],
    // to prevent save flooding
    init: function(map) {

      console.info("markers", name());
      this.map = map
      this.cluster = new MarkerClusterer(this.map, this.markers, {
        imagePath: "https://unpkg.com/@googlemaps/markerclustererplus@1.0.3/images/m",
        maxZoom: mapOptions.maxZoom - 1,
      });

      // added saving behind this shock adsorber to prevent flooding
      this.saveMarkersToMemory = debounce(() => {
        // compare old and new  mem to make sure we're not saving something uselessly
        var oldMem = this.map.handlers.memory.load("markers")
        var mem = this.markers.map(marker => marker.export())
          .filter(m => !m.data.tags.includes("temp"))
        if (JSON.stringify(oldMem) != JSON.stringify(mem)) {
          this.cluster.clearMarkers()
          console.log("saved", mem.length);
          this.map.handlers.memory.save("markers", JSON.stringify(mem))
          this.cluster.addMarkers(this.markers)

        }
      }, 500)

      return this
    },

    loadMarkersFromMemory: function() {
      var mem = this.map.handlers.memory.load("markers")
      console.log(name(), mem);
      if (mem && mem.length > 0) mem
        .map(marker => this.createMarker({
          ...marker,
          imported: true
        }))
      this.cluster.addMarkers(this.markers)
    },
    deleteMarker: function(marker) {
      console.info(name());

      var target = this.markers.find(m => m === marker || (JSON.stringify(m.export()) == JSON.stringify(marker.export())) || m.data.id == marker.data.id)
      this.markers = this.markers
        .filter(m => target != m)
      target.setMap(null)
      this.saveMarkersToMemory()
      return this.markers
    },
    deleteAllMarkers: function() {
      return this.markers
        .map(marker => this.deleteMarker(marker))
    },

    createMarker: function(info) {
      // console.info(name());
      if (!info.position) return



      // make marker
      var marker = new google.maps.Marker({
        data: {
          tags: []
        },
        ...info,
        position: info.position,
        map: this.map,

        export: function() {
          return {
            position: this.getPosition().toJSON(),
            data: this.data,
          }
        },
      });

      if (!marker.data.id) marker.data.id = randomString()


      // set up the needed events to make markers usable
      google.maps.event.addListener(marker, "contextmenu", (e) => {
        if (!marker.getDraggable()) return;
        if (e.domEvent.altKey) this.deleteMarker(marker)

      })

      google.maps.event.addListener(marker, "mouseup", (e) => {
        this.saveMarkersToMemory()
      })

      this.markers.push(marker)
      this.saveMarkersToMemory()
      return marker
    },


  }




  var markers = map.handlers.markers.init(map)
  markers.loadMarkersFromMemory()
  // markers.markers.map(m => m.setDraggable(true))
  markers.deleteAllMarkers()
  //
  // Array.from(new Array(10))
  //   .forEach((e, i) => markers.createMarker({
  //     position: {
  //       lng: 1 * (i / 1),
  //       lat: 1 * (i / 1)
  //     },
  //     data: {
  //       tags: ["temp"]
  //     }
  //   }))



  map.handlers.lines = {
    lines: [],
    init: function(map) {

      console.info("lines", name());
      this.map = map


      return this
    },

    saveLinesToMemory: function() {
      var mem = this.lines.map(line => line.export()).filter(r => r)
        .filter(m => !m.data.tags.includes("temp"))
      console.info(name(), mem.length);
      this.map.handlers.memory.save("lines", JSON.stringify(mem))
    },

    loadLinesFromMemory: function() {
      var mem = this.map.handlers.memory.load("lines")
      console.info(name(), mem);
      if (mem && mem.length > 0) mem
        .map(line => this.createLine({
          ...line,
          imported: true
        }))
      // .map(line => this.deleteLine(line))
    },
    deleteLine: function(line) {
      console.info(name());
      var target = this.lines.find(m => m === line || (JSON.stringify(m.export()) == JSON.stringify(line.export())) || m.data.id == line.data.id)
      this.lines = this.lines
        .filter(l => target != l)
      target.setMap(null)
      this.saveLinesToMemory()
      return this.lines
    },
    deleteAllLines: function() {
      return this.lines
        .map(line => this.deleteLine(line))
    },
    createLine: function(info) {
      console.info(name(), info);
      if (!info.path) return

      // make line
      var line = new google.maps.Polyline({
        data: info.data || {
          id: randomString(),
          tags: []
        },
        ...info,
        path: info.path,
        map: this.map,

        export: function() {
          if (this.getPath().getArray().length < 2) return undefined
          return {
            path: this.getPath().getArray(),
            data: this.data,
            strokeColor: this.strokeColor,
            strokeOpacity: this.strokeOpacity,
            icons: this.icons,
          }
        },
      });



      // set up the needed events to make lines usable
      google.maps.event.addListener(line, "contextmenu", (e) => {
        if (e.vertex == undefined) return;
        if (!line.editable) return;
        var path = line.getPath();
        path.removeAt(e.vertex);
        this.saveLinesToMemory()
        if (path.length < 2) this.deleteLine(line)
        if (e.domEvent.altKey) this.deleteLine(line)

      })

      google.maps.event.addListener(line, "mouseup", (e) => {
        this.saveLinesToMemory()
      })

      this.lines.push(line)
      this.saveLinesToMemory()





      return line
    },
  }


  var lines = map.handlers.lines.init(map)
  lines.loadLinesFromMemory()
  lines.deleteAllLines()




  lines.lines
    .map(line => line.setEditable(true))





  map.handlers.controls = {
    settings: {
      markerEdit: true,
      lineEdit: false,
      tags: ["temp"]
    },
    init: async function(map, markers, lines) {

      console.info("controls", name());
      this.map = map
      this.controlDIV = document.querySelector("#controls")
      this.markers = markers
      this.lines = lines


      this.drawingManager = await new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: true,
        drawingControlOptions: {
          position: google.maps.ControlPosition.TOP_CENTER,
          drawingModes: [
            google.maps.drawing.OverlayType.MARKER,
            // google.maps.drawing.OverlayType.CIRCLE,
            // google.maps.drawing.OverlayType.POLYGON,
            google.maps.drawing.OverlayType.POLYLINE,
            google.maps.drawing.OverlayType.RECTANGLE,
          ],
        },
        markerOptions: {
          icon: "https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png",
        },
        // polylineOptions: this.map.handlers.defaults.lineStyles,
      });

      this.drawingManager.setMap(map);
      this.addListeners()
      await this.loadNav()

      for (let [n, obj] of Object.entries(this.menus)) {
        console.log("activating sidebar menu controller:", n);
        await obj.init(this)
      }

      return await this
    },
    addListeners: function() {

      google.maps.event.addListener(this.drawingManager, 'markercomplete', (marker) => {
        // make a marker
        console.log(this.settings.tags);
        var m = this.markers.createMarker({
          position: marker.position,
          tags: [...this.settings.tags]
        });
        console.log(m);
        // delete the one placed bby the controller
        marker.setMap(null)
      });

      google.maps.event.addListener(this.drawingManager, 'polylinecomplete', (line) => {
        // create a line
        this.lines.createLine({
          path: line.getPath().getArray(),
          ...this.map.handlers.defaults.lineStyles
        })
        // delete the one placed bby the controller
        line.setMap(null)

      });

      google.maps.event.addListener(this.drawingManager, "drawingmode_changed", (event) => {
        console.log("drawing mode changed:" + this.drawingManager.getDrawingMode());
      })

    },
    loadNav: async function() {
      this.controlDIV.innerHTML = "Loading..."

      await fetch("./templates/base.hbs")
        .then(r => r.text())
        .then(r => Handlebars.compile(r))
        .then(r => r({
          setting: "ok"
        }))
        .then(r => this.controlDIV.innerHTML = r)

      return this.controlDIV

    },
    menus: {
      hand: {
        inputboxSave: async function(event, marker) {
          if (event.target.dataset.id != marker.data.id) throw "how did we not match?"
          marker.data[event.target.name] = event.target.value
          this.parent.markers.saveMarkersToMemory()
        },
        deselectMarkers: async function() {
          this.parent.markers.markers.forEach(mm => mm.setAnimation(null))
          this.parent.controlDIV.querySelector(".content").innerHTML = ""
          this.drawControls()

        },
        selectMarker: async function(marker) {
          // deselect all
          this.deselectMarkers()
          // set animation
          marker.setAnimation(google.maps.Animation.BOUNCE);

          var container = this.parent.controlDIV.querySelector(".content")
          container.innerHTML = this.markerSelectionTemplate(marker)
          var inputs = [...container.querySelectorAll(".input")]
          // add event listeners to each  of the inputs
          inputs.forEach(input => input.addEventListener('keyup', e => this.inputboxSave(e, marker)))

        },
        dehoverMarkers: async function() {
          this.parent.markers.markers.forEach(mm => {
            if (!mm.infowindow) return
            mm.infowindow.close()
            mm.infowindow = undefined
          })

        },
        hoverMarker: async function(marker) {
          this.dehoverMarkers()
          var content = this.markerHoverTemplate(marker)
          if (!content || content == "") return
          marker.infowindow = new google.maps.InfoWindow({
            content
          });
          marker.infowindow.open(this.parent.map, marker)
        },
        drawControls: async function() {
          console.log(parent.map.handlers);
          // if (!parent.map.handlers.defaults.enableHandControls) return
          this.parent.controlDIV.querySelector(".content").innerHTML = this.basicControlTemplate(this.parent)

        },
        init: async function(parent) {
          this.parent = parent


          // get the templates
          this.markerSelectionTemplate = await fetch("./templates/markerSelection.hbs")
            .then(r => r.text())
            .then(r => Handlebars.compile(r))

          this.markerHoverTemplate = await fetch("./templates/markerHover.hbs")
            .then(r => r.text())
            .then(r => Handlebars.compile(r))

          this.basicControlTemplate = await fetch("./templates/handControls.hbs")
            .then(r => r.text())
            .then(r => Handlebars.compile(r))



          this.handMarkerListeners = []

          google.maps.event.addListener(this.parent.drawingManager, "drawingmode_changed", (event) => {
            if (this.parent.drawingManager.getDrawingMode()) {
              // if we're not in hand mode anymore, remove the liseners
              console.info("removing listeners");
              this.handMarkerListeners.forEach(l => google.maps.event.removeListener(l))
              return
            }

            console.info("activating the hand", this.parent.markers.markers);

            this.parent.markers.markers.forEach(marker => {
              console.log("adding listener for", marker.data.id);
              //add listeners, when activated, add this markers details to the ui
              var t = marker.addListener("mouseup", (e) => this.selectMarker(marker));
              marker.addListener("mouseover", (e) => this.hoverMarker(marker));
              // marker.addListener("mouseout", (e) => this.dehoverMarkers());


              this.handMarkerListeners.push(t)

            })
            google.maps.event.addListener(this.parent.map, "contextmenu", (event) => {
              this.dehoverMarkers()
              this.deselectMarkers()
            });

            this.drawControls()


          })

          // set to hand initally
          parent.drawingManager.setDrawingMode(null)

        },

      }
      /*

      hand:
      if read only:
        show info of POI when they are "selected"
        show hovers with breif desc
        all items static
      if edit mode:
        show hovers with breif desc
        show info of POI when they are "selected", allow edits
        allow movement, deletes of all items

      marker:
      does not show in read only
      select icon (optional)

      line:
      does not show in read only
      select line colour
      select line dots



      types of menu:
      selection menu of what kind of marker to place
      selection menu of what kind of line to place

      placing a point of interest that does not need a lot of text
      hover info
      placing a campaign champter that needs a lot of text

      */
    }
  }


  var drawController = await map.handlers.controls.init(map, markers, lines)






  var mapLocationDrawer = {


    init: async function(drawingManager) {
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

      google.maps.event.addListener(drawingManager, 'rectanglecomplete', (rectangle) => {
        console.log(rectangle);
        // rectangle.draggable
        // editable: true
        // rectangle.setDraggable(true)
        rectangle.setEditable(true)
        overlay = new USGSOverlay(rectangle.getBounds(), "/map/mapreader/test_images/5120_empire_bw3.png", map);
        overlay.setMap(map);


        google.maps.event.addListener(rectangle, 'bounds_changed', () => {
          overlay.updateBounds(rectangle.getBounds(rectangle))

          // NW coordinates - (x1, y1)
          // SE coordinates - (x2, y2)
          // NE coordinates - (x2, y1)
          // SW coordinates - (x1, y2)

          console.log({
            getNorthEast: rectangle.getBounds().getNorthEast().toJSON(),
            getSouthWest: rectangle.getBounds().getSouthWest().toJSON(),
          });
        });


      });

    }
  }

  mapLocationDrawer.init(drawController.drawingManager)







  //
  //
  //
  //






  var locations = await fetch('./map/mapreader/foundImages_5120_empire_bw3.json')
    .then(r => r.json())
  // var content = fs.readFileSync(fileName);
  // var locations = JSON.parse(content)
  // console.log("parseLocationNames", locations.length);
  var indexLocation = locations[0]
  locations = locations.filter((a, i) => i != 0)
  // console.log("parseLocationNames", locations.length);

  var run = location => {
    if (!location) return
    // console.log("parseLocationNames", location.description);

    var l = location.boundingPoly.vertices[0]
    return {
      x: l.x,
      y: l.y,
    }

  }
  var makeLatLng = a => ({
    lat: a[0],
    lng: a[1]
  })


  var addLatLng = (a, b) => ({
    lat: a.lat + b.lat,
    lng: a.lng + b.lng,
  })




  var altdorf = {
    title: "altdorf",
    raw: run(locations.find(l => l.description.toLowerCase().includes("altdorf"))),
    map: makeLatLng([31.874268441160677, -16.277407946030955])
  }

  var talabheim = {
    title: "talabheim",
    raw: run(locations.find(l => l.description.toLowerCase().includes("talabheim"))),
    map: makeLatLng([35.692076013481106, -0.5703095462174956])
  }


  var mittelweg = {
    title: "mittelweg",
    raw: run(locations.find(l => l.description.toLowerCase().includes("mittelweg"))),
    map: {
      lng: -13.103833780821974,
      lat: 38.672541446056215
    }


  }





  // markers.createMarker({
  //   position: altdorf.map,
  //   data: {
  //     tags: ["temp"],
  //     title: altdorf.title
  //   }
  // })
  //
  // markers.createMarker({
  //   position: talabheim.map,
  //   data: {
  //     tags: ["temp"],
  //     title: talabheim.title
  //   }
  // })


  // markers.createMarker({
  //   position: makeLatLng([0, 0]),
  //   data: {
  //     tags: ["temp"],
  //     title: "middle"
  //   }
  // })

  // altdorf.absolute = addLatLng(altdorf.map, {
  //   lat: topLeftRawMap.lat,
  //   lng: topLeftRawMap.lng
  // });



  lines.createLine({
    path: [{
        lng: 0,
        lat: 80
      }, {
        lng: 0,
        lat: 0
      },
      {
        lng: 0,
        lat: -80
      }
    ],
    tags: ["temp"],
  })

  lines.createLine({
    path: [{
        lng: 180,
        lat: 0
      }, {
        lng: 0,
        lat: 0
      },
      {
        lng: -180,
        lat: 0
      }
    ],
    tags: ["temp"],
  })


  console.log(altdorf.absolute);
  console.log(altdorf.map, altdorf.raw);






  var rawOrigin = {
    getNorthEast: {
      lat: 51.61577247781892,
      lng: -24.50441987718352
    },
    getSouthWest: {
      lat: 4.244208080077743,
      lng: 31.7345937946915
    }


  }



  console.log("absolte lat", rawOrigin.getNorthEast.lat + rawOrigin.getSouthWest.lat);
  console.log("absolte lng", rawOrigin.getNorthEast.lng + -rawOrigin.getSouthWest.lng);

  var maxLat = 55.85998055789666
  var maxLng = 56.239013671875014

  var maxX = 5123
  var maxy = 5110


  var rawOriginCalc = {

    maxLat,
    maxLng,
    maxX,
    maxy,


    lng_X: maxX / maxLat,
    lat_Y: maxy / maxLng,

  }



  var applyOffset = a => addLatLng(a, {

    lat: rawOrigin.getNorthEast.lat,
    lng: rawOrigin.getNorthEast.lng,

  })
  var removeOffset = a => addLatLng(a, {

    lat: -rawOrigin.getNorthEast.lat,
    lng: -rawOrigin.getNorthEast.lng,

  })
  var multiplier = 1
  // console.warn(applyOffset(altdorf.map), altdorf.map, altdorf.raw.y / rawOriginCalc.lat_Y, altdorf.raw.x / rawOriginCalc.lng_X);
  // console.warn(applyOffset(talabheim.map), talabheim.map, talabheim.raw.y / rawOriginCalc.lat_Y, talabheim.raw.x / rawOriginCalc.lng_X);
  // console.warn(applyOffset(mittelweg.map), mittelweg.map, mittelweg.raw.y / rawOriginCalc.lat_Y, mittelweg.raw.x / rawOriginCalc.lng_X);


  console.log(altdorf.raw.y, altdorf.raw.x)
  // console.log(removeOffset(altdorf.map))


  var fastMarker = (pos, title) => {
    markers.createMarker({
      position: pos,
      data: {
        tags: ["temp"],
        title: title
      }
    })
  }

  var distance = (x1, x2, y1, y2) => Math.sqrt(Math.abs((x1 - x2) ^ 2 + (y1 - y2) ^ 2))






  var townTriangulationMap = {

    altdorfmittelwegDistance: distance(altdorf.map.lng, mittelweg.map.lng, altdorf.map.lat, mittelweg.map.lat, ),
    talabheimmittelwegDistance: distance(talabheim.map.lng, mittelweg.map.lng, talabheim.map.lat, mittelweg.map.lat, ),
    talabheimaltdorfDistance: distance(talabheim.map.lng, altdorf.map.lng, talabheim.map.lat, altdorf.map.lat, ),
  }

  var townTriangulationRaw = {

    altdorfmittelwegDistance: distance(altdorf.raw.x, mittelweg.raw.x, altdorf.raw.y, mittelweg.raw.y, ),
    talabheimmittelwegDistance: distance(talabheim.raw.x, mittelweg.raw.x, talabheim.raw.y, mittelweg.raw.y, ),
    talabheimaltdorfDistance: distance(talabheim.raw.x, altdorf.raw.x, talabheim.raw.y, altdorf.raw.y, ),
  }





  // console.log("townTriangulationMap", townTriangulationMap);
  // console.log("townTriangulationRaw", townTriangulationRaw);




  var crossmap = (name) => {

    var raw = run(locations.find(l => l.description.toLowerCase().includes(name)))
    if (!raw) return




    var x = raw.x
    var y = raw.y
    var XMax = indexLocation.boundingPoly.vertices[2].x
    var YMax = indexLocation.boundingPoly.vertices[2].y


    // console.log(x, XMax, x / XMax, "%");
    // console.log(y, YMax, y / YMax, "%");

    var rawMapToMapBounds = rawOrigin
    // console.log(rawMapToMapBounds);

    var lngDistance = Math.abs(rawMapToMapBounds.getNorthEast.lng) + Math.abs(rawMapToMapBounds.getSouthWest.lng)
    var latDistance = Math.abs(rawMapToMapBounds.getNorthEast.lat) + Math.abs(rawMapToMapBounds.getSouthWest.lat)
    // console.log(lngDistance);
    // console.log(latDistance);

    var mappedXToLngPercent = (x / XMax) * lngDistance
    var mappedYToLatPercent = (y / YMax) * latDistance

    // console.log("mappedXToLngPercent", mappedXToLngPercent)
    // console.log("mappedYToLatPercent", mappedYToLatPercent)




    // console.log(name," rawMapToMapBounds.getNorthEast.lng + mappedXToLngPercent", mappedXToLngPercent);
    console.log(name, mappedYToLatPercent, (latDistance / 2));




    var calc = {
      lng: (rawMapToMapBounds.getNorthEast.lng + mappedXToLngPercent - 6.8),
      lat: (rawMapToMapBounds.getNorthEast.lat + -mappedYToLatPercent + 7) - ((latDistance / 2) - (mappedYToLatPercent)) / 5,
    }

    // console.log("calc", calc);


    fastMarker(calc, name)



    // rawMapToMapBounds.getNorthEast

  }


  crossmap("altdorf")
  crossmap("mittelweg")
  crossmap("talabheim")
  crossmap("carroburg")
  crossmap("bokel")
  crossmap("akendorf")
  crossmap("sava")
  crossmap("munzig")
  crossmap("kell")

  crossmap("russbach")
  crossmap("bogglewort")





  /*
  ok perhaps i  can take the raw number (say x/lng) and find the bound extends on the  lng axis on the map
  thisll give a nnumber thats the total width of the avalible area where a point can fall on the raw mmap
  then i can find the % of how far over on the x axis the raw location is
  then find the same person on the lng axis, which should give the same location
  */





  fastMarker(rawOrigin.getNorthEast, "rawOrigin.getNorthEast")
  fastMarker(rawOrigin.getSouthWest, "rawOrigin.getSouthWest")
  //
  //
  //
  //
  // fastMarker(removeOffset(altdorf.map), "removeOffset(altdorf.map)")
  // fastMarker(removeOffset(mittelweg.map), "removeOffset(mittelweg.map)")
  // fastMarker(removeOffset(talabheim.map), "removeOffset(talabheim.map)")
  //
  //
  // fastMarker({lat:altdorf.raw.y/100, lng:altdorf.raw.x/100}, "altdorf.raw")
  // fastMarker({lat:mittelweg.raw.y/100, lng:mittelweg.raw.x/100}, "mittelweg.raw")
  // fastMarker({lat:talabheim.raw.y/100, lng:talabheim.raw.x/100}, "talabheim.raw")

  /*
  move map altdorf origin to raw top left
  minus raw locations so that their origin is bottom right
  make origin of raw and map the same
  */


  //
  //
  //
  //
  //






  return
  return



  //

  //

  //

  //

  //

  //

  //

  //

  //

  //


  var states = await fetch("./data/states.json")
    .then(r => r.json())

  var heatmaps = await fetch("./data/heatmaps.json")
    .then(r => r.json())







  //view

  var mapFunctions = {
    view: {
      saveView: function() {
        log("zoom", name())
        localStorage.setItem('center', JSON.stringify(map.getCenter().toJSON()))
        localStorage.setItem('zoom', map.getZoom())
        // log("zoom",name(), map.getZoom(), JSON.stringify(map.getCenter().toJSON()))
        // log("zoom",name(),)

      },
      loadView: function(map) {
        log("zoom", name())
        var center = localStorage.getItem('center');
        var zoom = localStorage.getItem('zoom');
        if (center || zoom) return

        // log("old",center, zoom);
        map.setCenter(JSON.parse(center));
        map.setZoom(Number(zoom));
      },
    },


    markers: {
      markers: [],
      deselectAll: function() {
        log("old", name());
        return this.markers
          .filter(m => m.deselect)
          .map(m => m.deselectMarkers())
      },
      clearMarkers: function() {
        log("old", name(), map.length)
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
        log("old", name());
        var data = JSON.parse(localStorage.getItem('geoPoints'));
        // map.data.addGeoJson(data);
        if (data) data.map(marker => this.placeMarker({
          ...marker,
          imported: true
        }))
      },

      saveMarkersToMemory: function() {
        log("old", name());
        localStorage.setItem('geoPoints', JSON.stringify(this.markers
          // .filter(m => m.setEditable)
          .map(m => m.export())))
      },

      placeMarker: function(info) {
        //
        log("old", name());
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

        log("old", "placing marker at ", info.position.toString());


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
            value: marker.data.inputContent + info.position.toString()

          }, inputContainer)
          if (allowEdits) {
            var saveButton = document.customCreateElement('button', {
              innerText: "Submit",
              onclick: (e) => {
                log("old", "Saved marker", marker);
                marker.data.inputContent = textField.value
                marker.save()
                e.preventDefault()
              }
            }, inputContainer)

            var deleteButton = document.customCreateElement('button', {
              innerText: "Delete",
              onclick: (e) => {
                log("old", "Delete marker", marker);
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
      log("old", "imported", key);
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
  log("old", "ControlPosition", google.maps.ControlPosition)


  //map.data.setControls(['Point']);


  bindViewListeners(map);






  log("old", "loading heatmap");
  var heatmaps = {
    heatmaps: heatmaps,
    activeMaps: [],
    activate: function() {
      Object.keys(this.heatmaps).map(heatmapName => {
        log("old", "making heatmap for", heatmapName);
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
  log("old", "loading heatmap", "done");






  log("old", "loading states");

  var states = {
    states: states,
    active: [],
    activate: function(specificState) {
      log("old", "acctivating states", this.states);
      Object.entries(this.states).map(stateItem => {
        log("old", "making state for", stateItem[0]);
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


  log("old", "loading states", "done");




  var generaticToolsGenerator = {
    init: function() {
      return this
    },
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
      log("old", "saving lines");
      if (!allowEdits) return
      var tt = this.items.map(l => l.getPath()
        .getArray()
        // .map(p => )
      )
      // log("old",JSON.stringify(tt));
      this.memory.save(tt)
    },
    loadItems: function() {
      var mem = this.memory.load()
      log("old", "loading lines", mem);
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
        log("old", 'Bounds changed.');
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
        log("old", marker);
        mapFunctions.markers.placeMarker({
          position: marker.position,
        });
        marker.setMap(null)
      });


      google.maps.event.addListener(drawingManager, 'polylinecomplete', (line) => {
        log("old", "line compelte", line);
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



    }
  }

  var generaticTools = generaticToolsGenerator



  log("old", "loading overlay");
  var overlay = {
    items: {},
    active: [],
    activate: async function() {
      log("old", "acctivating", this.items);




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
  log("old", "loading overlay", "done");



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
  log("old", "loading fogOfWar");
  var fogOfWar = {

    active: false,
    toggle: function() {
      log("old", "toggling fow, switcching from:", this.active);
      if (!this.active) {
        log("old", "turning on");
        this.shape.setMap(map);

      } else {
        log("old", "turning off");
        this.shape.setMap(null);

      }
      this.active = !this.active

    },
    activate: function() {
      log("old", name());


      const Flatten = require('@flatten-js/core');





      // log("old",name(), map.getBounds(),);
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


      var mid = (arr) => arr[Math.floor((arr.length - 1) / 2)]
      var allPoints = [
        // mid(mapFunctions.markers.markers.map(m => m.position))
        // ...mapFunctions.markers.markers.map(m => m.position)
        mid(generaticTools.items.map(l => l.getPath().getArray()).flat())
        // generaticTools.items.map(l => l.getPath().getArray()).flat()[0],
        // generaticTools.items.map(l => l.getPath().getArray()).flat()[generaticTools.items.length]
        // ...generaticTools.items.map(l => l.getPath().getArray()).flat()
      ]

      log("old", allPoints);




      var revealRange = 500
      if (allPoints.length < 1) {
        return
      }



      var polyCircles = allPoints.map(pos => drawCircle(pos, revealRange, -1))
        .map(circle => polygon(circle.map(p => [p.lat(), p.lng()])))

      // polyCircles = [
      //   polygon([
      //     [1, 1],
      //     [0, 1],
      //     [0, 0],
      //     [1, 0]
      //   ]),
      //   polygon([
      //     [2, 2],
      //     [0, 2],
      //     [0, 0],
      //   ])
      // ]


      var unifiedShape = polyCircles
        .reduce((accumulator, currentValue) => unify(accumulator, currentValue))
        .vertices.map(p => new google.maps.LatLng(p.x, p.y), )
      log("old", unifiedShape);





      // var circles = allPoints.map(pos => drawCircle(pos, revealRange, -1))

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



    }
  }
  log("old", "loading fogOfWar", "done");

  /*
  // TEMPLATE
    log("old","loading template");
    var template = {
      items: {},
      active: [],
      activate: function() {
        log("old","acctivating", this.items);

        Object.entries(this.items).map(item => {

        })
      }
    }
    log("old","loading template", "done");

  */


  var setDefaults = async () => {
    log("old", "logging defaultl story ");
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


  makeControl("Clear memory", () => {
    memories.forEach(v => localStorage.removeItem(v));
  }, centerControlDiv, map);

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

  var loadStory = async () => {
    await setDefaults()
    rawParams.delete('story')
    rawParams.delete('diag')
    rawParams.append('fow', true)
    window.location = window.location.origin + window.location.pathname + '?' + rawParams.toString()
  }

  if (params.story == "true") {
    loadStory()
  }

  makeControl("Load story mode", async () => loadStory(), centerControlDiv, map);
  makeControl("Load diag mode", async () => {
    rawParams.append("diag", "true")
    rawParams.delete('story')
    window.location = window.location.origin + window.location.pathname + '?' + rawParams.toString()
  }, centerControlDiv, map);




  // setDefaults

  var overlay = document.querySelector('#overlay')


  tools.loadItems()
  //load saved data

  makeControl("Toggle fog of war (experimental)", async () => fog.toggle(), centerControlDiv, map);


  //
  // fog = fogOfWar.activate()
  //
  //
  // if (params.fow == "true") {
  //   fog.toggle()
  // }

  // overlay.style.webkitFilter = `sepia(50%) `


  // ############ get place names ###############




  async function parseLocationNames(fileName) {
    console.log("ok");
    var center = function(arr) {
      var x = arr.map(xy => xy[0]);
      var y = arr.map(xy => xy[1]);
      var cx = (Math.min(...x) + Math.max(...x)) / 2;
      var cy = (Math.min(...y) + Math.max(...y)) / 2;
      return [cx, cy];
    }


    var locations = await fetch(fileName)
      .then(r => r.json())
    // var content = fs.readFileSync(fileName);
    // var locations = JSON.parse(content)
    log("parseLocationNames", locations.length);
    locations = locations.filter((a, i) => i != 0)
    log("parseLocationNames", locations.length);

    var run = location => {
      log("parseLocationNames", location.description);
      log("parseLocationNames", location.boundingPoly);

      // var middle = center(location.boundingPoly.vertices.map(p => [p.x, p.y]))
      var l = location.boundingPoly.vertices[0]
      log("parseLocationNames", l);
      return [l.x, l.y]

    }
    var altdorf = {
      raw: run(locations.find(l => l.description.toLowerCase().includes("altdorf"))),
      map: [31.874268441160677, -16.277407946030955]
    }

    var talabheim = {
      raw: run(locations.find(l => l.description.toLowerCase().includes("talabheim"))),
      map: [35.692076013481106, -0.5703095462174956]
    }





    var undoZero = loc => {
      var offset = [31.874268441160677, -16.277407946030955]
      var offset = [0, -0]
      return [loc[0] + offset[0], loc[1] + offset[1]]
    }



    var findZeroMapLocation = loc => {
      var offset = [-31.874268441160677, 16.277407946030955]
      return [loc[0] + offset[0], loc[1] + offset[1]]
    }


    var findZeroRawLocation = loc => {
      var offset = [-1360, -2434]
      return [loc[0] + offset[0], loc[1] + offset[1]]
    }


    var rawToMapPropOffset = (raw, map) => {
      // var offset = [0.002721174321, 0]
      return [map[0] / raw[0], map[1] / raw[1]]
    }

    var recalculateLocationOfRaw = (raw, offset) => {
      return [raw[0] * offset[0], raw[1] * offset[1]]
    }

    altdorf = {
      ...altdorf,
      findZeroMapLocation: findZeroMapLocation(altdorf.map),
      findZeroRawLocation: findZeroRawLocation(altdorf.raw),
      rawToMapPropOffset: rawToMapPropOffset(altdorf.raw, altdorf.map, )

    }
    altdorf.recalculateLocationOfRaw = recalculateLocationOfRaw(altdorf.raw, altdorf.rawToMapPropOffset)

    talabheim = {
      ...talabheim,
      findZeroMapLocation: findZeroMapLocation(talabheim.map),
      findZeroRawLocation: findZeroRawLocation(talabheim.raw),
      rawToMapPropOffset: rawToMapPropOffset(talabheim.raw, talabheim.map, )

    }
    talabheim.recalculateLocationOfRaw = recalculateLocationOfRaw(talabheim.raw, talabheim.rawToMapPropOffset)





    // 0.002721174321


    log("parseLocationNames", "findZeroMapLocation", "altdorf", altdorf.findZeroMapLocation);
    log("parseLocationNames", "findZeroRawLocation", "altdorf", altdorf.findZeroRawLocation);
    log("parseLocationNames", "rawToMapPropOffset", "altdorf", altdorf.rawToMapPropOffset);
    log("parseLocationNames", "predict", "altdorf", altdorf.recalculateLocationOfRaw);
    // altdorf.recalculateLocationOfRaw






    log("parseLocationNames", "findZeroMapLocation", "talabheim", talabheim.findZeroMapLocation);
    log("parseLocationNames", "findZeroRawLocation", "talabheim", talabheim.findZeroRawLocation);
    log("parseLocationNames", "rawToMapPropOffset", "talabheim", talabheim.rawToMapPropOffset);
    log("parseLocationNames", "predict", "talabheim", talabheim.recalculateLocationOfRaw);
    // talabheim.recalculateLocationOfRaw







    const average = arr => arr.reduce((p, c) => p + c, 0) / arr.length;

    var caluateAverageOffset = (a, b) => {
      return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    }




    var masterRecalculate = loc => {
      // var offset = [0.018177416262329583, -0.003485554268180884] //master offset
      var offset = [0.012917870435570434, -0.00028359500060541804]

      (50.680797145321655, -29.32968139031974)

      return [loc[0] * offset[0], loc[1] * offset[1]]

    }


    log("parseLocationNames", "masterRecalculate", "altdorf", masterRecalculate(altdorf.raw));

    log("parseLocationNames", "masterRecalculate", "talabheim", masterRecalculate(talabheim.raw));

    mapFunctions.markers.clearMarkers()


    mapFunctions.markers.placeMarker({
      position: new google.maps.LatLng(...masterRecalculate(altdorf.raw))
    })

    mapFunctions.markers.placeMarker({
      position: new google.maps.LatLng(...masterRecalculate(talabheim.raw))
    })



    log("parseLocationNames", "average offset", "both", caluateAverageOffset(altdorf.rawToMapPropOffset, talabheim.rawToMapPropOffset));




    mapFunctions.markers.placeMarker({
      data: {
        inputContent: "Nuln"
      },
      position: new google.maps.LatLng(...masterRecalculate(run(locations.find(l => l.description.toLowerCase().includes("Nuln".toLowerCase())))))
    })
    mapFunctions.markers.placeMarker({
      data: {
        inputContent: "Helmgart"
      },
      position: new google.maps.LatLng(...masterRecalculate(run(locations.find(l => l.description.toLowerCase().includes("Helmgart".toLowerCase())))))
    })





  }


  parseLocationNames('./map/mapreader/foundImages_5120_empire_bw3.json')


  // ############ get place names ###############



}


// log("old","loaded", "customCreateElement")
document.__proto__.customCreateElement = (tag = 'div', attributes = {}, parent) => {
  // // log("old","customCreateElement", tag, attributes)
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



// add the google key
document.customCreateElement('script', {
  src: `https://maps.googleapis.com/maps/api/js?key=${"AIzaSyAyXFcMs8AssuSNDtU9rUV0S5v4JSMTzDA"}&callback=initMap&libraries=visualization,drawing&v=weekly`,
  defer: true,
  async: true,
}, document.querySelector('head'))

},{"@flatten-js/core":2,"handlebars":35}],2:[function(require,module,exports){
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
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _handlebarsRuntime = require('./handlebars.runtime');

var _handlebarsRuntime2 = _interopRequireDefault(_handlebarsRuntime);

// Compiler imports

var _handlebarsCompilerAst = require('./handlebars/compiler/ast');

var _handlebarsCompilerAst2 = _interopRequireDefault(_handlebarsCompilerAst);

var _handlebarsCompilerBase = require('./handlebars/compiler/base');

var _handlebarsCompilerCompiler = require('./handlebars/compiler/compiler');

var _handlebarsCompilerJavascriptCompiler = require('./handlebars/compiler/javascript-compiler');

var _handlebarsCompilerJavascriptCompiler2 = _interopRequireDefault(_handlebarsCompilerJavascriptCompiler);

var _handlebarsCompilerVisitor = require('./handlebars/compiler/visitor');

var _handlebarsCompilerVisitor2 = _interopRequireDefault(_handlebarsCompilerVisitor);

var _handlebarsNoConflict = require('./handlebars/no-conflict');

var _handlebarsNoConflict2 = _interopRequireDefault(_handlebarsNoConflict);

var _create = _handlebarsRuntime2['default'].create;
function create() {
  var hb = _create();

  hb.compile = function (input, options) {
    return _handlebarsCompilerCompiler.compile(input, options, hb);
  };
  hb.precompile = function (input, options) {
    return _handlebarsCompilerCompiler.precompile(input, options, hb);
  };

  hb.AST = _handlebarsCompilerAst2['default'];
  hb.Compiler = _handlebarsCompilerCompiler.Compiler;
  hb.JavaScriptCompiler = _handlebarsCompilerJavascriptCompiler2['default'];
  hb.Parser = _handlebarsCompilerBase.parser;
  hb.parse = _handlebarsCompilerBase.parse;
  hb.parseWithoutProcessing = _handlebarsCompilerBase.parseWithoutProcessing;

  return hb;
}

var inst = create();
inst.create = create;

_handlebarsNoConflict2['default'](inst);

inst.Visitor = _handlebarsCompilerVisitor2['default'];

inst['default'] = inst;

exports['default'] = inst;
module.exports = exports['default'];


},{"./handlebars.runtime":4,"./handlebars/compiler/ast":6,"./handlebars/compiler/base":7,"./handlebars/compiler/compiler":9,"./handlebars/compiler/javascript-compiler":11,"./handlebars/compiler/visitor":14,"./handlebars/no-conflict":31}],4:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

// istanbul ignore next

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _handlebarsBase = require('./handlebars/base');

var base = _interopRequireWildcard(_handlebarsBase);

// Each of these augment the Handlebars object. No need to setup here.
// (This is done to easily share code between commonjs and browse envs)

var _handlebarsSafeString = require('./handlebars/safe-string');

var _handlebarsSafeString2 = _interopRequireDefault(_handlebarsSafeString);

var _handlebarsException = require('./handlebars/exception');

var _handlebarsException2 = _interopRequireDefault(_handlebarsException);

var _handlebarsUtils = require('./handlebars/utils');

var Utils = _interopRequireWildcard(_handlebarsUtils);

var _handlebarsRuntime = require('./handlebars/runtime');

var runtime = _interopRequireWildcard(_handlebarsRuntime);

var _handlebarsNoConflict = require('./handlebars/no-conflict');

var _handlebarsNoConflict2 = _interopRequireDefault(_handlebarsNoConflict);

// For compatibility and usage outside of module systems, make the Handlebars object a namespace
function create() {
  var hb = new base.HandlebarsEnvironment();

  Utils.extend(hb, base);
  hb.SafeString = _handlebarsSafeString2['default'];
  hb.Exception = _handlebarsException2['default'];
  hb.Utils = Utils;
  hb.escapeExpression = Utils.escapeExpression;

  hb.VM = runtime;
  hb.template = function (spec) {
    return runtime.template(spec, hb);
  };

  return hb;
}

var inst = create();
inst.create = create;

_handlebarsNoConflict2['default'](inst);

inst['default'] = inst;

exports['default'] = inst;
module.exports = exports['default'];


},{"./handlebars/base":5,"./handlebars/exception":18,"./handlebars/no-conflict":31,"./handlebars/runtime":32,"./handlebars/safe-string":33,"./handlebars/utils":34}],5:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.HandlebarsEnvironment = HandlebarsEnvironment;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _utils = require('./utils');

var _exception = require('./exception');

var _exception2 = _interopRequireDefault(_exception);

var _helpers = require('./helpers');

var _decorators = require('./decorators');

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _internalProtoAccess = require('./internal/proto-access');

var VERSION = '4.7.7';
exports.VERSION = VERSION;
var COMPILER_REVISION = 8;
exports.COMPILER_REVISION = COMPILER_REVISION;
var LAST_COMPATIBLE_COMPILER_REVISION = 7;

exports.LAST_COMPATIBLE_COMPILER_REVISION = LAST_COMPATIBLE_COMPILER_REVISION;
var REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '== 1.x.x',
  5: '== 2.0.0-alpha.x',
  6: '>= 2.0.0-beta.1',
  7: '>= 4.0.0 <4.3.0',
  8: '>= 4.3.0'
};

exports.REVISION_CHANGES = REVISION_CHANGES;
var objectType = '[object Object]';

function HandlebarsEnvironment(helpers, partials, decorators) {
  this.helpers = helpers || {};
  this.partials = partials || {};
  this.decorators = decorators || {};

  _helpers.registerDefaultHelpers(this);
  _decorators.registerDefaultDecorators(this);
}

HandlebarsEnvironment.prototype = {
  constructor: HandlebarsEnvironment,

  logger: _logger2['default'],
  log: _logger2['default'].log,

  registerHelper: function registerHelper(name, fn) {
    if (_utils.toString.call(name) === objectType) {
      if (fn) {
        throw new _exception2['default']('Arg not supported with multiple helpers');
      }
      _utils.extend(this.helpers, name);
    } else {
      this.helpers[name] = fn;
    }
  },
  unregisterHelper: function unregisterHelper(name) {
    delete this.helpers[name];
  },

  registerPartial: function registerPartial(name, partial) {
    if (_utils.toString.call(name) === objectType) {
      _utils.extend(this.partials, name);
    } else {
      if (typeof partial === 'undefined') {
        throw new _exception2['default']('Attempting to register a partial called "' + name + '" as undefined');
      }
      this.partials[name] = partial;
    }
  },
  unregisterPartial: function unregisterPartial(name) {
    delete this.partials[name];
  },

  registerDecorator: function registerDecorator(name, fn) {
    if (_utils.toString.call(name) === objectType) {
      if (fn) {
        throw new _exception2['default']('Arg not supported with multiple decorators');
      }
      _utils.extend(this.decorators, name);
    } else {
      this.decorators[name] = fn;
    }
  },
  unregisterDecorator: function unregisterDecorator(name) {
    delete this.decorators[name];
  },
  /**
   * Reset the memory of illegal property accesses that have already been logged.
   * @deprecated should only be used in handlebars test-cases
   */
  resetLoggedPropertyAccesses: function resetLoggedPropertyAccesses() {
    _internalProtoAccess.resetLoggedProperties();
  }
};

var log = _logger2['default'].log;

exports.log = log;
exports.createFrame = _utils.createFrame;
exports.logger = _logger2['default'];


},{"./decorators":16,"./exception":18,"./helpers":19,"./internal/proto-access":28,"./logger":30,"./utils":34}],6:[function(require,module,exports){
'use strict';

exports.__esModule = true;
var AST = {
  // Public API used to evaluate derived attributes regarding AST nodes
  helpers: {
    // a mustache is definitely a helper if:
    // * it is an eligible helper, and
    // * it has at least one parameter or hash segment
    helperExpression: function helperExpression(node) {
      return node.type === 'SubExpression' || (node.type === 'MustacheStatement' || node.type === 'BlockStatement') && !!(node.params && node.params.length || node.hash);
    },

    scopedId: function scopedId(path) {
      return (/^\.|this\b/.test(path.original)
      );
    },

    // an ID is simple if it only has one part, and that part is not
    // `..` or `this`.
    simpleId: function simpleId(path) {
      return path.parts.length === 1 && !AST.helpers.scopedId(path) && !path.depth;
    }
  }
};

// Must be exported as an object rather than the root of the module as the jison lexer
// must modify the object to operate properly.
exports['default'] = AST;
module.exports = exports['default'];


},{}],7:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.parseWithoutProcessing = parseWithoutProcessing;
exports.parse = parse;
// istanbul ignore next

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _parser = require('./parser');

var _parser2 = _interopRequireDefault(_parser);

var _whitespaceControl = require('./whitespace-control');

var _whitespaceControl2 = _interopRequireDefault(_whitespaceControl);

var _helpers = require('./helpers');

var Helpers = _interopRequireWildcard(_helpers);

var _utils = require('../utils');

exports.parser = _parser2['default'];

var yy = {};
_utils.extend(yy, Helpers);

function parseWithoutProcessing(input, options) {
  // Just return if an already-compiled AST was passed in.
  if (input.type === 'Program') {
    return input;
  }

  _parser2['default'].yy = yy;

  // Altering the shared object here, but this is ok as parser is a sync operation
  yy.locInfo = function (locInfo) {
    return new yy.SourceLocation(options && options.srcName, locInfo);
  };

  var ast = _parser2['default'].parse(input);

  return ast;
}

function parse(input, options) {
  var ast = parseWithoutProcessing(input, options);
  var strip = new _whitespaceControl2['default'](options);

  return strip.accept(ast);
}


},{"../utils":34,"./helpers":10,"./parser":12,"./whitespace-control":15}],8:[function(require,module,exports){
/* global define */
'use strict';

exports.__esModule = true;

var _utils = require('../utils');

var SourceNode = undefined;

try {
  /* istanbul ignore next */
  if (typeof define !== 'function' || !define.amd) {
    // We don't support this in AMD environments. For these environments, we asusme that
    // they are running on the browser and thus have no need for the source-map library.
    var SourceMap = require('source-map');
    SourceNode = SourceMap.SourceNode;
  }
} catch (err) {}
/* NOP */

/* istanbul ignore if: tested but not covered in istanbul due to dist build  */
if (!SourceNode) {
  SourceNode = function (line, column, srcFile, chunks) {
    this.src = '';
    if (chunks) {
      this.add(chunks);
    }
  };
  /* istanbul ignore next */
  SourceNode.prototype = {
    add: function add(chunks) {
      if (_utils.isArray(chunks)) {
        chunks = chunks.join('');
      }
      this.src += chunks;
    },
    prepend: function prepend(chunks) {
      if (_utils.isArray(chunks)) {
        chunks = chunks.join('');
      }
      this.src = chunks + this.src;
    },
    toStringWithSourceMap: function toStringWithSourceMap() {
      return { code: this.toString() };
    },
    toString: function toString() {
      return this.src;
    }
  };
}

function castChunk(chunk, codeGen, loc) {
  if (_utils.isArray(chunk)) {
    var ret = [];

    for (var i = 0, len = chunk.length; i < len; i++) {
      ret.push(codeGen.wrap(chunk[i], loc));
    }
    return ret;
  } else if (typeof chunk === 'boolean' || typeof chunk === 'number') {
    // Handle primitives that the SourceNode will throw up on
    return chunk + '';
  }
  return chunk;
}

function CodeGen(srcFile) {
  this.srcFile = srcFile;
  this.source = [];
}

CodeGen.prototype = {
  isEmpty: function isEmpty() {
    return !this.source.length;
  },
  prepend: function prepend(source, loc) {
    this.source.unshift(this.wrap(source, loc));
  },
  push: function push(source, loc) {
    this.source.push(this.wrap(source, loc));
  },

  merge: function merge() {
    var source = this.empty();
    this.each(function (line) {
      source.add(['  ', line, '\n']);
    });
    return source;
  },

  each: function each(iter) {
    for (var i = 0, len = this.source.length; i < len; i++) {
      iter(this.source[i]);
    }
  },

  empty: function empty() {
    var loc = this.currentLocation || { start: {} };
    return new SourceNode(loc.start.line, loc.start.column, this.srcFile);
  },
  wrap: function wrap(chunk) {
    var loc = arguments.length <= 1 || arguments[1] === undefined ? this.currentLocation || { start: {} } : arguments[1];

    if (chunk instanceof SourceNode) {
      return chunk;
    }

    chunk = castChunk(chunk, this, loc);

    return new SourceNode(loc.start.line, loc.start.column, this.srcFile, chunk);
  },

  functionCall: function functionCall(fn, type, params) {
    params = this.generateList(params);
    return this.wrap([fn, type ? '.' + type + '(' : '(', params, ')']);
  },

  quotedString: function quotedString(str) {
    return '"' + (str + '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\u2028/g, '\\u2028') // Per Ecma-262 7.3 + 7.8.4
    .replace(/\u2029/g, '\\u2029') + '"';
  },

  objectLiteral: function objectLiteral(obj) {
    // istanbul ignore next

    var _this = this;

    var pairs = [];

    Object.keys(obj).forEach(function (key) {
      var value = castChunk(obj[key], _this);
      if (value !== 'undefined') {
        pairs.push([_this.quotedString(key), ':', value]);
      }
    });

    var ret = this.generateList(pairs);
    ret.prepend('{');
    ret.add('}');
    return ret;
  },

  generateList: function generateList(entries) {
    var ret = this.empty();

    for (var i = 0, len = entries.length; i < len; i++) {
      if (i) {
        ret.add(',');
      }

      ret.add(castChunk(entries[i], this));
    }

    return ret;
  },

  generateArray: function generateArray(entries) {
    var ret = this.generateList(entries);
    ret.prepend('[');
    ret.add(']');

    return ret;
  }
};

exports['default'] = CodeGen;
module.exports = exports['default'];


},{"../utils":34,"source-map":46}],9:[function(require,module,exports){
/* eslint-disable new-cap */

'use strict';

exports.__esModule = true;
exports.Compiler = Compiler;
exports.precompile = precompile;
exports.compile = compile;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

var _utils = require('../utils');

var _ast = require('./ast');

var _ast2 = _interopRequireDefault(_ast);

var slice = [].slice;

function Compiler() {}

// the foundHelper register will disambiguate helper lookup from finding a
// function in a context. This is necessary for mustache compatibility, which
// requires that context functions in blocks are evaluated by blockHelperMissing,
// and then proceed as if the resulting value was provided to blockHelperMissing.

Compiler.prototype = {
  compiler: Compiler,

  equals: function equals(other) {
    var len = this.opcodes.length;
    if (other.opcodes.length !== len) {
      return false;
    }

    for (var i = 0; i < len; i++) {
      var opcode = this.opcodes[i],
          otherOpcode = other.opcodes[i];
      if (opcode.opcode !== otherOpcode.opcode || !argEquals(opcode.args, otherOpcode.args)) {
        return false;
      }
    }

    // We know that length is the same between the two arrays because they are directly tied
    // to the opcode behavior above.
    len = this.children.length;
    for (var i = 0; i < len; i++) {
      if (!this.children[i].equals(other.children[i])) {
        return false;
      }
    }

    return true;
  },

  guid: 0,

  compile: function compile(program, options) {
    this.sourceNode = [];
    this.opcodes = [];
    this.children = [];
    this.options = options;
    this.stringParams = options.stringParams;
    this.trackIds = options.trackIds;

    options.blockParams = options.blockParams || [];

    options.knownHelpers = _utils.extend(Object.create(null), {
      helperMissing: true,
      blockHelperMissing: true,
      each: true,
      'if': true,
      unless: true,
      'with': true,
      log: true,
      lookup: true
    }, options.knownHelpers);

    return this.accept(program);
  },

  compileProgram: function compileProgram(program) {
    var childCompiler = new this.compiler(),
        // eslint-disable-line new-cap
    result = childCompiler.compile(program, this.options),
        guid = this.guid++;

    this.usePartial = this.usePartial || result.usePartial;

    this.children[guid] = result;
    this.useDepths = this.useDepths || result.useDepths;

    return guid;
  },

  accept: function accept(node) {
    /* istanbul ignore next: Sanity code */
    if (!this[node.type]) {
      throw new _exception2['default']('Unknown type: ' + node.type, node);
    }

    this.sourceNode.unshift(node);
    var ret = this[node.type](node);
    this.sourceNode.shift();
    return ret;
  },

  Program: function Program(program) {
    this.options.blockParams.unshift(program.blockParams);

    var body = program.body,
        bodyLength = body.length;
    for (var i = 0; i < bodyLength; i++) {
      this.accept(body[i]);
    }

    this.options.blockParams.shift();

    this.isSimple = bodyLength === 1;
    this.blockParams = program.blockParams ? program.blockParams.length : 0;

    return this;
  },

  BlockStatement: function BlockStatement(block) {
    transformLiteralToPath(block);

    var program = block.program,
        inverse = block.inverse;

    program = program && this.compileProgram(program);
    inverse = inverse && this.compileProgram(inverse);

    var type = this.classifySexpr(block);

    if (type === 'helper') {
      this.helperSexpr(block, program, inverse);
    } else if (type === 'simple') {
      this.simpleSexpr(block);

      // now that the simple mustache is resolved, we need to
      // evaluate it by executing `blockHelperMissing`
      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);
      this.opcode('emptyHash');
      this.opcode('blockValue', block.path.original);
    } else {
      this.ambiguousSexpr(block, program, inverse);

      // now that the simple mustache is resolved, we need to
      // evaluate it by executing `blockHelperMissing`
      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);
      this.opcode('emptyHash');
      this.opcode('ambiguousBlockValue');
    }

    this.opcode('append');
  },

  DecoratorBlock: function DecoratorBlock(decorator) {
    var program = decorator.program && this.compileProgram(decorator.program);
    var params = this.setupFullMustacheParams(decorator, program, undefined),
        path = decorator.path;

    this.useDecorators = true;
    this.opcode('registerDecorator', params.length, path.original);
  },

  PartialStatement: function PartialStatement(partial) {
    this.usePartial = true;

    var program = partial.program;
    if (program) {
      program = this.compileProgram(partial.program);
    }

    var params = partial.params;
    if (params.length > 1) {
      throw new _exception2['default']('Unsupported number of partial arguments: ' + params.length, partial);
    } else if (!params.length) {
      if (this.options.explicitPartialContext) {
        this.opcode('pushLiteral', 'undefined');
      } else {
        params.push({ type: 'PathExpression', parts: [], depth: 0 });
      }
    }

    var partialName = partial.name.original,
        isDynamic = partial.name.type === 'SubExpression';
    if (isDynamic) {
      this.accept(partial.name);
    }

    this.setupFullMustacheParams(partial, program, undefined, true);

    var indent = partial.indent || '';
    if (this.options.preventIndent && indent) {
      this.opcode('appendContent', indent);
      indent = '';
    }

    this.opcode('invokePartial', isDynamic, partialName, indent);
    this.opcode('append');
  },
  PartialBlockStatement: function PartialBlockStatement(partialBlock) {
    this.PartialStatement(partialBlock);
  },

  MustacheStatement: function MustacheStatement(mustache) {
    this.SubExpression(mustache);

    if (mustache.escaped && !this.options.noEscape) {
      this.opcode('appendEscaped');
    } else {
      this.opcode('append');
    }
  },
  Decorator: function Decorator(decorator) {
    this.DecoratorBlock(decorator);
  },

  ContentStatement: function ContentStatement(content) {
    if (content.value) {
      this.opcode('appendContent', content.value);
    }
  },

  CommentStatement: function CommentStatement() {},

  SubExpression: function SubExpression(sexpr) {
    transformLiteralToPath(sexpr);
    var type = this.classifySexpr(sexpr);

    if (type === 'simple') {
      this.simpleSexpr(sexpr);
    } else if (type === 'helper') {
      this.helperSexpr(sexpr);
    } else {
      this.ambiguousSexpr(sexpr);
    }
  },
  ambiguousSexpr: function ambiguousSexpr(sexpr, program, inverse) {
    var path = sexpr.path,
        name = path.parts[0],
        isBlock = program != null || inverse != null;

    this.opcode('getContext', path.depth);

    this.opcode('pushProgram', program);
    this.opcode('pushProgram', inverse);

    path.strict = true;
    this.accept(path);

    this.opcode('invokeAmbiguous', name, isBlock);
  },

  simpleSexpr: function simpleSexpr(sexpr) {
    var path = sexpr.path;
    path.strict = true;
    this.accept(path);
    this.opcode('resolvePossibleLambda');
  },

  helperSexpr: function helperSexpr(sexpr, program, inverse) {
    var params = this.setupFullMustacheParams(sexpr, program, inverse),
        path = sexpr.path,
        name = path.parts[0];

    if (this.options.knownHelpers[name]) {
      this.opcode('invokeKnownHelper', params.length, name);
    } else if (this.options.knownHelpersOnly) {
      throw new _exception2['default']('You specified knownHelpersOnly, but used the unknown helper ' + name, sexpr);
    } else {
      path.strict = true;
      path.falsy = true;

      this.accept(path);
      this.opcode('invokeHelper', params.length, path.original, _ast2['default'].helpers.simpleId(path));
    }
  },

  PathExpression: function PathExpression(path) {
    this.addDepth(path.depth);
    this.opcode('getContext', path.depth);

    var name = path.parts[0],
        scoped = _ast2['default'].helpers.scopedId(path),
        blockParamId = !path.depth && !scoped && this.blockParamIndex(name);

    if (blockParamId) {
      this.opcode('lookupBlockParam', blockParamId, path.parts);
    } else if (!name) {
      // Context reference, i.e. `{{foo .}}` or `{{foo ..}}`
      this.opcode('pushContext');
    } else if (path.data) {
      this.options.data = true;
      this.opcode('lookupData', path.depth, path.parts, path.strict);
    } else {
      this.opcode('lookupOnContext', path.parts, path.falsy, path.strict, scoped);
    }
  },

  StringLiteral: function StringLiteral(string) {
    this.opcode('pushString', string.value);
  },

  NumberLiteral: function NumberLiteral(number) {
    this.opcode('pushLiteral', number.value);
  },

  BooleanLiteral: function BooleanLiteral(bool) {
    this.opcode('pushLiteral', bool.value);
  },

  UndefinedLiteral: function UndefinedLiteral() {
    this.opcode('pushLiteral', 'undefined');
  },

  NullLiteral: function NullLiteral() {
    this.opcode('pushLiteral', 'null');
  },

  Hash: function Hash(hash) {
    var pairs = hash.pairs,
        i = 0,
        l = pairs.length;

    this.opcode('pushHash');

    for (; i < l; i++) {
      this.pushParam(pairs[i].value);
    }
    while (i--) {
      this.opcode('assignToHash', pairs[i].key);
    }
    this.opcode('popHash');
  },

  // HELPERS
  opcode: function opcode(name) {
    this.opcodes.push({
      opcode: name,
      args: slice.call(arguments, 1),
      loc: this.sourceNode[0].loc
    });
  },

  addDepth: function addDepth(depth) {
    if (!depth) {
      return;
    }

    this.useDepths = true;
  },

  classifySexpr: function classifySexpr(sexpr) {
    var isSimple = _ast2['default'].helpers.simpleId(sexpr.path);

    var isBlockParam = isSimple && !!this.blockParamIndex(sexpr.path.parts[0]);

    // a mustache is an eligible helper if:
    // * its id is simple (a single part, not `this` or `..`)
    var isHelper = !isBlockParam && _ast2['default'].helpers.helperExpression(sexpr);

    // if a mustache is an eligible helper but not a definite
    // helper, it is ambiguous, and will be resolved in a later
    // pass or at runtime.
    var isEligible = !isBlockParam && (isHelper || isSimple);

    // if ambiguous, we can possibly resolve the ambiguity now
    // An eligible helper is one that does not have a complex path, i.e. `this.foo`, `../foo` etc.
    if (isEligible && !isHelper) {
      var _name = sexpr.path.parts[0],
          options = this.options;
      if (options.knownHelpers[_name]) {
        isHelper = true;
      } else if (options.knownHelpersOnly) {
        isEligible = false;
      }
    }

    if (isHelper) {
      return 'helper';
    } else if (isEligible) {
      return 'ambiguous';
    } else {
      return 'simple';
    }
  },

  pushParams: function pushParams(params) {
    for (var i = 0, l = params.length; i < l; i++) {
      this.pushParam(params[i]);
    }
  },

  pushParam: function pushParam(val) {
    var value = val.value != null ? val.value : val.original || '';

    if (this.stringParams) {
      if (value.replace) {
        value = value.replace(/^(\.?\.\/)*/g, '').replace(/\//g, '.');
      }

      if (val.depth) {
        this.addDepth(val.depth);
      }
      this.opcode('getContext', val.depth || 0);
      this.opcode('pushStringParam', value, val.type);

      if (val.type === 'SubExpression') {
        // SubExpressions get evaluated and passed in
        // in string params mode.
        this.accept(val);
      }
    } else {
      if (this.trackIds) {
        var blockParamIndex = undefined;
        if (val.parts && !_ast2['default'].helpers.scopedId(val) && !val.depth) {
          blockParamIndex = this.blockParamIndex(val.parts[0]);
        }
        if (blockParamIndex) {
          var blockParamChild = val.parts.slice(1).join('.');
          this.opcode('pushId', 'BlockParam', blockParamIndex, blockParamChild);
        } else {
          value = val.original || value;
          if (value.replace) {
            value = value.replace(/^this(?:\.|$)/, '').replace(/^\.\//, '').replace(/^\.$/, '');
          }

          this.opcode('pushId', val.type, value);
        }
      }
      this.accept(val);
    }
  },

  setupFullMustacheParams: function setupFullMustacheParams(sexpr, program, inverse, omitEmpty) {
    var params = sexpr.params;
    this.pushParams(params);

    this.opcode('pushProgram', program);
    this.opcode('pushProgram', inverse);

    if (sexpr.hash) {
      this.accept(sexpr.hash);
    } else {
      this.opcode('emptyHash', omitEmpty);
    }

    return params;
  },

  blockParamIndex: function blockParamIndex(name) {
    for (var depth = 0, len = this.options.blockParams.length; depth < len; depth++) {
      var blockParams = this.options.blockParams[depth],
          param = blockParams && _utils.indexOf(blockParams, name);
      if (blockParams && param >= 0) {
        return [depth, param];
      }
    }
  }
};

function precompile(input, options, env) {
  if (input == null || typeof input !== 'string' && input.type !== 'Program') {
    throw new _exception2['default']('You must pass a string or Handlebars AST to Handlebars.precompile. You passed ' + input);
  }

  options = options || {};
  if (!('data' in options)) {
    options.data = true;
  }
  if (options.compat) {
    options.useDepths = true;
  }

  var ast = env.parse(input, options),
      environment = new env.Compiler().compile(ast, options);
  return new env.JavaScriptCompiler().compile(environment, options);
}

function compile(input, options, env) {
  if (options === undefined) options = {};

  if (input == null || typeof input !== 'string' && input.type !== 'Program') {
    throw new _exception2['default']('You must pass a string or Handlebars AST to Handlebars.compile. You passed ' + input);
  }

  options = _utils.extend({}, options);
  if (!('data' in options)) {
    options.data = true;
  }
  if (options.compat) {
    options.useDepths = true;
  }

  var compiled = undefined;

  function compileInput() {
    var ast = env.parse(input, options),
        environment = new env.Compiler().compile(ast, options),
        templateSpec = new env.JavaScriptCompiler().compile(environment, options, undefined, true);
    return env.template(templateSpec);
  }

  // Template is only compiled on first use and cached after that point.
  function ret(context, execOptions) {
    if (!compiled) {
      compiled = compileInput();
    }
    return compiled.call(this, context, execOptions);
  }
  ret._setup = function (setupOptions) {
    if (!compiled) {
      compiled = compileInput();
    }
    return compiled._setup(setupOptions);
  };
  ret._child = function (i, data, blockParams, depths) {
    if (!compiled) {
      compiled = compileInput();
    }
    return compiled._child(i, data, blockParams, depths);
  };
  return ret;
}

function argEquals(a, b) {
  if (a === b) {
    return true;
  }

  if (_utils.isArray(a) && _utils.isArray(b) && a.length === b.length) {
    for (var i = 0; i < a.length; i++) {
      if (!argEquals(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
}

function transformLiteralToPath(sexpr) {
  if (!sexpr.path.parts) {
    var literal = sexpr.path;
    // Casting to string here to make false and 0 literal values play nicely with the rest
    // of the system.
    sexpr.path = {
      type: 'PathExpression',
      data: false,
      depth: 0,
      parts: [literal.original + ''],
      original: literal.original + '',
      loc: literal.loc
    };
  }
}


},{"../exception":18,"../utils":34,"./ast":6}],10:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.SourceLocation = SourceLocation;
exports.id = id;
exports.stripFlags = stripFlags;
exports.stripComment = stripComment;
exports.preparePath = preparePath;
exports.prepareMustache = prepareMustache;
exports.prepareRawBlock = prepareRawBlock;
exports.prepareBlock = prepareBlock;
exports.prepareProgram = prepareProgram;
exports.preparePartialBlock = preparePartialBlock;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

function validateClose(open, close) {
  close = close.path ? close.path.original : close;

  if (open.path.original !== close) {
    var errorNode = { loc: open.path.loc };

    throw new _exception2['default'](open.path.original + " doesn't match " + close, errorNode);
  }
}

function SourceLocation(source, locInfo) {
  this.source = source;
  this.start = {
    line: locInfo.first_line,
    column: locInfo.first_column
  };
  this.end = {
    line: locInfo.last_line,
    column: locInfo.last_column
  };
}

function id(token) {
  if (/^\[.*\]$/.test(token)) {
    return token.substring(1, token.length - 1);
  } else {
    return token;
  }
}

function stripFlags(open, close) {
  return {
    open: open.charAt(2) === '~',
    close: close.charAt(close.length - 3) === '~'
  };
}

function stripComment(comment) {
  return comment.replace(/^\{\{~?!-?-?/, '').replace(/-?-?~?\}\}$/, '');
}

function preparePath(data, parts, loc) {
  loc = this.locInfo(loc);

  var original = data ? '@' : '',
      dig = [],
      depth = 0;

  for (var i = 0, l = parts.length; i < l; i++) {
    var part = parts[i].part,

    // If we have [] syntax then we do not treat path references as operators,
    // i.e. foo.[this] resolves to approximately context.foo['this']
    isLiteral = parts[i].original !== part;
    original += (parts[i].separator || '') + part;

    if (!isLiteral && (part === '..' || part === '.' || part === 'this')) {
      if (dig.length > 0) {
        throw new _exception2['default']('Invalid path: ' + original, { loc: loc });
      } else if (part === '..') {
        depth++;
      }
    } else {
      dig.push(part);
    }
  }

  return {
    type: 'PathExpression',
    data: data,
    depth: depth,
    parts: dig,
    original: original,
    loc: loc
  };
}

function prepareMustache(path, params, hash, open, strip, locInfo) {
  // Must use charAt to support IE pre-10
  var escapeFlag = open.charAt(3) || open.charAt(2),
      escaped = escapeFlag !== '{' && escapeFlag !== '&';

  var decorator = /\*/.test(open);
  return {
    type: decorator ? 'Decorator' : 'MustacheStatement',
    path: path,
    params: params,
    hash: hash,
    escaped: escaped,
    strip: strip,
    loc: this.locInfo(locInfo)
  };
}

function prepareRawBlock(openRawBlock, contents, close, locInfo) {
  validateClose(openRawBlock, close);

  locInfo = this.locInfo(locInfo);
  var program = {
    type: 'Program',
    body: contents,
    strip: {},
    loc: locInfo
  };

  return {
    type: 'BlockStatement',
    path: openRawBlock.path,
    params: openRawBlock.params,
    hash: openRawBlock.hash,
    program: program,
    openStrip: {},
    inverseStrip: {},
    closeStrip: {},
    loc: locInfo
  };
}

function prepareBlock(openBlock, program, inverseAndProgram, close, inverted, locInfo) {
  if (close && close.path) {
    validateClose(openBlock, close);
  }

  var decorator = /\*/.test(openBlock.open);

  program.blockParams = openBlock.blockParams;

  var inverse = undefined,
      inverseStrip = undefined;

  if (inverseAndProgram) {
    if (decorator) {
      throw new _exception2['default']('Unexpected inverse block on decorator', inverseAndProgram);
    }

    if (inverseAndProgram.chain) {
      inverseAndProgram.program.body[0].closeStrip = close.strip;
    }

    inverseStrip = inverseAndProgram.strip;
    inverse = inverseAndProgram.program;
  }

  if (inverted) {
    inverted = inverse;
    inverse = program;
    program = inverted;
  }

  return {
    type: decorator ? 'DecoratorBlock' : 'BlockStatement',
    path: openBlock.path,
    params: openBlock.params,
    hash: openBlock.hash,
    program: program,
    inverse: inverse,
    openStrip: openBlock.strip,
    inverseStrip: inverseStrip,
    closeStrip: close && close.strip,
    loc: this.locInfo(locInfo)
  };
}

function prepareProgram(statements, loc) {
  if (!loc && statements.length) {
    var firstLoc = statements[0].loc,
        lastLoc = statements[statements.length - 1].loc;

    /* istanbul ignore else */
    if (firstLoc && lastLoc) {
      loc = {
        source: firstLoc.source,
        start: {
          line: firstLoc.start.line,
          column: firstLoc.start.column
        },
        end: {
          line: lastLoc.end.line,
          column: lastLoc.end.column
        }
      };
    }
  }

  return {
    type: 'Program',
    body: statements,
    strip: {},
    loc: loc
  };
}

function preparePartialBlock(open, program, close, locInfo) {
  validateClose(open, close);

  return {
    type: 'PartialBlockStatement',
    name: open.path,
    params: open.params,
    hash: open.hash,
    program: program,
    openStrip: open.strip,
    closeStrip: close && close.strip,
    loc: this.locInfo(locInfo)
  };
}


},{"../exception":18}],11:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _base = require('../base');

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

var _utils = require('../utils');

var _codeGen = require('./code-gen');

var _codeGen2 = _interopRequireDefault(_codeGen);

function Literal(value) {
  this.value = value;
}

function JavaScriptCompiler() {}

JavaScriptCompiler.prototype = {
  // PUBLIC API: You can override these methods in a subclass to provide
  // alternative compiled forms for name lookup and buffering semantics
  nameLookup: function nameLookup(parent, name /*,  type */) {
    return this.internalNameLookup(parent, name);
  },
  depthedLookup: function depthedLookup(name) {
    return [this.aliasable('container.lookup'), '(depths, ', JSON.stringify(name), ')'];
  },

  compilerInfo: function compilerInfo() {
    var revision = _base.COMPILER_REVISION,
        versions = _base.REVISION_CHANGES[revision];
    return [revision, versions];
  },

  appendToBuffer: function appendToBuffer(source, location, explicit) {
    // Force a source as this simplifies the merge logic.
    if (!_utils.isArray(source)) {
      source = [source];
    }
    source = this.source.wrap(source, location);

    if (this.environment.isSimple) {
      return ['return ', source, ';'];
    } else if (explicit) {
      // This is a case where the buffer operation occurs as a child of another
      // construct, generally braces. We have to explicitly output these buffer
      // operations to ensure that the emitted code goes in the correct location.
      return ['buffer += ', source, ';'];
    } else {
      source.appendToBuffer = true;
      return source;
    }
  },

  initializeBuffer: function initializeBuffer() {
    return this.quotedString('');
  },
  // END PUBLIC API
  internalNameLookup: function internalNameLookup(parent, name) {
    this.lookupPropertyFunctionIsUsed = true;
    return ['lookupProperty(', parent, ',', JSON.stringify(name), ')'];
  },

  lookupPropertyFunctionIsUsed: false,

  compile: function compile(environment, options, context, asObject) {
    this.environment = environment;
    this.options = options;
    this.stringParams = this.options.stringParams;
    this.trackIds = this.options.trackIds;
    this.precompile = !asObject;

    this.name = this.environment.name;
    this.isChild = !!context;
    this.context = context || {
      decorators: [],
      programs: [],
      environments: []
    };

    this.preamble();

    this.stackSlot = 0;
    this.stackVars = [];
    this.aliases = {};
    this.registers = { list: [] };
    this.hashes = [];
    this.compileStack = [];
    this.inlineStack = [];
    this.blockParams = [];

    this.compileChildren(environment, options);

    this.useDepths = this.useDepths || environment.useDepths || environment.useDecorators || this.options.compat;
    this.useBlockParams = this.useBlockParams || environment.useBlockParams;

    var opcodes = environment.opcodes,
        opcode = undefined,
        firstLoc = undefined,
        i = undefined,
        l = undefined;

    for (i = 0, l = opcodes.length; i < l; i++) {
      opcode = opcodes[i];

      this.source.currentLocation = opcode.loc;
      firstLoc = firstLoc || opcode.loc;
      this[opcode.opcode].apply(this, opcode.args);
    }

    // Flush any trailing content that might be pending.
    this.source.currentLocation = firstLoc;
    this.pushSource('');

    /* istanbul ignore next */
    if (this.stackSlot || this.inlineStack.length || this.compileStack.length) {
      throw new _exception2['default']('Compile completed with content left on stack');
    }

    if (!this.decorators.isEmpty()) {
      this.useDecorators = true;

      this.decorators.prepend(['var decorators = container.decorators, ', this.lookupPropertyFunctionVarDeclaration(), ';\n']);
      this.decorators.push('return fn;');

      if (asObject) {
        this.decorators = Function.apply(this, ['fn', 'props', 'container', 'depth0', 'data', 'blockParams', 'depths', this.decorators.merge()]);
      } else {
        this.decorators.prepend('function(fn, props, container, depth0, data, blockParams, depths) {\n');
        this.decorators.push('}\n');
        this.decorators = this.decorators.merge();
      }
    } else {
      this.decorators = undefined;
    }

    var fn = this.createFunctionContext(asObject);
    if (!this.isChild) {
      var ret = {
        compiler: this.compilerInfo(),
        main: fn
      };

      if (this.decorators) {
        ret.main_d = this.decorators; // eslint-disable-line camelcase
        ret.useDecorators = true;
      }

      var _context = this.context;
      var programs = _context.programs;
      var decorators = _context.decorators;

      for (i = 0, l = programs.length; i < l; i++) {
        if (programs[i]) {
          ret[i] = programs[i];
          if (decorators[i]) {
            ret[i + '_d'] = decorators[i];
            ret.useDecorators = true;
          }
        }
      }

      if (this.environment.usePartial) {
        ret.usePartial = true;
      }
      if (this.options.data) {
        ret.useData = true;
      }
      if (this.useDepths) {
        ret.useDepths = true;
      }
      if (this.useBlockParams) {
        ret.useBlockParams = true;
      }
      if (this.options.compat) {
        ret.compat = true;
      }

      if (!asObject) {
        ret.compiler = JSON.stringify(ret.compiler);

        this.source.currentLocation = { start: { line: 1, column: 0 } };
        ret = this.objectLiteral(ret);

        if (options.srcName) {
          ret = ret.toStringWithSourceMap({ file: options.destName });
          ret.map = ret.map && ret.map.toString();
        } else {
          ret = ret.toString();
        }
      } else {
        ret.compilerOptions = this.options;
      }

      return ret;
    } else {
      return fn;
    }
  },

  preamble: function preamble() {
    // track the last context pushed into place to allow skipping the
    // getContext opcode when it would be a noop
    this.lastContext = 0;
    this.source = new _codeGen2['default'](this.options.srcName);
    this.decorators = new _codeGen2['default'](this.options.srcName);
  },

  createFunctionContext: function createFunctionContext(asObject) {
    // istanbul ignore next

    var _this = this;

    var varDeclarations = '';

    var locals = this.stackVars.concat(this.registers.list);
    if (locals.length > 0) {
      varDeclarations += ', ' + locals.join(', ');
    }

    // Generate minimizer alias mappings
    //
    // When using true SourceNodes, this will update all references to the given alias
    // as the source nodes are reused in situ. For the non-source node compilation mode,
    // aliases will not be used, but this case is already being run on the client and
    // we aren't concern about minimizing the template size.
    var aliasCount = 0;
    Object.keys(this.aliases).forEach(function (alias) {
      var node = _this.aliases[alias];
      if (node.children && node.referenceCount > 1) {
        varDeclarations += ', alias' + ++aliasCount + '=' + alias;
        node.children[0] = 'alias' + aliasCount;
      }
    });

    if (this.lookupPropertyFunctionIsUsed) {
      varDeclarations += ', ' + this.lookupPropertyFunctionVarDeclaration();
    }

    var params = ['container', 'depth0', 'helpers', 'partials', 'data'];

    if (this.useBlockParams || this.useDepths) {
      params.push('blockParams');
    }
    if (this.useDepths) {
      params.push('depths');
    }

    // Perform a second pass over the output to merge content when possible
    var source = this.mergeSource(varDeclarations);

    if (asObject) {
      params.push(source);

      return Function.apply(this, params);
    } else {
      return this.source.wrap(['function(', params.join(','), ') {\n  ', source, '}']);
    }
  },
  mergeSource: function mergeSource(varDeclarations) {
    var isSimple = this.environment.isSimple,
        appendOnly = !this.forceBuffer,
        appendFirst = undefined,
        sourceSeen = undefined,
        bufferStart = undefined,
        bufferEnd = undefined;
    this.source.each(function (line) {
      if (line.appendToBuffer) {
        if (bufferStart) {
          line.prepend('  + ');
        } else {
          bufferStart = line;
        }
        bufferEnd = line;
      } else {
        if (bufferStart) {
          if (!sourceSeen) {
            appendFirst = true;
          } else {
            bufferStart.prepend('buffer += ');
          }
          bufferEnd.add(';');
          bufferStart = bufferEnd = undefined;
        }

        sourceSeen = true;
        if (!isSimple) {
          appendOnly = false;
        }
      }
    });

    if (appendOnly) {
      if (bufferStart) {
        bufferStart.prepend('return ');
        bufferEnd.add(';');
      } else if (!sourceSeen) {
        this.source.push('return "";');
      }
    } else {
      varDeclarations += ', buffer = ' + (appendFirst ? '' : this.initializeBuffer());

      if (bufferStart) {
        bufferStart.prepend('return buffer + ');
        bufferEnd.add(';');
      } else {
        this.source.push('return buffer;');
      }
    }

    if (varDeclarations) {
      this.source.prepend('var ' + varDeclarations.substring(2) + (appendFirst ? '' : ';\n'));
    }

    return this.source.merge();
  },

  lookupPropertyFunctionVarDeclaration: function lookupPropertyFunctionVarDeclaration() {
    return '\n      lookupProperty = container.lookupProperty || function(parent, propertyName) {\n        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {\n          return parent[propertyName];\n        }\n        return undefined\n    }\n    '.trim();
  },

  // [blockValue]
  //
  // On stack, before: hash, inverse, program, value
  // On stack, after: return value of blockHelperMissing
  //
  // The purpose of this opcode is to take a block of the form
  // `{{#this.foo}}...{{/this.foo}}`, resolve the value of `foo`, and
  // replace it on the stack with the result of properly
  // invoking blockHelperMissing.
  blockValue: function blockValue(name) {
    var blockHelperMissing = this.aliasable('container.hooks.blockHelperMissing'),
        params = [this.contextName(0)];
    this.setupHelperArgs(name, 0, params);

    var blockName = this.popStack();
    params.splice(1, 0, blockName);

    this.push(this.source.functionCall(blockHelperMissing, 'call', params));
  },

  // [ambiguousBlockValue]
  //
  // On stack, before: hash, inverse, program, value
  // Compiler value, before: lastHelper=value of last found helper, if any
  // On stack, after, if no lastHelper: same as [blockValue]
  // On stack, after, if lastHelper: value
  ambiguousBlockValue: function ambiguousBlockValue() {
    // We're being a bit cheeky and reusing the options value from the prior exec
    var blockHelperMissing = this.aliasable('container.hooks.blockHelperMissing'),
        params = [this.contextName(0)];
    this.setupHelperArgs('', 0, params, true);

    this.flushInline();

    var current = this.topStack();
    params.splice(1, 0, current);

    this.pushSource(['if (!', this.lastHelper, ') { ', current, ' = ', this.source.functionCall(blockHelperMissing, 'call', params), '}']);
  },

  // [appendContent]
  //
  // On stack, before: ...
  // On stack, after: ...
  //
  // Appends the string value of `content` to the current buffer
  appendContent: function appendContent(content) {
    if (this.pendingContent) {
      content = this.pendingContent + content;
    } else {
      this.pendingLocation = this.source.currentLocation;
    }

    this.pendingContent = content;
  },

  // [append]
  //
  // On stack, before: value, ...
  // On stack, after: ...
  //
  // Coerces `value` to a String and appends it to the current buffer.
  //
  // If `value` is truthy, or 0, it is coerced into a string and appended
  // Otherwise, the empty string is appended
  append: function append() {
    if (this.isInline()) {
      this.replaceStack(function (current) {
        return [' != null ? ', current, ' : ""'];
      });

      this.pushSource(this.appendToBuffer(this.popStack()));
    } else {
      var local = this.popStack();
      this.pushSource(['if (', local, ' != null) { ', this.appendToBuffer(local, undefined, true), ' }']);
      if (this.environment.isSimple) {
        this.pushSource(['else { ', this.appendToBuffer("''", undefined, true), ' }']);
      }
    }
  },

  // [appendEscaped]
  //
  // On stack, before: value, ...
  // On stack, after: ...
  //
  // Escape `value` and append it to the buffer
  appendEscaped: function appendEscaped() {
    this.pushSource(this.appendToBuffer([this.aliasable('container.escapeExpression'), '(', this.popStack(), ')']));
  },

  // [getContext]
  //
  // On stack, before: ...
  // On stack, after: ...
  // Compiler value, after: lastContext=depth
  //
  // Set the value of the `lastContext` compiler value to the depth
  getContext: function getContext(depth) {
    this.lastContext = depth;
  },

  // [pushContext]
  //
  // On stack, before: ...
  // On stack, after: currentContext, ...
  //
  // Pushes the value of the current context onto the stack.
  pushContext: function pushContext() {
    this.pushStackLiteral(this.contextName(this.lastContext));
  },

  // [lookupOnContext]
  //
  // On stack, before: ...
  // On stack, after: currentContext[name], ...
  //
  // Looks up the value of `name` on the current context and pushes
  // it onto the stack.
  lookupOnContext: function lookupOnContext(parts, falsy, strict, scoped) {
    var i = 0;

    if (!scoped && this.options.compat && !this.lastContext) {
      // The depthed query is expected to handle the undefined logic for the root level that
      // is implemented below, so we evaluate that directly in compat mode
      this.push(this.depthedLookup(parts[i++]));
    } else {
      this.pushContext();
    }

    this.resolvePath('context', parts, i, falsy, strict);
  },

  // [lookupBlockParam]
  //
  // On stack, before: ...
  // On stack, after: blockParam[name], ...
  //
  // Looks up the value of `parts` on the given block param and pushes
  // it onto the stack.
  lookupBlockParam: function lookupBlockParam(blockParamId, parts) {
    this.useBlockParams = true;

    this.push(['blockParams[', blockParamId[0], '][', blockParamId[1], ']']);
    this.resolvePath('context', parts, 1);
  },

  // [lookupData]
  //
  // On stack, before: ...
  // On stack, after: data, ...
  //
  // Push the data lookup operator
  lookupData: function lookupData(depth, parts, strict) {
    if (!depth) {
      this.pushStackLiteral('data');
    } else {
      this.pushStackLiteral('container.data(data, ' + depth + ')');
    }

    this.resolvePath('data', parts, 0, true, strict);
  },

  resolvePath: function resolvePath(type, parts, i, falsy, strict) {
    // istanbul ignore next

    var _this2 = this;

    if (this.options.strict || this.options.assumeObjects) {
      this.push(strictLookup(this.options.strict && strict, this, parts, type));
      return;
    }

    var len = parts.length;
    for (; i < len; i++) {
      /* eslint-disable no-loop-func */
      this.replaceStack(function (current) {
        var lookup = _this2.nameLookup(current, parts[i], type);
        // We want to ensure that zero and false are handled properly if the context (falsy flag)
        // needs to have the special handling for these values.
        if (!falsy) {
          return [' != null ? ', lookup, ' : ', current];
        } else {
          // Otherwise we can use generic falsy handling
          return [' && ', lookup];
        }
      });
      /* eslint-enable no-loop-func */
    }
  },

  // [resolvePossibleLambda]
  //
  // On stack, before: value, ...
  // On stack, after: resolved value, ...
  //
  // If the `value` is a lambda, replace it on the stack by
  // the return value of the lambda
  resolvePossibleLambda: function resolvePossibleLambda() {
    this.push([this.aliasable('container.lambda'), '(', this.popStack(), ', ', this.contextName(0), ')']);
  },

  // [pushStringParam]
  //
  // On stack, before: ...
  // On stack, after: string, currentContext, ...
  //
  // This opcode is designed for use in string mode, which
  // provides the string value of a parameter along with its
  // depth rather than resolving it immediately.
  pushStringParam: function pushStringParam(string, type) {
    this.pushContext();
    this.pushString(type);

    // If it's a subexpression, the string result
    // will be pushed after this opcode.
    if (type !== 'SubExpression') {
      if (typeof string === 'string') {
        this.pushString(string);
      } else {
        this.pushStackLiteral(string);
      }
    }
  },

  emptyHash: function emptyHash(omitEmpty) {
    if (this.trackIds) {
      this.push('{}'); // hashIds
    }
    if (this.stringParams) {
      this.push('{}'); // hashContexts
      this.push('{}'); // hashTypes
    }
    this.pushStackLiteral(omitEmpty ? 'undefined' : '{}');
  },
  pushHash: function pushHash() {
    if (this.hash) {
      this.hashes.push(this.hash);
    }
    this.hash = { values: {}, types: [], contexts: [], ids: [] };
  },
  popHash: function popHash() {
    var hash = this.hash;
    this.hash = this.hashes.pop();

    if (this.trackIds) {
      this.push(this.objectLiteral(hash.ids));
    }
    if (this.stringParams) {
      this.push(this.objectLiteral(hash.contexts));
      this.push(this.objectLiteral(hash.types));
    }

    this.push(this.objectLiteral(hash.values));
  },

  // [pushString]
  //
  // On stack, before: ...
  // On stack, after: quotedString(string), ...
  //
  // Push a quoted version of `string` onto the stack
  pushString: function pushString(string) {
    this.pushStackLiteral(this.quotedString(string));
  },

  // [pushLiteral]
  //
  // On stack, before: ...
  // On stack, after: value, ...
  //
  // Pushes a value onto the stack. This operation prevents
  // the compiler from creating a temporary variable to hold
  // it.
  pushLiteral: function pushLiteral(value) {
    this.pushStackLiteral(value);
  },

  // [pushProgram]
  //
  // On stack, before: ...
  // On stack, after: program(guid), ...
  //
  // Push a program expression onto the stack. This takes
  // a compile-time guid and converts it into a runtime-accessible
  // expression.
  pushProgram: function pushProgram(guid) {
    if (guid != null) {
      this.pushStackLiteral(this.programExpression(guid));
    } else {
      this.pushStackLiteral(null);
    }
  },

  // [registerDecorator]
  //
  // On stack, before: hash, program, params..., ...
  // On stack, after: ...
  //
  // Pops off the decorator's parameters, invokes the decorator,
  // and inserts the decorator into the decorators list.
  registerDecorator: function registerDecorator(paramSize, name) {
    var foundDecorator = this.nameLookup('decorators', name, 'decorator'),
        options = this.setupHelperArgs(name, paramSize);

    this.decorators.push(['fn = ', this.decorators.functionCall(foundDecorator, '', ['fn', 'props', 'container', options]), ' || fn;']);
  },

  // [invokeHelper]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of helper invocation
  //
  // Pops off the helper's parameters, invokes the helper,
  // and pushes the helper's return value onto the stack.
  //
  // If the helper is not found, `helperMissing` is called.
  invokeHelper: function invokeHelper(paramSize, name, isSimple) {
    var nonHelper = this.popStack(),
        helper = this.setupHelper(paramSize, name);

    var possibleFunctionCalls = [];

    if (isSimple) {
      // direct call to helper
      possibleFunctionCalls.push(helper.name);
    }
    // call a function from the input object
    possibleFunctionCalls.push(nonHelper);
    if (!this.options.strict) {
      possibleFunctionCalls.push(this.aliasable('container.hooks.helperMissing'));
    }

    var functionLookupCode = ['(', this.itemsSeparatedBy(possibleFunctionCalls, '||'), ')'];
    var functionCall = this.source.functionCall(functionLookupCode, 'call', helper.callParams);
    this.push(functionCall);
  },

  itemsSeparatedBy: function itemsSeparatedBy(items, separator) {
    var result = [];
    result.push(items[0]);
    for (var i = 1; i < items.length; i++) {
      result.push(separator, items[i]);
    }
    return result;
  },
  // [invokeKnownHelper]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of helper invocation
  //
  // This operation is used when the helper is known to exist,
  // so a `helperMissing` fallback is not required.
  invokeKnownHelper: function invokeKnownHelper(paramSize, name) {
    var helper = this.setupHelper(paramSize, name);
    this.push(this.source.functionCall(helper.name, 'call', helper.callParams));
  },

  // [invokeAmbiguous]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of disambiguation
  //
  // This operation is used when an expression like `{{foo}}`
  // is provided, but we don't know at compile-time whether it
  // is a helper or a path.
  //
  // This operation emits more code than the other options,
  // and can be avoided by passing the `knownHelpers` and
  // `knownHelpersOnly` flags at compile-time.
  invokeAmbiguous: function invokeAmbiguous(name, helperCall) {
    this.useRegister('helper');

    var nonHelper = this.popStack();

    this.emptyHash();
    var helper = this.setupHelper(0, name, helperCall);

    var helperName = this.lastHelper = this.nameLookup('helpers', name, 'helper');

    var lookup = ['(', '(helper = ', helperName, ' || ', nonHelper, ')'];
    if (!this.options.strict) {
      lookup[0] = '(helper = ';
      lookup.push(' != null ? helper : ', this.aliasable('container.hooks.helperMissing'));
    }

    this.push(['(', lookup, helper.paramsInit ? ['),(', helper.paramsInit] : [], '),', '(typeof helper === ', this.aliasable('"function"'), ' ? ', this.source.functionCall('helper', 'call', helper.callParams), ' : helper))']);
  },

  // [invokePartial]
  //
  // On stack, before: context, ...
  // On stack after: result of partial invocation
  //
  // This operation pops off a context, invokes a partial with that context,
  // and pushes the result of the invocation back.
  invokePartial: function invokePartial(isDynamic, name, indent) {
    var params = [],
        options = this.setupParams(name, 1, params);

    if (isDynamic) {
      name = this.popStack();
      delete options.name;
    }

    if (indent) {
      options.indent = JSON.stringify(indent);
    }
    options.helpers = 'helpers';
    options.partials = 'partials';
    options.decorators = 'container.decorators';

    if (!isDynamic) {
      params.unshift(this.nameLookup('partials', name, 'partial'));
    } else {
      params.unshift(name);
    }

    if (this.options.compat) {
      options.depths = 'depths';
    }
    options = this.objectLiteral(options);
    params.push(options);

    this.push(this.source.functionCall('container.invokePartial', '', params));
  },

  // [assignToHash]
  //
  // On stack, before: value, ..., hash, ...
  // On stack, after: ..., hash, ...
  //
  // Pops a value off the stack and assigns it to the current hash
  assignToHash: function assignToHash(key) {
    var value = this.popStack(),
        context = undefined,
        type = undefined,
        id = undefined;

    if (this.trackIds) {
      id = this.popStack();
    }
    if (this.stringParams) {
      type = this.popStack();
      context = this.popStack();
    }

    var hash = this.hash;
    if (context) {
      hash.contexts[key] = context;
    }
    if (type) {
      hash.types[key] = type;
    }
    if (id) {
      hash.ids[key] = id;
    }
    hash.values[key] = value;
  },

  pushId: function pushId(type, name, child) {
    if (type === 'BlockParam') {
      this.pushStackLiteral('blockParams[' + name[0] + '].path[' + name[1] + ']' + (child ? ' + ' + JSON.stringify('.' + child) : ''));
    } else if (type === 'PathExpression') {
      this.pushString(name);
    } else if (type === 'SubExpression') {
      this.pushStackLiteral('true');
    } else {
      this.pushStackLiteral('null');
    }
  },

  // HELPERS

  compiler: JavaScriptCompiler,

  compileChildren: function compileChildren(environment, options) {
    var children = environment.children,
        child = undefined,
        compiler = undefined;

    for (var i = 0, l = children.length; i < l; i++) {
      child = children[i];
      compiler = new this.compiler(); // eslint-disable-line new-cap

      var existing = this.matchExistingProgram(child);

      if (existing == null) {
        this.context.programs.push(''); // Placeholder to prevent name conflicts for nested children
        var index = this.context.programs.length;
        child.index = index;
        child.name = 'program' + index;
        this.context.programs[index] = compiler.compile(child, options, this.context, !this.precompile);
        this.context.decorators[index] = compiler.decorators;
        this.context.environments[index] = child;

        this.useDepths = this.useDepths || compiler.useDepths;
        this.useBlockParams = this.useBlockParams || compiler.useBlockParams;
        child.useDepths = this.useDepths;
        child.useBlockParams = this.useBlockParams;
      } else {
        child.index = existing.index;
        child.name = 'program' + existing.index;

        this.useDepths = this.useDepths || existing.useDepths;
        this.useBlockParams = this.useBlockParams || existing.useBlockParams;
      }
    }
  },
  matchExistingProgram: function matchExistingProgram(child) {
    for (var i = 0, len = this.context.environments.length; i < len; i++) {
      var environment = this.context.environments[i];
      if (environment && environment.equals(child)) {
        return environment;
      }
    }
  },

  programExpression: function programExpression(guid) {
    var child = this.environment.children[guid],
        programParams = [child.index, 'data', child.blockParams];

    if (this.useBlockParams || this.useDepths) {
      programParams.push('blockParams');
    }
    if (this.useDepths) {
      programParams.push('depths');
    }

    return 'container.program(' + programParams.join(', ') + ')';
  },

  useRegister: function useRegister(name) {
    if (!this.registers[name]) {
      this.registers[name] = true;
      this.registers.list.push(name);
    }
  },

  push: function push(expr) {
    if (!(expr instanceof Literal)) {
      expr = this.source.wrap(expr);
    }

    this.inlineStack.push(expr);
    return expr;
  },

  pushStackLiteral: function pushStackLiteral(item) {
    this.push(new Literal(item));
  },

  pushSource: function pushSource(source) {
    if (this.pendingContent) {
      this.source.push(this.appendToBuffer(this.source.quotedString(this.pendingContent), this.pendingLocation));
      this.pendingContent = undefined;
    }

    if (source) {
      this.source.push(source);
    }
  },

  replaceStack: function replaceStack(callback) {
    var prefix = ['('],
        stack = undefined,
        createdStack = undefined,
        usedLiteral = undefined;

    /* istanbul ignore next */
    if (!this.isInline()) {
      throw new _exception2['default']('replaceStack on non-inline');
    }

    // We want to merge the inline statement into the replacement statement via ','
    var top = this.popStack(true);

    if (top instanceof Literal) {
      // Literals do not need to be inlined
      stack = [top.value];
      prefix = ['(', stack];
      usedLiteral = true;
    } else {
      // Get or create the current stack name for use by the inline
      createdStack = true;
      var _name = this.incrStack();

      prefix = ['((', this.push(_name), ' = ', top, ')'];
      stack = this.topStack();
    }

    var item = callback.call(this, stack);

    if (!usedLiteral) {
      this.popStack();
    }
    if (createdStack) {
      this.stackSlot--;
    }
    this.push(prefix.concat(item, ')'));
  },

  incrStack: function incrStack() {
    this.stackSlot++;
    if (this.stackSlot > this.stackVars.length) {
      this.stackVars.push('stack' + this.stackSlot);
    }
    return this.topStackName();
  },
  topStackName: function topStackName() {
    return 'stack' + this.stackSlot;
  },
  flushInline: function flushInline() {
    var inlineStack = this.inlineStack;
    this.inlineStack = [];
    for (var i = 0, len = inlineStack.length; i < len; i++) {
      var entry = inlineStack[i];
      /* istanbul ignore if */
      if (entry instanceof Literal) {
        this.compileStack.push(entry);
      } else {
        var stack = this.incrStack();
        this.pushSource([stack, ' = ', entry, ';']);
        this.compileStack.push(stack);
      }
    }
  },
  isInline: function isInline() {
    return this.inlineStack.length;
  },

  popStack: function popStack(wrapped) {
    var inline = this.isInline(),
        item = (inline ? this.inlineStack : this.compileStack).pop();

    if (!wrapped && item instanceof Literal) {
      return item.value;
    } else {
      if (!inline) {
        /* istanbul ignore next */
        if (!this.stackSlot) {
          throw new _exception2['default']('Invalid stack pop');
        }
        this.stackSlot--;
      }
      return item;
    }
  },

  topStack: function topStack() {
    var stack = this.isInline() ? this.inlineStack : this.compileStack,
        item = stack[stack.length - 1];

    /* istanbul ignore if */
    if (item instanceof Literal) {
      return item.value;
    } else {
      return item;
    }
  },

  contextName: function contextName(context) {
    if (this.useDepths && context) {
      return 'depths[' + context + ']';
    } else {
      return 'depth' + context;
    }
  },

  quotedString: function quotedString(str) {
    return this.source.quotedString(str);
  },

  objectLiteral: function objectLiteral(obj) {
    return this.source.objectLiteral(obj);
  },

  aliasable: function aliasable(name) {
    var ret = this.aliases[name];
    if (ret) {
      ret.referenceCount++;
      return ret;
    }

    ret = this.aliases[name] = this.source.wrap(name);
    ret.aliasable = true;
    ret.referenceCount = 1;

    return ret;
  },

  setupHelper: function setupHelper(paramSize, name, blockHelper) {
    var params = [],
        paramsInit = this.setupHelperArgs(name, paramSize, params, blockHelper);
    var foundHelper = this.nameLookup('helpers', name, 'helper'),
        callContext = this.aliasable(this.contextName(0) + ' != null ? ' + this.contextName(0) + ' : (container.nullContext || {})');

    return {
      params: params,
      paramsInit: paramsInit,
      name: foundHelper,
      callParams: [callContext].concat(params)
    };
  },

  setupParams: function setupParams(helper, paramSize, params) {
    var options = {},
        contexts = [],
        types = [],
        ids = [],
        objectArgs = !params,
        param = undefined;

    if (objectArgs) {
      params = [];
    }

    options.name = this.quotedString(helper);
    options.hash = this.popStack();

    if (this.trackIds) {
      options.hashIds = this.popStack();
    }
    if (this.stringParams) {
      options.hashTypes = this.popStack();
      options.hashContexts = this.popStack();
    }

    var inverse = this.popStack(),
        program = this.popStack();

    // Avoid setting fn and inverse if neither are set. This allows
    // helpers to do a check for `if (options.fn)`
    if (program || inverse) {
      options.fn = program || 'container.noop';
      options.inverse = inverse || 'container.noop';
    }

    // The parameters go on to the stack in order (making sure that they are evaluated in order)
    // so we need to pop them off the stack in reverse order
    var i = paramSize;
    while (i--) {
      param = this.popStack();
      params[i] = param;

      if (this.trackIds) {
        ids[i] = this.popStack();
      }
      if (this.stringParams) {
        types[i] = this.popStack();
        contexts[i] = this.popStack();
      }
    }

    if (objectArgs) {
      options.args = this.source.generateArray(params);
    }

    if (this.trackIds) {
      options.ids = this.source.generateArray(ids);
    }
    if (this.stringParams) {
      options.types = this.source.generateArray(types);
      options.contexts = this.source.generateArray(contexts);
    }

    if (this.options.data) {
      options.data = 'data';
    }
    if (this.useBlockParams) {
      options.blockParams = 'blockParams';
    }
    return options;
  },

  setupHelperArgs: function setupHelperArgs(helper, paramSize, params, useRegister) {
    var options = this.setupParams(helper, paramSize, params);
    options.loc = JSON.stringify(this.source.currentLocation);
    options = this.objectLiteral(options);
    if (useRegister) {
      this.useRegister('options');
      params.push('options');
      return ['options=', options];
    } else if (params) {
      params.push(options);
      return '';
    } else {
      return options;
    }
  }
};

(function () {
  var reservedWords = ('break else new var' + ' case finally return void' + ' catch for switch while' + ' continue function this with' + ' default if throw' + ' delete in try' + ' do instanceof typeof' + ' abstract enum int short' + ' boolean export interface static' + ' byte extends long super' + ' char final native synchronized' + ' class float package throws' + ' const goto private transient' + ' debugger implements protected volatile' + ' double import public let yield await' + ' null true false').split(' ');

  var compilerWords = JavaScriptCompiler.RESERVED_WORDS = {};

  for (var i = 0, l = reservedWords.length; i < l; i++) {
    compilerWords[reservedWords[i]] = true;
  }
})();

/**
 * @deprecated May be removed in the next major version
 */
JavaScriptCompiler.isValidJavaScriptVariableName = function (name) {
  return !JavaScriptCompiler.RESERVED_WORDS[name] && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name);
};

function strictLookup(requireTerminal, compiler, parts, type) {
  var stack = compiler.popStack(),
      i = 0,
      len = parts.length;
  if (requireTerminal) {
    len--;
  }

  for (; i < len; i++) {
    stack = compiler.nameLookup(stack, parts[i], type);
  }

  if (requireTerminal) {
    return [compiler.aliasable('container.strict'), '(', stack, ', ', compiler.quotedString(parts[i]), ', ', JSON.stringify(compiler.source.currentLocation), ' )'];
  } else {
    return stack;
  }
}

exports['default'] = JavaScriptCompiler;
module.exports = exports['default'];


},{"../base":5,"../exception":18,"../utils":34,"./code-gen":8}],12:[function(require,module,exports){
// File ignored in coverage tests via setting in .istanbul.yml
/* Jison generated parser */
"use strict";

exports.__esModule = true;
var handlebars = (function () {
    var parser = { trace: function trace() {},
        yy: {},
        symbols_: { "error": 2, "root": 3, "program": 4, "EOF": 5, "program_repetition0": 6, "statement": 7, "mustache": 8, "block": 9, "rawBlock": 10, "partial": 11, "partialBlock": 12, "content": 13, "COMMENT": 14, "CONTENT": 15, "openRawBlock": 16, "rawBlock_repetition0": 17, "END_RAW_BLOCK": 18, "OPEN_RAW_BLOCK": 19, "helperName": 20, "openRawBlock_repetition0": 21, "openRawBlock_option0": 22, "CLOSE_RAW_BLOCK": 23, "openBlock": 24, "block_option0": 25, "closeBlock": 26, "openInverse": 27, "block_option1": 28, "OPEN_BLOCK": 29, "openBlock_repetition0": 30, "openBlock_option0": 31, "openBlock_option1": 32, "CLOSE": 33, "OPEN_INVERSE": 34, "openInverse_repetition0": 35, "openInverse_option0": 36, "openInverse_option1": 37, "openInverseChain": 38, "OPEN_INVERSE_CHAIN": 39, "openInverseChain_repetition0": 40, "openInverseChain_option0": 41, "openInverseChain_option1": 42, "inverseAndProgram": 43, "INVERSE": 44, "inverseChain": 45, "inverseChain_option0": 46, "OPEN_ENDBLOCK": 47, "OPEN": 48, "mustache_repetition0": 49, "mustache_option0": 50, "OPEN_UNESCAPED": 51, "mustache_repetition1": 52, "mustache_option1": 53, "CLOSE_UNESCAPED": 54, "OPEN_PARTIAL": 55, "partialName": 56, "partial_repetition0": 57, "partial_option0": 58, "openPartialBlock": 59, "OPEN_PARTIAL_BLOCK": 60, "openPartialBlock_repetition0": 61, "openPartialBlock_option0": 62, "param": 63, "sexpr": 64, "OPEN_SEXPR": 65, "sexpr_repetition0": 66, "sexpr_option0": 67, "CLOSE_SEXPR": 68, "hash": 69, "hash_repetition_plus0": 70, "hashSegment": 71, "ID": 72, "EQUALS": 73, "blockParams": 74, "OPEN_BLOCK_PARAMS": 75, "blockParams_repetition_plus0": 76, "CLOSE_BLOCK_PARAMS": 77, "path": 78, "dataName": 79, "STRING": 80, "NUMBER": 81, "BOOLEAN": 82, "UNDEFINED": 83, "NULL": 84, "DATA": 85, "pathSegments": 86, "SEP": 87, "$accept": 0, "$end": 1 },
        terminals_: { 2: "error", 5: "EOF", 14: "COMMENT", 15: "CONTENT", 18: "END_RAW_BLOCK", 19: "OPEN_RAW_BLOCK", 23: "CLOSE_RAW_BLOCK", 29: "OPEN_BLOCK", 33: "CLOSE", 34: "OPEN_INVERSE", 39: "OPEN_INVERSE_CHAIN", 44: "INVERSE", 47: "OPEN_ENDBLOCK", 48: "OPEN", 51: "OPEN_UNESCAPED", 54: "CLOSE_UNESCAPED", 55: "OPEN_PARTIAL", 60: "OPEN_PARTIAL_BLOCK", 65: "OPEN_SEXPR", 68: "CLOSE_SEXPR", 72: "ID", 73: "EQUALS", 75: "OPEN_BLOCK_PARAMS", 77: "CLOSE_BLOCK_PARAMS", 80: "STRING", 81: "NUMBER", 82: "BOOLEAN", 83: "UNDEFINED", 84: "NULL", 85: "DATA", 87: "SEP" },
        productions_: [0, [3, 2], [4, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [13, 1], [10, 3], [16, 5], [9, 4], [9, 4], [24, 6], [27, 6], [38, 6], [43, 2], [45, 3], [45, 1], [26, 3], [8, 5], [8, 5], [11, 5], [12, 3], [59, 5], [63, 1], [63, 1], [64, 5], [69, 1], [71, 3], [74, 3], [20, 1], [20, 1], [20, 1], [20, 1], [20, 1], [20, 1], [20, 1], [56, 1], [56, 1], [79, 2], [78, 1], [86, 3], [86, 1], [6, 0], [6, 2], [17, 0], [17, 2], [21, 0], [21, 2], [22, 0], [22, 1], [25, 0], [25, 1], [28, 0], [28, 1], [30, 0], [30, 2], [31, 0], [31, 1], [32, 0], [32, 1], [35, 0], [35, 2], [36, 0], [36, 1], [37, 0], [37, 1], [40, 0], [40, 2], [41, 0], [41, 1], [42, 0], [42, 1], [46, 0], [46, 1], [49, 0], [49, 2], [50, 0], [50, 1], [52, 0], [52, 2], [53, 0], [53, 1], [57, 0], [57, 2], [58, 0], [58, 1], [61, 0], [61, 2], [62, 0], [62, 1], [66, 0], [66, 2], [67, 0], [67, 1], [70, 1], [70, 2], [76, 1], [76, 2]],
        performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$) {

            var $0 = $$.length - 1;
            switch (yystate) {
                case 1:
                    return $$[$0 - 1];
                    break;
                case 2:
                    this.$ = yy.prepareProgram($$[$0]);
                    break;
                case 3:
                    this.$ = $$[$0];
                    break;
                case 4:
                    this.$ = $$[$0];
                    break;
                case 5:
                    this.$ = $$[$0];
                    break;
                case 6:
                    this.$ = $$[$0];
                    break;
                case 7:
                    this.$ = $$[$0];
                    break;
                case 8:
                    this.$ = $$[$0];
                    break;
                case 9:
                    this.$ = {
                        type: 'CommentStatement',
                        value: yy.stripComment($$[$0]),
                        strip: yy.stripFlags($$[$0], $$[$0]),
                        loc: yy.locInfo(this._$)
                    };

                    break;
                case 10:
                    this.$ = {
                        type: 'ContentStatement',
                        original: $$[$0],
                        value: $$[$0],
                        loc: yy.locInfo(this._$)
                    };

                    break;
                case 11:
                    this.$ = yy.prepareRawBlock($$[$0 - 2], $$[$0 - 1], $$[$0], this._$);
                    break;
                case 12:
                    this.$ = { path: $$[$0 - 3], params: $$[$0 - 2], hash: $$[$0 - 1] };
                    break;
                case 13:
                    this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], false, this._$);
                    break;
                case 14:
                    this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], true, this._$);
                    break;
                case 15:
                    this.$ = { open: $$[$0 - 5], path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
                    break;
                case 16:
                    this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
                    break;
                case 17:
                    this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
                    break;
                case 18:
                    this.$ = { strip: yy.stripFlags($$[$0 - 1], $$[$0 - 1]), program: $$[$0] };
                    break;
                case 19:
                    var inverse = yy.prepareBlock($$[$0 - 2], $$[$0 - 1], $$[$0], $$[$0], false, this._$),
                        program = yy.prepareProgram([inverse], $$[$0 - 1].loc);
                    program.chained = true;

                    this.$ = { strip: $$[$0 - 2].strip, program: program, chain: true };

                    break;
                case 20:
                    this.$ = $$[$0];
                    break;
                case 21:
                    this.$ = { path: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 2], $$[$0]) };
                    break;
                case 22:
                    this.$ = yy.prepareMustache($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0 - 4], yy.stripFlags($$[$0 - 4], $$[$0]), this._$);
                    break;
                case 23:
                    this.$ = yy.prepareMustache($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0 - 4], yy.stripFlags($$[$0 - 4], $$[$0]), this._$);
                    break;
                case 24:
                    this.$ = {
                        type: 'PartialStatement',
                        name: $$[$0 - 3],
                        params: $$[$0 - 2],
                        hash: $$[$0 - 1],
                        indent: '',
                        strip: yy.stripFlags($$[$0 - 4], $$[$0]),
                        loc: yy.locInfo(this._$)
                    };

                    break;
                case 25:
                    this.$ = yy.preparePartialBlock($$[$0 - 2], $$[$0 - 1], $$[$0], this._$);
                    break;
                case 26:
                    this.$ = { path: $$[$0 - 3], params: $$[$0 - 2], hash: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 4], $$[$0]) };
                    break;
                case 27:
                    this.$ = $$[$0];
                    break;
                case 28:
                    this.$ = $$[$0];
                    break;
                case 29:
                    this.$ = {
                        type: 'SubExpression',
                        path: $$[$0 - 3],
                        params: $$[$0 - 2],
                        hash: $$[$0 - 1],
                        loc: yy.locInfo(this._$)
                    };

                    break;
                case 30:
                    this.$ = { type: 'Hash', pairs: $$[$0], loc: yy.locInfo(this._$) };
                    break;
                case 31:
                    this.$ = { type: 'HashPair', key: yy.id($$[$0 - 2]), value: $$[$0], loc: yy.locInfo(this._$) };
                    break;
                case 32:
                    this.$ = yy.id($$[$0 - 1]);
                    break;
                case 33:
                    this.$ = $$[$0];
                    break;
                case 34:
                    this.$ = $$[$0];
                    break;
                case 35:
                    this.$ = { type: 'StringLiteral', value: $$[$0], original: $$[$0], loc: yy.locInfo(this._$) };
                    break;
                case 36:
                    this.$ = { type: 'NumberLiteral', value: Number($$[$0]), original: Number($$[$0]), loc: yy.locInfo(this._$) };
                    break;
                case 37:
                    this.$ = { type: 'BooleanLiteral', value: $$[$0] === 'true', original: $$[$0] === 'true', loc: yy.locInfo(this._$) };
                    break;
                case 38:
                    this.$ = { type: 'UndefinedLiteral', original: undefined, value: undefined, loc: yy.locInfo(this._$) };
                    break;
                case 39:
                    this.$ = { type: 'NullLiteral', original: null, value: null, loc: yy.locInfo(this._$) };
                    break;
                case 40:
                    this.$ = $$[$0];
                    break;
                case 41:
                    this.$ = $$[$0];
                    break;
                case 42:
                    this.$ = yy.preparePath(true, $$[$0], this._$);
                    break;
                case 43:
                    this.$ = yy.preparePath(false, $$[$0], this._$);
                    break;
                case 44:
                    $$[$0 - 2].push({ part: yy.id($$[$0]), original: $$[$0], separator: $$[$0 - 1] });this.$ = $$[$0 - 2];
                    break;
                case 45:
                    this.$ = [{ part: yy.id($$[$0]), original: $$[$0] }];
                    break;
                case 46:
                    this.$ = [];
                    break;
                case 47:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 48:
                    this.$ = [];
                    break;
                case 49:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 50:
                    this.$ = [];
                    break;
                case 51:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 58:
                    this.$ = [];
                    break;
                case 59:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 64:
                    this.$ = [];
                    break;
                case 65:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 70:
                    this.$ = [];
                    break;
                case 71:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 78:
                    this.$ = [];
                    break;
                case 79:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 82:
                    this.$ = [];
                    break;
                case 83:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 86:
                    this.$ = [];
                    break;
                case 87:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 90:
                    this.$ = [];
                    break;
                case 91:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 94:
                    this.$ = [];
                    break;
                case 95:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 98:
                    this.$ = [$$[$0]];
                    break;
                case 99:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 100:
                    this.$ = [$$[$0]];
                    break;
                case 101:
                    $$[$0 - 1].push($$[$0]);
                    break;
            }
        },
        table: [{ 3: 1, 4: 2, 5: [2, 46], 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 1: [3] }, { 5: [1, 4] }, { 5: [2, 2], 7: 5, 8: 6, 9: 7, 10: 8, 11: 9, 12: 10, 13: 11, 14: [1, 12], 15: [1, 20], 16: 17, 19: [1, 23], 24: 15, 27: 16, 29: [1, 21], 34: [1, 22], 39: [2, 2], 44: [2, 2], 47: [2, 2], 48: [1, 13], 51: [1, 14], 55: [1, 18], 59: 19, 60: [1, 24] }, { 1: [2, 1] }, { 5: [2, 47], 14: [2, 47], 15: [2, 47], 19: [2, 47], 29: [2, 47], 34: [2, 47], 39: [2, 47], 44: [2, 47], 47: [2, 47], 48: [2, 47], 51: [2, 47], 55: [2, 47], 60: [2, 47] }, { 5: [2, 3], 14: [2, 3], 15: [2, 3], 19: [2, 3], 29: [2, 3], 34: [2, 3], 39: [2, 3], 44: [2, 3], 47: [2, 3], 48: [2, 3], 51: [2, 3], 55: [2, 3], 60: [2, 3] }, { 5: [2, 4], 14: [2, 4], 15: [2, 4], 19: [2, 4], 29: [2, 4], 34: [2, 4], 39: [2, 4], 44: [2, 4], 47: [2, 4], 48: [2, 4], 51: [2, 4], 55: [2, 4], 60: [2, 4] }, { 5: [2, 5], 14: [2, 5], 15: [2, 5], 19: [2, 5], 29: [2, 5], 34: [2, 5], 39: [2, 5], 44: [2, 5], 47: [2, 5], 48: [2, 5], 51: [2, 5], 55: [2, 5], 60: [2, 5] }, { 5: [2, 6], 14: [2, 6], 15: [2, 6], 19: [2, 6], 29: [2, 6], 34: [2, 6], 39: [2, 6], 44: [2, 6], 47: [2, 6], 48: [2, 6], 51: [2, 6], 55: [2, 6], 60: [2, 6] }, { 5: [2, 7], 14: [2, 7], 15: [2, 7], 19: [2, 7], 29: [2, 7], 34: [2, 7], 39: [2, 7], 44: [2, 7], 47: [2, 7], 48: [2, 7], 51: [2, 7], 55: [2, 7], 60: [2, 7] }, { 5: [2, 8], 14: [2, 8], 15: [2, 8], 19: [2, 8], 29: [2, 8], 34: [2, 8], 39: [2, 8], 44: [2, 8], 47: [2, 8], 48: [2, 8], 51: [2, 8], 55: [2, 8], 60: [2, 8] }, { 5: [2, 9], 14: [2, 9], 15: [2, 9], 19: [2, 9], 29: [2, 9], 34: [2, 9], 39: [2, 9], 44: [2, 9], 47: [2, 9], 48: [2, 9], 51: [2, 9], 55: [2, 9], 60: [2, 9] }, { 20: 25, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 36, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 4: 37, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 39: [2, 46], 44: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 4: 38, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 44: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 15: [2, 48], 17: 39, 18: [2, 48] }, { 20: 41, 56: 40, 64: 42, 65: [1, 43], 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 4: 44, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 5: [2, 10], 14: [2, 10], 15: [2, 10], 18: [2, 10], 19: [2, 10], 29: [2, 10], 34: [2, 10], 39: [2, 10], 44: [2, 10], 47: [2, 10], 48: [2, 10], 51: [2, 10], 55: [2, 10], 60: [2, 10] }, { 20: 45, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 46, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 47, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 41, 56: 48, 64: 42, 65: [1, 43], 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 33: [2, 78], 49: 49, 65: [2, 78], 72: [2, 78], 80: [2, 78], 81: [2, 78], 82: [2, 78], 83: [2, 78], 84: [2, 78], 85: [2, 78] }, { 23: [2, 33], 33: [2, 33], 54: [2, 33], 65: [2, 33], 68: [2, 33], 72: [2, 33], 75: [2, 33], 80: [2, 33], 81: [2, 33], 82: [2, 33], 83: [2, 33], 84: [2, 33], 85: [2, 33] }, { 23: [2, 34], 33: [2, 34], 54: [2, 34], 65: [2, 34], 68: [2, 34], 72: [2, 34], 75: [2, 34], 80: [2, 34], 81: [2, 34], 82: [2, 34], 83: [2, 34], 84: [2, 34], 85: [2, 34] }, { 23: [2, 35], 33: [2, 35], 54: [2, 35], 65: [2, 35], 68: [2, 35], 72: [2, 35], 75: [2, 35], 80: [2, 35], 81: [2, 35], 82: [2, 35], 83: [2, 35], 84: [2, 35], 85: [2, 35] }, { 23: [2, 36], 33: [2, 36], 54: [2, 36], 65: [2, 36], 68: [2, 36], 72: [2, 36], 75: [2, 36], 80: [2, 36], 81: [2, 36], 82: [2, 36], 83: [2, 36], 84: [2, 36], 85: [2, 36] }, { 23: [2, 37], 33: [2, 37], 54: [2, 37], 65: [2, 37], 68: [2, 37], 72: [2, 37], 75: [2, 37], 80: [2, 37], 81: [2, 37], 82: [2, 37], 83: [2, 37], 84: [2, 37], 85: [2, 37] }, { 23: [2, 38], 33: [2, 38], 54: [2, 38], 65: [2, 38], 68: [2, 38], 72: [2, 38], 75: [2, 38], 80: [2, 38], 81: [2, 38], 82: [2, 38], 83: [2, 38], 84: [2, 38], 85: [2, 38] }, { 23: [2, 39], 33: [2, 39], 54: [2, 39], 65: [2, 39], 68: [2, 39], 72: [2, 39], 75: [2, 39], 80: [2, 39], 81: [2, 39], 82: [2, 39], 83: [2, 39], 84: [2, 39], 85: [2, 39] }, { 23: [2, 43], 33: [2, 43], 54: [2, 43], 65: [2, 43], 68: [2, 43], 72: [2, 43], 75: [2, 43], 80: [2, 43], 81: [2, 43], 82: [2, 43], 83: [2, 43], 84: [2, 43], 85: [2, 43], 87: [1, 50] }, { 72: [1, 35], 86: 51 }, { 23: [2, 45], 33: [2, 45], 54: [2, 45], 65: [2, 45], 68: [2, 45], 72: [2, 45], 75: [2, 45], 80: [2, 45], 81: [2, 45], 82: [2, 45], 83: [2, 45], 84: [2, 45], 85: [2, 45], 87: [2, 45] }, { 52: 52, 54: [2, 82], 65: [2, 82], 72: [2, 82], 80: [2, 82], 81: [2, 82], 82: [2, 82], 83: [2, 82], 84: [2, 82], 85: [2, 82] }, { 25: 53, 38: 55, 39: [1, 57], 43: 56, 44: [1, 58], 45: 54, 47: [2, 54] }, { 28: 59, 43: 60, 44: [1, 58], 47: [2, 56] }, { 13: 62, 15: [1, 20], 18: [1, 61] }, { 33: [2, 86], 57: 63, 65: [2, 86], 72: [2, 86], 80: [2, 86], 81: [2, 86], 82: [2, 86], 83: [2, 86], 84: [2, 86], 85: [2, 86] }, { 33: [2, 40], 65: [2, 40], 72: [2, 40], 80: [2, 40], 81: [2, 40], 82: [2, 40], 83: [2, 40], 84: [2, 40], 85: [2, 40] }, { 33: [2, 41], 65: [2, 41], 72: [2, 41], 80: [2, 41], 81: [2, 41], 82: [2, 41], 83: [2, 41], 84: [2, 41], 85: [2, 41] }, { 20: 64, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 26: 65, 47: [1, 66] }, { 30: 67, 33: [2, 58], 65: [2, 58], 72: [2, 58], 75: [2, 58], 80: [2, 58], 81: [2, 58], 82: [2, 58], 83: [2, 58], 84: [2, 58], 85: [2, 58] }, { 33: [2, 64], 35: 68, 65: [2, 64], 72: [2, 64], 75: [2, 64], 80: [2, 64], 81: [2, 64], 82: [2, 64], 83: [2, 64], 84: [2, 64], 85: [2, 64] }, { 21: 69, 23: [2, 50], 65: [2, 50], 72: [2, 50], 80: [2, 50], 81: [2, 50], 82: [2, 50], 83: [2, 50], 84: [2, 50], 85: [2, 50] }, { 33: [2, 90], 61: 70, 65: [2, 90], 72: [2, 90], 80: [2, 90], 81: [2, 90], 82: [2, 90], 83: [2, 90], 84: [2, 90], 85: [2, 90] }, { 20: 74, 33: [2, 80], 50: 71, 63: 72, 64: 75, 65: [1, 43], 69: 73, 70: 76, 71: 77, 72: [1, 78], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 72: [1, 79] }, { 23: [2, 42], 33: [2, 42], 54: [2, 42], 65: [2, 42], 68: [2, 42], 72: [2, 42], 75: [2, 42], 80: [2, 42], 81: [2, 42], 82: [2, 42], 83: [2, 42], 84: [2, 42], 85: [2, 42], 87: [1, 50] }, { 20: 74, 53: 80, 54: [2, 84], 63: 81, 64: 75, 65: [1, 43], 69: 82, 70: 76, 71: 77, 72: [1, 78], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 26: 83, 47: [1, 66] }, { 47: [2, 55] }, { 4: 84, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 39: [2, 46], 44: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 47: [2, 20] }, { 20: 85, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 4: 86, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 26: 87, 47: [1, 66] }, { 47: [2, 57] }, { 5: [2, 11], 14: [2, 11], 15: [2, 11], 19: [2, 11], 29: [2, 11], 34: [2, 11], 39: [2, 11], 44: [2, 11], 47: [2, 11], 48: [2, 11], 51: [2, 11], 55: [2, 11], 60: [2, 11] }, { 15: [2, 49], 18: [2, 49] }, { 20: 74, 33: [2, 88], 58: 88, 63: 89, 64: 75, 65: [1, 43], 69: 90, 70: 76, 71: 77, 72: [1, 78], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 65: [2, 94], 66: 91, 68: [2, 94], 72: [2, 94], 80: [2, 94], 81: [2, 94], 82: [2, 94], 83: [2, 94], 84: [2, 94], 85: [2, 94] }, { 5: [2, 25], 14: [2, 25], 15: [2, 25], 19: [2, 25], 29: [2, 25], 34: [2, 25], 39: [2, 25], 44: [2, 25], 47: [2, 25], 48: [2, 25], 51: [2, 25], 55: [2, 25], 60: [2, 25] }, { 20: 92, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 74, 31: 93, 33: [2, 60], 63: 94, 64: 75, 65: [1, 43], 69: 95, 70: 76, 71: 77, 72: [1, 78], 75: [2, 60], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 74, 33: [2, 66], 36: 96, 63: 97, 64: 75, 65: [1, 43], 69: 98, 70: 76, 71: 77, 72: [1, 78], 75: [2, 66], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 74, 22: 99, 23: [2, 52], 63: 100, 64: 75, 65: [1, 43], 69: 101, 70: 76, 71: 77, 72: [1, 78], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 74, 33: [2, 92], 62: 102, 63: 103, 64: 75, 65: [1, 43], 69: 104, 70: 76, 71: 77, 72: [1, 78], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 33: [1, 105] }, { 33: [2, 79], 65: [2, 79], 72: [2, 79], 80: [2, 79], 81: [2, 79], 82: [2, 79], 83: [2, 79], 84: [2, 79], 85: [2, 79] }, { 33: [2, 81] }, { 23: [2, 27], 33: [2, 27], 54: [2, 27], 65: [2, 27], 68: [2, 27], 72: [2, 27], 75: [2, 27], 80: [2, 27], 81: [2, 27], 82: [2, 27], 83: [2, 27], 84: [2, 27], 85: [2, 27] }, { 23: [2, 28], 33: [2, 28], 54: [2, 28], 65: [2, 28], 68: [2, 28], 72: [2, 28], 75: [2, 28], 80: [2, 28], 81: [2, 28], 82: [2, 28], 83: [2, 28], 84: [2, 28], 85: [2, 28] }, { 23: [2, 30], 33: [2, 30], 54: [2, 30], 68: [2, 30], 71: 106, 72: [1, 107], 75: [2, 30] }, { 23: [2, 98], 33: [2, 98], 54: [2, 98], 68: [2, 98], 72: [2, 98], 75: [2, 98] }, { 23: [2, 45], 33: [2, 45], 54: [2, 45], 65: [2, 45], 68: [2, 45], 72: [2, 45], 73: [1, 108], 75: [2, 45], 80: [2, 45], 81: [2, 45], 82: [2, 45], 83: [2, 45], 84: [2, 45], 85: [2, 45], 87: [2, 45] }, { 23: [2, 44], 33: [2, 44], 54: [2, 44], 65: [2, 44], 68: [2, 44], 72: [2, 44], 75: [2, 44], 80: [2, 44], 81: [2, 44], 82: [2, 44], 83: [2, 44], 84: [2, 44], 85: [2, 44], 87: [2, 44] }, { 54: [1, 109] }, { 54: [2, 83], 65: [2, 83], 72: [2, 83], 80: [2, 83], 81: [2, 83], 82: [2, 83], 83: [2, 83], 84: [2, 83], 85: [2, 83] }, { 54: [2, 85] }, { 5: [2, 13], 14: [2, 13], 15: [2, 13], 19: [2, 13], 29: [2, 13], 34: [2, 13], 39: [2, 13], 44: [2, 13], 47: [2, 13], 48: [2, 13], 51: [2, 13], 55: [2, 13], 60: [2, 13] }, { 38: 55, 39: [1, 57], 43: 56, 44: [1, 58], 45: 111, 46: 110, 47: [2, 76] }, { 33: [2, 70], 40: 112, 65: [2, 70], 72: [2, 70], 75: [2, 70], 80: [2, 70], 81: [2, 70], 82: [2, 70], 83: [2, 70], 84: [2, 70], 85: [2, 70] }, { 47: [2, 18] }, { 5: [2, 14], 14: [2, 14], 15: [2, 14], 19: [2, 14], 29: [2, 14], 34: [2, 14], 39: [2, 14], 44: [2, 14], 47: [2, 14], 48: [2, 14], 51: [2, 14], 55: [2, 14], 60: [2, 14] }, { 33: [1, 113] }, { 33: [2, 87], 65: [2, 87], 72: [2, 87], 80: [2, 87], 81: [2, 87], 82: [2, 87], 83: [2, 87], 84: [2, 87], 85: [2, 87] }, { 33: [2, 89] }, { 20: 74, 63: 115, 64: 75, 65: [1, 43], 67: 114, 68: [2, 96], 69: 116, 70: 76, 71: 77, 72: [1, 78], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 33: [1, 117] }, { 32: 118, 33: [2, 62], 74: 119, 75: [1, 120] }, { 33: [2, 59], 65: [2, 59], 72: [2, 59], 75: [2, 59], 80: [2, 59], 81: [2, 59], 82: [2, 59], 83: [2, 59], 84: [2, 59], 85: [2, 59] }, { 33: [2, 61], 75: [2, 61] }, { 33: [2, 68], 37: 121, 74: 122, 75: [1, 120] }, { 33: [2, 65], 65: [2, 65], 72: [2, 65], 75: [2, 65], 80: [2, 65], 81: [2, 65], 82: [2, 65], 83: [2, 65], 84: [2, 65], 85: [2, 65] }, { 33: [2, 67], 75: [2, 67] }, { 23: [1, 123] }, { 23: [2, 51], 65: [2, 51], 72: [2, 51], 80: [2, 51], 81: [2, 51], 82: [2, 51], 83: [2, 51], 84: [2, 51], 85: [2, 51] }, { 23: [2, 53] }, { 33: [1, 124] }, { 33: [2, 91], 65: [2, 91], 72: [2, 91], 80: [2, 91], 81: [2, 91], 82: [2, 91], 83: [2, 91], 84: [2, 91], 85: [2, 91] }, { 33: [2, 93] }, { 5: [2, 22], 14: [2, 22], 15: [2, 22], 19: [2, 22], 29: [2, 22], 34: [2, 22], 39: [2, 22], 44: [2, 22], 47: [2, 22], 48: [2, 22], 51: [2, 22], 55: [2, 22], 60: [2, 22] }, { 23: [2, 99], 33: [2, 99], 54: [2, 99], 68: [2, 99], 72: [2, 99], 75: [2, 99] }, { 73: [1, 108] }, { 20: 74, 63: 125, 64: 75, 65: [1, 43], 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 5: [2, 23], 14: [2, 23], 15: [2, 23], 19: [2, 23], 29: [2, 23], 34: [2, 23], 39: [2, 23], 44: [2, 23], 47: [2, 23], 48: [2, 23], 51: [2, 23], 55: [2, 23], 60: [2, 23] }, { 47: [2, 19] }, { 47: [2, 77] }, { 20: 74, 33: [2, 72], 41: 126, 63: 127, 64: 75, 65: [1, 43], 69: 128, 70: 76, 71: 77, 72: [1, 78], 75: [2, 72], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 5: [2, 24], 14: [2, 24], 15: [2, 24], 19: [2, 24], 29: [2, 24], 34: [2, 24], 39: [2, 24], 44: [2, 24], 47: [2, 24], 48: [2, 24], 51: [2, 24], 55: [2, 24], 60: [2, 24] }, { 68: [1, 129] }, { 65: [2, 95], 68: [2, 95], 72: [2, 95], 80: [2, 95], 81: [2, 95], 82: [2, 95], 83: [2, 95], 84: [2, 95], 85: [2, 95] }, { 68: [2, 97] }, { 5: [2, 21], 14: [2, 21], 15: [2, 21], 19: [2, 21], 29: [2, 21], 34: [2, 21], 39: [2, 21], 44: [2, 21], 47: [2, 21], 48: [2, 21], 51: [2, 21], 55: [2, 21], 60: [2, 21] }, { 33: [1, 130] }, { 33: [2, 63] }, { 72: [1, 132], 76: 131 }, { 33: [1, 133] }, { 33: [2, 69] }, { 15: [2, 12], 18: [2, 12] }, { 14: [2, 26], 15: [2, 26], 19: [2, 26], 29: [2, 26], 34: [2, 26], 47: [2, 26], 48: [2, 26], 51: [2, 26], 55: [2, 26], 60: [2, 26] }, { 23: [2, 31], 33: [2, 31], 54: [2, 31], 68: [2, 31], 72: [2, 31], 75: [2, 31] }, { 33: [2, 74], 42: 134, 74: 135, 75: [1, 120] }, { 33: [2, 71], 65: [2, 71], 72: [2, 71], 75: [2, 71], 80: [2, 71], 81: [2, 71], 82: [2, 71], 83: [2, 71], 84: [2, 71], 85: [2, 71] }, { 33: [2, 73], 75: [2, 73] }, { 23: [2, 29], 33: [2, 29], 54: [2, 29], 65: [2, 29], 68: [2, 29], 72: [2, 29], 75: [2, 29], 80: [2, 29], 81: [2, 29], 82: [2, 29], 83: [2, 29], 84: [2, 29], 85: [2, 29] }, { 14: [2, 15], 15: [2, 15], 19: [2, 15], 29: [2, 15], 34: [2, 15], 39: [2, 15], 44: [2, 15], 47: [2, 15], 48: [2, 15], 51: [2, 15], 55: [2, 15], 60: [2, 15] }, { 72: [1, 137], 77: [1, 136] }, { 72: [2, 100], 77: [2, 100] }, { 14: [2, 16], 15: [2, 16], 19: [2, 16], 29: [2, 16], 34: [2, 16], 44: [2, 16], 47: [2, 16], 48: [2, 16], 51: [2, 16], 55: [2, 16], 60: [2, 16] }, { 33: [1, 138] }, { 33: [2, 75] }, { 33: [2, 32] }, { 72: [2, 101], 77: [2, 101] }, { 14: [2, 17], 15: [2, 17], 19: [2, 17], 29: [2, 17], 34: [2, 17], 39: [2, 17], 44: [2, 17], 47: [2, 17], 48: [2, 17], 51: [2, 17], 55: [2, 17], 60: [2, 17] }],
        defaultActions: { 4: [2, 1], 54: [2, 55], 56: [2, 20], 60: [2, 57], 73: [2, 81], 82: [2, 85], 86: [2, 18], 90: [2, 89], 101: [2, 53], 104: [2, 93], 110: [2, 19], 111: [2, 77], 116: [2, 97], 119: [2, 63], 122: [2, 69], 135: [2, 75], 136: [2, 32] },
        parseError: function parseError(str, hash) {
            throw new Error(str);
        },
        parse: function parse(input) {
            var self = this,
                stack = [0],
                vstack = [null],
                lstack = [],
                table = this.table,
                yytext = "",
                yylineno = 0,
                yyleng = 0,
                recovering = 0,
                TERROR = 2,
                EOF = 1;
            this.lexer.setInput(input);
            this.lexer.yy = this.yy;
            this.yy.lexer = this.lexer;
            this.yy.parser = this;
            if (typeof this.lexer.yylloc == "undefined") this.lexer.yylloc = {};
            var yyloc = this.lexer.yylloc;
            lstack.push(yyloc);
            var ranges = this.lexer.options && this.lexer.options.ranges;
            if (typeof this.yy.parseError === "function") this.parseError = this.yy.parseError;
            function popStack(n) {
                stack.length = stack.length - 2 * n;
                vstack.length = vstack.length - n;
                lstack.length = lstack.length - n;
            }
            function lex() {
                var token;
                token = self.lexer.lex() || 1;
                if (typeof token !== "number") {
                    token = self.symbols_[token] || token;
                }
                return token;
            }
            var symbol,
                preErrorSymbol,
                state,
                action,
                a,
                r,
                yyval = {},
                p,
                len,
                newState,
                expected;
            while (true) {
                state = stack[stack.length - 1];
                if (this.defaultActions[state]) {
                    action = this.defaultActions[state];
                } else {
                    if (symbol === null || typeof symbol == "undefined") {
                        symbol = lex();
                    }
                    action = table[state] && table[state][symbol];
                }
                if (typeof action === "undefined" || !action.length || !action[0]) {
                    var errStr = "";
                    if (!recovering) {
                        expected = [];
                        for (p in table[state]) if (this.terminals_[p] && p > 2) {
                            expected.push("'" + this.terminals_[p] + "'");
                        }
                        if (this.lexer.showPosition) {
                            errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                        } else {
                            errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1 ? "end of input" : "'" + (this.terminals_[symbol] || symbol) + "'");
                        }
                        this.parseError(errStr, { text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected });
                    }
                }
                if (action[0] instanceof Array && action.length > 1) {
                    throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
                }
                switch (action[0]) {
                    case 1:
                        stack.push(symbol);
                        vstack.push(this.lexer.yytext);
                        lstack.push(this.lexer.yylloc);
                        stack.push(action[1]);
                        symbol = null;
                        if (!preErrorSymbol) {
                            yyleng = this.lexer.yyleng;
                            yytext = this.lexer.yytext;
                            yylineno = this.lexer.yylineno;
                            yyloc = this.lexer.yylloc;
                            if (recovering > 0) recovering--;
                        } else {
                            symbol = preErrorSymbol;
                            preErrorSymbol = null;
                        }
                        break;
                    case 2:
                        len = this.productions_[action[1]][1];
                        yyval.$ = vstack[vstack.length - len];
                        yyval._$ = { first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column };
                        if (ranges) {
                            yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
                        }
                        r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
                        if (typeof r !== "undefined") {
                            return r;
                        }
                        if (len) {
                            stack = stack.slice(0, -1 * len * 2);
                            vstack = vstack.slice(0, -1 * len);
                            lstack = lstack.slice(0, -1 * len);
                        }
                        stack.push(this.productions_[action[1]][0]);
                        vstack.push(yyval.$);
                        lstack.push(yyval._$);
                        newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
                        stack.push(newState);
                        break;
                    case 3:
                        return true;
                }
            }
            return true;
        }
    };
    /* Jison generated lexer */
    var lexer = (function () {
        var lexer = { EOF: 1,
            parseError: function parseError(str, hash) {
                if (this.yy.parser) {
                    this.yy.parser.parseError(str, hash);
                } else {
                    throw new Error(str);
                }
            },
            setInput: function setInput(input) {
                this._input = input;
                this._more = this._less = this.done = false;
                this.yylineno = this.yyleng = 0;
                this.yytext = this.matched = this.match = '';
                this.conditionStack = ['INITIAL'];
                this.yylloc = { first_line: 1, first_column: 0, last_line: 1, last_column: 0 };
                if (this.options.ranges) this.yylloc.range = [0, 0];
                this.offset = 0;
                return this;
            },
            input: function input() {
                var ch = this._input[0];
                this.yytext += ch;
                this.yyleng++;
                this.offset++;
                this.match += ch;
                this.matched += ch;
                var lines = ch.match(/(?:\r\n?|\n).*/g);
                if (lines) {
                    this.yylineno++;
                    this.yylloc.last_line++;
                } else {
                    this.yylloc.last_column++;
                }
                if (this.options.ranges) this.yylloc.range[1]++;

                this._input = this._input.slice(1);
                return ch;
            },
            unput: function unput(ch) {
                var len = ch.length;
                var lines = ch.split(/(?:\r\n?|\n)/g);

                this._input = ch + this._input;
                this.yytext = this.yytext.substr(0, this.yytext.length - len - 1);
                //this.yyleng -= len;
                this.offset -= len;
                var oldLines = this.match.split(/(?:\r\n?|\n)/g);
                this.match = this.match.substr(0, this.match.length - 1);
                this.matched = this.matched.substr(0, this.matched.length - 1);

                if (lines.length - 1) this.yylineno -= lines.length - 1;
                var r = this.yylloc.range;

                this.yylloc = { first_line: this.yylloc.first_line,
                    last_line: this.yylineno + 1,
                    first_column: this.yylloc.first_column,
                    last_column: lines ? (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length : this.yylloc.first_column - len
                };

                if (this.options.ranges) {
                    this.yylloc.range = [r[0], r[0] + this.yyleng - len];
                }
                return this;
            },
            more: function more() {
                this._more = true;
                return this;
            },
            less: function less(n) {
                this.unput(this.match.slice(n));
            },
            pastInput: function pastInput() {
                var past = this.matched.substr(0, this.matched.length - this.match.length);
                return (past.length > 20 ? '...' : '') + past.substr(-20).replace(/\n/g, "");
            },
            upcomingInput: function upcomingInput() {
                var next = this.match;
                if (next.length < 20) {
                    next += this._input.substr(0, 20 - next.length);
                }
                return (next.substr(0, 20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
            },
            showPosition: function showPosition() {
                var pre = this.pastInput();
                var c = new Array(pre.length + 1).join("-");
                return pre + this.upcomingInput() + "\n" + c + "^";
            },
            next: function next() {
                if (this.done) {
                    return this.EOF;
                }
                if (!this._input) this.done = true;

                var token, match, tempMatch, index, col, lines;
                if (!this._more) {
                    this.yytext = '';
                    this.match = '';
                }
                var rules = this._currentRules();
                for (var i = 0; i < rules.length; i++) {
                    tempMatch = this._input.match(this.rules[rules[i]]);
                    if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                        match = tempMatch;
                        index = i;
                        if (!this.options.flex) break;
                    }
                }
                if (match) {
                    lines = match[0].match(/(?:\r\n?|\n).*/g);
                    if (lines) this.yylineno += lines.length;
                    this.yylloc = { first_line: this.yylloc.last_line,
                        last_line: this.yylineno + 1,
                        first_column: this.yylloc.last_column,
                        last_column: lines ? lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length };
                    this.yytext += match[0];
                    this.match += match[0];
                    this.matches = match;
                    this.yyleng = this.yytext.length;
                    if (this.options.ranges) {
                        this.yylloc.range = [this.offset, this.offset += this.yyleng];
                    }
                    this._more = false;
                    this._input = this._input.slice(match[0].length);
                    this.matched += match[0];
                    token = this.performAction.call(this, this.yy, this, rules[index], this.conditionStack[this.conditionStack.length - 1]);
                    if (this.done && this._input) this.done = false;
                    if (token) return token;else return;
                }
                if (this._input === "") {
                    return this.EOF;
                } else {
                    return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), { text: "", token: null, line: this.yylineno });
                }
            },
            lex: function lex() {
                var r = this.next();
                if (typeof r !== 'undefined') {
                    return r;
                } else {
                    return this.lex();
                }
            },
            begin: function begin(condition) {
                this.conditionStack.push(condition);
            },
            popState: function popState() {
                return this.conditionStack.pop();
            },
            _currentRules: function _currentRules() {
                return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
            },
            topState: function topState() {
                return this.conditionStack[this.conditionStack.length - 2];
            },
            pushState: function begin(condition) {
                this.begin(condition);
            } };
        lexer.options = {};
        lexer.performAction = function anonymous(yy, yy_, $avoiding_name_collisions, YY_START) {

            function strip(start, end) {
                return yy_.yytext = yy_.yytext.substring(start, yy_.yyleng - end + start);
            }

            var YYSTATE = YY_START;
            switch ($avoiding_name_collisions) {
                case 0:
                    if (yy_.yytext.slice(-2) === "\\\\") {
                        strip(0, 1);
                        this.begin("mu");
                    } else if (yy_.yytext.slice(-1) === "\\") {
                        strip(0, 1);
                        this.begin("emu");
                    } else {
                        this.begin("mu");
                    }
                    if (yy_.yytext) return 15;

                    break;
                case 1:
                    return 15;
                    break;
                case 2:
                    this.popState();
                    return 15;

                    break;
                case 3:
                    this.begin('raw');return 15;
                    break;
                case 4:
                    this.popState();
                    // Should be using `this.topState()` below, but it currently
                    // returns the second top instead of the first top. Opened an
                    // issue about it at https://github.com/zaach/jison/issues/291
                    if (this.conditionStack[this.conditionStack.length - 1] === 'raw') {
                        return 15;
                    } else {
                        strip(5, 9);
                        return 'END_RAW_BLOCK';
                    }

                    break;
                case 5:
                    return 15;
                    break;
                case 6:
                    this.popState();
                    return 14;

                    break;
                case 7:
                    return 65;
                    break;
                case 8:
                    return 68;
                    break;
                case 9:
                    return 19;
                    break;
                case 10:
                    this.popState();
                    this.begin('raw');
                    return 23;

                    break;
                case 11:
                    return 55;
                    break;
                case 12:
                    return 60;
                    break;
                case 13:
                    return 29;
                    break;
                case 14:
                    return 47;
                    break;
                case 15:
                    this.popState();return 44;
                    break;
                case 16:
                    this.popState();return 44;
                    break;
                case 17:
                    return 34;
                    break;
                case 18:
                    return 39;
                    break;
                case 19:
                    return 51;
                    break;
                case 20:
                    return 48;
                    break;
                case 21:
                    this.unput(yy_.yytext);
                    this.popState();
                    this.begin('com');

                    break;
                case 22:
                    this.popState();
                    return 14;

                    break;
                case 23:
                    return 48;
                    break;
                case 24:
                    return 73;
                    break;
                case 25:
                    return 72;
                    break;
                case 26:
                    return 72;
                    break;
                case 27:
                    return 87;
                    break;
                case 28:
                    // ignore whitespace
                    break;
                case 29:
                    this.popState();return 54;
                    break;
                case 30:
                    this.popState();return 33;
                    break;
                case 31:
                    yy_.yytext = strip(1, 2).replace(/\\"/g, '"');return 80;
                    break;
                case 32:
                    yy_.yytext = strip(1, 2).replace(/\\'/g, "'");return 80;
                    break;
                case 33:
                    return 85;
                    break;
                case 34:
                    return 82;
                    break;
                case 35:
                    return 82;
                    break;
                case 36:
                    return 83;
                    break;
                case 37:
                    return 84;
                    break;
                case 38:
                    return 81;
                    break;
                case 39:
                    return 75;
                    break;
                case 40:
                    return 77;
                    break;
                case 41:
                    return 72;
                    break;
                case 42:
                    yy_.yytext = yy_.yytext.replace(/\\([\\\]])/g, '$1');return 72;
                    break;
                case 43:
                    return 'INVALID';
                    break;
                case 44:
                    return 5;
                    break;
            }
        };
        lexer.rules = [/^(?:[^\x00]*?(?=(\{\{)))/, /^(?:[^\x00]+)/, /^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/, /^(?:\{\{\{\{(?=[^\/]))/, /^(?:\{\{\{\{\/[^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.])\}\}\}\})/, /^(?:[^\x00]+?(?=(\{\{\{\{)))/, /^(?:[\s\S]*?--(~)?\}\})/, /^(?:\()/, /^(?:\))/, /^(?:\{\{\{\{)/, /^(?:\}\}\}\})/, /^(?:\{\{(~)?>)/, /^(?:\{\{(~)?#>)/, /^(?:\{\{(~)?#\*?)/, /^(?:\{\{(~)?\/)/, /^(?:\{\{(~)?\^\s*(~)?\}\})/, /^(?:\{\{(~)?\s*else\s*(~)?\}\})/, /^(?:\{\{(~)?\^)/, /^(?:\{\{(~)?\s*else\b)/, /^(?:\{\{(~)?\{)/, /^(?:\{\{(~)?&)/, /^(?:\{\{(~)?!--)/, /^(?:\{\{(~)?![\s\S]*?\}\})/, /^(?:\{\{(~)?\*?)/, /^(?:=)/, /^(?:\.\.)/, /^(?:\.(?=([=~}\s\/.)|])))/, /^(?:[\/.])/, /^(?:\s+)/, /^(?:\}(~)?\}\})/, /^(?:(~)?\}\})/, /^(?:"(\\["]|[^"])*")/, /^(?:'(\\[']|[^'])*')/, /^(?:@)/, /^(?:true(?=([~}\s)])))/, /^(?:false(?=([~}\s)])))/, /^(?:undefined(?=([~}\s)])))/, /^(?:null(?=([~}\s)])))/, /^(?:-?[0-9]+(?:\.[0-9]+)?(?=([~}\s)])))/, /^(?:as\s+\|)/, /^(?:\|)/, /^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.)|]))))/, /^(?:\[(\\\]|[^\]])*\])/, /^(?:.)/, /^(?:$)/];
        lexer.conditions = { "mu": { "rules": [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44], "inclusive": false }, "emu": { "rules": [2], "inclusive": false }, "com": { "rules": [6], "inclusive": false }, "raw": { "rules": [3, 4, 5], "inclusive": false }, "INITIAL": { "rules": [0, 1, 44], "inclusive": true } };
        return lexer;
    })();
    parser.lexer = lexer;
    function Parser() {
        this.yy = {};
    }Parser.prototype = parser;parser.Parser = Parser;
    return new Parser();
})();exports["default"] = handlebars;
module.exports = exports["default"];


},{}],13:[function(require,module,exports){
/* eslint-disable new-cap */
'use strict';

exports.__esModule = true;
exports.print = print;
exports.PrintVisitor = PrintVisitor;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _visitor = require('./visitor');

var _visitor2 = _interopRequireDefault(_visitor);

function print(ast) {
  return new PrintVisitor().accept(ast);
}

function PrintVisitor() {
  this.padding = 0;
}

PrintVisitor.prototype = new _visitor2['default']();

PrintVisitor.prototype.pad = function (string) {
  var out = '';

  for (var i = 0, l = this.padding; i < l; i++) {
    out += '  ';
  }

  out += string + '\n';
  return out;
};

PrintVisitor.prototype.Program = function (program) {
  var out = '',
      body = program.body,
      i = undefined,
      l = undefined;

  if (program.blockParams) {
    var blockParams = 'BLOCK PARAMS: [';
    for (i = 0, l = program.blockParams.length; i < l; i++) {
      blockParams += ' ' + program.blockParams[i];
    }
    blockParams += ' ]';
    out += this.pad(blockParams);
  }

  for (i = 0, l = body.length; i < l; i++) {
    out += this.accept(body[i]);
  }

  this.padding--;

  return out;
};

PrintVisitor.prototype.MustacheStatement = function (mustache) {
  return this.pad('{{ ' + this.SubExpression(mustache) + ' }}');
};
PrintVisitor.prototype.Decorator = function (mustache) {
  return this.pad('{{ DIRECTIVE ' + this.SubExpression(mustache) + ' }}');
};

PrintVisitor.prototype.BlockStatement = PrintVisitor.prototype.DecoratorBlock = function (block) {
  var out = '';

  out += this.pad((block.type === 'DecoratorBlock' ? 'DIRECTIVE ' : '') + 'BLOCK:');
  this.padding++;
  out += this.pad(this.SubExpression(block));
  if (block.program) {
    out += this.pad('PROGRAM:');
    this.padding++;
    out += this.accept(block.program);
    this.padding--;
  }
  if (block.inverse) {
    if (block.program) {
      this.padding++;
    }
    out += this.pad('{{^}}');
    this.padding++;
    out += this.accept(block.inverse);
    this.padding--;
    if (block.program) {
      this.padding--;
    }
  }
  this.padding--;

  return out;
};

PrintVisitor.prototype.PartialStatement = function (partial) {
  var content = 'PARTIAL:' + partial.name.original;
  if (partial.params[0]) {
    content += ' ' + this.accept(partial.params[0]);
  }
  if (partial.hash) {
    content += ' ' + this.accept(partial.hash);
  }
  return this.pad('{{> ' + content + ' }}');
};
PrintVisitor.prototype.PartialBlockStatement = function (partial) {
  var content = 'PARTIAL BLOCK:' + partial.name.original;
  if (partial.params[0]) {
    content += ' ' + this.accept(partial.params[0]);
  }
  if (partial.hash) {
    content += ' ' + this.accept(partial.hash);
  }

  content += ' ' + this.pad('PROGRAM:');
  this.padding++;
  content += this.accept(partial.program);
  this.padding--;

  return this.pad('{{> ' + content + ' }}');
};

PrintVisitor.prototype.ContentStatement = function (content) {
  return this.pad("CONTENT[ '" + content.value + "' ]");
};

PrintVisitor.prototype.CommentStatement = function (comment) {
  return this.pad("{{! '" + comment.value + "' }}");
};

PrintVisitor.prototype.SubExpression = function (sexpr) {
  var params = sexpr.params,
      paramStrings = [],
      hash = undefined;

  for (var i = 0, l = params.length; i < l; i++) {
    paramStrings.push(this.accept(params[i]));
  }

  params = '[' + paramStrings.join(', ') + ']';

  hash = sexpr.hash ? ' ' + this.accept(sexpr.hash) : '';

  return this.accept(sexpr.path) + ' ' + params + hash;
};

PrintVisitor.prototype.PathExpression = function (id) {
  var path = id.parts.join('/');
  return (id.data ? '@' : '') + 'PATH:' + path;
};

PrintVisitor.prototype.StringLiteral = function (string) {
  return '"' + string.value + '"';
};

PrintVisitor.prototype.NumberLiteral = function (number) {
  return 'NUMBER{' + number.value + '}';
};

PrintVisitor.prototype.BooleanLiteral = function (bool) {
  return 'BOOLEAN{' + bool.value + '}';
};

PrintVisitor.prototype.UndefinedLiteral = function () {
  return 'UNDEFINED';
};

PrintVisitor.prototype.NullLiteral = function () {
  return 'NULL';
};

PrintVisitor.prototype.Hash = function (hash) {
  var pairs = hash.pairs,
      joinedPairs = [];

  for (var i = 0, l = pairs.length; i < l; i++) {
    joinedPairs.push(this.accept(pairs[i]));
  }

  return 'HASH{' + joinedPairs.join(', ') + '}';
};
PrintVisitor.prototype.HashPair = function (pair) {
  return pair.key + '=' + this.accept(pair.value);
};
/* eslint-enable new-cap */


},{"./visitor":14}],14:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

function Visitor() {
  this.parents = [];
}

Visitor.prototype = {
  constructor: Visitor,
  mutating: false,

  // Visits a given value. If mutating, will replace the value if necessary.
  acceptKey: function acceptKey(node, name) {
    var value = this.accept(node[name]);
    if (this.mutating) {
      // Hacky sanity check: This may have a few false positives for type for the helper
      // methods but will generally do the right thing without a lot of overhead.
      if (value && !Visitor.prototype[value.type]) {
        throw new _exception2['default']('Unexpected node type "' + value.type + '" found when accepting ' + name + ' on ' + node.type);
      }
      node[name] = value;
    }
  },

  // Performs an accept operation with added sanity check to ensure
  // required keys are not removed.
  acceptRequired: function acceptRequired(node, name) {
    this.acceptKey(node, name);

    if (!node[name]) {
      throw new _exception2['default'](node.type + ' requires ' + name);
    }
  },

  // Traverses a given array. If mutating, empty respnses will be removed
  // for child elements.
  acceptArray: function acceptArray(array) {
    for (var i = 0, l = array.length; i < l; i++) {
      this.acceptKey(array, i);

      if (!array[i]) {
        array.splice(i, 1);
        i--;
        l--;
      }
    }
  },

  accept: function accept(object) {
    if (!object) {
      return;
    }

    /* istanbul ignore next: Sanity code */
    if (!this[object.type]) {
      throw new _exception2['default']('Unknown type: ' + object.type, object);
    }

    if (this.current) {
      this.parents.unshift(this.current);
    }
    this.current = object;

    var ret = this[object.type](object);

    this.current = this.parents.shift();

    if (!this.mutating || ret) {
      return ret;
    } else if (ret !== false) {
      return object;
    }
  },

  Program: function Program(program) {
    this.acceptArray(program.body);
  },

  MustacheStatement: visitSubExpression,
  Decorator: visitSubExpression,

  BlockStatement: visitBlock,
  DecoratorBlock: visitBlock,

  PartialStatement: visitPartial,
  PartialBlockStatement: function PartialBlockStatement(partial) {
    visitPartial.call(this, partial);

    this.acceptKey(partial, 'program');
  },

  ContentStatement: function ContentStatement() /* content */{},
  CommentStatement: function CommentStatement() /* comment */{},

  SubExpression: visitSubExpression,

  PathExpression: function PathExpression() /* path */{},

  StringLiteral: function StringLiteral() /* string */{},
  NumberLiteral: function NumberLiteral() /* number */{},
  BooleanLiteral: function BooleanLiteral() /* bool */{},
  UndefinedLiteral: function UndefinedLiteral() /* literal */{},
  NullLiteral: function NullLiteral() /* literal */{},

  Hash: function Hash(hash) {
    this.acceptArray(hash.pairs);
  },
  HashPair: function HashPair(pair) {
    this.acceptRequired(pair, 'value');
  }
};

function visitSubExpression(mustache) {
  this.acceptRequired(mustache, 'path');
  this.acceptArray(mustache.params);
  this.acceptKey(mustache, 'hash');
}
function visitBlock(block) {
  visitSubExpression.call(this, block);

  this.acceptKey(block, 'program');
  this.acceptKey(block, 'inverse');
}
function visitPartial(partial) {
  this.acceptRequired(partial, 'name');
  this.acceptArray(partial.params);
  this.acceptKey(partial, 'hash');
}

exports['default'] = Visitor;
module.exports = exports['default'];


},{"../exception":18}],15:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _visitor = require('./visitor');

var _visitor2 = _interopRequireDefault(_visitor);

function WhitespaceControl() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  this.options = options;
}
WhitespaceControl.prototype = new _visitor2['default']();

WhitespaceControl.prototype.Program = function (program) {
  var doStandalone = !this.options.ignoreStandalone;

  var isRoot = !this.isRootSeen;
  this.isRootSeen = true;

  var body = program.body;
  for (var i = 0, l = body.length; i < l; i++) {
    var current = body[i],
        strip = this.accept(current);

    if (!strip) {
      continue;
    }

    var _isPrevWhitespace = isPrevWhitespace(body, i, isRoot),
        _isNextWhitespace = isNextWhitespace(body, i, isRoot),
        openStandalone = strip.openStandalone && _isPrevWhitespace,
        closeStandalone = strip.closeStandalone && _isNextWhitespace,
        inlineStandalone = strip.inlineStandalone && _isPrevWhitespace && _isNextWhitespace;

    if (strip.close) {
      omitRight(body, i, true);
    }
    if (strip.open) {
      omitLeft(body, i, true);
    }

    if (doStandalone && inlineStandalone) {
      omitRight(body, i);

      if (omitLeft(body, i)) {
        // If we are on a standalone node, save the indent info for partials
        if (current.type === 'PartialStatement') {
          // Pull out the whitespace from the final line
          current.indent = /([ \t]+$)/.exec(body[i - 1].original)[1];
        }
      }
    }
    if (doStandalone && openStandalone) {
      omitRight((current.program || current.inverse).body);

      // Strip out the previous content node if it's whitespace only
      omitLeft(body, i);
    }
    if (doStandalone && closeStandalone) {
      // Always strip the next node
      omitRight(body, i);

      omitLeft((current.inverse || current.program).body);
    }
  }

  return program;
};

WhitespaceControl.prototype.BlockStatement = WhitespaceControl.prototype.DecoratorBlock = WhitespaceControl.prototype.PartialBlockStatement = function (block) {
  this.accept(block.program);
  this.accept(block.inverse);

  // Find the inverse program that is involed with whitespace stripping.
  var program = block.program || block.inverse,
      inverse = block.program && block.inverse,
      firstInverse = inverse,
      lastInverse = inverse;

  if (inverse && inverse.chained) {
    firstInverse = inverse.body[0].program;

    // Walk the inverse chain to find the last inverse that is actually in the chain.
    while (lastInverse.chained) {
      lastInverse = lastInverse.body[lastInverse.body.length - 1].program;
    }
  }

  var strip = {
    open: block.openStrip.open,
    close: block.closeStrip.close,

    // Determine the standalone candiacy. Basically flag our content as being possibly standalone
    // so our parent can determine if we actually are standalone
    openStandalone: isNextWhitespace(program.body),
    closeStandalone: isPrevWhitespace((firstInverse || program).body)
  };

  if (block.openStrip.close) {
    omitRight(program.body, null, true);
  }

  if (inverse) {
    var inverseStrip = block.inverseStrip;

    if (inverseStrip.open) {
      omitLeft(program.body, null, true);
    }

    if (inverseStrip.close) {
      omitRight(firstInverse.body, null, true);
    }
    if (block.closeStrip.open) {
      omitLeft(lastInverse.body, null, true);
    }

    // Find standalone else statments
    if (!this.options.ignoreStandalone && isPrevWhitespace(program.body) && isNextWhitespace(firstInverse.body)) {
      omitLeft(program.body);
      omitRight(firstInverse.body);
    }
  } else if (block.closeStrip.open) {
    omitLeft(program.body, null, true);
  }

  return strip;
};

WhitespaceControl.prototype.Decorator = WhitespaceControl.prototype.MustacheStatement = function (mustache) {
  return mustache.strip;
};

WhitespaceControl.prototype.PartialStatement = WhitespaceControl.prototype.CommentStatement = function (node) {
  /* istanbul ignore next */
  var strip = node.strip || {};
  return {
    inlineStandalone: true,
    open: strip.open,
    close: strip.close
  };
};

function isPrevWhitespace(body, i, isRoot) {
  if (i === undefined) {
    i = body.length;
  }

  // Nodes that end with newlines are considered whitespace (but are special
  // cased for strip operations)
  var prev = body[i - 1],
      sibling = body[i - 2];
  if (!prev) {
    return isRoot;
  }

  if (prev.type === 'ContentStatement') {
    return (sibling || !isRoot ? /\r?\n\s*?$/ : /(^|\r?\n)\s*?$/).test(prev.original);
  }
}
function isNextWhitespace(body, i, isRoot) {
  if (i === undefined) {
    i = -1;
  }

  var next = body[i + 1],
      sibling = body[i + 2];
  if (!next) {
    return isRoot;
  }

  if (next.type === 'ContentStatement') {
    return (sibling || !isRoot ? /^\s*?\r?\n/ : /^\s*?(\r?\n|$)/).test(next.original);
  }
}

// Marks the node to the right of the position as omitted.
// I.e. {{foo}}' ' will mark the ' ' node as omitted.
//
// If i is undefined, then the first child will be marked as such.
//
// If mulitple is truthy then all whitespace will be stripped out until non-whitespace
// content is met.
function omitRight(body, i, multiple) {
  var current = body[i == null ? 0 : i + 1];
  if (!current || current.type !== 'ContentStatement' || !multiple && current.rightStripped) {
    return;
  }

  var original = current.value;
  current.value = current.value.replace(multiple ? /^\s+/ : /^[ \t]*\r?\n?/, '');
  current.rightStripped = current.value !== original;
}

// Marks the node to the left of the position as omitted.
// I.e. ' '{{foo}} will mark the ' ' node as omitted.
//
// If i is undefined then the last child will be marked as such.
//
// If mulitple is truthy then all whitespace will be stripped out until non-whitespace
// content is met.
function omitLeft(body, i, multiple) {
  var current = body[i == null ? body.length - 1 : i - 1];
  if (!current || current.type !== 'ContentStatement' || !multiple && current.leftStripped) {
    return;
  }

  // We omit the last node if it's whitespace only and not preceded by a non-content node.
  var original = current.value;
  current.value = current.value.replace(multiple ? /\s+$/ : /[ \t]+$/, '');
  current.leftStripped = current.value !== original;
  return current.leftStripped;
}

exports['default'] = WhitespaceControl;
module.exports = exports['default'];


},{"./visitor":14}],16:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.registerDefaultDecorators = registerDefaultDecorators;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _decoratorsInline = require('./decorators/inline');

var _decoratorsInline2 = _interopRequireDefault(_decoratorsInline);

function registerDefaultDecorators(instance) {
  _decoratorsInline2['default'](instance);
}


},{"./decorators/inline":17}],17:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _utils = require('../utils');

exports['default'] = function (instance) {
  instance.registerDecorator('inline', function (fn, props, container, options) {
    var ret = fn;
    if (!props.partials) {
      props.partials = {};
      ret = function (context, options) {
        // Create a new partials stack frame prior to exec.
        var original = container.partials;
        container.partials = _utils.extend({}, original, props.partials);
        var ret = fn(context, options);
        container.partials = original;
        return ret;
      };
    }

    props.partials[options.args[0]] = options.fn;

    return ret;
  });
};

module.exports = exports['default'];


},{"../utils":34}],18:[function(require,module,exports){
'use strict';

exports.__esModule = true;
var errorProps = ['description', 'fileName', 'lineNumber', 'endLineNumber', 'message', 'name', 'number', 'stack'];

function Exception(message, node) {
  var loc = node && node.loc,
      line = undefined,
      endLineNumber = undefined,
      column = undefined,
      endColumn = undefined;

  if (loc) {
    line = loc.start.line;
    endLineNumber = loc.end.line;
    column = loc.start.column;
    endColumn = loc.end.column;

    message += ' - ' + line + ':' + column;
  }

  var tmp = Error.prototype.constructor.call(this, message);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }

  /* istanbul ignore else */
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, Exception);
  }

  try {
    if (loc) {
      this.lineNumber = line;
      this.endLineNumber = endLineNumber;

      // Work around issue under safari where we can't directly set the column value
      /* istanbul ignore next */
      if (Object.defineProperty) {
        Object.defineProperty(this, 'column', {
          value: column,
          enumerable: true
        });
        Object.defineProperty(this, 'endColumn', {
          value: endColumn,
          enumerable: true
        });
      } else {
        this.column = column;
        this.endColumn = endColumn;
      }
    }
  } catch (nop) {
    /* Ignore if the browser is very particular */
  }
}

Exception.prototype = new Error();

exports['default'] = Exception;
module.exports = exports['default'];


},{}],19:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.registerDefaultHelpers = registerDefaultHelpers;
exports.moveHelperToHooks = moveHelperToHooks;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _helpersBlockHelperMissing = require('./helpers/block-helper-missing');

var _helpersBlockHelperMissing2 = _interopRequireDefault(_helpersBlockHelperMissing);

var _helpersEach = require('./helpers/each');

var _helpersEach2 = _interopRequireDefault(_helpersEach);

var _helpersHelperMissing = require('./helpers/helper-missing');

var _helpersHelperMissing2 = _interopRequireDefault(_helpersHelperMissing);

var _helpersIf = require('./helpers/if');

var _helpersIf2 = _interopRequireDefault(_helpersIf);

var _helpersLog = require('./helpers/log');

var _helpersLog2 = _interopRequireDefault(_helpersLog);

var _helpersLookup = require('./helpers/lookup');

var _helpersLookup2 = _interopRequireDefault(_helpersLookup);

var _helpersWith = require('./helpers/with');

var _helpersWith2 = _interopRequireDefault(_helpersWith);

function registerDefaultHelpers(instance) {
  _helpersBlockHelperMissing2['default'](instance);
  _helpersEach2['default'](instance);
  _helpersHelperMissing2['default'](instance);
  _helpersIf2['default'](instance);
  _helpersLog2['default'](instance);
  _helpersLookup2['default'](instance);
  _helpersWith2['default'](instance);
}

function moveHelperToHooks(instance, helperName, keepHelper) {
  if (instance.helpers[helperName]) {
    instance.hooks[helperName] = instance.helpers[helperName];
    if (!keepHelper) {
      delete instance.helpers[helperName];
    }
  }
}


},{"./helpers/block-helper-missing":20,"./helpers/each":21,"./helpers/helper-missing":22,"./helpers/if":23,"./helpers/log":24,"./helpers/lookup":25,"./helpers/with":26}],20:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _utils = require('../utils');

exports['default'] = function (instance) {
  instance.registerHelper('blockHelperMissing', function (context, options) {
    var inverse = options.inverse,
        fn = options.fn;

    if (context === true) {
      return fn(this);
    } else if (context === false || context == null) {
      return inverse(this);
    } else if (_utils.isArray(context)) {
      if (context.length > 0) {
        if (options.ids) {
          options.ids = [options.name];
        }

        return instance.helpers.each(context, options);
      } else {
        return inverse(this);
      }
    } else {
      if (options.data && options.ids) {
        var data = _utils.createFrame(options.data);
        data.contextPath = _utils.appendContextPath(options.data.contextPath, options.name);
        options = { data: data };
      }

      return fn(context, options);
    }
  });
};

module.exports = exports['default'];


},{"../utils":34}],21:[function(require,module,exports){
(function (global){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _utils = require('../utils');

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

exports['default'] = function (instance) {
  instance.registerHelper('each', function (context, options) {
    if (!options) {
      throw new _exception2['default']('Must pass iterator to #each');
    }

    var fn = options.fn,
        inverse = options.inverse,
        i = 0,
        ret = '',
        data = undefined,
        contextPath = undefined;

    if (options.data && options.ids) {
      contextPath = _utils.appendContextPath(options.data.contextPath, options.ids[0]) + '.';
    }

    if (_utils.isFunction(context)) {
      context = context.call(this);
    }

    if (options.data) {
      data = _utils.createFrame(options.data);
    }

    function execIteration(field, index, last) {
      if (data) {
        data.key = field;
        data.index = index;
        data.first = index === 0;
        data.last = !!last;

        if (contextPath) {
          data.contextPath = contextPath + field;
        }
      }

      ret = ret + fn(context[field], {
        data: data,
        blockParams: _utils.blockParams([context[field], field], [contextPath + field, null])
      });
    }

    if (context && typeof context === 'object') {
      if (_utils.isArray(context)) {
        for (var j = context.length; i < j; i++) {
          if (i in context) {
            execIteration(i, i, i === context.length - 1);
          }
        }
      } else if (global.Symbol && context[global.Symbol.iterator]) {
        var newContext = [];
        var iterator = context[global.Symbol.iterator]();
        for (var it = iterator.next(); !it.done; it = iterator.next()) {
          newContext.push(it.value);
        }
        context = newContext;
        for (var j = context.length; i < j; i++) {
          execIteration(i, i, i === context.length - 1);
        }
      } else {
        (function () {
          var priorKey = undefined;

          Object.keys(context).forEach(function (key) {
            // We're running the iterations one step out of sync so we can detect
            // the last iteration without have to scan the object twice and create
            // an itermediate keys array.
            if (priorKey !== undefined) {
              execIteration(priorKey, i - 1);
            }
            priorKey = key;
            i++;
          });
          if (priorKey !== undefined) {
            execIteration(priorKey, i - 1, true);
          }
        })();
      }
    }

    if (i === 0) {
      ret = inverse(this);
    }

    return ret;
  });
};

module.exports = exports['default'];


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../exception":18,"../utils":34}],22:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

exports['default'] = function (instance) {
  instance.registerHelper('helperMissing', function () /* [args, ]options */{
    if (arguments.length === 1) {
      // A missing field in a {{foo}} construct.
      return undefined;
    } else {
      // Someone is actually trying to call something, blow up.
      throw new _exception2['default']('Missing helper: "' + arguments[arguments.length - 1].name + '"');
    }
  });
};

module.exports = exports['default'];


},{"../exception":18}],23:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _utils = require('../utils');

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

exports['default'] = function (instance) {
  instance.registerHelper('if', function (conditional, options) {
    if (arguments.length != 2) {
      throw new _exception2['default']('#if requires exactly one argument');
    }
    if (_utils.isFunction(conditional)) {
      conditional = conditional.call(this);
    }

    // Default behavior is to render the positive path if the value is truthy and not empty.
    // The `includeZero` option may be set to treat the condtional as purely not empty based on the
    // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
    if (!options.hash.includeZero && !conditional || _utils.isEmpty(conditional)) {
      return options.inverse(this);
    } else {
      return options.fn(this);
    }
  });

  instance.registerHelper('unless', function (conditional, options) {
    if (arguments.length != 2) {
      throw new _exception2['default']('#unless requires exactly one argument');
    }
    return instance.helpers['if'].call(this, conditional, {
      fn: options.inverse,
      inverse: options.fn,
      hash: options.hash
    });
  });
};

module.exports = exports['default'];


},{"../exception":18,"../utils":34}],24:[function(require,module,exports){
'use strict';

exports.__esModule = true;

exports['default'] = function (instance) {
  instance.registerHelper('log', function () /* message, options */{
    var args = [undefined],
        options = arguments[arguments.length - 1];
    for (var i = 0; i < arguments.length - 1; i++) {
      args.push(arguments[i]);
    }

    var level = 1;
    if (options.hash.level != null) {
      level = options.hash.level;
    } else if (options.data && options.data.level != null) {
      level = options.data.level;
    }
    args[0] = level;

    instance.log.apply(instance, args);
  });
};

module.exports = exports['default'];


},{}],25:[function(require,module,exports){
'use strict';

exports.__esModule = true;

exports['default'] = function (instance) {
  instance.registerHelper('lookup', function (obj, field, options) {
    if (!obj) {
      // Note for 5.0: Change to "obj == null" in 5.0
      return obj;
    }
    return options.lookupProperty(obj, field);
  });
};

module.exports = exports['default'];


},{}],26:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _utils = require('../utils');

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

exports['default'] = function (instance) {
  instance.registerHelper('with', function (context, options) {
    if (arguments.length != 2) {
      throw new _exception2['default']('#with requires exactly one argument');
    }
    if (_utils.isFunction(context)) {
      context = context.call(this);
    }

    var fn = options.fn;

    if (!_utils.isEmpty(context)) {
      var data = options.data;
      if (options.data && options.ids) {
        data = _utils.createFrame(options.data);
        data.contextPath = _utils.appendContextPath(options.data.contextPath, options.ids[0]);
      }

      return fn(context, {
        data: data,
        blockParams: _utils.blockParams([context], [data && data.contextPath])
      });
    } else {
      return options.inverse(this);
    }
  });
};

module.exports = exports['default'];


},{"../exception":18,"../utils":34}],27:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.createNewLookupObject = createNewLookupObject;

var _utils = require('../utils');

/**
 * Create a new object with "null"-prototype to avoid truthy results on prototype properties.
 * The resulting object can be used with "object[property]" to check if a property exists
 * @param {...object} sources a varargs parameter of source objects that will be merged
 * @returns {object}
 */

function createNewLookupObject() {
  for (var _len = arguments.length, sources = Array(_len), _key = 0; _key < _len; _key++) {
    sources[_key] = arguments[_key];
  }

  return _utils.extend.apply(undefined, [Object.create(null)].concat(sources));
}


},{"../utils":34}],28:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.createProtoAccessControl = createProtoAccessControl;
exports.resultIsAllowed = resultIsAllowed;
exports.resetLoggedProperties = resetLoggedProperties;
// istanbul ignore next

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _createNewLookupObject = require('./create-new-lookup-object');

var _logger = require('../logger');

var logger = _interopRequireWildcard(_logger);

var loggedProperties = Object.create(null);

function createProtoAccessControl(runtimeOptions) {
  var defaultMethodWhiteList = Object.create(null);
  defaultMethodWhiteList['constructor'] = false;
  defaultMethodWhiteList['__defineGetter__'] = false;
  defaultMethodWhiteList['__defineSetter__'] = false;
  defaultMethodWhiteList['__lookupGetter__'] = false;

  var defaultPropertyWhiteList = Object.create(null);
  // eslint-disable-next-line no-proto
  defaultPropertyWhiteList['__proto__'] = false;

  return {
    properties: {
      whitelist: _createNewLookupObject.createNewLookupObject(defaultPropertyWhiteList, runtimeOptions.allowedProtoProperties),
      defaultValue: runtimeOptions.allowProtoPropertiesByDefault
    },
    methods: {
      whitelist: _createNewLookupObject.createNewLookupObject(defaultMethodWhiteList, runtimeOptions.allowedProtoMethods),
      defaultValue: runtimeOptions.allowProtoMethodsByDefault
    }
  };
}

function resultIsAllowed(result, protoAccessControl, propertyName) {
  if (typeof result === 'function') {
    return checkWhiteList(protoAccessControl.methods, propertyName);
  } else {
    return checkWhiteList(protoAccessControl.properties, propertyName);
  }
}

function checkWhiteList(protoAccessControlForType, propertyName) {
  if (protoAccessControlForType.whitelist[propertyName] !== undefined) {
    return protoAccessControlForType.whitelist[propertyName] === true;
  }
  if (protoAccessControlForType.defaultValue !== undefined) {
    return protoAccessControlForType.defaultValue;
  }
  logUnexpecedPropertyAccessOnce(propertyName);
  return false;
}

function logUnexpecedPropertyAccessOnce(propertyName) {
  if (loggedProperties[propertyName] !== true) {
    loggedProperties[propertyName] = true;
    logger.log('error', 'Handlebars: Access has been denied to resolve the property "' + propertyName + '" because it is not an "own property" of its parent.\n' + 'You can add a runtime option to disable the check or this warning:\n' + 'See https://handlebarsjs.com/api-reference/runtime-options.html#options-to-control-prototype-access for details');
  }
}

function resetLoggedProperties() {
  Object.keys(loggedProperties).forEach(function (propertyName) {
    delete loggedProperties[propertyName];
  });
}


},{"../logger":30,"./create-new-lookup-object":27}],29:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.wrapHelper = wrapHelper;

function wrapHelper(helper, transformOptionsFn) {
  if (typeof helper !== 'function') {
    // This should not happen, but apparently it does in https://github.com/wycats/handlebars.js/issues/1639
    // We try to make the wrapper least-invasive by not wrapping it, if the helper is not a function.
    return helper;
  }
  var wrapper = function wrapper() /* dynamic arguments */{
    var options = arguments[arguments.length - 1];
    arguments[arguments.length - 1] = transformOptionsFn(options);
    return helper.apply(this, arguments);
  };
  return wrapper;
}


},{}],30:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _utils = require('./utils');

var logger = {
  methodMap: ['debug', 'info', 'warn', 'error'],
  level: 'info',

  // Maps a given level value to the `methodMap` indexes above.
  lookupLevel: function lookupLevel(level) {
    if (typeof level === 'string') {
      var levelMap = _utils.indexOf(logger.methodMap, level.toLowerCase());
      if (levelMap >= 0) {
        level = levelMap;
      } else {
        level = parseInt(level, 10);
      }
    }

    return level;
  },

  // Can be overridden in the host environment
  log: function log(level) {
    level = logger.lookupLevel(level);

    if (typeof console !== 'undefined' && logger.lookupLevel(logger.level) <= level) {
      var method = logger.methodMap[level];
      // eslint-disable-next-line no-console
      if (!console[method]) {
        method = 'log';
      }

      for (var _len = arguments.length, message = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        message[_key - 1] = arguments[_key];
      }

      console[method].apply(console, message); // eslint-disable-line no-console
    }
  }
};

exports['default'] = logger;
module.exports = exports['default'];


},{"./utils":34}],31:[function(require,module,exports){
(function (global){
'use strict';

exports.__esModule = true;

exports['default'] = function (Handlebars) {
  /* istanbul ignore next */
  var root = typeof global !== 'undefined' ? global : window,
      $Handlebars = root.Handlebars;
  /* istanbul ignore next */
  Handlebars.noConflict = function () {
    if (root.Handlebars === Handlebars) {
      root.Handlebars = $Handlebars;
    }
    return Handlebars;
  };
};

module.exports = exports['default'];


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],32:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.checkRevision = checkRevision;
exports.template = template;
exports.wrapProgram = wrapProgram;
exports.resolvePartial = resolvePartial;
exports.invokePartial = invokePartial;
exports.noop = noop;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

// istanbul ignore next

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _utils = require('./utils');

var Utils = _interopRequireWildcard(_utils);

var _exception = require('./exception');

var _exception2 = _interopRequireDefault(_exception);

var _base = require('./base');

var _helpers = require('./helpers');

var _internalWrapHelper = require('./internal/wrapHelper');

var _internalProtoAccess = require('./internal/proto-access');

function checkRevision(compilerInfo) {
  var compilerRevision = compilerInfo && compilerInfo[0] || 1,
      currentRevision = _base.COMPILER_REVISION;

  if (compilerRevision >= _base.LAST_COMPATIBLE_COMPILER_REVISION && compilerRevision <= _base.COMPILER_REVISION) {
    return;
  }

  if (compilerRevision < _base.LAST_COMPATIBLE_COMPILER_REVISION) {
    var runtimeVersions = _base.REVISION_CHANGES[currentRevision],
        compilerVersions = _base.REVISION_CHANGES[compilerRevision];
    throw new _exception2['default']('Template was precompiled with an older version of Handlebars than the current runtime. ' + 'Please update your precompiler to a newer version (' + runtimeVersions + ') or downgrade your runtime to an older version (' + compilerVersions + ').');
  } else {
    // Use the embedded version info since the runtime doesn't know about this revision yet
    throw new _exception2['default']('Template was precompiled with a newer version of Handlebars than the current runtime. ' + 'Please update your runtime to a newer version (' + compilerInfo[1] + ').');
  }
}

function template(templateSpec, env) {
  /* istanbul ignore next */
  if (!env) {
    throw new _exception2['default']('No environment passed to template');
  }
  if (!templateSpec || !templateSpec.main) {
    throw new _exception2['default']('Unknown template object: ' + typeof templateSpec);
  }

  templateSpec.main.decorator = templateSpec.main_d;

  // Note: Using env.VM references rather than local var references throughout this section to allow
  // for external users to override these as pseudo-supported APIs.
  env.VM.checkRevision(templateSpec.compiler);

  // backwards compatibility for precompiled templates with compiler-version 7 (<4.3.0)
  var templateWasPrecompiledWithCompilerV7 = templateSpec.compiler && templateSpec.compiler[0] === 7;

  function invokePartialWrapper(partial, context, options) {
    if (options.hash) {
      context = Utils.extend({}, context, options.hash);
      if (options.ids) {
        options.ids[0] = true;
      }
    }
    partial = env.VM.resolvePartial.call(this, partial, context, options);

    var extendedOptions = Utils.extend({}, options, {
      hooks: this.hooks,
      protoAccessControl: this.protoAccessControl
    });

    var result = env.VM.invokePartial.call(this, partial, context, extendedOptions);

    if (result == null && env.compile) {
      options.partials[options.name] = env.compile(partial, templateSpec.compilerOptions, env);
      result = options.partials[options.name](context, extendedOptions);
    }
    if (result != null) {
      if (options.indent) {
        var lines = result.split('\n');
        for (var i = 0, l = lines.length; i < l; i++) {
          if (!lines[i] && i + 1 === l) {
            break;
          }

          lines[i] = options.indent + lines[i];
        }
        result = lines.join('\n');
      }
      return result;
    } else {
      throw new _exception2['default']('The partial ' + options.name + ' could not be compiled when running in runtime-only mode');
    }
  }

  // Just add water
  var container = {
    strict: function strict(obj, name, loc) {
      if (!obj || !(name in obj)) {
        throw new _exception2['default']('"' + name + '" not defined in ' + obj, {
          loc: loc
        });
      }
      return container.lookupProperty(obj, name);
    },
    lookupProperty: function lookupProperty(parent, propertyName) {
      var result = parent[propertyName];
      if (result == null) {
        return result;
      }
      if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
        return result;
      }

      if (_internalProtoAccess.resultIsAllowed(result, container.protoAccessControl, propertyName)) {
        return result;
      }
      return undefined;
    },
    lookup: function lookup(depths, name) {
      var len = depths.length;
      for (var i = 0; i < len; i++) {
        var result = depths[i] && container.lookupProperty(depths[i], name);
        if (result != null) {
          return depths[i][name];
        }
      }
    },
    lambda: function lambda(current, context) {
      return typeof current === 'function' ? current.call(context) : current;
    },

    escapeExpression: Utils.escapeExpression,
    invokePartial: invokePartialWrapper,

    fn: function fn(i) {
      var ret = templateSpec[i];
      ret.decorator = templateSpec[i + '_d'];
      return ret;
    },

    programs: [],
    program: function program(i, data, declaredBlockParams, blockParams, depths) {
      var programWrapper = this.programs[i],
          fn = this.fn(i);
      if (data || depths || blockParams || declaredBlockParams) {
        programWrapper = wrapProgram(this, i, fn, data, declaredBlockParams, blockParams, depths);
      } else if (!programWrapper) {
        programWrapper = this.programs[i] = wrapProgram(this, i, fn);
      }
      return programWrapper;
    },

    data: function data(value, depth) {
      while (value && depth--) {
        value = value._parent;
      }
      return value;
    },
    mergeIfNeeded: function mergeIfNeeded(param, common) {
      var obj = param || common;

      if (param && common && param !== common) {
        obj = Utils.extend({}, common, param);
      }

      return obj;
    },
    // An empty object to use as replacement for null-contexts
    nullContext: Object.seal({}),

    noop: env.VM.noop,
    compilerInfo: templateSpec.compiler
  };

  function ret(context) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var data = options.data;

    ret._setup(options);
    if (!options.partial && templateSpec.useData) {
      data = initData(context, data);
    }
    var depths = undefined,
        blockParams = templateSpec.useBlockParams ? [] : undefined;
    if (templateSpec.useDepths) {
      if (options.depths) {
        depths = context != options.depths[0] ? [context].concat(options.depths) : options.depths;
      } else {
        depths = [context];
      }
    }

    function main(context /*, options*/) {
      return '' + templateSpec.main(container, context, container.helpers, container.partials, data, blockParams, depths);
    }

    main = executeDecorators(templateSpec.main, main, container, options.depths || [], data, blockParams);
    return main(context, options);
  }

  ret.isTop = true;

  ret._setup = function (options) {
    if (!options.partial) {
      var mergedHelpers = Utils.extend({}, env.helpers, options.helpers);
      wrapHelpersToPassLookupProperty(mergedHelpers, container);
      container.helpers = mergedHelpers;

      if (templateSpec.usePartial) {
        // Use mergeIfNeeded here to prevent compiling global partials multiple times
        container.partials = container.mergeIfNeeded(options.partials, env.partials);
      }
      if (templateSpec.usePartial || templateSpec.useDecorators) {
        container.decorators = Utils.extend({}, env.decorators, options.decorators);
      }

      container.hooks = {};
      container.protoAccessControl = _internalProtoAccess.createProtoAccessControl(options);

      var keepHelperInHelpers = options.allowCallsToHelperMissing || templateWasPrecompiledWithCompilerV7;
      _helpers.moveHelperToHooks(container, 'helperMissing', keepHelperInHelpers);
      _helpers.moveHelperToHooks(container, 'blockHelperMissing', keepHelperInHelpers);
    } else {
      container.protoAccessControl = options.protoAccessControl; // internal option
      container.helpers = options.helpers;
      container.partials = options.partials;
      container.decorators = options.decorators;
      container.hooks = options.hooks;
    }
  };

  ret._child = function (i, data, blockParams, depths) {
    if (templateSpec.useBlockParams && !blockParams) {
      throw new _exception2['default']('must pass block params');
    }
    if (templateSpec.useDepths && !depths) {
      throw new _exception2['default']('must pass parent depths');
    }

    return wrapProgram(container, i, templateSpec[i], data, 0, blockParams, depths);
  };
  return ret;
}

function wrapProgram(container, i, fn, data, declaredBlockParams, blockParams, depths) {
  function prog(context) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var currentDepths = depths;
    if (depths && context != depths[0] && !(context === container.nullContext && depths[0] === null)) {
      currentDepths = [context].concat(depths);
    }

    return fn(container, context, container.helpers, container.partials, options.data || data, blockParams && [options.blockParams].concat(blockParams), currentDepths);
  }

  prog = executeDecorators(fn, prog, container, depths, data, blockParams);

  prog.program = i;
  prog.depth = depths ? depths.length : 0;
  prog.blockParams = declaredBlockParams || 0;
  return prog;
}

/**
 * This is currently part of the official API, therefore implementation details should not be changed.
 */

function resolvePartial(partial, context, options) {
  if (!partial) {
    if (options.name === '@partial-block') {
      partial = options.data['partial-block'];
    } else {
      partial = options.partials[options.name];
    }
  } else if (!partial.call && !options.name) {
    // This is a dynamic partial that returned a string
    options.name = partial;
    partial = options.partials[partial];
  }
  return partial;
}

function invokePartial(partial, context, options) {
  // Use the current closure context to save the partial-block if this partial
  var currentPartialBlock = options.data && options.data['partial-block'];
  options.partial = true;
  if (options.ids) {
    options.data.contextPath = options.ids[0] || options.data.contextPath;
  }

  var partialBlock = undefined;
  if (options.fn && options.fn !== noop) {
    (function () {
      options.data = _base.createFrame(options.data);
      // Wrapper function to get access to currentPartialBlock from the closure
      var fn = options.fn;
      partialBlock = options.data['partial-block'] = function partialBlockWrapper(context) {
        var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        // Restore the partial-block from the closure for the execution of the block
        // i.e. the part inside the block of the partial call.
        options.data = _base.createFrame(options.data);
        options.data['partial-block'] = currentPartialBlock;
        return fn(context, options);
      };
      if (fn.partials) {
        options.partials = Utils.extend({}, options.partials, fn.partials);
      }
    })();
  }

  if (partial === undefined && partialBlock) {
    partial = partialBlock;
  }

  if (partial === undefined) {
    throw new _exception2['default']('The partial ' + options.name + ' could not be found');
  } else if (partial instanceof Function) {
    return partial(context, options);
  }
}

function noop() {
  return '';
}

function initData(context, data) {
  if (!data || !('root' in data)) {
    data = data ? _base.createFrame(data) : {};
    data.root = context;
  }
  return data;
}

function executeDecorators(fn, prog, container, depths, data, blockParams) {
  if (fn.decorator) {
    var props = {};
    prog = fn.decorator(prog, props, container, depths && depths[0], data, blockParams, depths);
    Utils.extend(prog, props);
  }
  return prog;
}

function wrapHelpersToPassLookupProperty(mergedHelpers, container) {
  Object.keys(mergedHelpers).forEach(function (helperName) {
    var helper = mergedHelpers[helperName];
    mergedHelpers[helperName] = passLookupPropertyOption(helper, container);
  });
}

function passLookupPropertyOption(helper, container) {
  var lookupProperty = container.lookupProperty;
  return _internalWrapHelper.wrapHelper(helper, function (options) {
    return Utils.extend({ lookupProperty: lookupProperty }, options);
  });
}


},{"./base":5,"./exception":18,"./helpers":19,"./internal/proto-access":28,"./internal/wrapHelper":29,"./utils":34}],33:[function(require,module,exports){
// Build out our basic SafeString type
'use strict';

exports.__esModule = true;
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = SafeString.prototype.toHTML = function () {
  return '' + this.string;
};

exports['default'] = SafeString;
module.exports = exports['default'];


},{}],34:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.extend = extend;
exports.indexOf = indexOf;
exports.escapeExpression = escapeExpression;
exports.isEmpty = isEmpty;
exports.createFrame = createFrame;
exports.blockParams = blockParams;
exports.appendContextPath = appendContextPath;
var escape = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

var badChars = /[&<>"'`=]/g,
    possible = /[&<>"'`=]/;

function escapeChar(chr) {
  return escape[chr];
}

function extend(obj /* , ...source */) {
  for (var i = 1; i < arguments.length; i++) {
    for (var key in arguments[i]) {
      if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
        obj[key] = arguments[i][key];
      }
    }
  }

  return obj;
}

var toString = Object.prototype.toString;

exports.toString = toString;
// Sourced from lodash
// https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
/* eslint-disable func-style */
var isFunction = function isFunction(value) {
  return typeof value === 'function';
};
// fallback for older versions of Chrome and Safari
/* istanbul ignore next */
if (isFunction(/x/)) {
  exports.isFunction = isFunction = function (value) {
    return typeof value === 'function' && toString.call(value) === '[object Function]';
  };
}
exports.isFunction = isFunction;

/* eslint-enable func-style */

/* istanbul ignore next */
var isArray = Array.isArray || function (value) {
  return value && typeof value === 'object' ? toString.call(value) === '[object Array]' : false;
};

exports.isArray = isArray;
// Older IE versions do not directly support indexOf so we must implement our own, sadly.

function indexOf(array, value) {
  for (var i = 0, len = array.length; i < len; i++) {
    if (array[i] === value) {
      return i;
    }
  }
  return -1;
}

function escapeExpression(string) {
  if (typeof string !== 'string') {
    // don't escape SafeStrings, since they're already safe
    if (string && string.toHTML) {
      return string.toHTML();
    } else if (string == null) {
      return '';
    } else if (!string) {
      return string + '';
    }

    // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.
    string = '' + string;
  }

  if (!possible.test(string)) {
    return string;
  }
  return string.replace(badChars, escapeChar);
}

function isEmpty(value) {
  if (!value && value !== 0) {
    return true;
  } else if (isArray(value) && value.length === 0) {
    return true;
  } else {
    return false;
  }
}

function createFrame(object) {
  var frame = extend({}, object);
  frame._parent = object;
  return frame;
}

function blockParams(params, ids) {
  params.path = ids;
  return params;
}

function appendContextPath(contextPath, id) {
  return (contextPath ? contextPath + '.' : '') + id;
}


},{}],35:[function(require,module,exports){
// USAGE:
// var handlebars = require('handlebars');
/* eslint-disable no-var */

// var local = handlebars.create();

var handlebars = require('../dist/cjs/handlebars')['default'];

var printer = require('../dist/cjs/handlebars/compiler/printer');
handlebars.PrintVisitor = printer.PrintVisitor;
handlebars.print = printer.print;

module.exports = handlebars;

// Publish a Node.js require() handler for .handlebars and .hbs files
function extension(module, filename) {
  var fs = require('fs');
  var templateString = fs.readFileSync(filename, 'utf8');
  module.exports = handlebars.compile(templateString);
}
/* istanbul ignore else */
if (typeof require !== 'undefined' && require.extensions) {
  require.extensions['.handlebars'] = extension;
  require.extensions['.hbs'] = extension;
}

},{"../dist/cjs/handlebars":3,"../dist/cjs/handlebars/compiler/printer":13,"fs":47}],36:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util = require('./util');
var has = Object.prototype.hasOwnProperty;
var hasNativeMap = typeof Map !== "undefined";

/**
 * A data structure which is a combination of an array and a set. Adding a new
 * member is O(1), testing for membership is O(1), and finding the index of an
 * element is O(1). Removing elements from the set is not supported. Only
 * strings are supported for membership.
 */
function ArraySet() {
  this._array = [];
  this._set = hasNativeMap ? new Map() : Object.create(null);
}

/**
 * Static method for creating ArraySet instances from an existing array.
 */
ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
  var set = new ArraySet();
  for (var i = 0, len = aArray.length; i < len; i++) {
    set.add(aArray[i], aAllowDuplicates);
  }
  return set;
};

/**
 * Return how many unique items are in this ArraySet. If duplicates have been
 * added, than those do not count towards the size.
 *
 * @returns Number
 */
ArraySet.prototype.size = function ArraySet_size() {
  return hasNativeMap ? this._set.size : Object.getOwnPropertyNames(this._set).length;
};

/**
 * Add the given string to this set.
 *
 * @param String aStr
 */
ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
  var sStr = hasNativeMap ? aStr : util.toSetString(aStr);
  var isDuplicate = hasNativeMap ? this.has(aStr) : has.call(this._set, sStr);
  var idx = this._array.length;
  if (!isDuplicate || aAllowDuplicates) {
    this._array.push(aStr);
  }
  if (!isDuplicate) {
    if (hasNativeMap) {
      this._set.set(aStr, idx);
    } else {
      this._set[sStr] = idx;
    }
  }
};

/**
 * Is the given string a member of this set?
 *
 * @param String aStr
 */
ArraySet.prototype.has = function ArraySet_has(aStr) {
  if (hasNativeMap) {
    return this._set.has(aStr);
  } else {
    var sStr = util.toSetString(aStr);
    return has.call(this._set, sStr);
  }
};

/**
 * What is the index of the given string in the array?
 *
 * @param String aStr
 */
ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
  if (hasNativeMap) {
    var idx = this._set.get(aStr);
    if (idx >= 0) {
        return idx;
    }
  } else {
    var sStr = util.toSetString(aStr);
    if (has.call(this._set, sStr)) {
      return this._set[sStr];
    }
  }

  throw new Error('"' + aStr + '" is not in the set.');
};

/**
 * What is the element at the given index?
 *
 * @param Number aIdx
 */
ArraySet.prototype.at = function ArraySet_at(aIdx) {
  if (aIdx >= 0 && aIdx < this._array.length) {
    return this._array[aIdx];
  }
  throw new Error('No element indexed by ' + aIdx);
};

/**
 * Returns the array representation of this set (which has the proper indices
 * indicated by indexOf). Note that this is a copy of the internal array used
 * for storing the members so that no one can mess with internal state.
 */
ArraySet.prototype.toArray = function ArraySet_toArray() {
  return this._array.slice();
};

exports.ArraySet = ArraySet;

},{"./util":45}],37:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 *
 * Based on the Base 64 VLQ implementation in Closure Compiler:
 * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
 *
 * Copyright 2011 The Closure Compiler Authors. All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above
 *    copyright notice, this list of conditions and the following
 *    disclaimer in the documentation and/or other materials provided
 *    with the distribution.
 *  * Neither the name of Google Inc. nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var base64 = require('./base64');

// A single base 64 digit can contain 6 bits of data. For the base 64 variable
// length quantities we use in the source map spec, the first bit is the sign,
// the next four bits are the actual value, and the 6th bit is the
// continuation bit. The continuation bit tells us whether there are more
// digits in this value following this digit.
//
//   Continuation
//   |    Sign
//   |    |
//   V    V
//   101011

var VLQ_BASE_SHIFT = 5;

// binary: 100000
var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

// binary: 011111
var VLQ_BASE_MASK = VLQ_BASE - 1;

// binary: 100000
var VLQ_CONTINUATION_BIT = VLQ_BASE;

/**
 * Converts from a two-complement value to a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
 *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
 */
function toVLQSigned(aValue) {
  return aValue < 0
    ? ((-aValue) << 1) + 1
    : (aValue << 1) + 0;
}

/**
 * Converts to a two-complement value from a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
 *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
 */
function fromVLQSigned(aValue) {
  var isNegative = (aValue & 1) === 1;
  var shifted = aValue >> 1;
  return isNegative
    ? -shifted
    : shifted;
}

/**
 * Returns the base 64 VLQ encoded value.
 */
exports.encode = function base64VLQ_encode(aValue) {
  var encoded = "";
  var digit;

  var vlq = toVLQSigned(aValue);

  do {
    digit = vlq & VLQ_BASE_MASK;
    vlq >>>= VLQ_BASE_SHIFT;
    if (vlq > 0) {
      // There are still more digits in this value, so we must make sure the
      // continuation bit is marked.
      digit |= VLQ_CONTINUATION_BIT;
    }
    encoded += base64.encode(digit);
  } while (vlq > 0);

  return encoded;
};

/**
 * Decodes the next base 64 VLQ value from the given string and returns the
 * value and the rest of the string via the out parameter.
 */
exports.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
  var strLen = aStr.length;
  var result = 0;
  var shift = 0;
  var continuation, digit;

  do {
    if (aIndex >= strLen) {
      throw new Error("Expected more digits in base 64 VLQ value.");
    }

    digit = base64.decode(aStr.charCodeAt(aIndex++));
    if (digit === -1) {
      throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
    }

    continuation = !!(digit & VLQ_CONTINUATION_BIT);
    digit &= VLQ_BASE_MASK;
    result = result + (digit << shift);
    shift += VLQ_BASE_SHIFT;
  } while (continuation);

  aOutParam.value = fromVLQSigned(result);
  aOutParam.rest = aIndex;
};

},{"./base64":38}],38:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var intToCharMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');

/**
 * Encode an integer in the range of 0 to 63 to a single base 64 digit.
 */
exports.encode = function (number) {
  if (0 <= number && number < intToCharMap.length) {
    return intToCharMap[number];
  }
  throw new TypeError("Must be between 0 and 63: " + number);
};

/**
 * Decode a single base 64 character code digit to an integer. Returns -1 on
 * failure.
 */
exports.decode = function (charCode) {
  var bigA = 65;     // 'A'
  var bigZ = 90;     // 'Z'

  var littleA = 97;  // 'a'
  var littleZ = 122; // 'z'

  var zero = 48;     // '0'
  var nine = 57;     // '9'

  var plus = 43;     // '+'
  var slash = 47;    // '/'

  var littleOffset = 26;
  var numberOffset = 52;

  // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
  if (bigA <= charCode && charCode <= bigZ) {
    return (charCode - bigA);
  }

  // 26 - 51: abcdefghijklmnopqrstuvwxyz
  if (littleA <= charCode && charCode <= littleZ) {
    return (charCode - littleA + littleOffset);
  }

  // 52 - 61: 0123456789
  if (zero <= charCode && charCode <= nine) {
    return (charCode - zero + numberOffset);
  }

  // 62: +
  if (charCode == plus) {
    return 62;
  }

  // 63: /
  if (charCode == slash) {
    return 63;
  }

  // Invalid base64 digit.
  return -1;
};

},{}],39:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

exports.GREATEST_LOWER_BOUND = 1;
exports.LEAST_UPPER_BOUND = 2;

/**
 * Recursive implementation of binary search.
 *
 * @param aLow Indices here and lower do not contain the needle.
 * @param aHigh Indices here and higher do not contain the needle.
 * @param aNeedle The element being searched for.
 * @param aHaystack The non-empty array being searched.
 * @param aCompare Function which takes two elements and returns -1, 0, or 1.
 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 */
function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
  // This function terminates when one of the following is true:
  //
  //   1. We find the exact element we are looking for.
  //
  //   2. We did not find the exact element, but we can return the index of
  //      the next-closest element.
  //
  //   3. We did not find the exact element, and there is no next-closest
  //      element than the one we are searching for, so we return -1.
  var mid = Math.floor((aHigh - aLow) / 2) + aLow;
  var cmp = aCompare(aNeedle, aHaystack[mid], true);
  if (cmp === 0) {
    // Found the element we are looking for.
    return mid;
  }
  else if (cmp > 0) {
    // Our needle is greater than aHaystack[mid].
    if (aHigh - mid > 1) {
      // The element is in the upper half.
      return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
    }

    // The exact needle element was not found in this haystack. Determine if
    // we are in termination case (3) or (2) and return the appropriate thing.
    if (aBias == exports.LEAST_UPPER_BOUND) {
      return aHigh < aHaystack.length ? aHigh : -1;
    } else {
      return mid;
    }
  }
  else {
    // Our needle is less than aHaystack[mid].
    if (mid - aLow > 1) {
      // The element is in the lower half.
      return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
    }

    // we are in termination case (3) or (2) and return the appropriate thing.
    if (aBias == exports.LEAST_UPPER_BOUND) {
      return mid;
    } else {
      return aLow < 0 ? -1 : aLow;
    }
  }
}

/**
 * This is an implementation of binary search which will always try and return
 * the index of the closest element if there is no exact hit. This is because
 * mappings between original and generated line/col pairs are single points,
 * and there is an implicit region between each of them, so a miss just means
 * that you aren't on the very start of a region.
 *
 * @param aNeedle The element you are looking for.
 * @param aHaystack The array that is being searched.
 * @param aCompare A function which takes the needle and an element in the
 *     array and returns -1, 0, or 1 depending on whether the needle is less
 *     than, equal to, or greater than the element, respectively.
 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'binarySearch.GREATEST_LOWER_BOUND'.
 */
exports.search = function search(aNeedle, aHaystack, aCompare, aBias) {
  if (aHaystack.length === 0) {
    return -1;
  }

  var index = recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack,
                              aCompare, aBias || exports.GREATEST_LOWER_BOUND);
  if (index < 0) {
    return -1;
  }

  // We have found either the exact element, or the next-closest element than
  // the one we are searching for. However, there may be more than one such
  // element. Make sure we always return the smallest of these.
  while (index - 1 >= 0) {
    if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
      break;
    }
    --index;
  }

  return index;
};

},{}],40:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2014 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util = require('./util');

/**
 * Determine whether mappingB is after mappingA with respect to generated
 * position.
 */
function generatedPositionAfter(mappingA, mappingB) {
  // Optimized for most common case
  var lineA = mappingA.generatedLine;
  var lineB = mappingB.generatedLine;
  var columnA = mappingA.generatedColumn;
  var columnB = mappingB.generatedColumn;
  return lineB > lineA || lineB == lineA && columnB >= columnA ||
         util.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
}

/**
 * A data structure to provide a sorted view of accumulated mappings in a
 * performance conscious manner. It trades a neglibable overhead in general
 * case for a large speedup in case of mappings being added in order.
 */
function MappingList() {
  this._array = [];
  this._sorted = true;
  // Serves as infimum
  this._last = {generatedLine: -1, generatedColumn: 0};
}

/**
 * Iterate through internal items. This method takes the same arguments that
 * `Array.prototype.forEach` takes.
 *
 * NOTE: The order of the mappings is NOT guaranteed.
 */
MappingList.prototype.unsortedForEach =
  function MappingList_forEach(aCallback, aThisArg) {
    this._array.forEach(aCallback, aThisArg);
  };

/**
 * Add the given source mapping.
 *
 * @param Object aMapping
 */
MappingList.prototype.add = function MappingList_add(aMapping) {
  if (generatedPositionAfter(this._last, aMapping)) {
    this._last = aMapping;
    this._array.push(aMapping);
  } else {
    this._sorted = false;
    this._array.push(aMapping);
  }
};

/**
 * Returns the flat, sorted array of mappings. The mappings are sorted by
 * generated position.
 *
 * WARNING: This method returns internal data without copying, for
 * performance. The return value must NOT be mutated, and should be treated as
 * an immutable borrow. If you want to take ownership, you must make your own
 * copy.
 */
MappingList.prototype.toArray = function MappingList_toArray() {
  if (!this._sorted) {
    this._array.sort(util.compareByGeneratedPositionsInflated);
    this._sorted = true;
  }
  return this._array;
};

exports.MappingList = MappingList;

},{"./util":45}],41:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

// It turns out that some (most?) JavaScript engines don't self-host
// `Array.prototype.sort`. This makes sense because C++ will likely remain
// faster than JS when doing raw CPU-intensive sorting. However, when using a
// custom comparator function, calling back and forth between the VM's C++ and
// JIT'd JS is rather slow *and* loses JIT type information, resulting in
// worse generated code for the comparator function than would be optimal. In
// fact, when sorting with a comparator, these costs outweigh the benefits of
// sorting in C++. By using our own JS-implemented Quick Sort (below), we get
// a ~3500ms mean speed-up in `bench/bench.html`.

/**
 * Swap the elements indexed by `x` and `y` in the array `ary`.
 *
 * @param {Array} ary
 *        The array.
 * @param {Number} x
 *        The index of the first item.
 * @param {Number} y
 *        The index of the second item.
 */
function swap(ary, x, y) {
  var temp = ary[x];
  ary[x] = ary[y];
  ary[y] = temp;
}

/**
 * Returns a random integer within the range `low .. high` inclusive.
 *
 * @param {Number} low
 *        The lower bound on the range.
 * @param {Number} high
 *        The upper bound on the range.
 */
function randomIntInRange(low, high) {
  return Math.round(low + (Math.random() * (high - low)));
}

/**
 * The Quick Sort algorithm.
 *
 * @param {Array} ary
 *        An array to sort.
 * @param {function} comparator
 *        Function to use to compare two items.
 * @param {Number} p
 *        Start index of the array
 * @param {Number} r
 *        End index of the array
 */
function doQuickSort(ary, comparator, p, r) {
  // If our lower bound is less than our upper bound, we (1) partition the
  // array into two pieces and (2) recurse on each half. If it is not, this is
  // the empty array and our base case.

  if (p < r) {
    // (1) Partitioning.
    //
    // The partitioning chooses a pivot between `p` and `r` and moves all
    // elements that are less than or equal to the pivot to the before it, and
    // all the elements that are greater than it after it. The effect is that
    // once partition is done, the pivot is in the exact place it will be when
    // the array is put in sorted order, and it will not need to be moved
    // again. This runs in O(n) time.

    // Always choose a random pivot so that an input array which is reverse
    // sorted does not cause O(n^2) running time.
    var pivotIndex = randomIntInRange(p, r);
    var i = p - 1;

    swap(ary, pivotIndex, r);
    var pivot = ary[r];

    // Immediately after `j` is incremented in this loop, the following hold
    // true:
    //
    //   * Every element in `ary[p .. i]` is less than or equal to the pivot.
    //
    //   * Every element in `ary[i+1 .. j-1]` is greater than the pivot.
    for (var j = p; j < r; j++) {
      if (comparator(ary[j], pivot) <= 0) {
        i += 1;
        swap(ary, i, j);
      }
    }

    swap(ary, i + 1, j);
    var q = i + 1;

    // (2) Recurse on each half.

    doQuickSort(ary, comparator, p, q - 1);
    doQuickSort(ary, comparator, q + 1, r);
  }
}

/**
 * Sort the given array in-place with the given comparator function.
 *
 * @param {Array} ary
 *        An array to sort.
 * @param {function} comparator
 *        Function to use to compare two items.
 */
exports.quickSort = function (ary, comparator) {
  doQuickSort(ary, comparator, 0, ary.length - 1);
};

},{}],42:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util = require('./util');
var binarySearch = require('./binary-search');
var ArraySet = require('./array-set').ArraySet;
var base64VLQ = require('./base64-vlq');
var quickSort = require('./quick-sort').quickSort;

function SourceMapConsumer(aSourceMap, aSourceMapURL) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = util.parseSourceMapInput(aSourceMap);
  }

  return sourceMap.sections != null
    ? new IndexedSourceMapConsumer(sourceMap, aSourceMapURL)
    : new BasicSourceMapConsumer(sourceMap, aSourceMapURL);
}

SourceMapConsumer.fromSourceMap = function(aSourceMap, aSourceMapURL) {
  return BasicSourceMapConsumer.fromSourceMap(aSourceMap, aSourceMapURL);
}

/**
 * The version of the source mapping spec that we are consuming.
 */
SourceMapConsumer.prototype._version = 3;

// `__generatedMappings` and `__originalMappings` are arrays that hold the
// parsed mapping coordinates from the source map's "mappings" attribute. They
// are lazily instantiated, accessed via the `_generatedMappings` and
// `_originalMappings` getters respectively, and we only parse the mappings
// and create these arrays once queried for a source location. We jump through
// these hoops because there can be many thousands of mappings, and parsing
// them is expensive, so we only want to do it if we must.
//
// Each object in the arrays is of the form:
//
//     {
//       generatedLine: The line number in the generated code,
//       generatedColumn: The column number in the generated code,
//       source: The path to the original source file that generated this
//               chunk of code,
//       originalLine: The line number in the original source that
//                     corresponds to this chunk of generated code,
//       originalColumn: The column number in the original source that
//                       corresponds to this chunk of generated code,
//       name: The name of the original symbol which generated this chunk of
//             code.
//     }
//
// All properties except for `generatedLine` and `generatedColumn` can be
// `null`.
//
// `_generatedMappings` is ordered by the generated positions.
//
// `_originalMappings` is ordered by the original positions.

SourceMapConsumer.prototype.__generatedMappings = null;
Object.defineProperty(SourceMapConsumer.prototype, '_generatedMappings', {
  configurable: true,
  enumerable: true,
  get: function () {
    if (!this.__generatedMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__generatedMappings;
  }
});

SourceMapConsumer.prototype.__originalMappings = null;
Object.defineProperty(SourceMapConsumer.prototype, '_originalMappings', {
  configurable: true,
  enumerable: true,
  get: function () {
    if (!this.__originalMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__originalMappings;
  }
});

SourceMapConsumer.prototype._charIsMappingSeparator =
  function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
    var c = aStr.charAt(index);
    return c === ";" || c === ",";
  };

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
SourceMapConsumer.prototype._parseMappings =
  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    throw new Error("Subclasses must implement _parseMappings");
  };

SourceMapConsumer.GENERATED_ORDER = 1;
SourceMapConsumer.ORIGINAL_ORDER = 2;

SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
SourceMapConsumer.LEAST_UPPER_BOUND = 2;

/**
 * Iterate over each mapping between an original source/line/column and a
 * generated line/column in this source map.
 *
 * @param Function aCallback
 *        The function that is called with each mapping.
 * @param Object aContext
 *        Optional. If specified, this object will be the value of `this` every
 *        time that `aCallback` is called.
 * @param aOrder
 *        Either `SourceMapConsumer.GENERATED_ORDER` or
 *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
 *        iterate over the mappings sorted by the generated file's line/column
 *        order or the original's source/line/column order, respectively. Defaults to
 *        `SourceMapConsumer.GENERATED_ORDER`.
 */
SourceMapConsumer.prototype.eachMapping =
  function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
    var context = aContext || null;
    var order = aOrder || SourceMapConsumer.GENERATED_ORDER;

    var mappings;
    switch (order) {
    case SourceMapConsumer.GENERATED_ORDER:
      mappings = this._generatedMappings;
      break;
    case SourceMapConsumer.ORIGINAL_ORDER:
      mappings = this._originalMappings;
      break;
    default:
      throw new Error("Unknown order of iteration.");
    }

    var sourceRoot = this.sourceRoot;
    mappings.map(function (mapping) {
      var source = mapping.source === null ? null : this._sources.at(mapping.source);
      source = util.computeSourceURL(sourceRoot, source, this._sourceMapURL);
      return {
        source: source,
        generatedLine: mapping.generatedLine,
        generatedColumn: mapping.generatedColumn,
        originalLine: mapping.originalLine,
        originalColumn: mapping.originalColumn,
        name: mapping.name === null ? null : this._names.at(mapping.name)
      };
    }, this).forEach(aCallback, context);
  };

/**
 * Returns all generated line and column information for the original source,
 * line, and column provided. If no column is provided, returns all mappings
 * corresponding to a either the line we are searching for or the next
 * closest line that has any mappings. Otherwise, returns all mappings
 * corresponding to the given line and either the column we are searching for
 * or the next closest column that has any offsets.
 *
 * The only argument is an object with the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.  The line number is 1-based.
 *   - column: Optional. the column number in the original source.
 *    The column number is 0-based.
 *
 * and an array of objects is returned, each with the following properties:
 *
 *   - line: The line number in the generated source, or null.  The
 *    line number is 1-based.
 *   - column: The column number in the generated source, or null.
 *    The column number is 0-based.
 */
SourceMapConsumer.prototype.allGeneratedPositionsFor =
  function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
    var line = util.getArg(aArgs, 'line');

    // When there is no exact match, BasicSourceMapConsumer.prototype._findMapping
    // returns the index of the closest mapping less than the needle. By
    // setting needle.originalColumn to 0, we thus find the last mapping for
    // the given line, provided such a mapping exists.
    var needle = {
      source: util.getArg(aArgs, 'source'),
      originalLine: line,
      originalColumn: util.getArg(aArgs, 'column', 0)
    };

    needle.source = this._findSourceIndex(needle.source);
    if (needle.source < 0) {
      return [];
    }

    var mappings = [];

    var index = this._findMapping(needle,
                                  this._originalMappings,
                                  "originalLine",
                                  "originalColumn",
                                  util.compareByOriginalPositions,
                                  binarySearch.LEAST_UPPER_BOUND);
    if (index >= 0) {
      var mapping = this._originalMappings[index];

      if (aArgs.column === undefined) {
        var originalLine = mapping.originalLine;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we found. Since
        // mappings are sorted, this is guaranteed to find all mappings for
        // the line we found.
        while (mapping && mapping.originalLine === originalLine) {
          mappings.push({
            line: util.getArg(mapping, 'generatedLine', null),
            column: util.getArg(mapping, 'generatedColumn', null),
            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[++index];
        }
      } else {
        var originalColumn = mapping.originalColumn;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we were searching for.
        // Since mappings are sorted, this is guaranteed to find all mappings for
        // the line we are searching for.
        while (mapping &&
               mapping.originalLine === line &&
               mapping.originalColumn == originalColumn) {
          mappings.push({
            line: util.getArg(mapping, 'generatedLine', null),
            column: util.getArg(mapping, 'generatedColumn', null),
            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[++index];
        }
      }
    }

    return mappings;
  };

exports.SourceMapConsumer = SourceMapConsumer;

/**
 * A BasicSourceMapConsumer instance represents a parsed source map which we can
 * query for information about the original file positions by giving it a file
 * position in the generated source.
 *
 * The first parameter is the raw source map (either as a JSON string, or
 * already parsed to an object). According to the spec, source maps have the
 * following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - sources: An array of URLs to the original source files.
 *   - names: An array of identifiers which can be referrenced by individual mappings.
 *   - sourceRoot: Optional. The URL root from which all sources are relative.
 *   - sourcesContent: Optional. An array of contents of the original source files.
 *   - mappings: A string of base64 VLQs which contain the actual mappings.
 *   - file: Optional. The generated file this source map is associated with.
 *
 * Here is an example source map, taken from the source map spec[0]:
 *
 *     {
 *       version : 3,
 *       file: "out.js",
 *       sourceRoot : "",
 *       sources: ["foo.js", "bar.js"],
 *       names: ["src", "maps", "are", "fun"],
 *       mappings: "AA,AB;;ABCDE;"
 *     }
 *
 * The second parameter, if given, is a string whose value is the URL
 * at which the source map was found.  This URL is used to compute the
 * sources array.
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
 */
function BasicSourceMapConsumer(aSourceMap, aSourceMapURL) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = util.parseSourceMapInput(aSourceMap);
  }

  var version = util.getArg(sourceMap, 'version');
  var sources = util.getArg(sourceMap, 'sources');
  // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
  // requires the array) to play nice here.
  var names = util.getArg(sourceMap, 'names', []);
  var sourceRoot = util.getArg(sourceMap, 'sourceRoot', null);
  var sourcesContent = util.getArg(sourceMap, 'sourcesContent', null);
  var mappings = util.getArg(sourceMap, 'mappings');
  var file = util.getArg(sourceMap, 'file', null);

  // Once again, Sass deviates from the spec and supplies the version as a
  // string rather than a number, so we use loose equality checking here.
  if (version != this._version) {
    throw new Error('Unsupported version: ' + version);
  }

  if (sourceRoot) {
    sourceRoot = util.normalize(sourceRoot);
  }

  sources = sources
    .map(String)
    // Some source maps produce relative source paths like "./foo.js" instead of
    // "foo.js".  Normalize these first so that future comparisons will succeed.
    // See bugzil.la/1090768.
    .map(util.normalize)
    // Always ensure that absolute sources are internally stored relative to
    // the source root, if the source root is absolute. Not doing this would
    // be particularly problematic when the source root is a prefix of the
    // source (valid, but why??). See github issue #199 and bugzil.la/1188982.
    .map(function (source) {
      return sourceRoot && util.isAbsolute(sourceRoot) && util.isAbsolute(source)
        ? util.relative(sourceRoot, source)
        : source;
    });

  // Pass `true` below to allow duplicate names and sources. While source maps
  // are intended to be compressed and deduplicated, the TypeScript compiler
  // sometimes generates source maps with duplicates in them. See Github issue
  // #72 and bugzil.la/889492.
  this._names = ArraySet.fromArray(names.map(String), true);
  this._sources = ArraySet.fromArray(sources, true);

  this._absoluteSources = this._sources.toArray().map(function (s) {
    return util.computeSourceURL(sourceRoot, s, aSourceMapURL);
  });

  this.sourceRoot = sourceRoot;
  this.sourcesContent = sourcesContent;
  this._mappings = mappings;
  this._sourceMapURL = aSourceMapURL;
  this.file = file;
}

BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer;

/**
 * Utility function to find the index of a source.  Returns -1 if not
 * found.
 */
BasicSourceMapConsumer.prototype._findSourceIndex = function(aSource) {
  var relativeSource = aSource;
  if (this.sourceRoot != null) {
    relativeSource = util.relative(this.sourceRoot, relativeSource);
  }

  if (this._sources.has(relativeSource)) {
    return this._sources.indexOf(relativeSource);
  }

  // Maybe aSource is an absolute URL as returned by |sources|.  In
  // this case we can't simply undo the transform.
  var i;
  for (i = 0; i < this._absoluteSources.length; ++i) {
    if (this._absoluteSources[i] == aSource) {
      return i;
    }
  }

  return -1;
};

/**
 * Create a BasicSourceMapConsumer from a SourceMapGenerator.
 *
 * @param SourceMapGenerator aSourceMap
 *        The source map that will be consumed.
 * @param String aSourceMapURL
 *        The URL at which the source map can be found (optional)
 * @returns BasicSourceMapConsumer
 */
BasicSourceMapConsumer.fromSourceMap =
  function SourceMapConsumer_fromSourceMap(aSourceMap, aSourceMapURL) {
    var smc = Object.create(BasicSourceMapConsumer.prototype);

    var names = smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
    var sources = smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
    smc.sourceRoot = aSourceMap._sourceRoot;
    smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(),
                                                            smc.sourceRoot);
    smc.file = aSourceMap._file;
    smc._sourceMapURL = aSourceMapURL;
    smc._absoluteSources = smc._sources.toArray().map(function (s) {
      return util.computeSourceURL(smc.sourceRoot, s, aSourceMapURL);
    });

    // Because we are modifying the entries (by converting string sources and
    // names to indices into the sources and names ArraySets), we have to make
    // a copy of the entry or else bad things happen. Shared mutable state
    // strikes again! See github issue #191.

    var generatedMappings = aSourceMap._mappings.toArray().slice();
    var destGeneratedMappings = smc.__generatedMappings = [];
    var destOriginalMappings = smc.__originalMappings = [];

    for (var i = 0, length = generatedMappings.length; i < length; i++) {
      var srcMapping = generatedMappings[i];
      var destMapping = new Mapping;
      destMapping.generatedLine = srcMapping.generatedLine;
      destMapping.generatedColumn = srcMapping.generatedColumn;

      if (srcMapping.source) {
        destMapping.source = sources.indexOf(srcMapping.source);
        destMapping.originalLine = srcMapping.originalLine;
        destMapping.originalColumn = srcMapping.originalColumn;

        if (srcMapping.name) {
          destMapping.name = names.indexOf(srcMapping.name);
        }

        destOriginalMappings.push(destMapping);
      }

      destGeneratedMappings.push(destMapping);
    }

    quickSort(smc.__originalMappings, util.compareByOriginalPositions);

    return smc;
  };

/**
 * The version of the source mapping spec that we are consuming.
 */
BasicSourceMapConsumer.prototype._version = 3;

/**
 * The list of original sources.
 */
Object.defineProperty(BasicSourceMapConsumer.prototype, 'sources', {
  get: function () {
    return this._absoluteSources.slice();
  }
});

/**
 * Provide the JIT with a nice shape / hidden class.
 */
function Mapping() {
  this.generatedLine = 0;
  this.generatedColumn = 0;
  this.source = null;
  this.originalLine = null;
  this.originalColumn = null;
  this.name = null;
}

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
BasicSourceMapConsumer.prototype._parseMappings =
  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    var generatedLine = 1;
    var previousGeneratedColumn = 0;
    var previousOriginalLine = 0;
    var previousOriginalColumn = 0;
    var previousSource = 0;
    var previousName = 0;
    var length = aStr.length;
    var index = 0;
    var cachedSegments = {};
    var temp = {};
    var originalMappings = [];
    var generatedMappings = [];
    var mapping, str, segment, end, value;

    while (index < length) {
      if (aStr.charAt(index) === ';') {
        generatedLine++;
        index++;
        previousGeneratedColumn = 0;
      }
      else if (aStr.charAt(index) === ',') {
        index++;
      }
      else {
        mapping = new Mapping();
        mapping.generatedLine = generatedLine;

        // Because each offset is encoded relative to the previous one,
        // many segments often have the same encoding. We can exploit this
        // fact by caching the parsed variable length fields of each segment,
        // allowing us to avoid a second parse if we encounter the same
        // segment again.
        for (end = index; end < length; end++) {
          if (this._charIsMappingSeparator(aStr, end)) {
            break;
          }
        }
        str = aStr.slice(index, end);

        segment = cachedSegments[str];
        if (segment) {
          index += str.length;
        } else {
          segment = [];
          while (index < end) {
            base64VLQ.decode(aStr, index, temp);
            value = temp.value;
            index = temp.rest;
            segment.push(value);
          }

          if (segment.length === 2) {
            throw new Error('Found a source, but no line and column');
          }

          if (segment.length === 3) {
            throw new Error('Found a source and line, but no column');
          }

          cachedSegments[str] = segment;
        }

        // Generated column.
        mapping.generatedColumn = previousGeneratedColumn + segment[0];
        previousGeneratedColumn = mapping.generatedColumn;

        if (segment.length > 1) {
          // Original source.
          mapping.source = previousSource + segment[1];
          previousSource += segment[1];

          // Original line.
          mapping.originalLine = previousOriginalLine + segment[2];
          previousOriginalLine = mapping.originalLine;
          // Lines are stored 0-based
          mapping.originalLine += 1;

          // Original column.
          mapping.originalColumn = previousOriginalColumn + segment[3];
          previousOriginalColumn = mapping.originalColumn;

          if (segment.length > 4) {
            // Original name.
            mapping.name = previousName + segment[4];
            previousName += segment[4];
          }
        }

        generatedMappings.push(mapping);
        if (typeof mapping.originalLine === 'number') {
          originalMappings.push(mapping);
        }
      }
    }

    quickSort(generatedMappings, util.compareByGeneratedPositionsDeflated);
    this.__generatedMappings = generatedMappings;

    quickSort(originalMappings, util.compareByOriginalPositions);
    this.__originalMappings = originalMappings;
  };

/**
 * Find the mapping that best matches the hypothetical "needle" mapping that
 * we are searching for in the given "haystack" of mappings.
 */
BasicSourceMapConsumer.prototype._findMapping =
  function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName,
                                         aColumnName, aComparator, aBias) {
    // To return the position we are searching for, we must first find the
    // mapping for the given position and then return the opposite position it
    // points to. Because the mappings are sorted, we can use binary search to
    // find the best mapping.

    if (aNeedle[aLineName] <= 0) {
      throw new TypeError('Line must be greater than or equal to 1, got '
                          + aNeedle[aLineName]);
    }
    if (aNeedle[aColumnName] < 0) {
      throw new TypeError('Column must be greater than or equal to 0, got '
                          + aNeedle[aColumnName]);
    }

    return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
  };

/**
 * Compute the last column for each generated mapping. The last column is
 * inclusive.
 */
BasicSourceMapConsumer.prototype.computeColumnSpans =
  function SourceMapConsumer_computeColumnSpans() {
    for (var index = 0; index < this._generatedMappings.length; ++index) {
      var mapping = this._generatedMappings[index];

      // Mappings do not contain a field for the last generated columnt. We
      // can come up with an optimistic estimate, however, by assuming that
      // mappings are contiguous (i.e. given two consecutive mappings, the
      // first mapping ends where the second one starts).
      if (index + 1 < this._generatedMappings.length) {
        var nextMapping = this._generatedMappings[index + 1];

        if (mapping.generatedLine === nextMapping.generatedLine) {
          mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
          continue;
        }
      }

      // The last mapping for each line spans the entire line.
      mapping.lastGeneratedColumn = Infinity;
    }
  };

/**
 * Returns the original source, line, and column information for the generated
 * source's line and column positions provided. The only argument is an object
 * with the following properties:
 *
 *   - line: The line number in the generated source.  The line number
 *     is 1-based.
 *   - column: The column number in the generated source.  The column
 *     number is 0-based.
 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
 *
 * and an object is returned with the following properties:
 *
 *   - source: The original source file, or null.
 *   - line: The line number in the original source, or null.  The
 *     line number is 1-based.
 *   - column: The column number in the original source, or null.  The
 *     column number is 0-based.
 *   - name: The original identifier, or null.
 */
BasicSourceMapConsumer.prototype.originalPositionFor =
  function SourceMapConsumer_originalPositionFor(aArgs) {
    var needle = {
      generatedLine: util.getArg(aArgs, 'line'),
      generatedColumn: util.getArg(aArgs, 'column')
    };

    var index = this._findMapping(
      needle,
      this._generatedMappings,
      "generatedLine",
      "generatedColumn",
      util.compareByGeneratedPositionsDeflated,
      util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
    );

    if (index >= 0) {
      var mapping = this._generatedMappings[index];

      if (mapping.generatedLine === needle.generatedLine) {
        var source = util.getArg(mapping, 'source', null);
        if (source !== null) {
          source = this._sources.at(source);
          source = util.computeSourceURL(this.sourceRoot, source, this._sourceMapURL);
        }
        var name = util.getArg(mapping, 'name', null);
        if (name !== null) {
          name = this._names.at(name);
        }
        return {
          source: source,
          line: util.getArg(mapping, 'originalLine', null),
          column: util.getArg(mapping, 'originalColumn', null),
          name: name
        };
      }
    }

    return {
      source: null,
      line: null,
      column: null,
      name: null
    };
  };

/**
 * Return true if we have the source content for every source in the source
 * map, false otherwise.
 */
BasicSourceMapConsumer.prototype.hasContentsOfAllSources =
  function BasicSourceMapConsumer_hasContentsOfAllSources() {
    if (!this.sourcesContent) {
      return false;
    }
    return this.sourcesContent.length >= this._sources.size() &&
      !this.sourcesContent.some(function (sc) { return sc == null; });
  };

/**
 * Returns the original source content. The only argument is the url of the
 * original source file. Returns null if no original source content is
 * available.
 */
BasicSourceMapConsumer.prototype.sourceContentFor =
  function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    if (!this.sourcesContent) {
      return null;
    }

    var index = this._findSourceIndex(aSource);
    if (index >= 0) {
      return this.sourcesContent[index];
    }

    var relativeSource = aSource;
    if (this.sourceRoot != null) {
      relativeSource = util.relative(this.sourceRoot, relativeSource);
    }

    var url;
    if (this.sourceRoot != null
        && (url = util.urlParse(this.sourceRoot))) {
      // XXX: file:// URIs and absolute paths lead to unexpected behavior for
      // many users. We can help them out when they expect file:// URIs to
      // behave like it would if they were running a local HTTP server. See
      // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
      var fileUriAbsPath = relativeSource.replace(/^file:\/\//, "");
      if (url.scheme == "file"
          && this._sources.has(fileUriAbsPath)) {
        return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)]
      }

      if ((!url.path || url.path == "/")
          && this._sources.has("/" + relativeSource)) {
        return this.sourcesContent[this._sources.indexOf("/" + relativeSource)];
      }
    }

    // This function is used recursively from
    // IndexedSourceMapConsumer.prototype.sourceContentFor. In that case, we
    // don't want to throw if we can't find the source - we just want to
    // return null, so we provide a flag to exit gracefully.
    if (nullOnMissing) {
      return null;
    }
    else {
      throw new Error('"' + relativeSource + '" is not in the SourceMap.');
    }
  };

/**
 * Returns the generated line and column information for the original source,
 * line, and column positions provided. The only argument is an object with
 * the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.  The line number
 *     is 1-based.
 *   - column: The column number in the original source.  The column
 *     number is 0-based.
 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
 *
 * and an object is returned with the following properties:
 *
 *   - line: The line number in the generated source, or null.  The
 *     line number is 1-based.
 *   - column: The column number in the generated source, or null.
 *     The column number is 0-based.
 */
BasicSourceMapConsumer.prototype.generatedPositionFor =
  function SourceMapConsumer_generatedPositionFor(aArgs) {
    var source = util.getArg(aArgs, 'source');
    source = this._findSourceIndex(source);
    if (source < 0) {
      return {
        line: null,
        column: null,
        lastColumn: null
      };
    }

    var needle = {
      source: source,
      originalLine: util.getArg(aArgs, 'line'),
      originalColumn: util.getArg(aArgs, 'column')
    };

    var index = this._findMapping(
      needle,
      this._originalMappings,
      "originalLine",
      "originalColumn",
      util.compareByOriginalPositions,
      util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
    );

    if (index >= 0) {
      var mapping = this._originalMappings[index];

      if (mapping.source === needle.source) {
        return {
          line: util.getArg(mapping, 'generatedLine', null),
          column: util.getArg(mapping, 'generatedColumn', null),
          lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
        };
      }
    }

    return {
      line: null,
      column: null,
      lastColumn: null
    };
  };

exports.BasicSourceMapConsumer = BasicSourceMapConsumer;

/**
 * An IndexedSourceMapConsumer instance represents a parsed source map which
 * we can query for information. It differs from BasicSourceMapConsumer in
 * that it takes "indexed" source maps (i.e. ones with a "sections" field) as
 * input.
 *
 * The first parameter is a raw source map (either as a JSON string, or already
 * parsed to an object). According to the spec for indexed source maps, they
 * have the following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - file: Optional. The generated file this source map is associated with.
 *   - sections: A list of section definitions.
 *
 * Each value under the "sections" field has two fields:
 *   - offset: The offset into the original specified at which this section
 *       begins to apply, defined as an object with a "line" and "column"
 *       field.
 *   - map: A source map definition. This source map could also be indexed,
 *       but doesn't have to be.
 *
 * Instead of the "map" field, it's also possible to have a "url" field
 * specifying a URL to retrieve a source map from, but that's currently
 * unsupported.
 *
 * Here's an example source map, taken from the source map spec[0], but
 * modified to omit a section which uses the "url" field.
 *
 *  {
 *    version : 3,
 *    file: "app.js",
 *    sections: [{
 *      offset: {line:100, column:10},
 *      map: {
 *        version : 3,
 *        file: "section.js",
 *        sources: ["foo.js", "bar.js"],
 *        names: ["src", "maps", "are", "fun"],
 *        mappings: "AAAA,E;;ABCDE;"
 *      }
 *    }],
 *  }
 *
 * The second parameter, if given, is a string whose value is the URL
 * at which the source map was found.  This URL is used to compute the
 * sources array.
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.535es3xeprgt
 */
function IndexedSourceMapConsumer(aSourceMap, aSourceMapURL) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = util.parseSourceMapInput(aSourceMap);
  }

  var version = util.getArg(sourceMap, 'version');
  var sections = util.getArg(sourceMap, 'sections');

  if (version != this._version) {
    throw new Error('Unsupported version: ' + version);
  }

  this._sources = new ArraySet();
  this._names = new ArraySet();

  var lastOffset = {
    line: -1,
    column: 0
  };
  this._sections = sections.map(function (s) {
    if (s.url) {
      // The url field will require support for asynchronicity.
      // See https://github.com/mozilla/source-map/issues/16
      throw new Error('Support for url field in sections not implemented.');
    }
    var offset = util.getArg(s, 'offset');
    var offsetLine = util.getArg(offset, 'line');
    var offsetColumn = util.getArg(offset, 'column');

    if (offsetLine < lastOffset.line ||
        (offsetLine === lastOffset.line && offsetColumn < lastOffset.column)) {
      throw new Error('Section offsets must be ordered and non-overlapping.');
    }
    lastOffset = offset;

    return {
      generatedOffset: {
        // The offset fields are 0-based, but we use 1-based indices when
        // encoding/decoding from VLQ.
        generatedLine: offsetLine + 1,
        generatedColumn: offsetColumn + 1
      },
      consumer: new SourceMapConsumer(util.getArg(s, 'map'), aSourceMapURL)
    }
  });
}

IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer;

/**
 * The version of the source mapping spec that we are consuming.
 */
IndexedSourceMapConsumer.prototype._version = 3;

/**
 * The list of original sources.
 */
Object.defineProperty(IndexedSourceMapConsumer.prototype, 'sources', {
  get: function () {
    var sources = [];
    for (var i = 0; i < this._sections.length; i++) {
      for (var j = 0; j < this._sections[i].consumer.sources.length; j++) {
        sources.push(this._sections[i].consumer.sources[j]);
      }
    }
    return sources;
  }
});

/**
 * Returns the original source, line, and column information for the generated
 * source's line and column positions provided. The only argument is an object
 * with the following properties:
 *
 *   - line: The line number in the generated source.  The line number
 *     is 1-based.
 *   - column: The column number in the generated source.  The column
 *     number is 0-based.
 *
 * and an object is returned with the following properties:
 *
 *   - source: The original source file, or null.
 *   - line: The line number in the original source, or null.  The
 *     line number is 1-based.
 *   - column: The column number in the original source, or null.  The
 *     column number is 0-based.
 *   - name: The original identifier, or null.
 */
IndexedSourceMapConsumer.prototype.originalPositionFor =
  function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
    var needle = {
      generatedLine: util.getArg(aArgs, 'line'),
      generatedColumn: util.getArg(aArgs, 'column')
    };

    // Find the section containing the generated position we're trying to map
    // to an original position.
    var sectionIndex = binarySearch.search(needle, this._sections,
      function(needle, section) {
        var cmp = needle.generatedLine - section.generatedOffset.generatedLine;
        if (cmp) {
          return cmp;
        }

        return (needle.generatedColumn -
                section.generatedOffset.generatedColumn);
      });
    var section = this._sections[sectionIndex];

    if (!section) {
      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    }

    return section.consumer.originalPositionFor({
      line: needle.generatedLine -
        (section.generatedOffset.generatedLine - 1),
      column: needle.generatedColumn -
        (section.generatedOffset.generatedLine === needle.generatedLine
         ? section.generatedOffset.generatedColumn - 1
         : 0),
      bias: aArgs.bias
    });
  };

/**
 * Return true if we have the source content for every source in the source
 * map, false otherwise.
 */
IndexedSourceMapConsumer.prototype.hasContentsOfAllSources =
  function IndexedSourceMapConsumer_hasContentsOfAllSources() {
    return this._sections.every(function (s) {
      return s.consumer.hasContentsOfAllSources();
    });
  };

/**
 * Returns the original source content. The only argument is the url of the
 * original source file. Returns null if no original source content is
 * available.
 */
IndexedSourceMapConsumer.prototype.sourceContentFor =
  function IndexedSourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];

      var content = section.consumer.sourceContentFor(aSource, true);
      if (content) {
        return content;
      }
    }
    if (nullOnMissing) {
      return null;
    }
    else {
      throw new Error('"' + aSource + '" is not in the SourceMap.');
    }
  };

/**
 * Returns the generated line and column information for the original source,
 * line, and column positions provided. The only argument is an object with
 * the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.  The line number
 *     is 1-based.
 *   - column: The column number in the original source.  The column
 *     number is 0-based.
 *
 * and an object is returned with the following properties:
 *
 *   - line: The line number in the generated source, or null.  The
 *     line number is 1-based. 
 *   - column: The column number in the generated source, or null.
 *     The column number is 0-based.
 */
IndexedSourceMapConsumer.prototype.generatedPositionFor =
  function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];

      // Only consider this section if the requested source is in the list of
      // sources of the consumer.
      if (section.consumer._findSourceIndex(util.getArg(aArgs, 'source')) === -1) {
        continue;
      }
      var generatedPosition = section.consumer.generatedPositionFor(aArgs);
      if (generatedPosition) {
        var ret = {
          line: generatedPosition.line +
            (section.generatedOffset.generatedLine - 1),
          column: generatedPosition.column +
            (section.generatedOffset.generatedLine === generatedPosition.line
             ? section.generatedOffset.generatedColumn - 1
             : 0)
        };
        return ret;
      }
    }

    return {
      line: null,
      column: null
    };
  };

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
IndexedSourceMapConsumer.prototype._parseMappings =
  function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    this.__generatedMappings = [];
    this.__originalMappings = [];
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];
      var sectionMappings = section.consumer._generatedMappings;
      for (var j = 0; j < sectionMappings.length; j++) {
        var mapping = sectionMappings[j];

        var source = section.consumer._sources.at(mapping.source);
        source = util.computeSourceURL(section.consumer.sourceRoot, source, this._sourceMapURL);
        this._sources.add(source);
        source = this._sources.indexOf(source);

        var name = null;
        if (mapping.name) {
          name = section.consumer._names.at(mapping.name);
          this._names.add(name);
          name = this._names.indexOf(name);
        }

        // The mappings coming from the consumer for the section have
        // generated positions relative to the start of the section, so we
        // need to offset them to be relative to the start of the concatenated
        // generated file.
        var adjustedMapping = {
          source: source,
          generatedLine: mapping.generatedLine +
            (section.generatedOffset.generatedLine - 1),
          generatedColumn: mapping.generatedColumn +
            (section.generatedOffset.generatedLine === mapping.generatedLine
            ? section.generatedOffset.generatedColumn - 1
            : 0),
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name: name
        };

        this.__generatedMappings.push(adjustedMapping);
        if (typeof adjustedMapping.originalLine === 'number') {
          this.__originalMappings.push(adjustedMapping);
        }
      }
    }

    quickSort(this.__generatedMappings, util.compareByGeneratedPositionsDeflated);
    quickSort(this.__originalMappings, util.compareByOriginalPositions);
  };

exports.IndexedSourceMapConsumer = IndexedSourceMapConsumer;

},{"./array-set":36,"./base64-vlq":37,"./binary-search":39,"./quick-sort":41,"./util":45}],43:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var base64VLQ = require('./base64-vlq');
var util = require('./util');
var ArraySet = require('./array-set').ArraySet;
var MappingList = require('./mapping-list').MappingList;

/**
 * An instance of the SourceMapGenerator represents a source map which is
 * being built incrementally. You may pass an object with the following
 * properties:
 *
 *   - file: The filename of the generated source.
 *   - sourceRoot: A root for all relative URLs in this source map.
 */
function SourceMapGenerator(aArgs) {
  if (!aArgs) {
    aArgs = {};
  }
  this._file = util.getArg(aArgs, 'file', null);
  this._sourceRoot = util.getArg(aArgs, 'sourceRoot', null);
  this._skipValidation = util.getArg(aArgs, 'skipValidation', false);
  this._sources = new ArraySet();
  this._names = new ArraySet();
  this._mappings = new MappingList();
  this._sourcesContents = null;
}

SourceMapGenerator.prototype._version = 3;

/**
 * Creates a new SourceMapGenerator based on a SourceMapConsumer
 *
 * @param aSourceMapConsumer The SourceMap.
 */
SourceMapGenerator.fromSourceMap =
  function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
    var sourceRoot = aSourceMapConsumer.sourceRoot;
    var generator = new SourceMapGenerator({
      file: aSourceMapConsumer.file,
      sourceRoot: sourceRoot
    });
    aSourceMapConsumer.eachMapping(function (mapping) {
      var newMapping = {
        generated: {
          line: mapping.generatedLine,
          column: mapping.generatedColumn
        }
      };

      if (mapping.source != null) {
        newMapping.source = mapping.source;
        if (sourceRoot != null) {
          newMapping.source = util.relative(sourceRoot, newMapping.source);
        }

        newMapping.original = {
          line: mapping.originalLine,
          column: mapping.originalColumn
        };

        if (mapping.name != null) {
          newMapping.name = mapping.name;
        }
      }

      generator.addMapping(newMapping);
    });
    aSourceMapConsumer.sources.forEach(function (sourceFile) {
      var sourceRelative = sourceFile;
      if (sourceRoot !== null) {
        sourceRelative = util.relative(sourceRoot, sourceFile);
      }

      if (!generator._sources.has(sourceRelative)) {
        generator._sources.add(sourceRelative);
      }

      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        generator.setSourceContent(sourceFile, content);
      }
    });
    return generator;
  };

/**
 * Add a single mapping from original source line and column to the generated
 * source's line and column for this source map being created. The mapping
 * object should have the following properties:
 *
 *   - generated: An object with the generated line and column positions.
 *   - original: An object with the original line and column positions.
 *   - source: The original source file (relative to the sourceRoot).
 *   - name: An optional original token name for this mapping.
 */
SourceMapGenerator.prototype.addMapping =
  function SourceMapGenerator_addMapping(aArgs) {
    var generated = util.getArg(aArgs, 'generated');
    var original = util.getArg(aArgs, 'original', null);
    var source = util.getArg(aArgs, 'source', null);
    var name = util.getArg(aArgs, 'name', null);

    if (!this._skipValidation) {
      this._validateMapping(generated, original, source, name);
    }

    if (source != null) {
      source = String(source);
      if (!this._sources.has(source)) {
        this._sources.add(source);
      }
    }

    if (name != null) {
      name = String(name);
      if (!this._names.has(name)) {
        this._names.add(name);
      }
    }

    this._mappings.add({
      generatedLine: generated.line,
      generatedColumn: generated.column,
      originalLine: original != null && original.line,
      originalColumn: original != null && original.column,
      source: source,
      name: name
    });
  };

/**
 * Set the source content for a source file.
 */
SourceMapGenerator.prototype.setSourceContent =
  function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
    var source = aSourceFile;
    if (this._sourceRoot != null) {
      source = util.relative(this._sourceRoot, source);
    }

    if (aSourceContent != null) {
      // Add the source content to the _sourcesContents map.
      // Create a new _sourcesContents map if the property is null.
      if (!this._sourcesContents) {
        this._sourcesContents = Object.create(null);
      }
      this._sourcesContents[util.toSetString(source)] = aSourceContent;
    } else if (this._sourcesContents) {
      // Remove the source file from the _sourcesContents map.
      // If the _sourcesContents map is empty, set the property to null.
      delete this._sourcesContents[util.toSetString(source)];
      if (Object.keys(this._sourcesContents).length === 0) {
        this._sourcesContents = null;
      }
    }
  };

/**
 * Applies the mappings of a sub-source-map for a specific source file to the
 * source map being generated. Each mapping to the supplied source file is
 * rewritten using the supplied source map. Note: The resolution for the
 * resulting mappings is the minimium of this map and the supplied map.
 *
 * @param aSourceMapConsumer The source map to be applied.
 * @param aSourceFile Optional. The filename of the source file.
 *        If omitted, SourceMapConsumer's file property will be used.
 * @param aSourceMapPath Optional. The dirname of the path to the source map
 *        to be applied. If relative, it is relative to the SourceMapConsumer.
 *        This parameter is needed when the two source maps aren't in the same
 *        directory, and the source map to be applied contains relative source
 *        paths. If so, those relative source paths need to be rewritten
 *        relative to the SourceMapGenerator.
 */
SourceMapGenerator.prototype.applySourceMap =
  function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
    var sourceFile = aSourceFile;
    // If aSourceFile is omitted, we will use the file property of the SourceMap
    if (aSourceFile == null) {
      if (aSourceMapConsumer.file == null) {
        throw new Error(
          'SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' +
          'or the source map\'s "file" property. Both were omitted.'
        );
      }
      sourceFile = aSourceMapConsumer.file;
    }
    var sourceRoot = this._sourceRoot;
    // Make "sourceFile" relative if an absolute Url is passed.
    if (sourceRoot != null) {
      sourceFile = util.relative(sourceRoot, sourceFile);
    }
    // Applying the SourceMap can add and remove items from the sources and
    // the names array.
    var newSources = new ArraySet();
    var newNames = new ArraySet();

    // Find mappings for the "sourceFile"
    this._mappings.unsortedForEach(function (mapping) {
      if (mapping.source === sourceFile && mapping.originalLine != null) {
        // Check if it can be mapped by the source map, then update the mapping.
        var original = aSourceMapConsumer.originalPositionFor({
          line: mapping.originalLine,
          column: mapping.originalColumn
        });
        if (original.source != null) {
          // Copy mapping
          mapping.source = original.source;
          if (aSourceMapPath != null) {
            mapping.source = util.join(aSourceMapPath, mapping.source)
          }
          if (sourceRoot != null) {
            mapping.source = util.relative(sourceRoot, mapping.source);
          }
          mapping.originalLine = original.line;
          mapping.originalColumn = original.column;
          if (original.name != null) {
            mapping.name = original.name;
          }
        }
      }

      var source = mapping.source;
      if (source != null && !newSources.has(source)) {
        newSources.add(source);
      }

      var name = mapping.name;
      if (name != null && !newNames.has(name)) {
        newNames.add(name);
      }

    }, this);
    this._sources = newSources;
    this._names = newNames;

    // Copy sourcesContents of applied map.
    aSourceMapConsumer.sources.forEach(function (sourceFile) {
      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        if (aSourceMapPath != null) {
          sourceFile = util.join(aSourceMapPath, sourceFile);
        }
        if (sourceRoot != null) {
          sourceFile = util.relative(sourceRoot, sourceFile);
        }
        this.setSourceContent(sourceFile, content);
      }
    }, this);
  };

/**
 * A mapping can have one of the three levels of data:
 *
 *   1. Just the generated position.
 *   2. The Generated position, original position, and original source.
 *   3. Generated and original position, original source, as well as a name
 *      token.
 *
 * To maintain consistency, we validate that any new mapping being added falls
 * in to one of these categories.
 */
SourceMapGenerator.prototype._validateMapping =
  function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource,
                                              aName) {
    // When aOriginal is truthy but has empty values for .line and .column,
    // it is most likely a programmer error. In this case we throw a very
    // specific error message to try to guide them the right way.
    // For example: https://github.com/Polymer/polymer-bundler/pull/519
    if (aOriginal && typeof aOriginal.line !== 'number' && typeof aOriginal.column !== 'number') {
        throw new Error(
            'original.line and original.column are not numbers -- you probably meant to omit ' +
            'the original mapping entirely and only map the generated position. If so, pass ' +
            'null for the original mapping instead of an object with empty or null values.'
        );
    }

    if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
        && aGenerated.line > 0 && aGenerated.column >= 0
        && !aOriginal && !aSource && !aName) {
      // Case 1.
      return;
    }
    else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
             && aOriginal && 'line' in aOriginal && 'column' in aOriginal
             && aGenerated.line > 0 && aGenerated.column >= 0
             && aOriginal.line > 0 && aOriginal.column >= 0
             && aSource) {
      // Cases 2 and 3.
      return;
    }
    else {
      throw new Error('Invalid mapping: ' + JSON.stringify({
        generated: aGenerated,
        source: aSource,
        original: aOriginal,
        name: aName
      }));
    }
  };

/**
 * Serialize the accumulated mappings in to the stream of base 64 VLQs
 * specified by the source map format.
 */
SourceMapGenerator.prototype._serializeMappings =
  function SourceMapGenerator_serializeMappings() {
    var previousGeneratedColumn = 0;
    var previousGeneratedLine = 1;
    var previousOriginalColumn = 0;
    var previousOriginalLine = 0;
    var previousName = 0;
    var previousSource = 0;
    var result = '';
    var next;
    var mapping;
    var nameIdx;
    var sourceIdx;

    var mappings = this._mappings.toArray();
    for (var i = 0, len = mappings.length; i < len; i++) {
      mapping = mappings[i];
      next = ''

      if (mapping.generatedLine !== previousGeneratedLine) {
        previousGeneratedColumn = 0;
        while (mapping.generatedLine !== previousGeneratedLine) {
          next += ';';
          previousGeneratedLine++;
        }
      }
      else {
        if (i > 0) {
          if (!util.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
            continue;
          }
          next += ',';
        }
      }

      next += base64VLQ.encode(mapping.generatedColumn
                                 - previousGeneratedColumn);
      previousGeneratedColumn = mapping.generatedColumn;

      if (mapping.source != null) {
        sourceIdx = this._sources.indexOf(mapping.source);
        next += base64VLQ.encode(sourceIdx - previousSource);
        previousSource = sourceIdx;

        // lines are stored 0-based in SourceMap spec version 3
        next += base64VLQ.encode(mapping.originalLine - 1
                                   - previousOriginalLine);
        previousOriginalLine = mapping.originalLine - 1;

        next += base64VLQ.encode(mapping.originalColumn
                                   - previousOriginalColumn);
        previousOriginalColumn = mapping.originalColumn;

        if (mapping.name != null) {
          nameIdx = this._names.indexOf(mapping.name);
          next += base64VLQ.encode(nameIdx - previousName);
          previousName = nameIdx;
        }
      }

      result += next;
    }

    return result;
  };

SourceMapGenerator.prototype._generateSourcesContent =
  function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
    return aSources.map(function (source) {
      if (!this._sourcesContents) {
        return null;
      }
      if (aSourceRoot != null) {
        source = util.relative(aSourceRoot, source);
      }
      var key = util.toSetString(source);
      return Object.prototype.hasOwnProperty.call(this._sourcesContents, key)
        ? this._sourcesContents[key]
        : null;
    }, this);
  };

/**
 * Externalize the source map.
 */
SourceMapGenerator.prototype.toJSON =
  function SourceMapGenerator_toJSON() {
    var map = {
      version: this._version,
      sources: this._sources.toArray(),
      names: this._names.toArray(),
      mappings: this._serializeMappings()
    };
    if (this._file != null) {
      map.file = this._file;
    }
    if (this._sourceRoot != null) {
      map.sourceRoot = this._sourceRoot;
    }
    if (this._sourcesContents) {
      map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
    }

    return map;
  };

/**
 * Render the source map being generated to a string.
 */
SourceMapGenerator.prototype.toString =
  function SourceMapGenerator_toString() {
    return JSON.stringify(this.toJSON());
  };

exports.SourceMapGenerator = SourceMapGenerator;

},{"./array-set":36,"./base64-vlq":37,"./mapping-list":40,"./util":45}],44:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var SourceMapGenerator = require('./source-map-generator').SourceMapGenerator;
var util = require('./util');

// Matches a Windows-style `\r\n` newline or a `\n` newline used by all other
// operating systems these days (capturing the result).
var REGEX_NEWLINE = /(\r?\n)/;

// Newline character code for charCodeAt() comparisons
var NEWLINE_CODE = 10;

// Private symbol for identifying `SourceNode`s when multiple versions of
// the source-map library are loaded. This MUST NOT CHANGE across
// versions!
var isSourceNode = "$$$isSourceNode$$$";

/**
 * SourceNodes provide a way to abstract over interpolating/concatenating
 * snippets of generated JavaScript source code while maintaining the line and
 * column information associated with the original source code.
 *
 * @param aLine The original line number.
 * @param aColumn The original column number.
 * @param aSource The original source's filename.
 * @param aChunks Optional. An array of strings which are snippets of
 *        generated JS, or other SourceNodes.
 * @param aName The original identifier.
 */
function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
  this.children = [];
  this.sourceContents = {};
  this.line = aLine == null ? null : aLine;
  this.column = aColumn == null ? null : aColumn;
  this.source = aSource == null ? null : aSource;
  this.name = aName == null ? null : aName;
  this[isSourceNode] = true;
  if (aChunks != null) this.add(aChunks);
}

/**
 * Creates a SourceNode from generated code and a SourceMapConsumer.
 *
 * @param aGeneratedCode The generated code
 * @param aSourceMapConsumer The SourceMap for the generated code
 * @param aRelativePath Optional. The path that relative sources in the
 *        SourceMapConsumer should be relative to.
 */
SourceNode.fromStringWithSourceMap =
  function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer, aRelativePath) {
    // The SourceNode we want to fill with the generated code
    // and the SourceMap
    var node = new SourceNode();

    // All even indices of this array are one line of the generated code,
    // while all odd indices are the newlines between two adjacent lines
    // (since `REGEX_NEWLINE` captures its match).
    // Processed fragments are accessed by calling `shiftNextLine`.
    var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
    var remainingLinesIndex = 0;
    var shiftNextLine = function() {
      var lineContents = getNextLine();
      // The last line of a file might not have a newline.
      var newLine = getNextLine() || "";
      return lineContents + newLine;

      function getNextLine() {
        return remainingLinesIndex < remainingLines.length ?
            remainingLines[remainingLinesIndex++] : undefined;
      }
    };

    // We need to remember the position of "remainingLines"
    var lastGeneratedLine = 1, lastGeneratedColumn = 0;

    // The generate SourceNodes we need a code range.
    // To extract it current and last mapping is used.
    // Here we store the last mapping.
    var lastMapping = null;

    aSourceMapConsumer.eachMapping(function (mapping) {
      if (lastMapping !== null) {
        // We add the code from "lastMapping" to "mapping":
        // First check if there is a new line in between.
        if (lastGeneratedLine < mapping.generatedLine) {
          // Associate first line with "lastMapping"
          addMappingWithCode(lastMapping, shiftNextLine());
          lastGeneratedLine++;
          lastGeneratedColumn = 0;
          // The remaining code is added without mapping
        } else {
          // There is no new line in between.
          // Associate the code between "lastGeneratedColumn" and
          // "mapping.generatedColumn" with "lastMapping"
          var nextLine = remainingLines[remainingLinesIndex] || '';
          var code = nextLine.substr(0, mapping.generatedColumn -
                                        lastGeneratedColumn);
          remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn -
                                              lastGeneratedColumn);
          lastGeneratedColumn = mapping.generatedColumn;
          addMappingWithCode(lastMapping, code);
          // No more remaining code, continue
          lastMapping = mapping;
          return;
        }
      }
      // We add the generated code until the first mapping
      // to the SourceNode without any mapping.
      // Each line is added as separate string.
      while (lastGeneratedLine < mapping.generatedLine) {
        node.add(shiftNextLine());
        lastGeneratedLine++;
      }
      if (lastGeneratedColumn < mapping.generatedColumn) {
        var nextLine = remainingLines[remainingLinesIndex] || '';
        node.add(nextLine.substr(0, mapping.generatedColumn));
        remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn);
        lastGeneratedColumn = mapping.generatedColumn;
      }
      lastMapping = mapping;
    }, this);
    // We have processed all mappings.
    if (remainingLinesIndex < remainingLines.length) {
      if (lastMapping) {
        // Associate the remaining code in the current line with "lastMapping"
        addMappingWithCode(lastMapping, shiftNextLine());
      }
      // and add the remaining lines without any mapping
      node.add(remainingLines.splice(remainingLinesIndex).join(""));
    }

    // Copy sourcesContent into SourceNode
    aSourceMapConsumer.sources.forEach(function (sourceFile) {
      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        if (aRelativePath != null) {
          sourceFile = util.join(aRelativePath, sourceFile);
        }
        node.setSourceContent(sourceFile, content);
      }
    });

    return node;

    function addMappingWithCode(mapping, code) {
      if (mapping === null || mapping.source === undefined) {
        node.add(code);
      } else {
        var source = aRelativePath
          ? util.join(aRelativePath, mapping.source)
          : mapping.source;
        node.add(new SourceNode(mapping.originalLine,
                                mapping.originalColumn,
                                source,
                                code,
                                mapping.name));
      }
    }
  };

/**
 * Add a chunk of generated JS to this source node.
 *
 * @param aChunk A string snippet of generated JS code, another instance of
 *        SourceNode, or an array where each member is one of those things.
 */
SourceNode.prototype.add = function SourceNode_add(aChunk) {
  if (Array.isArray(aChunk)) {
    aChunk.forEach(function (chunk) {
      this.add(chunk);
    }, this);
  }
  else if (aChunk[isSourceNode] || typeof aChunk === "string") {
    if (aChunk) {
      this.children.push(aChunk);
    }
  }
  else {
    throw new TypeError(
      "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
    );
  }
  return this;
};

/**
 * Add a chunk of generated JS to the beginning of this source node.
 *
 * @param aChunk A string snippet of generated JS code, another instance of
 *        SourceNode, or an array where each member is one of those things.
 */
SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
  if (Array.isArray(aChunk)) {
    for (var i = aChunk.length-1; i >= 0; i--) {
      this.prepend(aChunk[i]);
    }
  }
  else if (aChunk[isSourceNode] || typeof aChunk === "string") {
    this.children.unshift(aChunk);
  }
  else {
    throw new TypeError(
      "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
    );
  }
  return this;
};

/**
 * Walk over the tree of JS snippets in this node and its children. The
 * walking function is called once for each snippet of JS and is passed that
 * snippet and the its original associated source's line/column location.
 *
 * @param aFn The traversal function.
 */
SourceNode.prototype.walk = function SourceNode_walk(aFn) {
  var chunk;
  for (var i = 0, len = this.children.length; i < len; i++) {
    chunk = this.children[i];
    if (chunk[isSourceNode]) {
      chunk.walk(aFn);
    }
    else {
      if (chunk !== '') {
        aFn(chunk, { source: this.source,
                     line: this.line,
                     column: this.column,
                     name: this.name });
      }
    }
  }
};

/**
 * Like `String.prototype.join` except for SourceNodes. Inserts `aStr` between
 * each of `this.children`.
 *
 * @param aSep The separator.
 */
SourceNode.prototype.join = function SourceNode_join(aSep) {
  var newChildren;
  var i;
  var len = this.children.length;
  if (len > 0) {
    newChildren = [];
    for (i = 0; i < len-1; i++) {
      newChildren.push(this.children[i]);
      newChildren.push(aSep);
    }
    newChildren.push(this.children[i]);
    this.children = newChildren;
  }
  return this;
};

/**
 * Call String.prototype.replace on the very right-most source snippet. Useful
 * for trimming whitespace from the end of a source node, etc.
 *
 * @param aPattern The pattern to replace.
 * @param aReplacement The thing to replace the pattern with.
 */
SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
  var lastChild = this.children[this.children.length - 1];
  if (lastChild[isSourceNode]) {
    lastChild.replaceRight(aPattern, aReplacement);
  }
  else if (typeof lastChild === 'string') {
    this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
  }
  else {
    this.children.push(''.replace(aPattern, aReplacement));
  }
  return this;
};

/**
 * Set the source content for a source file. This will be added to the SourceMapGenerator
 * in the sourcesContent field.
 *
 * @param aSourceFile The filename of the source file
 * @param aSourceContent The content of the source file
 */
SourceNode.prototype.setSourceContent =
  function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
    this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
  };

/**
 * Walk over the tree of SourceNodes. The walking function is called for each
 * source file content and is passed the filename and source content.
 *
 * @param aFn The traversal function.
 */
SourceNode.prototype.walkSourceContents =
  function SourceNode_walkSourceContents(aFn) {
    for (var i = 0, len = this.children.length; i < len; i++) {
      if (this.children[i][isSourceNode]) {
        this.children[i].walkSourceContents(aFn);
      }
    }

    var sources = Object.keys(this.sourceContents);
    for (var i = 0, len = sources.length; i < len; i++) {
      aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
    }
  };

/**
 * Return the string representation of this source node. Walks over the tree
 * and concatenates all the various snippets together to one string.
 */
SourceNode.prototype.toString = function SourceNode_toString() {
  var str = "";
  this.walk(function (chunk) {
    str += chunk;
  });
  return str;
};

/**
 * Returns the string representation of this source node along with a source
 * map.
 */
SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
  var generated = {
    code: "",
    line: 1,
    column: 0
  };
  var map = new SourceMapGenerator(aArgs);
  var sourceMappingActive = false;
  var lastOriginalSource = null;
  var lastOriginalLine = null;
  var lastOriginalColumn = null;
  var lastOriginalName = null;
  this.walk(function (chunk, original) {
    generated.code += chunk;
    if (original.source !== null
        && original.line !== null
        && original.column !== null) {
      if(lastOriginalSource !== original.source
         || lastOriginalLine !== original.line
         || lastOriginalColumn !== original.column
         || lastOriginalName !== original.name) {
        map.addMapping({
          source: original.source,
          original: {
            line: original.line,
            column: original.column
          },
          generated: {
            line: generated.line,
            column: generated.column
          },
          name: original.name
        });
      }
      lastOriginalSource = original.source;
      lastOriginalLine = original.line;
      lastOriginalColumn = original.column;
      lastOriginalName = original.name;
      sourceMappingActive = true;
    } else if (sourceMappingActive) {
      map.addMapping({
        generated: {
          line: generated.line,
          column: generated.column
        }
      });
      lastOriginalSource = null;
      sourceMappingActive = false;
    }
    for (var idx = 0, length = chunk.length; idx < length; idx++) {
      if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
        generated.line++;
        generated.column = 0;
        // Mappings end at eol
        if (idx + 1 === length) {
          lastOriginalSource = null;
          sourceMappingActive = false;
        } else if (sourceMappingActive) {
          map.addMapping({
            source: original.source,
            original: {
              line: original.line,
              column: original.column
            },
            generated: {
              line: generated.line,
              column: generated.column
            },
            name: original.name
          });
        }
      } else {
        generated.column++;
      }
    }
  });
  this.walkSourceContents(function (sourceFile, sourceContent) {
    map.setSourceContent(sourceFile, sourceContent);
  });

  return { code: generated.code, map: map };
};

exports.SourceNode = SourceNode;

},{"./source-map-generator":43,"./util":45}],45:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

/**
 * This is a helper function for getting values from parameter/options
 * objects.
 *
 * @param args The object we are extracting values from
 * @param name The name of the property we are getting.
 * @param defaultValue An optional value to return if the property is missing
 * from the object. If this is not specified and the property is missing, an
 * error will be thrown.
 */
function getArg(aArgs, aName, aDefaultValue) {
  if (aName in aArgs) {
    return aArgs[aName];
  } else if (arguments.length === 3) {
    return aDefaultValue;
  } else {
    throw new Error('"' + aName + '" is a required argument.');
  }
}
exports.getArg = getArg;

var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;
var dataUrlRegexp = /^data:.+\,.+$/;

function urlParse(aUrl) {
  var match = aUrl.match(urlRegexp);
  if (!match) {
    return null;
  }
  return {
    scheme: match[1],
    auth: match[2],
    host: match[3],
    port: match[4],
    path: match[5]
  };
}
exports.urlParse = urlParse;

function urlGenerate(aParsedUrl) {
  var url = '';
  if (aParsedUrl.scheme) {
    url += aParsedUrl.scheme + ':';
  }
  url += '//';
  if (aParsedUrl.auth) {
    url += aParsedUrl.auth + '@';
  }
  if (aParsedUrl.host) {
    url += aParsedUrl.host;
  }
  if (aParsedUrl.port) {
    url += ":" + aParsedUrl.port
  }
  if (aParsedUrl.path) {
    url += aParsedUrl.path;
  }
  return url;
}
exports.urlGenerate = urlGenerate;

/**
 * Normalizes a path, or the path portion of a URL:
 *
 * - Replaces consecutive slashes with one slash.
 * - Removes unnecessary '.' parts.
 * - Removes unnecessary '<dir>/..' parts.
 *
 * Based on code in the Node.js 'path' core module.
 *
 * @param aPath The path or url to normalize.
 */
function normalize(aPath) {
  var path = aPath;
  var url = urlParse(aPath);
  if (url) {
    if (!url.path) {
      return aPath;
    }
    path = url.path;
  }
  var isAbsolute = exports.isAbsolute(path);

  var parts = path.split(/\/+/);
  for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
    part = parts[i];
    if (part === '.') {
      parts.splice(i, 1);
    } else if (part === '..') {
      up++;
    } else if (up > 0) {
      if (part === '') {
        // The first part is blank if the path is absolute. Trying to go
        // above the root is a no-op. Therefore we can remove all '..' parts
        // directly after the root.
        parts.splice(i + 1, up);
        up = 0;
      } else {
        parts.splice(i, 2);
        up--;
      }
    }
  }
  path = parts.join('/');

  if (path === '') {
    path = isAbsolute ? '/' : '.';
  }

  if (url) {
    url.path = path;
    return urlGenerate(url);
  }
  return path;
}
exports.normalize = normalize;

/**
 * Joins two paths/URLs.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be joined with the root.
 *
 * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
 *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
 *   first.
 * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
 *   is updated with the result and aRoot is returned. Otherwise the result
 *   is returned.
 *   - If aPath is absolute, the result is aPath.
 *   - Otherwise the two paths are joined with a slash.
 * - Joining for example 'http://' and 'www.example.com' is also supported.
 */
function join(aRoot, aPath) {
  if (aRoot === "") {
    aRoot = ".";
  }
  if (aPath === "") {
    aPath = ".";
  }
  var aPathUrl = urlParse(aPath);
  var aRootUrl = urlParse(aRoot);
  if (aRootUrl) {
    aRoot = aRootUrl.path || '/';
  }

  // `join(foo, '//www.example.org')`
  if (aPathUrl && !aPathUrl.scheme) {
    if (aRootUrl) {
      aPathUrl.scheme = aRootUrl.scheme;
    }
    return urlGenerate(aPathUrl);
  }

  if (aPathUrl || aPath.match(dataUrlRegexp)) {
    return aPath;
  }

  // `join('http://', 'www.example.com')`
  if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
    aRootUrl.host = aPath;
    return urlGenerate(aRootUrl);
  }

  var joined = aPath.charAt(0) === '/'
    ? aPath
    : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

  if (aRootUrl) {
    aRootUrl.path = joined;
    return urlGenerate(aRootUrl);
  }
  return joined;
}
exports.join = join;

exports.isAbsolute = function (aPath) {
  return aPath.charAt(0) === '/' || urlRegexp.test(aPath);
};

/**
 * Make a path relative to a URL or another path.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be made relative to aRoot.
 */
function relative(aRoot, aPath) {
  if (aRoot === "") {
    aRoot = ".";
  }

  aRoot = aRoot.replace(/\/$/, '');

  // It is possible for the path to be above the root. In this case, simply
  // checking whether the root is a prefix of the path won't work. Instead, we
  // need to remove components from the root one by one, until either we find
  // a prefix that fits, or we run out of components to remove.
  var level = 0;
  while (aPath.indexOf(aRoot + '/') !== 0) {
    var index = aRoot.lastIndexOf("/");
    if (index < 0) {
      return aPath;
    }

    // If the only part of the root that is left is the scheme (i.e. http://,
    // file:///, etc.), one or more slashes (/), or simply nothing at all, we
    // have exhausted all components, so the path is not relative to the root.
    aRoot = aRoot.slice(0, index);
    if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
      return aPath;
    }

    ++level;
  }

  // Make sure we add a "../" for each component we removed from the root.
  return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
}
exports.relative = relative;

var supportsNullProto = (function () {
  var obj = Object.create(null);
  return !('__proto__' in obj);
}());

function identity (s) {
  return s;
}

/**
 * Because behavior goes wacky when you set `__proto__` on objects, we
 * have to prefix all the strings in our set with an arbitrary character.
 *
 * See https://github.com/mozilla/source-map/pull/31 and
 * https://github.com/mozilla/source-map/issues/30
 *
 * @param String aStr
 */
function toSetString(aStr) {
  if (isProtoString(aStr)) {
    return '$' + aStr;
  }

  return aStr;
}
exports.toSetString = supportsNullProto ? identity : toSetString;

function fromSetString(aStr) {
  if (isProtoString(aStr)) {
    return aStr.slice(1);
  }

  return aStr;
}
exports.fromSetString = supportsNullProto ? identity : fromSetString;

function isProtoString(s) {
  if (!s) {
    return false;
  }

  var length = s.length;

  if (length < 9 /* "__proto__".length */) {
    return false;
  }

  if (s.charCodeAt(length - 1) !== 95  /* '_' */ ||
      s.charCodeAt(length - 2) !== 95  /* '_' */ ||
      s.charCodeAt(length - 3) !== 111 /* 'o' */ ||
      s.charCodeAt(length - 4) !== 116 /* 't' */ ||
      s.charCodeAt(length - 5) !== 111 /* 'o' */ ||
      s.charCodeAt(length - 6) !== 114 /* 'r' */ ||
      s.charCodeAt(length - 7) !== 112 /* 'p' */ ||
      s.charCodeAt(length - 8) !== 95  /* '_' */ ||
      s.charCodeAt(length - 9) !== 95  /* '_' */) {
    return false;
  }

  for (var i = length - 10; i >= 0; i--) {
    if (s.charCodeAt(i) !== 36 /* '$' */) {
      return false;
    }
  }

  return true;
}

/**
 * Comparator between two mappings where the original positions are compared.
 *
 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
 * mappings with the same original source/line/column, but different generated
 * line and column the same. Useful when searching for a mapping with a
 * stubbed out mapping.
 */
function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
  var cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0 || onlyCompareOriginal) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByOriginalPositions = compareByOriginalPositions;

/**
 * Comparator between two mappings with deflated source and name indices where
 * the generated positions are compared.
 *
 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
 * mappings with the same generated line and column, but different
 * source/name/original line and column the same. Useful when searching for a
 * mapping with a stubbed out mapping.
 */
function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
  var cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0 || onlyCompareGenerated) {
    return cmp;
  }

  cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;

function strcmp(aStr1, aStr2) {
  if (aStr1 === aStr2) {
    return 0;
  }

  if (aStr1 === null) {
    return 1; // aStr2 !== null
  }

  if (aStr2 === null) {
    return -1; // aStr1 !== null
  }

  if (aStr1 > aStr2) {
    return 1;
  }

  return -1;
}

/**
 * Comparator between two mappings with inflated source and name strings where
 * the generated positions are compared.
 */
function compareByGeneratedPositionsInflated(mappingA, mappingB) {
  var cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;

/**
 * Strip any JSON XSSI avoidance prefix from the string (as documented
 * in the source maps specification), and then parse the string as
 * JSON.
 */
function parseSourceMapInput(str) {
  return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ''));
}
exports.parseSourceMapInput = parseSourceMapInput;

/**
 * Compute the URL of a source given the the source root, the source's
 * URL, and the source map's URL.
 */
function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
  sourceURL = sourceURL || '';

  if (sourceRoot) {
    // This follows what Chrome does.
    if (sourceRoot[sourceRoot.length - 1] !== '/' && sourceURL[0] !== '/') {
      sourceRoot += '/';
    }
    // The spec says:
    //   Line 4: An optional source root, useful for relocating source
    //   files on a server or removing repeated values in the
    //   “sources” entry.  This value is prepended to the individual
    //   entries in the “source” field.
    sourceURL = sourceRoot + sourceURL;
  }

  // Historically, SourceMapConsumer did not take the sourceMapURL as
  // a parameter.  This mode is still somewhat supported, which is why
  // this code block is conditional.  However, it's preferable to pass
  // the source map URL to SourceMapConsumer, so that this function
  // can implement the source URL resolution algorithm as outlined in
  // the spec.  This block is basically the equivalent of:
  //    new URL(sourceURL, sourceMapURL).toString()
  // ... except it avoids using URL, which wasn't available in the
  // older releases of node still supported by this library.
  //
  // The spec says:
  //   If the sources are not absolute URLs after prepending of the
  //   “sourceRoot”, the sources are resolved relative to the
  //   SourceMap (like resolving script src in a html document).
  if (sourceMapURL) {
    var parsed = urlParse(sourceMapURL);
    if (!parsed) {
      throw new Error("sourceMapURL could not be parsed");
    }
    if (parsed.path) {
      // Strip the last path component, but keep the "/".
      var index = parsed.path.lastIndexOf('/');
      if (index >= 0) {
        parsed.path = parsed.path.substring(0, index + 1);
      }
    }
    sourceURL = join(urlGenerate(parsed), sourceURL);
  }

  return normalize(sourceURL);
}
exports.computeSourceURL = computeSourceURL;

},{}],46:[function(require,module,exports){
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
exports.SourceMapGenerator = require('./lib/source-map-generator').SourceMapGenerator;
exports.SourceMapConsumer = require('./lib/source-map-consumer').SourceMapConsumer;
exports.SourceNode = require('./lib/source-node').SourceNode;

},{"./lib/source-map-consumer":42,"./lib/source-map-generator":43,"./lib/source-node":44}],47:[function(require,module,exports){

},{}]},{},[1]);
