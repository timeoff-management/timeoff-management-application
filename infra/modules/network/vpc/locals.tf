locals {
  vpc_cidr_block = "${var.vpc_cidr_block_prefix_code}.0.0.0/16"

  public_subnet_cidr_blocks     = ["${var.vpc_cidr_block_prefix_code}.0.1.0/24", "${var.vpc_cidr_block_prefix_code}.0.2.0/24"]
  private_subnet_cidr_blocks    = ["${var.vpc_cidr_block_prefix_code}.0.5.0/24", "${var.vpc_cidr_block_prefix_code}.0.6.0/24"]
  private_db_subnet_cidr_blocks = ["${var.vpc_cidr_block_prefix_code}.0.7.0/24", "${var.vpc_cidr_block_prefix_code}.0.8.0/24"]

  default_ingress_blocks = [
    {
      cidr_blocks = [
        "0.0.0.0/0"
      ]
      description      = "all-traffic"
      from_port        = -1
      ipv6_cidr_blocks = []
      prefix_list_ids  = []
      protocol         = "tcp"
      security_groups  = []
      self             = false
      to_port          = -1
    },
    {
      cidr_blocks = [
        "0.0.0.0/0"
      ]
      description      = "ssh-traffic"
      from_port        = 22
      ipv6_cidr_blocks = []
      prefix_list_ids  = []
      protocol         = "tcp"
      security_groups  = []
      self             = false
      to_port          = 22
    },
    
  ]  
}
