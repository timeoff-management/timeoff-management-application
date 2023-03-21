variable "m_ecr_registry_name" {
  type = list(string)
}

variable "m_ecr_image_tag_mutability" {
  default = "MUTABLE"
  type    = string
}

variable "m_ecr_scan_on_push" {
  default = true
  type    = bool
}

variable "m_ecr_org_name" {
  type = string
}

variable "m_ecr_aws_region" {
  type = string
}

variable "encryption_configuration" {
  type = object({
    encryption_type = string
    kms_key         = any
  })
  description = "ECR encryption configuration"
  default     = null
}

variable "resource-tags" {
  type = map(string)
  default = {
    VantaDescription = "ECR Repository - Managed by Terraform"
  }
}