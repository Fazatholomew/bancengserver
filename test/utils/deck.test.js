const { expect } = require('chai');
const { Deck } = require('../../utils/deck');

describe('Deck Initialization', () => {
  const result = new Deck();
  it('should be an object', () => {
    expect(result).to.be.an('object');
  });

  it('should be 52 total', () => {
    expect(Object.keys(result.cards).length).to.equal(52);
  });

  it('should shuffle', () => {
    const before = result.cards[result.length - 1];
    const after = result.kocok();
    expect(before).to.not.equal(after);
  });

  it('should draw', () => {
    const before = result.length;
    result.bagi();
    const after = result.length;
    expect(before).to.not.equal(after);
  });
});
