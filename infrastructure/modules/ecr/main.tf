resource "aws_ecr_repository" "default" {
  name = var.name

  image_scanning_configuration {
    scan_on_push = true
  }
  tags = var.tags
}
