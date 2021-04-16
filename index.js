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
            this.bounds_.getSouthEast()
          );
          const ne = overlayProjection.fromLatLngToDivPixel(
            this.bounds_.getNorthWest()
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
            getNorthWest: rectangle.getBounds().getNorthWest().toJSON(),
            getSouthEast: rectangle.getBounds().getSouthEast().toJSON(),
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

  var makeLatLng = a => ({
    lat: a[0],
    lng: a[1]
  })


  var run = location => {

    var center = function(arr) {
      var x = arr.map(function(a) {
        return a[0]
      });
      var y = arr.map(function(a) {
        return a[1]
      });
      var minX = Math.min.apply(null, x);
      var maxX = Math.max.apply(null, x);
      var minY = Math.min.apply(null, y);
      var maxY = Math.max.apply(null, y);
      return [(minX + maxX) / 2, (minY + maxY) / 2];
    }


    if (!location) return

    var l = center(location.boundingPoly.vertices.map(v => [v.x, v.y]))

    // console.log("parseLocationNames", location.description);

    return {
      x: l[0],
      y: l[1],
    }

  }



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
    getNorthWest: {
      lat: 51.61577247781892,
      lng: -24.50441987718352
    },
    getSouthEast: {
      lat: 4.244208080077743,
      lng: 31.7345937946915
    }


  }



  console.log("absolte lat", rawOrigin.getNorthWest.lat + rawOrigin.getSouthEast.lat);
  console.log("absolte lng", rawOrigin.getNorthWest.lng + -rawOrigin.getSouthEast.lng);

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

    lat: rawOrigin.getNorthWest.lat,
    lng: rawOrigin.getNorthWest.lng,

  })
  var removeOffset = a => addLatLng(a, {

    lat: -rawOrigin.getNorthWest.lat,
    lng: -rawOrigin.getNorthWest.lng,

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

    var lngDistance = Math.abs(rawMapToMapBounds.getNorthWest.lng) + Math.abs(rawMapToMapBounds.getSouthEast.lng)
    var latDistance = Math.abs(rawMapToMapBounds.getNorthWest.lat) + Math.abs(rawMapToMapBounds.getSouthEast.lat)
    // console.log(lngDistance);
    // console.log(latDistance);



    var mappedXToLngPercent = (x / XMax) * lngDistance
    var mappedYToLatPercent = (y / YMax) * latDistance

    // console.log("mappedXToLngPercent", mappedXToLngPercent)
    // console.log("mappedYToLatPercent", mappedYToLatPercent)




    // console.log(name," rawMapToMapBounds.getNorthWest.lng + mappedXToLngPercent", mappedXToLngPercent);
    console.log(name, mappedYToLatPercent, (latDistance / 2), ((latDistance / 2) - (mappedYToLatPercent)), (y / YMax));




    var calc = {
      lng: rawMapToMapBounds.getNorthWest.lng + (mappedXToLngPercent - 6.9),
      // lat: rawMapToMapBounds.getNorthWest.lat + (((-mappedYToLatPercent + 7) - ((latDistance / 2) - (mappedYToLatPercent)) / 5)),
      // lat: rawMapToMapBounds.getNorthWest.lat + (((-mappedYToLatPercent + 7) - ((latDistance / 2) - (mappedYToLatPercent)) / 5)),
      lat: rawMapToMapBounds.getNorthWest.lat + (-mappedYToLatPercent),
    }

    // console.log("calc", calc);


    fastMarker(calc, name)



    // rawMapToMapBounds.getNorthWest

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
  crossmap("purgg")
  crossmap("raddis")
  crossmap("bernloch")
  crossmap("ballenhof")

  crossmap("russbach")
  crossmap("bogglewort")





  /*
  ok perhaps i  can take the raw number (say x/lng) and find the bound extends on the  lng axis on the map
  thisll give a nnumber thats the total width of the avalible area where a point can fall on the raw mmap
  then i can find the % of how far over on the x axis the raw location is
  then find the same person on the lng axis, which should give the same location
  */





  fastMarker(rawOrigin.getNorthWest, "rawOrigin.getNorthWest")
  fastMarker(rawOrigin.getSouthEast, "rawOrigin.getSouthEast")
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
