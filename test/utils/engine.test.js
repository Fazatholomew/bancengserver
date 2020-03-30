const { expect } = require('chai');
const { compare } = require('../../utils/engine');
const { CardSequence } = require('../../utils/cardSequence');

describe('Engine Run', () => {
  describe('compare', () => {
    it('7 Spade vs 6 Spade, hand should lose', () => {
      const table = new CardSequence();
      table.addCards(['7 Spade']);
      const hand = new CardSequence();
      hand.addCards(['6 Spade']);
      expect(compare(table, hand)).to.be.equal(false);
    });

    it('Straight vs Straightflush, hand should win', () => {
      const table = new CardSequence();
      table.addCards(['10 Spade', 'K Spade', 'Q Club', '9 Spade', 'J Spade']);
      const hand = new CardSequence();
      hand.addCards(['10 Spade', 'K Spade', 'Q Spade', '9 Spade', 'J Spade']);
      expect(compare(table, hand)).to.be.equal(true);
    });

    it('flush with 2 vs flush, hand should win', () => {
      const table = new CardSequence();
      table.addCards(['10 Spade', 'A Spade', 'Q Spade', '9 Spade', '2 Spade']);
      const hand = new CardSequence();
      hand.addCards(['10 Spade', 'K Spade', 'Q Spade', '9 Spade', '2 Spade']);
      expect(compare(table, hand)).to.be.equal(true);
    });

    it('fullhouse 2 vs fullhouse, hand should win', () => {
      const table = new CardSequence();
      table.addCards(['2 Spade', '2 Diamond', 'Q Spade', 'Q Diamond', '2 Club']);
      const hand = new CardSequence();
      hand.addCards(['3 Spade', '3 Diamond', 'Q Spade', 'Q Diamond', '3 Club']);
      expect(compare(table, hand)).to.be.equal(true);
    });

    it('pair 2 with spade vs pair 2, hand should lose', () => {
      const table = new CardSequence();
      table.addCards(['2 Spade', '2 Diamond']);
      const hand = new CardSequence();
      hand.addCards(['2 Heart', '2 Club']);
      expect(compare(table, hand)).to.be.equal(false);
    });
  });
});
