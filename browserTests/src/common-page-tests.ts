/* eslint-disable no-invalid-this */
import { By, ThenableWebDriver } from 'selenium-webdriver';

// eslint-disable-next-line valid-jsdoc
/**
 *
 */

export function hasContainerElements(
  mode: 'anon' | 'user' | 'admin',
  noNavbar?: boolean,
  noFooter?: boolean,
) {
  // from test context
  describe('container elements', function () {
    let expect: Chai.ExpectStatic;
    let driver: ThenableWebDriver;
    this.timeout(30000); // 30 seconds

    beforeEach(function () {
      expect = this.expect;
      driver = this.driver;
    });
    if (!noNavbar) {
      describe('navbar', () => {
        it('exists', async () => {
          const navBarIsThere = driver.findElement(By.className('navbar')).isDisplayed();
          return expect(navBarIsThere).to.eventually.equal(true);
        });

        it('has link to documentation', async () => {
          const docLink = driver.findElement(By.linkText('Documentation'));
          return expect(docLink.getAttribute('href')).to.eventually.match(/\/docs$/);
        });

        if (mode === 'anon') {
          it('does not have links besides documentation', async () => {
            const navbarList = driver.findElement(By.className('navbar-nav'));
            const children = await navbarList.findElements(By.xpath('*'));
            expect(children).to.have.lengthOf(2);
          });
        }

        if (mode === 'user' || mode === 'admin') {
          it('has sign-out link', async () => {
            const signOut = driver
              .findElement(By.className('navbar-nav'))
              .findElement(By.linkText('Sign Out'));
            return expect(signOut.getAttribute('href')).to.eventually.match(/\/logout$/);
          });

          it('has account options link', async () => {
            await driver
              .findElement(By.className('navbar-nav'))
              .findElement(By.linkText('Services'))
              .click();
            const accountLink = driver
              .findElement(By.className('navbar-nav'))
              .findElement(By.linkText('Account Options'));
            return expect(accountLink.getAttribute('href')).to.eventually.match(/\/account$/);
          });

          it('has mailing lists link', async () => {
            await driver
              .findElement(By.className('navbar-nav'))
              .findElement(By.linkText('Services'))
              .click();
            const mailingLink = driver
              .findElement(By.className('navbar-nav'))
              .findElement(By.linkText('Mailing Lists'));
            return expect(mailingLink.getAttribute('href')).to.eventually.match(/\/lists$/);
          });

          it('has minecraft link', async () => {
            await driver
              .findElement(By.className('navbar-nav'))
              .findElement(By.linkText('Services'))
              .click();
            const minecraftLink = driver
              .findElement(By.className('navbar-nav'))
              .findElement(By.linkText('Minecraft Server'));
            return expect(minecraftLink.getAttribute('href')).to.eventually.match(/\/minecraft$/);
          });
        }

        if (mode === 'admin') {
          it('has link to admin page', async () => {
            const adminLink = driver
              .findElement(By.className('navbar-nav'))
              .findElement(By.linkText('Admin'));
            return expect(adminLink.getAttribute('href')).to.eventually.match(/\/admin$/);
          });
        } else {
          it('does not have link to admin page', async () => {
            const adminElements = driver
              .findElement(By.className('navbar-nav'))
              .findElements(By.linkText('Admin'));
            return expect(adminElements).to.eventually.have.lengthOf(0);
          });
        }
      });
    }
    if (!noFooter) {
      describe('footer', () => {
        it('exists', async () => {
          const footerIsThere = driver.findElement(By.className('footer')).isDisplayed();
          return expect(footerIsThere).to.eventually.equal(true);
        });

        it('has correct text', async () => {
          const footerText = driver.findElement(By.className('footer')).getText();
          const year = new Date().getFullYear();
          return expect(footerText).to.eventually.equal(
            `© ${year} Swarthmore College Computer Society | Usage & Data Policy | Problems with this website? Email staff@sccs.swarthmore.edu.`,
          );
        });
      });
    }
  });
}
