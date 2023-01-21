pipeline {
    agent any

    stages {
        
        stage('build'){
            agent {
                docker{
                    image 'node:13.0.1-buster-slim'
                    args '-p 5001:3000'   
                    }
                }
            steps{
                    echo 'Compiling app..'
                    sh 'npm install'
                }
            
        }

        stage('Testing App'){
            when {
                not {
                    branch 'master'
                }
            }
                steps{
                    echo 'Testing and Docker Package ..'
                    script {
                            docker.withRegistry('https://index.docker.io/v1/', 'dockerlogin'){
                            def timeimage = docker.build("jlargaespada/timeapp:v${env.BUILD_ID}", ".")
                            timeimage.run("-p 5001:3000 --rm --name time-app")
                    }
                } 
            }
        }
        stage('Approve'){
            when {
                not {
                    branch 'master'
                }
            }
                steps{
                    input message: 'The App is OK? (Click "Proceed" to continue)'
            }
        }
        
        // stage('Docker Package'){
        //         steps{
        //             echo 'Testing and Docker Package ..'
        //             script {
        //                     docker.withRegistry('https://index.docker.io/v1/', 'dockerlogin'){
        //                     def timeimage = docker.build("jlargaespada/timeapp:v${env.BUILD_ID}", ".")
        //                     timeimage.push()
        //                     timeimage.push("latest")
        //             }
        //         } 
        //     }
        // }
    }
     post {
        always {
            echo "Pipeline for time-app run is complete.."
            sh 'docker stop time-app'
        }
        failure {
		slackSend (channel: "timeoff-management-application", message: "Build failure - ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)")
        }
        success {
		slackSend (channel: "timeoff-management-application", message: "Build succeeded - ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)")
        }
    }
}
