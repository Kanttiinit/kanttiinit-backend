const express = require('express');
const models = require('../models');
const worker = require('../parser/worker');
const utils = require('./utils');
const ua = require('universal-analytics');

const visitor = ua(process.env.UA_ID);

const router = express.Router();

router.use((req, res, next) => {
  if (req.method === 'GET' && process.env.NODE_ENV !== 'production') {
    const fn = req.loggedIn ? console.log : (...args) => visitor.pageview(...args).send();

    fn({
      dh: 'https://kitchen.kanttiinit.fi/',
      dp: req.originalUrl,
      dt: 'API Hit',
      ua: req.get('User-Agent')
    }, function(err) {
      if (err) {
        console.error(err);
      }
    });
  }
  next();
});

router.use(require('./menus'));
router.use(require('./restaurantMenu'));

router.use(utils.createModelRouter({model: models.Favorite}));

router.use(
  utils.createModelRouter({
    model: models.Area,
    getListQuery(req) {
      return {
        include: [{model: models.Restaurant}]
      };
    }
  })
);

router.use(
  utils.createModelRouter({
    model: models.Restaurant,
    getListQuery(req) {
      if (req.query.location) {
        const [latitude, longitude] = req.query.location.split(',');
        return {
          query: `SELECT *,
          (point(:longitude, :latitude) <@> point(longitude, latitude)) * 1.61 as distance
          FROM restaurants ORDER BY distance;`,
          replacements: {latitude, longitude}
        };
      } else {
        return {
          include: req.loggedIn ? [{model: models.Area}] : [],
          order: [['AreaId', 'ASC'], ['name', 'ASC']]
        };
      }
    }
  })
);

module.exports = router
.post('/restaurants/update', utils.auth, (req, res) =>
  worker.updateAllRestaurants().then(_ => res.json({message: 'ok'}))
);
