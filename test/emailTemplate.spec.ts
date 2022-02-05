import fs from 'fs';
import sinon, { SinonSandbox } from 'sinon';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { generateEmail } from '../src/util/emailTemplates';

describe('emailTemplate', function () {
  let sandbox: SinonSandbox;
  let expect: Chai.ExpectStatic;
  let readFile: sinon.SinonStub;

  describe('generateEmail', function () {
    before(function () {
      sandbox = sinon.createSandbox();
      chai.use(chaiAsPromised);
      expect = chai.expect;
    });

    beforeEach(function () {
      sandbox.restore();
      readFile = sandbox.stub(fs, 'readFile');
      readFile
        .withArgs('emailTemplates/template1', sinon.match.any)
        .yields(null, Buffer.from('template1: ${param1}', 'utf-8'));

      readFile
        .withArgs('emailTemplates/template2', sinon.match.any)
        .yields(null, Buffer.from('template2: ${param1} text ${param2}', 'utf-8'));

      readFile.withArgs('emailTemplates/badFile', sinon.match.any).yields('bad times', null);
    });

    it('generates single-parameter templates', async function () {
      const result = await generateEmail('template1', { param1: 'foo' });
      return expect(result).to.equal('template1: foo');
    });

    it('generates multi-parameter templates', async function () {
      const result = await generateEmail('template2', { param1: 'foo', param2: 'bar' });
      return expect(result).to.equal('template2: foo text bar');
    });

    it('fails with missing parameters', async function () {
      // const result = await generateEmail('template2', { param1: 'foo' })
      return expect(generateEmail('template2', { param1: 'foo' })).to.eventually.be.rejectedWith(
        Error,
        'No value provided for param2',
      );
    });

    it('handles filesystem errors', function () {
      return expect(generateEmail('badFile', { param1: 'foo' })).to.eventually.be.rejectedWith(
        'bad times',
      );
    });
  });
});
