
resource "aws_codepipeline" "build" {
  name     = "${var.application_name}-build"
  role_arn = aws_iam_role.codepipeline_role.arn

  artifact_store {
    location = var.codepipeline_bucket
    type     = "S3"

  }
  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["build"]


      configuration = {
        ConnectionArn        = var.codestar_connection
        FullRepositoryId     = var.repository_id
        BranchName           = var.source_branch
        DetectChanges        = true
        OutputArtifactFormat = "CODEBUILD_CLONE_REF"

      }
    }
  }

  stage {
    name = "Build"

    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["build"]
      output_artifacts = ["BuildArtifact"]
      version          = "1"

      configuration = {
        ProjectName = var.codebuid_project_name
      }
    }
  }

}

resource "aws_codepipeline" "deploy" {
  name     = "${var.application_name}-deploy"
  role_arn = aws_iam_role.codepipeline_role.arn

  artifact_store {
    location = var.codepipeline_bucket
    type     = "S3"

  }
  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["SourceArtifact"]


      configuration = {
        ConnectionArn        = var.codestar_connection
        FullRepositoryId     = var.repository_id
        BranchName           = var.source_branch
        DetectChanges        = false
        OutputArtifactFormat = "CODE_ZIP"

      }
    }

    action {
      category = "Source"
      configuration = {
        "ImageTag"       = "latest"
        "RepositoryName" = var.ecr_repository_name
      }
      input_artifacts = []
      name            = "ECR"
      output_artifacts = [
        "MyImage",
      ]
      owner     = "AWS"
      provider  = "ECR"
      region    = "us-east-1"
      run_order = 1
      version   = "1"
    }
  }



  stage {
    name = "Deploy"

    action {
      name     = "Deploy"
      category = "Deploy"
      owner    = "AWS"
      provider = "CodeDeployToECS"
      input_artifacts = [
        "SourceArtifact",
        "MyImage"
      ]
      version = "1"

      configuration = {
        "AppSpecTemplateArtifact"        = "SourceArtifact"
        "AppSpecTemplatePath"            = "appspec.yml"
        "ApplicationName"                = var.codedeploy_app_name
        "DeploymentGroupName"            = var.codedeploy_group_name
        "Image1ArtifactName"             = "MyImage"
        "Image1ContainerName"            = "IMAGE_NAME"
        "TaskDefinitionTemplateArtifact" = "SourceArtifact"
        "TaskDefinitionTemplatePath"     = "taskdef.json"
      }
    }
  }

}

resource "aws_iam_role" "codepipeline_role" {
  name = "${var.application_name}-CodePipeline"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codepipeline.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "code_deploy" {
  role = aws_iam_role.codepipeline_role.name

  policy = file("${path.module}/codePipeline.json")
}