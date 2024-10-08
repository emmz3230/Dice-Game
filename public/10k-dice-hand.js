let diceGlyphs = {
  1: "\u2680",
  2: "\u2681",
  3: "\u2682",
  4: "\u2683",
  5: "\u2684",
  6: "\u2685",
}; // ⚀⚁⚂⚃⚄⚅

export function computeDiceHands(dice) {
  // Sort the dice to standardize the display
  const sortedDice = [...dice].sort((a, b) => a - b);
  const display = sortedDice.join("");
  const unicodeDisplay = display
    .split("")
    .map((d) => diceGlyphs[d])
    .join("");

  // Count the occurrences of each die face
  const counts = {};
  for (let die of dice) {
    counts[die] = (counts[die] || 0) + 1;
  }

  const handResults = [];

  // Helper function to add a hand to the results
  function addHand(name, score) {
    handResults.push({
      name,
      score,
      display,
      unicodeDisplay,
    });
  }

  // Scoring rules from the image
  const scoringRules = {
    1: { single: 100, three: 1000 },
    5: { single: 50, three: 500 },
    2: { three: 200 },
    3: { three: 300 },
    4: { three: 400 },
    6: { three: 600 },
  };

  // Calculate points for singles (1 and 5) and combinations (three or more of a kind)
  for (const dieValue in counts) {
    const count = counts[dieValue];
    const rules = scoringRules[dieValue];

    if (rules) {
      // Check for single dice scoring (1s and 5s)
      if (rules.single && count <= 2) {
        addHand(
          `${count} x ${diceGlyphs[dieValue]}`,
          rules.single * count
        );
      }

      // Check for three or more of a kind
      if (rules.three && count >= 3) {
        const score = rules.three + (count - 3) * (rules.single || 0); // Additional scoring for more than 3 dice
        addHand(`${count} x ${diceGlyphs[dieValue]}`, score);
      }
    }
  }

  // If all five dice match, send them "home" automatically (only for combinations of 5 dice)
  if (dice.length === 5 && Object.keys(counts).length === 1) {
    console.log(dice);
    console.log(counts);
    const dieValue = Object.keys(counts)[0];
    const score = scoringRules[dieValue]?.three || 0;
    addHand(`Five of a Kind - ${diceGlyphs[dieValue]}`, score);
  }

  return handResults;
}
