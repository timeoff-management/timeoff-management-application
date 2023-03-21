# VPC resources: This will create 1 VPC with 4 Subnets, 1 Internet Gateway, 4 Route Tables. 
resource "aws_vpc" "default" {
  cidr_block           = local.vpc_cidr_block
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = merge(
    {
      Name = "${var.environment_tag}-vpc"
    },
  var.resource-tags)
}

resource "aws_internet_gateway" "default" {
  vpc_id = aws_vpc.default.id
  tags = merge(
    {
      Name = "${var.environment_tag}-igw"
    },
  var.resource-tags)
}

resource "aws_route_table" "private" {
  count  = length(local.private_subnet_cidr_blocks)
  vpc_id = aws_vpc.default.id
  tags = merge(
    {
      Name = "${var.environment_tag}-privatert"
    },
    var.resource-tags
  )
}

resource "aws_route" "private" {
  count = length(local.private_subnet_cidr_blocks)

  route_table_id         = aws_route_table.private[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.default[count.index].id
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.default.id
  tags = merge(
    {
      Name = "${var.environment_tag}-publicrt"
    },
    var.resource-tags
  )
}

resource "aws_route" "public" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.default.id

}

resource "aws_subnet" "private" {
  count = length(local.private_subnet_cidr_blocks)

  vpc_id            = aws_vpc.default.id
  cidr_block        = local.private_subnet_cidr_blocks[count.index]
  availability_zone = var.availability_zones[count.index]
  tags = merge(
    {
      Name                                               = "${var.environment_tag}-privatesubnet"
    },
    var.resource-tags
  )
}

resource "aws_subnet" "public" {
  count = length(local.public_subnet_cidr_blocks)

  vpc_id                  = aws_vpc.default.id
  cidr_block              = local.public_subnet_cidr_blocks[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true
  tags = merge(
    {
      Name                                               = "${var.environment_tag}-publicsubnet"
    },
    var.resource-tags
  )
}

resource "aws_route_table_association" "private" {
  count = length(local.private_subnet_cidr_blocks)

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

resource "aws_route_table_association" "public" {
  count = length(local.public_subnet_cidr_blocks)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_eip" "nat_gateway" {
  count = var.num_of_nat_gw_eip == 0 ? length(aws_subnet.public) : var.num_of_nat_gw_eip
  vpc   = true
}


resource "aws_nat_gateway" "default" {
  depends_on = [aws_internet_gateway.default]

  count = length(local.public_subnet_cidr_blocks)

  allocation_id = aws_eip.nat_gateway[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  tags = merge(
    {
      Name = "${var.environment_tag}-nat"
    },
    var.resource-tags
  )
}

# # Subnets for all AWS managed resources
# resource "aws_subnet" "private_db_subnet" {
#   count = length(local.private_db_subnet_cidr_blocks)

#   vpc_id            = aws_vpc.default.id
#   cidr_block        = local.private_db_subnet_cidr_blocks[count.index]
#   availability_zone = var.availability_zones[count.index]
#   tags = merge(
#     {
#       Name = "${var.environment_tag}-privatedbsubnet"
#     },
#     var.resource-tags
#   )
# }

# resource "aws_route_table_association" "private_db" {
#   count = length(local.private_db_subnet_cidr_blocks)

#   subnet_id      = aws_subnet.private_db_subnet[count.index].id
#   route_table_id = aws_route_table.public.id
# }

resource "aws_default_security_group" "default" {
  vpc_id = aws_vpc.default.id
  egress = [
    {
      "cidr_blocks" : [
        "0.0.0.0/0"
      ],
      "description" : "internal egress",
      "from_port" : 0,
      "ipv6_cidr_blocks" : [],
      "prefix_list_ids" : [],
      "protocol" : "-1",
      "security_groups" : [],
      "self" : false,
      "to_port" : 0
    }
  ]

  ingress = concat(local.default_ingress_blocks, var.ingress_blocks)

  tags = var.resource-tags
}
