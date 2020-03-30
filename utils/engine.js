const { paket, facesRange, numberValues } = require('./card');
const { CardSequence } = require('./cardSequence');

const compare = (table, hand) => {
  // Compare if cards in hand can beat what's in the table
  // Return true if hand wins
  if (table.length === hand.length) {
    switch (table.length) {
      case 1:
        return hand.cards[0].value > table.cards[0].value;

      case 2:
        return hand.cards[1].value > table.cards[1].value;

      case 3:
        return hand.cards[1].value > table.cards[1].value;

      case 5:
        if (table.type === hand.type) {
          // if paket ties
          const tableCards = table.cards.map((card) => card.number);
          const handCards = hand.cards.map((card) => card.number);
          const countTable = {};
          const countHand = {};
          let tableHigh = '';
          let handHigh = '';

          if (['fullhouse', 'bomb'].includes(table.type)) {
            tableCards.forEach((x) => { countTable[x] = (countTable[x] || 0) + 1; });
            handCards.forEach((x) => { countHand[x] = (countHand[x] || 0) + 1; });
            tableHigh = countTable[Object.keys(countTable)[0]] < countTable[Object.keys(countTable)[1]] ? Object.keys(countTable)[1] : Object.keys(countTable)[0];
            handHigh = countHand[Object.keys(countHand)[0]] < countHand[Object.keys(countHand)[1]] ? Object.keys(countHand)[1] : Object.keys(countHand)[0];
          }

          switch (table.type) {
            case 'straight':
              if (tableCards.includes('2') && handCards.includes('2')) {
                return hand.cards[3].value > table.cards[3].value;
              }
              if (tableCards.includes('2') || handCards.includes('2')) {
                return tableCards.includes('2');
              }
              return handCards[4].value > tableCards[4].value;

            case 'flush':
              if (table.cards[0].face === hand.cards[0].face) {
                const highestTable = tableCards.includes('2') ? tableCards[3] : tableCards[4];
                const highestHand = handCards.includes('2') ? handCards[3] : handCards[4];
                return highestHand > highestTable;
              }
              return facesRange[hand.cards[0].face] > facesRange[table.cards[0].face];

            case 'fullhouse':
              if (tableHigh === '2' || handHigh === '2') {
                return tableHigh === '2';
              }
              return handHigh > tableHigh;

            case 'bomb':
              return handHigh > tableHigh;

            case 'straighflush':
              if (table.cards[0].face === hand.cards[0].face) {
                if (tableCards.includes('2') || handCards.includes('2')) {
                  return tableCards.includes('2');
                }
                return handCards[4] > tableCards[4];
              }
              return facesRange[hand.cards[0].face] > facesRange[table.cards[0].face];

            default:
              return '';
          }
        } else {
          // paket different type
          return paket[hand.type] > paket[table.type];
        }

      default:
        return '';
    }
  } else {
    return '';
  }
};

const bagiin = (players, deck, start = '1') => {
  // bagiin cards based on deck equally to players in any given start position
  start = numberValues[start] - 1;
  start %= players.length;
  let counter = start;
  while (deck.length > 0) {
    players[counter].addCards([deck.bagi()]);
    counter++;
    if (counter === players.length) {
      counter = 0;
    }
  }
};


module.exports = { compare, bagiin };
