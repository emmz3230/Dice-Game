
let diceGlyphs={'1':'\u2680','2':'\u2681','3':'\u2682','4':'\u2683','5':'\u2684','6':'\u2685'}

export function computeDiceHands(dice) {
    // Sort the dice to standardize the display
    const sortedDice = [...dice].sort( (a, b) => a - b);
    const display = sortedDice.join('');
    const unicodeDisplay = display.split('').map(d=>diceGlyphs[d]).join('');
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
            display,unicodeDisplay
        });
    }

    const uniqueCounts = Object.values(counts);
    const uniqueDice = Object.keys(counts).map(Number).sort( (a, b) => a - b);

    // Check for Five of a Kind
    if (uniqueCounts.includes(5)) {
        addHand('Five of a Kind', 100);
    }

    // Check for Four of a Kind
    if (uniqueCounts.includes(4)) {
        addHand('Four of a Kind', 80);
    }

    // Check for Full House (Three of a Kind and a Pair)
    if (uniqueCounts.includes(3) && uniqueCounts.includes(2)) {
        addHand('Full House', 60);
    }

    // Corrected Straight Checking Logic
    if (dice.length >= 5) {
        // Check for Straight (consecutive numbers)
        let isStraight = true;
        for (let i = 1; i < uniqueDice.length; i++) {
            if (uniqueDice[i] !== uniqueDice[i - 1] + 1) {
                isStraight = false;
                break;
            }
        }
        // A straight must have 5 unique consecutive numbers
        if (isStraight && uniqueDice.length === 5) {
            addHand('Straight', 50);
        }
    }

    // Check for Three of a Kind
    if (uniqueCounts.includes(3)) {
        addHand('Three of a Kind', 40);
    }

    // Check for Two Pair
    const pairCount = uniqueCounts.filter( (count) => count === 2).length;
    if (pairCount === 2) {
        addHand('Two Pair', 20);
    }

    // Check for One Pair
    if (pairCount === 1) {
        addHand('One Pair', 10);
    }

    // Always include Chance (sum of all dice)
    const chanceScore = dice.reduce( (sum, die) => sum + die, 0);
    addHand('Chance', chanceScore);

    return handResults;
}
