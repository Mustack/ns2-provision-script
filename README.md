I made this script to automate creating and destroying a Natural Selection 2 server on Digital Ocean.

To run (requires node):

```
npm install
cp secrets-template.json secrets.json
[fill in your own data in secrets.json]
node ./index.js [hoursUntilDelete]
```
