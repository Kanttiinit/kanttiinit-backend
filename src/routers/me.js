import express from 'express';
import _ from 'lodash';
import parseUser from '../utils/parseUser';
import {validate} from 'jsonschema';
import schema from '../../schema/preferences.json';

export default express.Router()
.get('/login', parseUser)
.use((req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    next({code: 401, message: 'Unauthorized.'});
  }
})
.get('/', (req, res) => {
  res.json(_.pick(req.user, ['email', 'displayName', 'preferences', 'photo', 'admin']));
})
.put('/preferences', (req, res, next) => {
  try {
    const preferences = req.body;
    const validationResult = validate(preferences, schema);
    if (validationResult.errors.length) {
      next({code: 400, message: validationResult.errors[0].stack});
    } else {
      req.user.update({
        preferences: Object.assign({}, req.user.preferences, preferences)
      })
      .then(() => res.json({message: 'Preferences saved.'}));
    }
  } catch(e) {
    next({code: 400, message: 'Unknown preference.'});
  }
});
