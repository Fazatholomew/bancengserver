const { expect } = require('chai');
const { CardSequence } = require('../../utils/cardSequence');

describe('CardSequence Initialization', () => {
  it('should be an object', () => {
    const result = new CardSequence();
    expect(result).to.be.an('object');
  });

  it('should be 2 total and no type', () => {
    const result = new CardSequence();
    result.addCards(['7 Spade']);
    result.addCards(['6 Spade']);
    expect(result.length).to.equal(2);
    expect(result.type).to.equal('');
  });

  it('should remove 6 Spade and satuan type', () => {
    const result = new CardSequence();
    result.addCards(['7 Spade']);
    result.addCards(['6 Spade']);
    const removed = result.removeCards([0])[0];
    expect(removed.displayName).to.be.equal('6 Spade');
    expect(result.type).to.equal('satuan');
  });

  it('should be royalflush type', () => {
    const result = new CardSequence();
    result.addCards(['10 Spade', 'K Spade', 'Q Spade', 'A Spade', 'J Spade']);
    expect(result.type).to.equal('royalflush');
  });

  it('should be straightflush type', () => {
    const result = new CardSequence();
    result.addCards(['10 Spade', 'K Spade', 'Q Spade', '9 Spade', 'J Spade']);
    expect(result.type).to.equal('straightflush');
  });

  it('should be tris type', () => {
    const result = new CardSequence();
    result.addCards(['10 Spade', '10 Diamond', '10 Heart']);
    expect(result.type).to.equal('tris');
  });

  it('should be pair type', () => {
    const result = new CardSequence();
    result.addCards(['7 Spade', '7 Heart']);
    expect(result.type).to.equal('pair');
  });

  it('should be straight type', () => {
    const result = new CardSequence();
    result.addCards(['10 Spade', 'K Spade', 'Q Club', '9 Spade', 'J Spade']);
    expect(result.type).to.equal('straight');
  });

  it('should be tris type', () => {
    const result = new CardSequence();
    result.addCards(['10 Spade', '10 Diamond', '10 Heart']);
    result.addCards(['5 Spade', '5 Diamond']);
    expect(result.type).to.equal('fullhouse');
  });

  it('should be bomb type', () => {
    const result = new CardSequence();
    result.addCards(['10 Spade', '10 Diamond', '10 Heart', '10 Club', 'K Spade']);
    expect(result.type).to.equal('bomb');
  });

  it('should be tris type', () => {
    const result = new CardSequence();
    result.addCards(['7 Spade', '7 Diamond', '9 Heart', 'J Club']);
    expect(result.type).to.equal('');
  });

  it('should be kabeh2 type', () => {
    const result = new CardSequence();
    result.addCards(['10 Spade', '10 Diamond', '10 Heart', '10 Club', 'K Spade', '2 Diamond', '2 Club', '2 Heart', '2 Spade']);
    expect(result.type).to.equal('kabeh2');
  });

  it('should be dragon type', () => {
    const result = new CardSequence();
    result.addCards(['10 Spade', 'K Spade', 'Q Club', '9 Spade', 'J Spade', 'A Club', '2 Diamond', '8 Diamond', '7 Club', '5 Diamond', '6 Heart', '4 Club', '3 Diamond']);
    expect(result.type).to.equal('dragon');
  });

  it('should still be 1 length', () => {
    const result = new CardSequence();
    result.addCards(['7 Spade']);
    result.addCards(['7 Spade']);
    result.addCards(['7 Spade']);
    expect(result.length).to.equal(1);
  });
});
