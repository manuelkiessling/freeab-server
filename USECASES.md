# Create new experiment

## Request

    POST /experiments/

## Request body: A multilevel associative array, encoded as JSON

    {
      "name": "Checkout page buttons",
      "scope": 50.0,
      "variations": {
        "Group A": {
          "weight": 70.0,
          "params": {
              "button-color": "#ff99ee",
              "show-note": false,
              "increase-price-by": 4.00
          }
        },
        "Group B": {
          "weight": 30.0,
          "params": {
            "button-color": "#00ffaa",
            "show-note": true,
            "increase-price-by": 2.00
          }
        }
      }
    }


### name: `string`

Name of experiment. Must be unique.

    Checkout page buttons


### scope: `float`

Scope of this experiment - what percentage of all site visitors should participate in this experiment?

    50.0


### variations: `object`

An associative array describing each variation within this experiment.

    {
      "Group A": {
        "weight": 70.0,
        "params": {
            "button-color": "#ff99ee",
            "show-note": false,
            "increase-price-by": 4.00
        }
      },
      "Group B": {
        "weight": 30.0,
        "params": {
          "button-color": "#00ffaa",
          "show-note": true,
          "increase-price-by": 2.00
        }
      }
    }


#### Key `string`

The key for a variation is a string.

    Group A


#### weight: `float`

What percentage of all experiment participators should be mapped onto this variation?
The sum of all variation"s weights must be 100.0.

    70.0


#### params: `object`

An associative array of with whatever key-value pairs you want. These are to be used by your
backend and/or frontend code to decide what to change in the user experience.

    {
      "button-color": "#00ffaa",
      "show-note": true,
      "increase-price-by": 2.00
    }


## Response

### On success:

    {
      "status": "success",
      "experimentId": 12345
    }


### On error:

    {
      "status": "failure",
      "reason": "This is what went wrong..."
    }


# Make a new participant known to the freeAB system

## Request

    POST /participants/


## Response

### On success:

    {
      "status": "success",
      "participantId": "da39a3ee5e6b4b0d3255bfef95601890afd80709"
    }


### On error:

    {
      "status": "failure",
      "reason": "This is what went wrong..."
    }

You must associate this id with the participant. If your participants are web users, you might want to store
the id as a cookie. Do not create a new identifier for a participant that already has an id - for known participants, simply
request decisionsets.


# Request experiment data for a known participant

## Request

    GET /participants/<id>/decisionsets/

## Response

### On success, if participant is part of any experiments:

    {
      "status": "success",
      "decisionsets": {
        "Checkout page buttons": {
            "variation": "Group A",
            "params": {
              "button-color": "#ff99ee",
              "show-note": false,
              "increase-price-by": 4.00
          }
        },
        "Homepage teaser": {
            "variation": "Group C",
            "params": {
              "teaser-id": 5,
              "skip-second-step": true
          }
        }
      }
    }

### On success, if participant is not part of any experiments:

    {
      "status": "success",
      "decisionsets": null
    }


### On error:

    {
      "status": "failure",
      "reason": "This is what went wrong..."
    }

What you receive here is all the information that is needed to alter your UI or process for this specific participant.

If this participant has not been mapped into any experiments, you simply do nothing. If he/she has been mapped, you can
react to this, either in your frontend, your backend, or both.


# Usage

For example, in your PHP request controller you could do this to route your user according to an experiment:

    <?php

    $abtestUserId = $_COOKIE['abtest_userid']; // or wherever you decided to store the FreeAB user ID

    if ($abtestUserId === null) { // User is not yet managed by AB test system
      $abtestHandler = new FreeabHandler();
      $abtestUserId = $abtestHandler->addUser();
      setcookie('abtest_userid', $abtestUserId);
    }

    $abtestUser = new FreeabUser($abtestUserId);

    if ($abtestUser->isPartOfExperiment('Homepage Teaser')) {

      $abtestSettings = $abtestUser->getSettingsForExperiment('Homepage Teaser');

      if ($abtestSettings->get('skip-second-step') === true) {
        $response->redirect("/step3.php");
      } else {
        $response->redirect("/step2.php");
      }
    }

    ?>


Or, in your JavaScript frontend, you could do this:

    var handleAbtest = function(abtestUserId) {
      new FreeabUser(abtestUserId).then(function(abtestUser) {

        if (abtestUser.isPartOfExperiment('Checkout page buttons')) {

          var abtestSettings = abtestUser.getSettingsForExperiment('Checkout page buttons');

          if (abtestSettings.get('show-note') === false) {
            $('#note-element').hide();
          }

          $('#sale-button').style('color', abtestSettings.get('button-color'));
        }

      });
    }

    var abtestUserId = ...; // read from cookie or other source

    if (abtestUserId === null) { // User is not yet managed by AB test system
      var abtestHandler = new FreeabHandler();
      abtestHandler.addUser().then(function(abtestUserId) {
        // Store abtestUserId in cookie or elsewhere
        handleAbtest(abtestUserId);
      });
    } else {
      handleAbtest(abtestUserId);
    }
