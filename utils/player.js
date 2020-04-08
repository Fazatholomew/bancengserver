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
  console.log(userId, people);
  const finalTurn = [];
  const playersLength = people.length - 1;
  finalTurn.push(userId);
  const userIndex = people.indexOf(userId);
  if (userIndex > -1) {
    let current = userIndex + 1;
    while (current !== userIndex) {
      finalTurn.push(people[current]);
      current++;
      if (current > playersLength) current = 0;
    }
    return finalTurn;
  }
  return [];
};

module.exports = { Player, turnGenerator };
