variable "region" {
  description = "The region to deploy the ECS service to"
  type        = string
  default     = "us-east-1"
}

variable "role_arn" {
  description = "the role arn of the target account role"
  type        = string
  default     = null
}

variable "session_name" {
  description = "the session name of the assumed role"
  type        = string
  default     = null
}

variable "name" {
  description = "the name of the vpc"
  type        = string
  default     = "my-vpc"
}

variable "cidr" {
  description = "the cidr of the vpc"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "the availability zones of the vpc"
  type        = list(string)
  default     = []
}

variable "private_subnets" {
  description = "the private subnets of the vpc"
  type        = list(string)
  default     = []
}

variable "public_subnets" {
  description = "the public subnets of the vpc"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "the tags of the vpc"
  type        = map(string)
  default     = {}
}

variable "zones" {
  description = "the zones of Route 53"
  type        = any
  default     = {}
}