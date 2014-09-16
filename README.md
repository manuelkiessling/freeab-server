# Create new experiment

## Request

    POST /experiments/

You must authenticate for this request by adding a 'x-api-key' header with a valid API key.

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
      "error": {
        "type": HTTP status code
        "message": "Message for status code",
        "detail": "Some details"
      }
    }


# Make a new participant known to the freeAB system

## Request

    POST /participants/


## Response

### On success:

    {
      "status": "success",
      "participantHash": "ade10f256b5dd91d75190ed9168f90866b403d7166d5154817b4ab0cad084316"
    }


### On error:

    {
      "error": {
        "type": HTTP status code
        "message": "Message for status code",
        "detail": "Some details"
      }
    }

You must associate this hash with the participant. If your participants are web users, you might want to store
the hash as a cookie. Do not create a new identifier for a participant that already has a hash - for known participants,
simply request decisionsets.


# Request experiment data for a known participant

## Request

    GET /participants/<participantHash>

## Response

### On success, if participant is part of one or more experiments:

    {
      "status": "success",
      "decisionsets":
      [
        {
          "experimentName": "Checkout page buttons",
          "variationName": "Group B",
          "params": {
            "button-color": "#ff99ee",
            "show-note": false,
            "increase-price-by": 4.00
          }
        },
        {
          "experimentName": "Homepage Test 2014-09",
          "variationName": "Group A",
          "params": {
            "teaser-id": "hfuz734"
          }
        }
      ]
      "trackingidentifiers":
      [
        "freeab_checkout-page-buttons_group-b"
      ]
    }

### On success, if participant is not part of any experiments:

    {
      "status": "success",
      "decisionsets": []
    }


### On error:

    {
      "error": {
        "type": HTTP status code
        "message": "Message for status code",
        "detail": "Some details"
      }
    }

What you receive here is all the information that is needed to alter your UI or process for this specific participant.

If this participant has not been mapped into any experiments, you simply do nothing. If he/she has been mapped, you can
react to this, either in your frontend, your backend, or both.


# Usage

## In the browser

Put the freeab JS into your page, before the closing head tag:

    <script>
    /* Change this according to your needs */
    var freeabServerAddress = 'http://freeab.example.com';

    /* Do not change code below this line */
    window.freeabParticipant = {};
    window.freeabParticipantListeners = [];
    window.freeabParticipant.on = function(event, callback) {
      window.freeabParticipantListeners.push(callback);
    };
    document.write('<scr' + 'ipt async src="http://' + freeabServerAddress + '/client.js"><\/sc' + 'ript>');
    </script>

Now you can manipulate your DOM like this:

    window.freeabParticipant.on('ready', function() {
      if (window.freeabParticipant.isPartOfExperiment('My fine experiment')) {
        var params = window.freeabParticipant.getParamsForExperiment('My fine experiment');
        document.getElementById('foo').textContent = params['text'];
      }
    });
