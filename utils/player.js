const { CardSequence } = require('./cardSequence');

class Player {
  // Player class. Has name and cards in hand.
  constructor(name) {
    this.name = name;
    this.cards = new CardSequence();
  }

  addCards(names) {
    this.cards.addCards(names);
  }
}

module.exports = { Player };
