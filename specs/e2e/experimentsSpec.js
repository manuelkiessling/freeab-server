describe('Creating an experiment', function() {

  beforeEach(function() {
    // The homepage is not an Angular app, thus we don't wait for one to load
    return browser.ignoreSynchronization = true;
  });

  it('should return an experimentId', function() {
    var page = browser.driver.post('http://localhost:8080/api/experiments/');
    // tbc
  });

});
