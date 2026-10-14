# Sa'adah Islamic Academy Portal

This project now includes a lightweight local database layer that lets the portal store and retrieve school records in the browser.

## Demo login credentials

- Parent login: phone `08012345678`, code `123456`
- Teacher login: staff ID `STF-001`, code `123456`
- Admin dashboard: accessible as the school owner account in the portal

## How it works

- The portal loads `portal-db.js` before the main dashboard code.
- That file creates the `claude.use('db')` and `claude.use('user')` objects expected by the portal.
- Data is stored in browser local storage so it persists between visits on the same device.

## Open the project

Open `Sa'adah Islamic Academy.html` in a browser to use the school portal.
