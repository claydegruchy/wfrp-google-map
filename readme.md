# WFRP Google Map
A tool to easily visualize the Warhammer world.

# Requirements
This tool requires a few url params to operate:
- `key=<key>` => This is your google maps API key, get one here: https://developers.google.com/maps/documentation/javascript/get-api-key
- `story=true` => this activates 'story mode' for my own personal game and shows off the features of read only mode

This all go on as params to look something like this:

https://claydegruchy.github.io/wfrp-google-map?story=true&key=sommethinng
# Running
- clone
- `npm start` in directory

# Thanks
Based heavily on the work from gitzmansgallery.com, a big inspiration for this project.

## Todo
- [ ] I'd like to make this tool interact with the repo that contains the storyline of our RPG campagin.
  - Like various specific interactions or scenes could get geocoded (ie you meet at the prancing pony {GEO:[12,43]}) and this tool could scan for those geo markers and mark them on the map, then clicking the marker on the map could display the text of that encounter
- [ ] its total spaghetti behind the scenes so that needs fixing
- [ ] Fog of war 
