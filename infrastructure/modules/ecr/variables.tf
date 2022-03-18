variable "role_arn" {
  description = "The ARN of the role to assume"
  type        = string
  default     = null
}

variable "session_name" {
  description = "The name of the session to create"
  type        = string
  default     = null
}

variable "region" {
  description = "The region to connect to"
  type        = string
  default     = "us-east-1"
}

variable "name" {
  description = "The name of the ECR repository to create"
  type = string
  default = "my-repo"
}

variable "tags" {
  description = "The tags to apply to the ECR repository"
  type = map(string)
  default = {}
}