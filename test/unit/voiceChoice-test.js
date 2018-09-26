'use strict';
const assert = require('chai').assert;
const vc = require('../../command/voiceChoice');

describe('voiceChoice', function() {
  describe('findVoice', function() {
    it('should return a language and meta for English', async () => {
      let voice = vc.findVoice('en');
      assert.equal(voice.meta, 'Matthew');
      assert.equal(voice.main, 'Salli');
    });
    it('should return a language and meta for French', async () => {
      let voice = vc.findVoice('fr');
      assert.equal(voice.meta, 'Mathieu');
      assert.equal(voice.main, 'Celine');
    });
    it('should return a language and meta for Danish', async () => {
      let voice = vc.findVoice('da');
      assert.equal(voice.meta, 'Mads');
      assert.equal(voice.main, 'Naja');
    });
    it('should return a language and meta for Dutch', async () => {
      let voice = vc.findVoice('nl');
      assert.equal(voice.meta, 'Ruben');
      assert.equal(voice.main, 'Lotte');
    });
    it('should return a language and meta for German', async () => {
      let voice = vc.findVoice('de');
      assert.equal(voice.meta, 'Vicki');
      assert.equal(voice.main, 'Hans');
    });
    it('should return a language and meta for Icelandic', async () => {
      let voice = vc.findVoice('is');
      assert.equal(voice.meta, 'Karl');
      assert.equal(voice.main, 'Dora');
    });
    it('should return a language and meta for Italian', async () => {
      let voice = vc.findVoice('it');
      assert.equal(voice.meta, 'Carla');
      assert.equal(voice.main, 'Giorgio');
    });
    it('should return a language and meta for Japanese', async () => {
      let voice = vc.findVoice('ja');
      assert.equal(voice.meta, 'Mizuki');
      assert.equal(voice.main, 'Takumi');
    });
    it('should return a language and meta for Korean', async () => {
      let voice = vc.findVoice('ko');
      assert.equal(voice.meta, 'Seoyeon');
      assert.equal(voice.main, 'Seoyeon');
    });
    it('should return a language and meta for Norwegian', async () => {
      let voice = vc.findVoice('nb');
      assert.equal(voice.meta, 'Liv');
      assert.equal(voice.main, 'Liv');
    });
    it('should return a language and meta for Polish', async () => {
      let voice = vc.findVoice('pl');
      assert.equal(voice.meta, 'Maja');
      assert.equal(voice.main, 'Jacek');
    });
    it('should return a language and meta for Portugese', async () => {
      let voice = vc.findVoice('pt');
      assert.equal(voice.meta, 'Ricardo');
      assert.equal(voice.main, 'Ricardo');
    });
    it('should return a language and meta for Romanian', async () => {
      let voice = vc.findVoice('ro');
      assert.equal(voice.meta, 'Carmen');
      assert.equal(voice.main, 'Carmen');
    });
    it('should return a language and meta for Russian', async () => {
      let voice = vc.findVoice('ru');
      assert.equal(voice.meta, 'Tatyana');
      assert.equal(voice.main, 'Maxim');
    });
    it('should return a language and meta for Spanish', async () => {
      let voice = vc.findVoice('es');
      assert.equal(voice.meta, 'Penélope');
      assert.equal(voice.main, 'Miguel');
    });
    it('should return a language and meta for Swedish', async () => {
      let voice = vc.findVoice('sv');
      assert.equal(voice.meta, 'Astrid');
      assert.equal(voice.main, 'Astrid');
    });
    it('should return a language and meta for Turkish', async () => {
      let voice = vc.findVoice('tr');
      assert.equal(voice.meta, 'Filiz');
      assert.equal(voice.main, 'Filiz');
    });
    it('should return a language and meta for Welsh', async () => {
      let voice = vc.findVoice('cy');
      assert.equal(voice.meta, 'Gwyneth');
      assert.equal(voice.main, 'Gwyneth');
    });
    it('should return a empty for empty language', async () => {
      let voice = vc.findVoice('');
      assert.equal(voice.meta, '');
      assert.equal(voice.main, '');
    });
    it('should return a empty for null language', async () => {
      let voice = vc.findVoice(null);
      assert.equal(voice.meta, '');
      assert.equal(voice.main, '');
    });
    it('should return a empty for unrecognized language', async () => {
      let voice = vc.findVoice('xqy');
      assert.equal(voice.meta, '');
      assert.equal(voice.main, '');
    });
  });
});
