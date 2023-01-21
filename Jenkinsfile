pipeline {
    agent any

    tools {
        nodejs 'nodejs'
        terraform 'terraform'
    }
    environment {
        GOOGLE_PROJECT_ID = credentials('service-account-gorilla-logic')
        GOOGLE_PROJECT_NAME = credentials('service-account-gorilla-logic')
        GOOGLE_APPLICATION_CREDENTIALS = credentials('service-account-gorilla-logic')
        GOOGLE_CLOUD_KEYFILE_JSON = credentials('service-account-gorilla-logic')
    }

    stages {

        stage('build'){
            steps{
                echo 'Compiling app..'
                sh 'npm install'
            }
            
        }
        
        stage('terraform init'){
            steps{
                dir ("infra"){
                sh 'terraform init'
            }}
        }

        stage('terraform plan'){
            steps{
                 dir ("infra"){
                sh 'terraform plan -out=infra.out'
            }}
        }

        stage('Waiting for Approvals'){
            steps{
                 dir ("infra"){
                input('Plan Validated? Please approve' )
            }}
        }

        stage('terraform Apply'){
            steps{
                 dir ("infra"){
                sh 'terraform apply infra.out'
            }}
        }
    }
     post {
        always {
            echo "Pipeline for InstaApp run is complete.."
        }
        failure {
		slackSend (channel: "timeoff-management-application", message: "Build failure - ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)")
        }
        success {
		slackSend (channel: "timeoff-management-application", message: "Build succeeded - ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)")
        }
    }
}