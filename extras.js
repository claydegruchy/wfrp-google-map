
  function drawCircle(point, radius, dir) {
    if (!point) {
      return
    }
    try {
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
    } catch (e) {
      console.error(e);
      return []
    } finally {

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
