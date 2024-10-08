export default {
    //Dice
    //diceUrl: "./assets/Dice.glb",
    //diceUrl: "./assets/DiceT6.glb",
    //diceUrl: "./assets/GemDiceU.glb",
    diceUrl: "./assets/DefDice.glb",
    selectionMeshUrl: "./assets/DiceCollider.glb",
    
    //diceUrl: "./assets/AlienDice.glb",
    //selectionMeshUrl: "./assets/AlienCollider.glb",
    
   // diceUrl: "./assets/MarioParty.glb",
   // selectionMeshUrl: "./assets/MarioPartyCollider.glb",
    selectionMeshScale: 1.1,
    diceScale: 1.,
    environmentUrl: `./assets/oxTqLelBTDo54v1q7Rs_pc78N8XiEHoTaQVLhyKQP90.jpg`,
    //floorTexture: './assets/paper.jpg',
    //floorRepeat: 14,
    floorRoughness: 1,
    floorMetalness: 0,

    //Camera stuff
    cameraPosition: [0, 45, 20],
    cameraLookAt: [0, 0, 0],
    //freeCamera:true,  //Let the camera move for debugging...
    fov: 15,

    // physics
    restitution: .3,
    //How bouncy the dice are 0 to 1
    friction: .1,
    // How much friction
    diceForce: 10,
    //Throwing force of dice...

    //Appearance:
    playFieldScale: 6,
    // Scale of walls relative to screen
    environmentRotation: [Math.PI, 0, 0],
    //Rotate the environment map/background
    debugWalls: false,

    debugClicks: false,

    //Bloom/glow
    bloomThreshold: .8,
    bloomStrength: .4,
    bloomRadius: 0,
    bloomExposure: 1,

    //Misc experiments
    diceRoughness: .1,
    // Dice roughness override
    diceMetalness: .2,
    // Dice metalness override
    //diceUrl:`./assets/shiba.glb`,
    //diceScale: .5,
    //diceUrl: `./assets/cube.glb`

}