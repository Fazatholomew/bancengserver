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

  removeCard(indexes) {
    this.cards.removeCards(indexes);
  }
}

const turnGenerator = (userId, people) => {
  const finalTurn = [];
  const length = people.length;
  finalTurn.push(userId);
  const userIndex = finalTurn.indexOf(userId);
  let current = userIndex + 1;
  while (current !== userIndex) {
    if (current > length) current = 0;
    finalTurn.push(people[current]);
    current++;
  }
  return finalTurn;
};

module.exports = { Player, turnGenerator };
