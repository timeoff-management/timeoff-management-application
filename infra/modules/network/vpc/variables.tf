variable "vpc_cidr_block_prefix_code" {
  type        = string
  description = "CIDR block for the VPC"
}

variable "availability_zones" {
  default     = ["us-east-1a", "us-east-1b"]
  type        = list(string)
  description = "List of availability zones"
}

variable "environment_tag" {
  type = string
}

variable "ingress_blocks" {
  type = list(
    object({
      cidr_blocks      = list(string)
      description      = string
      from_port        = number
      ipv6_cidr_blocks = list(string)
      prefix_list_ids  = list(string)
      protocol         = string
      security_groups  = list(string)
      self             = bool
      to_port          = number
    })
  )
  description = "IPs to be whitelisted by the ingress"
}

variable "num_of_nat_gw_eip" {
  description = "Number of Elastic IP addresses required for the Nat Gateway"
  type        = number
}

variable "region" {
  type = string
}

variable "resource-tags" {
  type = map(string)
  default = {
    VantaDescription = "Main VPC"
  }
}

variable "org_name" {
  type = string
}
