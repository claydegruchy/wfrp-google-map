const vision = require('@google-cloud/vision');
const fs = require('fs');

// Creates a client
const client = new vision.ImageAnnotatorClient();

/**
 * TODO(developer): Uncomment the following line before running the sample.
 */
const fileName = './test_images/5120_empire_bw3.png';
// 5120 empire

async function findText(fileName) {
  const name = fileName.split("/").slice(-1)[0].split(".")[0];

  console.log("finding names in", fileName);
  // Performs text detection on the local file
  const [result] = await client.textDetection(fileName);
  const detections = result.textAnnotations;
  console.log('Text:');
  detections.forEach(text => console.log(text.description));

  fs.writeFileSync(`./foundImages_${name}.json`, JSON.stringify(detections, null, 2));


}



async function parseLocationNames(fileName) {
  var center = function(arr) {
    var x = arr.map(xy => xy[0]);
    var y = arr.map(xy => xy[1]);
    var cx = (Math.min(...x) + Math.max(...x)) / 2;
    var cy = (Math.min(...y) + Math.max(...y)) / 2;
    return [cx, cy];
  }



  var content = fs.readFileSync(fileName);
  var locations = JSON.parse(content)
  console.log(locations.length);
  locations = locations.filter((a, i) => i != 0)
  console.log(locations.length);

  var run = location => {
    console.log(location.description);
    console.log(location.boundingPoly);

    var middle = center(location.boundingPoly.vertices.map(p => [p.x, p.y]))
    console.log(middle);



  }

  run(locations.find(l => l.description.toLowerCase().includes("altdorf")))

  // for (var location of locations) {
  //
  //
  // }
  console.log();


}




var altdorf = {
  raw: [1407, 2448.5],
  map: [31.874268441160677, -16.277407946030955]
}

var talabheim = {
  raw: [2832.5, 2025.5],
  map: [35.692076013481106, -0.5703095462174956]
}



var x = altdorf.raw[0] / talabheim.raw[0]
var y = altdorf.raw[1] / talabheim.raw[1]
console.log(x, y);
// parseLocationNames('foundImages_5120_empire_bw3.json')
