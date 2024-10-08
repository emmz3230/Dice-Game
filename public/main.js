import config from "./config.js";
import { Renderer } from "./renderer.js";
import { SimpleDice } from "./simple-dice.js"; // Make sure to import SimpleDice

let {
  THREE,
  scene,
  camera,
  renderer,
  controls,
  ambientLight,
  directionalLight,
  events,
  gui,
  glbLoader,
  raycasting,
  postProcessing,
} = new Renderer(config);

if (postProcessing) {
  if (config.bloomThreshold)
    postProcessing.params.bloomThreshold = config.bloomThreshold;
  if (config.bloomStrength)
    postProcessing.params.bloomStrength = config.bloomStrength;
  if (config.bloomRadius)
    postProcessing.params.bloomRadius = config.bloomRadius;
  if (config.bloomExposure)
    postProcessing.params.bloomExposure = config.bloomExposure;
}

gui.hide();

let simpleDice = await SimpleDice({
  THREE,
  renderer,
  scene,
  camera,
  glbLoader,
  raycasting,
  events,
  config,
});

let triggers = {
  diceThrown: false,
  rollFinished: false,
  allHeld: false,
};

let disposeTime = 0;
let popMsgs = [];
setInterval(() => {
  if (performance.now() < disposeTime + (popMsgs.length ? 100 : 2000))
    return;

  if (popup.style.display != "none") {
    popup.blur();
    popup.style.display = "none";
  }
  if (popMsgs.length) {
    popup.innerText = popMsgs.shift();
    console.log(popup.innerText);
    popup.style.display = "";
    disposeTime = performance.now();
  }
}, 100);

let popMsg = (str) => {
  popMsgs.push(str);
};

document.addEventListener("popmsg", (e) => {
  popMsg(e.detail);
});

// Assigned positions for each dice (adjust coordinates as needed)
const assignedPositions = [
  new THREE.Vector3(-1, 0, 0), // Position for dice 0
  new THREE.Vector3(1, 0, 0), // Position for dice 1
  new THREE.Vector3(0, 1, 0), // Position for dice 2
  new THREE.Vector3(-1, 1, 0), // Position for dice 3
  new THREE.Vector3(1, 1, 0), // Position for dice 4
];

// Function to reset the dice position
function resetDicePosition(index) {
  const dice = simpleDice.cannonDice.diceArray[index];
  if (dice) {
    dice.position.copy(assignedPositions[index]); // Reset position
    console.log(
      `Reset position of dice ${index} to`,
      assignedPositions[index]
    );
  }
}

// Function to update the dice tray display
function updateDiceTray(matchingValues) {
  const diceTray = document.querySelector(".dice-tray");

  // Clear the current contents of the dice tray
  diceTray.innerHTML = "";

  // Create a div for each matching dice value and add it to the tray
  matchingValues.forEach((value) => {
    const diceSpot = document.createElement("div");
    diceSpot.classList.add("dice-spot"); // Optional: add a class for styling
    diceSpot.textContent = value; // Set the dice result
    diceTray.appendChild(diceSpot); // Append to the dice tray
  });
}

// Function to handle dice click
function onDiceClick(clickedIndex) {
  // Get the dice values and clicked value
  let values = simpleDice.cannonDice.diceArray.map((d) => d.value);
  let clickedValue = values[clickedIndex];

  // Track triplets of dice with the same value
  let triplets = []; // Array to store arrays of dice indices forming triplets

  // Find existing triplets containing the clicked dice
  let existingTriplets = triplets.filter((triplet) =>
    triplet.includes(clickedIndex)
  );

  // If the click breaks an existing triplet:
  if (existingTriplets.length > 0) {
    // Remove the clicked dice from all triplets it belongs to
    for (let triplet of existingTriplets) {
      const removeIndex = triplet.indexOf(clickedIndex);
      if (removeIndex !== -1) {
        triplet.splice(removeIndex, 1); // Remove the clicked dice index
      }
    }
  } else {
    // If the click creates a new triplet
    // Find other dice with the same value
    let matchingDice = values
      .map((value, index) => ({ value, index }))
      .filter(
        (dice) =>
          dice.value === clickedValue && index !== clickedIndex
      );

    // Check if there are two other matching dice to form a triplet
    if (matchingDice.length >= 2) {
      // Create a new triplet array with clicked dice and two matching indices
      const newTriplet = [
        clickedIndex,
        ...matchingDice.map((dice) => dice.index),
      ];
      triplets.push(newTriplet);
    }
  }

  // Update the dice tray (optional, can be removed if not needed)
  // updateDiceTray(matchingDice.map((dice) => dice.value));

  // Log or highlight the dice (optional)
  console.log("Triplets:", triplets);

  // Reset the clicked dice to its assigned position
  resetDicePosition(clickedIndex);
}

// Example function to highlight a dice (customize this to suit your UI)
function highlightDice(index) {
  const diceElement = document.getElementById(`dice-${index}`);
  if (diceElement) {
    diceElement.style.border = "2px solid red"; // Add a red border to highlight
  }
}

// Add event listeners to each dice for clicks (based on their index)
function initializeDiceClicks() {
  // Assuming you have dice elements with IDs like 'dice-0', 'dice-1', etc.
  for (let i = 0; i < simpleDice.cannonDice.diceArray.length; i++) {
    const diceElement = document.getElementById(`dice-${index}`);
    if (diceElement) {
      diceElement.onclick = () => onDiceClick(i); // Pass the index of the clicked dice
    }
  }
}

// Initialize dice clicks after rolling
config.onrollsimulated = () => {
  triggers.rollSimulated = true;

  if (triggers.isLocalThrower) {
    // Get values from diceArray after the roll
    let values = simpleDice.cannonDice.diceArray.map((d) => d.value);

    // Update the desired result
    config.desiredResult = values;

    console.log("sending values:", values);

    let { throwDirection, throwStrength } = simpleDice.cannonDice;
    broadcastData({
      type: "throw",
      values,
      throwData: { throwDirection, throwStrength },
    });

    // Initialize click event listeners after rolling
    initializeDiceClicks();
  }
};

// Add code to handle the "Return Dice" emoji
const returnEmoji = document.getElementById("return-emoji");
returnEmoji.addEventListener("click", () => {
  // Check if there are any triplets
  if (triplets.length) {
    // Iterate through triplets and reset their positions
    for (let triplet of triplets) {
      triplet.forEach((diceIndex) => resetDicePosition(diceIndex));
    }
    // Clear the triplets array
    triplets = [];
  }
});
