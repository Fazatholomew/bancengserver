const { baseDeck, Card } = require('./card');

class Deck {
  // Deck class. Holds card classes in beginning of each game. Initially sorted.
  constructor() {
    this.cards = Object.keys(baseDeck).map((name) => new Card(name));
    this.length = 52;
  }

  kocok() {
    // Shuffle current order or cards
    // source: https://gomakethings.com/how-to-shuffle-an-array-with-vanilla-js/
    let currentIndex = this.cards.length;
    let temporaryValue;
    let randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex !== 0) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = this.cards[currentIndex];
      this.cards[currentIndex] = this.cards[randomIndex];
      this.cards[randomIndex] = temporaryValue;
    }
  }

  bagi() {
    // Return the top card and remove that from deck
    this.length--;
    return this.cards.pop();
  }
}

module.exports = { Deck };
