const { expect } = require('chai');
const { CardSequence } = require('../../utils/cardSequence');

describe('CardSequence Initialization', () => {
  const result = new CardSequence();
  it('should be an object', () => {
    expect(result).to.be.an('object');
  });

  it('should be 2 total and no type', () => {
    result.addCards(['7 Spade']);
    result.addCards(['6 Spade']);
    expect(result.length).to.equal(2);
    expect(result.type).to.equal('');
  });

  it('should remove 6 Spade and satuan type', () => {
    const removed = result.removeCards([0])[0];
    expect(removed.displayName).to.be.equal('6 Spade');
    expect(result.type).to.equal('satuan');
  });

  it('should be royalflush type', () => {
    result.removeCards([0]);
    result.addCards(['10 Spade', 'K Spade', 'Q Spade', 'A Spade', 'J Spade']);
    expect(result.type).to.equal('royalflush');
  });
});
