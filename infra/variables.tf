
variable "org_name" {
  default = "Gorila POC"
  type    = string
}

variable "aws_region" {
  default = "us-east-1"
  type    = string
}

variable "environment" {
  default = "development"
  type    = string
}

# variable "development_account_id" {
#   default = "678113511857"
#   type    = string
# }

# variable "eks_cluster_name" {
#   default = "development-eks"
#   type    = string
# }

# variable "redis_version_tag" {
#   default = "0-0-1"
#   type    = string
# }

# variable "rds_engine_version" {
#   default = "13.4"
#   type    = string
# }

# variable "rds_version_tag" {
#   default = "0-0-1"
#   type    = string
# }

# variable "db_instance_class" {
#   default = "db.t3.small"
#   type    = string
# }

# variable "eks_node_instance_type" {
#   default = "t3.medium"
#   type    = string
# }

# variable "eks_node_version_tag" {
#   default = "0-0-1-0-0-1"
#   type    = string
# }

# variable "hosted_zone_name" {
#   default = "development.altro.io"
#   type    = string
# }

# variable "delegated_admin_name" {
#   default = "altro-dev-admin"
#   type    = string
# }

# variable "dbuser" {
#   type    = string
#   default = "dbuser"
# }