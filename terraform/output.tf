output "elb_dns_name" {
  value = "${aws_elb.gorilla-elb.dns_name}"
}

output "gorilla-dns_cname" {
  value = "${aws_route53_record.gorilla-elb-dnsrecord.name}.${aws_route53_zone.gorilla-elb-dnszone.name}"
}