import 'dotenv/config';
import chai from 'chai';
import { Builder, Capabilities, By } from 'selenium-webdriver';
import chaiAsPromised from 'chai-as-promised';
import { fail } from 'assert';

const capabilities = Capabilities.chrome();

describe('Sauce Website', () => {
  let expect: Chai.ExpectStatic;
  before(function () {
    chai.use(chaiAsPromised);
    expect = chai.expect;
  });

  it('has a navbar', async () => {
    const driver = new Builder()
      .usingServer(process.env.SELENIUM_SERVER)
      .withCapabilities(capabilities)
      .build();
    try {
      await driver.get(process.env.SAUCE_APP_URL);
      const navbarIsThere = await (await driver.findElement(By.className('navbar'))).isDisplayed();
      expect(navbarIsThere).to.be.true;
    } finally {
      await driver.quit();
    }
  });
});
