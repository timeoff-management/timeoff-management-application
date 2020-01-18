# MAIN #
# - Data
# - Provider
# - VPC
# - Public/Private Subnet
# - Public/Private route table
# - Public/Private route tableassociation
# - Internet Gateway
# - NAT Gateway
# - VPC security group
# - Elastic IP
# - Elastic LoadBalancer security group
# - Elastic LoadBalancer
# - Bastion server
# - Launch Configuration
# - Autoscaling group
# - Autoscaling policy
# - Cloudwatch alarm


data "aws_ami" "gorilla-amazon-linux-2" {
 most_recent = true
 owners = ["amazon"]

 filter {
   name   = "owner-alias"
   values = ["amazon"]
 }
 filter {
   name   = "name"
   values = ["amzn2-ami-hvm*"]
 }
}

data "aws_availability_zones" "available" {}

###

provider "aws" {
  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  region     = "${var.aws_region}"
}

###

resource "aws_vpc" "gorilla-vpc" {
  cidr_block = "10.0.0.0/16"
  instance_tenancy = "default"

  tags = {
    Name        = "${var.company_name}-vpc"
    Billing     = "${var.billing_info}"
    Environment = "${var.environment_info}"
  }
}

resource "aws_subnet" "gorilla-public-subnet" {
  count             = 2
  availability_zone = "${data.aws_availability_zones.available.names[count.index]}"
  cidr_block        = "10.0.${count.index + 1}.0/24"
  vpc_id            = "${aws_vpc.gorilla-vpc.id}"
  map_public_ip_on_launch = "true"
  
  tags = {
    Name        = "${var.company_name}-public-subnet"
    Billing     = "${var.billing_info}"
    Environment = "${var.environment_info}"
  }
}

resource "aws_subnet" "gorilla-private-subnet" {
  count             = 2
  availability_zone = "${data.aws_availability_zones.available.names[count.index]}"
  cidr_block        = "10.0.${count.index + 3}.0/24"
  vpc_id            = "${aws_vpc.gorilla-vpc.id}"
  map_public_ip_on_launch = "false"
  
  tags = {
    Name        = "${var.company_name}-private-subnet"
    Billing     = "${var.billing_info}"
    Environment = "${var.environment_info}"
  }
}

resource "aws_route_table" "gorilla-public-rt" {
  vpc_id = "${aws_vpc.gorilla-vpc.id}"

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = "${aws_internet_gateway.gorilla-igw.id}"
  }
  
  tags = {
    Name        = "${var.company_name}-public_rt"
    Billing     = "${var.billing_info}"
    Environment = "${var.environment_info}"
  }
}

resource "aws_route_table" "gorilla-private-rt" {
  vpc_id = "${aws_vpc.gorilla-vpc.id}"

  route {
    cidr_block = "0.0.0.0/0"
    nat_gateway_id = "${aws_nat_gateway.gorilla-natgw.id}"
  }

  tags = {
    Name        = "${var.company_name}-private_rt"
    Billing     = "${var.billing_info}"
    Environment = "${var.environment_info}"
  }
}

resource "aws_route_table_association" "gorilla-publicrt-assoc" {
  count = 2
  subnet_id      = "${aws_subnet.gorilla-public-subnet.*.id[count.index]}"
  route_table_id = "${aws_route_table.gorilla-public-rt.id}"
}

resource "aws_route_table_association" "gorilla-privatert-assoc" {
  count = 2
  subnet_id      = "${aws_subnet.gorilla-private-subnet.*.id[count.index]}"
  route_table_id = "${aws_route_table.gorilla-private-rt.id}"
}

resource "aws_internet_gateway" "gorilla-igw" {
  vpc_id = "${aws_vpc.gorilla-vpc.id}"

  tags = {
    Name        = "${var.company_name}-igw"
    Billing     = "${var.billing_info}"
    Environment = "${var.environment_info}"
  }
}

resource "aws_nat_gateway" "gorilla-natgw" {
  allocation_id = "${aws_eip.gorilla-eip.id}"
  subnet_id     = "${element(aws_subnet.gorilla-public-subnet.*.id,0)}"

  tags = {
    Name        = "${var.company_name}-natgw"
    Billing     = "${var.billing_info}"
    Environment = "${var.environment_info}"
  }
}

resource "aws_security_group" "gorilla-vpc-sg" {
  name   = "gorilla-vpc-sg"
  vpc_id = "${aws_vpc.gorilla-vpc.id}"

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["${var.network_address_space}"]
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["${var.network_address_space}"]
  }


  tags = {
    Name        = "${var.company_name}-vpc-sg"
    Billing     = "${var.billing_info}"
    Environment = "${var.environment_info}"
  }
}

resource "aws_eip" "gorilla-eip" {
  
  tags = {
    Name        = "${var.company_name}-eip"
    Billing     = "${var.billing_info}"
    Environment = "${var.environment_info}"
  }
}

resource "aws_security_group" "gorilla-elb-sg" {
  name   = "gorilla_elb_sg"
  vpc_id = "${aws_vpc.gorilla-vpc.id}"

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

    ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.company_name}-elb-sg"
    Billing     = "${var.billing_info}"
    Environment = "${var.environment_info}"
  }
}

