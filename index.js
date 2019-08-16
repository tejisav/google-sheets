const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const {google} = require('googleapis');

app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');

const oauth2Client = new google.auth.OAuth2(
  "299220479234-vrod0ho7lqal80ghm94l3vjhf4fml2j3.apps.googleusercontent.com",
  "6gKrWJ5LvSlDqmDmtZL0BwNt",
  "http://localhost:3000/createNewSurvey"
);

const scopes = [
  'https://www.googleapis.com/auth/drive'
];

let storedSurveys = new Map();
let code = null;

app.get('/', (req, res) => {
  return res.render('pages/index', { surveys: storedSurveys });
});

app.get('/survey', (req, res) => {

  if (!req.query.id) {
    return res.render('pages/index', { surveys: storedSurveys });
  }

  const id = req.query.id

  oauth2Client.setCredentials(storedSurveys.get(id).token);

  const sheets = google.sheets( {version: 'v4', auth: oauth2Client} );
  
  let request = {
    spreadsheetId: id,
    ranges: [],
    includeGridData: false,
    auth: oauth2Client,
  };

  sheets.spreadsheets.get(request, function(err, response) {
    if (err) {
      console.error(err);
      return res.render('pages/index', { surveys: storedSurveys });
    }
    
    const survey = [
      { name: response.data['properties']['title'] , id: response.data['spreadsheetId'] },
    ];
    
    return res.render('pages/survey', { data: survey } );
  });

});

app.post('/createSurvey', (req, res) => {
  const name = req.body.name;

  oauth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error(err);
      return res.render('pages/index', { surveys: storedSurveys });
    }
    oauth2Client.setCredentials(token);

    const sheets = google.sheets( {version: 'v4', auth: oauth2Client} );
    const resource = {
      properties: {
        title: name,
      },
    };
    sheets.spreadsheets.create({
      resource,
      fields: 'spreadsheetId',
    }, (err, spreadsheet) =>{
      if (err) {
        console.log(err);
        return res.render('pages/index', { surveys: storedSurveys });
      } else {

        let spreadsheetId = spreadsheet.data['spreadsheetId'];
        let range = "A1:A3";
        let valueInputOption = "RAW";
        let values = [
          [
            "Name","Age","Shoe Size"
          ],
        ];
        let resource = {
          values,
        };
        sheets.spreadsheets.values.append({
          spreadsheetId,
          range,
          valueInputOption,
          resource,
        }, (err, result) => {
          if (err) {
            console.log(err);
            return res.render('pages/index', { surveys: storedSurveys });
          } else {

            storedSurveys.set(result.data['spreadsheetId'], {auth: oauth2Client, name: name, token: token});
            code = null;

            return res.render('pages/index', { surveys: storedSurveys });
          }
        });
      }
    });
  });
});

app.get('/createNewSurvey', (req, res) => {
    if(!req.query.code){
      return res.render('pages/index', { surveys: storedSurveys });
    }else{
      code = req.query.code;
      return res.render('pages/createSurvey');
    }
});

app.get('/authenticate', (req, res) => {

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });

  return res.redirect(authUrl);
});

app.post('/submitSurvey', function(req, res) {
  const id = req.body.id;
  const name = req.body.name;

  oauth2Client.setCredentials(storedSurveys.get(id).token);

  const sheets = google.sheets( {version: 'v4', auth: oauth2Client} );
  let range = "Sheet1";
  let valueInputOption = "RAW";
  let values = [
    [
      req.body.name,
      req.body.age,
      req.body.size
    ],
  ];
  let resource = {
    values,
  };
  sheets.spreadsheets.values.append({
    spreadsheetId: id,
    range,
    valueInputOption,
    resource,
  }, (err, result) => {
    if (err) {
      console.log(err);
      return res.render('pages/index', { surveys: storedSurveys });
    } else {
      data = [ {id : result.data.spreadsheetId, name: name} ];
      return res.render('pages/success', {data: data});
    }
  });
});

app.listen(port, () => console.log(`> Ready on http://localhost:${port}`))