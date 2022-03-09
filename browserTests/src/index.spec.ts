/* eslint-disable no-invalid-this */
import 'dotenv/config';
import chai from 'chai';
import { Builder, Capabilities, By, ThenableWebDriver } from 'selenium-webdriver';
import chaiAsPromised from 'chai-as-promised';
import { hasContainerElements } from './common-page-tests';

const baseUrl = process.env.SAUCE_APP_URL.replace(/\/$/, '');

const capabilities = Capabilities.chrome();

describe('SAUCE', () => {
  let expect: Chai.ExpectStatic;
  let driver: ThenableWebDriver;

  before(function () {
    chai.use(chaiAsPromised);
    expect = chai.expect;
    this.expect = expect;
  });

  beforeEach(function () {
    driver = new Builder()
      .usingServer(process.env.SELENIUM_SERVER)
      .withCapabilities(capabilities)
      .build();
    this.driver = driver;
  });

  afterEach(async function () {
    await driver.quit();
  });

  describe('homepage', function () {
    beforeEach(async function () {
      await driver.get(baseUrl);
    });

    hasContainerElements('anon');

    it('has a create account button', async () => {
      const createAccount = await driver.findElement(By.partialLinkText('Get My SCCS Account'));
      return expect(createAccount.getAttribute('href')).to.eventually.match(/\/account\/create$/);
    });

    it('has a sign in button', async () => {
      const signIn = await driver.findElement(By.partialLinkText('Sign In'));
      return expect(signIn.getAttribute('href')).to.eventually.match(/\/login$/);
    });
  });

  describe('login', function () {
    beforeEach(async function () {
      await driver.get(`${baseUrl}/login`);
    });

    hasContainerElements('anon', true);

    it('accepts correct credentials', async () => {
      await driver.findElement(By.id('usernameInput')).sendKeys('testuser');
      await driver.findElement(By.id('passwordInput')).sendKeys('test');
      await driver.findElement(By.className('btn-large')).click();

      // we should now be on the logged-in page
      const header = driver.findElement(By.className('display-1'));
      return expect(header.getText()).to.eventually.equal('SCCS Dashboard');
    });

    it('rejects bad credentials', async () => {
      await driver.findElement(By.id('usernameInput')).sendKeys('testuser');
      await driver.findElement(By.id('passwordInput')).sendKeys('badpassword');
      await driver.findElement(By.className('btn-large')).click();

      const errorText = await driver.findElement(By.className('text-danger')).getText();

      return expect(errorText).to.equal(
        "That username and password combination doesn't match any SCCS account on file.",
      );
    });
  });

  describe('documentation', function () {
    beforeEach(async function () {
      await driver.get(`${baseUrl}/docs`);
    });

    hasContainerElements('anon');
  });

  describe('logged in as normal user', function () {
    beforeEach(async function () {
      await this.driver.get(`${baseUrl}/login`);
      await this.driver.findElement(By.id('usernameInput')).sendKeys('testuser');
      await this.driver.findElement(By.id('passwordInput')).sendKeys('test');
      await this.driver.findElement(By.className('btn-large')).click();
    });

    hasContainerElements('user');
  });

  describe('logged in as admin', function () {
    beforeEach(async function () {
      await this.driver.get(`${baseUrl}/login`);
      await this.driver.findElement(By.id('usernameInput')).sendKeys('testadmin');
      await this.driver.findElement(By.id('passwordInput')).sendKeys('test');
      await this.driver.findElement(By.className('btn-large')).click();
    });

    hasContainerElements('admin');
  });
});
