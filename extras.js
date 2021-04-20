function downloadObjectAsJson(exportObj, exportName) {
  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
  var downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}


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
      Swal.fire({
        title: 'Data imported!',
        text: 'The page will now reload to import data'
      })
    }
    reader.readAsText(file)
    //

  }
}


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
