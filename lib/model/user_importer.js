
"use strict";

const
  Joi = require('joi'),
  uuid      = require('node-uuid'),
  Promise = require('bluebird'),
  _ = require('underscore'),
  Exception           = require('../error'),
  Models = require('./db');

const add_user_interface_schema = Joi.object().required().keys({
    email         : Joi.string().email(),
    lastname      : Joi.string(),
    name          : Joi.string(),
    company_id    : Joi.number().integer().positive(),
    department_id : Joi.number().integer().positive(),

    start_date   : Joi.string().optional(),
    end_date     : Joi.string().default(null).allow(null),
    admin        : Joi.boolean().default(false),
    auto_approve : Joi.boolean().default(false),
    password     : Joi.string().default(() => uuid.v4, 'Populate defaul password'),
  });


function add_user(args) {
  let validate_args = Joi.validate(args, add_user_interface_schema);

  if (validate_args.error) {
    console.log('An error occured when validatin parameters for add_user: ');
    console.dir(validate_args);
    Exception.throw_user_error({
      system_error : 'Failed to add new due to validation errors',
      user_error : 'Failed to add user',
    });
  }

  let attributes = {};

  attributes.email        = args.email;
  attributes.lastname     = args.lastname;
  attributes.name         = args.name;
  attributes.companyId    = args.company_id;
  attributes.DepartmentId = args.department_id;

  attributes.password     = Models.User.hashify_password(args.password);
  attributes.admin        = args.admin;
  attributes.auto_approve = args.auto_approve;
  attributes.end_date     = args.end_date;

  // Pass start date inky if it is set, otherwise rely on database to use
  // default value
  if (args.start_date) {
    attributes.start_date = args.start_date;
  }

  return Promise.resolve()

    // Ensure given department ID is owned by given company ID
    .then(() => Models.Department
      .findOne({
        where : { id : args.department_id, companyId : args.company_id },
      })
      .then( department => {
        if ( ! department ) {
          Exception.throw_user_error({
            system_error : 'Mismatch in department/company IDs when creating new user '
              + args.department_id + '/' + args.company_id,
            user_error : 'Used wrong department',
          });
        }
        return Promise.resolve();
      })
    )

    // Ensure provided email is free to use
    .then(() => validate_email_to_be_free({ email : args.email }))

    // Create new user record
    .then(() => Models.User.create(attributes));
}

function add_users_in_bulk(args) {
  let bulk_header = args.bulk_header,
      bulk_data   = args.bulk_data,
      company_id  = args.to_company_id;

  let company,
    email_vector_index      = 0,
    lastname_vector_index   = 1,
    name_vector_index       = 2,
    department_vector_index = 3;

  return Models.Company.scope('with_simple_departments').findOne({
    where : { id : company_id },
  })


  // Validate department names and replace names with IDs
  .then(cmp => {
    company = cmp;
    let dep_name_to_id = _.object(
      company.departments.map(dep => [dep.name, dep.id])
    );

    let with_invalid_departments = _.filter(
      bulk_data, vector => ! dep_name_to_id[ vector[ department_vector_index] ]
    );

    if (with_invalid_departments.length > 0) {
      let unknown_departments =  with_invalid_departments
        .map(vector => '"'+vector[department_vector_index]+'"')
        .join(', ');

      Error.throw_user_error({
        user_error : 'Following departments could not be found in '
          + company.name + ' account: ' + unknown_departments,
        system_error : 'While importing users to company '
          + company.id + ' there were unknown departments '
          + unknown_departments,
      });
    }

    bulk_data.forEach(
      vector => vector[ department_vector_index ] = dep_name_to_id[ vector[ department_vector_index ] ]
    );

    return Promise.resolve();
  })

  // Add users
  .then(() => {
    return Promise.map(bulk_data, vector => {
      let email = vector[ email_vector_index ];

      return Promise.resolve()
        .then(() => add_user({
          email         : email,
          lastname      : vector[ lastname_vector_index ],
          name          : vector[ name_vector_index ],
          department_id : vector[ department_vector_index ],
          company_id    : company_id,
        }))
        .catch(error => {
          return Promise.resolve({
            error : error,
            email : email,
          });
        });
    }, {
      concurrency : 2,
    })
  })

  // Sort out successfully creted users and errors
  .then(users_or_errors => {
    let result = {
      users : [],
      errors : [],
    };

    users_or_errors.forEach( item => {
      item.hasOwnProperty('error')
        ? result.errors.push( item )
        : result.users.push( item )
    });

    return Promise.resolve(result);
  });

}

const validate_email_to_be_free_schema = Joi.object().required().keys({
    email : Joi.string().email().required(),
  });

function validate_email_to_be_free(args) {
  let validate_args = Joi.validate(args, validate_email_to_be_free_schema);

  if (validate_args.error) {
    Exception.throw_user_error({
      system_error : 'validate_email_to_be_free failed arguments validation',
      user_error   : 'Failed to validate email',
    });
  }

  return Models
    .User
    .find_by_email(args.email)
    .then(user => {

      if (user) {
        Exception.throw_user_error(
          'Email is already in use'
        );
      }

      return Promise.resolve();
  });
}

module.exports = {
  add_user                  : add_user,
  add_users_in_bulk         : add_users_in_bulk,
  validate_email_to_be_free : validate_email_to_be_free,
};

