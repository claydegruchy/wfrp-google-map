# WFRP Google Map
A tool to easily visualize the Warhammer world.


# Usage
Markers and lines can be deleted with alt+right-click while edit mode is enabled.

- General options
  - Select the hand to o view general options, select markers and add text.
- Markers
  - To place markers, use the marker icon at the top of the screen. This can be used to add comments and descriptions to a marker as well.
- Lines
  - To place linens, use the line icon at the top of the screen, draw out a line then click on the Hand to complete the drawing.


# Features
## Automatic game history plotting
### Usage
Adding the URL param of `link=username/repo` lets you import from your own personal campaign if its in github, and then have that data automatically plotted on the map as markers. These markers can also contain the details of the adventure, allowing an easy view of a campaigns progress.

Example: https://claydegruchy.github.io/wfrp-google-map?link=claydegruchy/a-wfrp-group. This links to my personal campaign: https://github.com/claydegruchy/a-wfrp-group

The tool will read the notes placed in the repo's top level (only reads the `master` branch, and `*.md` files). It will then search for *location* anchors and attempt to slice the stories up into *chapters*, each one started by a location, and ended with a # (the # can be the start of the next location). These follow the format of:

```
# Location: [distance (optional)] [direction (optional)] [of (optional)] [town/city (required)] \n

[...Text of the chapter (optional, may be any number of lines)...]

# (the # signifies the end stop for each chapter of an adventure)
```

#### Rules
- Required (any not meeting this will be skipped)
  - Location must be prefixed by ie: `# Location: `
  - Location must contain the name of a town somewhere on the map, ie  `# Location: Aldorf`
  - Location must end with a newline `# Location: Aldorf \n`
  - Chapter must end with a `#`, this can be the start of the next location anchor, ie `# Location: Aldorf \n We went to the tavern, I got stabbed \n #`
- Options
  - The system can also place markers relative to a given town by adding a direction (supports north, south, east and west), ie `# Location: North Aldorf \n`
    - By default this will place a marker 1 "mile" north of the centre of Altdorf
  - In addition to markers having a relative direction, they can also be given a distance to move the marker further away from the centre, ie `# Location: 3 miles north of Aldorf \n`
    - the system will recognize miles or km but the distance will be the same (sorry!)
  - Text placed between the Location and the ending # will be added to any markers

An example of an ideal campaign note:

https://github.com/claydegruchy/a-wfrp-group/blob/master/Session-2.md

## Import and export of data

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
