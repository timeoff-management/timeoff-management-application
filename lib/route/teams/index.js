 
"use strict";

const
  express = require('express'),
  router = express.Router(),
  validator = require('validator'),
  Promise   = require('bluebird'),
  moment    = require('moment'),
  Exception           = require('../../error')

router.all(/.*/, require('../../middleware/ensure_user_is_admin'));

router.get('/', function(req, res) {
    const tribes = [
        {id: 1, name: 'Green Owl'},
        {id: 2, name: 'Rogue Squad'}
    ]
    req.user
    .get_company_for_add_user()
    .then(function(company) {
        res.render('team_add', {
            company: company,
            teams: [
                {
                    id: 1,
                    name: 'benchWarmers',
                    users: [{id: 1}, {id: 2 }, {id: 3}],
                    client: {id: 1, name: 'Fruitful' },
                    tribe: {id: 1, name: 'Green Owl'}
                },
                {
                    id: 2,
                    name: 'Lazuli',
                    users: [{id: 4}, {id: 5 }],
                    client: {id: 2, name: 'Internal' },
                    tribe: {id: 2, name: 'Green Owl'}
                }
            ],
            tribes: tribes
        })
    })
})

module.exports = router;
