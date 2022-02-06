import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import sinon, { SinonSandbox } from 'sinon';
import sinonChai from 'sinon-chai';
import * as ctrl from '../src/controllers/minecraftController';
import { HttpException } from '../src/error/httpException';
import * as localAgent from '../src/integration/localAgent';
import * as minecraftApi from '../src/integration/minecraftApi';
import { MinecraftWhitelistModel } from '../src/integration/models';
import { initMongo } from '../src/integration/mongo';

//
describe('minecraftController', function () {
  let sandbox: SinonSandbox;
  let expect: Chai.ExpectStatic;
  let getMinecraftUser: sinon.SinonStub;
  let mongoServer: MongoMemoryServer;

  const minecraftExample = {
    uuid: 'mc-uuid-1',
    username: 'mcUser1',
  };

  const dbExample = {
    _id: 'ldap-uuid-1',
    mcUuid: 'mc-uuid-1',
  };

  before(async function () {
    sandbox = sinon.createSandbox();
    chai.use(chaiAsPromised);
    chai.use(sinonChai);
    expect = chai.expect;

    mongoServer = await MongoMemoryServer.create();

    await mongoServer.ensureInstance();
    await initMongo(mongoServer.getUri());
  });

  beforeEach(async function () {
    sandbox.restore();

    getMinecraftUser = sandbox.stub(minecraftApi, 'getMinecraftUser');
    getMinecraftUser.withArgs('mc-uuid-1').resolves(minecraftExample);
    getMinecraftUser.withArgs('mc-uuid-null').resolves(null);

    // clear the collection
    await MinecraftWhitelistModel.deleteMany({}).exec();
  });

  after(async function () {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('getMcForLdapUser', function () {
    it('gets minecraft UUID when in database', async function () {
      await new MinecraftWhitelistModel(dbExample).save();

      return expect(ctrl.getMcForLdapUser('ldap-uuid-1')).to.eventually.equal(minecraftExample);
    });

    it('returns null for IDs not in database', function () {
      return expect(ctrl.getMcForLdapUser('ldap-uuid-1')).to.eventually.be.null;
    });

    it('returns null when minecraft UUID is invalid', async function () {
      await new MinecraftWhitelistModel(dbExample).save();

      return expect(ctrl.getMcForLdapUser('ldap-uuid-2')).to.eventually.be.null;
    });
  });

  describe('associateMcWithLdap', function () {
    it('saves minecraft account to database', async function () {
      sandbox.stub(localAgent, 'whitelistMinecraftUser');

      await ctrl.associateMcWithLdap('ldap-uuid-1', 'mc-uuid-1');

      expect(await MinecraftWhitelistModel.findById('ldap-uuid-1')).to.have.property(
        'mcUuid',
        'mc-uuid-1',
      );
    });

    it('whitelists valid minecraft account', async function () {
      const whitelistMinecraftUser = sandbox.stub(localAgent, 'whitelistMinecraftUser');

      await ctrl.associateMcWithLdap('ldap-uuid-1', 'mc-uuid-1');

      expect(whitelistMinecraftUser).to.have.been.calledOnceWith('mc-uuid-1');
    });

    it('fails when minecraft account doesnt exist', function () {
      return expect(
        ctrl.associateMcWithLdap('ldap-uuid-1', 'mc-uuid-null'),
      ).to.eventually.be.rejectedWith(
        HttpException,
        "mc-uuid-null isn't a valid Minecraft account",
      );
    });

    it('fails when minecraft account is linked to another account', async function () {
      await new MinecraftWhitelistModel(dbExample).save();

      return expect(
        ctrl.associateMcWithLdap('ldap-uuid-2', 'mc-uuid-1'),
      ).to.eventually.be.rejectedWith(
        HttpException,
        'mc-uuid-1 is already linked with another user',
      );
    });
  });

  describe('removeMcAccount', function () {
    it('removes minecraft account', async function () {
      await new MinecraftWhitelistModel(dbExample).save();

      const unWhitelistMinecraftUser = sandbox.stub(localAgent, 'unWhitelistMinecraftUser');

      await ctrl.removeMcAccount('ldap-uuid-1');

      expect(unWhitelistMinecraftUser).to.have.been.calledOnceWith('mc-uuid-1');
      expect(await MinecraftWhitelistModel.findById('ldap-uuid-1')).to.be.null;
    });

    it('does nothing if no account was connected', async function () {
      const unWhitelistMinecraftUser = sandbox.stub(localAgent, 'unWhitelistMinecraftUser');

      await ctrl.removeMcAccount('ldap-uuid-1');

      expect(unWhitelistMinecraftUser).to.not.have.been.called;
    });
  });
});
