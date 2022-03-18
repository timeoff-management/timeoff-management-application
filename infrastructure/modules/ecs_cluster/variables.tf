variable "region" {
  description = "The region to deploy the ECS service to"
  type        = string
  default     = "us-east-1"
}

variable "env" {
  description = "The environment to deploy the ECS service to"
  type        = string
  default     = ""
}

variable "container_insights" {
  description = "value of the container_insights variable"
  type        = bool
  default     = true
}

variable "name" {
  description = "the name of the ECS service"
  type        = string
  default     = ""
}

variable "tags" {
  description = "the tags of the ECS service"
  type        = map(any)
  default     = {}
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