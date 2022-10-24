/* eslint-disable no-invalid-this */
import 'dotenv/config';
import axios from 'axios';
import chai from 'chai';
import { Builder, Capabilities, By, ThenableWebDriver, until } from 'selenium-webdriver';
import chaiAsPromised from 'chai-as-promised';
import { hasContainerElements } from './common-page-tests';
import { fail } from 'assert';

const baseUrl = process.env.SAUCE_APP_URL.replace(/\/$/, '');

const capabilities = Capabilities.chrome();

const mailhog = axios.create({ baseURL: `${process.env.MAILHOG_API}/api` });

const snooze = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

    describe('account page', function () {
      beforeEach(async function () {
        await driver.get(`${baseUrl}/account`);
      });

      describe('password reset flow', function () {
        beforeEach(async function () {
          await mailhog.delete('/v1/messages');
          const passwordButton = await driver.findElement(By.id('changePasswordButton'));
          await passwordButton.click();
          driver.wait(until.elementIsEnabled(passwordButton)); // wait until loading animation stopped
        });

        it('displays a confirmation alert', async function () {
          expect(driver.findElement(By.id('alertContainer')).getText()).to.eventually.match(
            /A link to reset your password/,
          );
        });

        describe('reset email flow', function () {
          let mail: any;

          beforeEach(async function () {
            mail = (await mailhog.get('/v2/messages')).data;

            let tries = 0;
            while (mail['items'].length == 0) {
              mail = (await mailhog.get('/v2/messages')).data;
              await snooze(100);
              tries++;
              if (tries > 20) fail();
            }
          });

          it('sends a reset email', async function () {
            expect(mail['items'][0]['Content']['Body']).to.match(/\/account\/reset\?id=/);
          });

          describe('password reset page', async function () {
            beforeEach(async function () {
              const text = mail['items'][0]['Content']['Body'];

              const [str, id, key] = /id=([A-Za-z0-9_-]{23})&key=([A-Za-z0-9_-]{23})/.exec(text);

              await driver.get(`${baseUrl}/account/reset?id=${id}&key=${key}`);
            });

            it('can be reached from reset email', async function () {
              expect(driver.findElement(By.linkText('Password Reset')).isDisplayed()).to.become(
                true,
              );
            });
            // TODO figure out how to test password reset without potentially breaking all the other
            // tests because the login credentials don't work anymore
          });
        });
      });
    });

    describe('minecraft page', function () {
      beforeEach(async function () {
        await driver.get(`${baseUrl}/minecraft`);
      });

      it('rejects empty input field', async function () {
        const addAccountButton = await driver.findElement(
          By.xpath('//*[@id="addAccountForm"]/button'),
        );
        await addAccountButton.click();
        const errorFeedback = await driver.wait(until.elementLocated(By.id('errorFeedback')));
        expect(errorFeedback.getText()).to.eventually.match(/Please provide a username./);
      });
    });
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
