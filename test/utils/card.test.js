const { expect } = require('chai');
const { baseDeck, paket, Card } = require('../../utils/card');


describe('Cards Initialization', () => {
  describe('baseDeck', () => {
    it('should be an object', () => {
      expect(baseDeck).to.be.an('object');
    });

    it('should be 52 total', () => {
      expect(Object.keys(baseDeck).length).to.equal(52);
    });

    it('should equal to 0', () => {
      expect(baseDeck['3 Diamond']).to.equal(0);
    });
  });

  describe('paket', () => {
    it('should be an object', () => {
      expect(paket).to.be.an('object');
    });

    it('should be 8 total', () => {
      expect(Object.keys(paket).length).to.equal(8);
    });
  });

  describe('Card Class', () => {
    const result = new Card('5 Spade');
    it('should be an object', () => {
      expect(result).to.be.an('object');
    });

    it('should have value 5', () => {
      expect(result.number).to.equal('5');
    });

    it('should have spade face', () => {
      expect(result.face).to.equal('Spade');
    });
  });
});
