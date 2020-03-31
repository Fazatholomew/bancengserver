const { Card } = require('./card');

const recognize = (seq) => {
  // return played cards sequence type
  const cardNumbers = seq.map((card) => card.number);
  const cardFaces = seq.map((card) => card.face);
  const cardValues = seq.map((card) => card.numberValue);
  cardValues.sort((a, b) => (a > b) ? 1 : -1);
  let straightCounter = 0;
  for (let i = 0; i < cardValues.length - 1; i++) {
    if ((cardValues[i] - cardValues[i + 1]) === -1) {
      straightCounter++;
    }
  }
  const countNumbers = {};
  const countFaces = {};
  cardNumbers.forEach((x) => { countNumbers[x] = (countNumbers[x] || 0) + 1; });
  cardFaces.forEach((x) => { countFaces[x] = (countFaces[x] || 0) + 1; });
  switch (seq.length) {
    case 1:
      return 'satuan';

    case 2:
      return Object.keys(countNumbers).length === 1 ? 'pair' : '';

    case 3:
      return Object.keys(countNumbers).length === 1 ? 'tris' : '';

    case 5:
      if (Object.keys(countFaces).length === 1) {
        if (straightCounter === 4) {
          let royalCounter = 0;
          cardNumbers.forEach((number) => {
            if (['10', 'A', 'J', 'K', 'Q'].includes(number)) {
              royalCounter++;
            }
          });
          if (royalCounter === 5) {
            return 'royalflush';
          }
          return 'straightflush';
        }
        return 'flush';
      }
      if (Object.keys(countNumbers).length === 2) {
        if (countNumbers[Object.keys(countNumbers)[0]] === 4 || countNumbers[Object.keys(countNumbers)[1]] === 4) {
          return 'bomb';
        }
        return 'fullhouse';
      }
      if (straightCounter === 4) {
        return 'straight';
      }
      return '';

    default:
      if (Object.keys(countNumbers).includes('2')) {
        if (countNumbers['2'] === 4) {
          return 'kabeh2';
        }
      }
      if (straightCounter === 12) {
        return 'dragon';
      }
      return '';
  }
};

class CardSequence {
  // Card(s) container. Possible to only have one card (satuan)
  constructor() {
    this.cards = [];
    this.length = this.cards.length;
    this.type = '';
    this.cardTable = {};
  }

  addCards(names) {
    // add card into sequence
    names.forEach((name) => {
      if (!this.cardTable[name]) {
        this.cardTable[name] = 1;
        this.cards.push(new Card(name));
      }
    });
    this.update();
  }

  removeCards(indexes) {
    // remove card from sequence
    // return removed card
    const removedCards = [];
    indexes.forEach((index) => {
      removedCards.push(this.cards[index]);
    });
    indexes.forEach((index) => {
      this.cards.splice(index, 1);
    });
    this.update();
    return removedCards;
  }

  update() {
    // update instance condition
    this.length = this.cards.length;
    this.cards.sort((a, b) => (a.cardValue > b.cardValue) ? 1 : -1);
    this.type = recognize(this.cards);
  }
}

module.exports = { CardSequence };
