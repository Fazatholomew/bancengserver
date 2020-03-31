const numbers = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const numberValues = {};
numbers.forEach((number, i) => {
  numberValues[number] = i;
});
const faces = {
  Diamond: '♦️',
  Club: '♣️',
  Heart: '♥️',
  Spade: '♠️',
};
const facesRange = {
  Diamond: 0,
  Club: 1,
  Heart: 2,
  Spade: 3,
};
const paket = {
  pair: 0,
  tris: 1,
  straight: 2,
  flush: 3,
  fullhouse: 4,
  bomb: 5,
  straightflush: 6,
  royalflush: 7
};
const baseDeck = {};

let index = 0;
numbers.forEach((number) => {
  // Initialized baseDeck to have 3 diamond until 2 spade
  Object.keys(faces).forEach((face) => {
    baseDeck[`${number} ${face}`] = index;
    index++;
  });
});

class Card {
  // Card class. Hold each card value, face, condition, and image
  constructor(name) {
    const splitted = name.split(' ');
    this.value = baseDeck[name];
    [this.number, this.face] = splitted;
    this.numberValue = numberValues[this.number];
    this.suitEmoji = faces[this.face];
    this.color = (this.face === 'Heart' || this.face === 'Diamond') ? 'red' : 'black';
    this.displayName = name;
  }
}

module.exports = {
  paket,
  baseDeck,
  Card,
  facesRange,
  numberValues
};
