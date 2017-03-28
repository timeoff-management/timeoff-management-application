module.exports = {
  "allow_create_new_accounts": (process.env.ALLOW_CREATE_NEW_ACCOUNTS === undefined) ? true : process.env.ALLOW_CREATE_NEW_ACCOUNTS,
  "send_emails"              : (process.env.SEND_EMAILS === undefined) ? false : process.env.SEND_EMAILS,
  "application_sender_email" : process.env.SENDER_EMAIL || "email@test.com",

  // transports email via SMTP
  "email_smtp_transporter" : {
    "host" : process.env.MAILGUN_SMTP_SERVER || "localhost",
    "port" : process.env.MAILGUN_SMTP_PORT   || 25,
    "auth" : {
      "user" : process.env.MAILGUN_SMTP_LOGIN    || "user",
      "pass" : process.env.MAILGUN_SMTP_PASSWORD || "pass"
    }
  },

  // transports emails via Mailgun REST API (which is 3x faster than SMTP)
  // precedes email_smtp_transporter if api_key and domain are set
  "email_mailgun_transporter" : {
    auth: {
      api_key: process.env.MAILGUN_API_KEY, // e.g. key-abc123xxx
      domain:  process.env.MAILGUN_DOMAIN   // e.g. mydomain.com - one of your domain names listed at your https://mailgun.com/app/domains
    }
  },
  "crypto_secret" : process.env.CRYPTO_SECRET || "!2~`HswpPPLa22+=±§sdq qwe,appp qwwokDF_",
  "application_domain" : process.env.APPLICATION_DOMAIN || "http://app.timeoff.management",
  "promotion_website_domain" : process.env.PROMOTION_WEBSITE_DOMAIN || "http://timeoff.management"
}
