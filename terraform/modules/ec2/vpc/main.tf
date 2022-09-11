resource "aws_vpc" "gorilla_vpc" {
    cidr_block            = "10.0.0.0/24"
    tags                  = merge(var.tags, {Name= "${var.app_name}-vpc"})
    enable_dns_hostnames  = true
    enable_dns_support    = true
}

resource "aws_subnet" "gorilla_pub_subnet" {
    vpc_id              = aws_vpc.gorilla_vpc.id
    cidr_block          = "10.0.0.0/28"
    availability_zone   = "us-west-2a"
    tags                = merge(var.tags, {Name= "${var.app_name}-subnet-pub-2a"})    
}

resource "aws_subnet" "gorilla_pri_subnet" {
    vpc_id              = aws_vpc.gorilla_vpc.id
    cidr_block          = "10.0.0.128/28"
    availability_zone   = "us-west-2b"
    tags                = merge(var.tags, {Name= "${var.app_name}-subnet-pri-2b"})    
}

resource "aws_vpc_endpoint" "gorilla_s3_endpoint" {
    vpc_id        = aws_vpc.gorilla_vpc.id
    service_name  = "com.amazonaws.us-west-2.s3"
    tags          = merge(var.tags, {Name= "${var.app_name}-s3-endpoint"})
}

resource "aws_internet_gateway" "gorilla_igw" {
    vpc_id = aws_vpc.gorilla_vpc.id
    tags   = merge(var.tags, {Name= "${var.app_name}-igw"})    
}

resource "aws_route_table" "gorilla_rtb_pub" {
    vpc_id = aws_vpc.gorilla_vpc.id
    tags   = merge(var.tags, {Name= "${var.app_name}-rtb-pub"})
    route {
        cidr_block = "0.0.0.0/0"
        gateway_id = aws_internet_gateway.gorilla_igw.id
    }    
}

resource "aws_route_table_association" "gorilla_rtb_association_pub" {
    subnet_id       = aws_subnet.gorilla_pub_subnet.id
    route_table_id  = aws_route_table.gorilla_rtb_pub.id
}

resource "aws_network_interface" "gorilla_neti" {
    subnet_id   = aws_subnet.gorilla_pub_subnet.id
    tags        = merge(var.tags, {Name= "${var.app_name}-neti"})
}

resource "aws_eip" "gorilla_eip" {
    vpc                 = true
    tags        = merge(var.tags, {Name= "${var.app_name}-eip"})
}

resource "aws_nat_gateway" "gorilla_natg" {
    allocation_id   = aws_eip.gorilla_eip.id
    subnet_id       = aws_subnet.gorilla_pub_subnet.id
    tags            = merge(var.tags, {Name= "${var.app_name}-natg"})
    depends_on      = [aws_internet_gateway.gorilla_igw]
}

resource "aws_route_table" "gorilla_rtb_pri" {
    vpc_id = aws_vpc.gorilla_vpc.id
    tags   = merge(var.tags, {Name= "${var.app_name}-rtb-pri"})
    route {
        cidr_block      = "0.0.0.0/0"
        nat_gateway_id  = aws_nat_gateway.gorilla_natg.id
    }    
}

resource "aws_route_table_association" "gorilla_rtb_association_pri" {
    subnet_id       = aws_subnet.gorilla_pri_subnet.id
    route_table_id  = aws_route_table.gorilla_rtb_pri.id
}

resource "aws_vpc_endpoint_route_table_association" "gorilla_vpc_endp_as" {
  route_table_id  = aws_route_table.gorilla_rtb_pri.id
  vpc_endpoint_id = aws_vpc_endpoint.gorilla_s3_endpoint.id
}

resource "aws_security_group" "gorilla_sg" {
    name        = "gorilla_sg"
    description = "Allow traffic in Gorilla vpc"
    vpc_id      = aws_vpc.gorilla_vpc.id
    tags        = merge(var.tags, {Name= "${var.app_name}-sg"})

    ingress {
        description      = "All"
        from_port        = 0
        to_port          = 0
        protocol         = "-1"
        cidr_blocks      = ["0.0.0.0/0"]
    }

    egress {
        from_port        = 0
        to_port          = 0
        protocol         = "-1"
        cidr_blocks      = ["0.0.0.0/0"]
    }
}

#------------------------------------------------------------------------------
output "out_vpc" {
  value = aws_vpc.gorilla_vpc.id
}

output "out_subnets" {
  value = [ aws_subnet.gorilla_pri_subnet.id, aws_subnet.gorilla_pub_subnet.id ]
}

output "out_pub_subnet" {
  value = aws_subnet.gorilla_pub_subnet.id
}

output "out_pri_subnet" {
  value = aws_subnet.gorilla_pri_subnet.id
}

output "out_sg" {
  value = aws_security_group.gorilla_sg.id
}