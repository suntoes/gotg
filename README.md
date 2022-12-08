Only needs 3 HTML elements in a website to be ported at:

- Div w/ id = `gotg-board`
  - The container for the 3D game itself. Game will be responsive to the div if it (or window) ever change sizes.
- Heading w/ id = `gotg-gui`
  - The announcer for the game. An initial text will show up "Loading...", once 3D game is loaded to client, the text will change to real time state of game.
  - Can be placed anywhere, above, on top, or below the game container.
- Button w/ id = `gotg-reset`
  - Only needed functioning button for the game. Resets the match once clicked.
  - Can be placed anywhere, above, on top, or below the game container.

As for the 3 custom html script tags if gotg.js and gotg-lib/ is in public directory:

`<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/109/three.min.js"></script>`

`<script type="module" src="gotg-lib/piece_structure/index.js"></script>`

`<script type="module" src="gotg.js"></script>`
