variable "private_subnets" {
  default = []
}
variable "public_subnets" {
  default = []
}
variable "environment" {}
variable "region" {}
variable "cidr_block" {}
variable "availability_zones" {}
variable "log_bucket_name" {}