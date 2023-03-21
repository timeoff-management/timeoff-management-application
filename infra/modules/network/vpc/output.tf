output "subnet_ids" {
  value = [
    for subnet in concat(aws_subnet.public, aws_subnet.private) : subnet.id
  ]
}

output "public_subnet_ids" {
  value = [
    for subnet in concat(aws_subnet.public) : subnet.id
  ]
}

output "private_subnet_ids" {
  value = [
    for subnet in concat(aws_subnet.private) : subnet.id
  ]
}

output "vpc_id" {
  value = aws_vpc.default.id
}

output "default_security_group_id" {
  value = aws_default_security_group.default.id
}
