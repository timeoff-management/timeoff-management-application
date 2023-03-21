
resource "aws_ecr_repository" "ecr-repository" {
  for_each             = toset(var.m_ecr_registry_name)
  name                 = each.value
  image_tag_mutability = var.m_ecr_image_tag_mutability

  dynamic "encryption_configuration" {
    for_each = var.encryption_configuration == null ? [] : [var.encryption_configuration]
    content {
      encryption_type = encryption_configuration.value.encryption_type
      kms_key         = encryption_configuration.value.kms_key
    }
  }


  image_scanning_configuration {
    scan_on_push = var.m_ecr_scan_on_push
  }

  tags = var.resource-tags
}

resource "aws_ecr_lifecycle_policy" "ecr-repository-lc-pol" {
  for_each   = toset(var.m_ecr_registry_name)
  repository = each.value
  policy     = local.lifecycle_policy
}

resource "aws_ecr_repository_policy" "ecr_pol" {
  for_each   = toset(var.m_ecr_registry_name)
  repository = each.value
  policy     = data.aws_iam_policy_document.ecr-public-pol.json
}

# ###############################################################################
# # https://aws.amazon.com/premiumsupport/knowledge-center/secondary-account-access-ecr/
# ###############################################################################
# resource "aws_ecr_repository_policy" "shared-cross-account" {
#   for_each   = toset(var.m_ecr_registry_name)
#   repository = each.value

#   policy = <<EOF
# {
#     "Version": "2008-10-17",
#     "Statement": [
#         {
#             "Sid": "AllowPushPull",
#             "Effect": "Allow",
#             "Principal": {
#                 "AWS": [
#                   "arn:aws:iam::678113511857:root",
#                   "arn:aws:iam::503752692145:root",
#                   "arn:aws:iam::808743463968:root"
#                 ]
#               },
#             "Action": [
#                 "ecr:GetDownloadUrlForLayer",
#                 "ecr:BatchGetImage",
#                 "ecr:BatchCheckLayerAvailability",
#                 "ecr:PutImage",
#                 "ecr:InitiateLayerUpload",
#                 "ecr:UploadLayerPart",
#                 "ecr:CompleteLayerUpload",
#                 "ecr:DescribeRepositories",
#                 "ecr:GetRepositoryPolicy",
#                 "ecr:ListImages",
#                 "ecr:DeleteRepository",
#                 "ecr:BatchDeleteImage",
#                 "ecr:SetRepositoryPolicy",
#                 "ecr:DeleteRepositoryPolicy"
#             ]
#         }
#     ]
# }
# EOF
# }
