locals {
  org_name    = var.org_name
  environment = var.environment

  #   rds-sns-subscribers = {
  #     mike = {
  #       protocol               = "email"
  #       endpoint               = "mario@altio.io" #"mike.lee@getperch.app"
  #       endpoint_auto_confirms = true
  #       raw_message_delivery   = false
  #     }
  #   }
}