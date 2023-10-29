const session = require('express-session')
const SequelizeStore = require('connect-session-sequelize')(session.Store)

const redis = require('redis')
const connectRedis = require('connect-redis')

const { sessionStore: sessionStoreConfig } =
  require(__dirname + '/../../config/app.json') || {}

const createSessionMiddleware = ({ sequelizeDb }) => {
  let store

  if (sessionStoreConfig && sessionStoreConfig.useRedis) {
    const RedisStore = connectRedis(session)
    const { redisConnectionConfiguration = {} } = sessionStoreConfig
    const { host, port } = redisConnectionConfiguration
    if (!(host && port)) {
      throw new Error('Missing configuration for Redis to use with Sessions')
    }
    const redisClient = redis.createClient({ host, port })

    redisClient.on('error', err => {
      throw new Error(`Failed to connect to Redis: ${err}`)
    })
    redisClient.on('connect', err => {
      if (err) {
        throw new Error(`Failed to connect to Redis: ${err}`)
      }
      console.log('Connected to redis successfully')
    })

    store = new RedisStore({ client: redisClient })
  } else {
    if (!sequelizeDb) {
      throw new Error(
        'Database connection was not provided into Session store manager!'
      )
    }
    store = new SequelizeStore({ db: sequelizeDb })
  }

  return session({
    store,
    secret: 'my dirty secret ;khjsdkjahsdajhasdam,nnsnad,',
    resave: false,
    saveUninitialized: false
  })
}

module.exports = createSessionMiddleware
