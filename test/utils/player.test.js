const { expect } = require('chai');
const { Player } = require('../../utils/player');

describe('Player Initialization', () => {
  const result = new Player('jimboy');
  it('should be an object and jimboy name', () => {
    expect(result).to.be.an('object');
    expect(result.name).to.equal('jimboy');
  });

  it('should have spade face', () => {
    result.addCards(['5 Spade']);
    expect(result.cards.cards[0].face).to.equal('Spade');
  });
});