resource "aws_elb" "gorilla-elb" {
  name               = "${var.company_name}-elb"
  subnets            = "${aws_subnet.gorilla-public-subnet.*.id}"
  security_groups    = ["${aws_security_group.gorilla-elb-sg.id}"]
  listener {
    instance_port     = 3000
    instance_protocol = "tcp"
    lb_port           = 80
    lb_protocol       = "tcp"
  }

  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 3
    target              = "tcp:3000"
    interval            = 30
  }

  cross_zone_load_balancing   = true
  idle_timeout                = 400
  connection_draining         = true
  connection_draining_timeout = 400

  tags = {
    Name        = "${var.company_name}-elb"
    Billing     = "${var.billing_info}"
    Environment = "${var.environment_info}"
  }

}

resource "aws_route53_zone" "gorilla-elb-dnszone" {
  name = "gorilla-logic.com"
}
resource "aws_route53_record" "gorilla-elb-dnsrecord" {
  zone_id = "${aws_route53_zone.gorilla-elb-dnszone.zone_id}"
  name    = "demo"
  type    = "CNAME"

  alias {
    name                   = "${aws_elb.gorilla-elb.dns_name}"
    zone_id                = "${aws_elb.gorilla-elb.zone_id}"
    evaluate_target_health = true
  }
}

resource "aws_iam_role" "gorilla-instance-profile-role" {
  name = "${var.company_name}-instance-profile-role"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "gorilla-instance-profile-role-policy" {
  name = "${var.company_name}-instanceprofile-rolepolicy"
  role = "${aws_iam_role.gorilla-instance-profile-role.id}"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:*"
      ],
      "Resource": [
        "${aws_s3_bucket.gorilla-pipelilne-s3bucket.arn}",
        "${aws_s3_bucket.gorilla-pipelilne-s3bucket.arn}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "codebuild:BatchGetBuilds",
        "codebuild:StartBuild",
        "codebuild:*",
        "codecommit:CancelUploadArchive",
        "codecommit:GetBranch",
        "codecommit:GetCommit",
        "codecommit:GetUploadArchiveStatus",
        "codecommit:UploadArchive",
        "codecommit:*",
        "codedeploy:CreateDeployment",
        "codedeploy:GetApplication",
        "codedeploy:GetApplicationRevision",
        "codedeploy:GetDeployment",
        "codedeploy:GetDeploymentConfig",
        "codedeploy:RegisterApplicationRevision",
        "codedeploy:*"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:*"
      ],
      "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_iam_instance_profile" "gorilla-instance-profile" {
  name = "${var.company_name}-instance-profile"
  role = "${aws_iam_role.gorilla-instance-profile-role.name}"
}

resource "aws_instance" "gorilla-bastion-server" {
  ami               = "${lookup(var.aws-ami,var.aws_region)}"
  vpc_security_group_ids = ["${aws_security_group.gorilla-vpc-sg.id}"]
  subnet_id = "${element(aws_subnet.gorilla-public-subnet.*.id,0)}"
  source_dest_check = false
  instance_type = "t2.micro"
  key_name = "${var.private_key}"
  iam_instance_profile = "${aws_iam_instance_profile.gorilla-instance-profile.name}"
  associate_public_ip_address = true

  tags = {
    Name        = "${var.company_name}-bastion-server"
    Billing     = "${var.billing_info}"
    Environment = "${var.environment_info}"
  }
}

resource "aws_launch_configuration" "gorilla-launchconfiguration" {
  image_id               = "${data.aws_ami.gorilla-amazon-linux-2.id}"
  # image_id               = "${var.aws-ami}"
  instance_type          = "t2.micro"
  security_groups        = ["${aws_security_group.gorilla-vpc-sg.id}"]
  iam_instance_profile = "${aws_iam_instance_profile.gorilla-instance-profile.name}"
  key_name = "${var.private_key}"
  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y
              sudo yum install wget -y
              sudo yum install git -y
              sudo yum install ruby -y
              cd /home/ec2-user
              sudo wget "https://aws-codedeploy-us-west-2.s3.us-west-2.amazonaws.com/latest/install"
              sudo chmod +x ./install
              sudo ./install auto
              sudo service codedeploy-agent start
              EOF
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "gorilla-autoscalinggroup" {
  name = "${var.company_name}-autoscalinggroup"
  min_size = 2
  max_size = 4
  launch_configuration = "${aws_launch_configuration.gorilla-launchconfiguration.id}"
  vpc_zone_identifier  = "${aws_subnet.gorilla-private-subnet.*.id}"
  load_balancers = ["${aws_elb.gorilla-elb.name}"]
  health_check_type = "ELB"
  tag {
    key = "Name"
    value = "${var.company_name}-${var.environment_info}"
    propagate_at_launch = true
  }
}

resource "aws_autoscaling_policy" "gorilla-autoscalingpolicy" {
  name                   = "${var.company_name}-autoscalingpolicy"
  scaling_adjustment     = 4
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = "${aws_autoscaling_group.gorilla-autoscalinggroup.name}"
}

resource "aws_cloudwatch_metric_alarm" "gorilla-cloudwatch_metric_alarm" {
  alarm_name          = "${var.company_name}-cloudWatch-autoScaling-alarm"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "3600"
  statistic           = "Average"
  threshold           = "80"

  dimensions = {
    AutoScalingGroupName = "${aws_autoscaling_group.gorilla-autoscalinggroup.name}"
  }

  alarm_description = "This metric monitors ec2 cpu utilization"
  alarm_actions     = ["${aws_autoscaling_policy.gorilla-autoscalingpolicy.arn}"]
}