pipeline {
    agent any

    tools {
        nodejs 'nodejs'
    }

    stages {
        stage(build){
            steps{
                echo 'Compiling app..'
            }
            sh 'npm install'
        }
        stage(test){
            steps{
                echo 'Testing app..'
            }
            sh 'npm install'
            sh 'npm test'
        }
    }
}